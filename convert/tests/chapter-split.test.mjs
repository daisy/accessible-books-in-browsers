import assert from 'node:assert/strict';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import {
    ensureHeadingIds,
    extractDocumentPiece,
    pieceForElement,
    planDocumentSplit,
    removeIdsNotOwnedByPage
} from '../build/chapter-split.js';
import { landmarkCoverHref, rewriteSourceHref } from '../build/model.js';
import { parseGuideCoverHref } from '../build/epubParser/package-document.js';
import { rewriteInternalLinks } from '../build/content-transform.js';
import { collectSearchPassages } from '../build/create-search-index.js';
import { resolveTextQuote } from '../template/src/js/search-anchor.js';

function documentFor(body) {
    return new JSDOM(`<!doctype html><html><head><title>Book</title></head><body lang="fr" dir="rtl">${body}</body></html>`).window.document;
}

test('uses EPUB cover-document declarations instead of assuming the first spine page', () => {
    const landmarks = documentFor(`<nav><ol>
        <li><a epub:type="bodymatter" href="/book/chapter.xhtml">Start</a></li>
        <li><a epub:type="cover" href="/book/cover.xhtml#art">Cover</a></li>
    </ol></nav>`).querySelector('ol');
    assert.equal(landmarkCoverHref(landmarks), '/book/cover.xhtml#art');

    const packageDoc = new JSDOM(`<?xml version="1.0"?>
        <package xmlns="http://www.idpf.org/2007/opf"><guide>
            <reference type="cover" href="text/cover.xhtml#image"/>
        </guide></package>`, { contentType: 'application/xml' }).window.document;
    assert.equal(parseGuideCoverHref('/book/package.opf', packageDoc), '/book/text/cover.xhtml#image');
    assert.equal(landmarkCoverHref(undefined), undefined);
});

test('chooses the shallowest TOC depth with at least two valid targets', () => {
    const doc = documentFor('<h1 id="top">Top</h1><h2 id="a">A</h2><h2 id="b">B</h2>');
    const plan = planDocumentSplit(doc, [
        { depth: 1, fragment: 'top', title: 'Top' },
        { depth: 2, fragment: 'a', title: 'A' },
        { depth: 2, fragment: 'b', title: 'B' }
    ]);
    assert.deepEqual(plan.cutIds, ['a', 'b']);
    assert.equal(plan.pieces, 3);
    assert.equal(planDocumentSplit(doc, [{ depth: 1, fragment: 'top', title: 'Top' }]), undefined);
});

test('lifts a heading boundary to its section but not an inline target', () => {
    const sectionDoc = documentFor('<section class="chapter"><h2 id="a">A</h2><p>One</p></section><section class="chapter"><h2 id="b">B</h2><p>Two</p></section>');
    const sectionPlan = planDocumentSplit(sectionDoc, [
        { depth: 1, fragment: 'a', title: 'A' }, { depth: 1, fragment: 'b', title: 'B' }
    ]);
    const second = extractDocumentPiece(sectionDoc, sectionPlan, 1);
    assert.equal(second.body.firstElementChild?.localName, 'section');
    assert.equal(second.body.firstElementChild?.querySelector('h2')?.id, 'b');

    const inlineDoc = documentFor('<p>Before <span id="a">A</span> after.</p><p><span id="b">B</span> end.</p>');
    const inlinePlan = planDocumentSplit(inlineDoc, [
        { depth: 1, fragment: 'a', title: 'A' }, { depth: 1, fragment: 'b', title: 'B' }
    ]);
    assert.equal(inlinePlan.leading, true);
    const inlineChapter = extractDocumentPiece(inlineDoc, inlinePlan, 1);
    assert.equal(inlineChapter.body.firstElementChild?.localName, 'p');
    assert.match(inlineChapter.body.textContent, /A after/);
});

test('keeps a leading page only when it has meaningful content', () => {
    const empty = documentFor('<div>  </div><h2 id="a">A</h2><h2 id="b">B</h2>');
    const emptyPlan = planDocumentSplit(empty, [
        { depth: 1, fragment: 'a', title: 'A' }, { depth: 1, fragment: 'b', title: 'B' }
    ]);
    assert.equal(emptyPlan.leading, false);
    assert.equal(emptyPlan.pieces, 2);

    const intro = documentFor('<h1>Book</h1><p>Introduction</p><h2 id="a">A</h2><h2 id="b">B</h2>');
    const introPlan = planDocumentSplit(intro, [
        { depth: 2, fragment: 'a', title: 'A' }, { depth: 2, fragment: 'b', title: 'B' }
    ]);
    assert.equal(introPlan.leading, true);
    assert.equal(introPlan.pieces, 3);
});

test('Range cloning preserves wrappers and body attributes while ids remain unique', () => {
    const source = '/book/content.xhtml';
    const original = documentFor('<div id="wrapper" class="outer"><section lang="bn"><h2 id="a">A</h2><p id="one">One</p><h2 id="b">B</h2><p id="two">Two</p></section></div>');
    ensureHeadingIds(original);
    const plan = planDocumentSplit(original, [
        { depth: 1, fragment: 'a', title: 'A' }, { depth: 1, fragment: 'b', title: 'B' }
    ]);
    const outputs = ['content.html', 'content-2.html'];
    const idToOutput = new Map();
    for (const element of original.querySelectorAll('[id]')) {
        idToOutput.set(`${source}#${element.id}`, outputs[pieceForElement(original, plan, element)]);
    }
    const pieces = outputs.map((output, piece) => {
        const doc = documentFor(original.body.innerHTML);
        extractDocumentPiece(doc, plan, piece);
        removeIdsNotOwnedByPage(doc, source, output, idToOutput);
        return doc;
    });
    assert(pieces.every(doc => doc.body.lang === 'fr' && doc.body.dir === 'rtl'));
    assert(pieces.every(doc => doc.querySelector('.outer section[lang="bn"]')));
    const ids = pieces.flatMap(doc => Array.from(doc.querySelectorAll('[id]'), element => element.id));
    assert.equal(ids.length, new Set(ids).size);
    assert.equal(pieces[0].getElementById('wrapper')?.className, 'outer');
    assert.equal(pieces[1].getElementById('wrapper'), null);
});

test('rewrites split fragments across pages and drops TOC cut-point fragments', () => {
    const source = '/book/content.xhtml';
    const sourceToOutput = new Map([[source, 'content.html']]);
    const idToOutput = new Map([
        [`${source}#a`, 'content.html'], [`${source}#b`, 'content-2.html'], [`${source}#note`, 'content-2.html']
    ]);
    const cutPoints = new Map([[`${source}#a`, 'content.html'], [`${source}#b`, 'content-2.html']]);
    assert.equal(rewriteSourceHref(`${source}#b`, sourceToOutput, idToOutput, cutPoints, true), 'content-2.html');

    const doc = documentFor('<a id="same" href="#a">same</a><a id="other" href="#note">other</a>');
    rewriteInternalLinks(doc, { sourcePath: source, outputFilename: 'content.html' }, {
        sourceToOutput, idToOutput, cutPointToOutput: cutPoints
    });
    assert.equal(doc.getElementById('same').getAttribute('href'), '#a');
    assert.equal(doc.getElementById('other').getAttribute('href'), 'content-2.html#note');
});

test('narrated ids and non-narrated text quotes resolve on split pages', () => {
    const original = documentFor('<section><h2 id="a">A</h2><p id="spoken">Narrated words</p></section><section><h2 id="b">B</h2><p>Quiet words</p></section>');
    const plan = planDocumentSplit(original, [
        { depth: 1, fragment: 'a', title: 'A' }, { depth: 1, fragment: 'b', title: 'B' }
    ]);
    const data = { version: 1, lang: 'en', pages: [{ href: 'a.html', title: 'A' }, { href: 'b.html', title: 'B' }], passages: [] };
    const narrated = extractDocumentPiece(documentFor(original.body.innerHTML), plan, 0);
    collectSearchPassages(data, narrated, { index: 0 }, ['spoken']);
    const quiet = extractDocumentPiece(documentFor(original.body.innerHTML), plan, 1);
    collectSearchPassages(data, quiet, { index: 1 }, []);

    assert(narrated.getElementById(data.passages[0].id));
    const quoted = data.passages.find(passage => passage.selector?.exact === 'Quiet words');
    assert(quoted);
    assert.equal(resolveTextQuote(quiet.body, quoted.selector)?.textContent, 'Quiet words');
});
