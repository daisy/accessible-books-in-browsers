import { requestAutoplayForLink, clearAutoplayRequest } from './autoplay.js';
import { registerAction } from './reader-actions.js';

// Stepping past the first or last phrase of a page continues on the neighboring page, entering it
// at its last or first phrase. The storage key predates phrase stepping and is kept so a page from
// an earlier v0 release can still hand over to this one.
const PAGE_ENTRY_STORAGE_KEY = 'webbook-caption-entry';

let pageEntry;

// One-shot: read on the first call and kept for the rest of the page, so caption mode and the
// player both see it
export function consumePageEntry() {
    if (pageEntry === undefined) {
        const entry = localStorage.getItem(PAGE_ENTRY_STORAGE_KEY);
        localStorage.removeItem(PAGE_ENTRY_STORAGE_KEY);
        pageEntry = entry === 'first' || entry === 'last' ? entry : null;
    }
    return pageEntry;
}

// A page loaded in place starts over: it reads the entry left for it like a newly loaded page
export function resetPageEntry() {
    pageEntry = undefined;
}

export function adjacentPageLink(delta) {
    return document.querySelector(`#webbook-spine-nav a[rel=${delta > 0 ? 'next' : 'prev'}][href]`);
}

export function initPageActions() {
    for (const [id, label, delta, code] of [
        ['previous-page', 'Previous page', -1, 'BracketLeft'],
        ['next-page', 'Next page', 1, 'BracketRight']
    ]) {
        registerAction({ id, label, group: 'Navigation', defaultKeys: [{ code, shift: true }],
            run: () => adjacentPageLink(delta)?.click(), isAvailable: () => Boolean(adjacentPageLink(delta)) });
    }
}

export function stepAcrossPageBoundary(delta) {
    const link = adjacentPageLink(delta);
    if (!link) return false;

    localStorage.setItem(PAGE_ENTRY_STORAGE_KEY, delta > 0 ? 'first' : 'last');
    const audio = document.querySelector('audio');
    if (audio && !audio.paused && !audio.ended) {
        requestAutoplayForLink(link);
    } else {
        clearAutoplayRequest();
    }
    link.click();
    return true;
}
