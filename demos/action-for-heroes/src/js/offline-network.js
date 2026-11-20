// Mutable local files must bypass the saved snapshot, including from a page-owned worker.
self.WebbookOfflineFetch = async function(url, { scope, foreground = false, signal, method = 'GET' }) {
    const target = new URL(url), root = new URL(scope);
    const local = target.origin === root.origin && target.pathname.startsWith(root.pathname);
    const timeout = new AbortController(), timer = setTimeout(() => timeout.abort(), 45000);
    try {
        return await fetch(url, { method, headers: foreground && local ? { 'X-Webbook-Offline-Network': '1' } : undefined,
            signal: AbortSignal.any([signal, timeout.signal].filter(Boolean)), cache: 'no-store',
            // A reader release can sit behind a stable URL that redirects to where its files live;
            // its files are checked against the release inventory's hashes, wherever they came from
            credentials: local ? 'same-origin' : 'omit', redirect: local ? 'error' : 'follow' });
    } finally { clearTimeout(timer); }
};
