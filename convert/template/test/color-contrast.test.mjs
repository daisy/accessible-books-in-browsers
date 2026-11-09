import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    HIGHLIGHT_PALETTE, MIN_HIGHLIGHT_CONTRAST, MIN_TEXT_CONTRAST,
    composite, contrastRatio, highlightColors, pageColorTokens, parseColor, pickHighlight, readableTextOn, toHex
} from '../src/js/color-contrast.js';

const color = value => parseColor(value);
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < .01, `${actual} is not about ${expected}`);

test('parses the color forms computed styles give', () => {
    assert.deepEqual(color('rgb(255, 221, 0)'), { r: 255, g: 221, b: 0, a: 1 });
    assert.deepEqual(color('rgba(0, 0, 0, 0.5)'), { r: 0, g: 0, b: 0, a: .5 });
    assert.deepEqual(color('rgb(10 20 30 / 25%)'), { r: 10, g: 20, b: 30, a: .25 });
    assert.deepEqual(color('color(srgb 1 0.5 0 / 0.5)'), { r: 255, g: 127.5, b: 0, a: .5 });
    assert.deepEqual(color('#fd0'), { r: 255, g: 221, b: 0, a: 1 });
    assert.deepEqual(color('#11223380'), { r: 17, g: 34, b: 51, a: 128 / 255 });
    assert.deepEqual(color('transparent'), { r: 0, g: 0, b: 0, a: 0 });
});

test('returns null for colors it cannot know', () => {
    for (const value of ['oklch(70% 0.1 200)', 'Mark', 'currentcolor', '', 'rgb(1, 2)', undefined]) {
        assert.equal(parseColor(value), null, String(value));
    }
});

test('computes WCAG contrast ratios', () => {
    close(contrastRatio(color('#ffffff'), color('#000000')), 21);
    close(contrastRatio(color('#767676'), color('#ffffff')), 4.54);
    close(contrastRatio(color('#ffdd00'), color('#ffffff')), 1.35);
    assert.equal(contrastRatio(color('#a14d00'), color('#000000')), contrastRatio(color('#000000'), color('#a14d00')));
});

test('mixes a partly transparent color over the one below', () => {
    assert.equal(toHex(composite(color('rgba(0, 0, 0, 0.5)'), color('#ffffff'))), '#808080');
    assert.equal(toHex(composite(color('#ff0000'), color('#0000ff'))), '#ff0000');
});

test('text on a highlight is black or white, and always readable', () => {
    assert.equal(toHex(readableTextOn(color('#ffdd00'))), '#000000');
    assert.equal(toHex(readableTextOn(color('#a14d00'))), '#ffffff');
    for (let gray = 0; gray <= 255; gray += 5) {
        const background = { r: gray, g: gray, b: gray, a: 1 };
        assert.ok(contrastRatio(background, readableTextOn(background)) >= MIN_TEXT_CONTRAST, `gray ${gray}`);
    }
    for (const value of HIGHLIGHT_PALETTE) {
        assert.ok(contrastRatio(color(value), readableTextOn(color(value))) >= MIN_TEXT_CONTRAST, value);
    }
});

test('the automatic highlight stands out from the page behind it', () => {
    assert.equal(toHex(pickHighlight([color('#000000')])), '#ffdd00');
    assert.equal(toHex(pickHighlight([color('#111111')])), '#ffdd00');
    assert.equal(toHex(pickHighlight([color('#ffffff')])), '#a14d00');
    assert.equal(toHex(pickHighlight([color('#fafafa')])), '#a14d00');
    for (const page of ['#000000', '#111111', '#fafafa', '#ffffff', '#cce5ff', '#fff3c4', '#1b2a49']) {
        assert.ok(contrastRatio(pickHighlight([color(page)]), color(page)) >= MIN_HIGHLIGHT_CONTRAST, page);
    }
});

test('an unknown page background gets the color that works on all the candidates', () => {
    const picked = pickHighlight([color('#fafafa'), color('#ffffff'), color('#000000')]);
    assert.equal(toHex(picked), '#a14d00');
    for (const page of ['#fafafa', '#ffffff', '#000000']) assert.ok(contrastRatio(picked, color(page)) >= MIN_HIGHLIGHT_CONTRAST, page);
});

test('every opaque background, mid-tones included, gets an automatic highlight with 3:1', () => {
    for (const page of ['#808080', '#777777', '#5f87a0', '#fa5a64', '#3cb371']) {
        assert.ok(contrastRatio(pickHighlight([color(page)]), color(page)) >= MIN_HIGHLIGHT_CONTRAST, page);
    }
    for (let r = 0; r <= 255; r += 15) for (let g = 0; g <= 255; g += 15) for (let b = 0; b <= 255; b += 15) {
        const page = { r, g, b, a: 1 };
        assert.ok(contrastRatio(pickHighlight([page]), page) >= MIN_HIGHLIGHT_CONTRAST, toHex(page));
    }
});

test('with no color reaching 3:1 on all the backgrounds, the best worst case wins', () => {
    const backgrounds = [color('#808080'), color('#ffffff'), color('#000000')];
    const worst = value => Math.min(...backgrounds.map(page => contrastRatio(color(value), page)));
    const best = Math.max(...HIGHLIGHT_PALETTE.map(worst));
    assert.equal(Math.min(...backgrounds.map(page => contrastRatio(pickHighlight(backgrounds), page))), best);
});

test('the reader\'s highlight color is kept, with readable text on it', () => {
    const colors = highlightColors([color('#ffffff')], '#ffffff');
    assert.equal(toHex(colors.background), '#ffffff');
    assert.equal(toHex(colors.text), '#000000');
});

test('an underline alone has 3:1 against the page, even in the reader\'s color', () => {
    // A color that stands out keeps it
    assert.equal(toHex(highlightColors([color('#ffffff')], '#0055cc', 'underline').line), '#0055cc');
    assert.equal(toHex(highlightColors([color('#ffffff')], null, 'underline').line), '#a14d00');
    // One that doesn't (white on white, yellow on white) is replaced
    for (const [page, custom] of [['#ffffff', '#ffffff'], ['#ffffff', '#ffdd00'], ['#000000', '#111111'], ['#808080', '#888888']]) {
        const { line } = highlightColors([color(page)], custom, 'underline');
        assert.ok(contrastRatio(line, color(page)) >= MIN_HIGHLIGHT_CONTRAST, `${custom} on ${page}`);
    }
});

test('an underline below a highlight background is black or white on the page, with 3:1', () => {
    assert.equal(toHex(highlightColors([color('#ffffff')], null, 'both').line), '#000000');
    assert.equal(toHex(highlightColors([color('#111111')], null, 'both').line), '#ffffff');
    for (const page of ['#ffffff', '#000000', '#808080', '#fff3c4', '#1b2a49', '#5f87a0']) {
        for (const custom of [null, '#ffffff', '#000000', '#ff0000']) {
            const { line } = highlightColors([color(page)], custom, 'both');
            assert.ok(contrastRatio(line, color(page)) >= MIN_HIGHLIGHT_CONTRAST, `${custom} on ${page}`);
        }
    }
    // A page that isn't known: a color with 3:1 on the theme, white and black
    const unknown = [color('#fafafa'), color('#ffffff'), color('#000000')];
    const { line } = highlightColors(unknown, null, 'both');
    for (const page of unknown) assert.ok(contrastRatio(line, page) >= MIN_HIGHLIGHT_CONTRAST, toHex(page));
});

test('on the reader\'s own colors, focus and the search highlight stand out, apart from narration', () => {
    const pairs = [['#000000', '#faf4e1'], ['#3b2a1a', '#f4ecd8'], ['#ffffff', '#000000'], ['#e6e6e6', '#1f1f1f'],
        ['#ffeb3b', '#0b1f4b'], ['#333333', '#808080'], ['#5f87a0', '#5f87a0']];
    for (const [text, page] of pairs) {
        const tokens = pageColorTokens(color(text), color(page));
        const label = `${text} on ${page}`;
        assert.ok(contrastRatio(tokens.focus, color(page)) >= MIN_HIGHLIGHT_CONTRAST, `focus, ${label}`);
        assert.ok(contrastRatio(tokens.searchBackground, color(page)) >= MIN_HIGHLIGHT_CONTRAST, `search, ${label}`);
        assert.ok(contrastRatio(tokens.searchText, tokens.searchBackground) >= MIN_TEXT_CONTRAST, `search text, ${label}`);
        assert.notEqual(toHex(tokens.searchBackground), toHex(pickHighlight([color(page)])), `distinct, ${label}`);
    }
    assert.equal(pageColorTokens(color('#ffffff'), color('#000000')).scheme, 'dark');
    assert.equal(pageColorTokens(color('#000000'), color('#faf4e1')).scheme, 'light');
});
