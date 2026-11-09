const AUTOPLAY_STORAGE_KEY = 'webbook-autoplay';
const AUTOPLAY_TARGET_STORAGE_KEY = 'webbook-autoplay-target';

export function normalizeAutoplayUrl(href) {
    try {
        const url = new URL(href, window.location.href);
        url.hash = '';
        url.search = '';
        return url.href;
    } catch {
        return '';
    }
}

export function clearAutoplayRequest() {
    localStorage.removeItem(AUTOPLAY_STORAGE_KEY);
    localStorage.removeItem(AUTOPLAY_TARGET_STORAGE_KEY);
}

export function requestAutoplayForForwardSpineLink(link) {
    if (!link?.matches?.('#webbook-spine-nav a[rel=next][href]')) return;
    requestAutoplayForLink(link);
}

// For any link to another page of this book, e.g. from the table of contents during playback
export function requestAutoplayForLink(link) {
    const target = normalizeAutoplayUrl(link?.href);
    if (!target) return;
    localStorage.setItem(AUTOPLAY_STORAGE_KEY, 'true');
    localStorage.setItem(AUTOPLAY_TARGET_STORAGE_KEY, target);
}

export function consumeAutoplayRequest() {
    const requested = localStorage.getItem(AUTOPLAY_STORAGE_KEY) === 'true';
    const target = localStorage.getItem(AUTOPLAY_TARGET_STORAGE_KEY);
    clearAutoplayRequest();
    return requested && Boolean(target) && target === normalizeAutoplayUrl(window.location.href);
}
