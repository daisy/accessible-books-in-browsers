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
        let textId = utils.getFrag(mediaSegment.textSrc);
        let dur = getDuration(mediaSegment.clipBegin.seconds, mediaSegment.clipEnd.seconds);
        let metadata = {
            action: "addCssClass",
            data: "abotw-sync-highlight",
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
