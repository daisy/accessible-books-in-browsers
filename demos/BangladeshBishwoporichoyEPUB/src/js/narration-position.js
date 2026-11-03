import { elmForCue } from './cue-selector.js';

const NARRATION_HIGHLIGHT_NAME = 'narration';

let currentNarrationHighlight = null;
let lastNarratedElm = null;

// The element narration most recently reached, kept through pauses and gaps between phrases
export function lastNarratedElement() {
    return lastNarratedElm?.isConnected ? lastNarratedElm : null;
}

export function highlightElm(elm) {
    clearNarrationHighlight();
    lastNarratedElm = elm;

    const highlights = customHighlightRegistry();
    if (highlights) {
        const range = document.createRange();
        range.selectNodeContents(elm);
        currentNarrationHighlight = new Highlight(range);
        highlights.set(NARRATION_HIGHLIGHT_NAME, currentNarrationHighlight);
    }
    const rect = elm.getBoundingClientRect();
    const viewport = readingViewport();
    if (rect.top < viewport.top || rect.bottom > viewport.bottom) {
        scrollIntoReadingViewport(elm, viewport);
    }
}

export function clearNarrationHighlight() {
    const highlights = customHighlightRegistry();
    const registeredHighlight = highlights?.get?.(NARRATION_HIGHLIGHT_NAME);

    if (currentNarrationHighlight && currentNarrationHighlight !== registeredHighlight) {
        currentNarrationHighlight.clear?.();
    }
    registeredHighlight?.clear?.();
    currentNarrationHighlight = null;

    highlights?.delete(NARRATION_HIGHLIGHT_NAME);
}

function customHighlightRegistry() {
    if (typeof CSS === 'undefined' || !CSS.highlights || typeof Highlight === 'undefined') return null;
    return CSS.highlights;
}

function readingViewport() {
    const top = visibleOverlayHeight('#webbook-top-toolbar');
    const bottomToolbarHeight = visibleOverlayHeight('#webbook-toolbar');

    const bottom = window.innerHeight - bottomToolbarHeight;
    return {
        top,
        bottom: Math.max(top, bottom),
    };
}

function visibleOverlayHeight(selector) {
    const overlay = document.querySelector(selector);
    if (!overlay) return 0;

    const style = window.getComputedStyle?.(overlay);
    if (style?.display === 'none' || style?.visibility === 'hidden') return 0;

    const opacity = style ? parseFloat(style.opacity) : 1;
    const isVisible = overlay.classList.contains('visible')
        || overlay.contains(document.activeElement)
        || (Number.isFinite(opacity) && opacity > 0.01);
    if (!isVisible) return 0;

    return overlay.getBoundingClientRect().height || overlay.offsetHeight || 0;
}

function scrollIntoReadingViewport(elm, viewport) {
    const rect = elm.getBoundingClientRect();
    const elementCenter = window.scrollY + rect.top + (rect.height / 2);
    const viewportCenter = viewport.top + ((viewport.bottom - viewport.top) / 2);

    window.scrollTo({
        top: Math.max(0, elementCenter - viewportCenter),
    });
}

// Keep the URL hash pointed at the currently-narrated element (write side of deep-linking).
// Uses replaceState (not location.hash) so it never triggers a native scroll-jump or
// pollutes browser history — only the address bar reflects the current position.
export function syncHashToElement(elm) {
    if (!elm?.id) return;
    const target = `#${elm.id}`;
    if (window.location.hash === target) return;
    history.replaceState(null, '', target);
}

// Read side: when the URL's hash points somewhere (a deep link, a TOC/footnote jump, or a
// resumed position), seek playback to the cue for that element so narration continues from the
// right place instead of the very start of the page. Returns whether it seeked.
export function seekToHashTarget(audio, track, hash = window.location.hash) {
    const id = decodeURIComponent((hash || '').replace(/^#/, ''));
    if (!id) return false;
    const target = document.getElementById(id);
    if (!target) return false;

    const cue = cueForTarget(target, Array.from(track.cues || []));
    if (!cue) return false;
    audio.currentTime = cue.startTime;
    return true;
}

// Links often point at a container (a section, or a heading's wrapper) rather than at a narrated
// element, so this falls back from an exact match to the first narrated element inside the
// target, then to a narrated element around it, then to the first one after it.
function cueForTarget(target, cues) {
    const cueElms = cues.map(cue => ({ cue, elm: elmForCue(cue) })).filter(({ elm }) => elm);
    const match = cueElms.find(({ elm }) => elm === target)
        || cueElms.find(({ elm }) => target.contains(elm))
        || cueElms.find(({ elm }) => elm.contains(target))
        || cueElms.find(({ elm }) => target.compareDocumentPosition(elm) & Node.DOCUMENT_POSITION_FOLLOWING);
    return match?.cue ?? null;
}
