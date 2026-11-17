// As published, the reader's toolbars, panels and the margins around the text take the book's own
// colours, so the page is one surface; Page colors is hidden then, and the reader's theme
// would otherwise sit around the publisher's page (user, 2026-11-16). The book's background and
// text colour are read from <main>, where the publisher's CSS puts them (white and black when it
// sets none), and turned into the same tokens custom page colours use. The UI must still pass
// WCAG AA: where the publisher's text colour is too faint on its background, the UI uses black or
// white instead. Read again on each page, since a book's pages can differ.
import { MIN_TEXT_CONTRAST, composite, contrastRatio, pageColorTokens, parseColor, readableTextOn, toHex } from './color-contrast.js';
import { publishedAppearanceActive } from './appearance-state.js';
import { updateHighlightColors } from './highlight-settings.js';

const WHITE = { r: 255, g: 255, b: 255, a: 1 };
const PROPERTIES = ['--webbook-published-fg', '--webbook-published-bg', '--webbook-published-focus', '--webbook-published-muted',
    '--webbook-published-search-bg', '--webbook-published-search-fg', '--webbook-published-scheme'];
const ATTRIBUTE = 'data-webbook-published-colors';

// The book's text and background on this page, both opaque, the text readable on the background
export function bookColors() {
    const main = document.querySelector('main');
    if (!main) return null;
    const style = window.getComputedStyle(main);
    let background = parseColor(style.backgroundColor);
    background = !background || background.a === 0 ? WHITE : background.a < 1 ? composite(background, WHITE) : background;
    let text = parseColor(style.color) ?? readableTextOn(background);
    if (text.a < 1) text = composite(text, background);
    if (contrastRatio(text, background) < MIN_TEXT_CONTRAST) text = readableTextOn(background);
    return [text, background];
}

function clear(root) {
    root.removeAttribute(ATTRIBUTE);
    for (const property of PROPERTIES) root.style.removeProperty(property);
}

// Called by page-colors.js whenever the colours are applied; returns the scheme in use, or null
export function applyPublishedColors() {
    const root = document.documentElement;
    if (!publishedAppearanceActive()) {
        clear(root);
        return null;
    }
    // Read the publisher's colours without our own on the page, so nothing feeds back
    clear(root);
    const pair = bookColors();
    if (!pair) return null;
    const [text, background] = pair;
    const tokens = pageColorTokens(text, background);
    const values = [toHex(text), toHex(background), toHex(tokens.focus), toHex(tokens.muted),
        toHex(tokens.searchBackground), toHex(tokens.searchText), tokens.scheme];
    PROPERTIES.forEach((property, i) => root.style.setProperty(property, values[i]));
    root.setAttribute(ATTRIBUTE, '');
    // The reader's light or dark rules follow the book, without changing the saved theme
    for (const element of [root, document.body]) {
        element.classList.toggle('webbook-dark', tokens.scheme === 'dark');
        element.classList.toggle('webbook-light', tokens.scheme !== 'dark');
    }
    updateHighlightColors();
    return tokens.scheme;
}

// The publisher's stylesheets can finish loading after the reader starts; read the colours again then
export function watchPublishedStyles(update) {
    for (const link of document.querySelectorAll('link[data-webbook-publisher-style]')) {
        if (link.dataset.webbookColorsWatched) continue;
        link.dataset.webbookColorsWatched = 'true';
        link.addEventListener('load', update);
    }
}
