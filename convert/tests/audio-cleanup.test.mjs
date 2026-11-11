import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import {
    DEPLOSIVE_FILTER, analyzeAudio, audioCleanupSettings, cleanupFilters, fadeFilters,
    loudnormFilter, parseAudioEnhancements
} from '../build/audio-cleanup.js';
import { reportMarkdown } from '../build/conversion-report.js';

test('default cleanup and optional enhancements build a timing-preserving filter chain', () => {
    const defaults = audioCleanupSettings(true, []);
    assert.deepEqual(fadeFilters(2, defaults), ['afade=t=in:st=0:d=0.005', 'afade=t=out:st=1.995:d=0.005']);
    assert.deepEqual(cleanupFilters(defaults), ['asubcut=cutoff=90:order=10', DEPLOSIVE_FILTER]);
    assert.match(loudnormFilter(defaults, null), /I=-18.*TP=-1.5.*print_format=json/);

    const all = audioCleanupSettings(true, parseAudioEnhancements('warm-eq,compression,noise,deess,declick,warm-eq'));
    assert.deepEqual(all.enhancements, ['warm-eq', 'compression', 'noise', 'deess', 'declick']);
    assert.deepEqual(cleanupFilters(all).map(filter => filter.split('=')[0]),
        ['asubcut', 'acrossover', 'equalizer', 'equalizer', 'equalizer', 'acompressor', 'afftdn', 'deesser', 'adeclick']);
    assert.deepEqual(fadeFilters(.005, defaults), []);
    assert.deepEqual(cleanupFilters(audioCleanupSettings(false, [])), []);
    assert.throws(() => parseAudioEnhancements('warm-eq,watery'), /Invalid --audio-enhance value: watery/);
});

test('audio findings distinguish loud, quiet, and clipped generated files', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'webbook-audio-findings-'));
    try {
        const loud = path.join(dir, 'loud.wav');
        const quiet = path.join(dir, 'quiet.wav');
        const clipped = path.join(dir, 'clipped.wav');
        generate(loud, 'sine=frequency=1000:duration=1', 'volume=0.8');
        generate(quiet, 'sine=frequency=1000:duration=1', 'volume=0.03');
        generate(clipped, 'aevalsrc=1:d=1:s=24000');
        const [loudFinding, quietFinding, clippedFinding] = await Promise.all([
            analyzeAudio(loud), analyzeAudio(quiet), analyzeAudio(clipped)
        ]);
        assert.ok(loudFinding.loudnessLufs > quietFinding.loudnessLufs + 20);
        assert.ok(clippedFinding.clippingSamples > 1000);
        assert.ok(clippedFinding.peakDb >= -.1);
    } finally {
        await fs.rm(dir, { recursive: true });
    }
});

test('the conversion report describes cleanup settings and per-page findings', () => {
    const markdown = reportMarkdown({
        version: 1,
        language: { declared: 'en', effective: 'en' }, options: {}, changes: [], warnings: [], checks: [],
        audio: {
            mode: 'source-matched, single encode', sourceBytes: 1000, outputBytes: 900, settings: ['MP3'],
            maximumEncoderDriftSeconds: .001,
            cleanup: {
                enabled: true, targetLufs: -17, truePeakDb: -1.5, filters: ['highpass=f=75', 'two-pass loudnorm'],
                loudnessRangeBeforeLu: 8,
                pages: [{ page: 'chapter.html', clippingSamples: 12, loudnessLufs: -26,
                    noiseFloorDb: -32, peakDb: 0 }]
            }
        }
    });
    assert.match(markdown, /target -17 LUFS, true peak -1.5 dBTP/);
    assert.match(markdown, /Loudness range before cleanup: 8.0 LU/);
    assert.match(markdown, /chapter\.html: -26\.0 LUFS; peak 0\.0 dBFS; quietest stretch -32\.0 dBFS; clipping samples 12/);
});

function generate(output, source, filter) {
    const args = ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', source];
    if (filter) args.push('-af', filter);
    args.push('-c:a', 'pcm_s16le', output);
    const result = spawnSync(ffmpegInstaller.path, args);
    assert.equal(result.status, 0, result.stderr?.toString());
}

test('"none" turns the optional enhancements off', () => {
    assert.deepEqual(parseAudioEnhancements('none'), []);
    assert.throws(() => parseAudioEnhancements('none,warm-eq'), /Invalid --audio-enhance value: none/);
});
