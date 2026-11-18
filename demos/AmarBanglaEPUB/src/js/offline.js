import { bookRoot, workerScriptURL, OFFLINE_PROTOCOL } from './offline-resources.js';
import { discoverBook, compareInventory } from './offline-discovery.js';
import { registerAction, announceReaderAction } from './reader-actions.js';
import { prepareReload, clearReturnState } from './settings-transfer.js';
import { bookServerReachable } from './offline-connectivity.js';
import { includeSelectedUI } from './remote-ui.js';

export function offlineCommand(worker, command, data = {}, onProgress = () => {}, signal) {
    return command === 'save' ? foregroundDownload(worker, data, onProgress, signal) : workerCommand(worker, command, data, onProgress);
}
function workerCommand(worker, command, data = {}, onProgress = () => {}) {
    return new Promise((resolve, reject) => {
        const channel = new MessageChannel();
        let timer;
        const timeout = () => { clearTimeout(timer); timer = setTimeout(() => { channel.port1.close(); reject(new Error('Offline storage did not respond. Keep this tab open and try again.')); }, command === 'save' ? 90000 : 20000); };
        timeout();
        channel.port1.onmessage = event => {
            timeout();
            if (event.data.progress) { onProgress(event.data.progress); return; }
            clearTimeout(timer); channel.port1.close();
            if (event.data.error) reject(new Error(event.data.error)); else resolve(event.data.result);
        };
        worker.postMessage({ webbookOffline: 1, protocol: OFFLINE_PROTOCOL, command, ...data }, [channel.port2]);
    });
}
async function foregroundDownload(worker, data, onProgress, signal) {
    signal?.throwIfAborted();
    const lease = await workerCommand(worker, 'begin-save', data);
    let runner, rejectReady, running = false, canceled = false;
    const abort = () => { canceled = true; if (running) workerCommand(runner, 'cancel').catch(() => {}); else rejectReady?.(new DOMException('Download canceled.', 'AbortError')); };
    const cancel = event => { if (event.data?.cancelDownload === lease.cache) abort(); };
    signal?.addEventListener('abort', abort, { once: true });
    navigator.serviceWorker.addEventListener('message', cancel);
    try {
        signal?.throwIfAborted();
        runner = new Worker(new URL('src/js/offline-download-worker.js', lease.scope));
        await new Promise((resolve, reject) => {
            rejectReady = error => { clearTimeout(timer); reject(error); };
            const timer = setTimeout(() => reject(new Error('The download worker did not start.')), 20000);
            runner.addEventListener('error', () => { clearTimeout(timer); reject(new Error('The download worker could not start. Check this site’s worker policy.')); }, { once: true });
            runner.addEventListener('message', event => {
                if (event.data.ready) { clearTimeout(timer); resolve(); }
                else if (event.data.error) { clearTimeout(timer); reject(new Error(event.data.error)); }
                else if (event.data.webbookOffline === 1) workerCommand(worker, 'notify', event.data.progress ? { progress: event.data.progress } : {}).catch(() => {});
            });
            runner.postMessage({ webbookDownload: 1, ...lease });
        });
        if (canceled) throw new DOMException('Download canceled.', 'AbortError');
        running = true; return await workerCommand(runner, 'save', data, onProgress);
    } finally {
        runner?.terminate(); signal?.removeEventListener('abort', abort); navigator.serviceWorker.removeEventListener('message', cancel);
        await workerCommand(worker, 'end-save', { cache: lease.cache }).catch(() => {});
        await workerCommand(worker, 'notify').catch(() => {});
    }
}
export async function registerOfflineWorker(root = bookRoot(), remote) {
    const registration = await navigator.serviceWorker.register(workerScriptURL(root, remote), { scope: root, updateViaCache: 'none' });
    const worker = registration.active || registration.installing || registration.waiting;
    if (!worker) throw new Error('The offline worker is unavailable.');
    if (!registration.active) await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('The offline worker did not start.')), 20000);
        const check = () => { if (worker.state === 'activated') { clearTimeout(timer); resolve(); } else if (worker.state === 'redundant') { clearTimeout(timer); reject(new Error('The offline worker could not be installed.')); } };
        worker.addEventListener('statechange', check); check();
    });
    return registration;
}
const bytesText = value => new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(value / 1024 ** 2) + ' MB';
export function initOfflineReading() {
    const panel = document.querySelector('#webbook-info .webbook-info-body');
    if (!panel || document.getElementById('webbook-offline')) return;
    try { const url = new URL(location.href); if (url.searchParams.has('webbook-offline-recover')) { url.searchParams.delete('webbook-offline-recover'); history.replaceState(history.state, '', url); } } catch { /* Reading does not depend on history being writable. */ }
    const root = bookRoot(), section = document.createElement('section'); section.id = 'webbook-offline';
    const library = document.createElement('a'); library.href = new URL('src/offline-books.html', root); library.textContent = 'Offline books';
    const heading = document.createElement('h3'); heading.id = 'webbook-offline-heading'; heading.tabIndex = -1; heading.textContent = 'Offline reading';
    section.setAttribute('aria-labelledby', heading.id);
    const status = document.createElement('p'); status.id = 'webbook-offline-status'; status.setAttribute('role', 'status'); status.setAttribute('aria-atomic', 'true');
    const storage = document.createElement('p'); storage.id = 'webbook-offline-storage';
    const progressLabel = document.createElement('label'); progressLabel.htmlFor = 'webbook-offline-progress'; progressLabel.textContent = 'Book download'; progressLabel.hidden = true;
    const progress = document.createElement('progress'); progress.id = progressLabel.htmlFor; progress.hidden = true;
    const count = document.createElement('p'); count.id = 'webbook-offline-count';
    const controls = document.createElement('div'); controls.className = 'webbook-offline-controls';
    const confirmation = document.createElement('div'); confirmation.className = 'webbook-confirmation'; confirmation.hidden = true; confirmation.id = 'webbook-offline-confirmation'; confirmation.setAttribute('role', 'group'); confirmation.setAttribute('aria-labelledby', 'webbook-offline-question');
    const question = document.createElement('p'); question.id = 'webbook-offline-question'; question.textContent = 'Remove this saved book? Further offline reading will need another download. Your settings and reading position will be kept.';
    const indicator = document.createElement('button'); indicator.type = 'button'; indicator.id = 'webbook-offline-indicator'; indicator.textContent = 'Offline'; indicator.hidden = true;
    indicator.addEventListener('click', open);
    document.getElementById('webbook-top-toolbar')?.prepend(indicator);
    section.append(heading, library, status, storage, progressLabel, progress, count, controls, confirmation); const title = panel.querySelector('h2'); if (title) title.after(section); else panel.prepend(section);
    let registration, snapshot = null, savedRecord = false, pending = false, busy = false, remoteBusy = false, controller, prepared = null, persistent = null, operationVersion = 0;
    let serverReachable = null, probing = false;
    const available = window.isSecureContext && Boolean(typeof window.Worker === 'function' && navigator.serviceWorker && window.caches && window.indexedDB && window.crypto?.subtle);
    const button = (id, label, run) => { const node = document.createElement('button'); node.type = 'button'; node.id = 'webbook-offline-' + id; node.textContent = label; node.addEventListener('click', () => Promise.resolve().then(run).catch(fail)); controls.append(node); return node; };
    const save = button('save', 'Save for offline reading', download);
    const inspect = button('size', 'Find download size', findSize);
    const cancel = button('cancel', 'Cancel download', async () => { controller?.abort(); if (registration?.active) await offlineCommand(registration.active, 'cancel'); });
    const check = button('check', 'Check for updates', checkUpdates);
    const update = button('update', 'Refresh saved copy', download);
    const use = button('use', 'Use update and reload', async () => {
        const reload = prepareReload('Saved book updated', 'webbook-offline-heading', 'webbook-info');
        try { await command('activate'); document.querySelector('audio')?.pause(); reload(); }
        catch (error) { clearReturnState(); await refresh().catch(() => {}); (pending ? use : snapshot ? update : save).focus(); throw error; }
    });
    const remove = button('remove', 'Remove saved book', () => { confirmation.hidden = false; no.focus(); });
    const no = document.createElement('button'); no.type = 'button'; no.textContent = 'Cancel'; no.addEventListener('click', () => { confirmation.hidden = true; remove.focus(); });
    const yes = document.createElement('button'); yes.type = 'button'; yes.id = 'webbook-offline-remove-confirm'; yes.textContent = 'Yes, remove saved book';
    yes.addEventListener('click', async () => {
        operationVersion++; busy = true; render();
        try { await command('remove'); confirmation.hidden = true; prepared = null; await refresh(); report('Saved book removed. Settings and reading positions kept.'); }
        catch (error) { fail(error); }
        finally { busy = false; render(); (savedRecord ? remove : save).focus(); }
    });
    confirmation.append(question, no, yes);
    function open() { document.getElementById('webbook-info')?.showPopover?.(); heading.focus({ preventScroll: true }); heading.scrollIntoView({ block: 'start' }); }
    function report(message) { if (status.textContent !== message) status.textContent = message; }
    function fail(error) { if (error.name === 'AbortError') report('Download canceled.'); else report(error.message || 'Offline reading is unavailable.'); }
    function render() {
        const operating = busy || remoteBusy, focused = document.activeElement;
        indicator.hidden = serverReachable !== false;
        indicator.setAttribute('aria-label', `Book server unavailable. ${snapshot ? 'Reading the saved copy.' : "This book isn't saved."} Open offline reading.`);
        save.hidden = Boolean(snapshot) || pending; inspect.hidden = Boolean(snapshot) || pending; check.hidden = update.hidden = !snapshot || pending; use.hidden = !pending; remove.hidden = !savedRecord && !pending; cancel.hidden = !operating;
        for (const control of [save, inspect, check, update, use, remove]) control.disabled = operating || !available;
        progress.hidden = progressLabel.hidden = count.hidden = !operating;
        yes.disabled = operating;
        if (operating && [save, inspect, check, update, use, remove].includes(focused)) cancel.focus({ preventScroll: true });
        else if (!operating && focused === cancel) (snapshot ? check : save).focus({ preventScroll: true });
    }
    async function ensure() {
        if (!registration) {
            const existing = await navigator.serviceWorker.getRegistration(root);
            // importScripts has no integrity parameter. Keep executable workers
            // local rather than importing unchecked channel code.
            const expected = workerScriptURL(root);
            registration = existing?.scope === root && existing.active && existing.active.scriptURL === expected
                ? existing : await registerOfflineWorker(root);
        }
        return registration;
    }
    async function command(name, data, onProgress, signal) { await ensure(); return offlineCommand(registration.active, name, data, onProgress, signal); }
    async function refresh() {
        if (!available) { report('Offline reading is unavailable here. Use HTTPS or localhost with browser storage enabled.'); render(); return; }
        const version = operationVersion;
        const result = await command('status');
        if (version !== operationVersion) return;
        savedRecord = Boolean(result.saved); snapshot = result.complete && !result.recovering ? result.saved : null; pending = Boolean(result.pending); remoteBusy = result.busy && !busy;
        if (busy) { render(); return; }
        if (result.recovering) report('This is an online recovery copy. Save the book again, then use the update and reload to restore offline reading.');
        else if (result.saved && !result.complete) report('This saved copy is incomplete. Reconnect and save it again.');
        else if (busy || remoteBusy) report('A book download is in progress in this tab or another tab.');
        else if (result.pendingIncomplete) report('The downloaded update is incomplete. Refresh the saved copy to download it again; your working copy is kept.');
        else if (pending) report('Update ready. Use the update and reload when you are ready.');
        else if (serverReachable === false) report(`Book server unavailable. ${snapshot ? 'You are reading the saved copy.' : "This book isn't saved for offline reading."}`);
        else report(snapshot ? `Saved for offline reading, ${bytesText(snapshot.bytes)}.` : 'This book is not saved for offline reading.');
        render();
    }
    async function estimate() {
        try {
            const result = await navigator.storage?.estimate?.();
            storage.textContent = result && Number.isFinite(result.quota) && Number.isFinite(result.usage) ? `This website uses about ${bytesText(result.usage || 0)}; up to ${bytesText(Math.max(0, result.quota - result.usage))} may be available.` : '';
            if (persistent === false) storage.textContent += ' Your browser may remove saved books to free storage.';
        } catch { storage.textContent = 'Available storage is unknown.'; }
    }
    async function discover() {
        controller = new AbortController(); report('Finding book files… Keep this tab open.'); progress.removeAttribute('value');
        const list = await discoverBook(root, { signal: controller.signal, onProgress: total => { count.textContent = `${total} files found.`; } });
        return includeSelectedUI(root, list, { initial: !snapshot, signal: controller.signal });
    }
    async function findSize() {
        operationVersion++; busy = true; render();
        try { prepared = await discover(); report(`${prepared.sizeKnown ? 'Download size: ' : 'Download size: at least '}${bytesText(prepared.bytes)}${prepared.sizeKnown ? '.' : '; some file sizes are unknown.'} Choose Save for offline reading to download the book.`); await estimate(); }
        finally { busy = false; render(); save.focus(); }
    }
    function downloadProgress(detail) {
        progress.max = detail.total; progress.value = detail.done;
        count.textContent = detail.phase === 'verifying' ? 'Checking downloaded files…'
            : `${Math.floor(detail.done / detail.total * 100)}% — ${detail.done} of ${detail.total} files; ${bytesText(detail.bytes)} downloaded.`;
    }
    async function download() {
        if (busy || remoteBusy) return;
        operationVersion++; busy = true; render(); report('Preparing the download…');
        try {
            await ensure();
            try { persistent = Boolean(await navigator.storage?.persisted?.() || await navigator.storage?.persist?.()); } catch { persistent = false; }
            const list = prepared || await discover(); prepared = null;
            report('Saving book… Keep this tab open.'); count.textContent = ''; progress.max = list.files.length; progress.value = 0;
            const result = await command('save', list, downloadProgress, controller?.signal);
            await refresh(); report(pending ? 'Update ready. Your current saved copy is unchanged until you choose Use update and reload.' : snapshot ? result.ready ? 'The downloaded update is unavailable. Your previous saved copy is kept; refresh to retry.' : `Saved for offline reading, ${bytesText(snapshot.bytes)}.` : 'The saved copy is unavailable. Save the book again.'); await estimate();
        } catch (error) { await refresh().catch(() => {}); fail(error); }
        finally { busy = false; controller = null; render(); (pending ? use : snapshot ? check : save).focus(); }
    }
    async function checkUpdates() {
        operationVersion++; busy = true; render();
        try {
            const fresh = await discover(); const comparison = compareInventory(snapshot, fresh); prepared = fresh;
            report(comparison.changed ? 'An update is available. Choose Update saved book to download it.' : comparison.reliable ? 'No changes detected.' : 'No changes detected, but this host cannot provide a reliable version check. You can refresh the saved copy.');
            update.textContent = comparison.changed ? 'Update saved book' : 'Refresh saved copy';
        } finally { busy = false; render(); check.focus(); }
    }
    for (const [id, label, control] of [['save-offline', 'Save book for offline reading', save], ['cancel-offline', 'Cancel offline download', cancel], ['check-offline', 'Check saved book for updates', check], ['update-offline', 'Update saved book', update], ['use-offline-update', 'Use saved book update and reload', use], ['remove-offline', 'Remove saved book', remove]]) {
        registerAction({ id, label, group: 'Offline reading', isAvailable: () => !control.hidden && !control.disabled, run: () => { open(); control.click(); } });
    }
    registerAction({ id: 'open-offline', label: 'Offline reading', group: 'Panels', isAvailable: () => typeof document.getElementById('webbook-info')?.showPopover === 'function', run: open });
    document.getElementById('webbook-info')?.addEventListener('beforetoggle', event => { if (event.newState === 'open' && !busy) refresh().then(estimate).catch(fail); });
    navigator.serviceWorker?.addEventListener('message', event => {
        if (event.data?.webbookOffline !== 1) return;
        if (event.data.changed && !busy) refresh().catch(fail);
        if (event.data.incomplete) { snapshot = null; report('This saved copy is incomplete. Reconnect and save it again.'); render(); }
        if (event.data.progress && !busy) { remoteBusy = true; downloadProgress(event.data.progress); report('A book download is in progress in another tab.'); render(); }
    });
    async function checkServer() {
        if (probing || document.visibilityState === 'hidden') return;
        probing = true;
        try {
            const reachable = await bookServerReachable(new URL('index.html', root));
            const previous = serverReachable; serverReachable = reachable;
            render();
            if (previous !== reachable) {
                if (!busy) await refresh().catch(() => {});
                if (!status.getClientRects().length && (previous !== null || !reachable)) announceReaderAction(reachable ? 'Book server available.' : 'Book server unavailable. Open About for saved-book status.', reachable ? {} : { action: { label: 'About', run: open } });
            }
        } finally { probing = false; }
    }
    for (const name of ['online', 'offline', 'focus']) window.addEventListener(name, checkServer);
    document.addEventListener('visibilitychange', checkServer);
    report(available ? 'Save this book to read and listen without a connection.' : 'Offline reading is unavailable here. Use HTTPS or localhost with browser storage enabled.'); render();
    if (available) { checkServer(); window.setInterval(checkServer, 30000); }
    if (available && navigator.serviceWorker.controller) refresh().catch(fail);
}
