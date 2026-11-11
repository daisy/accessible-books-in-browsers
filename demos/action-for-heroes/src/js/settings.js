// Saved preferences must also be listed in settings-file.js (export, import and reset).
import { appendSetting, settingsSection } from './settings-sections.js';
import { navigateTo } from './in-place-navigation.js';
import { registerAction, announceReaderAction } from './reader-actions.js';
import { pageAudio } from './dom-utils.js';
import { initHighlightSettings } from './highlight-settings.js';
import { initTextSpacing } from './text-spacing.js';
import { initPageColors } from './page-colors.js';
const KEYBOARD_SHORTCUTS_STORAGE_KEY = 'webbook-keyboard-shortcuts';
let shortcutsEnabled = true;
let shortcutsStorageUnavailable = false;

// WCAG 2.1.4: shortcuts made of a single character key must be possible to turn off. Read at
// keypress time so the setting applies without a reload.
export function keyboardShortcutsEnabled() {
    if (!shortcutsStorageUnavailable) {
        try { shortcutsEnabled = localStorage.getItem(KEYBOARD_SHORTCUTS_STORAGE_KEY) !== 'false'; } catch { shortcutsStorageUnavailable = true; }
    }
    return shortcutsEnabled;
}

// The UI creates this setting itself, so books converted before it existed get it too
function initKeyboardShortcuts() {
    const fieldset = settingsSection('keyboard');
    if (!fieldset) return;

    let toggle = document.querySelector('#webbook-keyboard-shortcuts-toggle');
    if (!toggle) {
        const row = document.createElement('div');
        const label = document.createElement('label');
        label.htmlFor = 'webbook-keyboard-shortcuts-toggle';
        label.textContent = 'Keyboard shortcuts';
        toggle = document.createElement('input');
        toggle.type = 'checkbox';
        toggle.id = 'webbook-keyboard-shortcuts-toggle';
        row.append(label, toggle);
        appendSetting('keyboard', row);
    }

    toggle.checked = keyboardShortcutsEnabled();
    toggle.addEventListener('change', () => {
        shortcutsEnabled = toggle.checked;
        try {
            localStorage.setItem(KEYBOARD_SHORTCUTS_STORAGE_KEY, String(toggle.checked));
            shortcutsStorageUnavailable = false;
        } catch { shortcutsStorageUnavailable = true; }
    });
}

function initPageNavigation() {
    const input = document.querySelector('#goto-page');
    const button = document.querySelector('#webbook-goto-page-go');
    const datalist = document.querySelector('#pages');
    if (!input || !button || !datalist) return;

    const goToPage = () => {
        const option = findPageOption(input.value, datalist);
        const href = option?.dataset.href;
        if (!href) {
            input.setAttribute('aria-invalid', 'true');
            return;
        }

        input.removeAttribute('aria-invalid');
        navigateTo(href);
    };

    button.addEventListener('click', goToPage);
    input.addEventListener('keydown', e => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        goToPage();
    });
    input.addEventListener('input', e => {
        input.removeAttribute('aria-invalid');
        // Picking a suggestion goes straight there. Typing doesn't, since "1" may be the start of
        // "12"; a pick arrives as replacement text, or with no inputType where that isn't reported.
        const picked = e.inputType === 'insertReplacementText' || e.inputType === undefined;
        if (picked && findPageOption(input.value, datalist)) goToPage();
    });
}

function findPageOption(value, datalist) {
    const normalizedValue = value.trim().toLowerCase();
    if (!normalizedValue) return null;

    return Array.from(datalist.options).find(option => {
        const optionValue = option.value.trim().toLowerCase();
        const optionLabel = option.label.trim().toLowerCase();
        return optionValue === normalizedValue || optionLabel === normalizedValue;
    }) ?? null;
}

function initFontSize() {
    const range = document.querySelector('#webbook-font-size-range');
    const reset = document.querySelector('#webbook-reset-font-size');
    if (!range) return;

    const size = localStorage.getItem('webbook-font-size') || '100';
    range.value = size;
    applyFontSize(size);

    range.addEventListener('input', () => applyFontSize(range.value));
    reset?.addEventListener('click', () => {
        range.value = '100';
        applyFontSize('100');
    });
}

function applyFontSize(size) {
    const numericSize = parseInt(size, 10);
    const normalizedSize = Number.isFinite(numericSize) ? numericSize : 100;
    localStorage.setItem('webbook-font-size', String(normalizedSize));
    document.documentElement.style.setProperty('--webbook-main-font-size', `${normalizedSize}%`);
    // Unitless form for text outside <main> that scales from its own base size, like caption mode
    document.documentElement.style.setProperty('--webbook-font-scale', String(normalizedSize / 100));

    const range = document.querySelector('#webbook-font-size-range');
    if (range) range.setAttribute('aria-valuetext', `${normalizedSize}%`);

    const main = document.querySelector('main');
    if (main) main.style.fontSize = `${normalizedSize}%`;

    const display = document.querySelector('#webbook-font-size-value');
    if (display) display.textContent = `${normalizedSize}%`;
    document.dispatchEvent(new document.defaultView.CustomEvent('webbook:layoutchange'));
}

function initFontFamily() {
    const select = document.querySelector('#webbook-font-family-options');
    if (!select) return;

    const font = localStorage.getItem('webbook-font-family') || 'system-ui';
    select.value = font;
    applyFontFamily(font);

    select.addEventListener('change', () => {
        localStorage.setItem('webbook-font-family', select.value);
        applyFontFamily(select.value);
    });
}
function applyFontFamily(font) {
    document.documentElement.style.setProperty('--webbook-main-font-family', font);
    const main = document.querySelector('main');
    if (main) main.style.fontFamily = font;
    document.dispatchEvent(new document.defaultView.CustomEvent('webbook:layoutchange'));
}

function initDialogBackdropBlur() {
    const toggle = document.querySelector('#webbook-dialog-blur-toggle');
    const enabled = localStorage.getItem('webbook-dialog-backdrop-blur') !== 'false';
    if (toggle) {
        toggle.checked = enabled;
        toggle.addEventListener('change', () => {
            localStorage.setItem('webbook-dialog-backdrop-blur', toggle.checked);
            applyDialogBackdropBlur(toggle.checked);
        });
    }
    applyDialogBackdropBlur(enabled);
}

function applyDialogBackdropBlur(enabled) {
    document.body.classList.toggle('webbook-dialog-backdrop-blur', enabled);
}

function initRate() {
    const rateRange = document.querySelector('#webbook-rate-range');
    if (!rateRange) return;

    const rate = localStorage.getItem('webbook-rate') || '100';
    rateRange.value = rate;
    applyRate(rate);

    rateRange.addEventListener('input', () => applyRate(rateRange.value));
    document.querySelector('#webbook-reset-rate')?.addEventListener('click', () => {
        rateRange.value = '100';
        applyRate('100');
    });
}
function applyRate(rate) {
    localStorage.setItem('webbook-rate', rate);
    const display = document.querySelector('#webbook-rate-value');
    if (display) display.textContent = `${rate}%`;
    const range = document.querySelector('#webbook-rate-range');
    if (range) range.setAttribute('aria-valuetext', `${rate}%`);
    const audio = pageAudio();
    if (audio) audio.playbackRate = parseInt(rate, 10) / 100;
}

function initSettingActions() {
    // With Alt+Shift: NVDA and JAWS use Shift+comma and Shift+period in browse mode, and JAWS
    // uses minus
    for (const [id, label, selector, delta, announcement, code] of [
        ['rate-down', 'Slower', '#webbook-rate-range', -10, 'Narration speed', 'Comma'],
        ['rate-up', 'Faster', '#webbook-rate-range', 10, 'Narration speed', 'Period'],
        ['font-smaller', 'Smaller text', '#webbook-font-size-range', -10, 'Text size', 'Minus'],
        ['font-larger', 'Larger text', '#webbook-font-size-range', 10, 'Text size', 'Equal']
    ]) {
        const nextValue = range => Math.max(Number(range.min || 50), Math.min(Number(range.max || 200), Number(range.value) + delta));
        registerAction({ id, label, group: id.startsWith('rate-') ? 'Narration' : 'Reading',
            defaultKeys: [{ code, alt: true, shift: true }],
            isAvailable: () => {
                const range = document.querySelector(selector);
                return Boolean(range && !range.disabled && nextValue(range) !== Number(range.value));
            },
            run: () => {
                const range = document.querySelector(selector);
                range.value = String(nextValue(range));
                range.dispatchEvent(new Event('input', { bubbles: true }));
                announceReaderAction(`${announcement} ${range.value} percent.`);
            } });
    }
}

export function initSettings() {
    settingsSection('colors');
    initPageNavigation();
    initPageColors();
    initDialogBackdropBlur();
    initHighlightSettings();
    initFontSize();
    initFontFamily();
    initTextSpacing();
    initRate();
    initKeyboardShortcuts();
    initSettingActions();
}
