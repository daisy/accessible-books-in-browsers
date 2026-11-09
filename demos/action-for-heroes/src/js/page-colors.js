// The reader's own text and background colors for the book (#19): a few reviewed pairs, or their
// own (the text color can follow the background: black or white, whichever reads better). They
// replace the book's colors and the reader UI's colors together. The narration highlight, search highlight and focus outlines
// are worked out against the chosen background. A pair under 4.5:1 is warned about, not refused:
// some readers need low contrast. Under forced colors the system's colors win, as for everything.

import { contrastRatio, pageColorTokens, parseColor, readableTextOn, toHex } from './color-contrast.js';
import { updateHighlightColors } from './highlight-settings.js';
import { announceReaderAction } from './reader-actions.js';
import { optionElement, readSetting, writeSetting } from './stored-settings.js';

const COLORS_KEY = 'webbook-colors';
const TEXT_KEY = 'webbook-colors-text';
const TEXT_AUTO_KEY = 'webbook-colors-text-auto';
const BACKGROUND_KEY = 'webbook-colors-background';
// Per book: while on, this book's choices are also the default for books without their own
const SHARE_KEY = 'webbook-colors-share';
const BOOK_DEFAULT = 'book-default';
// [value, label, text, background]; each at least 7:1 (WCAG's AAA level for text)
const PRESETS = [
    ['cream', 'Black on cream', '#000000', '#faf4e1'],
    ['sepia', 'Dark brown on sepia', '#3b2a1a', '#f4ecd8'],
    ['gray', 'Light gray on dark gray', '#e6e6e6', '#1f1f1f'],
    ['blue', 'Yellow on dark blue', '#ffeb3b', '#0b1f4b']
];
const STANDARD = [
    ['auto', 'Automatic (system light or dark)'],
    ['light', 'Light'],
    ['dark', 'Dark']
];
const MIN_CONTRAST = 4.5;
// Read by the inline script in each page's head (frozen by the contract), which picks the light or
// dark base before the first paint. Kept in step with the colors chosen here, so a page loads
// without a flash of the other one.
const APPEARANCE_KEY = 'webbook-appearance';
const MIGRATED_KEY = 'webbook-appearance-migrated';
const systemDark = () => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;

function colorRow(id, text) {
    const label = document.createElement('label');
    label.htmlFor = id;
    label.textContent = text;
    const input = document.createElement('input');
    input.type = 'color';
    input.id = id;
    input.setAttribute('aria-describedby', 'webbook-colors-contrast');
    return [label, input];
}

function getBookId() {
    return document.querySelector('meta[name="webbook-book-id"]')?.content?.trim() || '';
}

export function bookColorSettingKey(key, bookId = getBookId()) {
    return bookId ? `${key}:${bookId}` : key;
}

function readBookColorSetting(key) {
    const bookId = getBookId();
    const local = bookId ? readSetting(bookColorSettingKey(key, bookId)) : null;
    if (local !== null) return key === COLORS_KEY && local === BOOK_DEFAULT ? '' : local;
    return readSetting(key);
}

function writeBookColorSetting(key, value) {
    const bookId = getBookId();
    if (!bookId) writeSetting(key, value);
    else writeSetting(bookColorSettingKey(key, bookId), key === COLORS_KEY && !value ? BOOK_DEFAULT : value);
}

// The UI creates these settings itself, so books converted before they existed get them too
function buildSettings() {
    if (document.getElementById('webbook-colors')) return;
    const appearance = document.getElementById('webbook-appearance');
    if (!appearance) return;
    const row = document.createElement('div');
    row.id = 'webbook-colors';
    const label = document.createElement('label');
    label.htmlFor = 'webbook-colors-options';
    label.textContent = 'Colors';
    const select = document.createElement('select');
    select.id = 'webbook-colors-options';
    select.append(optionElement('', 'Book colors'));
    for (const [value, text] of STANDARD) select.append(optionElement(value, text));
    for (const [value, text] of PRESETS) select.append(optionElement(value, text));
    select.append(optionElement('custom', 'Custom'));
    row.append(label, select);

    const custom = document.createElement('div');
    custom.id = 'webbook-colors-custom';
    custom.hidden = true;
    const contrast = document.createElement('p');
    contrast.id = 'webbook-colors-contrast';
    const autoLabel = document.createElement('label');
    autoLabel.htmlFor = 'webbook-colors-text-auto-toggle';
    autoLabel.textContent = 'Automatic text color';
    const autoToggle = document.createElement('input');
    autoToggle.type = 'checkbox';
    autoToggle.id = 'webbook-colors-text-auto-toggle';
    custom.append(...colorRow('webbook-colors-background-picker', 'Background color'), autoLabel, autoToggle,
        ...colorRow('webbook-colors-text-picker', 'Text color'), contrast);

    const shareRow = document.createElement('div');
    shareRow.id = 'webbook-colors-share';
    const shareLabel = document.createElement('label');
    shareLabel.htmlFor = 'webbook-colors-share-toggle';
    shareLabel.textContent = 'Use these colors for other books';
    const shareToggle = document.createElement('input');
    shareToggle.type = 'checkbox';
    shareToggle.id = 'webbook-colors-share-toggle';
    shareRow.append(shareLabel, shareToggle);
    appearance.replaceWith(row, custom, shareRow);
}

// The light or dark base for a choice: the system's for the book's colors and Automatic, and for
// the others whichever their background is
function schemeFor(choice, background) {
    if (!choice || choice === 'auto') return 'auto';
    return background ? pageColorTokens(readableTextOn(background), background).scheme : 'auto';
}

function applyScheme(scheme) {
    writeSetting(APPEARANCE_KEY, scheme);
    const dark = scheme === 'dark' || (scheme === 'auto' && systemDark());
    for (const element of [document.documentElement, document.body]) {
        element.classList.toggle('webbook-dark', dark);
        element.classList.toggle('webbook-light', !dark);
    }
}

function contrastMessage(text, background) {
    // Rounded down, so a pair just under 4.5:1 doesn't show as 4.5
    const ratio = Math.floor(contrastRatio(text, background) * 10) / 10;
    return ratio < MIN_CONTRAST
        ? `Contrast ${ratio}:1. This text may be hard to read.`
        : `Contrast ${ratio}:1.`;
}

function apply(text, background) {
    const root = document.documentElement;
    const properties = ['--webbook-page-fg', '--webbook-page-bg', '--webbook-page-focus', '--webbook-page-muted',
        '--webbook-page-search-bg', '--webbook-page-search-fg', '--webbook-page-scheme'];
    if (!text || !background) {
        root.removeAttribute('data-webbook-colors');
        for (const property of properties) root.style.removeProperty(property);
    } else {
        const tokens = pageColorTokens(text, background);
        const values = [toHex(text), toHex(background), toHex(tokens.focus), toHex(tokens.muted),
            toHex(tokens.searchBackground), toHex(tokens.searchText), tokens.scheme];
        properties.forEach((property, i) => root.style.setProperty(property, values[i]));
        root.setAttribute('data-webbook-colors', '');
    }
    // The page behind the phrase has changed
    updateHighlightColors();
}

function presetColors(value) {
    if (value === 'auto') value = window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    if (value === 'light') return [parseColor('#111111'), parseColor('#fafafa')];
    if (value === 'dark') return [parseColor('#ffffff'), parseColor('#000000')];
    const preset = PRESETS.find(([presetValue]) => presetValue === value);
    return preset ? [parseColor(preset[2]), parseColor(preset[3])] : [null, null];
}

export function initPageColors() {
    buildSettings();
    const select = document.getElementById('webbook-colors-options');
    const custom = document.getElementById('webbook-colors-custom');
    const textPicker = document.getElementById('webbook-colors-text-picker');
    const autoToggle = document.getElementById('webbook-colors-text-auto-toggle');
    const backgroundPicker = document.getElementById('webbook-colors-background-picker');
    const contrast = document.getElementById('webbook-colors-contrast');
    const shareToggle = document.getElementById('webbook-colors-share-toggle');

    // Before this setting, Appearance chose light or dark; a reader who chose one keeps it. Once:
    // from then on, Appearance follows the colors chosen here.
    if (readSetting(MIGRATED_KEY) === null) {
        const legacy = readSetting(APPEARANCE_KEY);
        if (readSetting(COLORS_KEY) === null && (legacy === 'light' || legacy === 'dark')) writeSetting(COLORS_KEY, legacy);
        writeSetting(MIGRATED_KEY, 'true');
    }
    const savedValue = readBookColorSetting(COLORS_KEY) || '';
    const migratedValue = savedValue === 'white' ? 'light' : savedValue === 'black' ? 'dark' : savedValue;
    const value = migratedValue === 'custom' || STANDARD.some(([choice]) => choice === migratedValue)
        || PRESETS.some(([presetValue]) => presetValue === migratedValue) ? migratedValue : '';
    const savedText = parseColor(readBookColorSetting(TEXT_KEY));
    const savedBackground = parseColor(readBookColorSetting(BACKGROUND_KEY));
    // A custom pair starts from the theme's colors
    const themeText = parseColor(window.getComputedStyle(document.body).color) || parseColor('#111111');
    const themeBackground = parseColor(window.getComputedStyle(document.body).backgroundColor) || parseColor('#fafafa');
    if (textPicker) textPicker.value = toHex(savedText?.a === 1 ? savedText : themeText);
    if (backgroundPicker) backgroundPicker.value = toHex(savedBackground?.a === 1 ? savedBackground : themeBackground);

    if (autoToggle) autoToggle.checked = readBookColorSetting(TEXT_AUTO_KEY) !== 'false';
    // With automatic text, the text picker shows the color in use and can't be changed
    const followBackground = (persist = true) => {
        const auto = autoToggle?.checked ?? false;
        if (textPicker) textPicker.disabled = auto;
        const background = parseColor(backgroundPicker?.value);
        if (!auto || !background || !textPicker) return;
        textPicker.value = toHex(readableTextOn(background));
        // Kept, so turning it off starts from the color in use
        if (persist) writeBookColorSetting(TEXT_KEY, textPicker.value);
    };
    followBackground(false);

    const current = choice => choice === 'custom'
        ? [parseColor(textPicker?.value), parseColor(backgroundPicker?.value)]
        : presetColors(choice);
    const showChoice = choice => {
        if (custom) custom.hidden = choice !== 'custom';
        const [text, background] = current(choice);
        apply(text, background);
        applyScheme(schemeFor(choice, background));
        if (contrast && choice === 'custom' && text && background) contrast.textContent = contrastMessage(text, background);
    };
    showChoice(value);
    const systemScheme = window.matchMedia?.('(prefers-color-scheme: dark)');
    // The book's colors and Automatic follow the system's light or dark as it changes
    systemScheme?.addEventListener('change', () => {
        const choice = select?.value ?? value;
        if (!choice || choice === 'auto') showChoice(choice);
    });
    if (!select) return;
    select.value = value;
    // While sharing is on, each change here is also the default for other books
    const shareChoice = () => {
        if (!shareToggle?.checked) return;
        writeSetting(COLORS_KEY, select.value);
        writeSetting(TEXT_KEY, textPicker?.value || '');
        writeSetting(BACKGROUND_KEY, backgroundPicker?.value || '');
        writeSetting(TEXT_AUTO_KEY, String(autoToggle?.checked ?? true));
    };
    if (shareToggle) shareToggle.checked = readSetting(bookColorSettingKey(SHARE_KEY)) === 'true';
    shareToggle?.addEventListener('change', () => {
        writeSetting(bookColorSettingKey(SHARE_KEY), shareToggle.checked ? 'true' : '');
        shareChoice();
    });
    select.addEventListener('change', () => {
        writeBookColorSetting(COLORS_KEY, select.value);
        showChoice(select.value);
        shareChoice();
    });
    for (const [picker, key] of [[textPicker, TEXT_KEY], [backgroundPicker, BACKGROUND_KEY]]) {
        // While a color is being picked, the page follows; the ratio is announced once it's chosen
        picker?.addEventListener('input', () => {
            if (picker === backgroundPicker) followBackground();
            writeBookColorSetting(key, picker.value);
            showChoice('custom');
            shareChoice();
        });
        picker?.addEventListener('change', () => {
            if (contrast) announceReaderAction(contrast.textContent);
        });
    }
    autoToggle?.addEventListener('change', () => {
        writeBookColorSetting(TEXT_AUTO_KEY, String(autoToggle.checked));
        followBackground();
        showChoice('custom');
        shareChoice();
        if (contrast) announceReaderAction(contrast.textContent);
    });
}
