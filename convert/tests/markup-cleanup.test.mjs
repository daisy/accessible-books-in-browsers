import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import { ConversionReport } from '../build/conversion-report.js';
import { reportBrokenLinks } from '../build/convert.js';
import { cleanPublicationMarkup, languageAgreement, renameCollidingIds } from '../build/markup-cleanup.js';
import { applyStructureIds, resolveNarrationSelector } from '../build/structure-ids.js';

function run(body, overrides = {}) {
    const document = new JSDOM(`<body>${body}</body>`).window.document;
    const report = new ConversionReport({ declared: 'en', effective: 'en' }, {});
    const result = cleanPublicationMarkup(document, {
        bookLanguage: 'en', cleanup: true, page: 'page.html', protectedIds: [],
        narratedTargetIds: [], responsiveTables: false, report,
        ...overrides
    });
    return { document, report, result };
}

test('language cleanup copies only text whose letters match the declared script', () => {
    const { document, report } = run(`
        <p id="wrong" xml:lang="bn-IN">This paragraph contains plainly English language text.</p>
        <p id="right" xml:lang="bn-IN">এটি একটি বাংলা অনুচ্ছেদ এবং এখানে যথেষ্ট অক্ষর আছে।</p>
        <span id="short-wrong" xml:lang="bn-IN">Hi</span>
        <span id="short-right" xml:lang="bn-IN">হ্যাঁ</span>
        <span id="digits" xml:lang="bn-IN">12345</span>`);
    assert.equal(document.getElementById('wrong').hasAttribute('lang'), false);
    assert.equal(document.getElementById('right').getAttribute('lang'), 'bn-IN');
    assert.equal(document.getElementById('short-wrong').hasAttribute('lang'), false);
    assert.equal(document.getElementById('short-right').getAttribute('lang'), 'bn-IN');
    assert.equal(document.getElementById('digits').hasAttribute('lang'), false);
    assert.equal(document.querySelector('[xml\\:lang]'), null);
    assert(report.warnings.some(warning => warning.kind === 'Element language' && warning.message.includes('id="wrong"')));
    assert.equal(languageAgreement('This is certainly English text.', 'bn-IN'), false);
});

test('language warnings skip document containers and group mismatches by page and tag', () => {
    const source = `<!doctype html><html xml:lang="bn-IN"><body xml:lang="bn-IN">
        <p xml:lang="bn-IN">This is the first clearly English example paragraph.</p>
        <p xml:lang="bn-IN">This is the second clearly English example paragraph.</p>
        <p xml:lang="fr">এটি যথেষ্ট দীর্ঘ একটি বাংলা উদাহরণ অনুচ্ছেদ।</p>
    </body></html>`;
    const document = new JSDOM(source).window.document;
    const report = new ConversionReport({ declared: 'en', effective: 'en' }, {});
    cleanPublicationMarkup(document, { bookLanguage: 'en', cleanup: true, page: 'page.html', protectedIds: [],
        narratedTargetIds: [], responsiveTables: false, report });
    const warnings = report.warnings.filter(warning => warning.kind === 'Element language');
    assert.equal(warnings.length, 2);
    assert.match(warnings.find(warning => warning.message.includes('bn-IN')).message, /^2 elements/);
    assert(warnings.every(warning => !warning.message.includes('<html') && !warning.message.includes('<body')));
    assert.equal(document.documentElement.hasAttribute('xml:lang'), false);
    assert.equal(document.body.hasAttribute('xml:lang'), false);

    const untouched = new JSDOM(source).window.document;
    const noCleanupReport = new ConversionReport({ declared: 'en', effective: 'en' }, {});
    cleanPublicationMarkup(untouched, { bookLanguage: 'en', cleanup: false, page: 'page.html', protectedIds: [],
        narratedTargetIds: [], responsiveTables: false, report: noCleanupReport });
    const noCleanupWarnings = noCleanupReport.warnings.filter(warning => warning.kind === 'Element language');
    assert.equal(noCleanupWarnings.length, 2);
    assert.match(noCleanupWarnings.find(warning => warning.message.includes('bn-IN')).message, /^2 elements/);
    assert(noCleanupWarnings.every(warning => !warning.message.includes('<html') && !warning.message.includes('<body')));
});

test('applies every safe cleanup rule while preserving referenced empty paragraphs', () => {
    const { document } = run(`
        <main class="publication"><span><span>Words</span></span></main>
        <p id="remove"> </p><p id="keep"></p><a href="#keep">Keep</a>
        <table><thead><tr><th>A</th><th>B</th></tr></thead><tbody><tr><th>Row</th><td>Value</td></tr></tbody></table>
        <button tabindex="4">Button</button>
        <audio autoplay></audio><video controls autoplay></video>`);
    assert.equal(document.querySelector('main'), null);
    assert.equal(document.querySelector('div.publication')?.textContent, 'Words');
    assert.equal(document.getElementById('remove'), null);
    assert(document.getElementById('keep'));
    assert.deepEqual(Array.from(document.querySelectorAll('th'), th => th.getAttribute('scope')), ['col', 'col', 'row']);
    assert.equal(document.querySelector('button').getAttribute('tabindex'), '0');
    for (const media of document.querySelectorAll('audio, video')) {
        assert.equal(media.hasAttribute('autoplay'), false);
        assert.equal(media.hasAttribute('controls'), true);
    }
});

// The order content-transform.ts uses: structure ids, then renaming the ids that stay
function renameAfterStructureIds(body, narrated, reserved, keepAllIds = false) {
    const document = new JSDOM(`<body><main>${body}</main></body>`).window.document;
    const report = new ConversionReport({ declared: 'en', effective: 'en' }, {});
    const selectors = applyStructureIds(document, narrated, [], keepAllIds);
    const renamed = renameCollidingIds(document, selectors, new Set(reserved), 'page.html', report);
    return { document, report, selectors, renamed };
}

test('renames kept ids that collide with the reader, and links and narration follow', () => {
    const { document, selectors, renamed } = renameAfterStructureIds(`
        <section id="pages"><p><span id="phrase">Narrated phrase</span></p></section>
        <a href="#pages">Go</a>
        <div aria-labelledby="pages"></div>`, ['phrase'], ['pages']);
    assert.equal(renamed.get('pages'), 'pages-content');
    assert.equal(document.querySelector('section').id, 'pages-content');
    assert.equal(document.querySelector('a').getAttribute('href'), '#pages-content');
    assert.equal(document.querySelector('div[aria-labelledby]').getAttribute('aria-labelledby'), 'pages-content');
    const selector = selectors.get('phrase');
    assert.equal(selector.value, 'pages-content');
    assert.equal(resolveNarrationSelector(document, selector), document.querySelector('span'));
});

test('an id the structure pass removes is not renamed or reported', () => {
    const { document, report, renamed } = renameAfterStructureIds(
        '<p id="webbook-toolbar">A paragraph</p><p id="twice">One</p><p id="twice">Two</p>', [], ['webbook-toolbar']);
    assert.equal(renamed.size, 0);
    assert.equal(document.querySelectorAll('p[id]').length, 0);
    assert.equal(report.data().warnings.filter(warning => warning.kind === 'Renamed ids').length, 0);
});

test('a repeated id stays on its first element, and a repeated structure gets its own id', () => {
    const { document, selectors } = renameAfterStructureIds(`
        <h2 id="same">First</h2><a href="#same">Link</a>
        <h2 id="same">Second</h2><p><span id="phrase">Read</span></p>`, ['phrase'], []);
    const [first, second] = document.querySelectorAll('h2');
    assert.equal(first.id, 'same');
    assert.ok(second.id && second.id !== 'same');
    assert.equal(resolveNarrationSelector(document, selectors.get('phrase')), document.querySelector('span'));
});

test('with --keep-all-ids, repeated ids are renamed as before', () => {
    const { document, renamed } = renameAfterStructureIds(
        '<p id="twice">One</p><p id="twice">Two</p>', [], [], true);
    assert.deepEqual(Array.from(document.querySelectorAll('p'), p => p.id), ['twice', 'twice-content']);
    assert.equal(renamed.size, 0);
});


test('adds responsive table semantics without giving the wrapper an id', () => {
    const { document } = run('<table><caption>Results</caption><tr><td>A</td></tr></table>', { responsiveTables: true });
    const wrapper = document.querySelector('.webbook-table-scroll');
    const caption = document.querySelector('caption');
    assert(wrapper);
    assert.equal(wrapper.id, '');
    assert.equal(wrapper.getAttribute('role'), 'region');
    assert.equal(wrapper.getAttribute('tabindex'), '0');
    assert.equal(wrapper.getAttribute('aria-labelledby'), caption.id);
    assert.equal(wrapper.firstElementChild.tagName, 'TABLE');
});

test('only top-level tables get responsive wrappers and table numbers', () => {
    const { document } = run(`<table><tr><td>
        <table><caption>Nested</caption><tr><td>A</td></tr></table>
    </td></tr></table><table><tr><td>B</td></tr></table>`, { responsiveTables: true });
    const wrappers = document.querySelectorAll('.webbook-table-scroll');
    assert.equal(wrappers.length, 2);
    assert.equal(wrappers[0].getAttribute('aria-label'), 'Table 1');
    assert.equal(wrappers[1].getAttribute('aria-label'), 'Table 2');
    assert.equal(document.querySelector('table table').parentElement.classList.contains('webbook-table-scroll'), false);
});

test('broken-link reporting distinguishes book pages from other output files', async () => {
    const stagingDir = await fs.mkdtemp(path.join(os.tmpdir(), 'webbook-link-test-'));
    try {
        await fs.mkdir(path.join(stagingDir, 'images'));
        await fs.writeFile(path.join(stagingDir, 'images', 'cover.jpg'), 'image');
        const document = new JSDOM(`<body><p id="here"></p>
            <a href="next.html#target">page</a><a href="#missing">fragment</a>
            <a href="images/cover.jpg">image</a><a href="handout.pdf">PDF</a></body>`).window.document;
        const report = new ConversionReport({ declared: 'en', effective: 'en' }, {});
        await reportBrokenLinks({ pages: [{ outputFilename: 'index.html' }, { outputFilename: 'next.html' }] },
            new Map([['index.html', document], ['next.html', new JSDOM('<body><p id="target"></p></body>').window.document]]),
            { stagingDir }, report);
        assert.equal(report.warnings.some(warning => warning.message.includes('cover.jpg')), false);
        assert(report.warnings.some(warning => warning.message.includes('missing #missing')));
        assert(report.warnings.some(warning => warning.message.includes('handout.pdf') && warning.message.includes('file')));
        assert.equal(report.warnings.some(warning => warning.message.includes('next.html')), false);
    } finally {
        await fs.rm(stagingDir, { recursive: true });
    }
});

test('reports image, heading, paragraph, link, SVG and table warnings', () => {
    const images = '<img alt="">'.repeat(19) + '<img>';
    const { report } = run(`${images}
        <h2>Two</h2><h4></h4><h5><img alt="Diagram"></h5>
        <p><strong>Possible heading</strong></p><p>• possible item</p>
        <a href="next.html">click here</a><svg></svg>
        <table><tr><td>A</td><td>B</td></tr><tr><td>C</td><td>D</td></tr></table>`);
    report.finishBookWarnings();
    const kinds = new Set(report.warnings.map(warning => warning.kind));
    for (const kind of ['Decorative images', 'Images without alt', 'Headings',
        'Paragraphs resembling headings', 'Paragraphs resembling list items', 'Link text',
        'Inline SVG', 'Data tables without headers']) assert(kinds.has(kind), kind);
});
