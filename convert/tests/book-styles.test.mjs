import assert from 'node:assert/strict';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import { ConversionReport } from '../build/conversion-report.js';
import { applyWritingStyles, normalizeProperty, specificity, token } from '../build/book-styles.js';

function run(html, sheets) {
    const document = new JSDOM(html).window.document;
    const report = new ConversionReport({ declared: 'ja', effective: 'ja' }, {});
    const result = applyWritingStyles(document, sheets.map(sheet => typeof sheet === 'string' ? { css: sheet } : sheet), { report, page: 'p.html' });
    return { document, result, report, cls: id => Array.from(document.getElementById(id).classList).filter(name => name.startsWith('webbook-')).join(' ') };
}

test('-epub-, -webkit- and standard spellings are one property', () => {
    assert.equal(normalizeProperty('-epub-writing-mode'), 'writing-mode');
    assert.equal(normalizeProperty('-webkit-text-combine'), 'text-combine-upright');
    assert.equal(normalizeProperty('-epub-text-combine-horizontal'), 'text-combine-upright');
    assert.equal(normalizeProperty('-epub-text-emphasis'), 'text-emphasis-style');
    assert.equal(normalizeProperty('color'), null);
    assert.equal(token('writing-mode', 'tb-rl'), 'vertical-rl');
    assert.equal(token('text-orientation', 'rotate-right'), 'sideways');
    assert.equal(token('text-emphasis-style', 'open sesame'), 'sesame-open');
    assert.equal(token('text-emphasis-style', '"x"'), 'string');
    assert.equal(token('text-transform', '-epub-fullwidth'), 'fullwidth');
    assert(specificity('#a .b p') > specificity('.b .c p'));
    assert(specificity('p.b') > specificity('p'));
});

test('a vertical book: the page mode goes on <html>, classes only where the value changes', () => {
    const { result, cls, document } = run(`<html><body><p id="p">山路を<span class="tcy" id="tcy">12</span><strong class="sesame_dot" id="dot">人</strong></p>
        <table id="t" class="yoko"><tr><td id="td">1</td></tr></table></body></html>`, [
        `html { -epub-writing-mode: vertical-rl; }
         span.tcy { -epub-text-combine: horizontal; }
         strong.sesame_dot { font-weight: normal; -epub-text-emphasis-style: sesame; -epub-text-emphasis-color: #f00; }
         .yoko { writing-mode: horizontal-tb }`]);
    assert.equal(result.writingMode, 'vertical-rl');
    assert.equal(cls('p'), '');
    assert.equal(cls('tcy'), 'webbook-style-combine');
    assert.equal(cls('dot'), 'webbook-style-emphasis-sesame');
    assert.equal(cls('t'), 'webbook-style-horizontal');
    assert.equal(cls('td'), '');
    assert.equal(document.querySelector('[style]'), null);
});

test('the cascade: specificity, order, !important, inline styles, media and skipped selectors', () => {
    const { cls } = run(`<body><p id="a" class="x">a</p><p id="b" class="x" style="text-emphasis-style: circle">b</p>
        <p id="c" class="x y">c</p><p id="d" class="z">d</p><p id="e" class="h">e</p></body>`, [
        `.x { -epub-text-emphasis-style: dot } p { -epub-text-emphasis-style: triangle }
         .x.y { text-emphasis-style: sesame } p.x.y { text-emphasis-style: open dot }
         #d { text-emphasis-style: sesame } .z { text-emphasis-style: circle !important }
         @media print { .h { text-emphasis-style: sesame } }
         .h:hover { text-emphasis-style: dot } .h::before { text-emphasis-style: dot }
         :::bad { text-emphasis-style: dot }`]);
    assert.equal(cls('a'), 'webbook-style-emphasis-dot');
    assert.equal(cls('b'), 'webbook-style-emphasis-circle');
    assert.equal(cls('c'), 'webbook-style-emphasis-dot-open');
    assert.equal(cls('d'), 'webbook-style-emphasis-circle');
    assert.equal(cls('e'), 'webbook-style-emphasis-triangle');
});

test('inheritance: a reset inside a styled block gets its own class; page-wide styles go on main', () => {
    const { cls, result } = run(`<body class="all"><div id="div" class="em"><p id="p">x<span id="none" class="plain">y</span></p></div></body>`, [
        `body { text-emphasis-style: dot; text-orientation: upright; line-break: strict; word-break: keep-all }
         .em { text-emphasis-style: sesame } .plain { text-emphasis-style: none; text-orientation: sideways }`]);
    assert.deepEqual(result.mainClasses.sort(), ['webbook-style-emphasis-dot', 'webbook-style-glyphs-upright']);
    assert.equal(result.lineBreak, 'strict');
    assert.equal(result.wordBreak, 'keep-all');
    assert.equal(cls('div'), 'webbook-style-emphasis-sesame');
    assert.equal(cls('p'), '');
    assert.equal(cls('none'), 'webbook-style-emphasis-none webbook-style-glyphs-sideways');
});

test('full-width, speech hints, string marks counted, and direction from the body', () => {
    const { cls, result, report } = run(`<html dir="ltr"><body dir="rtl"><p id="fw">abc</p><p id="sp">ABC</p><p id="str">x</p></body></html>`, [
        `#fw { text-transform: -epub-fullwidth } @media speech { #sp { -epub-speak-as: spell-out } } #str { text-emphasis-style: "*" }`]);
    assert.equal(cls('fw'), 'webbook-style-fullwidth');
    assert.equal(cls('sp'), 'webbook-speak-spell-out');
    assert.equal(cls('str'), '');
    assert.equal(result.dir, 'rtl');
    assert(report.data().changes.some(change => change.kind.includes('not kept') && change.count === 1));
});

test('alternate stylesheets tagged horizontal or vertical are offered, the preferred first', () => {
    const { result } = run('<html><body><p>x</p></body></html>', [
        'html { -epub-writing-mode: vertical-rl }',
        { css: 'html { writing-mode: horizontal-tb }', alternateTags: ['horizontal'] }]);
    assert.equal(result.writingMode, 'vertical-rl');
    assert.deepEqual(result.writingModes, ['vertical-rl', 'horizontal-tb']);
    const plain = run('<html><body><p>x</p></body></html>', ['p { color: red }']).result;
    assert.equal(plain.writingMode, undefined);
    assert.equal(plain.writingModes, undefined);
});
