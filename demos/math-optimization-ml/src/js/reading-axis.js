// The direction the text is read in (plan 28). Horizontal text is read down the page, and the page
// scrolls vertically; vertical text (Japanese, Chinese) is read in columns from the right (or the
// left, vertical-lr), and the page scrolls sideways. Everything that keeps or restores a place in
// the text measures along this axis: a position is how far the reader has come from the start.
//
// In vertical-rl the page's scroll origin is its right edge, and window.scrollX runs from 0 to
// negative values as the reader moves on (the browser's own convention).

const root = () => document.documentElement;

// The writing mode the text is shown in: the book's, unless the reader chose horizontal
export function textWritingMode() {
    const r = root();
    if (!r.classList.contains('webbook-vertical')) return 'horizontal-tb';
    return r.getAttribute('data-webbook-writing-mode') === 'vertical-lr' ? 'vertical-lr' : 'vertical-rl';
}

export function isVerticalText() {
    return textWritingMode() !== 'horizontal-tb';
}

// How far along the text the page is scrolled
export function readingScroll() {
    const mode = textWritingMode();
    if (mode === 'vertical-rl') return Math.max(0, -window.scrollX);
    if (mode === 'vertical-lr') return Math.max(0, window.scrollX);
    return window.scrollY;
}

// Scrolls to a position along the text
export function scrollToReading(position, behavior = 'auto') {
    const mode = textWritingMode();
    const value = Math.max(0, position);
    if (mode === 'vertical-rl') window.scrollTo({ left: -value, top: 0, behavior });
    else if (mode === 'vertical-lr') window.scrollTo({ left: value, top: 0, behavior });
    else window.scrollTo({ top: value, left: 0, behavior });
}

// Scrolls by an amount along the text (forward is positive)
export function scrollAlongText(amount, behavior = 'auto') {
    scrollToReading(readingScroll() + amount, behavior);
}

// The length of the window along the reading direction
export function viewportLength() {
    return isVerticalText() ? window.innerWidth : window.innerHeight;
}

// Where an element's box starts and ends along the reading direction, from the start edge of the
// window (the top for horizontal text, the right edge for vertical-rl)
export function readingStart(rect) {
    const mode = textWritingMode();
    if (mode === 'vertical-rl') return window.innerWidth - rect.right;
    if (mode === 'vertical-lr') return rect.left;
    return rect.top;
}

export function readingEnd(rect) {
    const mode = textWritingMode();
    if (mode === 'vertical-rl') return window.innerWidth - rect.left;
    if (mode === 'vertical-lr') return rect.right;
    return rect.bottom;
}

// The extent of a box along the reading direction
export function readingLength(rect) {
    return isVerticalText() ? rect.width : rect.height;
}
