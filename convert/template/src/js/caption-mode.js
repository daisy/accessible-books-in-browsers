// Saved preferences must also be listed in settings-file.js (export, import and reset).
import { elmForCue } from './cue-selector.js';
import { canPlay, cancelSkipPreroll } from './skippability.js';
import { highlightElm } from './narration-position.js';
import { consumePageEntry, stepAcrossPageBoundary, adjacentPageLink } from './page-entry.js';
import { stepPhrase } from './player.js';
import { isAnyPopoverOpen, pageAudio } from './dom-utils.js';
import { registerAction, announceReaderAction } from './reader-actions.js';

// Global, including the inline script's choice before first paint.
const CAPTION_STORAGE_KEY = 'webbook-caption-mode';

const CAPTION_CANDIDATE_SELECTOR = 'h1, h2, h3, h4, h5, h6, p, li, blockquote, figcaption, caption, th, td, .epubtype_pagebreak';

export let captionModeEnabled = false;
let captionBoundaryEntry = null;
let captionItems = [];
let captionIndex = -1;
let captionView = null;
let captionText = null;

export function initCaptionMode() {
    ensureCaptionView();
    const toggle = document.querySelector('#webbook-caption-mode-toggle');
    captionModeEnabled = localStorage.getItem(CAPTION_STORAGE_KEY) === 'true';
    captionBoundaryEntry = consumePageEntry();
    if (toggle) {
        toggle.checked = captionModeEnabled;
        toggle.addEventListener('change', () => setCaptionMode(toggle.checked));
    }
    setCaptionMode(captionModeEnabled, { persist: false });
    document.addEventListener('keydown', handleCaptionKeydown);
    registerAction({ id: 'toggle-caption-mode', label: 'Caption mode on or off', group: 'Reading',
        defaultKeys: [{ code: 'Backslash', shift: true }],
        isAvailable: () => Boolean(toggle && !toggle.disabled),
        run: () => {
            toggle.click();
            announceReaderAction(`Caption mode ${toggle.checked ? 'on' : 'off'}.`);
        } });
}

// A page loaded in place of the last one: its captions come from its own text and track
export function startCaptionModeForPage() {
    captionItems = [];
    captionIndex = -1;
    captionBoundaryEntry = consumePageEntry();
    if (!captionModeEnabled) return;
    // The new page's content is in the same <main>, which caption mode keeps hidden
    refreshCaptionItems();
    showCaptionForCurrentState();
}

function ensureCaptionView() {
    if (captionView) return;
    captionView = document.createElement('section');
    captionView.id = 'webbook-caption-view';
    captionView.className = 'webbook';
    captionView.setAttribute('aria-label', 'Caption mode');
    captionView.hidden = true;

    captionText = document.createElement('p');
    captionText.id = 'webbook-caption-text';
    captionText.setAttribute('role', 'status');
    captionText.setAttribute('aria-live', 'polite');

    captionView.append(captionText);
    document.body.append(captionView);
}

function setCaptionMode(enabled, options = {}) {
    captionModeEnabled = enabled;
    if (options.persist !== false) {
        localStorage.setItem(CAPTION_STORAGE_KEY, String(enabled));
    }

    document.documentElement.classList.toggle('webbook-caption-mode', enabled);
    document.body.classList.toggle('webbook-caption-mode', enabled);
    const main = document.querySelector('main');
    if (main) {
        if (enabled) main.setAttribute('aria-hidden', 'true');
        else main.removeAttribute('aria-hidden');
    }
    if (captionView) captionView.hidden = !enabled;

    if (enabled) {
        refreshCaptionItems();
        showCaptionForCurrentState();
    } else {
        captionBoundaryEntry = null;
        clearCaption();
    }
}

export function clearCaption() {
    if (captionText) captionText.textContent = '';
}


function getReaderAudio() {
    return pageAudio();
}

function hasUsableAudio(audio) {
    return Boolean(audio && (audio.getAttribute('src') || audio.currentSrc || audio.querySelector('source[src]')));
}

function getReaderTextTrack(audio = getReaderAudio()) {
    return audio?.textTracks?.[0] || audio?.querySelector('track')?.track || null;
}

function refreshCaptionItems() {
    const trackItems = captionItemsForTrack(getReaderTextTrack());
    captionItems = trackItems.length ? trackItems : collectManualCaptionItems();
    if (captionIndex >= captionItems.length) captionIndex = captionItems.length - 1;
}

export function refreshCaptionItemsFromTrack(track) {
    const trackItems = captionItemsForTrack(track);
    if (!trackItems.length) return;
    captionItems = trackItems;
    if (captionIndex >= captionItems.length) captionIndex = captionItems.length - 1;
    if (captionModeEnabled) showCaptionForCurrentState();
}

function captionItemsForTrack(track) {
    if (!track?.cues?.length) return [];
    return Array.from(track.cues)
        // Kept even when there's no text to show, so the caption clears instead of leaving the
        // previous phrase on screen while this one plays
        .map(cue => {
            const elm = elmForCue(cue);
            return elm ? { elm, cue } : null;
        })
        .filter(Boolean);
}

function collectManualCaptionItems() {
    const main = document.querySelector('main');
    if (!main) return [];
    return Array.from(main.querySelectorAll(CAPTION_CANDIDATE_SELECTOR))
        .filter(elm => !elm.closest('[hidden]') && Boolean(captionTextForElement(elm)))
        .map(elm => ({ elm }));
}

const NOTE_REFERENCE_SELECTOR = '.epubtype_noteref, [role~="doc-noteref"], a[href]';
const NOTE_TARGET_SELECTOR = '.epubtype_footnote, .epubtype_endnote, .epubtype_note, [role="doc-footnote"], [role="doc-endnote"]';

function isNoteReference(reference) {
    if (reference.matches('.epubtype_noteref, [role~="doc-noteref"]')) return true;
    try {
        const url = new URL(reference.getAttribute('href'), window.location.href);
        const here = new URL(window.location.href);
        if (!url.hash || url.origin !== here.origin || url.pathname !== here.pathname) return false;
        return Boolean(document.getElementById(decodeURIComponent(url.hash.slice(1)))?.closest(NOTE_TARGET_SELECTOR));
    } catch { return false; }
}

// Copy only text and superscripts: publication links, ids, styles and executable markup
// must not become a second interactive or addressable copy in the caption.
export function captionContentForElement(elm) {
    const content = document.createDocumentFragment();
    function append(source, target, superscript = false) {
        if (source.nodeType === 3) {
            target.append(document.createTextNode(source.textContent.replace(/\s+/g, ' ')));
            return;
        }
        if (source.nodeType !== 1 || source.matches('script, style, template')) return;
        const reference = source.matches(NOTE_REFERENCE_SELECTOR) && isNoteReference(source);
        if (!superscript && (source.tagName === 'SUP' || reference)) {
            const sup = document.createElement('sup');
            target.append(sup);
            for (const child of source.childNodes) append(child, sup, true);
        } else {
            for (const child of source.childNodes) append(child, target, superscript);
        }
    }
    // A cue can name just the number inside a reference.
    const enclosing = elm.closest(NOTE_REFERENCE_SELECTOR);
    if (enclosing && isNoteReference(enclosing) && elm.tagName !== 'SUP') {
        const sup = document.createElement('sup');
        content.append(sup);
        append(elm, sup, true);
    } else append(elm, content);
    if (!content.textContent.trim() || elm.classList.contains('epubtype_pagebreak')) {
        content.replaceChildren(document.createTextNode(captionTextForElement(elm)));
    }
    return content;
}

export function captionTextForElement(elm) {
    if (elm.classList.contains('epubtype_pagebreak')) {
        const label = elm.getAttribute('aria-label');
        if (label) return label.trim();
    }
    const text = (elm.textContent || '').replace(/\s+/g, ' ').trim();
    if (text) return text;
    // Narration of an image reads its description
    const images = elm.tagName === 'IMG' ? [elm] : Array.from(elm.querySelectorAll('img'));
    return images.map(img => (img.getAttribute('alt') || '').trim()).filter(Boolean).join(' ');
}

function playableCaptionItems() {
    return captionItems.filter(item => item.elm && canPlay(item.elm) && Boolean(captionTextForElement(item.elm)));
}

export function showCaptionForCurrentState() {
    if (!captionModeEnabled) return;
    if (!captionItems.length) refreshCaptionItems();

    if (showCaptionForBoundaryEntry()) return;

    const currentCueItem = findCaptionItemAtCurrentTime();
    if (currentCueItem) {
        showCaptionItem(currentCueItem);
        return;
    }

    const currentItem = captionItems[captionIndex];
    if (currentItem && canPlay(currentItem.elm)) {
        showCaptionItem(currentItem);
        return;
    }

    const nextIndex = captionIndex >= 0 ? findNextCaptionIndex(captionIndex, 1) : -1;
    if (nextIndex >= 0) {
        showCaptionItem(captionItems[nextIndex]);
        return;
    }

    showCaptionItem(playableCaptionItems()[0] || null);
}

function showCaptionForBoundaryEntry() {
    if (!captionBoundaryEntry) return false;
    const visibleItems = playableCaptionItems();
    const item = captionBoundaryEntry === 'last' ? visibleItems[visibleItems.length - 1] : visibleItems[0];
    if (!item) return false;

    showCaptionItem(item);
    syncAudioToCaptionItem(item);
    if (item.cue || !hasPendingCaptionTrack()) captionBoundaryEntry = null;
    return true;
}

function hasPendingCaptionTrack() {
    const audio = getReaderAudio();
    const trackEl = audio?.querySelector('track');
    const readyState = typeof trackEl?.readyState === 'number' ? trackEl.readyState : 0;
    return hasUsableAudio(audio) && Boolean(trackEl) && !captionItems.some(item => item.cue) && readyState < 2;
}

function findCaptionItemAtCurrentTime() {
    const audio = getReaderAudio();
    if (!hasUsableAudio(audio)) return null;
    const activeItem = captionItems.find(item =>
        item.cue &&
        canPlay(item.elm) &&
        item.cue.startTime <= audio.currentTime &&
        item.cue.endTime > audio.currentTime
    );
    if (activeItem) return activeItem;
    return captionItems.find(item =>
        item.cue &&
        canPlay(item.elm) &&
        item.cue.startTime > audio.currentTime
    ) || null;
}

export function showCaptionForCue(cue, track) {
    if (!captionModeEnabled) return;
    if (!captionItems.some(item => item.cue === cue)) refreshCaptionItemsFromTrack(track);
    const item = captionItems.find(item => item.cue === cue);
    if (item && canPlay(item.elm)) showCaptionItem(item);
}

function showCaptionItem(item) {
    if (!captionModeEnabled || !captionText) return;
    if (!item) {
        clearCaption();
        return;
    }

    captionIndex = captionItems.indexOf(item);
    captionText.replaceChildren(captionContentForElement(item.elm));
}

function handleCaptionKeydown(e) {
    if (!captionModeEnabled || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
    if (!['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(e.key)) return;
    // Closing Settings returns focus to its toolbar button. Buttons do not use arrow
    // keys, so caption navigation must still work there; inputs keep their native keys.
    if (e.target.closest?.('input, select, textarea, [contenteditable="true"], [contenteditable=""]') || isAnyPopoverOpen()) return;

    e.preventDefault();
    const delta = (e.key === 'ArrowRight' || e.key === 'ArrowDown') ? 1 : -1;
    // The arrows are caption mode's keys for previous/next phrase; on a page without narration
    // there are no phrases, so they step through the page's text instead
    stepPhrase(delta);
}

export function canStepCaption(delta) {
    if (!captionModeEnabled) return false;
    if (!captionItems.length) refreshCaptionItems();
    return findNextCaptionIndex(captionIndex, delta) >= 0 || Boolean(adjacentPageLink(delta));
}

export function stepCaption(delta) {
    if (!captionModeEnabled) return false;
    if (!captionItems.length) refreshCaptionItems();
    const nextIndex = findNextCaptionIndex(captionIndex, delta);
    if (nextIndex < 0) {
        return stepAcrossPageBoundary(delta);
    }

    const item = captionItems[nextIndex];
    syncAudioToCaptionItem(item);
    highlightElm(item.elm);
    showCaptionItem(item);
    return true;
}

function syncAudioToCaptionItem(item) {
    const audio = getReaderAudio();
    if (item?.cue && hasUsableAudio(audio)) {
        cancelSkipPreroll(audio);
        audio.currentTime = item.cue.startTime;
    }
}


function findNextCaptionIndex(fromIndex, delta) {
    let index = fromIndex < 0 ? (delta > 0 ? -1 : 0) : fromIndex;
    while (true) {
        index += delta;
        if (index < 0 || index >= captionItems.length) return -1;
        if (canPlay(captionItems[index].elm)) return index;
    }
}
