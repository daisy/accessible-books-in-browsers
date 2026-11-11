// Runs axe-core on every page of the converted books in a folder (the demos by default), in
// headless Chrome, and fails if it finds WCAG 2.2 A or AA violations. Each page is checked as it
// opens; each book's first page is also checked with each panel open, in each Colors choice (light,
// dark and the four reviewed pairs),
// and with JavaScript off (the plain navigation and native audio player), with the table of
// contents open too.
//
//   node scripts/check-accessibility.mjs [folder] [--pages N] [--width N] [--report file.json]
//
// Needs Chrome or Chromium: set CHROME_PATH, or it looks in the usual places. Uses the Chrome
// DevTools Protocol directly, so the only dependency is axe-core.

import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';

const require = createRequire(import.meta.url);
const AXE_SOURCE = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const PANELS = ['webbook-toc-nav', 'webbook-settings', 'webbook-info', 'webbook-search', 'webbook-menu'];
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
    '.mp3': 'audio/mpeg', '.vtt': 'text/vtt', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml', '.gif': 'image/gif', '.webp': 'image/webp' };

const args = process.argv.slice(2);
const option = name => { const i = args.indexOf(name); return i >= 0 ? args.splice(i, 2)[1] : undefined; };
const pageLimit = Number(option('--pages')) || Infinity;
const viewportWidth = Number(option('--width')) || 1280;
const reportFile = option('--report');
const root = path.resolve(args[0] ?? new URL('../../demos', import.meta.url).pathname);

const books = existsSync(path.join(root, 'index.html')) ? ['.'] : readdirSync(root)
    .filter(name => existsSync(path.join(root, name, 'index.html')))
    .sort();
if (!books.length) {
    console.error(`No converted books (folders with index.html) in ${root}`);
    process.exit(2);
}

const server = await serve(root);
const chrome = await launchChrome(viewportWidth);
const results = [];
try {
    for (const book of books) {
        const pages = readdirSync(path.join(root, book)).filter(file => file.endsWith('.html')).sort(indexFirst).slice(0, pageLimit);
        for (const [i, page] of pages.entries()) {
            const url = `${server.url}/${book}/${page}`;
            results.push(...await checkPage(chrome, url, `${book}/${page}`, { panels: i === 0, themes: i === 0 ? ['light', 'dark', 'cream', 'sepia', 'gray', 'blue'] : ['light'] }));
            if (i === 0) results.push(...await checkWithoutJavaScript(chrome, url, `${book}/${page}`));
        }
        process.stdout.write(`${book}: ${pages.length} pages checked\n`);
    }
} finally {
    chrome.close();
    server.close();
}

const violations = results.flatMap(result => result.violations.map(v => ({ ...v, where: result.where })));
const byRule = new Map();
for (const v of violations) {
    const entry = byRule.get(v.id) ?? { id: v.id, impact: v.impact, help: v.help, helpUrl: v.helpUrl, count: 0, examples: [] };
    entry.count += v.nodes.length;
    if (entry.examples.length < 5) entry.examples.push(`${v.where}: ${v.nodes[0]?.target.join(' ')}`);
    byRule.set(v.id, entry);
}
if (reportFile) writeFileSync(reportFile, JSON.stringify({ checked: results.length, rules: [...byRule.values()], violations }, null, 2));

console.log(`\n${results.length} page states checked in ${books.length} books.`);
if (!byRule.size) {
    console.log('No WCAG 2.2 A or AA violations found by axe.');
    process.exit(0);
}
for (const rule of [...byRule.values()].sort((a, b) => b.count - a.count)) {
    console.log(`\n${rule.impact ?? ''} ${rule.id} (${rule.count}): ${rule.help}\n  ${rule.helpUrl}`);
    for (const example of rule.examples) console.log(`  - ${example}`);
}
process.exit(1);

function indexFirst(a, b) {
    return (a === 'index.html' ? -1 : b === 'index.html' ? 1 : 0) || a.localeCompare(b, undefined, { numeric: true });
}

async function checkPage(chrome, url, where, { panels, themes }) {
    const out = [];
    for (const theme of themes) {
        // Chosen through Colors, as a reader would (a shared choice, so every book on the origin has
        // it): Colors sets the light or dark base itself, and the head script reads that before the
        // first paint. Setting the old appearance key alone was reset to the system's by Automatic.
        await chrome.navigate(url);
        await chrome.evaluate(`localStorage.clear(); localStorage.setItem('webbook-colors', '${theme}'); localStorage.setItem('webbook-appearance', '${theme === 'dark' || theme === 'gray' || theme === 'blue' ? 'dark' : 'light'}')`);
        await chrome.navigate(url);
        out.push({ where: `${where} (${theme})`, violations: await runAxe(chrome, 'document') });
        if (!panels) continue;
        for (const id of PANELS) {
            const opened = await chrome.evaluate(`(() => { const p = document.getElementById('${id}'); if (!p?.showPopover) return false; p.showPopover(); return true; })()`);
            if (!opened) continue;
            await new Promise(r => setTimeout(r, 300));
            out.push({ where: `${where} (${theme}, #${id} open)`, violations: await runAxe(chrome, `document.getElementById('${id}')`) });
            await chrome.evaluate(`document.getElementById('${id}').hidePopover()`);
        }
    }
    return out;
}

// Without JavaScript. Disabling scripts would stop axe too (it needs timers), so this blocks the
// reader's script files and undoes what the head's inline script did, which is what a reader
// without JavaScript gets: the plain navigation, the browser's audio player, no toolbars.
async function checkWithoutJavaScript(chrome, url, where) {
    await chrome.send('Network.enable');
    await chrome.send('Network.setBlockedURLs', { urls: ['*/src/js/*'] });
    try {
        await chrome.navigate(url);
        await chrome.evaluate(`document.documentElement.classList.remove('webbook-dark', 'webbook-light', 'webbook-js', 'webbook-caption-mode')`);
        const out = [{ where: `${where} (no JavaScript)`, violations: await runAxe(chrome, 'document') }];
        if (await chrome.evaluate(`(() => { const toc = document.getElementById('webbook-toc-nav'); if (!toc?.showPopover) return false; toc.showPopover(); return true; })()`)) {
            out.push({ where: `${where} (no JavaScript, #webbook-toc-nav open)`, violations: await runAxe(chrome, `document.getElementById('webbook-toc-nav')`) });
        }
        return out;
    } finally {
        await chrome.send('Network.setBlockedURLs', { urls: [] });
    }
}

async function runAxe(chrome, context) {
    const result = await chrome.evaluate(`(async () => {
        if (!window.axe) { ${AXE_SOURCE} }
        const r = await axe.run(${context}, { runOnly: { type: 'tag', values: ${JSON.stringify(WCAG_TAGS)} } });
        return r.violations.map(v => ({ id: v.id, impact: v.impact, help: v.help, helpUrl: v.helpUrl,
            nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) }));
    })()`);
    return result ?? [];
}

function serve(dir) {
    return new Promise(resolve => {
        const server = createServer((req, res) => {
            const file = path.join(dir, decodeURIComponent(new URL(req.url, 'http://x').pathname));
            if (!file.startsWith(dir) || !existsSync(file) || statSync(file).isDirectory()) {
                res.writeHead(404).end();
                return;
            }
            res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
            res.end(readFileSync(file));
        });
        server.listen(0, '127.0.0.1', () => resolve({ url: `http://127.0.0.1:${server.address().port}`, close: () => server.close() }));
    });
}

function chromePath() {
    const candidates = [process.env.CHROME_PATH,
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
        '/Applications/Chromium.app/Contents/MacOS/Chromium',
        '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser'];
    const found = candidates.find(candidate => candidate && existsSync(candidate));
    if (!found) throw new Error('Chrome not found; set CHROME_PATH');
    return found;
}

async function launchChrome(width) {
    const profile = mkdtempSync(path.join(tmpdir(), 'webbook-axe-'));
    const proc = spawn(chromePath(), ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
        '--no-first-run', '--no-default-browser-check', '--mute-audio', `--window-size=${width},900`, 'about:blank'],
        { stdio: ['ignore', 'ignore', 'pipe'] });
    const wsUrl = await new Promise((resolve, reject) => {
        let buffer = '';
        proc.stderr.on('data', chunk => {
            buffer += chunk;
            const match = buffer.match(/DevTools listening on (ws:\S+)/);
            if (match) resolve(match[1]);
        });
        proc.on('exit', code => reject(new Error(`Chrome exited (${code})`)));
    });
    const browser = await connect(wsUrl);
    const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await browser.send('Target.attachToTarget', { targetId, flatten: true });
    const send = (method, params = {}) => browser.send(method, params, sessionId);
    await send('Page.enable');
    await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
    return {
        send,
        async evaluate(expression) {
            const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
            if (r.exceptionDetails) throw new Error(`${r.exceptionDetails.text} ${r.exceptionDetails.exception?.description ?? ''}`);
            return r.result?.value;
        },
        async navigate(url) {
            const loaded = browser.once('Page.loadEventFired', sessionId);
            await send('Page.navigate', { url });
            await loaded;
            // Let the reader's modules finish setting up the page
            await new Promise(r => setTimeout(r, 700));
        },
        close() {
            browser.close();
            proc.kill();
        }
    };
}

async function connect(wsUrl) {
    const ws = new WebSocket(wsUrl);
    await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
    let nextId = 0;
    const pending = new Map();
    const waiters = [];
    ws.onmessage = event => {
        const msg = JSON.parse(event.data);
        if (msg.id && pending.has(msg.id)) {
            const { resolve, reject } = pending.get(msg.id);
            pending.delete(msg.id);
            if (msg.error) reject(new Error(msg.error.message));
            else resolve(msg.result);
        } else if (msg.method) {
            for (const waiter of waiters.filter(w => w.method === msg.method && w.sessionId === msg.sessionId)) {
                waiters.splice(waiters.indexOf(waiter), 1);
                waiter.resolve(msg.params);
            }
        }
    };
    return {
        send(method, params = {}, sessionId) {
            const id = ++nextId;
            ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
            return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
        },
        once(method, sessionId) {
            return new Promise(resolve => waiters.push({ method, sessionId, resolve }));
        },
        close: () => ws.close()
    };
}
