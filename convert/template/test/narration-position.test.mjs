import assert from 'node:assert/strict';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import { positionAnchor, positionUrlForElement, seekToHashTarget } from '../src/js/narration-position.js';

function installDom(url = 'https://example.test/chapter.html') {
    const dom = new JSDOM(`<main>
        <h2 id="one">One</h2><p>First phrase</p>
        <h2 id="two">Two</h2><p>Second phrase</p>
    </main>`, { url });
    globalThis.window = dom.window;
    globalThis.document = dom.window.document;
    globalThis.history = dom.window.history;
    globalThis.Node = dom.window.Node;
    globalThis.CustomEvent = dom.window.CustomEvent;
    dom.window.scrollTo = () => {};
    return dom;
}

function cue(selector, startTime, endTime) {
    return { startTime, endTime, text: JSON.stringify({ selector }) };
}

test('position URLs combine a structural hash with precise narration time', () => {
    installDom();
    const phrase = document.querySelector('p');
    assert.equal(positionAnchor(phrase).id, 'one');
    assert.equal(positionUrlForElement(phrase, 12.3456).href,
        'https://example.test/chapter.html?t=12.346#one');
});

test('a time outside the named structure falls back to its first cue', () => {
    installDom('https://example.test/chapter.html?t=17#one');
    const cues = [
        cue({ type: 'CssSelector', value: ':scope > p:nth-of-type(1)' }, 0, 8),
        cue({ type: 'FragmentSelector', value: 'two' }, 8, 10),
        cue({ type: 'CssSelector', value: ':scope > p:nth-of-type(2)' }, 10, 20)
    ];
    const audio = { currentTime: -1 };
    assert.equal(seekToHashTarget(audio, { cues }, '#one'), true);
    assert.equal(audio.currentTime, 0);
});

test('a valid time seeks and places the exact phrase', () => {
    installDom('https://example.test/chapter.html?t=4#one');
    const phrase = document.querySelector('p');
    phrase.getBoundingClientRect = () => ({ top: 0, bottom: 20 });
    const cues = [cue({ type: 'CssSelector', value: ':scope > p:nth-of-type(1)' }, 0, 8)];
    const audio = { currentTime: -1 };
    assert.equal(seekToHashTarget(audio, { cues }, '#one'), true);
    assert.equal(audio.currentTime, 4);
});

test('a main-relative cue still supports a precise time when the page has no structure id', () => {
    const dom = new JSDOM('<main><p>Only phrase</p></main>', { url: 'https://example.test/plain.html?t=2' });
    globalThis.window = dom.window;
    globalThis.document = dom.window.document;
    globalThis.history = dom.window.history;
    globalThis.Node = dom.window.Node;
    globalThis.CustomEvent = dom.window.CustomEvent;
    dom.window.scrollTo = () => {};
    const phrase = document.querySelector('p');
    phrase.getBoundingClientRect = () => ({ top: 0, bottom: 20 });
    assert.equal(positionUrlForElement(phrase, 2).href, 'https://example.test/plain.html?t=2');
    const audio = { currentTime: -1 };
    const cues = [cue({ type: 'CssSelector', value: ':scope > p:nth-of-type(1)' }, 0, 5)];
    assert.equal(seekToHashTarget(audio, { cues }, ''), true);
    assert.equal(audio.currentTime, 2);
});
