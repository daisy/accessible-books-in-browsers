import { spawn } from 'child_process';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';

export const AUDIO_ENHANCEMENTS = ['warm-eq', 'compression', 'noise', 'deess', 'declick'] as const;
export type AudioEnhancement = typeof AUDIO_ENHANCEMENTS[number];

export type AudioCleanupSettings = {
    enabled: boolean;
    enhancements: AudioEnhancement[];
    fadeMilliseconds: number;
    lowCutHz: number;
    deplosive: boolean;
    loudnessLufs: number;
    loudnessRangeLu: number;
    truePeakDb: number;
};

export type AudioFindings = {
    clippingSamples: number;
    loudnessLufs: number | null;
    noiseFloorDb: number | null;
    peakDb: number | null;
};

export type LoudnormMeasurement = {
    input_i: string;
    input_lra: string;
    input_tp: string;
    input_thresh: string;
    target_offset: string;
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
        loudnessRangeLu: 7,
        truePeakDb: -1.5
    };
}

export function parseAudioEnhancements(value: string): AudioEnhancement[] {
    const names = value.split(',').map(name => name.trim()).filter(Boolean);
    const invalid = names.filter(name => !AUDIO_ENHANCEMENTS.includes(name as AudioEnhancement));
    if (invalid.length) {
        throw new Error(`Invalid --audio-enhance value: ${invalid.join(', ')}. Use ${AUDIO_ENHANCEMENTS.join(', ')}.`);
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

export async function measureLoudnorm(filename: string, settings: AudioCleanupSettings): Promise<LoudnormMeasurement | null> {
    const filters = [...cleanupFilters(settings), loudnormFilter(settings, null)];
    const stderr = await runFfmpeg(['-hide_banner', '-nostats', '-i', filename, '-af', filters.join(','), '-f', 'null', '-']);
    const matches = stderr.match(/\{\s*"input_i"[\s\S]*?\}/g);
    const match = matches?.[matches.length - 1];
    if (!match) return null;
    const measured = JSON.parse(match) as LoudnormMeasurement;
    return [measured.input_i, measured.input_lra, measured.input_tp, measured.input_thresh, measured.target_offset]
        .every(value => Number.isFinite(Number(value))) ? measured : null;
}

export function loudnormFilter(settings: AudioCleanupSettings, measured: LoudnormMeasurement | null): string {
    const parts = [
        `I=${settings.loudnessLufs}`,
        `LRA=${settings.loudnessRangeLu}`,
        `TP=${settings.truePeakDb}`
    ];
    if (measured) {
        parts.push(`measured_I=${measured.input_i}`, `measured_LRA=${measured.input_lra}`,
            `measured_TP=${measured.input_tp}`, `measured_thresh=${measured.input_thresh}`,
            `offset=${measured.target_offset}`, 'linear=true');
    }
    else parts.push('print_format=json');
    return `loudnorm=${parts.join(':')}`;
}

function matchNumber(value: string, pattern: RegExp): number | null {
    const match = value.match(pattern)?.[1];
    if (!match || match === '-inf') return null;
    const number = Number(match);
    return Number.isFinite(number) ? number : null;
}

function runFfmpeg(args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
        const child = spawn(ffmpegInstaller.path, args, { stdio: ['ignore', 'ignore', 'pipe'] });
        let stderr = '';
        child.stderr.setEncoding('utf8');
        child.stderr.on('data', chunk => { stderr += chunk; });
        child.on('error', reject);
        child.on('close', code => code === 0 ? resolve(stderr) : reject(new Error(`ffmpeg exited ${code}: ${stderr}`)));
    });
}
