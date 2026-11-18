import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'fs-extra';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import ffmpegPath from 'ffmpeg-static';
import { createBookFavicon, GENERIC_BOOK_FAVICON } from '../build/favicon.js';

test('cover favicons are small square PNGs, with a generic fallback for absent or unreadable covers', async () => {
    const stagingDir = await fs.mkdtemp(path.join(os.tmpdir(), 'webbook-favicon-'));
    try {
        assert.deepEqual(await createBookFavicon(undefined, { stagingDir }), GENERIC_BOOK_FAVICON);
        // A tall red cover verifies that a rectangular source can make a square tab icon.
        const cover = path.join(stagingDir, 'cover.ppm');
        await fs.writeFile(cover, Buffer.concat([Buffer.from('P6\n2 4\n255\n'), Buffer.from(Array.from({ length: 8 }, () => [255, 0, 0]).flat())]));
        assert.deepEqual(await createBookFavicon(cover, { stagingDir }), { href: 'favicon.png', type: 'image/png', sizes: '64x64' });
        const png = await fs.readFile(path.join(stagingDir, 'favicon.png'));
        assert.equal(png.subarray(1, 4).toString(), 'PNG');
        assert.equal(png.readUInt32BE(16), 64);
        assert.equal(png.readUInt32BE(20), 64);
        assert(png.length < 10000);
        const pixels = execFileSync(ffmpegPath, ['-v', 'error', '-i', path.join(stagingDir, 'favicon.png'), '-f', 'rawvideo', '-pix_fmt', 'rgba', '-']);
        assert.equal(pixels[3], 0, 'the tall cover has transparent space at its sides');
        assert.deepEqual([...pixels.subarray((32 * 64 + 32) * 4, (32 * 64 + 32) * 4 + 4)], [255, 0, 0, 255]);
        assert.deepEqual(await createBookFavicon(path.join(stagingDir, 'missing.jpg'), { stagingDir }), GENERIC_BOOK_FAVICON);
        assert.equal(await fs.pathExists(path.join(stagingDir, 'favicon.png')), false);
    } finally { await fs.remove(stagingDir); }
});
