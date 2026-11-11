import assert from 'node:assert/strict';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import { mathMLSource, mathPlainText, readyMathText, mathSelectionFragment, selectionPayload } from '../src/js/copy-math.js';

function setup(body) {
    const dom = new JSDOM(`<main>${body}</main>`, { url: 'https://books.example/chapter.html' });
    for (const name of ['window', 'document', 'localStorage']) globalThis[name] = dom.window[name];
    // These tests check LaTeX copying; MathML is the default (and tested on its own)
    localStorage.setItem('webbook-copy-math-format', 'latex');
    return dom;
}

test('plain text chooses TeX annotation first, then a non-empty alttext without loading conversion', async () => {
    const dom = setup('<math alttext="alternative"><semantics><mi>x</mi><annotation encoding="application/x-tex">x^2</annotation></semantics></math>');
    const math = document.querySelector('math');
    assert.deepEqual(readyMathText(math), { text: 'x^2', format: 'LaTeX' });
    math.querySelector('annotation').textContent = ' ';
    assert.deepEqual(await mathPlainText(math), { text: 'alternative', format: 'LaTeX' });
    math.setAttribute('alttext', ' ');
    assert.equal(readyMathText(math), null);
    dom.window.close();
});

test('lazy library converts fractions, roots, powers, Greek letters and matrices', async () => {
    const dom = setup('<math><mfrac><mi>x</mi><mi>y</mi></mfrac><mo>+</mo><msqrt><mi>α</mi></msqrt><mo>+</mo><msup><mi>z</mi><mn>2</mn></msup></math>');
    const result = await mathPlainText(document.querySelector('math'));
    assert.equal(result.format, 'LaTeX');
    assert.match(result.text, /\\frac\{x\}\{y\}/);
    assert.match(result.text, /\\sqrt/);
    assert.match(result.text, /\\alpha/);
    document.querySelector('main').innerHTML = '<math><mfenced open="[" close="]"><mtable><mtr><mtd><mi>a</mi></mtd><mtd><mi>b</mi></mtd></mtr><mtr><mtd><mi>c</mi></mtd><mtd><mi>d</mi></mtd></mtr></mtable></mfenced></math>';
    assert.match((await mathPlainText(document.querySelector('math'))).text, /matrix/);
    dom.window.close();
});

test('conversion failure or empty output falls back to complete MathML and MathML preference bypasses conversion', async () => {
    const dom = setup('<math alttext="meaning"><mi>x</mi></math>');
    const math = document.querySelector('math');
    assert.deepEqual(await mathPlainText(math, 'mathml', () => { throw new Error('must not run'); }), { text: mathMLSource(math), format: 'MathML' });
    math.removeAttribute('alttext');
    for (const convert of [() => { throw new Error('unsupported'); }, () => '', () => undefined]) {
        assert.deepEqual(await mathPlainText(math, 'latex', convert), { text: mathMLSource(math), format: 'MathML' });
    }
    dom.window.close();
});

test('an invisible MathML fence becomes a TeX dot without changing the publication or MathML copy', async () => {
    const dom = setup('<math><mfenced open="{" close=""><mtable><mtr><mtd><mi>x</mi></mtd></mtr></mtable></mfenced></math>');
    const math = document.querySelector('math');
    const latex = await mathPlainText(math);
    assert.equal(latex.format, 'LaTeX');
    assert.match(latex.text, /\\right\./);
    assert.equal(math.querySelector('mfenced').getAttribute('close'), '');
    assert.match((await mathPlainText(math, 'mathml')).text, /close=""/);
    dom.window.close();
});

test('MathML clipboard has a namespace and publication semantics without reader attributes', () => {
    const dom = setup('<math id="book-math" class="publication webbook-copy-focus" tabindex="-1" data-webbook-copy-focus="" alttext="" altimg="images/formula.png"><mi mathvariant="bold">x</mi></math>');
    const source = mathMLSource(document.querySelector('math'));
    assert.match(source, /xmlns="http:\/\/www.w3.org\/1998\/Math\/MathML"/);
    assert.match(source, /id="book-math"/);
    assert.match(source, /mathvariant="bold"/);
    assert.match(source, /altimg="images\/formula.png"/);
    assert.doesNotMatch(source, /tabindex|data-webbook|webbook-copy|alttext/);
    assert.equal(document.querySelector('math').getAttribute('tabindex'), '-1');
    dom.window.close();
});

test('selection preserves full equations in HTML and surrounds LaTeX with dollar signs', async () => {
    const dom = setup('<p>Before <math><mfrac><mi>x</mi><mi>y</mi></mfrac></math> after.</p>');
    const range = document.createRange();
    range.selectNodeContents(document.querySelector('p'));
    const fragment = mathSelectionFragment(range);
    const result = await selectionPayload(fragment);
    assert.equal(result.plain, 'Before $\\frac{x}{y}$ after.');
    assert.match(result.html, /<math\b[^>]*><mfrac>/);
    const mathml = await selectionPayload(fragment, 'mathml');
    assert.match(mathml.plain, /^Before <math xmlns=/);
    assert.doesNotMatch(mathml.plain, /\$/);
    dom.window.close();
});

test('partial math selections expand the cloned range without changing the actual selection', async () => {
    const dom = setup('<p>Before <math><mfrac><mi>x</mi><mi>y</mi></mfrac></math> after.</p>');
    const range = document.createRange();
    range.setStart(document.querySelector('mi').firstChild, 0);
    range.setEnd(document.querySelectorAll('mi')[1].firstChild, 1);
    const start = range.startContainer;
    const result = await selectionPayload(mathSelectionFragment(range));
    assert.equal(result.plain, '$\\frac{x}{y}$');
    assert.match(result.html, /<math\b[^>]*><mfrac>/);
    assert.equal(range.startContainer, start);
    range.selectNodeContents(document.querySelector('p').firstChild);
    assert.equal(mathSelectionFragment(range), null);
    dom.window.close();
});
