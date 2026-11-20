// Pure policy bundled into the frozen loader and shared with reader recovery controls.
export const uiKey = (root) => 'webbook-ui:' + root;
export const validVersion = (value) => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/.test(value);
export const validOverride = (value) => ['local', 'remote', 'auto'].includes(value) || value?.startsWith('release:') && validVersion(value.slice(8));
export function overrideDecision(parameter, stored) {
    if (!validOverride(parameter)) return { value: stored || null, changed: false };
    return { value: parameter === 'auto' ? null : parameter, changed: true, persistent: parameter === 'local' };
}
export function validateManifest(data, { contract, channel, local }) {
    if (!data || data.contract !== contract) throw new Error('Wrong UI contract');
    if (data.useLocal === true) return local;
    if (data.protocol !== undefined && data.protocol !== 1) throw new Error('Incompatible offline protocol');
    if (!validVersion(data.version) || data.minBootstrap !== 1) throw new Error('Incompatible release');
    const base = new URL('releases/' + data.version + '/', channel);
    const file = (value, fallback) => {
        if (typeof (value || fallback) !== 'string') throw new Error('Missing release file');
        const url = new URL(value || fallback, channel);
        if (url.origin !== base.origin || !url.href.startsWith(base.href) || /[\\\u0000]|(?:^|\/)\.\.(?:\/|$)/.test(decodeURIComponent(url.pathname)) || url.search || url.hash) throw new Error('Invalid release path');
        return url.href;
    };
    return { contract, channel: new URL(channel).href, version: data.version, script: file(data.script), stylesheet: file(data.stylesheet), inventory: file(data.inventory, `releases/${data.version}/ui-files.json`), worker: data.worker ? file(data.worker) : null, protocol: 1, integrity: data.integrity };
}
export function releaseSelection(version, options) {
    return validateManifest({ contract: options.contract, minBootstrap: 1, version, script: `releases/${version}/main.js`, stylesheet: `releases/${version}/style.css`, worker: `releases/${version}/offline-worker.js` }, options);
}
export function selectionDecision({ channel, override, saved, cached, forceLocal, local }) {
    if (!channel || override === 'local' || forceLocal) return { selected: local };
    if (override?.startsWith('release:')) return { version: override.slice(8) };
    if (override === 'remote') return { fetch: true };
    if (saved) return saved.remote?.channel === new URL(channel).href && validVersion(saved.remote.version)
        ? { version: saved.remote.version, files: saved.remote.files, saved: true }
        : { selected: local };
    return cached ? { selected: cached, refresh: true } : { fetch: true };
}
const sri = (hex) => 'sha256-' + btoa(String.fromCharCode(...hex.match(/../g).map(byte => parseInt(byte, 16))));
export function verifyInventory(selection, inventory) {
    if (inventory?.version !== 1 || inventory.contract !== selection.contract || !Array.isArray(inventory.files)) throw new Error('Missing compatible release inventory');
    const base = new URL('releases/' + selection.version + '/', selection.channel), files = new Map();
    for (const file of inventory.files) {
        const url = new URL(file.href || file.url, base);
        if (url.origin !== base.origin || !url.href.startsWith(base.href) || url.search || url.hash || /[\\\u0000]|(?:^|\/)\.\.(?:\/|$)/.test(decodeURIComponent(url.pathname)) || !/^[a-f0-9]{64}$/.test(file.sha256 || '') || files.has(url.href)) throw new Error('Invalid release integrity inventory');
        files.set(url.href, file.sha256);
    }
    const integrity = {};
    for (const name of ['script', 'stylesheet']) {
        const hash = files.get(selection[name]);
        if (!hash) throw new Error('Release integrity is missing for ' + name);
        integrity[name] = sri(hash);
        if (selection.integrity?.[name] && selection.integrity[name] !== integrity[name]) throw new Error('Conflicting release integrity');
    }
    if (selection.worker && !files.has(selection.worker)) throw new Error('Worker integrity is missing');
    return { ...selection, integrity };
}
export function failureDecision(local, startup) {
    return local ? 'baseline' : startup ? 'reload-local' : 'local';
}
export function validChannel(value) {
    try {
        const url = new URL(value);
        return (url.protocol === 'https:' || url.protocol === 'http:' && ['localhost','127.0.0.1','[::1]'].includes(url.hostname)) && !url.username && !url.password && !url.search && !url.hash && url.pathname.endsWith('/') ? url.href : null;
    } catch { return null; }
}
export const baselineDecision = ({ file, failed, urlBaseline, auto }) => Boolean(file || (failed || urlBaseline) && !auto);
export const finalSelection = (selected, { bad, forceLocal, local }) => !selected.local && bad || forceLocal ? local : selected;
