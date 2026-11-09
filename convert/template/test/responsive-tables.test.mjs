import assert from 'node:assert/strict';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import { updateResponsiveTables } from '../src/js/responsive-tables.js';

test('only overflowing table wrappers remain regions and tab stops', () => {
    const dom = new JSDOM(`<main>
        <div class="webbook-table-scroll" role="region" tabindex="0" aria-label="Table 1"><table></table></div>
        <div class="webbook-table-scroll" role="region" tabindex="0" aria-label="Table 2"><table></table></div>
    </main>`);
    globalThis.document = dom.window.document;
    const [fits, scrolls] = document.querySelectorAll('.webbook-table-scroll');
    Object.defineProperties(fits, { clientWidth: { value: 300 }, scrollWidth: { value: 300, configurable: true } });
    Object.defineProperties(scrolls, { clientWidth: { value: 300 }, scrollWidth: { value: 600 } });
    updateResponsiveTables();
    assert.equal(fits.hasAttribute('role'), false);
    assert.equal(fits.hasAttribute('tabindex'), false);
    assert.equal(fits.hasAttribute('aria-label'), false);
    assert.equal(fits.dataset.webbookLabel, 'Table 1');
    assert.equal(scrolls.getAttribute('role'), 'region');
    assert.equal(scrolls.getAttribute('tabindex'), '0');
    assert.equal(scrolls.getAttribute('aria-label'), 'Table 2');

    Object.defineProperty(fits, 'scrollWidth', { value: 600 });
    updateResponsiveTables();
    assert.equal(fits.getAttribute('role'), 'region');
    assert.equal(fits.getAttribute('tabindex'), '0');
    assert.equal(fits.getAttribute('aria-label'), 'Table 1');
});
