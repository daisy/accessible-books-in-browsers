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
    // Why this page doesn't use the channel's release, for the console and About (testers need to
    // be able to say why their book didn't update). The first reason found is the one that counts.
    let reason = null;
    const because = (text) => { reason ??= text; };
    const say = (level, text) => { try { console[level](text); } catch {} };
    const described = (error, what) =>
        error?.webbookReason ||
        (error?.name === 'TimeoutError' || error?.name === 'AbortError' ? `${what} took too long to arrive`
            : error instanceof TypeError ? `${what} couldn't be downloaded`
            : `${what} failed (${error?.message || error})`);
    const reasonError = (text) => Object.assign(new Error(text), { webbookReason: text });
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
    // In the background (a remembered current.json is in use), a failure doesn't change this page
    async function fetchManifest(background = false) {
        const controller = new AbortController(),
            timer = setTimeout(() => controller.abort(), 1500);
        try {
            let response, data;
            try {
                response = await fetch(new URL('current.json', channel), {
                    signal: controller.signal,
                    credentials: 'omit',
                    cache: 'no-cache',
                    referrerPolicy: 'no-referrer',
                });
            } catch (error) {
                throw reasonError(error?.name === 'AbortError' ? "the update channel didn't answer within 1.5 s" : "the update channel couldn't be reached");
            }
            if (!response.ok) throw reasonError(`the update channel answered ${response.status}`);
            try { data = await response.json(); } catch { throw reasonError("the update channel's current.json isn't valid"); }
            let selection;
            try { selection = validate(data); } catch (error) { throw reasonError(`the update channel's current release isn't compatible (${error.message})`); }
            write(localStorageSafe, key + ':manifest', JSON.stringify(data));
            if (selection.local) because('the update channel has updates switched off for now');
            return selection;
        } catch (error) {
            if (!background) because(described(error, "the update channel's current.json"));
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
        const forceLocal = read(sessionStorageSafe, key + ':force-local') || entryURL.searchParams.get('webbook-ui-fallback') === 'local';
        const decision = selectionDecision({ channel, override, saved, cached, local, forceLocal });
        if (override === 'local') because("you chose this book's own reader");
        else if (forceLocal) because('a reader release failed to start in this tab');
        else if (saved && !decision.version) because(saved.unknown ? "the saved copy didn't say which reader it has" : "the saved copy has this book's own reader");
        try {
            selected = decision.version ? releaseSelection(decision.version, policy) : decision.fetch ? await fetchManifest() : decision.selected;
            if (decision.saved) savedFiles = decision.files;
            if (decision.refresh) fetchManifest(true);
        } catch (error) {
            because(described(error, 'the chosen reader release'));
            selected = local;
        }
    }
    const bad = read(localStorageSafe, key + ':bad:' + selected.version) || read(sessionStorageSafe, key + ':bad:' + selected.version);
    if (!selected.local && bad) because(`reader release ${selected.version} failed to start before, so it's skipped`);
    selected = finalSelection(selected, {local, bad, forceLocal:read(sessionStorageSafe, key + ':force-local') || entryURL.searchParams.get('webbook-ui-fallback') === 'local'});
    async function load(selection) {
        if (!selection.local) {
            let inventory;
            if (savedFiles) inventory = {version:1, contract, files:savedFiles};
            else {
                const what = `reader release ${selection.version}'s file list`;
                try {
                    const response = await fetch(selection.inventory, {mode:'cors', credentials:'omit', referrerPolicy:'no-referrer', signal:AbortSignal.timeout(5000)});
                    if (!response.ok) throw reasonError(`${what} answered ${response.status}`);
                    inventory = await response.json();
                } catch (error) { throw reasonError(described(error, what)); }
            }
            try { selection = verifyInventory(selection, inventory); }
            catch (error) { throw reasonError(`reader release ${selection.version} failed its checks (${error.message})`); }
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
                    const timer = setTimeout(() => reject(reasonError(`reader release ${selection.version}'s stylesheet took longer than 5 s`)), 5000);
                    remoteLink.onload = () => {
                        clearTimeout(timer);
                        resolve();
                    };
                    remoteLink.onerror = () => {
                        clearTimeout(timer);
                        reject(reasonError(`reader release ${selection.version}'s stylesheet couldn't be downloaded, or didn't match its checksum`));
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
                const what = `reader release ${selection.version}'s script`;
                let bytes;
                try {
                    const response = await fetch(selection.script, {
                        mode: 'cors',
                        credentials: 'omit',
                        referrerPolicy: 'no-referrer',
                        signal: AbortSignal.timeout(5000),
                    });
                    if (!response.ok) throw reasonError(`${what} answered ${response.status}`);
                    bytes = await response.arrayBuffer();
                } catch (error) { throw reasonError(described(error, what)); }
                const digest = await crypto.subtle.digest('SHA-256', bytes);
                const integrity = 'sha256-' + btoa(String.fromCharCode(...new Uint8Array(digest)));
                if (integrity !== selection.integrity.script)
                    throw reasonError(`${what} doesn't match its checksum`);
                scriptURL = URL.createObjectURL(new Blob([bytes], { type: 'text/javascript' }));
                revoke = scriptURL;
            }
            module = selection.local
                ? await importLocal(scriptURL)
                : await Promise.race([
                    import(scriptURL).catch((error) => {
                        throw reasonError(`reader release ${selection.version}'s script couldn't be started (${error.message}; the site's security policy may block it)`);
                    }),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(reasonError(`reader release ${selection.version}'s script took longer than 5 s to start`)), 5000),
                    ),
                ]);
            if (typeof module.init !== 'function') throw reasonError(`${selection.local ? "this book's own reader" : `reader release ${selection.version}`} has no init()`);
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
        // For About (reader-updates.js), and for testers in the console
        window.webbookUIStatus = { channel: channel || null, version: selection.local ? null : selection.version, reason: selection.local ? reason : null };
        if (channel && selection.local) say(override === 'local' ? 'info' : 'warn', `Reader updates: using this book's own reader, because ${reason || 'of an unknown problem'}.`);
        else if (channel) say('info', `Reader updates: using reader release ${selection.version}.`);
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
            say('info', "Reader: still arriving after 5 s, so the plain page shows until it's here.");
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
    async function failLocal(error) {
        say('warn', `Reader: this book's own reader couldn't start (${error?.webbookReason || error?.message || error}), so this tab shows the plain page.`);
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
        if (error.webbookStalled) {
            say('warn', "Reader: this book's own reader stopped arriving, so this page shows the plain page.");
            return baseline();
        }
        const failure = failureDecision(selected.local, error.webbookStartup);
        if (failure === 'reload-local') {
            say('warn', `Reader updates: reader release ${selected.version} failed to start (${error?.message || error}); reloading with this book's own reader.`);
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
            because(described(error, `reader release ${selected.version}`));
            try {
                await load(local);
            } catch (localError) {
                if (localError.webbookStalled) {
                    say('warn', "Reader: this book's own reader stopped arriving, so this page shows the plain page.");
                    baseline();
                } else await failLocal(localError);
            }
        } else await failLocal(error);
    }
})();
