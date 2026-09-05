import extractZip from 'extract-zip';
import fs from 'fs-extra';
import tmp from 'tmp';
import winston from 'winston';

async function unzip(inputFilename: string): Promise<string> {
    const tmpdir = tmp.dirSync({ unsafeCleanup: true }).name;
    try {
        await extractZip(inputFilename, { dir: tmpdir });
    }
    catch (err) {
        await retryUnzip(inputFilename, tmpdir, err as Error);
    }
    return tmpdir;
}

async function retryUnzip(inputFilename: string, output: string, err: Error): Promise<void> {
    const invalidCommentLengthMatch = err.message.match(/invalid comment length\. expected: (\d+)\. found: (\d)/);
    if (!invalidCommentLengthMatch) {
        winston.error('The ZIP archive could not be repaired.');
        throw err;
    }

    winston.info('Trying to repair the archive and unzip again...');
    try {
        const tmpEPUB = tmp.fileSync({ unsafeCleanup: true }).name;
        const size = fs.statSync(inputFilename).size;
        const truncatedSize = size - parseInt(invalidCommentLengthMatch[1], 10);
        fs.copySync(inputFilename, tmpEPUB);
        fs.truncateSync(tmpEPUB, truncatedSize);
        await extractZip(tmpEPUB, { dir: output });
    }
    catch (error) {
        winston.error('The ZIP archive could not be repaired.');
        throw error;
    }
}

export { unzip };
