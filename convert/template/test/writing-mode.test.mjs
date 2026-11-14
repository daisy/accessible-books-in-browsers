import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
    .replace('<html lang="en"', '<html lang="ja" data-webbook-writing-mode="vertical-rl"');
const dom = new JSDOM(html, { url: 'https://books.example/index.html', runScripts: 'outside-only' });
for (const name of ['window', 'document', 'localStorage', 'CustomEvent', 'Element', 'Node', 'getComputedStyle']) {
    globalThis[name] = name === 'getComputedStyle' ? dom.window.getComputedStyle.bind(dom.window) : dom.window[name];
}
const scrolls = [];
dom.window.scrollTo = options => scrolls.push(options);

const { initWritingMode, applyWritingMode } = await import('../src/js/writing-mode.js');
const axis = await import('../src/js/reading-axis.js');

// The head script runs as written in the template
function runHeadScript() {
    const script = dom.window.document.querySelector('head script').textContent;
    dom.window.eval(script);
}

test('the head script sets vertical text from the book, unless the reader chose horizontal', () => {
    localStorage.clear();
    runHeadScript();
    assert.equal(document.documentElement.classList.contains('webbook-vertical'), true);
    localStorage.setItem('webbook-writing-mode', 'horizontal');
    runHeadScript();
    assert.equal(document.documentElement.classList.contains('webbook-vertical'), false);
    localStorage.clear();
});

test('the Writing direction setting: in the Text section, shown only for a vertical book, and saved', () => {
    localStorage.clear();
    initWritingMode();
    const select = document.getElementById('webbook-writing-mode');
    const row = document.getElementById('webbook-writing-mode-row');
    assert.equal(row.closest('[data-settings-section]').dataset.settingsSection, 'text');
    assert.equal(row.hidden, false);
    assert.equal(select.value, 'vertical');
    assert.equal(axis.isVerticalText(), true);
    select.value = 'horizontal';
    select.dispatchEvent(new dom.window.Event('change'));
    assert.equal(localStorage.getItem('webbook-writing-mode'), 'horizontal');
    assert.equal(document.documentElement.classList.contains('webbook-vertical'), false);
    select.value = 'vertical';
    select.dispatchEvent(new dom.window.Event('change'));
    assert.equal(localStorage.getItem('webbook-writing-mode'), null);
    assert.equal(axis.isVerticalText(), true);

    document.documentElement.removeAttribute('data-webbook-writing-mode');
    applyWritingMode();
    assert.equal(row.hidden, true);
    assert.equal(axis.isVerticalText(), false);
    document.documentElement.setAttribute('data-webbook-writing-mode', 'vertical-rl');
    applyWritingMode();
});

test('positions along the text: from the right edge in vertical-rl, from the top otherwise', () => {
    const rect = { top: 100, bottom: 300, left: 200, right: 260, width: 60, height: 200 };
    Object.defineProperty(dom.window, 'innerWidth', { value: 1000, configurable: true });
    applyWritingMode();
    assert.equal(axis.readingStart(rect), 740);
    assert.equal(axis.readingEnd(rect), 800);
    assert.equal(axis.readingLength(rect), 60);
    scrolls.length = 0;
    axis.scrollToReading(500);
    assert.deepEqual(scrolls.at(-1), { left: -500, top: 0, behavior: 'auto' });
    document.documentElement.classList.remove('webbook-vertical');
    assert.equal(axis.readingStart(rect), 100);
    axis.scrollToReading(500);
    assert.deepEqual(scrolls.at(-1), { top: 500, left: 0, behavior: 'auto' });
});
