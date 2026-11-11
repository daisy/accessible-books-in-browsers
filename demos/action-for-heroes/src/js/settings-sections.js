// The panel's sections and row order live here, so module startup order never decides what a
// reader sees. Keep controls' ids: shortcuts and reader tools use them too.
const SECTIONS = [
    ['colors', 'Colors', ['#webbook-colors', '#webbook-colors-custom', '#webbook-appearance', '#webbook-color', '#webbook-highlight-style']],
    ['text', 'Text', ['#webbook-font-family', '#webbook-font-size', '#webbook-text-spacing', '#webbook-copy-math', '#webbook-dialog-blur-toggle', '#webbook-toolbar-auto-hide']],
    ['narration', 'Narration', ['#webbook-rate', '#webbook-caption-mode-toggle', '#webbook-skip-settings', '#webbook-structure-sounds']],
    ['notes', 'Notes', ['#webbook-note-references-options', '#webbook-note-wait-sound-toggle', '#webbook-note-auto-return-toggle']],
    ['position', 'Reading position', ['#webbook-resume-toggle']],
    ['keyboard', 'Keyboard', ['#webbook-keyboard-shortcuts-toggle', '.webbook-keyboard-shortcuts-row']],
    ['all', 'All settings', ['.webbook-agent-tools-row', '#webbook-settings-transfer']]
];

export function initSettingsSections() {
    const panel = document.getElementById('webbook-settings');
    if (!panel || panel.querySelector('.webbook-settings-section')) return;
    const description = document.createElement('p');
    description.className = 'webbook-settings-scope';
    description.textContent = 'These settings apply to every book on this website.';
    const jump = document.createElement('nav');
    jump.className = 'webbook-settings-jump';
    jump.setAttribute('aria-label', 'Jump to settings sections');
    const label = document.createElement('p');
    label.id = 'webbook-settings-jump-label';
    label.tabIndex = -1;
    label.textContent = 'Jump to';
    const links = document.createElement('ul');
    jump.append(label, links);
    panel.append(description, jump);
    for (const [name, title] of SECTIONS) {
        const section = document.createElement('div');
        section.className = 'webbook-settings-section';
        section.dataset.settingsSection = name;
        const heading = document.createElement('h3');
        heading.id = `webbook-settings-${name}-hd`;
        heading.tabIndex = -1;
        heading.textContent = title;
        const rows = document.createElement('div');
        rows.className = 'webbook-settings-rows';
        // Back to the list of sections, from the end of each: the panel is long, on a phone above
        // all. Focus goes to "Jump to", so a screen reader lands where the next section is chosen.
        const back = document.createElement('a');
        back.className = 'webbook-settings-top';
        back.href = `#${label.id}`;
        back.textContent = 'Back to top';
        back.addEventListener('click', event => {
            event.preventDefault();
            label.focus({ preventScroll: true });
            label.scrollIntoView({ block: 'start' });
        });
        section.append(heading, rows, back);
        panel.append(section);
        const item = document.createElement('li');
        item.dataset.settingsLink = name;
        const link = document.createElement('a');
        link.href = `#${heading.id}`;
        link.textContent = title;
        link.addEventListener('click', event => {
            event.preventDefault();
            heading.focus({ preventScroll: true });
            heading.scrollIntoView({ block: 'start' });
        });
        item.append(link);
        links.append(item);
    }
    // Static rows, including pages produced before sections were introduced.
    let skip = panel.querySelector('#webbook-skip-settings');
    if (!skip && panel.querySelector('#webbook-skip-pagebreak-toggle')) {
        skip = document.createElement('fieldset');
        skip.id = 'webbook-skip-settings';
        const legend = document.createElement('legend');
        legend.textContent = 'Skip during narration';
        skip.append(legend);
        for (const kind of ['pagebreak', 'footnote', 'sidebar']) {
            const row = panel.querySelector(`#webbook-skip-${kind}-toggle`)?.closest('div');
            if (row) skip.append(row);
        }
        panel.append(skip);
    }
    for (const [name, , selectors] of SECTIONS) {
        for (const selector of selectors) {
            for (const element of panel.querySelectorAll(selector)) {
                const row = element.matches('input, select') ? element.closest('div') : element;
                appendSetting(name, row);
            }
        }
    }
    // The old panel had one fieldset around everything; the sections replace it.
    for (const group of panel.querySelectorAll(':scope > fieldset')) {
        if (!group.querySelector('input, select, button')) group.remove();
    }
    updateSettingsSections();
    const observer = new window.MutationObserver(updateSettingsSections);
    observer.observe(panel, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
}

export function settingsSection(name) {
    initSettingsSections();
    return document.querySelector(`#webbook-settings [data-settings-section="${name}"] > .webbook-settings-rows`);
}

export function appendSetting(name, row) {
    const rows = settingsSection(name);
    if (!rows || !row) return;
    const selectors = SECTIONS.find(section => section[0] === name)[2];
    const rank = element => {
        const index = selectors.findIndex(selector => element.matches(selector) || element.querySelector(selector));
        return index < 0 ? selectors.length : index;
    };
    const next = Array.from(rows.children).find(other => other !== row && rank(other) > rank(row));
    rows.insertBefore(row, next ?? null);
}

export function updateSettingsSections() {
    const panel = document.getElementById('webbook-settings');
    if (!panel) return;
    for (const [name] of SECTIONS) {
        const section = panel.querySelector(`[data-settings-section="${name}"]`);
        if (!section) continue;
        const visible = Array.from(section.querySelectorAll('input, select, button')).some(control => {
            // Don't count the section's own hidden state: it may have just received its first row.
            for (let node = control; node && node !== section; node = node.parentElement) {
                if (node.hidden) return false;
            }
            return true;
        });
        if (section.hidden === visible) section.hidden = !visible;
        const item = panel.querySelector(`[data-settings-link="${name}"]`);
        if (item && item.hidden === visible) item.hidden = !visible;
    }
}
