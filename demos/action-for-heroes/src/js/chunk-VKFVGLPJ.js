import {
  createSearchSnippet,
  isFuzzySearchTerm,
  tokenizeSearchText
} from "./chunk-CQENM7MV.js";
import {
  selectElm
} from "./chunk-JJPBXBH7.js";

// template/src/js/search-anchor.js
var BLOCK_SELECTOR = "p, li, h1, h2, h3, h4, h5, h6, td, th, blockquote, figcaption, dd, dt, caption";
function searchablePassages(root) {
  if (!root) return [];
  return Array.from(root.querySelectorAll(BLOCK_SELECTOR)).filter((element) => {
    if (element.matches(".epubtype_pagebreak")) return false;
    return !element.parentElement?.closest(BLOCK_SELECTOR) && passageText(element);
  });
}
function passageText(element) {
  const text = collapseWhitespace(element.textContent || "");
  if (text) return text;
  const images = element.matches("img[alt]") ? [element] : Array.from(element.querySelectorAll("img[alt]"));
  return collapseWhitespace(images.map((image) => image.getAttribute("alt") || "").join(" "));
}
function resolveTextQuote(root, selector) {
  if (!selector || selector.type !== "TextQuoteSelector" || !selector.exact) return null;
  const passages = searchablePassages(root);
  const exactMatches = passages.map((element, index) => ({ element, index })).filter(({ element }) => passageText(element) === selector.exact);
  if (exactMatches.length < 2) return exactMatches[0]?.element || null;
  const contextualMatch = exactMatches.find(({ index }) => {
    const previous = index > 0 ? passageText(passages[index - 1]) : "";
    const next = index + 1 < passages.length ? passageText(passages[index + 1]) : "";
    return (!selector.prefix || previous.endsWith(selector.prefix)) && (!selector.suffix || next.startsWith(selector.suffix));
  });
  return contextualMatch?.element || exactMatches[0].element;
}
function collapseWhitespace(value) {
  return value.replace(/\s+/g, " ").trim();
}

// template/src/js/search-ranking.js
var MATCH_QUALITY = {
  exact: 0,
  prefix: 1,
  fuzzy: 2
};
function searchMatchQuality(match, queryTerms) {
  const indexedTerms = Object.keys(match.match || {});
  return queryTerms.reduce((quality, queryTerm) => {
    if (indexedTerms.includes(queryTerm)) return quality;
    if (indexedTerms.some((indexedTerm) => indexedTerm.startsWith(queryTerm))) {
      return Math.max(quality, MATCH_QUALITY.prefix);
    }
    return MATCH_QUALITY.fuzzy;
  }, MATCH_QUALITY.exact);
}
function compareSearchResults(first, second) {
  return first.matchQuality - second.matchQuality || first.order - second.order;
}

// template/src/js/search.js
var SEARCH_HIGHLIGHT_NAME = "search";
var PENDING_HIGHLIGHT_KEY = "webbook-search-highlight";
var RESULT_LIMIT = 50;
var DEBOUNCE_MS = 400;
var searchData = null;
var searchIndex = null;
var indexPromise = null;
var debounceTimer = null;
var pendingHighlight = null;
var searchHighlight = null;
function initSearch() {
  const panel = document.getElementById("webbook-search");
  const form = document.getElementById("webbook-search-form");
  const input = document.getElementById("webbook-search-input");
  const results = document.getElementById("webbook-search-results");
  if (!panel || !form || !input || !results) return;
  results.removeAttribute("aria-live");
  const status = document.createElement("p");
  status.id = "webbook-search-status";
  status.setAttribute("role", "status");
  status.setAttribute("aria-atomic", "true");
  results.before(status);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    clearTimeout(debounceTimer);
    runSearch(input.value, { panel, status, results });
  });
  input.addEventListener("input", () => {
    clearTimeout(debounceTimer);
    const query = input.value.trim();
    if (Array.from(query).length < 2) return;
    debounceTimer = setTimeout(() => runSearch(query, { panel, status, results }), DEBOUNCE_MS);
  });
  input.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowDown") return;
    const firstResult = results.querySelector("a[href]");
    if (!firstResult) return;
    event.preventDefault();
    firstResult.focus();
  });
  panel.addEventListener("toggle", (event) => {
    if (event.newState !== "open") return;
    input.focus();
    input.select();
  });
  results.addEventListener("click", (event) => {
    const link = event.target instanceof Element ? event.target.closest("a[data-search-result]") : null;
    if (!link) return;
    const passage = searchData?.passages[Number(link.dataset.passageIndex)];
    if (!passage) return;
    pendingHighlight = {
      page: new URL(link.href, window.location.href).pathname,
      id: passage.id,
      selector: passage.selector,
      terms: JSON.parse(link.dataset.matchedTerms || "[]"),
      lang: passage.lang || searchData?.lang || ""
    };
    try {
      sessionStorage.setItem(PENDING_HIGHLIGHT_KEY, JSON.stringify(pendingHighlight));
    } catch {
    }
    panel.hidePopover?.();
    setTimeout(applyPendingSearchHighlight, 0);
  });
  document.addEventListener("webbook:pagechange", () => {
    clearSearchHighlight();
    applyPendingSearchHighlight();
  });
  readPendingSearchHighlight();
  applyPendingSearchHighlight();
  if (panel.matches(":popover-open")) {
    input.focus();
    input.select();
    if (Array.from(input.value.trim()).length >= 2) runSearch(input.value, { panel, status, results });
  }
}
async function loadIndex(status) {
  if (searchIndex) return searchIndex;
  if (indexPromise) return indexPromise;
  setStatus(status, "Loading search\u2026");
  let MiniSearch;
  indexPromise = Promise.all([
    fetch("search-data.json", { credentials: "same-origin" }).then((response) => {
      if (!response.ok) throw new Error(String(response.status));
      return response.json();
    }),
    import("./chunk-FKETWL6Y.js").then((module) => {
      MiniSearch = module.default;
    })
  ]).then(([data]) => {
    if (data?.version !== 1 || !Array.isArray(data.pages) || !Array.isArray(data.passages)) {
      throw new Error("Unsupported search data");
    }
    searchData = data;
    const index = new MiniSearch({
      fields: ["terms"],
      storeFields: ["passageIndex", "page", "id", "heading", "text", "lang", "order"],
      idField: "searchId",
      tokenize: (text) => text.split(/\s+/).filter(Boolean),
      processTerm: (term) => term
    });
    index.addAll(data.passages.map((passage, order) => {
      const lang = passage.lang || data.lang;
      return {
        searchId: order,
        passageIndex: order,
        page: passage.page,
        id: passage.id,
        heading: passage.heading,
        text: passage.text,
        lang,
        order,
        terms: tokenizeSearchText(passage.text, lang).join(" ")
      };
    }));
    searchIndex = index;
    return index;
  }).catch(() => null);
  return indexPromise;
}
async function runSearch(rawQuery, ui) {
  const query = rawQuery.trim();
  clearSearchHighlight();
  if (!query) {
    ui.results.replaceChildren();
    setStatus(ui.status, "");
    return;
  }
  const matches = await searchBook(query, ui.status);
  if (!matches) {
    ui.results.replaceChildren();
    setStatus(ui.status, "Search isn't available for this book.");
    return;
  }
  renderResults(matches, ui.results);
  const quotedQuery = `'${query}'`;
  setStatus(ui.status, matches.length ? `${matches.length} results for ${quotedQuery}` : `No results for ${quotedQuery}`);
}
async function searchBook(rawQuery, status = null) {
  const query = rawQuery.trim();
  if (!query) return [];
  const index = await loadIndex(status);
  if (!index) return null;
  const languages = /* @__PURE__ */ new Set([searchData.lang, ...searchData.passages.map((passage) => passage.lang).filter(Boolean)]);
  const combined = /* @__PURE__ */ new Map();
  for (const lang of languages) {
    const queryTerms = tokenizeSearchText(query, lang);
    if (!queryTerms.length) continue;
    const matches = index.search(queryTerms.join(" "), {
      tokenize: (text) => text.split(/\s+/).filter(Boolean),
      processTerm: (term) => term,
      combineWith: "AND",
      prefix: (_term, position, terms) => position === terms.length - 1,
      fuzzy: (term) => isFuzzySearchTerm(term) ? 1 : false
    });
    for (const match of matches) {
      match.matchQuality = searchMatchQuality(match, queryTerms);
      const existing = combined.get(match.id);
      if (!existing || match.matchQuality < existing.matchQuality || match.matchQuality === existing.matchQuality && match.score > existing.score) {
        combined.set(match.id, match);
      } else if (existing) existing.terms = Array.from(/* @__PURE__ */ new Set([...existing.terms, ...match.terms]));
    }
  }
  return Array.from(combined.values()).sort(compareSearchResults).slice(0, RESULT_LIMIT);
}
function describeSearchResult(match) {
  const page = searchData?.pages?.[match.page];
  const passage = searchData?.passages?.[match.passageIndex];
  if (!page || !passage) return null;
  return {
    heading: match.heading || page.title,
    snippet: createSearchSnippet(match.text, match.terms, match.lang).map((part) => part.text).join(""),
    target: passage.id || passage.selector?.type === "FragmentSelector" ? `${page.href}#${encodeURIComponent(passage.id || passage.selector.value)}` : page.href
  };
}
function renderResults(matches, results) {
  results.replaceChildren(...matches.map((match) => {
    const page = searchData.pages[match.page];
    const passage = searchData.passages[match.passageIndex];
    const item = document.createElement("li");
    const link = document.createElement("a");
    const anchorId = passage.id || (passage.selector?.type === "FragmentSelector" ? passage.selector.value : "");
    link.href = anchorId ? `${page.href}#${encodeURIComponent(anchorId)}` : page.href;
    link.dataset.searchResult = "";
    link.dataset.passageIndex = match.passageIndex;
    link.dataset.matchedTerms = JSON.stringify(match.terms);
    const context = document.createElement("span");
    context.className = "webbook-search-context";
    context.textContent = [page.title, match.heading].filter((value, index, values) => value && values.indexOf(value) === index).join(" \u2014 ");
    const snippet = document.createElement("span");
    snippet.className = "webbook-search-snippet";
    snippet.dir = "auto";
    if (match.lang && match.lang.toLowerCase() !== document.documentElement.lang.toLowerCase()) snippet.lang = match.lang;
    for (const part of createSearchSnippet(match.text, match.terms, match.lang)) {
      const node = part.match ? document.createElement("mark") : document.createTextNode(part.text);
      if (part.match) node.textContent = part.text;
      snippet.append(node);
    }
    link.append(context, snippet);
    item.append(link);
    return item;
  }));
}
function setStatus(status, message) {
  if (status) status.textContent = message;
}
function readPendingSearchHighlight() {
  try {
    pendingHighlight = JSON.parse(sessionStorage.getItem(PENDING_HIGHLIGHT_KEY));
  } catch {
    pendingHighlight = null;
  }
}
function applyPendingSearchHighlight() {
  if (!pendingHighlight || pagePath(pendingHighlight.page) !== pagePath(window.location.pathname)) return;
  const target = pendingHighlight.id ? document.getElementById(pendingHighlight.id) : pendingHighlight.selector?.type === "TextQuoteSelector" ? resolveTextQuote(document.querySelector("main"), pendingHighlight.selector) : selectElm(pendingHighlight.selector);
  if (!target) return;
  clearSearchHighlight();
  const ranges = rangesForTerms(target, pendingHighlight.terms, pendingHighlight.lang);
  if (ranges.length && typeof CSS !== "undefined" && CSS.highlights && typeof Highlight !== "undefined") {
    searchHighlight = new Highlight(...ranges);
    CSS.highlights.set(SEARCH_HIGHLIGHT_NAME, searchHighlight);
  }
  if (pendingHighlight.selector) placeReaderAtTextQuote(target);
  pendingHighlight = null;
  try {
    sessionStorage.removeItem(PENDING_HIGHLIGHT_KEY);
  } catch {
  }
}
function pagePath(pathname) {
  return pathname.replace(/\/index\.html$/, "/");
}
function placeReaderAtTextQuote(target) {
  target.scrollIntoView();
  const main = document.querySelector("main");
  if (main?.getAttribute("aria-hidden") === "true") return;
  if (!target.matches("a[href], button, input, select, textarea, [tabindex]")) {
    target.setAttribute("tabindex", "-1");
  }
  target.focus({ preventScroll: true });
}
function rangesForTerms(target, terms, lang) {
  const matches = new Set(terms);
  const ranges = [];
  const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
  let textNode;
  while (textNode = walker.nextNode()) {
    const text = textNode.nodeValue || "";
    if (!text.trim()) continue;
    const segments = typeof Intl?.Segmenter === "function" ? Array.from(new Intl.Segmenter(lang || void 0, { granularity: "word" }).segment(text)) : [{ segment: text, index: 0, isWordLike: true }];
    for (const part of segments) {
      if (!part.isWordLike) continue;
      const normalized = tokenizeSearchText(part.segment, lang);
      if (!normalized.some((term) => matches.has(term))) continue;
      const range = document.createRange();
      range.setStart(textNode, part.index);
      range.setEnd(textNode, part.index + part.segment.length);
      ranges.push(range);
    }
  }
  return ranges;
}
function clearSearchHighlight() {
  searchHighlight?.clear?.();
  if (typeof CSS !== "undefined") CSS.highlights?.delete?.(SEARCH_HIGHLIGHT_NAME);
  searchHighlight = null;
}
export {
  clearSearchHighlight,
  describeSearchResult,
  initSearch,
  searchBook
};
