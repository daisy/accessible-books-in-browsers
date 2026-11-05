import crypto from 'crypto';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import winston from 'winston';
import type { MediaSegment } from './audio.js';
import * as utils from './utils.js';

// Bump whenever mergeAudioSegments changes what it writes, so cached audio made the old way is
// rebuilt rather than reused
const MERGE_VERSION = 1;

export type AudioCache = {
    // This book's folder in the cache
    dir: string;
};

const DEFAULT_CACHE_DIR = path.join(os.tmpdir(), 'webbook-audio-cache');

// A development convenience: merging a page's clips is most of a conversion's time, and it gives
// the same file every time the clips haven't changed. The cache keeps only the latest audio for
// each page of each book, so it doesn't grow with every conversion.
function openAudioCache(option: string | boolean | undefined, bookId: string): AudioCache | null {
    if (!option) return null;
    const root = typeof option === 'string' ? path.resolve(option) : DEFAULT_CACHE_DIR;
    const bookFolder = crypto.createHash('sha256').update(bookId).digest('hex').slice(0, 16);
    const dir = path.join(root, bookFolder);
    winston.info(`Reusing unchanged audio from ${dir}`);
    return { dir };
}

// Everything that decides what the merged file contains: each clip's source file (by path, size
// and modification time) and the times cut from it
async function cacheKey(segments: MediaSegment[], audioExt: string): Promise<string> {
    const files = new Map<string, { size: number; mtimeMs: number }>();
    for (const segment of segments) {
        const src = utils.getWithoutFrag(segment.src);
        if (!files.has(src)) {
            const stat = await fs.stat(src);
            files.set(src, { size: stat.size, mtimeMs: stat.mtimeMs });
        }
    }
    const description = {
        version: MERGE_VERSION,
        audioExt,
        files: Array.from(files.entries()),
        clips: segments.map(segment => [segment.src, segment.clipBegin.seconds, segment.clipEnd.seconds])
    };
    return crypto.createHash('sha256').update(JSON.stringify(description)).digest('hex');
}

// Copies the cached audio to outPath and gives each segment its measured length, which the VTT is
// built from. False when there's nothing usable cached.
async function restoreCachedAudio(
    cache: AudioCache,
    audioFilename: string,
    segments: MediaSegment[],
    outPath: string,
    key: string
): Promise<boolean> {
    try {
        const manifest = await fs.readJson(path.join(cache.dir, `${audioFilename}.json`));
        if (manifest.key !== key || !Array.isArray(manifest.durations) || manifest.durations.length !== segments.length) {
            return false;
        }
        await fs.copy(path.join(cache.dir, audioFilename), outPath);
        segments.forEach((segment, i) => { segment.durOnDisk = manifest.durations[i]; });
        winston.info(`Reused cached audio for ${audioFilename}`);
        return true;
    } catch {
        return false;
    }
}

async function storeCachedAudio(
    cache: AudioCache,
    audioFilename: string,
    segments: MediaSegment[],
    outPath: string,
    key: string
): Promise<void> {
    try {
        await fs.ensureDir(cache.dir);
        await fs.copy(outPath, path.join(cache.dir, audioFilename));
        await fs.writeJson(path.join(cache.dir, `${audioFilename}.json`), {
            key,
            durations: segments.map(segment => segment.durOnDisk ?? null)
        });
    } catch (err) {
        winston.warn(`Couldn't cache audio for ${audioFilename}: ${(err as Error).message}`);
    }
}

export {
    cacheKey,
    openAudioCache,
    restoreCachedAudio,
    storeCachedAudio
};
