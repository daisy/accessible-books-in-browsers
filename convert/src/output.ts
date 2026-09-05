import fs from 'fs-extra';
import path from 'path';
import tmp from 'tmp';

const OutputLayout = {
    audioDir: 'audio',
    imagesDir: 'images',
    logFilename: 'output.log',
    vttDir: 'vtt'
} as const;

export type OutputPaths = {
    output: string;
    stagingDir: string;
    audioDir: string;
    imagesDir: string;
    logFile: string;
    vttDir: string;
};

async function createOutputStaging(output: string): Promise<OutputPaths> {
    tmp.setGracefulCleanup();
    const stagingDir = tmp.dirSync({ prefix: 'webbook-', unsafeCleanup: true }).name;
    const paths = {
        output,
        stagingDir,
        audioDir: path.join(stagingDir, OutputLayout.audioDir),
        imagesDir: path.join(stagingDir, OutputLayout.imagesDir),
        logFile: path.join(stagingDir, OutputLayout.logFilename),
        vttDir: path.join(stagingDir, OutputLayout.vttDir)
    };

    await fs.ensureDir(paths.audioDir);
    await fs.ensureDir(paths.imagesDir);
    await fs.ensureDir(paths.vttDir);
    return paths;
}

async function finalizeOutput(paths: OutputPaths): Promise<void> {
    await fs.ensureDir(path.dirname(paths.output));
    await fs.remove(paths.output);
    await fs.move(paths.stagingDir, paths.output, { overwrite: true });
}

async function discardOutputStaging(paths: OutputPaths): Promise<void> {
    await fs.remove(paths.stagingDir);
}

function outputPath(paths: OutputPaths, filename: string): string {
    return path.join(paths.stagingDir, filename);
}

export {
    createOutputStaging,
    discardOutputStaging,
    finalizeOutput,
    OutputLayout,
    outputPath
};
