/* Classic worker core. Protocol 1 is shared by the local UI and compatible remote releases. */
self.WebbookOfflineWorker = { protocol: 1, version: '1', start(options = {}) {
    const scope = options.scope || self.registration.scope, foreground = options.foreground || null;
    if (!self.WebbookOfflineRange) importScripts(new URL('src/js/offline-range.js', scope).href);
    if (!self.WebbookOfflineFetch) importScripts(new URL('src/js/offline-network.js', scope).href);
    const MAX_FILES = 20000, MAX_BYTES = 10 * 1024 ** 3;
    let job = null, changing = false;
    let lock = Promise.resolve();
    async function exclusive(run) {
        const previous = lock; let release;
        lock = new Promise(resolve => { release = resolve; }); await previous;
        try { return await run(); } finally { release(); }
    }
    let dbPromise;
    function databaseOpen() {
        if (!dbPromise) {
            dbPromise = new Promise((resolve, reject) => {
                const open = indexedDB.open('webbook-offline-1', 1);
                open.onupgradeneeded = () => { for (const name of ['books', 'snapshots', 'pins']) open.result.createObjectStore(name); };
                open.onsuccess = () => resolve(open.result); open.onerror = () => reject(open.error);
            });
            dbPromise.catch(() => { dbPromise = null; });
        }
        return dbPromise;
    }
    async function db(store, key, value, remove = false) {
        const database = await databaseOpen();
        return new Promise((resolve, reject) => {
            const transaction = database.transaction(store, value === undefined && !remove ? 'readonly' : 'readwrite');
            const table = transaction.objectStore(store), request = remove ? table.delete(key) : value === undefined ? table.get(key) : table.put(value, key);
            transaction.oncomplete = () => resolve(request.result); transaction.onerror = transaction.onabort = () => reject(transaction.error || request.error || new Error('Offline storage failed.'));
        });
    }
    async function keys(store) {
        const database = await databaseOpen();
        return new Promise((resolve, reject) => { const request = database.transaction(store).objectStore(store).getAllKeys(); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
    }
    const state = async () => await db('books', scope) || {};
    const hex = async bytes => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), b => b.toString(16).padStart(2, '0')).join('');
    const prefix = hex(new TextEncoder().encode(scope)).then(hash => 'webbook-offline-1-' + hash + '-');
    const localURL = value => { const url = new URL(value); return url.origin === new URL(scope).origin && url.pathname.startsWith(new URL(scope).pathname) && !/[\\\u0000]|(?:^|\/)\.\.(?:\/|$)/.test(decodeURIComponent(url.pathname)); };
    const clientURL = value => { try { const url = new URL(value); return new URL('./', value).href === scope || url.origin === new URL(scope).origin && url.pathname.endsWith('/src/offline-books.html'); } catch { return false; } };
    const canonical = value => { const url = new URL(value); url.hash = ''; if (url.pathname.endsWith('/')) url.pathname += 'index.html'; if (/\.html?$/.test(url.pathname)) url.search = ''; return url.href; };
    const bookClients = async () => (await self.clients.matchAll({ type: 'window', includeUncontrolled: true })).filter(client => clientURL(client.url));
    async function broadcast(detail) { if (foreground) { self.postMessage({ webbookOffline: 1, ...detail }); return; } for (const client of await bookClients()) client.postMessage({ webbookOffline: 1, ...detail }); }
    async function liveLease(value) {
        if (!value || typeof value !== 'object' || value.expires < Date.now()) return false;
        const owner = await self.clients.get(value.owner);
        return Boolean(owner && clientURL(owner.url));
    }
    async function bookTransaction(update) {
        const database = await databaseOpen();
        return new Promise((resolve, reject) => {
            const transaction = database.transaction('books', 'readwrite'), table = transaction.objectStore('books');
            let result, failure; const request = table.get(scope);
            request.onsuccess = () => { try { const row = request.result || {}; result = update(row); table.put(row, scope); } catch (error) { failure = error; transaction.abort(); } };
            transaction.oncomplete = () => resolve(result); transaction.onerror = transaction.onabort = () => reject(failure || transaction.error);
        });
    }
    async function renewLease(name) {
        return bookTransaction(row => {
            if (row.job?.cache !== name || row.job.cancelled) return false;
            row.job.expires = Date.now() + 120000; return true;
        });
    }
    async function begin(clientId, data) {
        await cleanup();
        return exclusive(async () => {
            if (job || changing) throw new Error('Another offline operation is in progress.');
            validateFiles(data.files, data.ui); const row = await state();
            if (await liveLease(row.job)) throw new Error('Another tab is downloading this book.');
            const name = await prefix + crypto.randomUUID(); row.job = { cache: name, owner: clientId, expires: Date.now() + 120000 };
            await db('books', scope, row); await broadcast({ changed: true });
            const channel = new URL(self.location.href).searchParams.get('webbook-channel');
            return { scope, owner: clientId, cache: name, remote: self.WebbookOfflineCoreSource && !data.ui.localOnly ? { channel, worker: self.WebbookOfflineCoreSource } : null };
        });
    }
    async function endLease(clientId, name) {
        const row = await state();
        if (row.job?.cache !== name || row.job.owner !== clientId) return;
        await caches.delete(name); await db('snapshots', name, undefined, true); delete row.job; await db('books', scope, row); await broadcast({ changed: true });
    }
    async function cleanup() {
        return exclusive(async () => {
        if (job || changing) return;
        const row = await state(); if (await liveLease(row.job)) return;
        const alive = await bookClients(), pinned = new Set();
        const liveKeys = new Set(alive.map(client => scope + '|' + client.id));
        for (const key of await keys('pins')) if (key.startsWith(scope + '|') && !liveKeys.has(key)) await db('pins', key, undefined, true);
        for (const client of alive) { const pin = await db('pins', scope + '|' + client.id); if (pin) pinned.add(pin); }
        for (const name of await caches.keys()) {
            if (!name.startsWith(await prefix) || [row.active, row.pending].includes(name) || pinned.has(name)) continue;
            await caches.delete(name); await db('snapshots', name, undefined, true);
        }
        for (const name of await keys('snapshots')) if (name.startsWith(await prefix) && ![row.active, row.pending].includes(name) && !pinned.has(name)) await db('snapshots', name, undefined, true);
        if (row.job) { delete row.job; await db('books', scope, row); }
        });
    }
    async function status(clientId) {
        await cleanup(); const row = await state(), saved = row.active ? await db('snapshots', row.active) : null;
        const complete = async snapshot => {
            if (!snapshot || !await caches.has(snapshot.cache)) return false;
            const cache = await caches.open(snapshot.cache), urls = new Set((await cache.keys()).map(request => request.url));
            return snapshot.files.every(file => urls.has(file.url));
        };
        const pending = row.pending ? await db('snapshots', row.pending) : null;
        const pendingValid = await complete(pending);
        return { protocol: 1, recovering: await db('pins', scope + '|' + clientId) === 'network', workerVersion: self.WebbookOfflineWorker.version, scope, saved,
            complete: await complete(saved), pending: pendingValid ? pending : null, pendingIncomplete: Boolean(row.pending) && !pendingValid, busy: Boolean(job || row.job) };
    }
    function validateFiles(files, ui) {
        if (!ui || ui.protocol !== 1 || ui.contract !== 0 || !/^[a-f0-9]{64}$/.test(ui.localRevision || '')) throw new Error('Incompatible reader package.');
        const remoteFiles = new Map();
        if (ui?.remote) {
            const remote = ui.remote, base = new URL(remote.channel);
            if (!(base.protocol === 'https:' || base.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(base.hostname)) || !base.pathname.endsWith('/') || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/.test(remote.version) || !Array.isArray(remote.files)) throw new Error('Invalid saved UI release.');
            const prefix = new URL('releases/' + remote.version + '/', base).href;
            for (const file of remote.files) { if (!file.url.startsWith(prefix) || /(?:^|\/)\.\.(?:\/|$)|[\\\u0000]/.test(decodeURIComponent(new URL(file.url).pathname)) || !/^[a-f0-9]{64}$/.test(file.sha256)) throw new Error('Invalid remote UI inventory.'); remoteFiles.set(file.url, file.sha256); }
        }
        if (!Array.isArray(files) || !files.length || files.length > MAX_FILES) throw new Error('Invalid offline file list.');
        const used = new Set(); let size = 0;
        for (const file of files) {
            if (!file || typeof file.url !== 'string' || (!localURL(file.url) && remoteFiles.get(file.url) !== file.sha256) || canonical(file.url) !== file.url || used.has(file.url)) throw new Error('The offline file list leaves this book or repeats a file.');
            used.add(file.url); size += Math.max(0, file.size || 0);
            if (file.sha256 && !/^[a-f0-9]{64}$/.test(file.sha256)) throw new Error('Invalid reader checksum.');
        }
        if (Array.from(remoteFiles.keys()).some(url => !used.has(url))) throw new Error('The remote UI file list is incomplete.');
        if (ui?.remote) { const base = new URL('releases/' + ui.remote.version + '/', ui.remote.channel); for (const name of ['main.js', 'style.css', 'offline-worker.js']) if (!remoteFiles.has(new URL(name, base).href)) throw new Error('The remote UI release is incomplete.'); }
        if (!used.has(new URL('index.html', scope).href) || !used.has(new URL('src/ui-files.json', scope).href) || size > MAX_BYTES) throw new Error('The offline file list is incomplete or too large.');
    }
    function network(url, signal, method = 'GET') {
        return self.WebbookOfflineFetch(url, { scope, foreground: Boolean(foreground), signal, method });
    }
    async function boundedBody(response, signal, reserve) {
        if (!response.body) return new Blob();
        const reader = response.body.getReader();
        return new Response(new ReadableStream({
            async pull(stream) {
                let timer;
                try {
                    signal.throwIfAborted();
                    const result = await Promise.race([reader.read(), new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('The connection stopped responding. Please retry.')), 60000); })]);
                    if (result.done) stream.close(); else { reserve(result.value.byteLength); stream.enqueue(result.value); }
                } catch (error) { reader.cancel().catch(() => {}); stream.error(error); }
                finally { clearTimeout(timer); }
            }, cancel() { return reader.cancel(); }
        })).blob();
    }
    async function save(data, reply) {
        if (job || changing) throw new Error('Another offline operation is in progress.');
        validateFiles(data.files, data.ui);
        if (!data.ui || data.ui.protocol !== 1 || data.ui.contract !== 0) throw new Error('Incompatible reader package.');
        const activeJob = { controller: new AbortController(), id: crypto.randomUUID() }; job = activeJob;
        const signal = activeJob.controller.signal, name = foreground ? foreground.cache : await prefix + activeJob.id;
        let heartbeat;
        try {
            const row = await state();
            if (foreground) {
                if (row.job?.cache !== name || row.job.owner !== foreground.owner || row.job.cancelled) throw new DOMException('Download cancelled.', 'AbortError');
                heartbeat = setInterval(() => renewLease(name).then(valid => { if (!valid) activeJob.controller.abort(); }).catch(() => activeJob.controller.abort()), 30000);
            } else {
                if (await liveLease(row.job)) throw new Error('Another tab is downloading this book.');
                row.job = name; await db('books', scope, row);
            }
            const cache = await caches.open(name), files = data.files, recorded = new Array(files.length);
            let next = 0, done = 0, bytes = 0, budget = 0, lastProgress = 0;
            const reserve = length => {
                budget += length; if (budget > MAX_BYTES) throw new Error('This book exceeds the offline storage limit.');
                if (Date.now() - lastProgress > 1000) {
                    lastProgress = Date.now(); const progress = { phase: 'saving', done, total: files.length, bytes: budget };
                    reply({ progress }); broadcast({ progress }).catch(() => {});
                }
            };
            const download = async () => {
                while (next < files.length) {
                    signal.throwIfAborted(); const index = next++, file = files[index];
                    let body = file.body, headers = new Headers({ 'Content-Type': file.type || 'application/octet-stream' });
                    let etag = file.etag || '', modified = file.modified || '';
                    if (!body) {
                        const response = await network(file.url, signal);
                        if (response.status !== 200 || response.type === 'opaque' || response.headers.has('Content-Range')) throw new Error(`Couldn't save ${new URL(file.url).pathname} (${response.status}).`);
                        headers = new Headers(response.headers); etag = headers.get('etag') || ''; modified = headers.get('last-modified') || '';
                        if (file.etag && etag !== file.etag || file.modified && modified !== file.modified) throw new Error('The book changed during the download. Please retry.');
                        body = await boundedBody(response, signal, reserve);
                    }
                    else reserve(body.size);
                    const type = headers.get('Content-Type') || '';
                    if (file.kind === 'asset' && /text\/html|application\/json/i.test(type)
                        || file.kind === 'html' && !/html/i.test(type)
                        || file.kind === 'script' && !/javascript|ecmascript/i.test(type)
                        || file.kind === 'css' && !/text\/css/i.test(type)
                        || file.kind === 'json' && !/json/i.test(type)) throw new Error('The server returned the wrong file type for ' + new URL(file.url).pathname);
                    if (!(body instanceof Blob)) throw new Error('Invalid saved response.');
                    if (file.sha256 && await hex(await body.arrayBuffer()) !== file.sha256) throw new Error('Reader files changed or failed verification. Update the complete reader package and retry.');
                    bytes += body.size; if (bytes > MAX_BYTES) throw new Error('This book exceeds the offline storage limit.');
                    for (const header of ['Content-Encoding', 'Content-Length', 'Transfer-Encoding', 'Content-Range']) headers.delete(header);
                    headers.set('Content-Length', String(body.size));
                    if (etag) headers.set('ETag', etag); if (modified) headers.set('Last-Modified', modified);
                    signal.throwIfAborted(); await cache.put(file.url, new Response(body, { status: 200, headers }));
                    const { body: ignored, scanned, optional, ...metadata } = file;
                    recorded[index] = { ...metadata, size: body.size, etag, modified };
                    done++; const progress = { phase: 'saving', done, total: files.length, bytes: budget }; reply({ progress }); await broadcast({ progress });
                }
            };
            let firstError;
            const guarded = async (run = download) => { try { await run(); } catch (error) { firstError ||= error; activeJob.controller.abort(); throw error; } };
            await Promise.allSettled([guarded(), guarded()]);
            if (firstError) throw firstError;
            const inventory = await (await cache.match(new URL('src/ui-files.json', scope).href)).json();
            if (inventory.version !== 1 || inventory.contract !== data.ui.contract || inventory.revision !== data.ui.localRevision || !Array.isArray(inventory.files)
                || await hex(new TextEncoder().encode(JSON.stringify(inventory.files))) !== inventory.revision) throw new Error('The reader inventory failed verification.');
            const downloaded = new Map(recorded.map(file => [file.url, file]));
            for (const item of inventory.files) {
                const url = new URL(item.href, scope).href;
                if (!item.href.startsWith('src/') || !localURL(url) || downloaded.get(url)?.sha256 !== item.sha256) throw new Error('The complete reader package was not downloaded.');
            }
            // Revalidate all known validators after downloading, before committing a snapshot.
            let verifyNext = 0;
            const verify = async () => {
                while (verifyNext < recorded.length) {
                    const file = recorded[verifyNext++]; signal.throwIfAborted();
                    if (!file.etag && !file.modified) continue;
                    reply({ progress: { phase: 'verifying', done: files.length, total: files.length, bytes } });
                    const response = await network(file.url, signal, 'HEAD');
                    if ([400, 401, 403, 404, 405, 501].includes(response.status)) continue;
                    if (!response.ok || file.etag && response.headers.get('etag') !== file.etag || file.modified && response.headers.get('last-modified') !== file.modified) throw new Error('The book changed during the download. Please retry.');
                }
            };
            await Promise.allSettled(Array.from({ length: 4 }, () => guarded(verify)));
            if (firstError) throw firstError;
            signal.throwIfAborted();
            const snapshot = { cache: name, files: recorded, bytes, savedAt: new Date().toISOString(), ui: data.ui };
            await db('snapshots', name, snapshot);
            const committed = await bookTransaction(latest => {
                signal.throwIfAborted();
                if (foreground && (latest.job?.cache !== name || latest.job.cancelled)) throw new DOMException('Download cancelled.', 'AbortError');
                if (!foreground && latest.job !== name) throw new Error('This download no longer owns its staging copy.');
                delete latest.job; const previousPending = latest.pending;
                if (latest.active) latest.pending = name; else latest.active = name;
                return { ready: Boolean(latest.pending), previousPending };
            });
            if (committed.previousPending) { await caches.delete(committed.previousPending); await db('snapshots', committed.previousPending, undefined, true); }
            return { ready: committed.ready, bytes };
        } catch (error) {
            activeJob.controller.abort(); await caches.delete(name); await db('snapshots', name, undefined, true);
            const latest = await state(); if (latest.job === name || latest.job?.cache === name) { delete latest.job; await db('books', scope, latest); }
            throw error;
        } finally { clearInterval(heartbeat); if (job === activeJob) job = null; await broadcast({ changed: true }); }
    }
    async function activate(clientId) {
        return exclusive(async () => {
        if (job || changing || await liveLease((await state()).job)) throw new Error('Another offline operation is in progress.'); changing = true;
        try {
            if ((await bookClients()).some(client => client.id !== clientId)) throw new Error('Close the other tabs of this book before using the update.');
            const row = await state(); if (!row.pending) throw new Error('There is no update ready to use.');
            const pending = await db('snapshots', row.pending), cache = await caches.open(row.pending);
            const keys = new Set((await cache.keys()).map(request => request.url));
            if (!pending || !pending.files.every(file => keys.has(file.url))) throw new Error('The downloaded update is incomplete. Download it again.');
            row.active = row.pending; delete row.pending; await db('books', scope, row);
            await db('pins', scope + '|' + clientId, undefined, true);
            await broadcast({ changed: true }); return { reload: true };
        } finally { changing = false; }
        });
    }
    async function remove() {
        return exclusive(async () => {
        if (job || changing || await liveLease((await state()).job)) throw new Error('Another offline operation is in progress.'); changing = true;
        try {
            await db('books', scope, undefined, true);
            for (const name of await caches.keys()) if (name.startsWith(await prefix)) { await caches.delete(name); await db('snapshots', name, undefined, true); }
            for (const name of await keys('snapshots')) if (name.startsWith(await prefix)) await db('snapshots', name, undefined, true);
            for (const key of await keys('pins')) if (key.startsWith(scope + '|')) await db('pins', key, undefined, true);
            await broadcast({ changed: true }); return { removed: true };
        } finally { changing = false; }
        });
    }
    if (!foreground) self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
    self.addEventListener('message', event => {
        const port = event.ports?.[0], data = event.data;
        if (!port || data?.webbookOffline !== 1 || data.protocol !== 1) return;
        const reply = payload => { try { port.postMessage(payload); } catch { /* The initiating tab may have closed. */ } };
        const operation = (async () => {
            const client = foreground ? { id: foreground.owner, url: scope + 'index.html' } : event.source?.id && await self.clients.get(event.source.id);
            if (foreground && !['save', 'cancel'].includes(data.command)) throw new Error('Unsupported foreground command.');
            if (!client || !clientURL(client.url)) throw new Error('This command is outside the book.');
            let result;
            if (data.command === 'begin-save') result = await begin(client.id, data);
            else if (data.command === 'end-save') result = await endLease(client.id, data.cache);
            else if (data.command === 'notify') { const lease = (await state()).job; await broadcast(data.progress && lease?.owner === client.id ? { progress: data.progress } : { changed: true }); result = {}; }
            else if (data.command === 'status') result = await status(client.id);
            else if (data.command === 'save') result = await save(data, reply);
            else if (data.command === 'cancel') { if (job) job.controller.abort(); else { const lease = await bookTransaction(row => { if (row.job?.owner) { row.job.cancelled = true; return row.job; } return null; }); if (lease?.owner) (await self.clients.get(lease.owner))?.postMessage({ webbookOffline: 1, cancelDownload: lease.cache }); } result = { cancelled: true }; }
            else if (data.command === 'remove') result = await remove();
            else if (data.command === 'activate') result = await activate(client.id);
            else throw new Error('Unsupported offline command.');
            reply({ result });
        })().catch(error => reply({ error: error.name === 'AbortError' ? 'Download cancelled.' : error.name === 'SecurityError' ? 'Browser storage is blocked. Online reading still works.' : error.name === 'QuotaExceededError' ? 'There is not enough storage. The previous saved copy is unchanged.' : error.message || 'Offline storage failed.' }));
        if (typeof event.waitUntil === 'function') event.waitUntil(operation);
    });
    if (foreground) return;
    function missing(request) {
        if (request.mode !== 'navigate') return new Response('This file is missing from the saved book. Reconnect and save it again.', { status: 503 });
        const url = new URL(request.url); url.searchParams.set('webbook-offline-recover', '1');
        const href = url.href.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
        return new Response(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Saved book incomplete</title><main><h1>This saved book is incomplete</h1><p>Reconnect, then open an online copy and save the book again. Your settings and reading position are kept.</p><p><a href="${href}">Open the online recovery copy</a></p></main></html>`, { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
    }
    self.addEventListener('fetch', event => {
        const request = event.request;
        if (!['GET', 'HEAD'].includes(request.method) || request.headers.get('X-Webbook-Offline-Network') === '1') return;
        event.respondWith((async () => {
            let row; try { row = await state(); } catch { return fetch(request); }
            // Keep the management page usable after its hosting book is removed.
            const libraryPage = new URL('src/offline-books.html', scope).href;
            const source = event.clientId && await self.clients.get(event.clientId);
            if (!row.active && (canonical(request.url) === libraryPage || source && canonical(source.url) === libraryPage)) {
                const shell = await caches.open('webbook-offline-library-' + scope);
                const cached = await shell.match(canonical(request.url));
                if (cached) return cached;
            }
            if (!row.active) return fetch(request);
            const url = canonical(request.url);
            let generation = row.active;
            if (request.mode === 'navigate') {
                if (new URL(request.url).searchParams.get('webbook-offline-recover') === '1' || event.clientId && await db('pins', scope + '|' + event.clientId) === 'network') generation = 'network';
                if (event.resultingClientId) await db('pins', scope + '|' + event.resultingClientId, generation);
            } else if (event.clientId) {
                generation = await db('pins', scope + '|' + event.clientId) || row.active;
                await db('pins', scope + '|' + event.clientId, generation);
            }
            if (generation === 'network') return fetch(request);
            const snapshot = await db('snapshots', generation);
            if (!snapshot && !localURL(url)) return fetch(request);
            if (!snapshot) return missing(request);
            if (!localURL(url) && !snapshot.files.some(file => file.url === url)) return fetch(request);
            if (!await caches.has(generation)) { await broadcast({ incomplete: true }); return missing(request); }
            const cache = await caches.open(generation);
            if (request.mode === 'navigate' && localURL(url)) { const cached = new Set((await cache.keys()).map(key => key.url)); if (!snapshot.files.every(file => cached.has(file.url))) return missing(request); }
            const response = await cache.match(url);
            if (!response) { await broadcast({ incomplete: true }); return missing(request); }
            if (request.headers.has('Range') || request.method === 'HEAD') return self.WebbookOfflineRange(request, response);
            return response;
        })().catch(() => new Response('This book is unavailable offline. Reconnect and try again.', { status: 503 })));
    });
} };
