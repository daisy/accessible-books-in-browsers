// Text spacing settings: line spacing, letter spacing, word spacing and line length, for the book's
// text and caption mode (WCAG 1.4.12's values are among the steps). Each is a few named steps
// rather than a slider, which is easier by screen reader and by voice. "Book default" sets nothing,
// so the book's own CSS applies.

// Each step: [stored value, label, CSS value]. Line spacing also spaces paragraphs (2em, WCAG's
// paragraph spacing); see layout.css.
import { optionElement, readSetting, writeSetting } from './stored-settings.js';

const SETTINGS = [
    { key: 'webbook-line-height', id: 'webbook-line-height-options', label: 'Line spacing',
        property: '--webbook-line-height', flag: 'data-webbook-line-height',
        steps: [['', 'Book default'], ['1.5', '1.5'], ['1.8', '1.8'], ['2', '2']] },
    { key: 'webbook-letter-spacing', id: 'webbook-letter-spacing-options', label: 'Letter spacing',
        property: '--webbook-letter-spacing', flag: 'data-webbook-letter-spacing',
        steps: [['', 'Book default'], ['wider', 'Wider', '0.05em'], ['widest', 'Widest', '0.12em']] },
    { key: 'webbook-word-spacing', id: 'webbook-word-spacing-options', label: 'Word spacing',
        property: '--webbook-word-spacing', flag: 'data-webbook-word-spacing',
        steps: [['', 'Book default'], ['wider', 'Wider', '0.16em'], ['widest', 'Widest', '0.3em']] },
    // In em, so it follows the text size
    { key: 'webbook-line-length', id: 'webbook-line-length-options', label: 'Line length',
        property: '--webbook-line-length',
        steps: [['', 'Book default'], ['narrow', 'Narrow', '35em'], ['medium', 'Medium', '45em'], ['wide', 'Wide', '60em']] }
];

function stepFor(setting, value) {
    return setting.steps.find(([stepValue]) => stepValue === value) || setting.steps[0];
}

function apply(setting, value) {
    const [stepValue, , css = stepValue] = stepFor(setting, value);
    const root = document.documentElement;
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
    const fieldset = document.querySelector('#webbook-settings fieldset');
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
    const fontRow = document.getElementById('webbook-font-family');
    if (fontRow?.parentElement === fieldset) fontRow.after(group);
    else fieldset.append(group);
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
