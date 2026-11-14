import assert from 'node:assert/strict';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><body><p id="webbook-action-status" role="status"></p><button id="b">b</button></body>', { url: 'https://books.example/' });
for (const name of ['window', 'document', 'Element', 'Node', 'CustomEvent']) globalThis[name] = dom.window[name];

const { announceReaderAction, initReaderActionNotice } = await import('../src/js/reader-actions.js');
initReaderActionNotice();
const notice = () => document.getElementById('webbook-action-notice');

test('the message is dismissed by a click or tap anywhere, as well as by Escape', () => {
    announceReaderAction('Main text.');
    assert.equal(notice().hidden, false);
    document.getElementById('b').dispatchEvent(new dom.window.Event('pointerdown', { bubbles: true }));
    assert.equal(notice().hidden, true);
    announceReaderAction('Main text.');
    notice().dispatchEvent(new dom.window.Event('pointerdown', { bubbles: true }));
    assert.equal(notice().hidden, true);
    announceReaderAction('Main text.');
    const escape = new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    document.body.dispatchEvent(escape);
    assert.equal(notice().hidden, true);
    assert.equal(escape.defaultPrevented, true);
});
