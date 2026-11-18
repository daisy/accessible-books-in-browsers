import * as esbuild from 'esbuild';
import path from 'node:path';
const here = path.dirname(new URL(import.meta.url).pathname);
const shim = name => path.join(here, 'shims', name);
const stubs = shim('node-stubs.js');
// Builds the browser converter (plan 19): the Node converter's own build (convert/build, from
// `npm run build` in convert/), bundled with stand-ins for Node (shims/); the reader template,
// packed; and the runtime libraries, copied into vendor/. Run after changing convert/, then commit
// dist/ and vendor/: GitHub Pages publishes the files as they are.
async function bundle() {
    const result = await esbuild.build({
        entryPoints: [path.join(here, 'entry.js')],
        bundle: true, format: 'esm', platform: 'browser', target: 'es2022',
        outfile: path.join(here, 'dist/converter.js'),
        nodePaths: [path.join(here, 'node_modules')],
        inject: [shim('globals.js')],
        define: { global: 'globalThis' },
        alias: {
            'fs': shim('fs.js'), 'fs-extra': shim('fs.js'), 'fs/promises': shim('fs.js'), 'graceful-fs': shim('fs.js'),
            'path': 'path-browserify', 'node:path': 'path-browserify',
            'jsdom': shim('jsdom.js'), 'winston': shim('winston.js'), 'logform': shim('winston.js'),
            'tmp': shim('tmp.js'), 'crypto': shim('crypto.js'), 'extract-zip': shim('extract-zip.js'),
            'fluent-ffmpeg': shim('ffmpeg-wasm.js'), '@ffmpeg-installer/ffmpeg': stubs, 'ffmpeg-static': stubs,
            'child_process': shim('child-process-wasm.js'), 'node:child_process': stubs, 'os': stubs, 'node:os': stubs,
            'node:module': stubs, 'node:url': stubs, 'url': stubs, 'buffer': path.join(here, 'node_modules/buffer/index.js')
        },
        plugins: [{ name: 'spike-seams', setup(b) {
            b.onResolve({ filter: /^\.\/fs\/node$/ }, args => args.importer.includes('chardet') ? { path: shim('chardet-fs.js') } : undefined);
        } }],
        metafile: true, logLevel: 'error'
    });
    const out = Object.values(result.metafile.outputs)[0];
    console.log('converter bundle bytes', out.bytes);
}
await bundle();

// The template the converter reads, packed for the in-memory file system (tests left out)
import fs from 'node:fs';
const templateRoot = path.join(here, '../convert/template');
const packed = {};
const walk = dir => { for (const name of fs.readdirSync(dir)) { const full = path.join(dir, name); const rel = path.relative(templateRoot, full); if (rel === 'test' || rel.startsWith('test/')) continue; if (fs.statSync(full).isDirectory()) walk(full); else packed[rel] = fs.readFileSync(full).toString('base64'); } };
walk(templateRoot);
fs.writeFileSync(path.join(here, 'dist/template.json'), JSON.stringify(packed));
// The converter records its version from its package.json (read at /package.json in the bundle)
const { name, version } = JSON.parse(fs.readFileSync(path.join(here, '../convert/package.json'), 'utf8'));
fs.writeFileSync(path.join(here, 'dist/converter-package.json'), JSON.stringify({ name, version }));
console.log('template files', Object.keys(packed).length);

// Runtime libraries the page loads, from node_modules into vendor/ (committed, for GitHub Pages)
const modules = path.join(here, 'node_modules');
const copy = (from, to) => { fs.mkdirSync(path.dirname(to), { recursive: true }); fs.copyFileSync(from, to); };
fs.rmSync(path.join(here, 'vendor'), { recursive: true, force: true });
copy(path.join(modules, 'fflate/esm/browser.js'), path.join(here, 'vendor/fflate.js'));
for (const name of fs.readdirSync(path.join(modules, '@ffmpeg/ffmpeg/dist/esm'))) {
    if (name.endsWith('.js') || name.endsWith('.mjs')) copy(path.join(modules, '@ffmpeg/ffmpeg/dist/esm', name), path.join(here, 'vendor/ffmpeg', name));
}
for (const name of ['ffmpeg-core.js', 'ffmpeg-core.wasm']) copy(path.join(modules, '@ffmpeg/core/dist/esm', name), path.join(here, 'vendor/ffmpeg-core', name));
console.log('vendor files copied');
