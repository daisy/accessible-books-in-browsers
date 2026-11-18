/* Frozen bootstrap API 1. Inline in generated content pages; keep dependencies local. */
(async () => {
    if (window.webbookBootstrapStarted) return;
    window.webbookBootstrapStarted = true;
    const root = document.documentElement,
        contract = Number(root.dataset.webbookContract);
    const book = new URL('./', location.href),
        channelValue = document.querySelector('meta[name="webbook-ui-channel"]')?.content;
    const key = 'webbook-ui:' + book.href,
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
    }
    if (
        ((read(sessionStorageSafe, baselineKey) || entryURL.searchParams.get('webbook-baseline') === '1') &&
            entryURL.searchParams.get('webbook-ui') !== 'auto') ||
        location.protocol === 'file:'
    ) {
        baseline();
        return;
    }
    root.classList.add('webbook-js');
    if (document.readyState === 'loading')
        await new Promise((resolve) =>
            document.addEventListener('DOMContentLoaded', resolve, { once: true }),
        );
    let channel;
    try {
        channel = new URL(channelValue);
        if (
            !(
                channel.protocol === 'https:' ||
                (channel.protocol === 'http:' &&
                    ['localhost', '127.0.0.1', '[::1]'].includes(channel.hostname))
            ) ||
            !channel.pathname.endsWith('/')
        )
            channel = null;
    } catch {}
    const versionOK = (value) => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/.test(value);
    function validate(data) {
        if (!data || data.contract !== contract) throw new Error('Wrong UI contract');
        if (data.useLocal === true) return local;
        if (data.protocol !== undefined && data.protocol !== 1)
            throw new Error('Incompatible offline protocol');
        if (
            !versionOK(data.version) ||
            !Number.isInteger(data.minBootstrap) ||
            data.minBootstrap > 1 ||
            data.minBootstrap < 1
        )
            throw new Error('Incompatible release');
        const base = new URL('releases/' + data.version + '/', channel);
        const file = (value, fallback) => {
            const url = new URL(value || fallback, channel);
            if (
                url.origin !== base.origin ||
                !url.href.startsWith(base.href) ||
                /[\\\u0000]|(?:^|\/)\.\.(?:\/|$)/.test(decodeURIComponent(url.pathname)) ||
                url.search ||
                url.hash
            )
                throw new Error('Invalid release path');
            return url.href;
        };
        return {
            contract,
            version: data.version,
            channel: channel.href,
            script: file(data.script),
            stylesheet: file(data.stylesheet),
            inventory: file(data.inventory || 'releases/' + data.version + '/ui-files.json'),
            worker: data.worker ? file(data.worker) : null,
            protocol: data.protocol || 1,
            integrity: data.integrity,
        };
    }
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
    if (
        ['local', 'remote', 'auto'].includes(parameter) ||
        (parameter?.startsWith('release:') && versionOK(parameter.slice(8)))
    ) {
        if (parameter === 'auto') {
            write(localStorageSafe, key + ':override', null);
            write(sessionStorageSafe, key + ':override', null);
            override = null;
        } else {
            override = parameter;
            write(sessionStorageSafe, key + ':override', parameter === 'local' ? null : parameter);
            write(localStorageSafe, key + ':override', parameter === 'local' ? parameter : null);
        }
        url.searchParams.delete('webbook-ui');
        try {
            history.replaceState(history.state, '', url);
        } catch {}
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
    let selected = local;
    if (channel && override !== 'local') {
        const saved = await savedUI();
        if (saved && override !== 'remote' && !override?.startsWith('release:')) {
            if (saved.remote?.channel === channel.href) {
                const version = saved.remote.version;
                try {
                    selected = validate({
                        contract,
                        version,
                        minBootstrap: 1,
                        script: 'releases/' + version + '/main.js',
                        stylesheet: 'releases/' + version + '/style.css',
                        inventory: 'releases/' + version + '/ui-files.json',
                        worker: 'releases/' + version + '/offline-worker.js',
                        protocol: saved.protocol,
                    });
                } catch {}
            }
        } else if (override?.startsWith('release:')) {
            const version = override.slice(8);
            try {
                selected = validate({
                    contract,
                    version,
                    minBootstrap: 1,
                    script: 'releases/' + version + '/main.js',
                    stylesheet: 'releases/' + version + '/style.css',
                    inventory: 'releases/' + version + '/ui-files.json',
                    worker: 'releases/' + version + '/offline-worker.js',
                });
            } catch {}
        } else {
            let cached;
            try {
                cached = validate(JSON.parse(read(localStorageSafe, key + ':manifest')));
            } catch {}
            if (cached && override !== 'remote') {
                selected = cached;
                fetchManifest();
            } else selected = await fetchManifest();
        }
    }
    if (
        !selected.local &&
        (read(localStorageSafe, key + ':bad:' + selected.version) ||
            read(sessionStorageSafe, key + ':bad:' + selected.version))
    )
        selected = local;
    if (
        read(sessionStorageSafe, key + ':force-local') ||
        entryURL.searchParams.get('webbook-ui-fallback') === 'local'
    )
        selected = local;
    async function load(selection) {
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
            if (selection.integrity?.stylesheet) remoteLink.integrity = selection.integrity.stylesheet;
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
            if (selection.integrity?.script) {
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
            module = await Promise.race([
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
        if (!selected.local && error.webbookStartup) {
            write(localStorageSafe, key + ':bad:' + selected.version, '1');
            write(sessionStorageSafe, key + ':bad:' + selected.version, '1');
            write(sessionStorageSafe, key + ':force-local', '1');
            if (read(sessionStorageSafe, key + ':force-local')) location.reload();
            else {
                const target = new URL(location.href);
                target.searchParams.set('webbook-ui-fallback', 'local');
                location.replace(target);
            }
        } else if (!selected.local) {
            try {
                await load(local);
            } catch {
                await failLocal();
            }
        } else await failLocal();
    }
})();
