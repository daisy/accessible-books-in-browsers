import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs-extra';
import path from 'path';
import tmp from 'tmp';
import winston from 'winston';
import xpath from 'xpath';
import type { SitePage } from './model.js';
import type { OutputPaths } from './output.js';
import { OutputLayout } from './output.js';
import { configureFfmpeg } from './ffmpeg.js';
import * as fileio from './file-io.js';
import * as utils from './utils.js';
import { createVtt } from './vtt.js';
import { cacheKey, restoreCachedAudio, storeCachedAudio, type AudioCache } from './audio-cache.js';
import type { NarrationSelector } from './structure-ids.js';
import { isExternalHref } from './ids.js';
import {
    analyzeAudio, cleanupFilters, fadeFilters, loudnessFilters, measureLoudness,
    type AudioCleanupSettings, type AudioFindings
} from './audio-cleanup.js';

export type MediaSegment = {
    clipBegin: utils.ClockValue;
    clipEnd: utils.ClockValue;
    durOnDisk?: number;
    src: string;
    textSrc: string;
    tmpFilename?: string;
};

export type PageAudioAssets = {
    audioHref: string;
    cues: Array<{ id: string; selector: NarrationSelector; start: number }>;
    duration: number;
    encoding: AudioEncodingSettings;
    encoderDrift: number;
    findings: AudioFindings;
    vttHref: string;
};

export type AudioEncodingSettings = {
    bitrateKbps: number;
    channels: number;
    codec: string;
    extension: string;
    sampleRate: number;
};

// Small audio is MP3 only: it plays in every browser. Opus was silent on iPhone Safari's first Play
// after a page loaded, and AAC is missing from some Chromium, Linux Firefox and Windows N systems.

const select = xpath.useNamespaces({
    epub: 'http://www.idpf.org/2007/ops',
    smil: 'http://www.w3.org/ns/SMIL'
});

const AUDIO_SEGMENT_CONCURRENCY = 4;
const sourceProperties = new Map<string, Promise<utils.AudioProperties>>();

// The browser converter turns this off: its ffmpeg runner cuts clips in the browser itself, from
// each source decoded once (converter/shims/ffmpeg-wasm-runner.js)
let sourceRangeDecoding = true;
export function setSourceRangeDecoding(enabled: boolean): void {
    sourceRangeDecoding = enabled;
}

async function createAudioForPage(
    page: SitePage,
    outputPaths: OutputPaths,
    suppliedMediaSegments?: MediaSegment[],
    cache?: AudioCache | null,
    selectors: Map<string, NarrationSelector> = new Map(),
    smallAudio = false,
    cleanup: AudioCleanupSettings = { enabled: false, enhancements: [], fadeMilliseconds: 0,
        lowCutHz: 0, deplosive: false, loudnessLufs: -18, truePeakDb: -1.5 }
): Promise<PageAudioAssets | null> {
    if (!page.moPath) return null;

    const mediaSegments = suppliedMediaSegments ?? await getMediaSegments(page);
    if (mediaSegments.length === 0) {
        winston.warn(`No media segments found for ${page.sourcePath}`);
        return null;
    }

    const sourceExt = path.extname(utils.getWithoutFrag(mediaSegments[0].src)) || '.mp3';
    const audioExt = smallAudio ? SMALL_AUDIO_ENCODING.extension : sourceExt;
    const audioFilename = `${page.audioBaseName}${audioExt}`;
    const vttFilename = `${page.audioBaseName}.vtt`;
    const audioOutPath = path.join(outputPaths.audioDir, audioFilename);
    const vttOutPath = path.join(outputPaths.vttDir, vttFilename);
    const encoding = smallAudio
        ? SMALL_AUDIO_ENCODING
        : await encodingSettingsForSegments(mediaSegments, audioExt);

    const key = cache ? await cacheKey(mediaSegments, encoding, cleanup) : '';
    const restored = cache ? await restoreCachedAudio(cache, audioFilename, mediaSegments, audioOutPath, key) : null;
    let findings = restored?.findings;
    if (!restored) {
        findings = await mergeAudioSegments(mediaSegments, audioOutPath, encoding, cleanup);
        if (cache) await storeCachedAudio(cache, audioFilename, mediaSegments, audioOutPath, key, findings);
    }
    await createVtt(mediaSegments, vttOutPath, selectors);

    let duration = 0;
    const cues = mediaSegments.map(segment => {
        const id = utils.getFrag(segment.textSrc);
        const cue = { id, selector: selectors.get(id) ?? { type: 'FragmentSelector' as const, value: id }, start: duration };
        duration += segment.durOnDisk
            ?? Math.max(0, segment.clipEnd.seconds - segment.clipBegin.seconds);
        return cue;
    });
    const outputDuration = await utils.getDuration(audioOutPath);
    const encoderDrift = outputDuration - duration;
    winston.verbose(`Audio duration ${outputDuration.toFixed(3)}s; PCM cues ${duration.toFixed(3)}s; encoder difference ${encoderDrift.toFixed(3)}s`);
    if (Math.abs(encoderDrift) > .1) {
        winston.warn(`Encoded audio differs from its PCM cue duration by ${encoderDrift.toFixed(3)}s in ${audioFilename}`);
    }

    return {
        audioHref: utils.toPosixPath(path.join(OutputLayout.audioDir, audioFilename)),
        cues,
        duration,
        encoding,
        encoderDrift,
        findings: findings ?? await analyzeAudio(audioOutPath),
        vttHref: utils.toPosixPath(path.join(OutputLayout.vttDir, vttFilename))
    };
}

export const SMALL_AUDIO_ENCODING: Readonly<AudioEncodingSettings> = Object.freeze({
    bitrateKbps: 32, channels: 1, codec: 'libmp3lame', extension: '.mp3', sampleRate: 24000
});

async function encodingSettingsForSegments(mediaSegments: MediaSegment[], audioExt: string): Promise<AudioEncodingSettings> {
    const sources = Array.from(new Set(mediaSegments.map(segment => utils.getWithoutFrag(segment.src))));
    const properties = await Promise.all(sources.map(source => {
        let pending = sourceProperties.get(source);
        if (!pending) {
            pending = utils.getAudioProperties(source);
            sourceProperties.set(source, pending);
        }
        return pending;
    }));
    return chooseAudioEncodingSettings(properties, audioExt);
}

export function chooseAudioEncodingSettings(properties: utils.AudioProperties[], audioExt: string): AudioEncodingSettings {
    const extension = audioExt.toLowerCase() || '.mp3';
    const channels = Math.max(1, ...properties.map(source => source.channels));
    const sampleRate = Math.max(8000, ...properties.map(source => source.sampleRate));
    const bitrateKbps = Math.max(32, ...properties.map(source => Math.ceil(source.bitrate / 1000)));
    const codec = extension === '.mp3' ? 'libmp3lame'
        : ['.m4a', '.mp4', '.aac'].includes(extension) ? 'aac'
            : ['.ogg', '.opus', '.webm'].includes(extension) ? 'libopus' : '';
    return { bitrateKbps, channels, codec, extension, sampleRate };
}

async function getMediaSegments(page: SitePage): Promise<MediaSegment[]> {
    const smildoc = await fileio.parse(page.moPath);
    const textElms = select('//smil:text', smildoc) as unknown as Element[];
    const mediaSegments: MediaSegment[] = [];

    textElms.forEach(textElm => {
        const textSrc = resolveSmilReference(page.moPath, textElm.getAttribute('src') ?? '', page.sourcePath);
        if (utils.getWithoutFrag(textSrc) !== page.sourcePath) return;

        if (!textElm.parentNode) return;

        const audioElms = select('.//smil:audio', textElm.parentNode) as unknown as Element[];
        audioElms.forEach(audioElm => {
            const clipBegin = audioElm.getAttribute('clipBegin');
            const clipEnd = audioElm.getAttribute('clipEnd');
            const audioSrc = audioElm.getAttribute('src');
            if (!clipBegin || !clipEnd || !audioSrc) return;

            mediaSegments.push({
                src: resolveSmilReference(page.moPath, audioSrc, page.sourcePath),
                clipBegin: utils.toSeconds(clipBegin),
                clipEnd: utils.toSeconds(clipEnd),
                textSrc
            });
        });
    });

    return mediaSegments;
}

async function mergeAudioSegments(
    mediaSegments: MediaSegment[],
    outFilename: string,
    encoding?: AudioEncodingSettings,
    cleanup: AudioCleanupSettings = { enabled: false, enhancements: [], fadeMilliseconds: 0,
        lowCutHz: 0, deplosive: false, loudnessLufs: -18, truePeakDb: -1.5 }
): Promise<AudioFindings> {
    winston.info(`Merging audio clips into ${outFilename}`);
    await configureFfmpeg();
    const settings = encoding ?? await encodingSettingsForSegments(mediaSegments, path.extname(outFilename) || '.mp3');

    // Segments are cut to WAV and encoded once at the end. Cutting them to the output format and
    // joining the files byte for byte added each segment's encoder padding to the audio but not to
    // the cue timings, so narration drifted ahead of the audio over a long page.
    tmp.setGracefulCleanup();
    const tmpDirname = tmp.dirSync({ unsafeCleanup: true }).name;
    // Each page's clips, faded clips and joined files are deleted as soon as its audio is encoded,
    // so a long book doesn't fill the temporary folder (or, in the browser converter, memory) until
    // the conversion ends. Nothing reads them afterwards: the cues use the durations already read.
    try {
        const audioTmpFilenames = mediaSegments.map((audio, idx) => {
            const audioTmpFilename = path.join(tmpDirname, `${idx}.wav`);
            audio.tmpFilename = audioTmpFilename;
            return audioTmpFilename;
        });

        // Each source the page uses is decoded once, from its first clip to its last, and the clips
        // are cut from that WAV. Cutting each clip from the source itself decoded it from the start
        // every time, so a long recording took longer for every clip further in. A seek in the MP3
        // instead can land off the clip in a VBR file; atrim on the WAV gives the same samples as
        // atrim on the source (checked on Valentin Haüy, 2026-11-19).
        const ranges = sourceRangeDecoding
            ? await decodeSourceRanges(mediaSegments, settings, tmpDirname)
            : new Map(mediaSegments.map(audio => [audio.src, { filename: audio.src, start: 0 }]));
        try {
            await runWithConcurrency(mediaSegments, AUDIO_SEGMENT_CONCURRENCY, async(audio, idx) => {
                const range = ranges.get(audio.src)!;
                await cutToWav(range.filename, audio.clipBegin.seconds - range.start,
                    audio.clipEnd.seconds - range.start, audioTmpFilenames[idx], settings);
            });
        } finally {
            if (sourceRangeDecoding) await Promise.all(Array.from(ranges.values(), range => fs.remove(range.filename).catch(() => {})));
        }

        // From each clip's WAV header: the exact sample count, with no ffprobe for every clip
        for (const audio of mediaSegments) {
            if (audio.tmpFilename) {
                audio.durOnDisk = await wavDuration(audio.tmpFilename) ?? await utils.getDuration(audio.tmpFilename);
            }
        }

        const rawJoinedFilename = path.join(tmpDirname, 'joined-raw.wav');
        await joinPcmFiles(audioTmpFilenames, rawJoinedFilename, settings, tmpDirname, 'raw-segments.txt');
        const findings = await analyzeAudio(rawJoinedFilename);
        const joinedDuration = await utils.getDuration(rawJoinedFilename);
        let joinedFilename = rawJoinedFilename;
        if (cleanup.enabled) {
            const fadedFilenames = audioTmpFilenames.map((_, index) => path.join(tmpDirname, `${index}-faded.wav`));
            await runWithConcurrency(audioTmpFilenames, AUDIO_SEGMENT_CONCURRENCY, async(filename, index) => {
                await applyClipFades(filename, fadedFilenames[index], mediaSegments[index].durOnDisk ?? 0, cleanup);
            });
            joinedFilename = path.join(tmpDirname, 'joined.wav');
            await joinPcmFiles(fadedFilenames, joinedFilename, settings, tmpDirname, 'faded-segments.txt');
        }
        const measured = cleanup.enabled ? await measureLoudness(joinedFilename, cleanup) : null;
        if (cleanup.enabled && measured === null) {
            winston.warn(`Could not measure loudness for ${path.basename(outFilename)}; applying cleanup without raising the level`);
        }
        await new Promise<void>((resolve, reject) => {
            const command = ffmpeg().input(joinedFilename)
                .audioChannels(settings.channels)
                .audioFrequency(settings.sampleRate)
                .audioBitrate(`${settings.bitrateKbps}k`);
            const filters = cleanup.enabled
                ? [...cleanupFilters(cleanup), ...loudnessFilters(cleanup, measured, findings.loudnessLufs),
                    'apad', `atrim=duration=${joinedDuration}`]
                : [];
            if (filters.length) command.audioFilters(filters.join(','));
            if (settings.codec) command.audioCodec(settings.codec);
            // MP4 (.m4a) puts its index at the end unless asked; at the start, playback can begin
            // without first fetching the end of the file
            if (settings.extension === '.m4a') command.outputOptions(['-movflags', '+faststart']);
            command.output(outFilename)
                .on('error', reject)
                .on('end', resolve)
                .run();
        });
        return findings;
    } finally {
        await fs.remove(tmpDirname).catch(() => {});
    }
}

async function joinPcmFiles(
    filenames: string[], joinedFilename: string, settings: AudioEncodingSettings,
    tmpDirname: string, listName: string
): Promise<void> {
    const concatListFilename = path.join(tmpDirname, listName);
    await fs.writeFile(concatListFilename, filenames.map(filename => `file '${filename.replace(/'/g, "'\\''")}'`).join('\n'));
    await new Promise<void>((resolve, reject) => {
        const command = ffmpeg()
            .input(concatListFilename)
            .inputOptions(['-f concat', '-safe 0'])
            .audioChannels(settings.channels)
            .audioFrequency(settings.sampleRate)
            .audioCodec('pcm_s16le');
        command.output(joinedFilename)
            .on('progress', progress => {
                winston.verbose(`[ffmpeg] ${JSON.stringify(progress)}`);
            })
            .on('error', err => {
                winston.error(`[ffmpeg] error: ${err.message}`);
                reject(err);
            })
            .on('end', () => {
                winston.verbose('[ffmpeg] finished');
                resolve();
            })
            .run();
    });
}

async function applyClipFades(
    input: string, output: string, duration: number, cleanup: AudioCleanupSettings
): Promise<void> {
    const filters = fadeFilters(duration, cleanup);
    if (!filters.length) {
        await fs.copy(input, output);
        return;
    }
    await new Promise<void>((resolve, reject) => {
        ffmpeg().input(input)
            .audioFilters(filters.join(','))
            .audioCodec('pcm_s16le')
            .output(output)
            .on('error', reject)
            .on('end', resolve)
            .run();
    });
}

// Each source, from the start of its first clip on this page to the end of its last
async function decodeSourceRanges(
    mediaSegments: MediaSegment[],
    settings: AudioEncodingSettings,
    tmpDirname: string
): Promise<Map<string, { filename: string; start: number }>> {
    const bounds = new Map<string, { start: number; end: number }>();
    for (const audio of mediaSegments) {
        const bound = bounds.get(audio.src);
        if (!bound) bounds.set(audio.src, { start: audio.clipBegin.seconds, end: audio.clipEnd.seconds });
        else {
            bound.start = Math.min(bound.start, audio.clipBegin.seconds);
            bound.end = Math.max(bound.end, audio.clipEnd.seconds);
        }
    }
    const ranges = new Map<string, { filename: string; start: number }>();
    let index = 0;
    for (const [src, bound] of bounds) ranges.set(src, { filename: path.join(tmpDirname, `source-${index++}.wav`), start: bound.start });
    await runWithConcurrency(Array.from(bounds), AUDIO_SEGMENT_CONCURRENCY, async([src, bound]) => {
        await cutToWav(src, bound.start, bound.end, ranges.get(src)!.filename, settings);
    });
    return ranges;
}

function cutToWav(input: string, begin: number, end: number, output: string, settings: AudioEncodingSettings): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        ffmpeg()
            .input(input)
            .audioFilters(`atrim=${begin}:${end}`)
            .audioCodec('pcm_s16le')
            .audioChannels(settings.channels)
            .audioFrequency(settings.sampleRate)
            .output(output)
            .on('progress', progress => {
                winston.verbose(`[ffmpeg] ${JSON.stringify(progress)}`);
            })
            .on('error', err => {
                winston.error(`[ffmpeg] error: ${err.message}`);
                reject(err);
            })
            .on('end', () => {
                winston.verbose('[ffmpeg] finished');
                resolve();
            })
            .run();
    });
}

// A WAV's length from its header (the data chunk's size), or null if it can't be read
export async function wavDuration(filename: string): Promise<number | null> {
    try {
        const bytes: Uint8Array = await fs.readFile(filename);
        const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        if (bytes.byteLength < 12 || String.fromCharCode(...bytes.subarray(0, 4)) !== 'RIFF') return null;
        let offset = 12;
        let format: { channels: number; sampleRate: number; bits: number } | null = null;
        while (offset + 8 <= view.byteLength) {
            const id = String.fromCharCode(...bytes.subarray(offset, offset + 4));
            let size = view.getUint32(offset + 4, true);
            if (id === 'fmt ') format = { channels: view.getUint16(offset + 10, true), sampleRate: view.getUint32(offset + 12, true), bits: view.getUint16(offset + 22, true) };
            if (id === 'data') {
                if (!format || !format.sampleRate || !format.channels || !format.bits) return null;
                size = Math.min(size, view.byteLength - offset - 8);
                return size / (format.sampleRate * format.channels * format.bits / 8);
            }
            offset += 8 + size + (size % 2);
        }
        return null;
    } catch {
        return null;
    }
}

async function runWithConcurrency<T>(
    items: T[],
    concurrency: number,
    task: (item: T, index: number) => Promise<void>
): Promise<void> {
    const workerCount = Math.min(concurrency, items.length);
    let nextIndex = 0;

    await Promise.all(Array.from({ length: workerCount }, async() => {
        while (nextIndex < items.length) {
            const currentIndex = nextIndex;
            nextIndex += 1;
            await task(items[currentIndex], currentIndex);
        }
    }));
}

function resolveSmilReference(smilPath: string, reference: string, pageSourcePath: string): string {
    if (reference.startsWith('#')) return `${pageSourcePath}${reference}`;
    if (isExternalHref(reference)) return reference;

    const frag = utils.getFrag(reference);
    const withoutFrag = utils.getWithoutFrag(reference);
    const resolved = utils.resolveHrefPath(path.dirname(smilPath), withoutFrag);
    return frag ? `${resolved}#${frag}` : resolved;
}

export {
    createAudioForPage,
    getMediaSegments,
    mergeAudioSegments,
    runWithConcurrency
};
