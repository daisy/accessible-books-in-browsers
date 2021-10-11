import fs from 'fs-extra';
import path from 'path';
import Vtt from 'vtt-creator';
import winston from 'winston';
import * as utils from './utils.js';

async function createVtt(mediaSegments, outFilename) {
    winston.info(`Generating vtt`);
    var v = new Vtt();
    let startTime = 0;

    let getDuration = (clipBegin, clipEnd) => {
        //@ts-ignore
        return parseFloat(clipEnd) - parseFloat(clipBegin);
    };

    utils.toSeconds("");
    mediaSegments.map(mediaSegment => {
        let text = utils.getFrag(mediaSegment.textSrc);
        let dur = getDuration(mediaSegment.clipBegin.seconds, mediaSegment.clipEnd.seconds);
        v.add(startTime, startTime + dur, `#${text}`);
        startTime += dur;
    });

    await fs.writeFile(outFilename, v.toString());
    winston.info(`Done generating captions`);
}

export { createVtt };
