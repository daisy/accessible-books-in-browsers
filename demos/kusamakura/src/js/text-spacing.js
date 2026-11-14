// Saved preferences must also be listed in settings-file.js (export, import and reset).
import { appendSetting, settingsSection } from './settings-sections.js';
// Text spacing settings: line spacing, letter spacing, word spacing and line length, for the book's
// text and caption mode (WCAG 1.4.12's values are among the steps). Each is a few named steps
// rather than a slider, which is easier by screen reader and by voice. Every option names its value:
// no "Book default" (the converter keeps none of a book's CSS), and no "Normal" or "Default" (one
// sounds better than the others, the other means something else once a setting is global) (user,
// 2026-11-10). The first spacing steps (stored '') set nothing, so the reader's own CSS applies:
// line height 1.6 (layout.css), no extra letter or word spacing.

// Each step: [stored value, label, CSS value]. Line spacing also spaces paragraphs (2em, WCAG's
// paragraph spacing); see layout.css.
import { optionElement, readSetting, writeSetting } from './stored-settings.js';

const SETTINGS = [
    { key: 'webbook-line-height', id: 'webbook-line-height-options', label: 'Line spacing',
        property: '--webbook-line-height', flag: 'data-webbook-line-height',
        // No 1.5: tighter than the reader's own 1.6
        steps: [['', '1.6'], ['1.8', '1.8'], ['2', '2']] },
    { key: 'webbook-letter-spacing', id: 'webbook-letter-spacing-options', label: 'Letter spacing',
        property: '--webbook-letter-spacing', flag: 'data-webbook-letter-spacing',
        steps: [['', 'No extra'], ['wider', 'Wider', '0.05em'], ['widest', 'Widest', '0.12em']] },
    { key: 'webbook-word-spacing', id: 'webbook-word-spacing-options', label: 'Word spacing',
        property: '--webbook-word-spacing', flag: 'data-webbook-word-spacing',
        steps: [['', 'No extra'], ['wider', 'Wider', '0.16em'], ['widest', 'Widest', '0.3em']] },
    // A comfortable number of characters a line, kept apart at large text sizes by fractions of the
    // width the text has (the window, less the page arrows beside it). See lineLength().
    // Medium when nothing's saved (no separate fixed width)
    { key: 'webbook-line-length', id: 'webbook-line-length-options', label: 'Line length',
        property: '--webbook-line-length', initial: 'medium',
        steps: [['narrow', 'Narrow', lineLength('narrow')], ['medium', 'Medium', lineLength('medium')],
            ['wide', 'Wide', lineLength('wide')]] }
];

// Percentages are of the text's grid area and ch of its font, resolved where <main> (or the caption)
// uses the value. Each step is the smaller of a reading measure (Narrow 50 characters, Medium 65:
// WCAG 1.4.8 asks for 80 at most) and a fraction of the width (Narrow half, Medium three quarters),
// so at a large text size, where the measures pass the window, the steps still differ. Narrow is
// never narrower than 20rem (or the whole width, on a smaller screen), so a phone isn't left a
// column of a few words, and Medium never narrower than Narrow. Wide is all the width.
// History: em, then ch, ran together at large sizes; fractions alone (user, 2026-11-10: "fractions
// of the window") gave Medium 110 characters a line on a laptop (user, 2026-11-13: "it used to
// look different").
function lineLength(step) {
    const floor = 'min(100%, 20rem)';
    const narrow = `max(min(50ch, 50%), ${floor})`;
    if (step === 'narrow') return narrow;
    if (step === 'wide') return '100%';
    return `max(min(65ch, 75%), ${narrow})`;
}

// The saved step, else the setting's first choice (an old value such as line spacing 1.5 too)
function stepFor(setting, value) {
    const find = wanted => setting.steps.find(([stepValue]) => stepValue === wanted);
    return find(value) || find(setting.initial ?? '') || setting.steps[0];
}

function apply(setting, value) {
    const [stepValue, , css = stepValue] = stepFor(setting, value);
    const root = document.documentElement;
    // Vertical text's column height has its own steps, in writing-modes.css
    if (setting.key === 'webbook-line-length') root.setAttribute('data-webbook-line-length', stepValue);
    if (stepValue) {
        root.style.setProperty(setting.property, css);
        if (setting.flag) root.setAttribute(setting.flag, '');
    } else {
        root.style.removeProperty(setting.property);
        if (setting.flag) root.removeAttribute(setting.flag);
    }
    document.dispatchEvent(new document.defaultView.CustomEvent('webbook:layoutchange'));
}

// The UI creates these settings itself, so books converted before they existed get them too. One
// group, so they move together when Settings is reorganized.
function buildSettings() {
    if (document.getElementById('webbook-text-spacing')) return;
    const fieldset = settingsSection('text');
    if (!fieldset) return;
    const group = document.createElement('fieldset');
    group.id = 'webbook-text-spacing';
    const legend = document.createElement('legend');
    legend.textContent = 'Text spacing';
    group.append(legend);
    for (const setting of SETTINGS) {
        const row = document.createElement('div');
        const label = document.createElement('label');
        label.htmlFor = setting.id;
        label.textContent = setting.label;
        const select = document.createElement('select');
        select.id = setting.id;
        for (const [value, text] of setting.steps) select.append(optionElement(value, text));
        row.append(label, select);
        group.append(row);
    }
    appendSetting('text', group);
}

export function initTextSpacing() {
    buildSettings();
    for (const setting of SETTINGS) {
        const value = stepFor(setting, readSetting(setting.key) || '')[0];
        apply(setting, value);
        const select = document.getElementById(setting.id);
        if (!select) continue;
        select.value = value;
        select.addEventListener('change', () => {
            writeSetting(setting.key, select.value);
            apply(setting, select.value);
        });
    }
}
