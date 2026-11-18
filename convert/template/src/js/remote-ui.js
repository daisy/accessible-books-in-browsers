import { includeRemoteRelease } from './offline-discovery.js';
import { workerScriptURL } from './offline-resources.js';
export async function includeSelectedUI(root, list, { initial = false, signal } = {}) {
    if (initial && window.webbookUI?.local) return { ...list, ui: { ...list.ui, localOnly: true } };
    let selected = initial ? window.webbookUI : null;
    let explicitLocal = false;
    try {
        explicitLocal = localStorage.getItem('webbook-ui:' + root + ':override') === 'local';
    } catch {}
    const index = list.files.find((file) => file.url === new URL('index.html', root).href);
    const html = index?.body && (await index.body.text());
    const channelValue =
        html &&
        new DOMParser().parseFromString(html, 'text/html').querySelector('meta[name="webbook-ui-channel"]')
            ?.content;
    if (explicitLocal || !channelValue) return { ...list, ui: { ...list.ui, localOnly: true } };
    const channel = new URL(channelValue);
    const read = async (url) => {
        const response = await fetch(url, {
            mode: 'cors',
            credentials: 'omit',
            cache: 'no-store',
            referrerPolicy: 'no-referrer',
            signal: AbortSignal.any([AbortSignal.timeout(5000), signal].filter(Boolean)),
        });
        if (!response.ok || response.type === 'opaque')
            throw new Error('The UI channel could not be checked. Your saved copy is kept.');
        return response.json();
    };
    if (!selected || selected.channel !== channel.href) {
        const manifest = await read(new URL('current.json', channel));
        if (manifest.protocol !== undefined && manifest.protocol !== 1)
            throw new Error('The UI channel uses an incompatible offline protocol.');
        if (manifest.contract !== list.ui.contract)
            throw new Error('The UI channel requires a different book contract.');
        if (manifest.useLocal) return { ...list, ui: { ...list.ui, localOnly: true } };
        if (manifest.minBootstrap !== 1 || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/.test(manifest.version || ''))
            throw new Error('The UI channel is incompatible.');
        selected = {
            channel: channel.href,
            version: manifest.version,
            inventory: new URL(manifest.inventory || `releases/${manifest.version}/ui-files.json`, channel)
                .href,
        };
    }
    const base = new URL('releases/' + selected.version + '/', channel);
    workerScriptURL(root, { channel: channel.href, worker: new URL('offline-worker.js', base).href });
    const inventoryURL = new URL(selected.inventory || 'ui-files.json', base);
    if (
        inventoryURL.origin !== base.origin ||
        !inventoryURL.href.startsWith(base.href) ||
        inventoryURL.search ||
        inventoryURL.hash
    )
        throw new Error('Invalid remote inventory.');
    const inventory = await read(inventoryURL);
    return includeRemoteRelease(list, root, { channel: channel.href, version: selected.version, inventory });
}
