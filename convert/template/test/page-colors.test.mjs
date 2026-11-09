import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bookColorSettingKey } from '../src/js/page-colors.js';

test('color setting keys are scoped to the book when it has an id', () => {
    assert.equal(bookColorSettingKey('webbook-colors', 'book-123'), 'webbook-colors:book-123');
    assert.equal(bookColorSettingKey('webbook-colors', ''), 'webbook-colors');
});
