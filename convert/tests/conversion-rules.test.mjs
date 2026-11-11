import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import { transformContent } from '../build/content-transform.js';
import { cleanPublicationMarkup } from '../build/markup-cleanup.js';
import { cleanLeftoverAnchors } from '../build/conversion-rules.js';
import { applyStructureIds, resolveNarrationSelector } from '../build/structure-ids.js';
import { ImageAssetRegistry } from '../build/assets.js';
import { ConversionReport } from '../build/conversion-report.js';
import { parse as parseNav } from '../build/epubParser/nav-document.js';

function fixture(body, overrides = {}) {
    const doc = new JSDOM(`<body>${body}</body>`).window.document;
    const report = new ConversionReport({ declared: 'en', effective: 'en' }, {});
    const options = { bookLanguage: 'en', cleanup: true, page: 'chapter.html', protectedIds: [], narratedTargetIds: [], responsiveTables: false, report, ...overrides };
    cleanPublicationMarkup(doc, options);
    return { doc, report, options };
}
const math = '<math xmlns="http://www.w3.org/1998/Math/MathML"><msup><mi>x</mi><mn>2</mn></msup></math>';

test('numbered equations use structure and text, preserving MathML and DOM order', () => {
    for (const label of ['(1.1)', '(A.3)', '1.2', '[4]', '(১.২)']) for (const reversed of [false, true]) {
        const number = `<span>${label}</span>`;
        const expression = `<span class="neutral-wrapper">${math}</span>`;
        const body = `<div>${reversed ? expression + number : number + expression}</div>`;
        const { doc, report } = fixture(body);
        const block = doc.querySelector('.webbook-equation');
        assert.ok(block, label);
        assert.equal(doc.querySelector('.webbook-equation-number').textContent, label);
        assert.equal(doc.querySelector('math').outerHTML, new JSDOM(math).window.document.querySelector('math').outerHTML);
        assert.equal(block.textContent, new JSDOM(body).window.document.body.textContent);
        assert.equal(block.firstElementChild.classList.contains('webbook-equation-number'), !reversed);
        assert.equal(doc.querySelector('.webbook-equation-scroll').getAttribute('role'), 'region');
        assert.equal(report.data().changes.find(change => change.kind.includes('equations')).count, 1);
    }
});

test('ambiguous labels, prose, multiple equations and interactive labels stay unchanged', () => {
    for (const body of [`<div><span>Figure 3.2</span>${math}</div>`, `<div><span>(1.1)</span>${math} prose</div>`, `<div><span>(1.1)</span>${math}${math}</div>`, `<div><span><a href="#somewhere">(1.1)</a></span>${math}</div>`]) {
        assert.equal(fixture(body).doc.querySelector('.webbook-equation'), null);
    }
});

test('heading titles become visible, redundant titles go, duplicate outlines retain link targets', () => {
    const { doc, report } = fixture('<h1 title="Copyright"></h1><h2 title=" A   heading ">A heading</h2><h2 id="duplicate" title="Next"></h2><h2>Next</h2><h2 title="Other meaning">Visible</h2><h2 title="Linked"><a id="inside"></a></h2><h2><img alt="Cover"></h2>');
    assert.equal(doc.querySelector('h1').textContent, 'Copyright');
    assert.equal(doc.querySelector('h1').hasAttribute('title'), false);
    assert.equal(doc.querySelector('h2').hasAttribute('title'), false);
    assert.equal(doc.getElementById('duplicate').tagName, 'A');
    assert.equal(doc.querySelectorAll('h2').length, 5);
    assert.equal(doc.querySelector('[title="Other meaning"]').textContent, 'Visible');
    assert.equal(doc.getElementById('inside').parentElement.textContent, 'Linked');
    assert.ok(report.data().changes.some(change => change.kind === 'Duplicate title-only headings removed'));
});

test('leftover anchors are removed or unwrapped after ids, preserving semantics and narrated nodes', () => {
    const { doc, options } = fixture('<div class="spacer"><span title="unused"></span></div><a title="doi:10/example"></a><a id="unused"></a><a>Words <em>stay</em></a><a><img alt="Picture"></a><a id="linked"></a><a href="#linked">Go</a><a aria-label="Named"></a><a role="doc-noteref"></a><a class="epubtype_noteref"></a><a id="spoken">Narrated</a>');
    const spoken = doc.getElementById('spoken');
    const selectors = applyStructureIds(doc, ['spoken'], [], false, targets => cleanLeftoverAnchors(doc, options, targets));
    assert.equal(doc.querySelector('[title]'), null);
    assert.equal(doc.getElementById('unused'), null);
    assert.equal(doc.querySelector('.spacer'), null);
    for (const selector of ['#linked', '[aria-label="Named"]', '[role="doc-noteref"]', '.epubtype_noteref']) assert.ok(doc.querySelector(selector));
    assert.equal(doc.querySelector('em').parentElement, doc.body);
    assert.equal(doc.querySelector('img').parentElement, doc.body);
    assert.equal(resolveNarrationSelector(doc, selectors.get('spoken')), spoken);
    assert.equal(spoken.tagName, 'A');
});

test('full transform keeps narration/search paths valid, and new cleanup rules opt out', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'webbook-rules-'));
    try {
        const sourcePath = path.join(dir, 'chapter.xhtml');
        await fs.writeFile(sourcePath, `<body><h1 title="Copyright"></h1><h2></h2><a title="DOI"></a><a><span id="phrase">Narration</span></a><div><span>(1.1)</span>${math}</div></body>`);
        for (const cleanup of [true, false]) {
            const page = { index: 0, outputFilename: 'chapter.html', sourcePath };
            const site = { metadata: { language: 'en' }, toc: [], pageList: [], idToOutput: new Map() };
            const report = new ConversionReport({ declared: 'en', effective: 'en' }, {});
            const search = { version: 1, lang: 'en', pages: [], passages: [] };
            const result = await transformContent(page, site, new ImageAssetRegistry(), search, ['phrase'], [], false, { cleanup, report, reservedIds: new Set(), responsiveTables: false });
            const doc = new JSDOM(`<main>${result.bodyHtml}</main>`).window.document;
            assert.equal(Boolean(doc.querySelector('.webbook-equation')), cleanup);
            assert.equal(doc.querySelector('h1').textContent, cleanup ? 'Copyright' : '');
            assert.equal(Boolean(doc.querySelector('a[title="DOI"]')), !cleanup);
            assert.equal(Boolean(doc.querySelector('h2 a')), !cleanup);
            const phrase = Array.from(doc.querySelectorAll('span')).find(element => element.textContent === 'Narration');
            assert.equal(resolveNarrationSelector(doc, result.narrationSelectors.get('phrase')), phrase);
            assert.equal(search.passages.length, 1);
            assert.equal(resolveNarrationSelector(doc, search.passages[0].selector), phrase);
        }
    } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

test('removing empty wrappers leaves no indentation-only lines and preserves code whitespace', () => {
    const { doc, options } = fixture('<p>Text</p>\n   <div title="empty"></div>\n<pre>\n   <span class="empty"></span>\n  code\n</pre>');
    const code = doc.querySelector('pre').textContent;
    applyStructureIds(doc, [], [], false, targets => cleanLeftoverAnchors(doc, options, targets));
    assert.equal(doc.querySelector('pre').textContent, code);
    assert.ok(doc.body.innerHTML.startsWith('<p>Text</p>\n\n<pre>'));
});

test('fragment-only nav links resolve to their navigation document without a spurious warning', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'webbook-nav-'));
    try {
        const filename = path.join(dir, 'toc.xhtml');
        await fs.writeFile(filename, '<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><body><nav epub:type="toc"><ol><li><a href="#preface">Preface</a></li></ol></nav><h1 id="preface">Preface</h1></body></html>');
        const warnings = [];
        const nav = await parseNav(filename, { warn: warning => warnings.push(warning) });
        assert.equal(nav.toc.getElementsByTagName('a')[0].getAttribute('href'), `${filename}#preface`);
        assert.deepEqual(warnings, []);
    } finally { await fs.rm(dir, { recursive: true, force: true }); }
});
