import fs from 'fs-extra';
import path from 'path';
import tmp from 'tmp';

const OutputLayout = {
    audioDir: 'audio',
    imagesDir: 'images',
    logFilename: 'output.log',
    serviceWorkerFilename: 'sw.js',
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

// The real path, through symbolic links and in the file system's own letter case; for a path that
// doesn't exist yet, its nearest existing folder's, with the rest added
async function realPath(file: string): Promise<string> {
    const rest: string[] = [];
    for (let current = path.resolve(file); ; current = path.dirname(current)) {
        try { return path.join(await fs.realpath.native(current), ...rest.reverse()); }
        catch { if (path.dirname(current) === current) return path.resolve(file); rest.push(path.basename(current)); }
    }
}

const overlaps = (a: string, b: string) => a === b || a.startsWith(b + path.sep) || b.startsWith(a + path.sep);

// The output folder is replaced, so it mustn't be, contain or be inside the EPUB or the template:
// that would delete them. Checked before converting.
async function checkOutputPath(output: string, others: { input: string; template: string }): Promise<void> {
    const target = await realPath(output);
    for (const [name, other] of Object.entries(others)) {
        if (overlaps(target, await realPath(other)))
            throw new Error(`The output folder ${output} overlaps the ${name === 'input' ? 'EPUB' : 'template'} (${other}). Choose a separate output folder.`);
    }
}

// The finished book replaces any earlier one only once it's ready: the old folder is moved aside
// first, and deleted last, so a failed move leaves it in place
async function finalizeOutput(paths: OutputPaths): Promise<void> {
    await fs.ensureDir(path.dirname(paths.output));
    const previous = await fs.pathExists(paths.output) ? `${paths.output}.webbook-previous-${process.pid}` : null;
    if (previous) await fs.move(paths.output, previous, { overwrite: true });
    try { await fs.move(paths.stagingDir, paths.output); }
    catch (error) { if (previous) await fs.move(previous, paths.output); throw error; }
    if (previous) await fs.remove(previous);
}

async function discardOutputStaging(paths: OutputPaths): Promise<void> {
    await fs.remove(paths.stagingDir);
}

function outputPath(paths: OutputPaths, filename: string): string {
    return path.join(paths.stagingDir, filename);
}

export {
    checkOutputPath,
    createOutputStaging,
    discardOutputStaging,
    finalizeOutput,
    OutputLayout,
    outputPath
};
