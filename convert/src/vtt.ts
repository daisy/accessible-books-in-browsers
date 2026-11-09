import fs from 'fs-extra';
import Vtt from 'vtt-creator';
import winston from 'winston';
import type { MediaSegment } from './audio.js';
import * as utils from './utils.js';
import type { NarrationSelector } from './structure-ids.js';

async function createVtt(mediaSegments: MediaSegment[], outFilename: string, selectors: Map<string, NarrationSelector> = new Map()): Promise<void> {
    winston.info(`Generating ${outFilename}`);
    const v = new Vtt();
    let startTime = 0;

    mediaSegments.forEach(mediaSegment => {
        const textId = utils.getFrag(mediaSegment.textSrc);
        const dur = mediaSegment.durOnDisk ?? Math.max(0, mediaSegment.clipEnd.seconds - mediaSegment.clipBegin.seconds);
        const metadata = {
            selector: selectors.get(textId) ?? {
                type: 'FragmentSelector',
                value: textId
            }
        };

        v.add(startTime, startTime + dur, JSON.stringify(metadata));
        startTime += dur;
    });

    // vtt-creator emits CRLF. Keep generated text files consistent with the repository and
    // avoid every line appearing to contain trailing whitespace in Git.
    await fs.writeFile(outFilename, v.toString().replace(/\r\n/g, '\n'));
}

export { createVtt };
