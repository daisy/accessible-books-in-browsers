import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { appendSetting, initSettingsSections, settingsSection, updateSettingsSections } from '../src/js/settings-sections.js';

function setup(page = 'index.html') {
    const dom = new JSDOM(readFileSync(new URL(`../${page}`, import.meta.url), 'utf8'), { url: 'https://books.example/index.html' });
    globalThis.window = dom.window;
    globalThis.document = dom.window.document;
    initSettingsSections();
    return dom;
}

test('every template keeps controls under ordered h3 headings below Settings', () => {
    for (const page of ['index.html', 'chapter-1.html', 'chapter-2.html', 'chapter-3.html']) {
        const dom = setup(page);
        const panel = document.getElementById('webbook-settings');
        assert.deepEqual(Array.from(panel.querySelectorAll('h2, h3'), h => [h.tagName, h.textContent]), [
            ['H2', 'Settings'], ...['Colors', 'Text', 'Narration', 'Notes', 'Reading position', 'Keyboard', 'All settings'].map(title => ['H3', title])
        ]);
        for (const [id, section] of [['webbook-font-family-options', 'text'], ['webbook-color-picker', 'colors'], ['webbook-caption-mode-toggle', 'narration']]) assert.equal(document.getElementById(id).closest('[data-settings-section]').dataset.settingsSection, section);
        assert.equal(document.getElementById('webbook-skip-footnote-toggle').closest('fieldset').querySelector('legend').textContent, 'Skip during narration');
        assert.equal(panel.querySelector(':scope > fieldset'), null);
        assert.ok(Array.from(panel.querySelectorAll('h3')).every(h => h.tabIndex === -1));
        dom.window.close();
    }
});

test('row order does not depend on module startup order', () => {
    const dom = setup();
    for (const id of ['webbook-toolbar-auto-hide', 'webbook-text-spacing']) {
        const row = document.createElement('div');
        row.id = id;
        row.append(document.createElement('input'));
        appendSetting('text', row);
    }
    assert.deepEqual(Array.from(settingsSection('text').children, row => row.id || row.querySelector('input').id), [
        'webbook-font-family', 'webbook-font-size', 'webbook-text-spacing', 'webbook-dialog-blur-toggle', 'webbook-toolbar-auto-hide'
    ]);
    initSettingsSections();
    assert.equal(document.querySelectorAll('.webbook-settings-section').length, 7);
    dom.window.close();
});

test('empty sections and jump links hide together and return with a visible control', () => {
    const dom = setup();
    updateSettingsSections();
    const section = settingsSection('notes').parentElement;
    const item = document.querySelector('[data-settings-link="notes"]');
    assert.equal(section.hidden, true);
    assert.equal(item.hidden, true);
    const row = document.createElement('div');
    const control = document.createElement('select');
    control.id = 'webbook-note-references-options';
    row.append(control);
    appendSetting('notes', row);
    updateSettingsSections();
    assert.equal(section.hidden, false);
    assert.equal(item.hidden, false);
    row.hidden = true;
    updateSettingsSections();
    assert.equal(section.hidden, true);
    dom.window.close();
});

test('jump links focus their heading without changing the reading URL', () => {
    const dom = setup();
    const heading = document.getElementById('webbook-settings-text-hd');
    let scrolled = false;
    heading.scrollIntoView = () => { scrolled = true; };
    document.querySelector('[data-settings-link="text"] a').click();
    assert.equal(document.activeElement, heading);
    assert.equal(scrolled, true);
    assert.equal(dom.window.location.hash, '');
    dom.window.close();
});

test('each section ends with Back to top, which focuses the Jump to list', () => {
    const dom = setup();
    const label = document.getElementById('webbook-settings-jump-label');
    label.scrollIntoView = () => {};
    const backs = document.querySelectorAll('#webbook-settings .webbook-settings-section > a.webbook-settings-top');
    assert.equal(backs.length, document.querySelectorAll('#webbook-settings .webbook-settings-section').length);
    assert.equal(backs[0].textContent, 'Back to top');
    backs[2].click();
    assert.equal(document.activeElement, label);
    assert.equal(dom.window.location.hash, '');
    dom.window.close();
});
