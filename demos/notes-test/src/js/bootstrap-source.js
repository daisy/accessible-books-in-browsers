import { uiKey, validChannel, baselineDecision, finalSelection, overrideDecision, validateManifest, releaseSelection, selectionDecision, verifyInventory, failureDecision } from './bootstrap-policy.js';
/* Frozen bootstrap API 1. Inline in generated content pages; keep dependencies local. */
(async () => {
    if (window.webbookBootstrapStarted) return;
    window.webbookBootstrapStarted = true;
    const root = document.documentElement,
        contract = Number(root.dataset.webbookContract);
    const book = new URL('./', location.href),
        channelValue = document.querySelector('meta[name="webbook-ui-channel"]')?.content;
    const key = uiKey(book.href),
        baselineKey = key + ':baseline';
    const read = (store, name) => {
        try {
            return store.getItem(name);
        } catch {
            return null;
        }
    };
    const write = (store, name, value) => {
        try {
            if (value === null) store.removeItem(name);
            else store.setItem(name, value);
        } catch {}
    };
    let localStorageSafe, sessionStorageSafe;
    try {
        localStorageSafe = localStorage;
    } catch {}
    try {
        sessionStorageSafe = sessionStorage;
    } catch {}
    const local = {
        script: new URL('src/js/main.js', book).href,
        stylesheet: new URL('src/css/style.css', book).href,
        local: true,
    };
    const baseline = () => {
        root.classList.remove('webbook-js');
        root.dataset.webbookUi = 'baseline';
    };
    const entryURL = new URL(location.href);
    if (entryURL.searchParams.get('webbook-ui') === 'auto') {
        write(sessionStorageSafe, baselineKey, null);
        write(sessionStorageSafe, key + ':force-local', null);
        entryURL.searchParams.delete('webbook-ui-fallback');
        entryURL.searchParams.delete('webbook-baseline');
    }
    if (baselineDecision({ failed:read(sessionStorageSafe, baselineKey), urlBaseline:entryURL.searchParams.get('webbook-baseline') === '1', auto:entryURL.searchParams.get('webbook-ui') === 'auto', file:location.protocol === 'file:' })) {
        baseline();
        return;
    }
    root.classList.add('webbook-js');
    if (document.readyState === 'loading')
        await new Promise((resolve) =>
            document.addEventListener('DOMContentLoaded', resolve, { once: true }),
        );
    const channel = validChannel(channelValue);
    const policy = { contract, channel, local };
    const validate = data => validateManifest(data, policy);
    async function fetchManifest() {
        const controller = new AbortController(),
            timer = setTimeout(() => controller.abort(), 1500);
        try {
            const response = await fetch(new URL('current.json', channel), {
                signal: controller.signal,
                credentials: 'omit',
                cache: 'no-cache',
                referrerPolicy: 'no-referrer',
            });
            if (!response.ok) throw new Error('Channel unavailable');
            const data = await response.json();
            validate(data);
            write(localStorageSafe, key + ':manifest', JSON.stringify(data));
            return validate(data);
        } catch {
            return local;
        } finally {
            clearTimeout(timer);
        }
    }
    let override = read(sessionStorageSafe, key + ':override') || read(localStorageSafe, key + ':override');
    const url = new URL(location.href),
        parameter = url.searchParams.get('webbook-ui');
    const overrideChange = overrideDecision(parameter, override);
    if (overrideChange.changed) {
        override = overrideChange.value;
        write(localStorageSafe, key + ':override', overrideChange.persistent ? override : null);
        write(sessionStorageSafe, key + ':override', overrideChange.persistent ? null : override);
        url.searchParams.delete('webbook-ui');
        if (parameter === 'auto') { url.searchParams.delete('webbook-ui-fallback'); url.searchParams.delete('webbook-baseline'); }
        try { history.replaceState(history.state, '', url); } catch {}
    }
    async function savedUI() {
        const worker = navigator.serviceWorker?.controller;
        if (!worker) return null;
        const ask = (command) =>
            new Promise((resolve) => {
                const pipe = new MessageChannel(),
                    timer = setTimeout(() => {
                        pipe.port1.close();
                        resolve({ unknown: true });
                    }, 1500);
                pipe.port1.onmessage = (event) => {
                    clearTimeout(timer);
                    pipe.port1.close();
                    resolve(event.data);
                };
                try {
                    worker.postMessage({ webbookOffline: 1, protocol: 1, command }, [pipe.port2]);
                } catch {
                    clearTimeout(timer);
                    pipe.port1.close();
                    resolve({ unknown: true });
                }
            });
        let reply = await ask('saved-ui');
        if (reply.error) reply = await ask('status');
        if (reply.unknown || reply.error) return { unknown: true };
        const value = reply.result;
        if (value && 'ui' in value) return value.recovering ? null : value.ui;
        if (value?.recovering) return null;
        return value?.complete ? value.saved?.ui || null : value?.saved ? { unknown: true } : null;
    }
    let selected = local, savedFiles;
    if (channel) {
        const saved = override === 'local' ? null : await savedUI();
        let cached;
        try { cached = validate(JSON.parse(read(localStorageSafe, key + ':manifest'))); } catch {}
        const decision = selectionDecision({ channel, override, saved, cached, local,
            forceLocal: read(sessionStorageSafe, key + ':force-local') || entryURL.searchParams.get('webbook-ui-fallback') === 'local' });
        try {
            selected = decision.version ? releaseSelection(decision.version, policy) : decision.fetch ? await fetchManifest() : decision.selected;
            if (decision.saved) savedFiles = decision.files;
            if (decision.refresh) fetchManifest();
        } catch { selected = local; }
    }
    selected = finalSelection(selected, {local, bad:read(localStorageSafe, key + ':bad:' + selected.version) || read(sessionStorageSafe, key + ':bad:' + selected.version), forceLocal:read(sessionStorageSafe, key + ':force-local') || entryURL.searchParams.get('webbook-ui-fallback') === 'local'});
    async function load(selection) {
        if (!selection.local) {
            let inventory;
            if (savedFiles) inventory = {version:1, contract, files:savedFiles};
            else {
                const response = await fetch(selection.inventory, {mode:'cors', credentials:'omit', referrerPolicy:'no-referrer', signal:AbortSignal.timeout(5000)});
                if (!response.ok) throw new Error('Release integrity inventory unavailable');
                inventory = await response.json();
            }
            selection = verifyInventory(selection, inventory);
        }
        const localLink = document.querySelector('link[data-webbook-local-style]');
        let remoteLink;
        if (!selection.local) {
            remoteLink = document.createElement('link');
            remoteLink.rel = 'stylesheet';
            remoteLink.href = selection.stylesheet;
            remoteLink.crossOrigin = 'anonymous';
            remoteLink.referrerPolicy = 'no-referrer';
            remoteLink.dataset.webbookUiStyle = '';
            remoteLink.media = 'not all';
            remoteLink.integrity = selection.integrity.stylesheet;
            try {
                await new Promise((resolve, reject) => {
                    const timer = setTimeout(() => reject(new Error('Stylesheet timeout')), 5000);
                    remoteLink.onload = () => {
                        clearTimeout(timer);
                        resolve();
                    };
                    remoteLink.onerror = () => {
                        clearTimeout(timer);
                        reject(new Error('Stylesheet unavailable'));
                    };
                    document.head.append(remoteLink);
                });
            } catch (error) {
                remoteLink.remove();
                throw error;
            }
        }
        let module;
        let scriptURL = selection.script,
            revoke;
        try {
            if (!selection.local) {
                const response = await fetch(selection.script, {
                    mode: 'cors',
                    credentials: 'omit',
                    referrerPolicy: 'no-referrer',
                    signal: AbortSignal.timeout(5000),
                });
                if (!response.ok) throw new Error('Reader unavailable');
                const bytes = await response.arrayBuffer(),
                    digest = await crypto.subtle.digest('SHA-256', bytes);
                const integrity = 'sha256-' + btoa(String.fromCharCode(...new Uint8Array(digest)));
                if (integrity !== selection.integrity.script)
                    throw new Error('Reader integrity check failed');
                scriptURL = URL.createObjectURL(new Blob([bytes], { type: 'text/javascript' }));
                revoke = scriptURL;
            }
            module = selection.local
                ? await importLocal(scriptURL)
                : await Promise.race([
                    import(scriptURL),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Reader download timeout')), 5000),
                    ),
                ]);
            if (typeof module.init !== 'function') throw new Error('Missing reader init');
        } catch (error) {
            remoteLink?.remove();
            throw error;
        } finally {
            if (revoke) URL.revokeObjectURL(revoke);
        }
        if (remoteLink) remoteLink.media = 'all';
        if (localLink) localLink.disabled = !selection.local;
        window.webbookUI = selection;
        root.dataset.webbookUi = selection.local ? 'local' : selection.version;
        let startupTimer;
        try {
            await Promise.race([
                module.init(),
                new Promise((_, reject) => {
                    startupTimer = setTimeout(() => reject(new Error('Reader startup timeout')), 10000);
                }),
            ]);
            write(sessionStorageSafe, key + ':force-local', null);
        } catch (error) {
            error.webbookStartup = true;
            throw error;
        } finally {
            clearTimeout(startupTimer);
        }
    }
    // The book's own reader has nothing to fall back to but the plain page, so being slow isn't a
    // failure: on a slow connection the plain page (with its links and audio controls) shows after
    // 5 s, and the reader takes over when it arrives. Only a download that stalls completely gives
    // up, and then just for this page; errors (a missing file, broken code) still reject at once.
    async function importLocal(href) {
        const importing = import(href);
        let waiting = false, giveUp;
        const slow = setTimeout(() => {
            waiting = true;
            baseline();
        }, 5000);
        try {
            const module = await Promise.race([
                importing,
                new Promise((_, reject) => {
                    giveUp = setTimeout(() => reject(Object.assign(new Error('Reader download stalled'), { webbookStalled: true })), 120000);
                }),
            ]);
            if (waiting) root.classList.add('webbook-js');
            return module;
        } finally {
            clearTimeout(slow);
            clearTimeout(giveUp);
        }
    }
    async function failLocal() {
        write(sessionStorageSafe, baselineKey, '1');
        // Only reload when the flag can be read back; blocked storage must not loop.
        if (read(sessionStorageSafe, baselineKey)) location.reload();
        else {
            const target = new URL(location.href);
            target.searchParams.set('webbook-baseline', '1');
            location.replace(target);
        }
    }
    try {
        await load(selected);
    } catch (error) {
        if (error.webbookStalled) return baseline();
        const failure = failureDecision(selected.local, error.webbookStartup);
        if (failure === 'reload-local') {
            write(localStorageSafe, key + ':bad:' + selected.version, '1');
            write(sessionStorageSafe, key + ':bad:' + selected.version, '1');
            write(sessionStorageSafe, key + ':force-local', '1');
            if (read(sessionStorageSafe, key + ':force-local')) location.reload();
            else {
                const target = new URL(location.href);
                target.searchParams.set('webbook-ui-fallback', 'local');
                location.replace(target);
            }
        } else if (failure === 'local') {
            try {
                await load(local);
            } catch (localError) {
                if (localError.webbookStalled) baseline();
                else await failLocal();
            }
        } else await failLocal();
    }
})();
