// Bundles the book's own reader (template/src/js/main.js and everything it imports) into a few
// files, so a book's first page loads it in a handful of requests instead of one per module: on a
// slow connection, each round of module requests cost seconds. Parts that load only when used
// (the MathML converter, search, the shortcut editor) stay in their own files. The reader shell is
// embedded, as in a release.
//
// Two entry points: main.js, the reader, and offline-books.js, the saved books page
// (src/offline-books.html); they share chunks. Writes template/build/js/ and
// template/build/bundled.json, the source files the bundle replaces (and bootstrap-source.js,
// which build-bootstrap.mjs compiles into bootstrap.js); copyUiAssets (src/assets.ts) puts the bundle in each book in their
// place. Without template/build, books get the separate modules, which work the same way.
// Run by `npm run compile`, after tsc.

import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { build } from 'esbuild';
import { copyUiAssets } from '../build/assets.js';

const template = fileURLToPath(new URL('../template', import.meta.url));
const output = path.join(template, 'build');
const sources = path.join(template, 'src/js');
await fs.rm(output, { recursive: true, force: true });

// The reader shell, as copyUiAssets makes it for every book
const staging = await fs.mkdtemp(path.join(os.tmpdir(), 'webbook-reader-'));
let shell;
try {
    await copyUiAssets(template, { stagingDir: staging });
    shell = await fs.readFile(path.join(staging, 'src/reader-shell.html'), 'utf8');
} finally {
    await fs.rm(staging, { recursive: true, force: true });
}

const result = await build({
    entryPoints: [path.join(sources, 'main.js'), path.join(sources, 'offline-books.js')],
    bundle: true,
    splitting: true,
    format: 'esm',
    target: 'es2022',
    outdir: path.join(output, 'js'),
    entryNames: '[name]',
    chunkNames: 'chunk-[hash]',
    define: { __WEBBOOK_SHELL__: JSON.stringify(shell) },
    metafile: true,
    logLevel: 'error',
});

const bundled = Object.keys(result.metafile.inputs)
    .map(input => path.relative(sources, path.resolve(input)))
    .filter(file => !file.startsWith('..'))
    .map(file => file.split(path.sep).join('/'))
    .concat('bootstrap-source.js')
    .sort();

// A file left out of the bundle mustn't import one that's in it: in a book, that file is gone
for (const file of await fs.readdir(sources)) {
    if (!file.endsWith('.js') || bundled.includes(file)) continue;
    const code = await fs.readFile(path.join(sources, file), 'utf8');
    for (const [, statically, dynamically] of code.matchAll(/(?:^|[\s;])(?:import|export)\b[^'"]*?\bfrom\s*['"]\.\/([^'"]+)['"]|\bimport\s*\(\s*['"]\.\/([^'"]+)['"]/g)) {
        const imported = statically || dynamically;
        if (bundled.includes(imported)) throw new Error(`${file} imports ${imported}, which is bundled: add ${file} as an entry point.`);
    }
}
await fs.writeFile(path.join(output, 'bundled.json'), JSON.stringify(bundled, null, 2) + '\n');

const files = Object.entries(result.metafile.outputs);
console.log(`Reader bundle: ${files.length} files for ${bundled.length} modules, ${Math.round(files.reduce((sum, [, out]) => sum + out.bytes, 0) / 1024)} KB.`);
