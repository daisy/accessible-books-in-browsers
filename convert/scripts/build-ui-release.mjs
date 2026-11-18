import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { copyUiAssets } from '../build/assets.js';
import { cssReferences } from '../template/src/js/offline-resources.js';
const [destination, version] = process.argv.slice(2);
if (!destination || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/.test(version || ''))
    throw new Error('Usage: node scripts/build-ui-release.mjs <channel-directory> <immutable-version>');
const channel = path.resolve(destination),
    release = path.join(channel, 'releases', version);
try {
    await fs.access(release);
    throw new Error('Release already exists; immutable releases cannot be overwritten.');
} catch (error) {
    if (error.code !== 'ENOENT') throw error;
}
const staging = await fs.mkdtemp(path.join(os.tmpdir(), 'webbook-release-'));
try {
    await copyUiAssets(fileURLToPath(new URL('../template', import.meta.url)), { stagingDir: staging });
    const shell = await fs.readFile(path.join(staging, 'src/reader-shell.html'), 'utf8');
    const output = path.join(staging, 'release');
    await fs.mkdir(output);
    const bundled = await build({
        entryPoints: [fileURLToPath(new URL('../template/src/js/main.js', import.meta.url))],
        bundle: true,
        format: 'esm',
        target: 'es2022',
        outfile: path.join(output, 'main.js'),
        define: { __WEBBOOK_SHELL__: JSON.stringify(shell), __WEBBOOK_RELEASE__: 'true' },
        metafile: true,
    });
    if (Object.values(bundled.metafile.outputs).some((output) => output.imports.length)) {
        throw new Error('A release must bundle every module dependency.');
    }
    const styles = await fs.readFile(path.join(staging, 'src/css/style.css'), 'utf8');
    if (cssReferences(styles).some((href) => !/^(data:|#)/i.test(href))) {
        throw new Error('Reader CSS has an unpackaged resource. Include it in the immutable release before publishing.');
    }
    await fs.copyFile(path.join(staging, 'src/css/style.css'), path.join(output, 'style.css'));
    const worker = await Promise.all(
        ['offline-range.js', 'offline-network.js', 'offline-worker-core.js'].map((file) =>
            fs.readFile(path.join(staging, 'src/js', file), 'utf8'),
        ),
    );
    await fs.writeFile(path.join(output, 'offline-worker.js'), worker.join('\n'));
    const files = [];
    for (const href of (await fs.readdir(output)).sort()) {
        const bytes = await fs.readFile(path.join(output, href));
        files.push({ href, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
    }
    const inventory = {
        version: 1,
        contract: 0,
        revision: createHash('sha256').update(JSON.stringify(files)).digest('hex'),
        files,
    };
    await fs.writeFile(path.join(output, 'ui-files.json'), JSON.stringify(inventory, null, 2) + '\n');
    await fs.mkdir(path.dirname(release), { recursive: true });
    await fs.mkdir(release);
    await fs.cp(output, release, { recursive: true, errorOnExist: true, force: false });
    const manifest = {
        contract: 0,
        version,
        minBootstrap: 1,
        script: `releases/${version}/main.js`,
        stylesheet: `releases/${version}/style.css`,
        worker: `releases/${version}/offline-worker.js`,
        inventory: `releases/${version}/ui-files.json`,
        protocol: 1,
        integrity: Object.fromEntries([['script', 'main.js'], ['stylesheet', 'style.css']].map(([key, href]) => [key, 'sha256-' + Buffer.from(files.find(file => file.href === href).sha256, 'hex').toString('base64')])),
    };
    await fs.mkdir(path.join(channel, 'manifests'), { recursive: true });
    await fs.writeFile(
        path.join(channel, 'manifests', version + '.json'),
        JSON.stringify(manifest, null, 2) + '\n',
    );
    await fs.writeFile(path.join(channel, 'candidate.json'), JSON.stringify(manifest, null, 2) + '\n');
    console.log(
        `Built ${release}. Run release conformance checks before promoting candidate.json to current.json.`,
    );
} finally {
    await fs.rm(staging, { recursive: true, force: true });
}
