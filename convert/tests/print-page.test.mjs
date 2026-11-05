import assert from 'node:assert/strict';
import { test } from 'node:test';
import { printPageBeforePage } from '../build/template.js';

test('carries the last print-page label onto following web pages', () => {
    const pages = ['one.html', 'two.html', 'three.html'].map((outputFilename, index) => ({ outputFilename, index }));
    const site = {
        pages,
        pageList: [
            { label: 'iv', href: 'one.html#p-iv' },
            { label: '1', href: 'two.html#p-1' },
            { label: '2', href: 'two.html#p-2' }
        ]
    };

    assert.equal(printPageBeforePage(site, pages[0]), '');
    assert.equal(printPageBeforePage(site, pages[1]), 'iv');
    assert.equal(printPageBeforePage(site, pages[2]), '2');
});
