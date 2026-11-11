import assert from 'node:assert/strict';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import { initPageColors } from '../src/js/page-colors.js';

function setup(bookId, saved = {}) {
    const dom = new JSDOM(`<meta name="webbook-book-id" content="${bookId}">
        <section id="webbook-settings"><h2>Settings</h2><div id="webbook-appearance"></div></section>`,
    { url: 'https://books.example/book/index.html' });
    for (const name of ['window', 'document', 'localStorage']) globalThis[name] = dom.window[name];
    for (const [key, value] of Object.entries(saved)) localStorage.setItem(key, value);
    initPageColors();
    return dom;
}

test('colors use only shared preferences and ignore old per-book values', () => {
    const dom = setup('first', { 'webbook-colors': 'cream', 'webbook-colors:first': 'blue' });
    const select = document.getElementById('webbook-colors-options');
    assert.equal(select.value, 'cream');
    assert.equal(document.getElementById('webbook-colors-share-toggle'), null);
    select.value = 'sepia';
    select.dispatchEvent(new dom.window.Event('change'));
    assert.equal(localStorage.getItem('webbook-colors'), 'sepia');
    assert.equal(localStorage.getItem('webbook-colors:first'), 'blue');
    const saved = Object.fromEntries(Object.entries(localStorage));
    dom.window.close();
    const second = setup('second', saved);
    assert.equal(document.getElementById('webbook-colors-options').value, 'sepia');
    second.window.close();
});
