import assert from 'node:assert/strict';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import { applyStructureIds, resolveNarrationSelector } from '../build/structure-ids.js';

function doc(body) {
    return new JSDOM(`<body>${body}</body>`).window.document;
}

test('keeps structures and references, generates structure ids, and removes phrase ids', () => {
    const document = doc('<section><h2 id="heading">Heading</h2><p id="phrase"><em id="word">Words</em></p><a href="#linked">Go</a><p id="linked">Linked</p></section>');
    const originalPhrase = document.getElementById('phrase');
    const selectors = applyStructureIds(document, ['phrase']);
    const section = document.querySelector('section');
    assert.match(section.id, /^section-\d+$/);
    assert(document.getElementById('heading'));
    assert(document.getElementById('linked'));
    assert.equal(document.getElementById('word'), null);
    assert.equal(originalPhrase.id, '');
    assert.equal(resolveNarrationSelector(document, selectors.get('phrase')), originalPhrase);
    assert.equal(selectors.get('phrase').type, 'FragmentSelector');
    assert.equal(selectors.get('phrase').value, section.id);
    assert.equal(selectors.get('phrase').refinedBy.type, 'CssSelector');
});

test('uses a main-relative selector without an anchoring structure', () => {
    const document = doc('<p id="phrase"><span>Words</span></p>');
    const target = document.getElementById('phrase');
    const selector = applyStructureIds(document, ['phrase']).get('phrase');
    assert.deepEqual(selector, { type: 'CssSelector', value: ':scope > p:nth-of-type(1)' });
    assert.equal(resolveNarrationSelector(document, selector), target);
});

test('ARIA active descendants, error messages and reading-flow targets retain their ids', () => {
    const document = doc('<div aria-activedescendant="active" aria-errormessage="error" aria-flowto="next last"></div><p id="active">Active</p><p id="error">Error</p><p id="next">Next</p><p id="last">Last</p><p id="unused">Unused</p>');
    applyStructureIds(document, []);
    for (const id of ['active', 'error', 'next', 'last']) assert.ok(document.getElementById(id));
    assert.equal(document.getElementById('unused'), null);
});

test('keep-all-ids retains old fragment selectors and does not generate ids', () => {
    const document = doc('<section><p id="phrase">Words</p></section>');
    const selector = applyStructureIds(document, ['phrase'], [], true).get('phrase');
    assert.equal(document.querySelector('section').id, '');
    assert(document.getElementById('phrase'));
    assert.deepEqual(selector, { type: 'FragmentSelector', value: 'phrase' });
});

test('the body is not a structure, and links with document roles are not either', () => {
    // EPUBs mark the body itself as body matter; it becomes <main>, whose id is #webbook-main
    const document = new JSDOM('<body class="epubtype_bodymatter"><p id="phrase">Words<a role="doc-backlink" href="#x">back</a></p><p id="x">X</p></body>').window.document;
    const target = document.getElementById('phrase');
    const selector = applyStructureIds(document, ['phrase']).get('phrase');
    assert.equal(document.body.id, '');
    assert.equal(document.querySelector('[role="doc-backlink"]').id, '');
    assert.equal(resolveNarrationSelector(document, selector), target);
});
