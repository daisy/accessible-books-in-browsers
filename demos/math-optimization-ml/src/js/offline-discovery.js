import { resourceURL, cssReferences, srcsetReferences, kindFor, validators, sha256, LIMITS, workerScriptURL } from './offline-resources.js';
export async function discoverBook(root, { signal, onProgress = () => {}, current = location.href } = {}) {
    const entries = new Map(); let discoveryBytes = 0;
    const add = (href, base = root, options = {}) => {
        const url = resourceURL(href, base, root, options);
        if (!url) return null;
        if (!entries.has(url)) {
            if (entries.size >= LIMITS.files) throw new Error('This book has too many files to save.');
            entries.set(url, { url, kind: options.kind || kindFor(url), optional: Boolean(options.optional), size: null, etag: '', modified: '' });
        } else if (!options.optional) entries.get(url).optional = false;
        return entries.get(url);
    };
    add('index.html'); add(current);
    add('search-data.json', root, { optional: true }); add('audio-map.json', root, { optional: true });
    const inventoryEntry = add('src/ui-files.json');
    add('sw.js', root, { kind: 'script' });
    const addCSS = (text, base) => {
        const imports = new Set(), resources = cssReferences(text, href => imports.add(href));
        for (const href of resources) add(href, base, { kind: imports.has(href) ? 'css' : undefined });
    };
    const get = async (entry, method = 'GET') => {
        const timer = AbortSignal.timeout(30000), combined = AbortSignal.any([signal, timer].filter(Boolean));
        const response = await fetch(entry.url, { method, signal: combined, cache: 'no-store', credentials: 'same-origin', redirect: 'error', headers: { 'X-Webbook-Offline-Network': '1' } });
        if (response.status === 404 && entry.optional) { entries.delete(entry.url); return null; }
        if (response.status !== 200 || response.type === 'opaque') throw new Error(`Couldn't read ${new URL(entry.url).pathname} (${response.status}).`);
        return response;
    };
    const read = async entry => {
        const response = await get(entry); if (!response) return null;
        Object.assign(entry, validators(response.headers));
        entry.body = await response.blob(); entry.size = entry.body.size;
        discoveryBytes += entry.size;
        if (discoveryBytes > LIMITS.discoveryBytes) throw new Error('This book is too large to inspect safely.');
        entry.digest = await sha256(await entry.body.arrayBuffer());
        return entry.body.text();
    };
    const inventoryText = await read(inventoryEntry), inventory = JSON.parse(inventoryText);
    const contract = Number(document.documentElement.dataset.webbookContract);
    if (inventory.version !== 1 || inventory.contract !== contract || !Array.isArray(inventory.files) || !/^[a-f0-9]{64}$/.test(inventory.revision || '')) throw new Error('The reader file list is missing or incompatible. Update the complete reader package.');
    for (const file of inventory.files) {
        if (typeof file.href !== 'string' || !file.href.startsWith('src/') || !/^[a-f0-9]{64}$/.test(file.sha256) || !Number.isSafeInteger(file.bytes) || file.bytes < 0) throw new Error('The reader file list is invalid.');
        const entry = add(file.href); Object.assign(entry, { sha256: file.sha256, size: file.bytes });
    }
    // Inventory-backed scripts need no JavaScript parser, including static and lazy imports.
    for (;;) {
        const entry = Array.from(entries.values()).find(item => !item.scanned && ['html', 'css', 'json'].includes(item.kind) && item.url !== new URL('src/reader-shell.html', root).href);
        if (!entry) break;
        entry.scanned = true; onProgress(entries.size);
        const text = entry.body ? await entry.body.text() : await read(entry);
        if (text === null) continue;
        if (entry.kind === 'html') {
            const doc = new DOMParser().parseFromString(text, 'text/html');
            const base = doc.querySelector('base[href]')?.getAttribute('href');
            const baseURL = base ? resourceURL(base, entry.url, root) : entry.url;
            for (const node of doc.querySelectorAll('a[href]')) {
                const href = node.getAttribute('href'), candidate = resourceURL(href, baseURL, root, { link: true });
                if (candidate && kindFor(candidate) === 'html') add(candidate);
            }
            for (const node of doc.querySelectorAll('link[rel~="stylesheet"][href], link[rel~="icon"][href], link[rel~="preload"][href], script[src], img[src], source[src], audio[src], video[src], track[src], input[type=image][src], object[data], embed[src], iframe[src], image, use')) {
                const href = node.getAttribute('src') || node.getAttribute('href') || node.getAttribute('xlink:href') || node.getAttribute('data');
                add(href, baseURL, { kind: node.localName === 'link' && node.relList.contains('stylesheet') ? 'css' : node.localName === 'script' ? 'script' : undefined });
            }
            for (const node of doc.querySelectorAll('[poster]')) add(node.getAttribute('poster'), baseURL);
            for (const node of doc.querySelectorAll('[srcset]')) for (const href of srcsetReferences(node.getAttribute('srcset'))) add(href, baseURL);
            for (const node of doc.querySelectorAll('style, [style]')) addCSS(node.localName === 'style' ? node.textContent : node.getAttribute('style') || '', baseURL);
        } else if (entry.kind === 'css') {
            addCSS(text, entry.url);
        } else if (entry !== inventoryEntry) {
            const data = JSON.parse(text);
            for (const page of Array.isArray(data?.pages) ? data.pages : []) { if (page?.href) add(page.href); if (page?.audio) add(page.audio); }
        }
    }
    const remaining = Array.from(entries.values()).filter(entry => !entry.body);
    let next = 0;
    await Promise.all(Array.from({ length: Math.min(4, remaining.length) }, async () => {
        while (next < remaining.length) {
            const entry = remaining[next++];
            try { const response = await get(entry, 'HEAD'); if (response) Object.assign(entry, validators(response.headers)); }
            catch (error) { if (signal?.aborted) throw error; entry.size = entry.size ?? null; }
            onProgress(entries.size);
        }
    }));
    const files = Array.from(entries.values()).sort((a, b) => a.url.localeCompare(b.url));
    const bytes = files.reduce((sum, file) => sum + (file.size || 0), 0);
    if (bytes > LIMITS.bytes) throw new Error('This book exceeds the offline storage limit.');
    return { files, bytes, sizeKnown: files.every(file => file.size !== null && file.size !== undefined),
        ui: { contract, localRevision: inventory.revision, protocol: 1 } };
}
export function compareInventory(saved, fresh) {
    const old = new Map(saved.files.map(file => [file.url, file]));
    let changed = old.size !== fresh.files.length, reliable = true;
    for (const file of fresh.files) {
        const previous = old.get(file.url);
        if (!previous) { changed = true; continue; }
        const digest = file.digest || file.sha256, oldDigest = previous.digest || previous.sha256;
        if (digest && oldDigest) { if (digest !== oldDigest) changed = true; }
        else if (file.etag && previous.etag && !file.etag.startsWith('W/') && !previous.etag.startsWith('W/')) { if (file.etag !== previous.etag) changed = true; }
        else { reliable = false; if (file.modified && previous.modified && file.modified !== previous.modified || file.size !== null && file.size !== undefined && previous.size !== null && previous.size !== undefined && file.size !== previous.size) changed = true; }
    }
    return { changed, reliable };
}

// Plan 11 supplies an already selected release and its complete, hash-verified inventory.
// The local reader remains in the list as the offline fallback.
export function includeRemoteRelease(list, root, remote) {
    if (!remote || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/.test(remote.version)) throw new Error('Invalid UI release.');
    const base = new URL('releases/' + remote.version + '/', remote.channel);
    workerScriptURL(root, { channel: remote.channel, worker: new URL('offline-worker.js', base).href });
    if (remote.inventory?.version !== 1 || remote.inventory.contract !== list.ui.contract || !Array.isArray(remote.inventory.files)) throw new Error('Incompatible remote UI inventory.');
    const entries = remote.inventory.files.map(file => {
        const url = new URL(file.href, base);
        if (!url.href.startsWith(base.href) || /(?:^|\/)\.\.(?:\/|$)|[\\\u0000]/.test(decodeURIComponent(url.pathname)) || url.search || url.hash || !/^[a-f0-9]{64}$/.test(file.sha256) || !Number.isSafeInteger(file.bytes) || file.bytes < 0) throw new Error('Invalid remote UI inventory.');
        return { url: url.href, kind: kindFor(url.href), size: file.bytes, sha256: file.sha256 };
    });
    for (const required of ['main.js', 'style.css', 'offline-worker.js']) if (!entries.some(file => file.url === new URL(required, base).href)) throw new Error('The remote UI release is incomplete.');
    const unique = new Map(list.files.map(file => [file.url, file]));
    for (const file of entries) unique.set(file.url, file);
    if (unique.size > LIMITS.files || list.bytes + entries.reduce((sum, file) => sum + file.size, 0) > LIMITS.bytes) throw new Error('The offline release is too large.');
    return { ...list, files: Array.from(unique.values()), bytes: list.bytes + entries.reduce((sum, file) => sum + file.size, 0),
        ui: { ...list.ui, remote: { channel: new URL(remote.channel).href, version: remote.version, files: entries } } };
}
