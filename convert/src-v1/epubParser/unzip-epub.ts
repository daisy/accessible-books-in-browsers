import extractZip from 'extract-zip';
import tmp from 'tmp';
import winston from 'winston';
import fs from 'fs-extra';

async function unzip(inputFilename) {
    const tmpdir = tmp.dirSync({ unsafeCleanup: true }).name;
    try {
        await extractZip(inputFilename, { dir: tmpdir});
    }
    catch(err) {
        try {
            await retryUnzip(inputFilename, tmpdir, err);
        }
        catch(err) {
            throw(err);
        }
    }
    return tmpdir;
}

async function retryUnzip(inputFilename, outputDir, err) {
    let invalidCommentLengthMatch = err.message.match(/invalid comment length\. expected: (\d+)\. found: (\d)/);
    if (invalidCommentLengthMatch) {
        winston.info('Trying to repair the archive and unzip again...');
        try {
            const tmpEPUB = tmp.fileSync({ unsafeCleanup: true }).name;
            const size  = fs.statSync(inputFilename).size;
            const truncatedSize = size - invalidCommentLengthMatch[1];
            fs.copySync(inputFilename, tmpEPUB);
            fs.truncateSync(tmpEPUB, truncatedSize);
            await extractZip(inputFilename, { dir: outputDir });
        } 
        catch (error) {
            winston.error('The ZIP archive couldn’t be repaired.');
        }
    }
    else {
        winston.error('The ZIP archive couldn’t be repaired.');
    }    
}

export { unzip };