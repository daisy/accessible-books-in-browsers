// Page-owned worker: long downloads are not tied to a service-worker event's time budget.
self.addEventListener('message', function initialize(event) {
    const data = event.data;
    if (data?.webbookDownload !== 1) return;
    self.removeEventListener('message', initialize);
    try {
        const scope = new URL('../../', self.location.href).href;
        if (data.scope !== scope || typeof data.cache !== 'string' || !data.cache.startsWith('webbook-offline-1-') || typeof data.owner !== 'string') throw new Error('Invalid download owner.');
        if (data.remote) {
            const base = new URL(data.remote.channel), worker = new URL(data.remote.worker);
            if (!(base.protocol === 'https:' || base.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(base.hostname))
                || worker.origin !== base.origin || !worker.pathname.startsWith(base.pathname)
                || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,99}\/offline-worker\.js$/.test(worker.pathname.slice(base.pathname.length)) || /(?:^|\/)\.\.(?:\/|$)|[\\\u0000]/.test(decodeURIComponent(worker.pathname))) throw new Error('Invalid worker release.');
            try { importScripts(worker.href); } catch { delete self.WebbookOfflineWorker; delete self.WebbookOfflineRange; delete self.WebbookOfflineFetch; }
        }
        if (!self.WebbookOfflineWorker) importScripts(new URL('src/js/offline-worker-core.js', scope).href);
        if (self.WebbookOfflineWorker.protocol !== 1) throw new Error('Incompatible download worker.');
        self.WebbookOfflineWorker.start({ scope, foreground: { cache: data.cache, owner: data.owner } });
        self.postMessage({ ready: true });
    } catch (error) { self.postMessage({ error: error.message }); }
});
