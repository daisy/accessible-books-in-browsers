import assert from 'node:assert/strict';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';

const dom = new JSDOM(`<!doctype html><body>
<section id="webbook-top-toolbar" class="webbook"><button type="button" popovertarget="webbook-search" aria-label="Search"></button></section>
<main id="webbook-main"></main>
<section id="webbook-toolbar" class="webbook"><audio></audio><button id="play" type="button">Play</button></section>
</body>`, { url: 'https://books.example/chapter.html' });
for (const name of ['window', 'document', 'localStorage', 'sessionStorage', 'CustomEvent', 'Node', 'HTMLElement', 'Element', 'performance']) globalThis[name] = dom.window[name];
globalThis.requestAnimationFrame = callback => setTimeout(callback, 0);

const { describeStructure, formatStructure, capText } = await import('../src/js/structure-context.js');
const { whereAmI, readingPosition, initWhereAmI } = await import('../src/js/where-am-i.js');
const { initReaderActionStatus, getActions } = await import('../src/js/reader-actions.js');

function page(html) {
    document.querySelector('main').innerHTML = html;
}
const say = id => formatStructure(describeStructure(document.getElementById(id)));

test('main text names the heading it comes under, and a heading names itself', () => {
    page('<h1 id="h">The storm<a class="webbook" href="#h">Link to The storm</a></h1><p id="p">Rain.</p><h2 id="h2">After</h2>');
    assert.equal(say('p'), 'Main text. Under ‘The storm’.');
    assert.equal(say('h'), 'Heading level 1, ‘The storm’.');
    assert.equal(say('h2'), 'Heading level 2, ‘After’.');
});

test('notes: a footnote written as an aside is a footnote, not also a sidebar', () => {
    page('<h1>One</h1><aside class="epubtype_footnote" role="doc-footnote" aria-label="sidebar"><p id="fn">Note.</p></aside>');
    assert.equal(say('fn'), 'Footnote. Under ‘One’.');
});

test('endnotes: numbered from the list, in the section, without the organizing list, and nested lists stay lists', () => {
    page('<h1>Notes</h1><section class="epubtype_endnotes" role="doc-endnotes"><ol start="3"><li id="a"><p id="a-text">Three.</p></li><li class="epubtype_endnote"><p id="b-text">Four.</p><ul><li><p id="nested">Inner.</p></li><li>Other.</li></ul></li></ol></section>');
    assert.equal(say('a-text'), 'Endnote 3, in the endnotes section. Under ‘Notes’.');
    assert.equal(say('b-text'), 'Endnote 4, in the endnotes section. Under ‘Notes’.');
    assert.equal(say('nested'), 'List, item 1 of 2, in endnote 4, in the endnotes section. Under ‘Notes’.');
});

test('tables, figures and sidebars use their own captions and labels; layout tables are not tables', () => {
    page('<h1>Results</h1><aside class="epubtype_sidebar" aria-label="sidebar"><table><caption>Measurements <span class="webbook">Copy</span></caption><tr><td id="cell">1</td></tr></table></aside>'
        + '<table role="presentation"><tr><td id="layout">x</td></tr></table>'
        + '<figure><img alt=""><figcaption>A very long caption that goes on and on and on, describing every single detail of the picture above it</figcaption><p id="in-figure">x</p></figure>');
    assert.equal(say('cell'), 'Table ‘Measurements’, in a sidebar. Under ‘Results’.');
    assert.equal(say('layout'), 'Main text. Under ‘Results’.');
    assert.match(say('in-figure'), /^Figure ‘A very long caption.*…’\. Under ‘Results’\.$/);
});

test('equations use the number the book gives, and are never read out', () => {
    page('<h2>Numerical experiments</h2><div class="webbook-equation"><span class="webbook-equation-number">(1.2)</span><math id="m"><mi id="x">x</mi></math></div><math id="plain"><mi>y</mi></math>');
    assert.equal(say('x'), 'Equation 1.2. Under ‘Numerical experiments’.');
    assert.equal(say('plain'), 'Equation. Under ‘Numerical experiments’.');
});

test('lists, block quotations and the book\'s own contents', () => {
    page('<nav role="doc-toc" class="epubtype_toc"><ol><li><a id="toc-link" href="#">Chapter</a></li></ol></nav><blockquote><p id="q">Said.</p></blockquote>');
    assert.equal(say('toc-link'), "List, item 1 of 1, in the book's table of contents.");
    assert.equal(say('q'), 'Block quotation.');
});

test('names are plain and capped; nothing outside the text is described', () => {
    assert.equal(capText('  a   b  '), 'a b');
    assert.ok(capText('word '.repeat(40)).length <= 81);
    assert.equal(describeStructure(document.getElementById('play')), null);
    assert.equal(formatStructure(null), 'Reading position is not available.');
});

test('position: a selection comes before focus, and focus on main itself is not a place', () => {
    page('<h1>One</h1><p id="p1">First.</p><ul><li id="li">Item</li></ul>');
    const range = document.createRange();
    range.selectNodeContents(document.getElementById('li'));
    assert.equal(readingPosition({ active: document.getElementById('p1'), range }), document.getElementById('li'));
    assert.equal(readingPosition({ active: document.getElementById('p1') }), document.getElementById('p1'));
    // jsdom has no layout, so the reading line finds nothing and there's no narration
    assert.equal(readingPosition({ active: document.querySelector('main') }), null);
    assert.equal(whereAmI({ active: document.getElementById('play') }), 'Reading position is not available.');
});

test('focus in an open reader panel is described as the panel, even while narration is elsewhere', () => {
    document.body.insertAdjacentHTML('beforeend', '<section popover id="webbook-settings" class="webbook"><div class="webbook-settings-section"><h3>Narration</h3><input id="setting" type="checkbox"></div></section>'
        + '<nav popover id="webbook-toc-nav" class="webbook"><ul role="tree"><li role="none"><a role="treeitem" id="t1" href="#">Part</a><ul role="group"><li role="none"><a role="treeitem" id="t2" href="#">Chapter 3</a></li></ul></li></ul></nav>');
    assert.equal(whereAmI({ active: document.getElementById('setting') }), 'Settings. Narration section.');
    assert.equal(whereAmI({ active: document.getElementById('t2') }), 'Table of contents. ‘Chapter 3’, level 2.');
    assert.equal(whereAmI({ active: document.getElementById('t1') }), 'Table of contents. ‘Part’, level 1.');
    document.getElementById('webbook-settings').hidden = true;
    assert.equal(whereAmI({ active: document.getElementById('setting') }), 'Reading position is not available.');
});

test('the action and the button: registered without a default key, beside Search, and answering without moving focus', async () => {
    initReaderActionStatus();
    initWhereAmI();
    initWhereAmI();
    const action = getActions().find(a => a.id === 'where-am-i');
    assert.equal(action.label, 'Where am I?');
    assert.equal(action.group, 'Navigation');
    assert.deepEqual(action.defaultKeys, []);
    const buttons = document.querySelectorAll('#webbook-where-am-i');
    assert.equal(buttons.length, 1);
    assert.equal(buttons[0].nextElementSibling.getAttribute('popovertarget'), 'webbook-search');
    assert.equal(buttons[0].getAttribute('aria-label'), 'Where am I?');

    page('<h1>One</h1><p id="p1" tabindex="-1">First.</p>');
    const paragraph = document.getElementById('p1');
    paragraph.focus();
    buttons[0].dispatchEvent(new dom.window.Event('pointerdown'));
    buttons[0].focus();
    buttons[0].click();
    await new Promise(resolve => setTimeout(resolve, 50));
    assert.equal(document.getElementById('webbook-action-status').textContent, 'Main text. Under ‘One’.');
    assert.equal(document.activeElement, buttons[0]);
    assert.equal(window.scrollY, 0);
});
