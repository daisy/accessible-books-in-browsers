// Pure resource parsing shared by discovery tests. Publication scripts are never evaluated.
export const OFFLINE_PROTOCOL = 1;
export const LIMITS = { files: 20000, bytes: 10 * 1024 ** 3, discoveryBytes: 128 * 1024 ** 2 };
export function bookRoot(href = location.href) { return new URL('./', href).href; }
export function resourceURL(href, base, root, { link = false } = {}) {
    if (!href || href.startsWith('#') || /^(?:data|blob|mailto|tel|javascript):/i.test(href)) return null;
    const url = new URL(href, base), scope = new URL(root);
    if (!/^https?:$/.test(url.protocol) || url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)
        || /(?:^|\/)\.\.(?:\/|$)|[\\\u0000]/.test(decodeURIComponent(url.pathname))) {
        if (link) return null;
        throw new Error('An essential resource is outside this book: ' + url.href);
    }
    url.hash = '';
    if (url.pathname.endsWith('/')) url.pathname += 'index.html';
    if (/\.html?$/i.test(url.pathname)) url.search = '';
    return url.href;
}
const unescapeCSS = value => value.replace(/\\(?:([\da-f]{1,6})\s?|\r\n|[\n\r\f]|(.))/gi,
    (_, hex, char) => hex ? String.fromCodePoint(Math.min(parseInt(hex, 16) || 0xfffd, 0x10ffff)) : char || '');
export function cssReferences(text, onImport = () => {}) {
    const urls = [];
    let i = 0, importing = false;
    const space = () => { while (i < text.length) { if (/\s/.test(text[i])) i++; else if (text.slice(i, i + 2) === '/*') { const end = text.indexOf('*/', i + 2); i = end < 0 ? text.length : end + 2; } else break; } };
    const quoted = () => { const quote = text[i++]; let value = ''; while (i < text.length) { const c = text[i++]; if (c === quote) break; value += c; if (c === '\\' && i < text.length) value += text[i++]; } return unescapeCSS(value); };
    while (i < text.length) {
        space();
        if (text[i] === '"' || text[i] === "'") { quoted(); continue; }
        if (text.slice(i, i + 7).toLowerCase() === '@import' && !/[\w-]/.test(text[i + 7] || '')) {
            i += 7; importing = true; space(); if (text[i] === '"' || text[i] === "'") { const value = quoted(); urls.push(value); onImport(value); importing = false; continue; }
        }
        const imageSet = text.slice(i).match(/^(?:-webkit-)?image-set\s*\(/i);
        if (imageSet && !/[\w-]/.test(text[i - 1] || '')) {
            i += imageSet[0].length; const start = i; let depth = 1, candidate = true;
            while (i < text.length && depth) {
                space();
                if (text[i] === '"' || text[i] === "'") { const value = quoted(); if (depth === 1 && candidate) { urls.push(value); candidate = false; } continue; }
                const c = text[i++]; if (c === '(') depth++; else if (c === ')') depth--; else if (c === ',' && depth === 1) candidate = true;
            }
            urls.push(...cssReferences(text.slice(start, i - 1))); continue;
        }
        if (text.slice(i, i + 3).toLowerCase() === 'url' && !/[\w-]/.test(text[i - 1] || '')) {
            const start = i; i += 3; space();
            if (text[i] !== '(') { i = start + 1; continue; }
            i++; space(); let value = '';
            if (text[i] === '"' || text[i] === "'") value = quoted();
            else { while (i < text.length && text[i] !== ')') { const c = text[i++]; value += c; if (c === '\\' && i < text.length) value += text[i++]; } value = unescapeCSS(value.trim()); }
            urls.push(value); if (importing) { onImport(value); importing = false; } while (i < text.length && text[i] !== ')') i++; i++; continue;
        }
        i++;
    }
    return urls;
}
export function srcsetReferences(text) {
    const urls = []; let i = 0;
    while (i < text.length) {
        while (/[\s,]/.test(text[i] || '') && i < text.length) i++;
        let url = ''; while (i < text.length && !/\s/.test(text[i])) url += text[i++];
        if (!url) break;
        if (url.endsWith(',')) { urls.push(url.replace(/,+$/, '')); continue; }
        urls.push(url); let depth = 0;
        while (i < text.length) { const c = text[i++]; if (c === '(') depth++; if (c === ')') depth--; if (c === ',' && !depth) break; }
    }
    return urls;
}
export function kindFor(url) {
    const name = new URL(url).pathname.toLowerCase();
    if (/\.html?$/.test(name)) return 'html';
    if (/\.css$/.test(name)) return 'css';
    if (/\.json$/.test(name)) return 'json';
    if (/\.(?:m?js)$/.test(name)) return 'script';
    if (/\.vtt$/.test(name)) return 'track';
    return 'asset';
}
export function validators(headers) {
    const length = headers.get('content-length');
    return { etag: headers.get('etag') || '', modified: headers.get('last-modified') || '', size: length !== null && /^\d+$/.test(length) ? Number(length) : null, type: headers.get('content-type') || '' };
}
export async function sha256(bytes) { return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), b => b.toString(16).padStart(2, '0')).join(''); }
export function workerScriptURL(root, remote) {
    const script = new URL('sw.js', root);
    if (remote) {
        const channel = new URL(remote.channel), worker = new URL(remote.worker, channel);
        if (!(channel.protocol === 'https:' || channel.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(channel.hostname))
            || /(?:^|\/)\.\.(?:\/|$)|[\\\u0000]/.test(decodeURIComponent(worker.pathname)) || !channel.pathname.endsWith('/') || worker.origin !== channel.origin
            || !worker.pathname.startsWith(channel.pathname + 'releases/') || !/\/releases\/[^/]+\/offline-worker\.js$/.test(worker.pathname) || worker.search || worker.hash) throw new Error('Invalid offline worker release.');
        script.searchParams.set('webbook-channel', channel.href); script.searchParams.set('webbook-worker', worker.href);
    }
    return script.href;
}
