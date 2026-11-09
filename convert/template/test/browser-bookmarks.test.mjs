import assert from 'node:assert/strict';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import {
    initBrowserBookmarks, structureAtReadingLine, updateFromFocus, updateFromReadingLine
} from '../src/js/browser-bookmarks.js';

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const cue = (selector, startTime = 12, endTime = 20) => ({
    startTime, endTime, text: JSON.stringify({ selector })
});

function box(elm, { top, bottom, visible = true }) {
    elm.getBoundingClientRect = () => ({ top, bottom, width: 100, height: bottom - top });
    elm.getClientRects = () => visible ? [elm.getBoundingClientRect()] : [];
}

test('bookmark tracking uses stable narrated and structural positions and waits for placement', async () => {
    const dom = new JSDOM(`
        <div id="webbook-top-toolbar"></div>
        <main><h2 id="chapter">Chapter</h2><p>Phrase</p></main>
        <div id="webbook-toolbar"><audio src="audio.mp3"><track></audio></div>
    `, { url: 'https://example.test/chapter.html' });
    Object.assign(globalThis, {
        window: dom.window, document: dom.window.document, history: dom.window.history,
        Element: dom.window.Element, Node: dom.window.Node, CustomEvent: dom.window.CustomEvent,
        localStorage: dom.window.localStorage
    });
    const toolbar = document.getElementById('webbook-top-toolbar');
    toolbar.getBoundingClientRect = () => ({ top: 0, bottom: 20, width: 100, height: 20 });
    const phrase = document.querySelector('main p');
    box(document.getElementById('chapter'), { top: 0, bottom: 30 });
    box(phrase, { top: 55, bottom: 85 });
    const cues = [cue({ type: 'CssSelector', value: ':scope > p:nth-of-type(1)' })];
    Object.defineProperty(document.querySelector('audio'), 'textTracks', { value: [{ cues }] });

    initBrowserBookmarks();
    await wait(400);
    assert.equal(updateFromReadingLine(), true);
    assert.equal(locationHref(), 'https://example.test/chapter.html?t=12#chapter');

    phrase.id = 'legacy-phrase';
    cues[0].text = JSON.stringify({ selector: { type: 'FragmentSelector', value: 'legacy-phrase' } });
    history.replaceState(null, '', '/chapter.html');
    assert.equal(updateFromReadingLine(), true);
    assert.equal(locationHref(), 'https://example.test/chapter.html#legacy-phrase');
    phrase.removeAttribute('id');
    cues[0].text = JSON.stringify({ selector: { type: 'CssSelector', value: ':scope > p:nth-of-type(1)' } });

    history.replaceState(null, '', '/chapter.html?t=12#chapter');
    document.dispatchEvent(new CustomEvent('webbook:pageplacing'));
    assert.equal(updateFromReadingLine(), false);
    phrase.setAttribute('tabindex', '-1');
    phrase.focus();
    assert.equal(updateFromFocus(phrase), false);
    assert.equal(locationHref(), 'https://example.test/chapter.html?t=12#chapter');

    // A cached track can become ready before pagechange. pagechange must not restart the hold.
    document.dispatchEvent(new CustomEvent('webbook:playerready'));
    document.dispatchEvent(new CustomEvent('webbook:pagechange'));
    await wait(400);
    assert.equal(updateFromReadingLine(), false); // already the same precise URL

    document.querySelector('#webbook-toolbar').remove();
    document.querySelector('main').innerHTML = `
        <h2 id="visible">Visible</h2>
        <div id="css-hidden">Hidden by CSS</div>
        <div id="webbook-injected">Reader UI</div>
        <section id="current">Current</section>`;
    const visible = document.getElementById('visible');
    const hidden = document.getElementById('css-hidden');
    const ui = document.getElementById('webbook-injected');
    const current = document.getElementById('current');
    box(visible, { top: 5, bottom: 25 });
    box(hidden, { top: 0, bottom: 0, visible: false });
    box(ui, { top: 45, bottom: 55 });
    box(current, { top: 60, bottom: 90 });
    assert.equal(structureAtReadingLine(), current);
    assert.equal(updateFromReadingLine(), true);
    assert.equal(locationHref(), 'https://example.test/chapter.html#current');
});

function locationHref() {
    return window.location.href;
}
