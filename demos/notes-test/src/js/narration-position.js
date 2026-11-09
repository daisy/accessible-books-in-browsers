import { cueAtTime, elmForCue } from './cue-selector.js';

const NARRATION_HIGHLIGHT_NAME = 'narration';

let currentNarrationHighlight = null;
let lastNarratedElm = null;
let pendingReadingLineElement = null;

// The element narration most recently reached, kept through pauses and gaps between phrases
export function lastNarratedElement() {
    return lastNarratedElm?.isConnected ? lastNarratedElm : null;
}

export function highlightElm(elm, placement = 'nearest') {
    const changed = lastNarratedElm !== elm;
    lastNarratedElm = elm;
    if (changed) document.dispatchEvent(new CustomEvent('webbook:narrationpositionchange', { detail: { element: elm } }));

    const highlights = customHighlightRegistry();
    if (highlights) {
        const range = document.createRange();
        range.selectNodeContents(elm);
        // One registered highlight whose range is swapped, rather than a new highlight per phrase:
        // Safari doesn't fully repaint a removed highlight and leaves a sliver of it behind
        if (!currentNarrationHighlight || highlights.get(NARRATION_HIGHLIGHT_NAME) !== currentNarrationHighlight) {
            currentNarrationHighlight = new Highlight();
            highlights.set(NARRATION_HIGHLIGHT_NAME, currentNarrationHighlight);
        }
        currentNarrationHighlight.clear();
        currentNarrationHighlight.add(range);
    }
    const rect = elm.getBoundingClientRect();
    const viewport = readingViewport();
    if (placement === 'reading-line') {
        scrollToReadingLine(elm);
    } else if (placement !== 'none' && (rect.top < viewport.top || rect.bottom > viewport.bottom)) {
        scrollIntoReadingViewport(elm, viewport);
    }
}

export function clearNarrationHighlight() {
    currentNarrationHighlight?.clear();
    const highlights = customHighlightRegistry();
    const registeredHighlight = highlights?.get?.(NARRATION_HIGHLIGHT_NAME);
    if (registeredHighlight && registeredHighlight !== currentNarrationHighlight) registeredHighlight.clear?.();
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

export function readingLine() {
    const bottom = document.querySelector('#webbook-top-toolbar')?.getBoundingClientRect().bottom || 0;
    return Math.max(0, bottom) + 48;
}

function scrollToReadingLine(elm) {
    const rect = elm.getBoundingClientRect();
    window.scrollTo({ top: Math.max(0, window.scrollY + rect.top - readingLine()) });
}

// Track loading and toolbar setup can change layout immediately after the initial hash seek. Place
// the phrase once more after two paints, while browser-bookmarks still holds position tracking.
export function settlePositionUrlPlacement() {
    const elm = pendingReadingLineElement;
    pendingReadingLineElement = null;
    if (!elm || !new URL(window.location.href).searchParams.has('t')) return;
    if (typeof window.requestAnimationFrame !== 'function') {
        if (elm.isConnected) scrollToReadingLine(elm);
        return;
    }
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
        if (elm.isConnected) scrollToReadingLine(elm);
    }));
}

export function positionAnchor(elm) {
    const main = document.querySelector('main');
    if (!elm || !main?.contains(elm)) return null;
    const own = elm.closest('[id]');
    if (own && main.contains(own)) return own;

    // A note or note reference may occur between two paragraphs, but it does not
    // describe the following paragraph's location. Prefer a containing structure,
    // then the nearest preceding section boundary or heading.
    const positionAnchors = [
        'h1[id]', 'h2[id]', 'h3[id]', 'h4[id]', 'h5[id]', 'h6[id]',
        '[role="heading"][id]', 'section[id]', 'article[id]',
        '[role="doc-chapter"][id]', '[role="doc-part"][id]',
        '[role="doc-preface"][id]', '[role="doc-appendix"][id]',
        '[epub\\:type~="chapter"][id]', '[epub\\:type~="part"][id]',
        '[epub\\:type~="preface"][id]', '[epub\\:type~="appendix"][id]'
    ].join(',');
    let previous = null;
    for (const candidate of main.querySelectorAll(positionAnchors)) {
        if (candidate === elm || candidate.contains(elm)
            || candidate.compareDocumentPosition(elm) & Node.DOCUMENT_POSITION_FOLLOWING) previous = candidate;
        else break;
    }
    return previous;
}

export function positionUrlForElement(elm, time) {
    const anchor = positionAnchor(elm);
    const hasTime = typeof time === 'number' && Number.isFinite(time);
    if (!anchor?.id && !hasTime) return null;
    const url = new URL(window.location.href);
    if (hasTime) url.searchParams.set('t', String(Math.round(time * 1000) / 1000));
    else url.searchParams.delete('t');
    url.hash = anchor?.id ? encodeURIComponent(anchor.id) : '';
    return url;
}

// Keep the URL pointed at the reading position (write side of deep-linking). Uses replaceState
// (not location.hash) so it never triggers a native scroll-jump or pollutes browser history —
// only the address bar reflects the current position.
export function syncPositionUrl(elm, time) {
    const url = positionUrlForElement(elm, time);
    if (!url || url.href === window.location.href) return false;
    history.replaceState(history.state, '', url.href);
    return true;
}

export function positionFromUrl(url = new URL(window.location.href)) {
    const raw = url.searchParams.get('t');
    const time = raw === null ? null : Number(raw);
    const id = url.hash ? decodeURIComponent(url.hash.slice(1)) : '';
    return { anchor: id ? document.getElementById(id) : null, time: Number.isFinite(time) ? time : null };
}

// The narration time for the place the URL points at: its t, or else the start of the phrase its
// #id leads to (a book converted before t existed). Narration's own time when it's still within
// that phrase, so a pause mid-phrase is kept. Narration's time when the URL gives no place.
export function readingPositionTime(audio) {
    const cues = Array.from(audio?.textTracks?.[0]?.cues || []);
    const { anchor, time } = positionFromUrl();
    const target = time ?? (anchor ? cueForTarget(anchor, cues)?.startTime : undefined);
    if (typeof target !== 'number') return audio.currentTime;
    const narrating = cueAtTime(cues, audio.currentTime);
    return narrating && narrating === cueAtTime(cues, target) ? audio.currentTime : target;
}

// Read side: when the URL's hash points somewhere (a deep link, a TOC/footnote jump, or a
// resumed position), seek playback to the cue for that element so narration continues from the
// right place instead of the very start of the page. Returns whether it seeked.
export function seekToHashTarget(audio, track, hash = window.location.hash, { place = true } = {}) {
    const id = decodeURIComponent((hash || '').replace(/^#/, ''));
    const position = positionFromUrl();
    const target = id ? document.getElementById(id) : null;
    if (id && !target) return false;
    if (position.time !== null) {
        const cue = cueAtTime(Array.from(track.cues || []), position.time);
        const elm = cue ? elmForCue(cue) : null;
        if (elm && (!target || target === elm || target.contains(elm) || positionAnchor(elm) === target)) {
            audio.currentTime = position.time;
            // Bookmark tracking reads at this same line after the scroll settles. Using the same
            // placement prevents a copied URL from drifting earlier each time it is reopened.
            highlightElm(elm, place ? 'reading-line' : 'none');
            pendingReadingLineElement = place ? elm : null;
            return true;
        }
    }

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
