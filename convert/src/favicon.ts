import fs from 'fs-extra';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import winston from 'winston';
import { configureFfmpeg } from './ffmpeg.js';
import type { OutputPaths } from './output.js';

export type BookFavicon = { href: string; type: string; sizes: string };
export const GENERIC_BOOK_FAVICON: BookFavicon = { href: 'src/icons/book.svg', type: 'image/svg+xml', sizes: 'any' };

export async function createBookFavicon(cover: string | undefined, output: OutputPaths): Promise<BookFavicon> {
    if (!cover) return GENERIC_BOOK_FAVICON;
    const filename = path.join(output.stagingDir, 'favicon.png');
    try {
        await configureFfmpeg();
        await new Promise<void>((resolve, reject) => {
            ffmpeg().input(cover)
                .outputOptions(['-vf scale=64:64:force_original_aspect_ratio=decrease,format=rgba,pad=64:64:(ow-iw)/2:(oh-ih)/2:color=0x00000000', '-frames:v 1', '-threads 1'])
                .output(filename).on('end', () => resolve()).on('error', reject).run();
        });
        return { href: 'favicon.png', type: 'image/png', sizes: '64x64' };
    } catch {
        await fs.remove(filename);
        winston.warn('The cover could not be resized for a favicon; using the generic book icon.');
        return GENERIC_BOOK_FAVICON;
    }
}
