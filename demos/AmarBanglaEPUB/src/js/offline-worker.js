// The root sw.js stays fixed. All imports occur during initial worker evaluation.
(() => {
    const root = self.registration.scope, query = new URL(self.location.href).searchParams;
    const worker = query.get('webbook-worker'), channel = query.get('webbook-channel');
    if (worker || channel) {
        const base = new URL(channel), release = new URL(worker);
        if (!(base.protocol === 'https:' || base.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(base.hostname))
            || /(?:^|\/)\.\.(?:\/|$)|[\\\u0000]/.test(decodeURIComponent(release.pathname)) || !base.pathname.endsWith('/') || release.origin !== base.origin || !release.pathname.startsWith(base.pathname)
            || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,99}\/offline-worker\.js$/.test(release.pathname.slice(base.pathname.length)) || release.search || release.hash) throw new Error('Invalid worker release.');
        try { importScripts(release.href); if (self.WebbookOfflineWorker) self.WebbookOfflineCoreSource = release.href; } catch {
            // Release bundles export factories only; no handlers have been attached yet.
            delete self.WebbookOfflineWorker; delete self.WebbookOfflineRange; delete self.WebbookOfflineFetch; delete self.WebbookOfflineCoreSource;
        }
    }
    if (!self.WebbookOfflineWorker) importScripts(new URL('src/js/offline-worker-core.js', root).href);
    if (self.WebbookOfflineWorker.protocol !== 1 || typeof self.WebbookOfflineWorker.start !== 'function') throw new Error('Incompatible offline worker.');
    self.WebbookOfflineWorker.start();
})();
