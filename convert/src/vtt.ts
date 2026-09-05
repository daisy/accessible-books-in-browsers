import fs from 'fs-extra';
import Vtt from 'vtt-creator';
import winston from 'winston';
import type { MediaSegment } from './audio.js';
import * as utils from './utils.js';

async function createVtt(mediaSegments: MediaSegment[], outFilename: string): Promise<void> {
    winston.info(`Generating ${outFilename}`);
    const v = new Vtt();
    let startTime = 0;

    mediaSegments.forEach(mediaSegment => {
        const textId = utils.getFrag(mediaSegment.textSrc);
        const dur = mediaSegment.durOnDisk ?? Math.max(0, mediaSegment.clipEnd.seconds - mediaSegment.clipBegin.seconds);
        const metadata = {
            selector: {
                type: 'FragmentSelector',
                value: textId
            }
        };

        v.add(startTime, startTime + dur, JSON.stringify(metadata));
        startTime += dur;
    });

    await fs.writeFile(outFilename, v.toString());
}

export { createVtt };
