// Find a setting: a filter at the top of Settings (user, 2026-11-13: "the settings are getting long").
// Typing narrows the panel to the settings whose label, choices, group or section match every word;
// a section whose title matches shows whole. It only hides what doesn't match, with its own class,
// so a setting the panel hides for its own reasons (custom colours, a horizontal book's Writing
// direction) stays hidden. The number found is announced politely; Escape clears the filter before it
// closes the panel; closing the panel clears it.
const INPUT_ID = 'webbook-settings-filter';
const STATUS_ID = 'webbook-settings-filter-status';
const FILTERED = 'webbook-settings-filtered';

// Other words people use for a setting, by the selector of its row or group
const KEYWORDS = {
    '#webbook-colors': 'theme dark light mode contrast background appearance',
    '#webbook-colors-custom': 'theme colour color background text',
    '#webbook-color': 'highlight narration colour color',
    '#webbook-highlight-style': 'highlight underline narration',
    '#webbook-font-family': 'typeface font serif',
    '#webbook-font-size': 'text size zoom bigger larger smaller',
    '#webbook-writing-mode': 'vertical horizontal japanese chinese columns direction',
    '#webbook-text-spacing': 'line height spacing length width column',
    '#webbook-rate': 'speed playback faster slower narration',
    '#webbook-caption-mode-toggle': 'captions subtitles phrase large',
    '#webbook-skip-settings': 'skip exclude narration page numbers notes sidebars',
    '#webbook-structure-sounds': 'sounds earcons tones audio cues',
    '#webbook-toolbar-auto-hide': 'toolbar hide show',
    '#webbook-resume-toggle': 'resume bookmark position remember',
    '#webbook-keyboard-shortcuts-toggle': 'keys keyboard shortcuts hotkeys',
    '.webbook-keyboard-shortcuts-row': 'keys keyboard shortcuts hotkeys edit',
    '#webbook-settings-transfer': 'export import reset backup file',
};

const normalize = text => (text || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

function keywordsFor(element) {
    return Object.entries(KEYWORDS)
        .filter(([selector]) => element.matches(selector) || element.querySelector(selector))
        .map(([, words]) => words).join(' ');
}

// What a row can be found by: its text (labels, legends, choices), its controls' names, and keywords
function searchText(element) {
    const names = Array.from(element.querySelectorAll('[aria-label], [title]'), node => `${node.getAttribute('aria-label') || ''} ${node.getAttribute('title') || ''}`);
    return normalize(`${element.textContent} ${names.join(' ')} ${keywordsFor(element)}`);
}

function matches(text, words) {
    return words.every(word => text.includes(word));
}

// A group of settings (a fieldset) shows whole when its legend matches, else just its matching rows
function filterRow(row, words, sectionText) {
    const groupRows = row.matches('fieldset') ? Array.from(row.querySelectorAll(':scope > div')) : [];
    if (matches(`${sectionText} ${searchText(row)}`, words) && !groupRows.length) return show(row, true);
    if (!groupRows.length) return show(row, false);
    const legend = normalize(`${row.querySelector(':scope > legend')?.textContent || ''} ${keywordsFor(row)}`);
    if (words.every(word => `${sectionText} ${legend}`.includes(word))) {
        groupRows.forEach(groupRow => show(groupRow, true));
        return show(row, true);
    }
    let any = false;
    for (const groupRow of groupRows) {
        const found = matches(`${sectionText} ${legend} ${searchText(groupRow)}`, words);
        show(groupRow, found);
        any ||= found && !groupRow.hidden;
    }
    return show(row, any);
}

function show(element, visible) {
    element.classList.toggle(FILTERED, !visible);
    return visible && !element.hidden;
}

let announceTimer;

export function applySettingsFilter(query) {
    const panel = document.getElementById('webbook-settings');
    if (!panel) return 0;
    const words = normalize(query).split(' ').filter(Boolean);
    const filtering = words.length > 0;
    panel.classList.toggle('webbook-settings-filtering', filtering);
    let count = 0;
    for (const section of panel.querySelectorAll('.webbook-settings-section')) {
        const title = normalize(section.querySelector('h3')?.textContent);
        let found = 0;
        for (const row of section.querySelectorAll(':scope > .webbook-settings-rows > *')) {
            if (!filtering) {
                row.classList.remove(FILTERED);
                row.querySelectorAll(`.${FILTERED}`).forEach(node => node.classList.remove(FILTERED));
                continue;
            }
            if (filterRow(row, words, title)) found += row.matches('fieldset') ? row.querySelectorAll(`:scope > div:not(.${FILTERED}):not([hidden])`).length : 1;
        }
        section.classList.toggle(FILTERED, filtering && found === 0);
        if (!section.hidden) count += found;
    }
    const status = document.getElementById(STATUS_ID);
    if (status) {
        clearTimeout(announceTimer);
        const message = !filtering ? '' : count === 0 ? 'No settings match.' : count === 1 ? '1 setting found.' : `${count} settings found.`;
        // Settled typing only, so a screen reader isn't interrupted at each letter
        announceTimer = setTimeout(() => { status.textContent = message; }, filtering ? 500 : 0);
    }
    return count;
}

export function initSettingsFilter() {
    const panel = document.getElementById('webbook-settings');
    if (!panel || document.getElementById(INPUT_ID)) return;
    const wrapper = document.createElement('div');
    wrapper.className = 'webbook-settings-filter';
    wrapper.setAttribute('role', 'search');
    const label = document.createElement('label');
    label.htmlFor = INPUT_ID;
    label.textContent = 'Find a setting';
    const input = document.createElement('input');
    input.type = 'search';
    input.id = INPUT_ID;
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.setAttribute('aria-describedby', STATUS_ID);
    const status = document.createElement('p');
    status.id = STATUS_ID;
    status.setAttribute('role', 'status');
    wrapper.append(label, input, status);
    const anchor = panel.querySelector('.webbook-settings-jump') || panel.querySelector('.webbook-settings-section');
    if (anchor) anchor.before(wrapper);
    else panel.append(wrapper);

    input.addEventListener('input', () => applySettingsFilter(input.value));
    input.addEventListener('keydown', event => {
        if (event.key !== 'Escape' || !input.value) return;
        // The first Escape clears the filter; the next closes the panel
        event.preventDefault();
        event.stopPropagation();
        input.value = '';
        applySettingsFilter('');
    });
    panel.addEventListener('toggle', event => {
        if (event.newState !== 'closed' || !input.value) return;
        input.value = '';
        applySettingsFilter('');
    });
}
