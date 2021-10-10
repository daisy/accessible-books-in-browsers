import { path as ffmpegPath } from '@ffmpeg-installer/ffmpeg';
import { path as ffprobePath } from '@ffprobe-installer/ffprobe';
import ffmpeg from 'fluent-ffmpeg';

import fs from 'fs-extra';
import * as fileio from './file-io.js';
import xpath from 'xpath';
import * as path from 'path';
import * as utils from './utils.js';
import winston from 'winston';
import tmp from 'tmp';

let select = xpath.useNamespaces({
    html: 'http://www.w3.org/1999/xhtml',
    epub: "http://www.idpf.org/2007/ops",
    dc: "http://purl.org/dc/elements/1.1/",
    opf: "http://www.idpf.org/2007/opf",
    smil: "http://www.w3.org/ns/SMIL"
});

async function mergeAudioSegments(mediaSegments, outFilename) {
    winston.info("Merging audio clips into", outFilename);
    return;
    
    tmp.setGracefulCleanup();
    let tmpDirname = tmp.dirSync({unsafeCleanup: true}).name;
    let audioTmpFilenames = [];
    // first, create clips for each audio segment
    let clipCreation = mediaSegments.map((audio, idx) => {
        return new Promise((resolve, reject) => {
            let audioTmpFilename = path.join(tmpDirname, `${idx}${path.extname(audio.src)}`);
            audioTmpFilenames.push(audioTmpFilename);
            ffmpeg()
                .input(audio.src)
                .audioFilters(`atrim=${audio.clipBegin}:${audio.clipEnd}`)
                .output(audioTmpFilename)
                .on('progress', (progress) => {
                    winston.verbose(`[ffmpeg] ${JSON.stringify(progress)}`);
                })
                .on('error', (err) => {
                    winston.error(`[ffmpeg] error: ${err.message}`);
                    reject(err);
                })
                .on('end', () => {
                    winston.verbose('[ffmpeg] finished');
                    resolve(0);
                })
                .run();
        });
    });

    await Promise.all(clipCreation);

    let concatFiles = 'concat:' + audioTmpFilenames.join('|');
    
    // merge the clips into one audio file
    let mergeOperation = new Promise((resolve, reject) => {
        ffmpeg()
            .input(concatFiles)
            .output(outFilename)
            .on('progress', (progress) => {
                winston.verbose(`[ffmpeg] ${JSON.stringify(progress)}`);
            })
            .on('error', (err) => {
                winston.error(`[ffmpeg] error: ${err.message}`);
                reject(err);
            })
            .on('end', () => {
                winston.verbose('[ffmpeg] finished');
                resolve(0);
            })
            .run();
    });

    await mergeOperation;
}


export{ mergeAudioSegments };
