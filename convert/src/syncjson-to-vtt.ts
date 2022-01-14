import fs from 'fs-extra';
import { createVtt } from "./vtt.js";

// one-off utility script
// the syncjson format was an experimental synchronization approach
async function syncJsonToVTT(inputFilename, outputFilename) {
    let fileContents = await fs.readFile(inputFilename, 'utf-8');
    let data = JSON.parse(fileContents);

    let parseMediaFragments = str => str.slice(3).split(',');
    let syncPoints = data.root.sequence.map(syncPoint => ({
        src: data.defaultSources.media,
        clipBegin: parseFloat(parseMediaFragments(syncPoint.media)[0]),
        clipEnd: parseFloat(parseMediaFragments(syncPoint.media)[1]),
        textSrc: syncPoint.target
    }));
    console.log(syncPoints);

    await createVtt(syncPoints, outputFilename);
}

export { syncJsonToVTT };