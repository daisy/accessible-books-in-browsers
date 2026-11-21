// Checks the browser converter in Chrome: the built page (dist/), its shims and its preview, on
// small EPUBs made here. Serves the repository on localhost (a service worker needs it), and fails if
// any check does.
//
//   node converter/check-converter.mjs
//
// Needs `npm ci` in convert/ (for playwright-core) and converter/ (for fflate), a current build
// (cd convert && npm run build, then cd ../converter && npm run build), and Chrome or Chromium:
// set CHROME_PATH, or it looks in the usual places. ONLY=name runs the checks whose names include it.
// Narration isn't checked here: ffmpeg.wasm takes minutes even for a short preview.

import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { zipSync, strToU8 } from 'fflate';

const require = createRequire(new URL('../convert/package.json', import.meta.url));
const { chromium } = require('playwright-core');
const root = fileURLToPath(new URL('..', import.meta.url));

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
    '.wasm': 'application/wasm', '.png': 'image/png', '.svg': 'image/svg+xml', '.epub': 'application/epub+zip' };
const server = createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const file = path.join(root, pathname.endsWith('/') ? pathname + 'index.html' : pathname);
    if (!file.startsWith(root) || !existsSync(file) || statSync(file).isDirectory()) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(readFileSync(file));
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://localhost:${server.address().port}/converter/`;

const chrome = [process.env.CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find(p => p && existsSync(p));
if (!chrome) throw new Error('Chrome not found; set CHROME_PATH');
const browser = await chromium.launch({ executablePath: chrome });

// A small EPUB 3: its chapters, any other files, and its package's manifest items
function epub({ chapters, files = {}, items = '', spine }) {
    const entries = {
        'mimetype': [strToU8('application/epub+zip'), { level: 0 }],
        'META-INF/container.xml': strToU8('<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0"><rootfiles><rootfile full-path="package.opf" media-type="application/oebps-package+xml"/></rootfiles></container>'),
        'nav.xhtml': strToU8(`<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><title>Contents</title></head><body><nav epub:type="toc"><ol>${Object.keys(chapters).map(href => `<li><a href="${href}">${href}</a></li>`).join('')}</ol></nav></body></html>`)
    };
    const manifest = Object.keys(chapters).map((href, i) => `<item id="c${i}" href="${href}" media-type="application/xhtml+xml"${/<script|<svg/.test(chapters[href]) ? ' properties="scripted svg"' : ''}/>`).join('');
    entries['package.opf'] = strToU8(`<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="id"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="id">check</dc:identifier><dc:title>Check</dc:title><dc:language>en</dc:language></metadata><manifest>${manifest}${items}<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/></manifest><spine>${(spine ?? Object.keys(chapters).map((_, i) => `c${i}`)).map(id => `<itemref idref="${id}"/>`).join('')}</spine></package>`);
    for (const [href, xhtml] of Object.entries(chapters)) entries[decodeURIComponent(href)] = strToU8(xhtml);
    for (const [name, content] of Object.entries(files)) entries[name] = typeof content === 'string' ? strToU8(content) : content;
    return Buffer.from(zipSync(entries)).toString('base64');
}
const page = (body, title = 'Check') => `<html xmlns="http://www.w3.org/1999/xhtml"><head><title>${title}</title></head><body><h1>${title}</h1>${body}</body></html>`;

// A fresh browser (its own storage and service workers) on the converter page, ready to convert
async function converterPage() {
    const context = await browser.newContext();
    const tab = await context.newPage();
    const errors = [];
    tab.on('pageerror', error => errors.push(error.message));
    await tab.goto(base);
    await tab.waitForFunction(() => typeof globalThis.convertBytes === 'function', null, { timeout: 60000 });
    return { context, tab, errors };
}
// Converts in the page; returns the output's file names and the named files' text
const convertIn = (tab, b64, read = []) => tab.evaluate(async ({ b64, read }) => {
    const { files } = await globalThis.convertBytes(Uint8Array.from(atob(b64), c => c.charCodeAt(0)), {}, 'check.epub');
    return { names: Object.keys(files), text: Object.fromEntries(read.map(name => [name, files[name] && new TextDecoder().decode(files[name])])) };
}, { b64, read });

const checks = {
    async 'converts a book'() {
        const { context, tab, errors } = await converterPage();
        const out = await convertIn(tab, readFileSync(path.join(root, 'source-epubs/packaged/notes-test.epub')).toString('base64'), ['conversion-report.md']);
        for (const name of ['index.html', 'toc.html', 'about.html', 'sw.js', 'src/ui-files.json', 'conversion-report.md']) assert(out.names.includes(name), `${name} is in the output`);
        assert(/^# /m.test(out.text['conversion-report.md']), 'the report is written');
        assert(!errors.length, errors.join('; '));
        await context.close();
        return `${out.names.length} files`;
    },
    async 'removes the book\'s scripts'() {
        const { context, tab } = await converterPage();
        const b64 = epub({
            chapters: { 'chapter.xhtml': page('<script>window.ran=1</script><p onclick="x()">Words stay.</p><p><a href="javascript:alert(1)">A link</a></p><p><img src="picture.svg" alt="A picture"/></p>') },
            files: { 'picture.svg': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" onload="x()"><script>window.ran=1</script><circle r="5"/></svg>' },
            items: '<item id="pic" href="picture.svg" media-type="image/svg+xml"/>'
        });
        const out = await convertIn(tab, b64, ['index.html', 'images/picture.svg']);
        const main = await tab.evaluate(html => {
            const main = new DOMParser().parseFromString(html, 'text/html').querySelector('#webbook-main');
            return { scripts: main.querySelectorAll('script').length, handlers: [...main.querySelectorAll('*')].some(e => [...e.attributes].some(a => /^on/i.test(a.name))), js: /javascript:/i.test(main.innerHTML), words: main.textContent.includes('Words stay.') };
        }, out.text['index.html']);
        assert(!main.scripts && !main.handlers && !main.js, 'no scripts, event handlers or script links in the page');
        assert(main.words, 'the words stay');
        assert(!/<script|onload/.test(out.text['images/picture.svg']) && /<circle/.test(out.text['images/picture.svg']), 'the SVG image keeps its picture without its script');
        await context.close();
    },
    async 'refuses file names that lead outside the book'() {
        const { context, tab } = await converterPage();
        const b64 = epub({ chapters: { 'chapter.xhtml': page('<p>Words</p>') }, files: { '../../template/index.html': 'replaced' } });
        await tab.setInputFiles('input[type=file]', { name: 'escape.epub', mimeType: 'application/epub+zip', buffer: Buffer.from(b64, 'base64') });
        await tab.waitForFunction(() => document.getElementById('check-errors')?.textContent.includes('lead outside the book'), null, { timeout: 10000 });
        const thrown = await tab.evaluate(async b64 => {
            try { await globalThis.convertBytes(Uint8Array.from(atob(b64), c => c.charCodeAt(0)), {}, 'e.epub'); return ''; } catch (error) { return error.message; }
        }, b64);
        assert(/Out of bound path/.test(thrown), `converting it anyway stops: ${thrown || 'it converted'}`);
        const template = await tab.evaluate(() => new TextDecoder().decode(globalThis.spike.vfs.files.get('/template/index.html') ?? new Uint8Array()));
        assert(template !== 'replaced', 'the template is untouched');
        await context.close();
    },
    async 'clears memory after each conversion'() {
        const { context, tab } = await converterPage();
        const left = () => tab.evaluate(() => [...globalThis.spike.vfs.files.keys()].filter(p => !p.startsWith('/template/') && !p.endsWith('/package.json')));
        await convertIn(tab, epub({ chapters: { 'chapter.xhtml': page('<p>Words</p>') } }));
        assert(!(await left()).length, `nothing left after a conversion: ${(await left()).join(', ')}`);
        // A conversion that fails clears up too
        await tab.evaluate(async () => { try { await globalThis.convertBytes(new Uint8Array([1, 2, 3]), {}, 'broken.epub'); } catch { /* expected */ } });
        assert(!(await left()).length, `nothing left after a failed conversion: ${(await left()).join(', ')}`);
        await context.close();
    },
    async 'previews files with encoded names, media and the contents link'() {
        const { context, tab } = await converterPage();
        const b64 = epub({
            chapters: { 'chapter%20one.xhtml': page('<p><img src="media/my%20pic%23.png" alt="A"/><img src="media/書.png" alt="B"/></p><audio controls="controls"><source src="media/song.mp3" type="audio/mpeg"/>A song</audio><p><a href="nav.xhtml">Show detailed contents</a></p>') },
            files: { 'media/my pic#.png': 'x', 'media/書.png': 'x', 'media/song.mp3': 'x' },
            items: '<item id="a" href="media/my%20pic%23.png" media-type="image/png"/><item id="b" href="media/%E6%9B%B8.png" media-type="image/png"/><item id="s" href="media/song.mp3" media-type="audio/mpeg"/>'
        });
        const url = await tab.evaluate(async b64 => {
            const { files } = await globalThis.convertBytes(Uint8Array.from(atob(b64), c => c.charCodeAt(0)), {}, 'r.epub');
            const { showPreview } = await import('./preview.js');
            return showPreview(files);
        }, b64);
        const preview = await context.newPage();
        await preview.goto(url);
        const found = await preview.evaluate(async () => {
            const refs = [...document.querySelectorAll('#webbook-main img, #webbook-main source')].map(e => e.getAttribute('src'));
            const statuses = [];
            for (const ref of refs) statuses.push(`${ref} ${(await fetch(new URL(ref, location.href))).status}`);
            return { statuses, contents: document.querySelector('#webbook-main p a')?.getAttribute('href') };
        });
        assert(found.statuses.length === 3 && found.statuses.every(s => s.endsWith(' 200')), `each file is served: ${found.statuses.join(', ')}`);
        assert(found.contents === 'toc.html', `the contents link goes to toc.html: ${found.contents}`);
        await context.close();
        return found.statuses.map(s => s.split(' ')[0]).join(', ');
    },
    async 'doesn\'t offer offline saving in a preview'() {
        const { context, tab } = await converterPage();
        const url = await tab.evaluate(async b64 => {
            const { files } = await globalThis.convertBytes(Uint8Array.from(atob(b64), c => c.charCodeAt(0)), {}, 'p.epub');
            const { showPreview } = await import('./preview.js');
            return showPreview(files);
        }, epub({ chapters: { 'chapter.xhtml': page('<p>Words</p>') } }));
        const preview = await context.newPage();
        await preview.goto(url + '?webbook-ui=local');
        await preview.waitForFunction(() => document.querySelector('.webbook-offline-controls')?.hidden, null, { timeout: 10000 });
        await preview.keyboard.press('Alt+Shift+KeyO');
        await preview.waitForTimeout(1000);
        const state = await preview.evaluate(async () => ({
            status: document.getElementById('webbook-offline-status')?.textContent ?? '',
            worker: (await navigator.serviceWorker.getRegistration(location.href))?.active?.scriptURL ?? ''
        }));
        assert(/another service worker/.test(state.status), `About says why: ${state.status}`);
        assert(state.worker.endsWith('/preview-sw.js'), `the preview's own worker still serves it: ${state.worker}`);
        await preview.reload();
        assert(await preview.locator('#webbook-main h1').count(), 'the preview still opens after a reload');
        await context.close();
    }
};

function assert(condition, message) { if (!condition) throw new Error(message); }

let failed = 0;
for (const [name, check] of Object.entries(checks)) {
    if (process.env.ONLY && !name.includes(process.env.ONLY)) continue;
    try { const detail = await check(); console.log(`ok  ${name}${detail ? ` (${detail})` : ''}`); }
    catch (error) { failed++; console.log(`FAIL ${name}: ${error.message}`); }
}
await browser.close();
server.close();
console.log(failed ? `${failed} failed` : 'All browser converter checks passed.');
process.exitCode = failed ? 1 : 0;
