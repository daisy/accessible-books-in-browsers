import assert from 'node:assert/strict';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import { shapeBookPage } from '../build/book-shape.js';
const source = `<!doctype html><html lang="en" data-webbook-contract="0"><head><title>Book</title><link rel="stylesheet" href="src/css/style.css"></head><body>
<a id="webbook-skip-link" href="#webbook-main">Skip to text</a><nav id="webbook-basic-nav"></nav><main id="webbook-main"><h1>Chapter</h1><p>Words</p></main>
<nav id="webbook-spine-nav"><a rel="next" href="next.html">Next</a></nav><section id="webbook-toolbar"><audio src="audio.mp3"></audio></section>
<nav id="webbook-toc-nav"><a id="webbook-cover-link" href="index.html">Cover</a><ol><li id="toc-chapter"><a href="chapter.html" aria-current="page">Chapter</a></li></ol></nav>
<div id="webbook-info"><div class="webbook-info-body"><h2>About</h2><dl><dt>Title</dt><dd>Book</dd></dl><section id="webbook-progress" data-webbook-page-number="1" data-webbook-page-count="2"><p id="webbook-current-page-label">Chapter</p></section></div></div>
<datalist id="pages"><option data-href="chapter.html#p1">1</option></datalist><div id="webbook-escape-status" role="status"></div><div id="webbook-resume-banner" role="status" hidden></div><section id="webbook-settings">Settings</section></body></html>`;
test('plain book pages retain content, links, native audio and live regions; navigation is standalone and source metadata stays attributed', () => {
    const result = shapeBookPage(source, {
        source: 'book.epub',
        identifier: 'book-id',
        converter: '1',
        page: 'chapter.html',
        bootstrap: '/* boot */',
        channel: 'https://example.org/v0/',
        metadataXml:
            '<metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:creator id="c">Author</dc:creator><meta refines="#c" property="role">aut</meta><dc:description>Source description</dc:description></metadata>',
    });
    const doc = new JSDOM(result.html).window.document;
    assert.equal(doc.querySelector('main').textContent, 'ChapterWords');
    assert.equal(doc.querySelector('#webbook-settings'), null);
    assert.equal(doc.querySelector('audio').hasAttribute('controls'), true);
    assert.equal(doc.querySelector('#webbook-basic-nav a').getAttribute('href'), 'toc.html#toc-chapter');
    assert.equal(doc.querySelector('meta[name="webbook-page-file"]').content, 'chapter.html');
    assert.equal(doc.querySelector('#webbook-escape-status').getAttribute('role'), 'status');
    assert.deepEqual(Object.keys(result.navigation).sort(), ['about.html', 'pages.html', 'toc.html']);
    for (const html of Object.values(result.navigation)) {
        const nav = new JSDOM(html).window.document;
        assert.equal(nav.querySelector('script'), null);
        assert.equal(nav.querySelector('button'), null);
        assert.equal(nav.querySelector('[popover]'), null);
        assert(nav.querySelector('main h1'));
    }
    const about = new JSDOM(result.navigation['about.html']).window.document;
    assert.match(about.querySelector('#webbook-source-metadata').textContent, /creator \(aut\).*Author/s);
    assert.match(about.querySelector('pre').textContent, /refines="#c"/);
});
test('books without print pages omit pages.html', () => {
    const result = shapeBookPage(source.replace(/<datalist[\s\S]*?<\/datalist>/, ''), {
        source: 'book.epub',
        identifier: 'id',
        converter: '1',
        page: 'chapter.html',
        bootstrap: '',
    });
    assert.equal(result.navigation['pages.html'], undefined);
    assert(!new JSDOM(result.html).window.document.querySelector('a[href="pages.html"]'));
});

test('navigation filenames are reserved without losing source content or TOC targets', async () => {
    const fs = await import('node:fs/promises'),
        path = await import('node:path'),
        os = await import('node:os');
    const { buildSiteModel } = await import('../build/model.js');
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'webbook-reserved-nav-'));
    try {
        const names = ['first.xhtml', 'about.xhtml', 'toc.xhtml', 'Pages.xhtml'],
            spine = [];
        for (const name of names) {
            const filename = path.join(directory, name);
            await fs.writeFile(
                filename,
                `<html><head><title>${name}</title></head><body><h1 id="heading">${name}</h1></body></html>`,
            );
            spine.push({ path: filename, moPath: '' });
        }
        const toc = new JSDOM(
            '<ol>' +
                spine
                    .map((item) => `<li><a href="${item.path}#heading">${path.basename(item.path)}</a></li>`)
                    .join('') +
                '</ol>',
        ).window.document.querySelector('ol');
        const site = await buildSiteModel(
            {
                spine,
                metadata: { 'dc:title': 'Book', 'dc:identifier': 'id', 'dc:language': 'en' },
                nav: { toc },
                basedir: directory,
                packageFilename: path.join(directory, 'package.opf'),
                navFilename: path.join(directory, 'nav.xhtml'),
            },
            { splitChapters: false },
        );
        assert.deepEqual(
            site.pages.map((page) => page.outputFilename),
            ['index.html', 'about-content.html', 'toc-content.html', 'Pages-content.html'],
        );
        assert.equal(site.sourceToOutput.get(path.join(directory, 'about.xhtml')), 'about-content.html');
        assert(site.toc.some((item) => item.href === 'about-content.html#heading'));
    } finally {
        await fs.rm(directory, { recursive: true, force: true });
    }
});

test('print page links are named by the page label, which the template keeps in value and label', () => {
    const html = source.replace('<option data-href="chapter.html#p1">1</option>', '<option value="xii" label="xii" data-href="chapter.html#p12"></option>');
    const result = shapeBookPage(html, { source: 'book.epub', identifier: 'book-id', converter: '1', page: 'chapter.html', bootstrap: '' });
    const link = new JSDOM(result.navigation['pages.html']).window.document.querySelector('#webbook-page-list a');
    assert.equal(link.textContent, 'xii');
    assert.equal(link.getAttribute('href'), 'chapter.html#p12');
});
