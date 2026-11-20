// template/src/js/search-text.js
var LANGUAGE_MARK_RULES = {
  // Arabic vowel marks are optional in ordinary text; tatweel is decorative elongation.
  ar: /[\u0610-\u061a\u0640\u064b-\u065f\u0670\u06d6-\u06ed]/gu,
  // Hebrew niqqud marks vowels and cantillation but is commonly omitted in otherwise identical text.
  he: /[\u0591-\u05bd\u05bf-\u05c7]/gu
};
var FALLBACK_SEPARATOR = /[\p{White_Space}\p{P}]+/u;
var CJK_RUN = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]+/gu;
var FUZZY_SCRIPT = /^(?:\p{Script=Latin}|\p{Script=Cyrillic}|\p{Script=Greek})+$/u;
function languageRoot(lang = "") {
  return lang.toLowerCase().split("-")[0];
}
function normalizeSearchText(text, lang = "") {
  let normalized = String(text).normalize("NFKC").toLocaleLowerCase(lang || void 0);
  const markRule = LANGUAGE_MARK_RULES[languageRoot(lang)];
  if (markRule) normalized = normalized.replace(markRule, "");
  return normalized;
}
function tokenizeSearchText(text, lang = "") {
  const normalized = normalizeSearchText(text, lang);
  if (typeof Intl?.Segmenter === "function") {
    const segmenter = new Intl.Segmenter(lang || void 0, { granularity: "word" });
    return Array.from(segmenter.segment(normalized)).filter((part) => part.isWordLike).map((part) => part.segment);
  }
  return fallbackTokens(normalized);
}
function fallbackTokens(normalizedText) {
  const tokens = normalizedText.split(FALLBACK_SEPARATOR).filter(Boolean);
  for (const run of normalizedText.match(CJK_RUN) ?? []) {
    const characters = Array.from(run);
    for (let index = 0; index < characters.length - 1; index += 1) {
      tokens.push(characters.slice(index, index + 2).join(""));
    }
  }
  return Array.from(new Set(tokens));
}
function isFuzzySearchTerm(term) {
  return Array.from(term).length >= 5 && FUZZY_SCRIPT.test(term);
}
function createSearchSnippet(text, matchedTerms, lang = "", maximumLength = 120) {
  const terms = new Set(matchedTerms);
  const words = displayWordSegments(text, lang);
  const matchingWords = words.filter((word) => word.isWordLike && tokenizeSearchText(word.segment, lang).some((term) => terms.has(term)));
  const firstMatch = matchingWords[0];
  const center = firstMatch ? firstMatch.index + firstMatch.segment.length / 2 : 0;
  const desiredStart = Math.max(0, Math.floor(center - maximumLength / 2));
  const desiredEnd = Math.min(text.length, desiredStart + maximumLength);
  const start = snippetBoundary(words, desiredStart, "start");
  const end = snippetBoundary(words, desiredEnd, "end");
  const safeStart = graphemeBoundary(text, start, lang, "start");
  const safeEnd = graphemeBoundary(text, Math.max(safeStart, end), lang, "end");
  const parts = [];
  if (safeStart > 0) parts.push({ text: "\u2026", match: false });
  let cursor = safeStart;
  for (const word of words) {
    const wordEnd = word.index + word.segment.length;
    if (wordEnd <= safeStart || word.index >= safeEnd) continue;
    if (word.index > cursor) parts.push({ text: text.slice(cursor, word.index), match: false });
    const segmentEnd = Math.min(wordEnd, safeEnd);
    const segmentText = text.slice(Math.max(word.index, safeStart), segmentEnd);
    const match = word.isWordLike && tokenizeSearchText(word.segment, lang).some((term) => terms.has(term));
    parts.push({ text: segmentText, match });
    cursor = segmentEnd;
  }
  if (cursor < safeEnd) parts.push({ text: text.slice(cursor, safeEnd), match: false });
  if (safeEnd < text.length) parts.push({ text: "\u2026", match: false });
  return parts.filter((part) => part.text);
}
function displayWordSegments(text, lang) {
  if (typeof Intl?.Segmenter === "function") {
    return Array.from(new Intl.Segmenter(lang || void 0, { granularity: "word" }).segment(text));
  }
  return [{ segment: text, index: 0, isWordLike: true }];
}
function snippetBoundary(words, offset, edge) {
  if (edge === "start") {
    return words.find((word2) => word2.index + word2.segment.length > offset)?.index ?? 0;
  }
  const word = words.find((part) => part.index >= offset);
  if (word) return word.index;
  const last = words.at(-1);
  return last ? last.index + last.segment.length : 0;
}
function graphemeBoundary(text, offset, lang, edge) {
  if (typeof Intl?.Segmenter !== "function") return offset;
  const graphemes = Array.from(new Intl.Segmenter(lang || void 0, { granularity: "grapheme" }).segment(text));
  if (edge === "start") {
    let boundary = 0;
    for (const part of graphemes) {
      if (part.index > offset) break;
      boundary = part.index;
    }
    return boundary;
  }
  return graphemes.find((part) => part.index >= offset)?.index ?? text.length;
}

export {
  normalizeSearchText,
  tokenizeSearchText,
  isFuzzySearchTerm,
  createSearchSnippet
};
