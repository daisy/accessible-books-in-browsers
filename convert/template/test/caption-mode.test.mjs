import assert from 'node:assert/strict';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import { captionTextForElement, captionContentForElement, initCaptionMode, startCaptionModeForPage, canStepCaption } from '../src/js/caption-mode.js';
import { stepPhrase } from '../src/js/player.js';

function page(body) {
    const dom = new JSDOM(`<main>${body}</main>`, { url: 'https://books.example/chapter.html' });
    globalThis.window = dom.window;
    globalThis.document = dom.window.document;
    globalThis.localStorage = dom.window.localStorage;
    globalThis.CustomEvent = dom.window.CustomEvent;
    globalThis.Node = dom.window.Node;
    dom.window.scrollTo = () => {};
    return dom;
}

function caption(elm) {
    const result = document.createElement('p');
    result.append(captionContentForElement(elm));
    return result;
}

test('captions keep superscript note numbers without adding brackets or changing the book', () => {
    const dom = page('<p>The keeper climbed.<a id="ref" role="doc-noteref" href="#note"><sup>1</sup></a> Then she lit the lamp.</p>');
    const phrase = document.querySelector('p');
    const original = phrase.outerHTML;
    const result = caption(phrase);
    assert.equal(result.innerHTML, 'The keeper climbed.<sup>1</sup> Then she lit the lamp.');
    assert.equal(captionTextForElement(phrase), phrase.textContent);
    assert.equal(phrase.outerHTML, original);
    assert.equal(document.querySelectorAll('#ref').length, 1);
    dom.window.close();
});

test('existing brackets stay as written and reference-only cues have one superscript', () => {
    const dom = page('<p>Text [<a role="doc-noteref"><sup class="epubtype_noteref">1</sup></a>, <a role="doc-noteref">2</a>].</p>');
    assert.equal(caption(document.querySelector('p')).innerHTML, 'Text [<sup>1</sup>, <sup>2</sup>].');
    for (const elm of [document.querySelector('sup'), document.querySelector('a')]) {
        assert.equal(caption(elm).innerHTML, '<sup>1</sup>');
    }
    dom.window.close();
});

test('local note links and semantic cross-page references are superscript; other links stay plain', () => {
    const dom = page('<p>Note<a href="#note">2</a>; page <a href="#page">3</a>; other<a role="doc-noteref" href="notes.html#two">†</a>.</p><aside id="note" role="doc-footnote">A note</aside><span id="page" role="doc-pagebreak">3</span>');
    assert.equal(caption(document.querySelector('p')).innerHTML, 'Note<sup>2</sup>; page 3; other<sup>†</sup>.');
    dom.window.close();
});

test('captions copy text without interactive markup, duplicate ids, styles or executable content', () => {
    const dom = page('<p id="phrase" style="color:red">Text <a role="doc-noteref" onclick="alert(1)">1<img src="x" onerror="alert(1)"></a><script>bad()</script><style>p{color:red}</style></p>');
    const result = caption(document.querySelector('p'));
    assert.equal(result.innerHTML, 'Text <sup>1</sup>');
    dom.window.close();
});

test('page labels, whitespace and image alternatives keep their existing caption behavior', () => {
    const dom = page('<p> Ordinary   text\n continues. </p><span class="epubtype_pagebreak" aria-label="Page 12">12</span><figure><img alt="A lighthouse at dusk"></figure>');
    assert.equal(captionTextForElement(document.querySelector('p')), 'Ordinary text continues.');
    assert.equal(caption(document.querySelector('span')).textContent, 'Page 12');
    assert.equal(caption(document.querySelector('figure')).textContent, 'A lighthouse at dusk');
    dom.window.close();
});

test('caption view keeps superscripts initially and after an in-place page change', () => {
    const dom = page('<p>First phrase<a role="doc-noteref"><sup>1</sup></a>.</p>');
    localStorage.setItem('webbook-caption-mode', 'true');
    initCaptionMode();
    assert.equal(document.getElementById('webbook-caption-text').innerHTML, 'First phrase<sup>1</sup>.');
    document.querySelector('main').innerHTML = '<p>Next phrase<a href="#note"><sup>2</sup></a>.</p><aside id="note" role="doc-footnote">The note.</aside>';
    startCaptionModeForPage();
    assert.equal(document.getElementById('webbook-caption-text').innerHTML, 'Next phrase<sup>2</sup>.');
    document.querySelector('main').insertAdjacentHTML('beforeend', '<p>Final phrase.</p>');
    startCaptionModeForPage();
    assert.equal(canStepCaption(1), true);
    assert.equal(stepPhrase(1), true, 'shared phrase navigation works without a narration track');
    assert.equal(document.getElementById('webbook-caption-text').textContent, 'Final phrase.');
    assert.equal(canStepCaption(1), false);
    assert.equal(stepPhrase(1), false, 'the last caption stays put without a next page');
    assert.equal(stepPhrase(-1), true);
    assert.equal(document.getElementById('webbook-caption-text').innerHTML, 'Next phrase<sup>2</sup>.');
    const button = document.createElement('button');
    document.body.append(button);
    button.focus();
    button.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
    assert.equal(document.getElementById('webbook-caption-text').textContent, 'Final phrase.', 'toolbar focus must not block caption arrows');
    const input = document.createElement('input');
    input.type = 'range';
    document.body.append(input);
    const event = new dom.window.KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true });
    input.dispatchEvent(event);
    assert.equal(event.defaultPrevented, false, 'sliders retain their arrow keys');
    assert.equal(document.getElementById('webbook-caption-text').textContent, 'Final phrase.');
    dom.window.close();
});
