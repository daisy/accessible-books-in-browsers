import { elmForCue } from './cue-selector.js';
import { canPlay, cancelSkipPreroll } from './skippability.js';
import { highlightElm } from './narration-position.js';
import { requestAutoplayForForwardSpineLink, clearAutoplayRequest } from './autoplay.js';
import { isInteractiveTarget, isAnyPopoverOpen } from './dom-utils.js';

const CAPTION_STORAGE_KEY = 'webbook-caption-mode';
const CAPTION_ENTRY_STORAGE_KEY = 'webbook-caption-entry';
const CAPTION_CANDIDATE_SELECTOR = 'h1, h2, h3, h4, h5, h6, p, li, blockquote, figcaption, caption, th, td, .epubtype_pagebreak';

export let captionModeEnabled = false;
let captionBoundaryEntry = null;
let captionItems = [];
let captionIndex = -1;
let captionView = null;
let captionText = null;
let captionCount = null;

export function initCaptionMode() {
    ensureCaptionView();
    const toggle = document.querySelector('#webbook-caption-mode-toggle');
    captionModeEnabled = localStorage.getItem(CAPTION_STORAGE_KEY) === 'true';
    captionBoundaryEntry = consumeCaptionBoundaryEntry();
    if (toggle) {
        toggle.checked = captionModeEnabled;
        toggle.addEventListener('change', () => setCaptionMode(toggle.checked));
    }
    setCaptionMode(captionModeEnabled, { persist: false });
    document.addEventListener('keydown', handleCaptionKeydown);
}

function ensureCaptionView() {
    if (captionView) return;
    captionView = document.createElement('section');
    captionView.id = 'webbook-caption-view';
    captionView.className = 'webbook';
    captionView.setAttribute('aria-label', 'Caption mode');
    captionView.hidden = true;

    captionCount = document.createElement('p');
    captionCount.id = 'webbook-caption-count';
    captionCount.setAttribute('aria-hidden', 'true');

    captionText = document.createElement('p');
    captionText.id = 'webbook-caption-text';
    captionText.setAttribute('role', 'status');
    captionText.setAttribute('aria-live', 'polite');

    captionView.append(captionCount, captionText);
    document.body.append(captionView);
}

function setCaptionMode(enabled, options = {}) {
    captionModeEnabled = enabled;
    if (options.persist !== false) localStorage.setItem(CAPTION_STORAGE_KEY, String(enabled));

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

function clearCaption() {
    if (captionText) captionText.textContent = '';
    if (captionCount) captionCount.textContent = '';
}

function consumeCaptionBoundaryEntry() {
    const entry = localStorage.getItem(CAPTION_ENTRY_STORAGE_KEY);
    localStorage.removeItem(CAPTION_ENTRY_STORAGE_KEY);
    return entry === 'first' || entry === 'last' ? entry : null;
}

function getReaderAudio() {
    return document.querySelector('audio');
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
        .map(cue => {
            const elm = elmForCue(cue);
            if (!elm || !captionTextForElement(elm)) return null;
            return { elm, cue };
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

function captionTextForElement(elm) {
    if (elm.classList.contains('epubtype_pagebreak')) {
        const label = elm.getAttribute('aria-label');
        if (label) return label.trim();
    }
    return (elm.textContent || '').replace(/\s+/g, ' ').trim();
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
    if (!captionModeEnabled || !captionText || !captionCount) return;
    if (!item) {
        clearCaption();
        return;
    }

    captionIndex = captionItems.indexOf(item);
    const visibleItems = playableCaptionItems();
    const visibleIndex = visibleItems.indexOf(item);
    captionText.textContent = captionTextForElement(item.elm);
    captionCount.textContent = visibleIndex >= 0 ? `${visibleIndex + 1} of ${visibleItems.length}` : '';
}

function handleCaptionKeydown(e) {
    if (!captionModeEnabled || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
    if (!['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(e.key)) return;
    if (isInteractiveTarget(e.target) || isAnyPopoverOpen()) return;

    e.preventDefault();
    stepCaption((e.key === 'ArrowRight' || e.key === 'ArrowDown') ? 1 : -1);
}

function stepCaption(delta) {
    if (!captionItems.length) refreshCaptionItems();
    const nextIndex = findNextCaptionIndex(captionIndex, delta);
    if (nextIndex < 0) {
        navigateCaptionBoundary(delta);
        return;
    }

    const item = captionItems[nextIndex];
    syncAudioToCaptionItem(item);
    highlightElm(item.elm);
    showCaptionItem(item);
}

function syncAudioToCaptionItem(item) {
    const audio = getReaderAudio();
    if (item?.cue && hasUsableAudio(audio)) {
        cancelSkipPreroll(audio);
        audio.currentTime = item.cue.startTime;
    }
}

function navigateCaptionBoundary(delta) {
    const link = document.querySelector(`#webbook-spine-nav a[rel=${delta > 0 ? 'next' : 'prev'}][href]`);
    if (!link) return;

    localStorage.setItem(CAPTION_ENTRY_STORAGE_KEY, delta > 0 ? 'first' : 'last');
    const audio = getReaderAudio();
    if (delta > 0 && hasUsableAudio(audio) && !audio.paused && !audio.ended) {
        requestAutoplayForForwardSpineLink(link);
    } else {
        clearAutoplayRequest();
    }
    link.click();
}

function findNextCaptionIndex(fromIndex, delta) {
    let index = fromIndex < 0 ? (delta > 0 ? -1 : 0) : fromIndex;
    while (true) {
        index += delta;
        if (index < 0 || index >= captionItems.length) return -1;
        if (canPlay(captionItems[index].elm)) return index;
    }
}
