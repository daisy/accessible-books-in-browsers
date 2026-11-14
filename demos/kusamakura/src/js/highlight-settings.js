// Saved preferences must also be listed in settings-file.js (export, import and reset).
import { appendSetting } from './settings-sections.js';
// The narration highlight: its color (automatic, or the reader's), its style (a background, an
// underline or both), and its contrast. The automatic color is chosen against the background behind
// the phrase being read, so it stands out (3:1) wherever narration is; the text on a highlight
// background is black or white, whichever is more readable (always at least 4.5:1). Under forced
// colors the CSS keeps the system's Mark and MarkText instead.

import { composite, highlightColors, parseColor, toHex } from './color-contrast.js';
import { lastNarratedElement } from './narration-position.js';
import { optionElement, readSetting, writeSetting } from './stored-settings.js';

const AUTO_KEY = 'webbook-highlight-auto';
const COLOR_KEY = 'webbook-highlight-color';
const STYLE_KEY = 'webbook-highlight-style';
const STYLES = [
    ['background', 'Background'],
    ['underline', 'Underline'],
    ['both', 'Background and underline']
];
const WHITE = parseColor('#ffffff');
const BLACK = parseColor('#000000');
// The reader's color, or null for automatic
let customColor = null;
let highlightStyle = 'background';
// What the colors were last worked out for, to skip the work when nothing has changed
let lastBasis = null;

function themeBackground() {
    return parseColor(window.getComputedStyle(document.body).backgroundColor);
}

// The color behind an element: its own background and its ancestors', down to the first opaque one,
// with partly transparent ones mixed in. Null when it can't be known: a background image or
// gradient, a filter, a blend mode, partial opacity, or a color this can't parse. The highlight then
// assumes the worst (see updateHighlightColors). Backgrounds of elements inside the phrase aren't
// considered: the highlight paints over them.
function backgroundBehind(elm) {
    const layers = [];
    for (let node = elm; node?.nodeType === window.Node.ELEMENT_NODE; node = node.parentElement) {
        const style = window.getComputedStyle(node);
        if (style.backgroundImage !== 'none' || style.filter !== 'none' || style.mixBlendMode !== 'normal' || Number(style.opacity) < 1) return null;
        const color = parseColor(style.backgroundColor);
        if (!color) return null;
        if (color.a > 0) layers.push(color);
        if (color.a >= 1) break;
    }
    if (!layers.length || layers.at(-1).a < 1) {
        const theme = themeBackground();
        if (!theme || theme.a < 1) return null;
        layers.push(theme);
    }
    return layers.slice(0, -1).reduceRight((below, layer) => composite(layer, below), layers.at(-1));
}

export function updateHighlightColors(elm = lastNarratedElement()) {
    const known = elm ? backgroundBehind(elm) : themeBackground();
    // Unknown: the theme's background, white and black, so the color works on any of them
    const backgrounds = known?.a === 1 ? [known] : [themeBackground(), WHITE, BLACK].filter(color => color?.a === 1);
    const basis = `${customColor}|${highlightStyle}|${backgrounds.map(toHex).join()}`;
    if (basis === lastBasis) return;
    lastBasis = basis;

    const colors = highlightColors(backgrounds, customColor, highlightStyle);
    const style = document.body.style;
    style.setProperty('--webbook-highlight-bg', toHex(colors.background));
    style.setProperty('--webbook-highlight-fg', toHex(colors.text));
    style.setProperty('--webbook-highlight-line', toHex(colors.line));
}

function applyHighlightStyle(value) {
    highlightStyle = value;
    if (value === 'background') document.documentElement.removeAttribute('data-webbook-highlight-style');
    else document.documentElement.setAttribute('data-webbook-highlight-style', value);
    updateHighlightColors();
}

// The UI creates this setting itself, so books converted before it existed get it too
function buildStyleSetting() {
    let select = document.getElementById('webbook-highlight-style-options');
    if (select) return select;
    const colorRow = document.getElementById('webbook-color');
    if (!colorRow) return null;
    const row = document.createElement('div');
    row.id = 'webbook-highlight-style';
    const label = document.createElement('label');
    label.htmlFor = 'webbook-highlight-style-options';
    label.textContent = 'Highlight style';
    select = document.createElement('select');
    select.id = 'webbook-highlight-style-options';
    for (const [value, text] of STYLES) select.append(optionElement(value, text));
    row.append(label, select);
    appendSetting('colors', row);
    return select;
}

export function initHighlightSettings() {
    const autoToggle = document.querySelector('#webbook-highlight-auto-toggle');
    const colorPicker = document.querySelector('#webbook-color-picker');
    if (autoToggle && colorPicker) {
        const isAuto = readSetting(AUTO_KEY) !== 'false';
        colorPicker.value = readSetting(COLOR_KEY) || '#ffdd00';
        autoToggle.checked = isAuto;
        colorPicker.disabled = isAuto;
        customColor = isAuto ? null : colorPicker.value;

        autoToggle.addEventListener('change', () => {
            writeSetting(AUTO_KEY, String(autoToggle.checked));
            colorPicker.disabled = autoToggle.checked;
            customColor = autoToggle.checked ? null : colorPicker.value;
            updateHighlightColors();
        });
        colorPicker.addEventListener('input', () => {
            writeSetting(COLOR_KEY, colorPicker.value);
            customColor = colorPicker.value;
            updateHighlightColors();
        });
    }

    const select = buildStyleSetting();
    const savedStyle = readSetting(STYLE_KEY);
    const styleValue = STYLES.some(([value]) => value === savedStyle) ? savedStyle : 'background';
    if (select) {
        select.value = styleValue;
        select.addEventListener('change', () => {
            writeSetting(STYLE_KEY, select.value);
            applyHighlightStyle(select.value);
        });
    }
    applyHighlightStyle(styleValue);
    document.addEventListener('webbook:narrationpositionchange', e => updateHighlightColors(e.detail?.element));
    // Appearance (light or dark) changes the page's background
    const observer = new window.MutationObserver(() => {
        lastBasis = null;
        updateHighlightColors();
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
}
