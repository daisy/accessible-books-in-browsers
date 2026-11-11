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
