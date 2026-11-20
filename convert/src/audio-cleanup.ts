import { spawn } from 'child_process';
import ffmpegStatic from 'ffmpeg-static';

// ffmpeg-static's default export is the binary's path (its types don't say so under Node16 modules)
const FFMPEG_PATH = (ffmpegStatic as unknown as string | null) ?? 'ffmpeg';

export const AUDIO_ENHANCEMENTS = ['warm-eq', 'compression', 'noise', 'deess', 'declick'] as const;
export type AudioEnhancement = typeof AUDIO_ENHANCEMENTS[number];

export type AudioCleanupSettings = {
    enabled: boolean;
    enhancements: AudioEnhancement[];
    fadeMilliseconds: number;
    lowCutHz: number;
    deplosive: boolean;
    loudnessLufs: number;
    truePeakDb: number;
};

export type AudioFindings = {
    clippingSamples: number;
    loudnessLufs: number | null;
    noiseFloorDb: number | null;
    peakDb: number | null;
};

export function audioCleanupSettings(enabled: boolean, enhancements: AudioEnhancement[]): AudioCleanupSettings {
    return {
        enabled,
        enhancements: enabled ? enhancements : [],
        fadeMilliseconds: enabled ? 5 : 0,
        lowCutHz: enabled ? 90 : 0,
        deplosive: enabled,
        // -18 rather than -17: quiet recordings raised to -17 had their plosive pops raised with them
        // (Moby Dick's by about 7 dB). With the de-plosive, -20 sounded best for Moby Dick, but is too
        // quiet for every book; -18 (user, 2026-11-10)
        loudnessLufs: -18,
        truePeakDb: -1.5
    };
}

export function parseAudioEnhancements(value: string): AudioEnhancement[] {
    if (value.trim() === 'none') return [];
    const names = value.split(',').map(name => name.trim()).filter(Boolean);
    const invalid = names.filter(name => !AUDIO_ENHANCEMENTS.includes(name as AudioEnhancement));
    if (invalid.length) {
        throw new Error(`Invalid --audio-enhance value: ${invalid.join(', ')}. Use ${AUDIO_ENHANCEMENTS.join(', ')}, or none.`);
    }
    return Array.from(new Set(names)) as AudioEnhancement[];
}

// Plosive pops (p, b) are short bursts of low sound. Below 200 Hz only, a fast, hard compressor
// pulls them down and leaves steady speech alone; the band is then mixed back with the rest. Chosen
// by ear on Moby Dick, whose pops were the worst (user, 2026-11-10). A filtergraph with labels,
// which ffmpeg allows in a single -af chain with one input and one output.
export const DEPLOSIVE_FILTER = 'acrossover=split=200[lo][hi];[lo]acompressor=threshold=0.015:ratio=20:attack=0.1:release=40:knee=2[loc];[loc][hi]amix=inputs=2,volume=2';

export function cleanupFilters(settings: AudioCleanupSettings): string[] {
    if (!settings.enabled) return [];
    // A steep cut below the voice (rumble), then the de-plosive
    const filters = [`asubcut=cutoff=${settings.lowCutHz}:order=10`];
    if (settings.deplosive) filters.push(DEPLOSIVE_FILTER);
    for (const enhancement of settings.enhancements) {
        if (enhancement === 'warm-eq') {
            filters.push('equalizer=f=220:t=q:w=1:g=0.75', 'equalizer=f=2800:t=q:w=0.7:g=-3',
                'equalizer=f=5200:t=q:w=1:g=-1');
        }
        else if (enhancement === 'compression') {
            filters.push('acompressor=threshold=0.063:ratio=2:attack=20:release=250:makeup=1.1');
        }
        else if (enhancement === 'noise') filters.push('afftdn=nr=8:nf=-35');
        else if (enhancement === 'deess') filters.push('deesser=i=0.2:m=0.5:f=0.5');
        else if (enhancement === 'declick') filters.push('adeclick');
    }
    return filters;
}

export function fadeFilters(duration: number, settings: AudioCleanupSettings): string[] {
    const seconds = settings.fadeMilliseconds / 1000;
    if (!settings.enabled || seconds <= 0 || duration < seconds * 2) return [];
    return [`afade=t=in:st=0:d=${seconds}`, `afade=t=out:st=${Math.max(0, duration - seconds)}:d=${seconds}`];
}

export async function analyzeAudio(filename: string): Promise<AudioFindings> {
    const stderr = await runFfmpeg(['-hide_banner', '-nostats', '-i', filename, '-af',
        'ebur128=peak=true,astats=metadata=0:reset=0', '-f', 'null', '-']);
    return parseAudioFindings(stderr);
}

export function parseAudioFindings(output: string): AudioFindings {
    const summary = output.slice(output.lastIndexOf('Summary:'));
    const overall = output.slice(output.lastIndexOf('Overall'));
    const loudness = matchNumber(summary, /Integrated loudness:[\s\S]*?I:\s*(-?\d+(?:\.\d+)?) LUFS/);
    const peak = matchNumber(overall, /Peak level dB:\s*(-?\d+(?:\.\d+)?|-inf)/);
    const trough = matchNumber(overall, /RMS trough dB:\s*(-?\d+(?:\.\d+)?|-inf)/);
    const peakCount = matchNumber(overall, /Peak count:\s*(\d+(?:\.\d+)?)/) ?? 0;
    return {
        clippingSamples: peak !== null && peak >= -.1 ? Math.round(peakCount) : 0,
        loudnessLufs: loudness,
        noiseFloorDb: trough !== null && trough >= -100 ? trough : null,
        peakDb: peak
    };
}

// Integrated loudness after the cleanup filters, from one pass of ebur128
export async function measureLoudness(filename: string, settings: AudioCleanupSettings): Promise<number | null> {
    const filters = [...cleanupFilters(settings), 'ebur128'];
    const stderr = await runFfmpeg(['-hide_banner', '-nostats', '-i', filename, '-af', filters.join(','), '-f', 'null', '-']);
    const summary = stderr.slice(stderr.lastIndexOf('Summary:'));
    return matchNumber(summary, /Integrated loudness:[\s\S]*?I:\s*(-?\d+(?:\.\d+)?) LUFS/);
}

// Narration quieter than the target is raised to it; louder narration keeps its own level, because a
// well-made recording should stay as it was (user, 2026-11-19: "the source is pretty good", on
// Valentin Haüy at -15.6 LUFS). A limiter then holds peaks under the limit; latency=1 makes up for
// its lookahead, so the audio isn't delayed against the cues.
// This replaced loudnorm, run twice (to measure, then to adjust), which took most of a narrated
// book's conversion time and switched to compressing the dynamics on nearly every book; side by
// side, the two sounded the same (user, 2026-11-19). The ceiling is 2.5 dB under the
// peak limit: alimiter limits samples, and encoding adds peaks. Through the small MP3 (32 kb/s),
// a ceiling of -2 dB still gave peaks of +0.4 dB on Valentin Haüy; -4 dB kept them under -1.5 dB.
// The level to reach is the target or the source's own loudness, whichever is louder: the cleanup
// filters (warm EQ above all) make a voice quieter, and a loud source gets back to where it was.
export function loudnessFilters(settings: AudioCleanupSettings, measuredLufs: number | null, sourceLufs: number | null = null): string[] {
    const level = Math.max(settings.loudnessLufs, sourceLufs ?? -Infinity);
    const gain = measuredLufs === null ? 0 : Math.max(0, level - measuredLufs);
    const limit = Math.min(1, Math.max(0.0625, 10 ** ((settings.truePeakDb - 2.5) / 20)));
    return [...(gain > 0 ? [`volume=${gain.toFixed(2)}dB`] : []), `alimiter=limit=${limit.toFixed(4)}:level=false:latency=1`];
}

function matchNumber(value: string, pattern: RegExp): number | null {
    const match = value.match(pattern)?.[1];
    if (!match || match === '-inf') return null;
    const number = Number(match);
    return Number.isFinite(number) ? number : null;
}

function runFfmpeg(args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
        const child = spawn(FFMPEG_PATH, args, { stdio: ['ignore', 'ignore', 'pipe'] });
        let stderr = '';
        child.stderr.setEncoding('utf8');
        child.stderr.on('data', chunk => { stderr += chunk; });
        child.on('error', reject);
        child.on('close', code => code === 0 ? resolve(stderr) : reject(new Error(`ffmpeg exited ${code}: ${stderr}`)));
    });
}
