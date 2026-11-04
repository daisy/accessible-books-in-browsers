import assert from 'node:assert/strict';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import { passageText, resolveTextQuote, searchablePassages } from '../src/js/search-anchor.js';

test('finds addressable blocks without requiring ids', () => {
    const document = new JSDOM(`<main>
        <h1>A chapter</h1>
        <blockquote><p>Nested text</p></blockquote>
        <p><img src="cover.jpg" alt="An illustrated whale"></p>
        <span class="epubtype_pagebreak">12</span>
    </main>`).window.document;
    const passages = searchablePassages(document.querySelector('main'));
    assert.deepEqual(passages.map(passageText), ['A chapter', 'Nested text', 'An illustrated whale']);
    assert(passages.every(element => !element.id));
});

test('uses quote context to distinguish repeated passages', () => {
    const document = new JSDOM(`<main>
        <p>First context</p><p>Repeated words</p><p>First ending</p>
        <p>Second context</p><p>Repeated words</p><p>Second ending</p>
    </main>`).window.document;
    const target = resolveTextQuote(document.querySelector('main'), {
        type: 'TextQuoteSelector',
        exact: 'Repeated words',
        prefix: 'Second context',
        suffix: 'Second ending'
    });
    assert.equal(target, document.querySelectorAll('p')[4]);
});

test('falls back to the exact quote when surrounding text changes', () => {
    const document = new JSDOM('<main><p>Changed context</p><p>Stable quotation</p></main>').window.document;
    const target = resolveTextQuote(document.querySelector('main'), {
        type: 'TextQuoteSelector',
        exact: 'Stable quotation',
        prefix: 'Old context'
    });
    assert.equal(passageText(target), 'Stable quotation');
});
