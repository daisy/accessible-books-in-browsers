// The chapter preview (user, 2026-11-17: preview one chapter, then convert the whole book to a zip).
// The preview converts a copy of the EPUB whose reading order is just the chosen chapter; the
// converter itself is unchanged. The converted chapter is served from a temporary store by
// preview-sw.js, replaced by the next preview and cleared when this page next loads. It is never
// offered as a kept book.
import { unzipSync, zipSync, strFromU8, strToU8 } from './vendor/fflate.js';
import { clockSeconds } from './epub-check.js';

const CACHE = 'webbook-preview-1';
export const PREVIEW_ROOT = new URL('preview/', location.href).href;

const OPF = 'http://www.idpf.org/2007/opf';

// A copy of the EPUB with only the chosen chapter in its reading order. With narrationLimit (in
// seconds), the chapter's narration keeps only the phrases that start within that time, so a
// preview converts a few minutes of audio instead of the whole chapter; its text stays complete.
export function chapterEpub(bytes, opfPath, idref, { narrationLimit } = {}) {
    const files = unzipSync(bytes);
    const opf = new DOMParser().parseFromString(strFromU8(files[opfPath]), 'application/xml');
    if (narrationLimit) limitNarration(files, opf, opfPath, idref, narrationLimit);
    const spine = opf.getElementsByTagNameNS(OPF, 'spine')[0];
    for (const ref of [...spine.getElementsByTagNameNS(OPF, 'itemref')]) {
        if (ref.getAttribute('idref') === idref) ref.removeAttribute('linear');
        else ref.remove();
    }
    files[opfPath] = strToU8(new XMLSerializer().serializeToString(opf));
    // mimetype first and stored, as EPUB requires
    const { mimetype, ...rest } = files;
    return zipSync({ ...(mimetype ? { mimetype: [mimetype, { level: 0 }] } : {}), ...rest });
}

function limitNarration(files, opf, opfPath, idref, limit) {
    const items = new Map([...opf.getElementsByTagNameNS(OPF, 'item')].map(item => [item.getAttribute('id'), item]));
    const overlay = items.get(items.get(idref)?.getAttribute('media-overlay'));
    if (!overlay) return;
    const path = decodeURIComponent(new URL(overlay.getAttribute('href'), 'https://book.invalid/' + opfPath).pathname.slice(1));
    if (!files[path]) return;
    const smil = new DOMParser().parseFromString(strFromU8(files[path]), 'application/xml');
    let elapsed = 0;
    for (const par of [...smil.getElementsByTagName('par')]) {
        const audio = par.getElementsByTagName('audio')[0];
        // Phrases that start after the limit are dropped; the first phrase is always kept
        if (elapsed >= limit && elapsed > 0) { par.remove(); continue; }
        if (audio) elapsed += Math.max(0, clockSeconds(audio.getAttribute('clipEnd')) - clockSeconds(audio.getAttribute('clipBegin')));
    }
    files[path] = strToU8(new XMLSerializer().serializeToString(smil));
}

const TYPES = {
    html: 'text/html; charset=utf-8', css: 'text/css; charset=utf-8', js: 'text/javascript; charset=utf-8', mjs: 'text/javascript; charset=utf-8',
    json: 'application/json', mp3: 'audio/mpeg', m4a: 'audio/mp4', mp4: 'audio/mp4', ogg: 'audio/ogg', vtt: 'text/vtt; charset=utf-8',
    svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', avif: 'image/avif', ico: 'image/x-icon',
    woff: 'font/woff', woff2: 'font/woff2', ttf: 'font/ttf', otf: 'font/otf', xml: 'application/xml', txt: 'text/plain; charset=utf-8', md: 'text/markdown; charset=utf-8'
};
const typeOf = path => TYPES[path.split('.').pop().toLowerCase()] ?? 'application/octet-stream';

export function previewAvailable() {
    return window.isSecureContext && 'serviceWorker' in navigator && 'caches' in window;
}

let registered;
function registerPreview() {
    registered ??= navigator.serviceWorker.register('preview-sw.js', { scope: './preview/' })
        .then(registration => registration.active ? registration : new Promise(resolve => {
            const worker = registration.installing || registration.waiting;
            worker.addEventListener('statechange', () => { if (worker.state === 'activated') resolve(registration); });
        }));
    return registered;
}

// Earlier versions of this page kept books with a library worker for the whole site; remove it,
// its books and its saved page files, so they don't linger
export async function cleanUp() {
    if (!previewAvailable()) return;
    for (const registration of await navigator.serviceWorker.getRegistrations()) {
        if (/\/library-sw\.js$/.test(registration.active?.scriptURL ?? '')) await registration.unregister();
    }
    for (const name of ['webbook-library-1', 'webbook-library-shell-1', CACHE]) await caches.delete(name);
}

// files: { path: Uint8Array }; returns the preview's first page
export async function showPreview(files) {
    await registerPreview();
    await caches.delete(CACHE);
    const cache = await caches.open(CACHE);
    for (const [path, data] of Object.entries(files)) {
        await cache.put(new URL(path, PREVIEW_ROOT).href, new Response(data, { headers: { 'Content-Type': typeOf(path), 'Content-Length': String(data.byteLength) } }));
    }
    return PREVIEW_ROOT + 'index.html';
}
