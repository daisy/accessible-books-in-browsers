import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createSearchSnippet, fallbackTokens, isFuzzySearchTerm, normalizeSearchText, tokenizeSearchText } from '../src/js/search-text.js';

test('segments words in languages with and without spaces', () => {
    assert.deepEqual(tokenizeSearchText('Call me Ishmael.', 'en'), ['call', 'me', 'ishmael']);
    assert.deepEqual(tokenizeSearchText('Bonjour le monde', 'fr'), ['bonjour', 'le', 'monde']);
    assert(tokenizeSearchText('আমি বাংলা পড়ি', 'bn').includes('বাংলা'));
    assert(tokenizeSearchText('मैं हिन्दी पढ़ता हूँ', 'hi').includes('हिन्दी'));
    assert(tokenizeSearchText('日本語を読みます', 'ja').length >= 2);
    assert(tokenizeSearchText('我喜欢阅读中文', 'zh').length >= 2);
    assert(tokenizeSearchText('ฉันชอบอ่านหนังสือ', 'th').length >= 2);
});

test('normalizes compatibility forms and locale-sensitive case', () => {
    assert.equal(normalizeSearchText('ＦＩ ﬁ', 'en'), 'fi fi');
    assert.equal(normalizeSearchText('Iİ', 'tr'), 'ıi');
});

test('keeps meaningful marks except explicit Arabic and Hebrew rules', () => {
    assert.notEqual(normalizeSearchText('má', 'vi'), normalizeSearchText('ma', 'vi'));
    assert.notEqual(normalizeSearchText('कि', 'hi'), normalizeSearchText('क', 'hi'));
    assert.equal(normalizeSearchText('الْعَرَبِيَّةُـ', 'ar'), normalizeSearchText('العربية', 'ar'));
    assert.equal(normalizeSearchText('שָׁלוֹם', 'he'), normalizeSearchText('שלום', 'he'));
});

test('fallback emits CJK bigrams as well as whitespace-delimited tokens', () => {
    const tokens = fallbackTokens('hello 世界語');
    assert(tokens.includes('hello'));
    assert(tokens.includes('世界語'));
    assert(tokens.includes('世界'));
    assert(tokens.includes('界語'));
});

test('limits typo tolerance by length and script', () => {
    assert.equal(isFuzzySearchTerm('whale'), true);
    assert.equal(isFuzzySearchTerm('слово'), true);
    assert.equal(isFuzzySearchTerm('λέξεις'), true);
    assert.equal(isFuzzySearchTerm('book'), false);
    assert.equal(isFuzzySearchTerm('বাংলা'), false);
    assert.equal(isFuzzySearchTerm('日本語です'), false);
});

test('snippets retain grapheme clusters and identify matched words', () => {
    const text = `Before ${'x '.repeat(50)}Việt Nam has tiếng Việt with combining a\u0301 marks after it.`;
    const parts = createSearchSnippet(text, tokenizeSearchText('tiếng', 'vi'), 'vi', 60);
    assert(parts.some(part => part.match && part.text === 'tiếng'));
    const snippet = parts.map(part => part.text).join('');
    assert(!snippet.startsWith('\u0301'));
    assert(!snippet.endsWith('a'));
});
