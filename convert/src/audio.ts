import ffmpeg from 'fluent-ffmpeg';
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
    vttHref: string;
};

const select = xpath.useNamespaces({
    epub: 'http://www.idpf.org/2007/ops',
    smil: 'http://www.w3.org/ns/SMIL'
});

const AUDIO_SEGMENT_CONCURRENCY = 4;

async function createAudioForPage(page: SitePage, outputPaths: OutputPaths): Promise<PageAudioAssets | null> {
    if (!page.moPath) return null;

    const mediaSegments = await getMediaSegments(page);
    if (mediaSegments.length === 0) {
        winston.warn(`No media segments found for ${page.sourcePath}`);
        return null;
    }

    const audioExt = path.extname(utils.getWithoutFrag(mediaSegments[0].src)) || '.mp3';
    const audioFilename = `${page.audioBaseName}${audioExt}`;
    const vttFilename = `${page.audioBaseName}.vtt`;
    const audioOutPath = path.join(outputPaths.audioDir, audioFilename);
    const vttOutPath = path.join(outputPaths.vttDir, vttFilename);

    await mergeAudioSegments(mediaSegments, audioOutPath);
    await createVtt(mediaSegments, vttOutPath);

    return {
        audioHref: utils.toPosixPath(path.join(OutputLayout.audioDir, audioFilename)),
        vttHref: utils.toPosixPath(path.join(OutputLayout.vttDir, vttFilename))
    };
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

async function mergeAudioSegments(mediaSegments: MediaSegment[], outFilename: string): Promise<void> {
    winston.info(`Merging audio clips into ${outFilename}`);
    await configureFfmpeg();

    const ext = path.extname(outFilename);
    tmp.setGracefulCleanup();
    const tmpDirname = tmp.dirSync({ unsafeCleanup: true }).name;
    const audioTmpFilenames = mediaSegments.map((audio, idx) => {
        const audioTmpFilename = path.join(tmpDirname, `${idx}${ext}`);
        audio.tmpFilename = audioTmpFilename;
        return audioTmpFilename;
    });

    await runWithConcurrency(mediaSegments, AUDIO_SEGMENT_CONCURRENCY, async(audio, idx) => {
        await extractAudioSegment(audio, audioTmpFilenames[idx]);
    });

    for (const audio of mediaSegments) {
        if (audio.tmpFilename) {
            audio.durOnDisk = await utils.getDuration(audio.tmpFilename);
        }
    }

    const concatFiles = `concat:${audioTmpFilenames.join('|')}`;
    await new Promise<void>((resolve, reject) => {
        ffmpeg()
            .input(concatFiles)
            .audioChannels(2)
            .output(outFilename)
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

async function extractAudioSegment(audio: MediaSegment, audioTmpFilename: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        ffmpeg()
            .input(audio.src)
            .audioFilters(`atrim=${audio.clipBegin.seconds}:${audio.clipEnd.seconds}`)
            .output(audioTmpFilename)
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
    if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(reference)) return reference;

    const frag = utils.getFrag(reference);
    const withoutFrag = utils.getWithoutFrag(reference);
    const resolved = path.resolve(path.dirname(smilPath), withoutFrag);
    return frag ? `${resolved}#${frag}` : resolved;
}

export {
    createAudioForPage,
    getMediaSegments,
    mergeAudioSegments
};
