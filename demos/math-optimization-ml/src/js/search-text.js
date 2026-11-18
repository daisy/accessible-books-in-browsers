// Search text rules are deliberately language-general. NFKC folds compatibility forms, locale
// case folding handles cases such as Turkish I, and Intl.Segmenter finds words in scripts that do
// not use spaces. Combining marks stay significant except for the explicit language rules below.

const LANGUAGE_MARK_RULES = {
    // Arabic vowel marks are optional in ordinary text; tatweel is decorative elongation.
    ar: /[\u0610-\u061a\u0640\u064b-\u065f\u0670\u06d6-\u06ed]/gu,
    // Hebrew niqqud marks vowels and cantillation but is commonly omitted in otherwise identical text.
    he: /[\u0591-\u05bd\u05bf-\u05c7]/gu
};

const FALLBACK_SEPARATOR = /[\p{White_Space}\p{P}]+/u;
const CJK_RUN = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]+/gu;
const FUZZY_SCRIPT = /^(?:\p{Script=Latin}|\p{Script=Cyrillic}|\p{Script=Greek})+$/u;

function languageRoot(lang = '') {
    return lang.toLowerCase().split('-')[0];
}

export function normalizeSearchText(text, lang = '') {
    let normalized = String(text).normalize('NFKC').toLocaleLowerCase(lang || undefined);
    const markRule = LANGUAGE_MARK_RULES[languageRoot(lang)];
    if (markRule) normalized = normalized.replace(markRule, '');
    return normalized;
}

export function tokenizeSearchText(text, lang = '') {
    const normalized = normalizeSearchText(text, lang);
    if (typeof Intl?.Segmenter === 'function') {
        const segmenter = new Intl.Segmenter(lang || undefined, { granularity: 'word' });
        return Array.from(segmenter.segment(normalized))
            .filter(part => part.isWordLike)
            .map(part => part.segment);
    }
    return fallbackTokens(normalized);
}

export function fallbackTokens(normalizedText) {
    const tokens = normalizedText.split(FALLBACK_SEPARATOR).filter(Boolean);
    for (const run of normalizedText.match(CJK_RUN) ?? []) {
        const characters = Array.from(run);
        for (let index = 0; index < characters.length - 1; index += 1) {
            tokens.push(characters.slice(index, index + 2).join(''));
        }
    }
    return Array.from(new Set(tokens));
}

export function isFuzzySearchTerm(term) {
    return Array.from(term).length >= 5 && FUZZY_SCRIPT.test(term);
}

// Returns display-ready parts so the UI can create text nodes and <mark> elements without using
// innerHTML. Boundaries come from word and grapheme segmentation, never raw UTF-16 offsets alone.
export function createSearchSnippet(text, matchedTerms, lang = '', maximumLength = 120) {
    const terms = new Set(matchedTerms);
    const words = displayWordSegments(text, lang);
    const matchingWords = words.filter(word => word.isWordLike
        && tokenizeSearchText(word.segment, lang).some(term => terms.has(term)));
    const firstMatch = matchingWords[0];
    const center = firstMatch ? firstMatch.index + firstMatch.segment.length / 2 : 0;
    const desiredStart = Math.max(0, Math.floor(center - maximumLength / 2));
    const desiredEnd = Math.min(text.length, desiredStart + maximumLength);
    const start = snippetBoundary(words, desiredStart, 'start');
    const end = snippetBoundary(words, desiredEnd, 'end');
    const safeStart = graphemeBoundary(text, start, lang, 'start');
    const safeEnd = graphemeBoundary(text, Math.max(safeStart, end), lang, 'end');
    const parts = [];
    if (safeStart > 0) parts.push({ text: '…', match: false });

    let cursor = safeStart;
    for (const word of words) {
        const wordEnd = word.index + word.segment.length;
        if (wordEnd <= safeStart || word.index >= safeEnd) continue;
        if (word.index > cursor) parts.push({ text: text.slice(cursor, word.index), match: false });
        const segmentEnd = Math.min(wordEnd, safeEnd);
        const segmentText = text.slice(Math.max(word.index, safeStart), segmentEnd);
        const match = word.isWordLike
            && tokenizeSearchText(word.segment, lang).some(term => terms.has(term));
        parts.push({ text: segmentText, match });
        cursor = segmentEnd;
    }
    if (cursor < safeEnd) parts.push({ text: text.slice(cursor, safeEnd), match: false });
    if (safeEnd < text.length) parts.push({ text: '…', match: false });
    return parts.filter(part => part.text);
}

function displayWordSegments(text, lang) {
    if (typeof Intl?.Segmenter === 'function') {
        return Array.from(new Intl.Segmenter(lang || undefined, { granularity: 'word' }).segment(text));
    }
    return [{ segment: text, index: 0, isWordLike: true }];
}

function snippetBoundary(words, offset, edge) {
    if (edge === 'start') {
        return words.find(word => word.index + word.segment.length > offset)?.index ?? 0;
    }
    const word = words.find(part => part.index >= offset);
    if (word) return word.index;
    const last = words.at(-1);
    return last ? last.index + last.segment.length : 0;
}

function graphemeBoundary(text, offset, lang, edge) {
    if (typeof Intl?.Segmenter !== 'function') return offset;
    const graphemes = Array.from(new Intl.Segmenter(lang || undefined, { granularity: 'grapheme' }).segment(text));
    if (edge === 'start') {
        let boundary = 0;
        for (const part of graphemes) {
            if (part.index > offset) break;
            boundary = part.index;
        }
        return boundary;
    }
    return graphemes.find(part => part.index >= offset)?.index ?? text.length;
}
