import { elmForCue } from './cue-selector.js';

const NARRATION_HIGHLIGHT_NAME = 'narration';

let currentNarrationHighlight = null;

export function highlightElm(elm) {
    clearNarrationHighlight();

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

// Read side: on load, if the URL already has a hash (a deep link, a TOC/footnote jump that
// landed here, or a resumed position), seek playback to the cue matching that element so
// narration continues from the right place instead of the very start of the page.
export function seekToHashTarget(audio, track) {
    const id = decodeURIComponent((window.location.hash || '').replace(/^#/, ''));
    if (!id) return;
    const target = document.getElementById(id);
    if (!target) return;

    const cues = Array.from(track.cues || []);
    const cue = cues.find(c => elmForCue(c) === target)
        || cues.find(c => { const e = elmForCue(c); return e && e.contains(target); });
    if (cue) audio.currentTime = cue.startTime;
}
