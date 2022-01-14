import fs from 'fs-extra';
import path from 'path';
import Vtt from 'vtt-creator';
import winston from 'winston';
import * as utils from './utils.js';

/* media segments look like this
{
    src: the audio src,
    clipBegin,
    clipEnd,
    textSrc
});
*/
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
        
        let metadata = {
            action: {
                name: "addCssClass",
                data: "abotw-sync-highlight"
            },
            selector: {
                type: "FragmentSelector",
                value: `${textId}`
            }
        };
        if (mediaSegment.durOnDisk) {
            let dur = mediaSegment.durOnDisk;
            v.add(
                startTime, 
                startTime + dur, 
                JSON.stringify(metadata)
            );
            startTime += dur;
        }
        else {
            v.add(
                mediaSegment.clipBegin, 
                mediaSegment.clipEnd,
                JSON.stringify(metadata)
            );
        }
    });

    await fs.writeFile(outFilename, v.toString());
}

export { createVtt };
