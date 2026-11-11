import { cueForElement, cueNeedsTime, elmForCue } from './cue-selector.js';
import { positionAnchor, readingLine, syncPositionUrl } from './narration-position.js';
import { registerAction, announceReaderAction } from './reader-actions.js';
import { pageAudio } from './dom-utils.js';
import { pausedForSound } from './structure-sounds.js';

const SCROLL_DELAY = 300;
const PLACEMENT_SETTLE_DELAY = 350;
const TRACK_FALLBACK_DELAY = 5000;
let scrollTimer = null;
let placementTimer = null;
let placingReader = true;
let playerReadyDuringPlacement = false;

function pageCues() {
    const audio = pageAudio();
    const track = audio?.textTracks?.[0] || audio?.querySelector('track')?.track;
    return Array.from(track?.cues || []);
}

export function cueAtReadingLine() {
    const line = readingLine();
    let reached = null;
    for (const cue of pageCues()) {
        const elm = elmForCue(cue);
        if (!elm) continue;
        const rect = elm.getBoundingClientRect();
        if (rect.top <= line) reached = { cue, elm };
        if (rect.top <= line && rect.bottom > line) return { cue, elm };
        if (rect.top > line) break;
    }
    return reached;
}

function hasLayoutBox(elm) {
    return typeof elm.getClientRects !== 'function' || elm.getClientRects().length > 0;
}

function isReaderUiId(elm) {
    return elm.id.startsWith('webbook-') || elm.matches('.webbook[id]');
}

export function structureAtReadingLine() {
    const main = document.querySelector('main');
    if (!main) return null;
    const line = readingLine();
    let reached = null;
    for (const elm of main.querySelectorAll('[id]')) {
        if (elm.closest('[hidden], [aria-hidden="true"]') || isReaderUiId(elm) || !hasLayoutBox(elm)) continue;
        if (elm.getBoundingClientRect().top <= line) reached = elm;
        else break;
    }
    return reached;
}

export function updateFromReadingLine() {
    if (placingReader) return false;
    const audio = pageAudio();
    if (audio && ((!audio.paused && !audio.ended) || pausedForSound())) return false;
    const narrated = cueAtReadingLine();
    if (narrated) return syncPositionUrl(narrated.elm,
        cueNeedsTime(narrated.cue, narrated.elm) ? narrated.cue.startTime : undefined);
    const structure = structureAtReadingLine();
    return structure ? syncPositionUrl(structure) : false;
}

export function updateFromFocus(target) {
    if (placingReader || !(target instanceof Element) || !document.querySelector('main')?.contains(target)) return false;
    const cue = cueForElement(pageCues(), target);
    const narrated = cue && { cue, elm: elmForCue(cue) };
    if (narrated) return syncPositionUrl(narrated.elm,
        cueNeedsTime(narrated.cue, narrated.elm) ? narrated.cue.startTime : undefined);
    else {
        // A narrated page whose cues are still loading cannot yet tell whether this is a phrase.
        // Keep its precise incoming URL until the track is ready.
        if (pageHasNarration() && !pageCues().length) return false;
        const anchor = positionAnchor(target);
        return anchor ? syncPositionUrl(anchor) : false;
    }
}

function pageHasNarration() {
    const audio = pageAudio();
    return Boolean(audio?.querySelector('track')
        && (audio.getAttribute('src') || audio.querySelector('source[src]')));
}

function releasePlacementAfter(delay) {
    clearTimeout(placementTimer);
    placementTimer = setTimeout(() => {
        placingReader = false;
        placementTimer = null;
    }, delay);
}

function holdPlacement() {
    placingReader = true;
    playerReadyDuringPlacement = false;
    clearTimeout(placementTimer);
    placementTimer = null;
    clearTimeout(scrollTimer);
}

function finishPlacementForPage() {
    if (playerReadyDuringPlacement || pageCues().length) releasePlacementAfter(PLACEMENT_SETTLE_DELAY);
    else if (pageHasNarration()) releasePlacementAfter(TRACK_FALLBACK_DELAY);
    else releasePlacementAfter(PLACEMENT_SETTLE_DELAY);
}

async function copyPositionLink() {
    const active = document.activeElement;
    if (active && active !== document.body && document.querySelector('main')?.contains(active)) updateFromFocus(active);
    else updateFromReadingLine();
    try {
        await navigator.clipboard.writeText(window.location.href);
        announceReaderAction('Link copied');
    } catch {
        announceReaderAction('Could not copy the link');
    }
}

export function initBrowserBookmarks() {
    window.addEventListener('scroll', () => {
        clearTimeout(scrollTimer);
        scrollTimer = setTimeout(updateFromReadingLine, SCROLL_DELAY);
    }, { passive: true });
    document.addEventListener('focusin', event => updateFromFocus(event.target));
    document.addEventListener('webbook:pageplacing', holdPlacement);
    document.addEventListener('webbook:playerready', () => {
        playerReadyDuringPlacement = true;
        if (placingReader) releasePlacementAfter(PLACEMENT_SETTLE_DELAY);
    });
    // playerready can precede pagechange when an in-place page's track is already cached. Do not
    // start a new hold here; pageplacing began it, and the ready state above remains authoritative.
    document.addEventListener('webbook:pagechange', finishPlacementForPage);
    finishPlacementForPage();
    registerAction({ id: 'copy-position-link', label: 'Copy link to this place', group: 'Navigation',
        defaultKeys: [], run: copyPositionLink,
        isAvailable: () => Boolean(navigator.clipboard?.writeText) });
}
