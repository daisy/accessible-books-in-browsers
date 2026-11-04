import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compareSearchResults, MATCH_QUALITY, searchMatchQuality } from '../src/js/search-ranking.js';

test('classifies exact, prefix and fuzzy matches', () => {
    assert.equal(searchMatchQuality({ match: { whale: ['terms'] } }, ['whale']), MATCH_QUALITY.exact);
    assert.equal(searchMatchQuality({ match: { whaleboat: ['terms'] } }, ['whale']), MATCH_QUALITY.prefix);
    assert.equal(searchMatchQuality({ match: { ishmael: ['terms'] } }, ['ishmail']), MATCH_QUALITY.fuzzy);
});

test('uses the least exact term in a multiword match', () => {
    assert.equal(searchMatchQuality({ match: { call: ['terms'], me: ['terms'] } }, ['call', 'me']), MATCH_QUALITY.exact);
    assert.equal(searchMatchQuality({ match: { call: ['terms'], meanwhile: ['terms'] } }, ['call', 'me']), MATCH_QUALITY.prefix);
    assert.equal(searchMatchQuality({ match: { call: ['terms'], ishmael: ['terms'] } }, ['call', 'ishmail']), MATCH_QUALITY.fuzzy);
});

test('sorts by quality and then reading order, not relevance score', () => {
    const results = [
        { matchQuality: MATCH_QUALITY.fuzzy, order: 1, score: 100 },
        { matchQuality: MATCH_QUALITY.exact, order: 9, score: 1 },
        { matchQuality: MATCH_QUALITY.exact, order: 2, score: 0.1 },
        { matchQuality: MATCH_QUALITY.prefix, order: 0, score: 1000 }
    ].sort(compareSearchResults);
    assert.deepEqual(results.map(result => [result.matchQuality, result.order]), [
        [MATCH_QUALITY.exact, 2],
        [MATCH_QUALITY.exact, 9],
        [MATCH_QUALITY.prefix, 0],
        [MATCH_QUALITY.fuzzy, 1]
    ]);
});
