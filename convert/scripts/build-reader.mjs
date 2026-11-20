// Bundles the book's own reader (template/src/js/main.js and everything it imports), so a book's
// first page loads it in one or two requests instead of one per module: on a slow connection,
// each round of module requests cost seconds. Parts that load only when used (the MathML
// converter, search, the shortcut editor, media keys) stay in their own files. The reader shell is
// built in, as in a release.
//
// The Offline books page (src/offline-books.html) is bundled on its own. Sharing code with the
// reader would split both into extra shared files; the page is rarely opened, so it carries its own
// copy of the offline code instead.
//
// Writes template/build/js/ and template/build/bundled.json, the source files the bundle replaces
// (and bootstrap-source.js, which build-bootstrap.mjs compiles into bootstrap.js); copyUiAssets
// (src/assets.ts) puts the bundle in each book in their place. Without template/build, books get
// the separate modules, which work the same way. Run by `npm run compile`, after tsc.

import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';
import path from 'node:path';
import { build } from 'esbuild';
import { readerShell } from '../build/assets.js';

const template = fileURLToPath(new URL('../template', import.meta.url));
const output = path.join(template, 'build');
const sources = path.join(template, 'src/js');
await fs.rm(output, { recursive: true, force: true });

const common = { bundle: true, format: 'esm', target: 'es2022', metafile: true, logLevel: 'error' };
const reader = await build({
    ...common,
    entryPoints: [path.join(sources, 'main.js')],
    splitting: true,
    outdir: path.join(output, 'js'),
    entryNames: '[name]',
    chunkNames: 'chunk-[hash]',
    define: { __WEBBOOK_SHELL__: JSON.stringify(await readerShell(template)) },
});
const library = await build({
    ...common,
    entryPoints: [path.join(sources, 'offline-books.js')],
    outfile: path.join(output, 'js', 'offline-books.js'),
});

const bundled = [...new Set([reader, library].flatMap(result => Object.keys(result.metafile.inputs)))]
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

const outputs = [reader, library].flatMap(result => Object.entries(result.metafile.outputs));
const first = Object.values(reader.metafile.outputs).find(out => out.entryPoint);
console.log(`Reader bundle: ${outputs.length} files, ${Math.round(outputs.reduce((sum, [, out]) => sum + out.bytes, 0) / 1024)} KB; `
    + `a page loads main.js and ${first.imports.filter(i => i.kind === 'import-statement').length} more.`);
