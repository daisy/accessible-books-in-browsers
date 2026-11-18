import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { chromium } from 'playwright-core';
import os from 'node:os';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
import { existsSync } from 'node:fs';
import { convert } from '../build/convert.js';
import { copyUiAssets } from '../build/assets.js';
const [channelDirectory, releaseVersion] = process.argv.slice(2);
if (!channelDirectory || !releaseVersion)
    throw new Error('Usage: node scripts/check-ui-release.mjs <channel-directory> <version>');
const base = await fs.mkdtemp(path.join(os.tmpdir(), 'webbook-conformance-'));
const template = fileURLToPath(new URL('../template', import.meta.url));
const fixture = fileURLToPath(new URL('../../source-epubs/notes-test', import.meta.url));
const supplied = path.resolve(channelDirectory, 'releases', releaseVersion);
for (const version of ['D', 'E'])
    await fs.cp(supplied, path.join(base, 'channel/v0/releases', version), { recursive: true });
const types = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.css': 'text/css',
    '.mp3': 'audio/mpeg',
    '.vtt': 'text/vtt',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.otf': 'font/otf',
};
let strict = false,
    localFault = '';
const server = createServer(async (req, res) => {
    try {
        const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
        const file = path.join(base, pathname);
        if (strict) res.setHeader('Content-Security-Policy', "script-src 'self'; object-src 'none'");
        if (localFault && pathname.endsWith('/src/js/main.js')) {
            res.setHeader('Content-Type', 'text/javascript');
            res.end(
                localFault === 'crash'
                    ? "export function init(){document.querySelector('main').setAttribute('aria-hidden','true');throw Error('local crash')}"
                    : 'broken module syntax @',
            );
            return;
        }
        const data = await fs.readFile(file);
        res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('ETag', '"' + createHash('sha256').update(data).digest('hex') + '"');
        res.setHeader('Content-Length', data.length);
        res.setHeader('Accept-Ranges', 'bytes');
        const range = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range || '');
        if (range) {
            const start = Number(range[1]),
                end = range[2] ? Math.min(Number(range[2]), data.length - 1) : data.length - 1;
            res.statusCode = 206;
            res.setHeader('Content-Range', `bytes ${start}-${end}/${data.length}`);
            res.setHeader('Content-Length', end - start + 1);
            res.end(data.subarray(start, end + 1));
        } else res.end(data);
    } catch {
        res.statusCode = 404;
        res.end('Not found');
    }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const url = `http://127.0.0.1:${server.address().port}`;
let cors = true,
    delay = 0,
    missing = '',
    corrupt = '',
    manifest;
const channel = createServer(async (req, res) => {
    try {
        if (cors) res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cache-Control', 'no-store');
        const p = new URL(req.url, 'http://localhost').pathname;
        if (p.endsWith('current.json')) {
            if (delay) await new Promise((r) => setTimeout(r, delay));
            res.setHeader('Content-Type', 'application/json');
            res.end(typeof manifest === 'string' ? manifest : JSON.stringify(manifest));
            return;
        }
        if (missing && p.endsWith(missing)) {
            res.statusCode = 404;
            res.end();
            return;
        }
        const data = corrupt && p.endsWith(corrupt) ? Buffer.from(corrupt.endsWith('.js') ? 'window.unverifiedReaderExecuted = true; export function init(){}' : 'body{color:red!important}') : await fs.readFile(path.join(base, 'channel', p));
        res.setHeader('Content-Type', types[path.extname(p)] || 'application/octet-stream');
        res.end(data);
    } catch {
        res.statusCode = 404;
        res.end();
    }
});
await new Promise((r) => channel.listen(0, '127.0.0.1', r));
const channelURL = `http://127.0.0.1:${channel.address().port}/v0/`;
const release = (version) => ({
    contract: 0,
    version,
    minBootstrap: 1,
    script: `releases/${version}/main.js`,
    stylesheet: `releases/${version}/style.css`,
    worker: `releases/${version}/offline-worker.js`,
    inventory: `releases/${version}/ui-files.json`,
    protocol: 1,
});
const textSource = path.join(base, 'source-text');
await fs.cp(fixture, textSource, { recursive: true });
const opf = path.join(textSource, 'EPUB/package.opf');
await fs.writeFile(opf, (await fs.readFile(opf, 'utf8')).replace(/ media-overlay="[^"]+"/g, ''));
await convert(textSource, path.join(base, 'book'), template, {
    uiBaseUrl: channelURL,
    audioCleanup: false,
    audioEnhance: [],
    smallAudio: true,
});
await convert(fixture, path.join(base, 'narrated'), template, {
    uiBaseUrl: channelURL,
    audioCleanup: false,
    audioEnhance: [],
    smallAudio: true,
});
const report = JSON.parse(await fs.readFile(path.join(base, 'book/conversion-report.json'), 'utf8'));
assert(report.betaWarning.includes(channelURL));
assert(report.provenance.identifier);
const browser = await chromium.launch({
    headless: true,
    executablePath: [
        process.env.CHROME_PATH,
        '/usr/bin/google-chrome',
        '/usr/bin/chromium',
        '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    ]
        .filter(Boolean)
        .find(existsSync),
    args: ['--autoplay-policy=no-user-gesture-required', '--disable-gpu'],
});
const context = await browser.newContext({ viewport: { width: 390, height: 900 } });
const page = await context.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
page.on('console', (msg) => {
    if (msg.type() === 'error') console.log('CONSOLE', msg.text());
});
await fs.cp(fileURLToPath(new URL('../../demos/notes-test', import.meta.url)),path.join(base,'legacy'),{recursive:true});
await copyUiAssets(template,{stagingDir:path.join(base,'legacy')});
const results = [];
async function scenario(name, expected, options = {}) {
    cors = options.cors !== false;
    delay = options.delay || 0;
    missing = options.missing || '';
    corrupt = options.corrupt || '';
    strict = !!options.strict;
    localFault = options.localFault || '';
    manifest = options.manifest ?? release('E');
    const ctx = await browser.newContext({ viewport: { width: 390, height: 900 } }),
        p = await ctx.newPage();
    let loads = 0;
    p.on('request', (request) => { if (request.isNavigationRequest() && request.frame() === p.mainFrame()) loads++; });
    try {
        if(options.storageBlocked) await ctx.addInitScript(()=>{for(const name of ['localStorage','sessionStorage'])Object.defineProperty(window,name,{get(){throw new DOMException('Blocked','SecurityError');}});});
        if(options.caption) await ctx.addInitScript(()=>localStorage.setItem('webbook-caption-mode','true'));
        await p.goto(url + '/' + (options.book || 'book') + '/chapter1.html' + (options.query || ''));
        await p.waitForFunction(
            (expected) => document.documentElement.dataset.webbookUi === expected,
            expected,
            { timeout: 20000 },
        );
        if (expected === 'baseline') {
            assert.equal(await p.locator('main').getAttribute('aria-hidden'), null);
            assert.equal(await p.locator('#webbook-top-toolbar').count(), 0);
            assert(loads <= 2);
        } else {
            await p.waitForSelector('#webbook-offline-save', { state: 'attached' });
            assert.equal(await p.locator('main').getAttribute('aria-hidden'), null);
            if (expected === 'local') assert.equal(await p.locator('link[data-webbook-ui-style]').count(), 0);
        }
        if (options.reloads) assert.equal(loads, options.reloads, name+' must reload cleanly');
        if (options.corrupt) assert.equal(await p.evaluate(()=>window.unverifiedReaderExecuted),undefined);
        results.push(name);
        console.log('PASS', name);
        return { ctx, p };
    } catch (e) {
        console.log(
            'FAILED',
            name,
            'ui',
            await p.locator('html').getAttribute('data-webbook-ui'),
            'loads',
            loads,
        );
        throw e;
    } finally {
        if (!options.keep) await ctx.close();
    }
}
try {
    await scenario('older embedded-chrome book accepts local reader package update','local',{book:'legacy'});
    await scenario('cross-origin bundled release', 'E');
    const scriptHash =
        'sha256-' +
        createHash('sha256')
            .update(await fs.readFile(path.join(base, 'channel/v0/releases/E/main.js')))
            .digest('base64');
    await scenario('valid script integrity', 'E', {
        manifest: { ...release('E'), integrity: { script: scriptHash } },
    });
    await scenario('wrong script integrity falls back', 'local', {
        manifest: {
            ...release('E'),
            integrity: { script: 'sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=' },
        },
    });
    await scenario('missing inventory prevents remote execution','local',{missing:'ui-files.json'});
    await scenario('pinned release also requires inventory','local',{missing:'ui-files.json',query:'?webbook-ui=release:D'});
    await scenario('corrupt remote script never executes','local',{corrupt:'main.js'});
    await scenario('corrupt remote CSS is rejected','local',{corrupt:'style.css'});
    await scenario('CORS failure falls back', 'local', { cors: false });
    await scenario('slow manifest timeout', 'local', { delay: 2000 });
    await scenario('invalid JSON', 'local', { manifest: 'not json' });
    await scenario('contract mismatch', 'local', { manifest: { ...release('E'), contract: 1 } });
    await scenario('new bootstrap required', 'local', { manifest: { ...release('E'), minBootstrap: 2 } });
    await scenario('kill switch', 'local', { manifest: { contract: 0, useLocal: true } });
    await scenario('missing remote CSS', 'local', { missing: 'style.css' });
    await scenario('missing remote JS', 'local', { missing: 'main.js' });
    await scenario('strict self CSP permits local path', 'local', { strict: true });
    await fs.cp(base + '/channel/v0/releases/E', base + '/channel/v0/releases/Crash', { recursive: true });
    await fs.writeFile(
        base + '/channel/v0/releases/Crash/main.js',
        `export function init(){document.querySelector('main').setAttribute('aria-hidden','true');throw Error('remote crash')}`,
    );
    const crashInventoryPath=path.join(base,'channel/v0/releases/Crash/ui-files.json');
    const crashInventory=JSON.parse(await fs.readFile(crashInventoryPath,'utf8'));
    const crashBytes=await fs.readFile(path.join(base,'channel/v0/releases/Crash/main.js'));
    Object.assign(crashInventory.files.find(file=>file.href==='main.js'),{sha256:createHash('sha256').update(crashBytes).digest('hex'),bytes:crashBytes.length});
    crashInventory.revision=createHash('sha256').update(JSON.stringify(crashInventory.files)).digest('hex');
    await fs.writeFile(crashInventoryPath,JSON.stringify(crashInventory));
    await scenario('verified remote startup crash reloads clean local', 'local', { manifest: release('Crash'), reloads:2 });
    await scenario('local startup crash reloads clean baseline', 'baseline', {
        manifest: { contract: 0, useLocal: true },
        localFault: 'crash',
    });
    await scenario('local download failure reloads baseline', 'baseline', {
        manifest: { contract: 0, useLocal: true },
        localFault: 'download',
    });
    await scenario('blocked storage clean fallback cannot loop','baseline',{manifest:{contract:0,useLocal:true},localFault:'crash',storageBlocked:true});
    await scenario('caption preference cannot hide clean baseline after startup failure','baseline',{manifest:{contract:0,useLocal:true},localFault:'crash',caption:true});
    const state = await scenario('local override', 'local', { query: '?webbook-ui=local', keep: true });
    assert.equal(await state.p.evaluate(() => location.search), '');
    await state.p.goto(url + '/book/chapter2.html');
    await state.p.waitForFunction(() => document.documentElement.dataset.webbookUi === 'local');
    await state.p.locator('button[popovertarget="webbook-info"]').first().click();
    assert.match(await state.p.locator('#webbook-reader-updates').textContent(),/paused/);
    await state.p.locator('#webbook-reader-updates-auto').click();
    await state.p.waitForFunction(() => document.documentElement.dataset.webbookUi === 'E');
    await state.ctx.close();
    results.push('override persists, is visible in About and can be cleared there');
    const pinned = await scenario('release test override', 'D', {
        query: '?webbook-ui=release:D',
        keep: true,
    });
    await pinned.ctx.close();
    const saved = await scenario('saved-release starting point', 'D', { manifest: release('D'), keep: true });
    await saved.p.locator('button[popovertarget="webbook-info"]').first().click();
    await saved.p.locator('#webbook-offline-save').click();
    await saved.p.waitForFunction(
        () =>
            document
                .querySelector('#webbook-offline-status')
                .textContent.startsWith('Saved for offline reading'),
        null,
        { timeout: 60000 },
    );
    manifest = release('E');
    await saved.p.reload();
    await saved.p.waitForFunction(() => document.documentElement.dataset.webbookUi === 'D');
    assert.equal(
        await saved.p.evaluate(async () => {
            const { offlineCommand } = await import('./src/js/offline.js');
            return (await offlineCommand(navigator.serviceWorker.controller, 'status')).saved.ui.remote
                .version;
        }),
        'D',
    );
    await saved.ctx.setOffline(true);
    await saved.p.goto(url + '/book/chapter2.html');
    await saved.p.waitForFunction(() => document.documentElement.dataset.webbookUi === 'D');
    await saved.ctx.setOffline(false);
    results.push('saved release beats changed channel and loads cold offline');
    await saved.p.addInitScript(() => {
        const post = ServiceWorker.prototype.postMessage;
        ServiceWorker.prototype.postMessage = function (data, ports) {
            if (location.search.includes('slow-saved-ui') && data.command === 'saved-ui') return;
            return post.call(this, data, ports);
        };
    });
    await saved.p.goto(url + '/book/chapter2.html?slow-saved-ui=1');
    await saved.p.waitForFunction(() => document.documentElement.dataset.webbookUi === 'local');
    await saved.p.goto(url + '/book/chapter2.html');
    await saved.p.waitForFunction(() => document.documentElement.dataset.webbookUi === 'D');
    results.push('uncertain saved state chooses local fallback instead of current channel');
    await saved.p.locator('button[popovertarget="webbook-info"]').first().click();
    await saved.p.locator('#webbook-offline-check').click();
    await saved.p.waitForFunction(
        () => document.querySelector('#webbook-offline-status').textContent.includes('update is available'),
        null,
        { timeout: 20000 },
    );
    await saved.p.locator('#webbook-offline-update').click();
    await saved.p.locator('#webbook-offline-use').waitFor({ state: 'visible', timeout: 60000 });
    assert.equal(await saved.p.locator('html').getAttribute('data-webbook-ui'), 'D');
    await saved.p.locator('#webbook-offline-use').click();
    await saved.p.waitForFunction(() => document.documentElement.dataset.webbookUi === 'E');
    results.push('release update stays pending until explicit reload');
    await saved.ctx.close();
    strict = false;
    localFault = '';
    const narration = await browser.newContext({ viewport: { width: 390, height: 900 } }),
        np = await narration.newPage();
    manifest = release('E');
    await np.goto(url + '/narrated/chapter1.html');
    await np.waitForSelector('#webbook-offline-save', { state: 'attached' });
    await np.locator('#webbook-audio-playpause').click();
    await np.waitForFunction(
        () => !document.querySelector('audio').paused && document.querySelector('audio').currentTime > 0.1,
    );
    await np.evaluate(async () => {
        const { navigateTo } = await import('./src/js/in-place-navigation.js');
        await navigateTo('chapter2.html', { autoplay: true });
    });
    await np.waitForURL('**/chapter2.html');
    await np.waitForFunction(() => !document.querySelector('audio').paused);
    await np.locator('audio').evaluate((e) => e.pause());
    await np.locator('button[popovertarget="webbook-info"]').first().click();
    await np.locator('#webbook-offline-save').click();
    await np.waitForFunction(
        () =>
            document
                .querySelector('#webbook-offline-status')
                .textContent.startsWith('Saved for offline reading'),
        null,
        { timeout: 60000 },
    );
    await narration.setOffline(true);
    await np.goto(url + '/narrated/chapter2.html');
    await np.waitForSelector('#webbook-offline-save', { state: 'attached' });
    assert.deepEqual(
        await np.evaluate(async () => {
            const r = await fetch('audio/chapter2.mp3', { headers: { Range: 'bytes=0-7' } });
            return { status: r.status, bytes: (await r.arrayBuffer()).byteLength };
        }),
        { status: 206, bytes: 8 },
    );
    await np.locator('#webbook-audio-playpause').click();
    await np.waitForFunction(
        () => !document.querySelector('audio').paused && document.querySelector('audio').currentTime > 0.1,
    );
    await narration.close();
    results.push('new book shape keeps narration across chapters and cached range playback');
    const accessible = await scenario('release accessibility fixture', 'E', { keep: true }),
        ap = accessible.p;
    await ap.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
    let axeStates = 0;
    for (const width of [1280, 390]) {
        await ap.setViewportSize({ width, height: 900 });
        for (const look of ['settings', 'published']) {
            const appearance = ap.locator('#webbook-appearance-' + look);
            if (await appearance.count())
                await appearance.evaluate((e) => {
                    e.checked = true;
                    e.dispatchEvent(new Event('change'));
                });
            for (const color of ['light', 'dark', 'cream', 'sepia', 'gray', 'blue']) {
                await ap.locator('#webbook-colors-options').selectOption(color, { force: true });
                for (const id of ['light', 'dark'].includes(color)
                    ? ['webbook-info', 'webbook-settings', 'webbook-toc-nav', 'webbook-search']
                    : ['webbook-info']) {
                    await ap.evaluate((id) => {
                        for (const node of document.querySelectorAll('[popover]:popover-open'))
                            node.hidePopover();
                        document.getElementById(id).showPopover();
                    }, id);
                    const violations = await ap.evaluate(
                        async () =>
                            (
                                await axe.run(document, {
                                    runOnly: {
                                        type: 'tag',
                                        values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'],
                                    },
                                })
                            ).violations,
                    );
                    assert.deepEqual(
                        violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
                        [],
                        `${width} ${look} ${color} ${id}`,
                    );
                    axeStates++;
                }
            }
        }
    }
    await accessible.ctx.close();
    results.push(`${axeStates} WCAG A/AA release states at phone/desktop widths and both appearances`);
    const nojs = await browser.newContext({ javaScriptEnabled: false }),
        plain = await nojs.newPage();
    await plain.goto(url + '/narrated/chapter1.html');
    assert.equal(await plain.locator('#webbook-toolbar audio').getAttribute('controls'), '');
    await plain.getByRole('link', { name: 'Contents', exact: true }).click();
    assert.match(plain.url(), /toc.html/);
    assert((await plain.locator('main ol a').count()) > 0);
    await nojs.close();
    const baselineContext = await browser.newContext(),
        baselinePage = await baselineContext.newPage();
    await baselineContext.addInitScript(() => {
        window.webbookBootstrapStarted = true;
    });
    const axeSource = await fs.readFile(require.resolve('axe-core/axe.min.js'), 'utf8');
    let baselineStates = 0;
    for (const width of [1280, 390])
        for (const scheme of ['light', 'dark'])
            for (const file of [
                'index.html',
                'chapter1.html',
                'chapter2.html',
                'endnotes.html',
                'toc.html',
                'about.html',
            ]) {
                await baselinePage.setViewportSize({ width, height: 900 });
                await baselinePage.emulateMedia({ colorScheme: scheme });
                await baselinePage.goto(url + '/narrated/' + file);
                await baselinePage.evaluate(() =>
                    document.documentElement.classList.remove('webbook-dark', 'webbook-light', 'webbook-js'),
                );
                await baselinePage.evaluate(axeSource);
                const violations = await baselinePage.evaluate(
                    async () =>
                        (
                            await axe.run(document, {
                                runOnly: {
                                    type: 'tag',
                                    values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'],
                                },
                            })
                        ).violations,
                );
                assert.deepEqual(
                    violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
                    [],
                    `${file} ${width} ${scheme} baseline`,
                );
                baselineStates++;
                console.log('PASS baseline', file, width, scheme);
            }
    await baselineContext.close();
    results.push(
        `actual no-JS navigation; startup-suppressed native audio/Contents and ${baselineStates} accessible baseline states`,
    );
    const disk = await context.newPage();
    await disk.goto('file://' + base + '/narrated/chapter1.html');
    assert.equal(await disk.locator('html').getAttribute('data-webbook-ui'), 'baseline');
    assert(await disk.locator('main').isVisible());
    await disk.close();
    results.push('file URL readable baseline');
    await fs.mkdir(path.resolve(channelDirectory, 'checks'), { recursive: true });
    const inventory = await fs.readFile(path.join(supplied, 'ui-files.json'));
    await fs.writeFile(
        path.resolve(channelDirectory, 'checks', releaseVersion + '.json'),
        JSON.stringify(
            {
                version: releaseVersion,
                inventorySha256: createHash('sha256').update(inventory).digest('hex'),
                checkedAt: new Date().toISOString(),
                passed: results,
            },
            null,
            2,
        ) + '\n',
    );
    console.log(JSON.stringify({ passed: results }, null, 2));
} finally {
    await browser.close();
    server.close();
    server.closeAllConnections();
    channel.close();
    channel.closeAllConnections();
    await fs.rm(base, { recursive: true, force: true });
}
