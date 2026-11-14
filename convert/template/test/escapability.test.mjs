import assert from 'node:assert/strict';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<main></main>', { url: 'https://books.example/chapter.html' });
for (const name of ['window', 'document', 'localStorage', 'CustomEvent', 'Node']) globalThis[name] = dom.window[name];
const { findEscapableStructure } = await import('../src/js/escapability.js');

function page(html) {
    document.querySelector('main').innerHTML = html;
}

test('an equation narration reads on its own can be skipped past, as a table or list can', () => {
    page('<p id="before">Text</p><div><math id="eq" display="block"><mi id="x">x</mi><mo>=</mo><mn>1</mn></math></div><table id="t"><tr><td><math id="in-cell"><mi>y</mi></math></td></tr></table>');
    assert.deepEqual(findEscapableStructure(document.getElementById('eq')), { elm: document.getElementById('eq'), label: 'equation' });
    // A phrase inside the equation leaves the whole equation
    assert.equal(findEscapableStructure(document.getElementById('x')).elm, document.getElementById('eq'));
    // The closest structure wins: an equation in a table cell is skipped on its own
    assert.equal(findEscapableStructure(document.getElementById('in-cell')).label, 'equation');
    assert.equal(findEscapableStructure(document.getElementById('before')), null);
});

test('a phrase that holds an inline equation is not an equation to skip', () => {
    page('<p><span id="phrase">Let <math><mi>x</mi></math> be large.</span></p>');
    assert.equal(findEscapableStructure(document.getElementById('phrase')), null);
});

test('a numbered equation block (plan 24) is skipped as a whole', () => {
    page('<div class="webbook-equation" id="block"><span class="webbook-equation-number">(1.1)</span><math id="m"><mi>x</mi></math></div>');
    assert.equal(findEscapableStructure(document.getElementById('m')).elm, document.getElementById('m'));
    assert.equal(findEscapableStructure(document.querySelector('.webbook-equation-number')).elm, document.getElementById('block'));
});

test('endnotes escape the whole section while nested structures retain their own escape', () => {
    page('<section role="doc-endnotes" id="notes"><h1 id="heading">Notes</h1><ol><li id="one"><p id="text">One</p><table id="table"><tr><td id="cell">Cell</td></tr></table><ul id="nested"><li id="item">Item</li></ul></li><li id="two"><p>Two</p></li></ol></section>');
    assert.equal(findEscapableStructure(document.getElementById('text')).elm.id, 'notes');
    assert.equal(findEscapableStructure(document.getElementById('cell')).elm.id, 'table');
    assert.equal(findEscapableStructure(document.getElementById('item')).elm.id, 'nested');
    assert.equal(findEscapableStructure(document.getElementById('heading')).elm.id, 'notes');
});

test('exclusion does not create escape controls for page markers or remove escapability from structures', () => {
    page('<span class="epubtype_pagebreak" id="page">1</span><aside role="doc-footnote" id="note"><p id="text">Note</p></aside>');
    for (const value of ['true', 'false']) {
        localStorage.setItem('webbook-skip-pagebreak', value);
        localStorage.setItem('webbook-skip-footnote', value);
        assert.equal(findEscapableStructure(document.getElementById('page')), null);
        assert.equal(findEscapableStructure(document.getElementById('text')).elm.id, 'note');
    }
});

test('browsing endnotes offers Leave notes and leaves the whole section at book end', async () => {
    globalThis.history = dom.window.history;
    history.replaceState(null, '', 'chapter.html');
    localStorage.setItem('webbook-skip-footnote', 'false');
    page('<section role="doc-endnotes"><ol><li id="first"><p>First</p></li><li id="last"><p>Last</p></li></ol></section>');
    document.body.insertAdjacentHTML('beforeend', '<div id="webbook-escape-container"><button id="webbook-escape-btn" hidden>Skip past <span id="webbook-escape-label"></span></button><span id="webbook-escape-status"></span></div><section id="webbook-toolbar"><audio></audio></section>');
    const { initEscapability, handleEscapableStructure, activateCurrentEscape, canActivateCurrentEscape } = await import('../src/js/escapability.js');
    const audio = document.querySelector('audio');
    let paused = false;
    audio.pause = () => { paused = true; };
    Object.defineProperty(audio, 'duration', { value: 10 });
    const cues = ['first', 'last'].map((id, index) => ({ startTime: index * 5, endTime: (index + 1) * 5, text: JSON.stringify({ selector: { type: 'FragmentSelector', value: id } }) }));
    const track = { cues };
    initEscapability();
    handleEscapableStructure(document.getElementById('first'), track, 0);
    assert.equal(document.getElementById('webbook-escape-btn').hidden, false);
    assert.equal(document.getElementById('webbook-escape-label').textContent, 'notes');
    assert.equal(activateCurrentEscape(), true);
    assert.equal(audio.currentTime, 10, 'leaves both notes rather than advancing to the second');
    assert.equal(paused, true);
    handleEscapableStructure(document.getElementById('last'), track, 1);
    assert.equal(canActivateCurrentEscape(), true);
    activateCurrentEscape();
    assert.equal(audio.currentTime, 10);
    assert.equal(paused, true);
    assert.equal(canActivateCurrentEscape(), false);
    document.querySelector('main').insertAdjacentHTML('beforeend', '<p id="after">After notes</p>');
    track.cues.push({ startTime: 10, endTime: 15, text: JSON.stringify({ selector: { type: 'FragmentSelector', value: 'after' } }) });
    paused = false;
    handleEscapableStructure(document.getElementById('first'), track, 0);
    activateCurrentEscape();
    assert.equal(audio.currentTime, 10, 'jumps past every endnote to the following text');
    assert.equal(paused, false);
});

test('marked endnotes leave their section, while standalone notes retain their escape', () => {
    page('<section class="epubtype_endnotes" id="section"><ol><li class="epubtype_endnote" id="note"><p id="text">Note</p><ul id="nested"><li id="item">Item</li></ul></li></ol></section><aside role="doc-footnote" id="standalone"><p id="foot">Footnote</p></aside>');
    assert.equal(findEscapableStructure(document.getElementById('text')).elm.id, 'section');
    assert.equal(findEscapableStructure(document.getElementById('item')).elm.id, 'nested');
    assert.equal(findEscapableStructure(document.getElementById('foot')).elm.id, 'standalone');
});
