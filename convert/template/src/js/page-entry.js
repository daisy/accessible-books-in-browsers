import { requestAutoplayForLink, clearAutoplayRequest } from './autoplay.js';

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

export function adjacentPageLink(delta) {
    return document.querySelector(`#webbook-spine-nav a[rel=${delta > 0 ? 'next' : 'prev'}][href]`);
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
