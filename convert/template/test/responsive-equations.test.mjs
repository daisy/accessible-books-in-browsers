import assert from 'node:assert/strict';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import { updateResponsiveEquations } from '../src/js/responsive-equations.js';

test('overflowing MathML is keyboard reachable without replacing math semantics, and restores focus hooks when it fits', () => {
    const dom = new JSDOM('<main><math tabindex="-1" style="overflow-x:auto"><mi>x</mi></math><math style="overflow-x:auto"><mfrac><mi>x</mi><mi>y</mi></mfrac></math><math style="overflow-x:auto"><mi>z</mi></math></main>');
    globalThis.document = dom.window.document;
    // jsdom's style resolver does not support MathML roots.
    globalThis.getComputedStyle = () => ({ overflowX: 'auto' });
    const [wide, tall, fits] = document.querySelectorAll('math');
    for (const math of [wide, tall, fits]) {
        Object.defineProperties(math, {
            clientWidth: { value: 100 }, clientHeight: { value: 30 },
            scrollWidth: { value: math === wide ? 200 : 100, configurable: true },
            scrollHeight: { value: math === tall ? 40 : 30, configurable: true },
            // jsdom does not expose the browser's MathMLElement.tabIndex property.
            tabIndex: { get: () => Number(math.getAttribute('tabindex') ?? '-1') }
        });
    }
    updateResponsiveEquations();
    assert.equal(wide.getAttribute('tabindex'), '0');
    assert.equal(tall.getAttribute('tabindex'), '0');
    assert.equal(fits.hasAttribute('tabindex'), false);
    assert.equal(wide.hasAttribute('role'), false);
    assert.equal(tall.hasAttribute('role'), false);
    Object.defineProperty(wide, 'scrollWidth', { value: 100 });
    Object.defineProperty(tall, 'scrollHeight', { value: 30 });
    updateResponsiveEquations();
    assert.equal(wide.getAttribute('tabindex'), '-1');
    assert.equal(tall.hasAttribute('tabindex'), false);
    assert.equal(wide.hasAttribute('data-webbook-math-tabindex'), false);
    dom.window.close();
});
