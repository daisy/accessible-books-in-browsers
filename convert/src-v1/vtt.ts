import fs from 'fs-extra';
import Vtt from 'vtt-creator';
import winston from 'winston';
import * as utils from './utils.js';

async function createVtt(mediaSegments, outFilename) {
    winston.info(`Generating vtt`);
    var v = new Vtt();
    let startTime = 0;
    mediaSegments.map(mediaSegment => {
        let textId = utils.getFrag(mediaSegment.textSrc);
        let dur = mediaSegment.durOnDisk;
        let metadata = {
            selector: {
                type: "FragmentSelector",
                value: `${textId}`
            }
        };
        v.add(startTime, startTime + dur, JSON.stringify(metadata));
        startTime += dur;
    });

    await fs.writeFile(outFilename, v.toString());
}

export { createVtt };
