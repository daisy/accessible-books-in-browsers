let darkModeMediaQueryListener = null;
const KEYBOARD_SHORTCUTS_STORAGE_KEY = 'webbook-keyboard-shortcuts';

// WCAG 2.1.4: shortcuts made of a single character key must be possible to turn off. Read at
// keypress time so the setting applies without a reload.
export function keyboardShortcutsEnabled() {
    return localStorage.getItem(KEYBOARD_SHORTCUTS_STORAGE_KEY) !== 'false';
}

// The UI creates this setting itself, so books converted before it existed get it too
function initKeyboardShortcuts() {
    const fieldset = document.querySelector('#webbook-settings fieldset');
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
        const captionRow = document.querySelector('#webbook-caption-mode-toggle')?.closest('div');
        if (captionRow?.parentElement === fieldset) captionRow.after(row);
        else fieldset.append(row);
    }

    toggle.checked = keyboardShortcutsEnabled();
    toggle.addEventListener('change', () => {
        localStorage.setItem(KEYBOARD_SHORTCUTS_STORAGE_KEY, String(toggle.checked));
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
        window.location.href = href;
    };

    button.addEventListener('click', goToPage);
    input.addEventListener('keydown', e => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        goToPage();
    });
    input.addEventListener('input', () => input.removeAttribute('aria-invalid'));
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

function initHighlightColor() {
    const autoToggle = document.querySelector('#webbook-highlight-auto-toggle');
    const colorPicker = document.querySelector('#webbook-color-picker');
    if (!autoToggle || !colorPicker) return;

    const isAuto = localStorage.getItem('webbook-highlight-auto') !== 'false';
    const color = localStorage.getItem('webbook-highlight-color') || '#ffdd00';

    autoToggle.checked = isAuto;
    colorPicker.value = color;
    colorPicker.disabled = isAuto;
    applyHighlightColor(isAuto ? null : color);

    autoToggle.addEventListener('change', () => {
        localStorage.setItem('webbook-highlight-auto', autoToggle.checked);
        colorPicker.disabled = autoToggle.checked;
        applyHighlightColor(autoToggle.checked ? null : colorPicker.value);
    });
    colorPicker.addEventListener('input', () => {
        localStorage.setItem('webbook-highlight-color', colorPicker.value);
        applyHighlightColor(colorPicker.value);
    });
}
function applyHighlightColor(color) {
    if (color) {
        document.body.style.setProperty('--webbook-highlight-color', color);
    } else {
        document.body.style.removeProperty('--webbook-highlight-color');
    }
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
}

function initAppearance() {
    const select = document.querySelector('#webbook-appearance-options');
    const appearance = localStorage.getItem('webbook-appearance') || 'auto';
    if (select) select.value = appearance;
    applyAppearance(appearance);
    if (select) select.addEventListener('change', () => applyAppearance(select.value));
}
function applyAppearance(value) {
    localStorage.setItem('webbook-appearance', value);
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    if (darkModeMediaQueryListener) {
        mq.removeEventListener('change', darkModeMediaQueryListener);
        darkModeMediaQueryListener = null;
    }
    const apply = dark => {
        document.documentElement.classList.toggle('webbook-dark', dark);
        document.documentElement.classList.toggle('webbook-light', !dark);
        document.body.classList.toggle('webbook-dark', dark);
        document.body.classList.toggle('webbook-light', !dark);
    };
    if (value === 'auto') {
        apply(mq.matches);
        darkModeMediaQueryListener = e => apply(e.matches);
        mq.addEventListener('change', darkModeMediaQueryListener);
    } else {
        apply(value === 'dark');
    }
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
    const audio = document.querySelector('audio');
    if (audio) audio.playbackRate = parseInt(rate, 10) / 100;
}

export function initSettings() {
    initPageNavigation();
    initAppearance();
    initDialogBackdropBlur();
    initHighlightColor();
    initFontSize();
    initFontFamily();
    initRate();
    initKeyboardShortcuts();
}
