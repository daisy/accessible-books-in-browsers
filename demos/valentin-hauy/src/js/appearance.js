import { readSetting, writeSetting } from './stored-settings.js';
import { appendSetting, initSettingsSections, updateSettingsSections } from './settings-sections.js';
import { applySettingsFilter } from './settings-filter.js';
import { registerAction, announceReaderAction } from './reader-actions.js';
import { publishedAppearanceActive } from './appearance-state.js';
import { applyWritingMode } from './writing-mode.js';
import { pageAudio } from './dom-utils.js';
import { lastNarratedElement } from './narration-position.js';
import { readingStart, readingEnd, readingScroll, scrollToReading, textWritingMode, viewportLength } from './reading-axis.js';
// Remembered for each book, by the book's id (the EPUB's unique identifier, as resume positions are),
// unlike the other settings, which apply to every book (user, 2026-11-16)
const KEY_PREFIX = 'webbook-appearance:';
const bookKey = () => KEY_PREFIX + (document.querySelector('meta[name="webbook-book-id"]')?.content?.trim() || '');
let generation = 0;
const REPLACED_ROWS = '#webbook-colors, #webbook-colors-custom, #webbook-font-family, #webbook-font-size, #webbook-writing-mode-row, #webbook-text-spacing';
function areaStart() {
    return textWritingMode() === 'horizontal-tb' ? Math.max(0, document.getElementById('webbook-top-toolbar')?.getBoundingClientRect().bottom || 0) + 8 : 16;
}
function capturePosition() {
    if (document.documentElement.classList.contains('webbook-caption-mode')) return null;
    const main = document.querySelector('main');
    if (!main) return null;
    const audio = pageAudio();
    let element = audio && !audio.paused ? lastNarratedElement() : null;
    let range = null;
    if (!element) {
        const start = areaStart();
        element = Array.from(main.querySelectorAll('p, li, h1, h2, h3, h4, h5, h6, td, th, pre, blockquote, figcaption'))
            .find(elm => elm.textContent.trim() && elm.getClientRects().length && readingEnd(elm.getBoundingClientRect()) > start);
        if (element) {
            const rect = element.getBoundingClientRect(), vertical = textWritingMode() !== 'horizontal-tb';
            const x = vertical ? (textWritingMode() === 'vertical-rl' ? window.innerWidth - start : start) : Math.max(rect.left + 4, 4);
            const y = vertical ? Math.max(rect.top + 4, 4) : start;
            if (document.caretRangeFromPoint) range = document.caretRangeFromPoint(x, y);
            else if (document.caretPositionFromPoint) {
                const caret = document.caretPositionFromPoint(x, y);
                if (caret) { range = document.createRange(); range.setStart(caret.offsetNode, caret.offset); range.collapse(true); }
            }
            if (range && !main.contains(range.startContainer)) range = null;
            if (range?.collapsed && range.startContainer.nodeType === 3) {
                const node = range.startContainer, offset = range.startOffset;
                if (offset < node.length) range.setEnd(node, offset + 1);
                else if (offset) range.setStart(node, offset - 1);
            }
            const box = range?.getBoundingClientRect?.();
            if (range && box && !box.width && !box.height) range = null;
        }
    }
    if (!element) return null;
    const rect = range?.getBoundingClientRect?.() ?? element.getBoundingClientRect();
    return { element, range, offset: readingStart(rect), mode: textWritingMode(), area: areaStart() };
}
function restorePosition(position) {
    if (!position?.element.isConnected) return;
    const rect = position.range?.getBoundingClientRect?.() ?? position.element.getBoundingClientRect();
    const desired = position.mode === textWritingMode() ? position.offset
        : areaStart() + Math.min(Math.max(0, position.offset - position.area), Math.max(0, viewportLength() - areaStart() - 40));
    scrollToReading(readingScroll() + readingStart(rect) - desired);
}
function updateAppearanceControls() {
    const active = publishedAppearanceActive();
    for (const row of document.querySelectorAll(REPLACED_ROWS)) row.classList.toggle('webbook-appearance-hidden', active);
    const note = document.getElementById('webbook-publisher-appearance-note');
    if (note) note.hidden = !active;
    updateSettingsSections();
    const filter = document.getElementById('webbook-settings-filter');
    if (filter) applySettingsFilter(filter.value);
}
export function applyAppearance({ preservePosition = false, announce = false, persist } = {}) {
    const position = preservePosition ? capturePosition() : null;
    const root = document.documentElement;
    const enabled = root.hasAttribute('data-webbook-has-published') && (persist ?? readSetting(bookKey()) === 'published');
    if (persist !== undefined) writeSetting(bookKey(), persist ? 'published' : 'settings');
    if (enabled) root.setAttribute('data-webbook-appearance', 'published'); else root.removeAttribute('data-webbook-appearance');
    const group = document.getElementById('webbook-publisher-appearance');
    if (group) group.hidden = !root.hasAttribute('data-webbook-has-published');
    for (const radio of group?.querySelectorAll('input') ?? []) radio.checked = radio.value === (enabled ? 'published' : 'settings');
    applyWritingMode();
    updateAppearanceControls();
    document.dispatchEvent(new window.CustomEvent('webbook:appearancechange'));
    document.dispatchEvent(new window.CustomEvent('webbook:layoutchange'));
    const token = ++generation;
    if (position) {
        restorePosition(position);
        window.requestAnimationFrame?.(() => { if (generation === token) restorePosition(position); });
        document.fonts?.ready?.then(() => { if (generation === token) restorePosition(position); });
    }
    if (announce) announceReaderAction(enabled ? 'As published' : 'My settings');
}
export function initAppearance() {
    initSettingsSections();
    const panel = document.getElementById('webbook-settings');
    if (!panel || document.getElementById('webbook-publisher-appearance')) return;
    if (!document.documentElement.hasAttribute('data-webbook-has-published')) { applyAppearance(); return; }
    const group = document.createElement('fieldset'); group.id = 'webbook-publisher-appearance';
    // Named by its section's heading, which says the same thing (user, 2026-11-16: the group sat above
    // Find a setting, as a panel of its own; it's now the first section, with a Jump to link)
    group.setAttribute('aria-labelledby', 'webbook-settings-appearance-hd');
    const scope = document.createElement('p'); scope.id = 'webbook-publisher-appearance-scope';
    scope.textContent = 'Remembered for this book.';
    group.setAttribute('aria-describedby', scope.id);
    group.append(scope);
    for (const [value, text] of [['settings', 'My settings'], ['published', 'As published']]) {
        const row = document.createElement('div');
        const radio = document.createElement('input'); radio.type = 'radio'; radio.name = 'webbook-publisher-appearance'; radio.value = value; radio.id = `webbook-appearance-${value}`;
        const label = document.createElement('label'); label.htmlFor = radio.id; label.textContent = text;
        radio.addEventListener('change', () => { if (radio.checked) applyAppearance({ persist: value === 'published', preservePosition: true }); });
        row.append(radio, label); group.append(row);
    }
    const note = document.createElement('p'); note.id = 'webbook-publisher-appearance-note';
    note.textContent = 'Colors, font, text size, spacing and writing direction are as published. Choose My settings to change them.';
    group.append(note);
    appendSetting('appearance', group);
    registerAction({ id: 'switch-appearance', label: 'Switch between As published and My settings', group: 'Reading', inPanels: true,
        defaultKeys: [{ code: 'KeyD', alt: true, shift: true }],
        isAvailable: () => document.documentElement.hasAttribute('data-webbook-has-published'),
        run: () => applyAppearance({ persist: !publishedAppearanceActive(), preservePosition: true, announce: true }) });
    applyAppearance();
    document.addEventListener('webbook:pagechange', () => applyAppearance());
    for (const event of ['wheel', 'touchmove', 'pointerdown', 'keydown']) document.addEventListener(event, e => {
        if (e.target?.closest?.('main') || e.target === document.body) generation++;
    }, { passive: true });
    document.addEventListener('webbook:pageplacing', () => { generation++; });
}
