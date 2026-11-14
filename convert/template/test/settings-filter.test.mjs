import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const dom = new JSDOM(readFileSync(new URL('../index.html', import.meta.url), 'utf8'), { url: 'https://books.example/index.html' });
for (const name of ['window', 'document', 'localStorage', 'CustomEvent', 'Element', 'Node']) globalThis[name] = dom.window[name];

const { initSettingsSections } = await import('../src/js/settings-sections.js');
const { initTextSpacing } = await import('../src/js/text-spacing.js');
const { initSettingsFilter, applySettingsFilter } = await import('../src/js/settings-filter.js');
initSettingsSections();
initTextSpacing();
initSettingsFilter();

const panel = document.getElementById('webbook-settings');
const shown = elm => !elm.closest('.webbook-settings-filtered') && !elm.closest('[hidden]');
const shownSections = () => Array.from(panel.querySelectorAll('.webbook-settings-section'))
    .filter(shown).map(section => section.dataset.settingsSection);

test('the filter is labelled, at the top, before Jump to', () => {
    const input = document.getElementById('webbook-settings-filter');
    assert.equal(input.type, 'search');
    assert.equal(panel.querySelector('label[for="webbook-settings-filter"]').textContent, 'Find a setting');
    assert.equal(input.closest('.webbook-settings-filter').nextElementSibling.className, 'webbook-settings-jump');
    assert.equal(document.getElementById('webbook-settings-filter-status').getAttribute('role'), 'status');
});

test('matches labels, choices and other words for a setting, whatever the case and accents', () => {
    assert(applySettingsFilter('FONT SIZE') >= 1);
    assert(shown(document.getElementById('webbook-font-size-range')));
    assert(!shown(document.getElementById('webbook-rate-range')));
    assert.deepEqual(shownSections(), ['text']);
    applySettingsFilter('zoom');
    assert(shown(document.getElementById('webbook-font-size-range')));
    applySettingsFilter('widest');
    assert(shown(document.getElementById('webbook-letter-spacing-options')));
    assert(!shown(document.getElementById('webbook-line-height-options')));
});

test('a group shows whole when its title matches, and a section when its heading does', () => {
    applySettingsFilter('text spacing');
    assert(shown(document.getElementById('webbook-line-height-options')));
    assert(shown(document.getElementById('webbook-line-length-options')));
    applySettingsFilter('narration');
    assert(shownSections().includes('narration'));
    assert(shown(document.getElementById('webbook-rate-range')));
    assert(shown(document.getElementById('webbook-skip-sidebar-toggle')));
    applySettingsFilter('exclude sidebars');
    assert(shown(document.getElementById('webbook-skip-sidebar-toggle')));
});

test('no match hides every section; clearing restores the panel and its own hidden rows', () => {
    assert.equal(applySettingsFilter('xyzzy'), 0);
    assert.deepEqual(shownSections(), []);
    assert(panel.classList.contains('webbook-settings-filtering'));
    const custom = document.getElementById('webbook-colors-custom');
    const hiddenBefore = custom?.hidden;
    applySettingsFilter('');
    assert(!panel.classList.contains('webbook-settings-filtering'));
    assert.equal(panel.querySelectorAll('.webbook-settings-filtered').length, 0);
    if (custom) assert.equal(custom.hidden, hiddenBefore);
});

test('Escape clears a filled filter without closing the panel', () => {
    const input = document.getElementById('webbook-settings-filter');
    input.value = 'font';
    input.dispatchEvent(new dom.window.Event('input'));
    assert(panel.classList.contains('webbook-settings-filtering'));
    const escape = new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    input.dispatchEvent(escape);
    assert.equal(escape.defaultPrevented, true);
    assert.equal(input.value, '');
    assert(!panel.classList.contains('webbook-settings-filtering'));
    const again = new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    input.dispatchEvent(again);
    assert.equal(again.defaultPrevented, false);
});
