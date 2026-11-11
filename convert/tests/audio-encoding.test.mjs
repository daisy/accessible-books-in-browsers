import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { chooseAudioEncodingSettings, SMALL_AUDIO_ENCODING } from '../build/audio.js';
import { cacheKey, MERGE_VERSION } from '../build/audio-cache.js';
import { audioCleanupSettings } from '../build/audio-cleanup.js';

test('source-matched encoding uses the highest channel, sample-rate and bitrate settings', () => {
    assert.deepEqual(chooseAudioEncodingSettings([
        { bitrate: 47999, channels: 1, codec: 'mp3', sampleRate: 22050 },
        { bitrate: 64000, channels: 2, codec: 'mp3', sampleRate: 44100 }
    ], '.mp3'), {
        bitrateKbps: 64, channels: 2, codec: 'libmp3lame', extension: '.mp3', sampleRate: 44100
    });
    assert.equal(chooseAudioEncodingSettings([
        { bitrate: 48001, channels: 1, codec: 'mp3', sampleRate: 24000 }
    ], '.mp3').bitrateKbps, 49);
});

test('audio cache keys include the merge version and every encoding setting', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'webbook-audio-key-'));
    const source = path.join(dir, 'source.mp3');
    try {
        await fs.writeFile(source, 'audio');
        const segments = [{
            src: source, textSrc: 'page.xhtml#phrase',
            clipBegin: { seconds: 0 }, clipEnd: { seconds: 1 }
        }];
        const base = { bitrateKbps: 48, channels: 1, codec: 'libmp3lame', extension: '.mp3', sampleRate: 24000 };
        const cleanup = audioCleanupSettings(true, []);
        const original = await cacheKey(segments, base, cleanup);
        const changed = await cacheKey(segments, { ...base, bitrateKbps: 64 }, cleanup);
        const cleanupChanged = await cacheKey(segments, base, audioCleanupSettings(false, []));
        assert.notEqual(original, changed);
        assert.notEqual(original, cleanupChanged);
        assert.equal(MERGE_VERSION, 5);
    } finally {
        await fs.rm(dir, { recursive: true });
    }
});

test('small audio uses mono 24 kHz MP3 at 32 kb/s', () => {
    assert.deepEqual({ ...SMALL_AUDIO_ENCODING }, {
        bitrateKbps: 32, channels: 1, codec: 'libmp3lame', extension: '.mp3', sampleRate: 24000
    });
});
