// Color parsing and WCAG contrast math, for the narration highlight (and later custom text and
// background colors, #19). Colors are { r, g, b, a } with r, g and b from 0 to 255 and a from 0 to 1.

// The automatic highlight on a light page is a highlighter: soft yellow, or light blue where the
// page is itself yellowish (cream, sepia), with black text (LIGHT_PAGE_PALETTE). It doesn't reach
// 3:1 against the page, and WCAG AA doesn't ask that of it: the text on it has far more than 4.5:1,
// and a reader who can't tell it from the page has the underline style or a color of their own
// (user, 2026-11-10; amber, which reaches 3:1 on white, looked too dark, with white text or black).
//
// Elsewhere, the backgrounds in order of preference: the first with at least 3:1 against the page
// behind the phrase is used. Yellow is the familiar highlight on dark pages. Amber (5.87:1 on white,
// 3.58:1 on black) is for an unknown page that may be light or dark. Cyan and violet are for backgrounds of their own that neither suits, and the pale yellow
// and navy for mid-tones: with them, every opaque background has a color with at least 3:1 (the
// lowest is 3.44:1, on #5f87a0).
export const HIGHLIGHT_PALETTE = ['#ffdd00', '#a14d00', '#7fdbff', '#5b3cc4', '#fff59d', '#1a237e'];
// For an underline below a highlight background, on the page: black or white first, so it doesn't
// look like part of the background, then the palette for when the page isn't known
const LINE_BELOW_PALETTE = ['#000000', '#ffffff', ...HIGHLIGHT_PALETTE];
export const MIN_HIGHLIGHT_CONTRAST = 3;
// Soft yellow; light blue for yellowish pages (cream); a stronger blue for tan ones (sepia)
export const LIGHT_PAGE_PALETTE = ['#ffe066', '#9fd3ff', '#7cc3ff'];
// Enough to tell a light highlight from a light page: soft yellow has 1.3:1 on white, but only 1.18:1
// on cream, where light blue is used instead
export const MIN_LIGHT_PAGE_DIFFERENCE = 1.2;
export const MIN_TEXT_CONTRAST = 4.5;

const BLACK = { r: 0, g: 0, b: 0, a: 1 };
const WHITE = { r: 255, g: 255, b: 255, a: 1 };

// The forms getComputedStyle gives (rgb(), rgba(), color(srgb …) for color-mix()), plus hex and
// transparent. Anything else (other color spaces, keywords) is null: not known.
export function parseColor(value) {
    const text = String(value ?? '').trim().toLowerCase();
    if (text === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };
    const hex = text.match(/^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/);
    if (hex) {
        const digits = hex[1].length <= 4 ? [...hex[1]].map(digit => digit + digit).join('') : hex[1];
        const [r, g, b, a = 255] = digits.match(/../g).map(pair => parseInt(pair, 16));
        return { r, g, b, a: a / 255 };
    }
    const rgb = text.match(/^rgba?\(([^)]*)\)$/);
    if (rgb) {
        const parts = rgb[1].split(/[\s,/]+/).filter(Boolean);
        if (parts.length < 3) return null;
        const [r, g, b] = parts.slice(0, 3).map(part => part.endsWith('%') ? parseFloat(part) * 2.55 : parseFloat(part));
        return finite({ r, g, b, a: alpha(parts[3]) });
    }
    const srgb = text.match(/^color\(srgb\s+([^)]*)\)$/);
    if (srgb) {
        const parts = srgb[1].split(/[\s/]+/).filter(Boolean);
        if (parts.length < 3) return null;
        const [r, g, b] = parts.slice(0, 3).map(part => (part.endsWith('%') ? parseFloat(part) / 100 : parseFloat(part)) * 255);
        return finite({ r, g, b, a: alpha(parts[3]) });
    }
    return null;
}

function alpha(part) {
    if (part === undefined) return 1;
    return part.endsWith('%') ? parseFloat(part) / 100 : parseFloat(part);
}

function finite(color) {
    return Object.values(color).every(Number.isFinite) ? color : null;
}

export function toHex({ r, g, b }) {
    return `#${[r, g, b].map(channel => Math.round(Math.max(0, Math.min(255, channel))).toString(16).padStart(2, '0')).join('')}`;
}

// A partly transparent color over an opaque one
export function composite(top, bottom) {
    const mix = channel => top[channel] * top.a + bottom[channel] * (1 - top.a);
    return { r: mix('r'), g: mix('g'), b: mix('b'), a: 1 };
}

export function relativeLuminance({ r, g, b }) {
    const [red, green, blue] = [r, g, b].map(channel => {
        const value = channel / 255;
        return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
    });
    return .2126 * red + .7152 * green + .0722 * blue;
}

export function contrastRatio(first, second) {
    const [lighter, darker] = [relativeLuminance(first), relativeLuminance(second)].sort((x, y) => y - x);
    return (lighter + .05) / (darker + .05);
}

// Black or white, whichever contrasts more. One of them always reaches 4.5:1 with any opaque color.
export function readableTextOn(background) {
    return contrastRatio(background, BLACK) >= contrastRatio(background, WHITE) ? BLACK : WHITE;
}

// The palette color for a highlight on these backgrounds: the first with at least 3:1 against all
// of them, or else the one whose lowest contrast among them is highest. One background when it is
// known; several when it isn't (the worst case).
export function pickHighlight(backgrounds, palette = HIGHLIGHT_PALETTE) {
    const colors = palette.map(parseColor);
    const worst = color => Math.min(...backgrounds.map(background => contrastRatio(color, background)));
    const passing = colors.find(color => worst(color) >= MIN_HIGHLIGHT_CONTRAST);
    return passing || colors.reduce((best, color) => worst(color) > worst(best) ? color : best);
}

// The automatic narration highlight: on light pages (black text reads better than white on every one
// of them), the first light color that stands out from all of them enough; otherwise, or if none
// does, as pickHighlight
export function automaticHighlight(backgrounds) {
    const light = backgrounds.length && backgrounds.every(background => readableTextOn(background) === BLACK);
    if (light) {
        const colors = LIGHT_PAGE_PALETTE.map(parseColor);
        const found = colors.find(color => backgrounds.every(background => contrastRatio(color, background) >= MIN_LIGHT_PAGE_DIFFERENCE));
        if (found) return found;
    }
    return pickHighlight(backgrounds);
}

// The highlight's colors on these backgrounds (as for pickHighlight), for the reader's color (a CSS
// color, or null for automatic) and style ('background', 'underline' or 'both'):
// - background: the reader's color, or the palette's
// - text: black or white on it
// - line: the underline, with 3:1 against the page. Under an underline alone, the highlight
//   color when it reaches that, else black or white. With the background too, the line falls
//   below the background, on the page, so black or white: in the highlight's color it would only
//   look like a taller background.
export function highlightColors(backgrounds, customColor = null, style = 'background') {
    const custom = customColor ? parseColor(customColor) : null;
    const background = custom?.a === 1 ? custom : automaticHighlight(backgrounds);
    const line = style === 'both'
        ? pickHighlight(backgrounds, LINE_BELOW_PALETTE)
        : pickHighlight(backgrounds, [toHex(background), ...LINE_BELOW_PALETTE]);
    return { background, text: readableTextOn(background), line };
}

// Focus outlines, the search highlight and quiet text (page numbers) inside the book's text, for
// the reader's own text and background colors (#19). The focus color has 3:1 against the
// background; the search highlight too, and it differs from the narration highlight there, so the
// two can be told apart.
const FOCUS_PALETTE = ['#005fcc', '#8ec5ff'];
const SEARCH_PALETTE = ['#005fcc', '#d65db1', ...HIGHLIGHT_PALETTE];
export function pageColorTokens(text, background) {
    const narration = toHex(automaticHighlight([background]));
    const search = pickHighlight([background], SEARCH_PALETTE.filter(color => color !== narration));
    return {
        focus: pickHighlight([background], [...FOCUS_PALETTE, toHex(text), '#000000', '#ffffff']),
        searchBackground: search,
        searchText: readableTextOn(search),
        muted: text,
        scheme: relativeLuminance(background) < .18 ? 'dark' : 'light'
    };
}
