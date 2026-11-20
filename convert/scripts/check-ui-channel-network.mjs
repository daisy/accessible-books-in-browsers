// Network robustness check for the reader update channel: a stable URL that redirects to where the
// release files live (GitHub Pages now, a CDN later), timeouts, failures part way through, slow
// connections, saving for offline through the redirect, and books converted with updates off.
// Complements check-ui-release.mjs, which checks the release itself.
//
// Run from convert/ after `npm run compile` and build-ui-release.mjs:
//   node scripts/check-ui-channel-network.mjs <channel-directory> <version>
//
// Hosts (all on this machine, over HTTPS with a throwaway certificate):
//   webbook.test  the stable URL: /ui/* redirects to the files' current home
//   pages.test    like GitHub Pages: /accessible-books-in-browsers/ui/releases/v0/...
//   cdn.test      a later home: /releases/v0/...
//   gone.test     doesn't resolve
// Books are served from http://127.0.0.1, so their service workers run.

import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import zlib from 'node:zlib';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { createServer as createSecureServer } from 'node:https';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { convert } from '../build/convert.js';

const [channelDirectory, version] = process.argv.slice(2);
if (!channelDirectory || !version) throw new Error('Usage: node scripts/check-ui-channel-network.mjs <channel-directory> <version>');
const only = process.env.ONLY ? new RegExp(process.env.ONLY, 'i') : null;

const base = await fs.mkdtemp(path.join(os.tmpdir(), 'webbook-network-'));
const template = fileURLToPath(new URL('../template', import.meta.url));
const fixture = fileURLToPath(new URL('../../source-epubs/notes-test', import.meta.url));
const releaseDir = path.resolve(channelDirectory, version);
const manifestText = await fs.readFile(path.resolve(channelDirectory, 'candidate.json'), 'utf8');

// Throwaway certificate for the test hosts
const certDir = path.join(base, 'cert');
await fs.mkdir(certDir);
const openssl = spawnSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '2', '-subj', '/CN=webbook.test',
    '-addext', 'subjectAltName=DNS:webbook.test,DNS:pages.test,DNS:cdn.test',
    '-keyout', path.join(certDir, 'key.pem'), '-out', path.join(certDir, 'cert.pem')], { encoding: 'utf8' });
if (openssl.status !== 0) throw new Error('openssl failed: ' + openssl.stderr);

const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.mp3': 'audio/mpeg',
    '.vtt': 'text/vtt', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.otf': 'font/otf', '.woff2': 'font/woff2' };

// What the channel hosts do; each scenario sets it
let net;
const defaults = () => ({
    status: 302,          // the stable URL's redirect
    target: 'pages',      // where it points: pages, cdn, gone (doesn't resolve), loop
    redirectDelay: 0,     // ms before the redirect answers
    redirectCache: 'public, max-age=3600', // Cache-Control on the redirect, as webbook.daisy.org will send it
    redirectCors: true,   // Access-Control-Allow-Origin on the redirect: browsers check it there too
    cors: true,           // Access-Control-Allow-Origin on the files' host
    manifest: manifestText,
    manifestType: 'application/json',
    manifestStatus: 200,
    delay: {},            // file suffix → ms before answering
    hang: [],             // file suffixes that never answer
    trickle: [],          // file suffixes sent slowly (headers at once, body over many seconds)
    missing: [],          // file suffixes answered with 404
    down: false           // the files' host refuses requests (503)
});
let requests = [];

const tls = { key: await fs.readFile(path.join(certDir, 'key.pem')), cert: await fs.readFile(path.join(certDir, 'cert.pem')) };
const hangs = new Set();
const channelServer = createSecureServer(tls, async (req, res) => {
    const host = (req.headers.host || '').split(':')[0], url = new URL(req.url, 'https://' + req.headers.host);
    requests.push({ host, path: url.pathname, at: Date.now() });
    try {
        if (host === 'webbook.test') {
            if (!url.pathname.startsWith('/ui/')) { res.statusCode = 404; return res.end(); }
            if (net.redirectDelay) await sleep(net.redirectDelay);
            const rest = url.pathname.slice('/ui/'.length);
            const location = {
                pages: `https://pages.test:${port}/accessible-books-in-browsers/ui/${rest}`,
                cdn: `https://cdn.test:${port}/${rest}`,
                gone: `https://gone.test:${port}/${rest}`,
                loop: `https://webbook.test:${port}/ui/${rest}`
            }[net.target];
            res.statusCode = net.status;
            res.setHeader('Location', location);
            if (net.redirectCache) res.setHeader('Cache-Control', net.redirectCache);
            if (net.redirectCors) res.setHeader('Access-Control-Allow-Origin', '*');
            return res.end();
        }
        const prefix = host === 'pages.test' ? '/accessible-books-in-browsers/ui/' : host === 'cdn.test' ? '/' : null;
        if (!prefix || !url.pathname.startsWith(prefix)) { res.statusCode = 404; return res.end(); }
        if (net.cors) res.setHeader('Access-Control-Allow-Origin', '*');
        if (net.down) { res.statusCode = 503; return res.end('Service unavailable'); }
        const rel = url.pathname.slice(prefix.length);
        const match = list => list.find(suffix => rel.includes(suffix));
        if (match(net.hang)) { hangs.add(res); return; }
        const wait = Object.entries(net.delay).find(([suffix]) => rel.endsWith(suffix));
        if (wait) await sleep(wait[1]);
        if (match(net.missing)) { res.statusCode = 404; return res.end('Not found'); }
        let data, type;
        if (rel === 'releases/v0/current.json') {
            res.statusCode = net.manifestStatus;
            data = Buffer.from(net.manifest); type = net.manifestType;
            res.setHeader('Cache-Control', 'max-age=600');
        } else {
            data = await fs.readFile(path.join(base, 'channel', rel));
            type = types[path.extname(rel)] || 'application/octet-stream';
            // Like GitHub Pages
            res.setHeader('Cache-Control', 'max-age=600');
            res.setHeader('ETag', '"' + createHash('sha256').update(data).digest('hex').slice(0, 16) + '"');
        }
        res.setHeader('Content-Type', type);
        if (/gzip/.test(req.headers['accept-encoding'] || '') && /javascript|css|json/.test(type)) {
            data = zlib.gzipSync(data); res.setHeader('Content-Encoding', 'gzip');
        }
        if (match(net.trickle)) {
            res.setHeader('Content-Length', data.length);
            hangs.add(res);
            const chunk = Math.ceil(data.length / 40);
            for (let i = 0; i < data.length && !res.destroyed; i += chunk) { res.write(data.subarray(i, i + chunk)); await sleep(250); }
            hangs.delete(res);
            return res.end();
        }
        res.setHeader('Content-Length', data.length);
        res.end(data);
    } catch {
        res.statusCode = 404;
        res.end();
    }
});
await new Promise(resolve => channelServer.listen(0, '127.0.0.1', resolve));
const port = channelServer.address().port;
const stable = `https://webbook.test:${port}/ui/releases/v0/`;

// The channel's files, as the release workflow publishes them
await fs.mkdir(path.join(base, 'channel/releases/v0'), { recursive: true });
await fs.cp(releaseDir, path.join(base, 'channel/releases/v0', version), { recursive: true });

// Two books from the same EPUB: one with updates from the stable URL, one with updates off
const bookServer = createServer(async (req, res) => {
    try {
        const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
        const file = path.join(base, 'books', pathname);
        const data = await fs.readFile(file);
        res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
        // Like GitHub Pages, where the demos and most books live
        res.setHeader('Cache-Control', 'max-age=600');
        res.setHeader('ETag', '"' + createHash('sha256').update(data).digest('hex') + '"');
        res.setHeader('Accept-Ranges', 'bytes');
        const range = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range || '');
        if (range) {
            const start = Number(range[1]), end = range[2] ? Math.min(Number(range[2]), data.length - 1) : data.length - 1;
            res.statusCode = 206;
            res.setHeader('Content-Range', `bytes ${start}-${end}/${data.length}`);
            res.setHeader('Content-Length', end - start + 1);
            return res.end(data.subarray(start, end + 1));
        }
        // Compressed like GitHub Pages
        const body = /gzip/.test(req.headers['accept-encoding'] || '') && /\.(html|js|css|json|vtt|svg)$/.test(file) ? zlib.gzipSync(data) : data;
        if (body !== data) res.setHeader('Content-Encoding', 'gzip');
        res.setHeader('Content-Length', body.length);
        res.end(body);
    } catch {
        res.statusCode = 404;
        res.end('Not found');
    }
});
await new Promise(resolve => bookServer.listen(0, '127.0.0.1', resolve));
const books = `http://127.0.0.1:${bookServer.address().port}`;
const quiet = { audioCleanup: false, audioEnhance: [], smallAudio: true };
await convert(fixture, path.join(base, 'books/updates'), template, { ...quiet, uiBaseUrl: stable });
await convert(fixture, path.join(base, 'books/fixed'), template, { ...quiet, remoteUi: false });

const browser = await chromium.launch({
    headless: true,
    executablePath: [process.env.CHROME_PATH, '/usr/bin/google-chrome', '/usr/bin/chromium',
        '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].filter(Boolean).find(existsSync),
    args: ['--autoplay-policy=no-user-gesture-required', '--disable-gpu', '--ignore-certificate-errors',
        '--host-resolver-rules=MAP webbook.test 127.0.0.1, MAP pages.test 127.0.0.1, MAP cdn.test 127.0.0.1, MAP gone.test ~NOTFOUND']
});

// Chrome DevTools' network presets (latency is the per-request round trip it adds)
const profiles = {
    'no throttling': null,
    'fast 4G': { latency: 165, downloadThroughput: 9e6 / 8 * 0.9, uploadThroughput: 1.5e6 / 8 * 0.9 },
    'slow 4G': { latency: 562.5, downloadThroughput: 1.6e6 / 8 * 0.9, uploadThroughput: 750e3 / 8 * 0.9 },
    '3G': { latency: 2000, downloadThroughput: 400e3 / 8 * 0.9, uploadThroughput: 400e3 / 8 * 0.9 }
};

const passed = [], failed = [], measured = [];

// Publishes another release next to the first, with a changed reader, and returns its current.json
async function publish(name, script) {
    const dir = path.join(base, 'channel/releases/v0', name);
    await fs.cp(path.join(base, 'channel/releases/v0', version), dir, { recursive: true });
    const bytes = script ?? (await fs.readFile(path.join(dir, 'main.js'), 'utf8')) + `\n// release ${name}\n`;
    await fs.writeFile(path.join(dir, 'main.js'), bytes);
    const inventory = JSON.parse(await fs.readFile(path.join(dir, 'ui-files.json'), 'utf8'));
    Object.assign(inventory.files.find(file => file.href === 'main.js'), { sha256: createHash('sha256').update(bytes).digest('hex'), bytes: Buffer.byteLength(bytes) });
    inventory.revision = createHash('sha256').update(JSON.stringify(inventory.files)).digest('hex');
    await fs.writeFile(path.join(dir, 'ui-files.json'), JSON.stringify(inventory));
    const manifest = JSON.parse(manifestText);
    delete manifest.integrity;
    return JSON.stringify({ ...manifest, version: name, script: `${name}/main.js`, stylesheet: `${name}/style.css`,
        worker: `${name}/offline-worker.js`, inventory: `${name}/ui-files.json` });
}
function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function session({ profile } = {}) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 900 }, ignoreHTTPSErrors: true });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    if (process.env.DEBUG) {
        page.on('console', m => console.log('  console', m.type(), m.text()));
        page.on('requestfailed', r => console.log('  failed', r.url(), r.failure()?.errorText));
        page.on('response', r => { if (!r.url().startsWith(books)) console.log('  response', r.status(), r.url()); });
    }
    if (profiles[profile]) {
        const cdp = await ctx.newCDPSession(page);
        await cdp.send('Network.enable');
        await cdp.send('Network.emulateNetworkConditions', { offline: false, ...profiles[profile] });
    }
    return { ctx, page, errors };
}

// Opens a page and waits for the reader to be running; returns which reader and how long it took.
// On a slow connection the plain page can show first while the book's own reader arrives.
async function open(page, file, { book = 'updates', query = '', timeout = 40000 } = {}) {
    const started = Date.now();
    await page.goto(`${books}/${book}/${file}${query}`, { waitUntil: 'commit', timeout });
    let plain = null;
    const watch = setInterval(() => {
        page.evaluate(() => document.documentElement?.dataset.webbookUi).then(ui => { if (ui === 'baseline' && plain === null) plain = Date.now() - started; }).catch(() => {});
    }, 100);
    try {
        await page.waitForFunction(() => document.documentElement?.dataset.webbookUi && document.documentElement.dataset.webbookUi !== 'baseline'
            && document.querySelector('#webbook-top-toolbar'), null, { timeout });
    } catch (error) {
        if (!/Timeout/.test(error.message)) throw error;
    } finally {
        clearInterval(watch);
    }
    const ui = await page.evaluate(() => document.documentElement.dataset.webbookUi);
    const ms = Date.now() - started;
    // Nothing may hide the book while the reader loads or after it falls back
    assert.equal(await page.locator('main').getAttribute('aria-hidden'), null, 'main must stay visible');
    assert(await page.locator('main').isVisible(), 'main must be visible');
    return { ui, ms, plain };
}

async function check(name, body) {
    if (only && !only.test(name)) return;
    net = defaults();
    requests = [];
    const started = Date.now();
    try {
        await body();
        passed.push(name);
        console.log(`PASS ${name} (${((Date.now() - started) / 1000).toFixed(1)} s)`);
    } catch (error) {
        failed.push({ name, error: error.message });
        console.log(`FAIL ${name}\n     ${error.message.split('\n').join('\n     ')}`);
    } finally {
        for (const res of hangs) res.destroy();
        hangs.clear();
    }
}

const channelHosts = new Set(['webbook.test', 'pages.test', 'cdn.test']);
const remote = version;

async function openAbout(page) {
    if (!await page.locator('#webbook-info:popover-open').count()) await page.locator('button[popovertarget="webbook-info"]').first().click();
}

async function saveOffline(page) {
    await openAbout(page);
    await page.locator('#webbook-offline-save').click();
    await page.waitForFunction(() => {
        const status = document.querySelector('#webbook-offline-status')?.textContent || '';
        return status.startsWith('Saved for offline reading') || /couldn|could not|failed|error/i.test(status);
    }, null, { timeout: 90000 });
    return page.locator('#webbook-offline-status').textContent();
}

try {
    // Redirects
    for (const status of [302, 307, 301, 308]) {
        await check(`stable URL redirect ${status} loads the release`, async () => {
            net.status = status;
            const { ctx, page, errors } = await session();
            const first = await open(page, 'chapter1.html');
            assert.equal(first.ui, remote);
            const second = await open(page, 'chapter2.html');
            assert.equal(second.ui, remote);
            assert.deepEqual(errors, []);
            await ctx.close();
        });
    }
    await check('the stable URL can move from Pages to a CDN', async () => {
        const { ctx, page } = await session();
        assert.equal((await open(page, 'chapter1.html')).ui, remote);
        net.target = 'cdn';
        requests = [];
        assert.equal((await open(page, 'chapter2.html')).ui, remote);
        // A new visitor after the move
        const fresh = await session();
        assert.equal((await open(fresh.page, 'chapter1.html')).ui, remote);
        assert(requests.some(r => r.host === 'cdn.test'), 'files must come from the CDN after the move');
        await fresh.ctx.close();
        await ctx.close();
    });
    await check('an uncached 302 is followed again on every visit, so a move takes effect at once', async () => {
        net.redirectCache = '';
        const { ctx, page } = await session();
        await open(page, 'chapter1.html');
        net.target = 'cdn';
        requests = [];
        await page.evaluate(() => localStorage.clear());
        assert.equal((await open(page, 'chapter2.html')).ui, remote);
        assert(!requests.some(r => r.host === 'pages.test'), 'nothing may still come from the old home');
        await ctx.close();
    });
    for (const [name, change, ms] of [
        ['the redirect has no CORS header', () => { net.redirectCors = false; }, 4000],
        ['redirect loop', () => { net.target = 'loop'; }, 4000],
        ['redirect to a host that does not resolve', () => { net.target = 'gone'; }, 4000],
        ['files host without CORS', () => { net.cors = false; }, 4000],
        ['files host down (503)', () => { net.down = true; }, 4000],
        ['captive portal: current.json is an HTML page', () => { net.manifest = '<!doctype html><title>Sign in to Wi-Fi</title>'; net.manifestType = 'text/html'; }, 4000],
        ['current.json is a 404', () => { net.manifestStatus = 404; net.manifest = 'Not found'; }, 4000],
        ['current.json names a release that is not there yet', () => { net.missing = [`v0/${version}/`]; }, 4000],
        ['the release has no inventory', () => { net.missing = ['ui-files.json']; }, 4000],
        ['the release has no stylesheet', () => { net.missing = ['style.css']; }, 4000],
        ['the release has no reader script', () => { net.missing = ['main.js']; }, 4000],
        ['the stable URL itself is down', () => { net.target = 'gone'; net.status = 503; }, 4000]
    ]) {
        await check(`falls back to the book's reader: ${name}`, async () => {
            change();
            const { ctx, page } = await session();
            const first = await open(page, 'chapter1.html');
            assert.equal(first.ui, 'local');
            assert(first.ms < ms, `took ${first.ms} ms (limit ${ms})`);
            const second = await open(page, 'chapter2.html');
            assert.equal(second.ui, 'local');
            await ctx.close();
        });
    }

    // Timeouts: the manifest gets 1.5 s; inventory, stylesheet and script get 5 s each
    await check('timeouts: current.json in 1.2 s is used', async () => {
        net.delay = { 'current.json': 1200 };
        const { ctx, page } = await session();
        assert.equal((await open(page, 'chapter1.html')).ui, remote);
        await ctx.close();
    });
    for (const [name, change, limit] of [
        ['current.json takes 1.8 s', () => { net.delay = { 'current.json': 1800 }; }, 3500],
        ['current.json never answers', () => { net.hang = ['current.json']; }, 3500],
        ['the redirect never answers', () => { net.redirectDelay = 60000; }, 3500],
        ['the inventory never answers', () => { net.hang = ['ui-files.json']; }, 8500],
        ['the stylesheet never answers', () => { net.hang = ['style.css']; }, 13500],
        ['the reader script never answers', () => { net.hang = ['main.js']; }, 13500],
        ['the reader script arrives too slowly (10 s)', () => { net.trickle = ['main.js']; }, 13500]
    ]) {
        await check(`timeouts: ${name} falls back to the book's reader`, async () => {
            change();
            const { ctx, page } = await session();
            const first = await open(page, 'chapter1.html');
            assert.equal(first.ui, 'local');
            assert(first.ms < limit, `took ${first.ms} ms (limit ${limit})`);
            measured.push(`${name}: the book's reader was running after ${(first.ms / 1000).toFixed(1)} s`);
            await ctx.close();
        });
    }
    await check('timeouts: a returning reader whose channel has gone quiet', async () => {
        const { ctx, page } = await session();
        assert.equal((await open(page, 'chapter1.html')).ui, remote);
        // The remembered current.json is used, and checked again in the background
        net.hang = ['current.json', 'ui-files.json', 'main.js', 'style.css'];
        const again = await open(page, 'chapter2.html');
        measured.push(`returning reader, channel hanging: ${again.ui === remote ? 'the release (from the browser cache)' : "the book's reader"} after ${(again.ms / 1000).toFixed(1)} s`);
        await ctx.close();
    });
    await check('a broken release is not retried on every page', async () => {
        // A release that passes its checks but crashes on start is marked bad for this book
        net.manifest = await publish('crash', 'export function init(){throw Error("crash")}');
        const { ctx, page } = await session();
        assert.equal((await open(page, 'chapter1.html')).ui, 'local');
        requests = [];
        assert.equal((await open(page, 'chapter2.html')).ui, 'local');
        assert(!requests.some(r => r.path.endsWith('crash/main.js')), 'the crashing release must not be loaded again');
        await ctx.close();
    });

    // Saving for offline reading through the stable URL
    await check('save for offline through the redirect, then read offline', async () => {
        const { ctx, page } = await session();
        assert.equal((await open(page, 'chapter1.html')).ui, remote);
        const status = await saveOffline(page);
        assert.match(status, /^Saved for offline reading/, `Save said: ${status}`);
        await ctx.setOffline(true);
        assert.equal((await open(page, 'chapter2.html')).ui, remote, 'offline, the saved release must load');
        assert.equal((await open(page, 'endnotes.html')).ui, remote);
        assert.equal((await open(page, 'chapter1.html')).ui, remote);
        await page.locator('#webbook-audio-playpause').click();
        try {
            await page.waitForFunction(() => document.querySelector('audio')?.currentTime > 0.1, null, { timeout: 15000 });
        } catch (error) {
            const audio = await page.evaluate(() => { const a = document.querySelector('audio'); return a && { src: a.currentSrc, paused: a.paused, error: a.error?.code, ready: a.readyState, network: a.networkState }; });
            throw new Error('Offline narration did not play: ' + JSON.stringify(audio));
        }
        await ctx.setOffline(false);
        // The saved release is kept online too, even after the stable URL moves
        net.target = 'cdn';
        assert.equal((await open(page, 'chapter1.html')).ui, remote);
        const checkStatus = async () => {
            await openAbout(page);
            await page.locator('#webbook-offline-check').click();
            await page.waitForFunction(() => /No changes detected|update is available|couldn|could not|channel/i.test(document.querySelector('#webbook-offline-status')?.textContent || ''), null, { timeout: 30000 });
            return page.locator('#webbook-offline-status').textContent();
        };
        assert.match(await checkStatus(), /^No changes detected\.$/);
        // A newer release, published while the stable URL points at the CDN
        net.manifest = await publish('next');
        assert.equal((await open(page, 'chapter2.html')).ui, remote, 'the saved release stays until the reader chooses to update');
        assert.match(await checkStatus(), /update is available/);
        await page.locator('#webbook-offline-update').click();
        await page.locator('#webbook-offline-use').waitFor({ state: 'visible', timeout: 60000 });
        await page.locator('#webbook-offline-use').click();
        await page.waitForFunction(() => document.documentElement.dataset.webbookUi === 'next', null, { timeout: 20000 });
        await ctx.setOffline(true);
        assert.equal((await open(page, 'chapter1.html')).ui, 'next', 'offline, the updated release must load');
        await ctx.setOffline(false);
        // The channel unreachable: the check says so, and the saved copy keeps working
        net.target = 'gone';
        const unreachable = await checkStatus();
        assert.doesNotMatch(unreachable, /No changes detected|update is available/, `Check said: ${unreachable}`);
        measured.push(`Check for updates with the channel unreachable says: "${unreachable}"`);
        assert.equal((await open(page, 'chapter2.html')).ui, 'next');
        await ctx.close();
    });
    await check('save for offline when the channel is unreachable keeps the book\'s reader', async () => {
        net.target = 'gone';
        const { ctx, page } = await session();
        assert.equal((await open(page, 'chapter1.html')).ui, 'local');
        const status = await saveOffline(page);
        assert.match(status, /^Saved for offline reading/, `Save said: ${status}`);
        await ctx.setOffline(true);
        assert.equal((await open(page, 'chapter2.html')).ui, 'local');
        await ctx.close();
    });
    // Connection speeds: first visit (nothing cached) and the next page
    for (const profile of Object.keys(profiles)) {
        await check(`connection speed ${profile}`, async () => {
            const { ctx, page } = await session({ profile });
            const first = await open(page, 'chapter1.html', { timeout: 150000 });
            const next = await open(page, 'chapter2.html', { timeout: 150000 });
            const later = await open(page, 'endnotes.html', { timeout: 150000 });
            const fixed = await session({ profile });
            const fixedVisits = [];
            for (const file of ['chapter1.html', 'chapter2.html', 'endnotes.html']) fixedVisits.push(await open(fixed.page, file, { book: 'fixed', timeout: 150000 }));
            await fixed.ctx.close();
            const name = ui => ui === remote ? 'release' : ui === 'local' ? "book's reader" : ui === 'baseline' ? 'NO READER' : ui;
            const line = visits => visits.map(v => `${name(v.ui)} ${(v.ms / 1000).toFixed(1)} s${v.plain === null ? '' : ` (plain page from ${(v.plain / 1000).toFixed(1)} s)`}`).join(', ');
            measured.push(`${profile}: updates on: ${line([first, next, later])}; updates off: ${line(fixedVisits)}`);
            for (const visit of [first, next, later, ...fixedVisits]) assert(['local', remote].includes(visit.ui), `a page had ${name(visit.ui)}`);
            await ctx.close();
        });
    }

    // Books converted with updates off
    await check('updates off: no channel in the book', async () => {
        const dir = path.join(base, 'books/fixed');
        for (const file of await fs.readdir(dir)) {
            if (!file.endsWith('.html')) continue;
            const html = await fs.readFile(path.join(dir, file), 'utf8');
            assert(!html.includes('<meta name="webbook-ui-channel"'), `${file} has a channel`);
            assert(!html.includes('webbook.test') && !html.includes('github.io'), `${file} names a channel host`);
            assert(!/rel="preconnect"/.test(html), `${file} preconnects`);
        }
    });
    for (const [name, change] of [
        ['channel working', () => {}],
        ['channel unreachable', () => { net.target = 'gone'; }],
        ['channel hanging', () => { net.hang = ['current.json', 'ui-files.json', 'main.js', 'style.css']; net.redirectDelay = 60000; }],
        ['channel kill switch', () => { net.manifest = JSON.stringify({ contract: 0, useLocal: true }); }]
    ]) {
        await check(`updates off: unaffected with the ${name}`, async () => {
            change();
            const { ctx, page, errors } = await session();
            const first = await open(page, 'chapter1.html', { book: 'fixed' });
            assert.equal(first.ui, 'local');
            assert(first.ms < 2500, `took ${first.ms} ms`);
            assert.equal((await open(page, 'chapter2.html', { book: 'fixed' })).ui, 'local');
            // About doesn't offer channel controls
            await openAbout(page);
            assert.match(await page.locator('#webbook-reader-updates').textContent(), /fixed bundled reader/);
            assert(!await page.locator('#webbook-reader-updates-auto').isVisible());
            const status = await saveOffline(page);
            assert.match(status, /^Saved for offline reading/, `Save said: ${status}`);
            await ctx.setOffline(true);
            assert.equal((await open(page, 'endnotes.html', { book: 'fixed' })).ui, 'local');
            await ctx.setOffline(false);
            assert.deepEqual(requests.filter(r => channelHosts.has(r.host)), [], 'a fixed book must never contact the channel');
            assert.deepEqual(errors, []);
            await ctx.close();
        });
    }
    await check('updates off: ?webbook-ui=remote cannot switch it on', async () => {
        const { ctx, page } = await session();
        assert.equal((await open(page, 'chapter1.html', { book: 'fixed', query: '?webbook-ui=remote' })).ui, 'local');
        assert.equal((await open(page, 'chapter1.html', { book: 'fixed', query: `?webbook-ui=release:${version}` })).ui, 'local');
        assert.deepEqual(requests.filter(r => channelHosts.has(r.host)), []);
        await ctx.close();
    });
} finally {
    await browser.close();
    channelServer.close(); channelServer.closeAllConnections?.();
    bookServer.close(); bookServer.closeAllConnections();
    await fs.rm(base, { recursive: true, force: true });
}

console.log('\nMeasured:');
for (const line of measured) console.log('  ' + line);
console.log(`\n${passed.length} passed, ${failed.length} failed`);
for (const { name, error } of failed) console.log(`  FAIL ${name}: ${error.split('\n')[0]}`);
process.exitCode = failed.length ? 1 : 0;
