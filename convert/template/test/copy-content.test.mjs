import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { initCopyContent, enhanceCopyContent, equationHere, equationButtonName, copyEquation, copyCode, handleMathCopy } from '../src/js/copy-content.js';
import { initReaderActionStatus, getActions } from '../src/js/reader-actions.js';
import { elmForCue } from '../src/js/cue-selector.js';
import { exportSettings, importSettings, resetSettings } from '../src/js/settings-file.js';
import { copyMathFormat } from '../src/js/copy-math.js';

const fixture = readFileSync(new URL('./fixtures/copy-content.html', import.meta.url), 'utf8');
function setup({ secure = true, rich = true } = {}) {
    const dom = new JSDOM(fixture, { url: secure ? 'https://books.example/chapter.html' : 'http://books.example/chapter.html' });
    for (const name of ['window', 'document', 'localStorage', 'sessionStorage', 'Event', 'Element', 'Node', 'CustomEvent']) globalThis[name] = dom.window[name];
    // These tests check LaTeX copying; MathML is the default (and tested on its own)
    localStorage.setItem('webbook-copy-math-format', 'latex');
    Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
    Object.defineProperty(window, 'isSecureContext', { value: secure });
    const writes = [];
    Object.defineProperty(navigator, 'clipboard', { value: { write: async items => { writes.push(items[0].data); }, writeText: async text => { writes.push({ text }); } } });
    if (rich) window.ClipboardItem = class { constructor(data) { this.data = data; } };
    dom.window.HTMLElement.prototype.showPopover = function () { this.dataset.open = 'true'; };
    dom.window.HTMLElement.prototype.hidePopover = function () { delete this.dataset.open; };
    initReaderActionStatus();
    return { dom, writes };
}
const wait = () => new Promise(resolve => setTimeout(resolve, 40));

test('display equations and pre get named buttons, inline math and inline code add no tab stops', () => {
    const { dom } = setup();
    const publicationText = document.querySelector('main').textContent;
    initCopyContent();
    assert.equal(document.querySelector('main').textContent, publicationText);
    assert.equal(document.querySelectorAll('main .webbook-copy-button').length, 4);
    assert.equal(document.querySelector('#numbered button').getAttribute('aria-label'), 'Copy equation 3.2');
    assert.equal(equationButtonName(document.getElementById('inline-math')), 'Copy equation');
    assert.equal(document.querySelector('#inline .webbook-copy-button'), null);
    assert.equal(document.querySelector('#inline-code .webbook-copy-button'), null);
    assert.equal(document.getElementById('inline-math').getAttribute('tabindex'), '-1');
    assert.equal(document.getElementById('webbook-copy-math-options').closest('[data-settings-section]').dataset.settingsSection, 'text');
    const actions = getActions().filter(action => ['copy-equation', 'copy-selection', 'copy-code'].includes(action.id));
    assert.equal(actions.length, 3);
    // No Copy menu
    assert.equal(document.getElementById('webbook-copy-open'), null);
    assert.equal(document.getElementById('webbook-copy'), null);
    assert.equal(getActions().some(action => action.id === 'open-copy-menu'), false);
    assert.ok(actions.every(action => action.defaultKeys.length === 0));
    enhanceCopyContent();
    assert.equal(document.querySelectorAll('main .webbook-copy-button').length, 4);
    dom.window.close();
});

test('copy starts a rich write before resolving its lazy LaTeX content and announces the result', async () => {
    const { dom, writes } = setup();
    initCopyContent();
    const copying = copyEquation({ math: document.getElementById('inline-math'), count: 1 });
    assert.equal(writes.length, 1);
    assert.equal(await (await writes[0]['text/plain']).text(), '\\frac{x}{y}');
    assert.match(await writes[0]['text/html'].text(), /<mfrac>/);
    await copying;
    await wait();
    assert.equal(document.getElementById('webbook-action-status').textContent, 'Equation copied as LaTeX');
    dom.window.close();
});

test('without ClipboardItem, copy uses writeText and respects the MathML preference', async () => {
    const { dom, writes } = setup({ rich: false });
    localStorage.setItem('webbook-copy-math-format', 'mathml');
    await copyEquation({ math: document.getElementById('inline-math'), count: 1 });
    assert.match(writes[0].text, /^<math.*<mfrac>/);
    dom.window.close();
});

test('selection wins over focus, then narration; multiple narrated equations choose the first', async () => {
    const { dom } = setup();
    const selected = document.getElementById('inline-math');
    const focused = document.getElementById('display-math');
    const range = document.createRange();
    range.selectNodeContents(selected.querySelector('mi'));
    assert.equal(equationHere(range, focused).math, selected);
    assert.equal(equationHere(null, focused).math, focused);
    const phrase = document.createElement('p');
    phrase.innerHTML = '<math><mi>a</mi></math> and <math><mi>b</mi></math>';
    document.querySelector('main').append(phrase);
    const target = equationHere(null, document.body, phrase);
    assert.equal(target.count, 2);
    await copyEquation(target); await wait();
    assert.match(document.getElementById('webbook-action-status').textContent, /first of 2 equations/);
    await copyEquation({ math: null }); await wait();
    assert.equal(document.getElementById('webbook-action-status').textContent, 'No equation here.');
    dom.window.close();
});

test('native Copy writes rich HTML and LaTeX only for selections containing math', async () => {
    const { dom } = setup();
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(document.getElementById('inline'));
    selection.addRange(range);
    const data = {};
    let prevented = false;
    await copyEquation({ math: document.getElementById('inline-math'), count: 1 });
    handleMathCopy({ target: document.body, clipboardData: { setData: (type, value) => data[type] = value }, preventDefault: () => { prevented = true; } });
    assert.equal(prevented, true);
    assert.equal(data['text/plain'], 'Before $\\frac{x}{y}$ after.');
    assert.match(data['text/html'], /<math/);
    range.selectNodeContents(document.getElementById('inline').firstChild);
    selection.removeAllRanges(); selection.addRange(range);
    prevented = false;
    handleMathCopy({ target: document.body, preventDefault: () => { prevented = true; } });
    assert.equal(prevented, false);
    dom.window.close();
});

test('code text is copied exactly, including indentation and the final newline', async () => {
    const { dom, writes } = setup();
    const pre = document.getElementById('listing');
    const expected = pre.textContent;
    initCopyContent();
    await copyCode(pre);
    assert.equal(writes[0].text, expected);
    assert.match(writes[0].text, /\n    return x \* x;\n}\n$/);
    dom.window.close();
});

test('plain HTTP hides copy controls and leaves ordinary native copying untouched', () => {
    const { dom } = setup({ secure: false });
    initCopyContent();
    assert.equal(document.querySelector('main .webbook-copy-button'), null);
    assert.equal(getActions().find(action => action.id === 'copy-equation').isAvailable(), false);
    dom.window.close();
});

test('cue paths resolve before wrappers move MathML; a pending track delays all main changes', () => {
    const { dom } = setup();
    document.body.insertAdjacentHTML('beforeend', '<section id="webbook-toolbar"><audio src="chapter.mp3"><track></audio></section>');
    const track = document.querySelector('track');
    const cue = { text: JSON.stringify({ selector: { type: 'CssSelector', value: ':scope > p:nth-of-type(1) > math' } }) };
    Object.defineProperty(track, 'readyState', { value: 0, writable: true });
    Object.defineProperty(track, 'track', { value: { cues: [cue] } });
    enhanceCopyContent();
    assert.equal(document.querySelector('main .webbook-copy-button'), null);
    track.readyState = 2;
    const target = document.getElementById('inline-math');
    enhanceCopyContent();
    assert.equal(elmForCue(cue), target);
    assert.ok(document.querySelector('main .webbook-copy-button'));
    dom.window.close();
});

test('the format preference participates in export, validated import and reset', () => {
    const { dom } = setup();
    initCopyContent();
    const select = document.getElementById('webbook-copy-math-options');
    select.value = 'mathml'; select.dispatchEvent(new Event('change'));
    const exported = exportSettings();
    assert.equal(exported.settings['webbook-copy-math-format'], 'mathml');
    resetSettings(); assert.equal(localStorage.getItem('webbook-copy-math-format'), null);
    importSettings(exported); assert.equal(localStorage.getItem('webbook-copy-math-format'), 'mathml');
    assert.throws(() => importSettings({ ...exported, settings: { 'webbook-copy-math-format': 'other' } }), /Invalid value/);
    dom.window.close();
});

test('equations copy as MathML unless the reader chooses LaTeX', () => {
    const { dom } = setup();
    localStorage.removeItem('webbook-copy-math-format');
    assert.equal(copyMathFormat(), 'mathml');
    initCopyContent();
    assert.equal(document.getElementById('webbook-copy-math-options').value, 'mathml');
    localStorage.setItem('webbook-copy-math-format', 'latex');
    assert.equal(copyMathFormat(), 'latex');
    dom.window.close();
});
