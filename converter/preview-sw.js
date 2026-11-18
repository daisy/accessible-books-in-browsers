// Serves the chapter preview (preview.js) from its temporary store, including the byte ranges
// audio seeking needs. A preview exists only in this browser, so it can't be served from the
// network; this worker's scope is the preview's folder only.
const CACHE = 'webbook-preview-1';
const ROOT = self.registration.scope;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', event => {
    if (!['GET', 'HEAD'].includes(event.request.method) || !event.request.url.startsWith(ROOT)) return;
    event.respondWith(serve(event.request));
});

async function serve(request) {
    const url = new URL(request.url);
    url.search = ''; url.hash = '';
    if (url.pathname.endsWith('/')) url.pathname += 'index.html';
    const cache = await caches.open(CACHE);
    const response = await cache.match(url.href);
    if (!response) {
        return new Response('<!doctype html><html lang="en"><meta charset="utf-8"><title>No preview</title><main><h1>No preview here</h1><p>Previews last until the next one, in the browser that made them. Make one on the converter page.</p></main></html>',
            { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }
    const range = request.headers.get('Range');
    if (!range && request.method === 'GET') return response;
    const body = await response.blob(), size = body.size;
    const headers = new Headers(response.headers);
    headers.set('Accept-Ranges', 'bytes');
    if (!range) { headers.set('Content-Length', String(size)); return new Response(null, { status: 200, headers }); }
    // One range, as media elements ask for: bytes=start-end, bytes=start- or bytes=-suffix
    const m = range.match(/^bytes=(\d*)-(\d*)$/);
    let start, end;
    if (m && (m[1] || m[2])) {
        if (m[1]) { start = Number(m[1]); end = m[2] ? Math.min(Number(m[2]), size - 1) : size - 1; }
        else { start = Math.max(0, size - Number(m[2])); end = size - 1; }
    }
    if (start === undefined || start >= size || start > end) {
        headers.set('Content-Range', `bytes */${size}`);
        return new Response(null, { status: 416, headers });
    }
    headers.set('Content-Range', `bytes ${start}-${end}/${size}`);
    headers.set('Content-Length', String(end - start + 1));
    return new Response(request.method === 'HEAD' ? null : body.slice(start, end + 1), { status: 206, headers });
}

// A remote-enabled book's bootstrap asks the controlling worker which UI release it saved (plan 11,
// protocol 1): a preview always shows the reader included in the book, so answer at once.
self.addEventListener('message', event => {
    if (event.data?.webbookOffline === 1 && event.data.command === 'saved-ui') event.ports[0]?.postMessage({ result: { ui: { localOnly: true } } });
});
