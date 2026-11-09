import assert from 'node:assert/strict';
import { test } from 'node:test';
import { summarizeAceReport } from '../build/optional-checks.js';

test('Ace report assertions determine passed and issues independently of its exit status', () => {
    assert.deepEqual(summarizeAceReport({ assertions: [
        { result: { outcome: 'earl:passed' }, test: { title: 'Images have text alternatives' } }
    ] }), {
        name: 'Ace', status: 'passed', detail: '1 assertion checked; no violations.'
    });

    const result = summarizeAceReport({ assertions: [
        { result: { outcome: 'earl:failed' }, test: { title: 'Language of page' } },
        { result: { outcome: 'earl:failed' }, test: { title: 'Language of page' } },
        { 'earl:result': { 'earl:outcome': 'fail' }, 'earl:test': { 'dct:title': 'Image alternative' } }
    ] });
    assert.equal(result.status, 'issues');
    assert.match(result.detail, /3 violations across 2 rules/);
    assert.match(result.detail, /Language of page \(2\)/);
});
