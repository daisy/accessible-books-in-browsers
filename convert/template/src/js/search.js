import { createSearchSnippet, isFuzzySearchTerm, tokenizeSearchText } from './search-text.js';
import { resolveTextQuote } from './search-anchor.js';
import { compareSearchResults, searchMatchQuality } from './search-ranking.js';
import { selectElm } from './cue-selector.js';

const SEARCH_HIGHLIGHT_NAME = 'search';
const PENDING_HIGHLIGHT_KEY = 'webbook-search-highlight';
const RESULT_LIMIT = 50;
const DEBOUNCE_MS = 400;

let searchData = null;
let searchIndex = null;
let indexPromise = null;
let debounceTimer = null;
let pendingHighlight = null;
let searchHighlight = null;

export function initSearch() {
    const panel = document.getElementById('webbook-search');
    const form = document.getElementById('webbook-search-form');
    const input = document.getElementById('webbook-search-input');
    const results = document.getElementById('webbook-search-results');
    if (!panel || !form || !input || !results) return;

    results.removeAttribute('aria-live');
    const status = document.createElement('p');
    status.id = 'webbook-search-status';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-atomic', 'true');
    results.before(status);

    form.addEventListener('submit', event => {
        event.preventDefault();
        clearTimeout(debounceTimer);
        runSearch(input.value, { panel, status, results });
    });
    input.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        const query = input.value.trim();
        if (Array.from(query).length < 2) return;
        debounceTimer = setTimeout(() => runSearch(query, { panel, status, results }), DEBOUNCE_MS);
    });
    input.addEventListener('keydown', event => {
        if (event.key !== 'ArrowDown') return;
        const firstResult = results.querySelector('a[href]');
        if (!firstResult) return;
        event.preventDefault();
        firstResult.focus();
    });
    panel.addEventListener('toggle', event => {
        if (event.newState !== 'open') return;
        input.focus();
        input.select();
    });
    results.addEventListener('click', event => {
        const link = event.target instanceof Element ? event.target.closest('a[data-search-result]') : null;
        if (!link) return;
        const passage = searchData?.passages[Number(link.dataset.passageIndex)];
        if (!passage) return;
        pendingHighlight = {
            page: new URL(link.href, window.location.href).pathname,
            id: passage.id,
            selector: passage.selector,
            terms: JSON.parse(link.dataset.matchedTerms || '[]'),
            lang: passage.lang || searchData?.lang || ''
        };
        try { sessionStorage.setItem(PENDING_HIGHLIGHT_KEY, JSON.stringify(pendingHighlight)); } catch { /* In-place navigation can still use memory. */ }
        panel.hidePopover?.();
        setTimeout(applyPendingSearchHighlight, 0);
    });
    document.addEventListener('webbook:pagechange', () => {
        clearSearchHighlight();
        applyPendingSearchHighlight();
    });

    readPendingSearchHighlight();
    applyPendingSearchHighlight();
    // Loaded when the panel opened, after its toggle event
    if (panel.matches(':popover-open')) {
        input.focus();
        input.select();
    }
}

async function loadIndex(status) {
    if (searchIndex) return searchIndex;
    if (indexPromise) return indexPromise;
    setStatus(status, 'Loading search…');
    // The search library is the reader's largest file, so it's loaded with the data, on first search
    let MiniSearch;
    indexPromise = Promise.all([
        fetch('search-data.json', { credentials: 'same-origin' }).then(response => {
            if (!response.ok) throw new Error(String(response.status));
            return response.json();
        }),
        import('./vendor/minisearch.js').then(module => { MiniSearch = module.default; })
    ])
        .then(([data]) => {
            if (data?.version !== 1 || !Array.isArray(data.pages) || !Array.isArray(data.passages)) {
                throw new Error('Unsupported search data');
            }
            searchData = data;
            const index = new MiniSearch({
                fields: ['terms'],
                storeFields: ['passageIndex', 'page', 'id', 'heading', 'text', 'lang', 'order'],
                idField: 'searchId',
                tokenize: text => text.split(/\s+/).filter(Boolean),
                processTerm: term => term
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
                    terms: tokenizeSearchText(passage.text, lang).join(' ')
                };
            }));
            searchIndex = index;
            return index;
        })
        .catch(() => null);
    return indexPromise;
}

async function runSearch(rawQuery, ui) {
    const query = rawQuery.trim();
    clearSearchHighlight();
    if (!query) {
        ui.results.replaceChildren();
        setStatus(ui.status, '');
        return;
    }
    const index = await loadIndex(ui.status);
    if (!index) {
        ui.results.replaceChildren();
        setStatus(ui.status, "Search isn't available for this book.");
        return;
    }

    const languages = new Set([searchData.lang, ...searchData.passages.map(passage => passage.lang).filter(Boolean)]);
    const combined = new Map();
    for (const lang of languages) {
        const queryTerms = tokenizeSearchText(query, lang);
        if (!queryTerms.length) continue;
        const matches = index.search(queryTerms.join(' '), {
            tokenize: text => text.split(/\s+/).filter(Boolean),
            processTerm: term => term,
            combineWith: 'AND',
            prefix: (_term, position, terms) => position === terms.length - 1,
            fuzzy: term => isFuzzySearchTerm(term) ? 1 : false
        });
        for (const match of matches) {
            match.matchQuality = searchMatchQuality(match, queryTerms);
            const existing = combined.get(match.id);
            if (!existing
                || match.matchQuality < existing.matchQuality
                || (match.matchQuality === existing.matchQuality && match.score > existing.score)) {
                combined.set(match.id, match);
            }
            else if (existing) existing.terms = Array.from(new Set([...existing.terms, ...match.terms]));
        }
    }
    const matches = Array.from(combined.values())
        .sort(compareSearchResults)
        .slice(0, RESULT_LIMIT);
    renderResults(matches, ui.results);
    const quotedQuery = `'${query}'`;
    setStatus(ui.status, matches.length ? `${matches.length} results for ${quotedQuery}` : `No results for ${quotedQuery}`);
}

function renderResults(matches, results) {
    results.replaceChildren(...matches.map(match => {
        const page = searchData.pages[match.page];
        const passage = searchData.passages[match.passageIndex];
        const item = document.createElement('li');
        const link = document.createElement('a');
        const anchorId = passage.id || (passage.selector?.type === 'FragmentSelector' ? passage.selector.value : '');
        link.href = anchorId ? `${page.href}#${encodeURIComponent(anchorId)}` : page.href;
        link.dataset.searchResult = '';
        link.dataset.passageIndex = match.passageIndex;
        link.dataset.matchedTerms = JSON.stringify(match.terms);

        const context = document.createElement('span');
        context.className = 'webbook-search-context';
        context.textContent = [page.title, match.heading].filter((value, index, values) => value && values.indexOf(value) === index).join(' — ');
        const snippet = document.createElement('span');
        snippet.className = 'webbook-search-snippet';
        snippet.dir = 'auto';
        if (match.lang && match.lang.toLowerCase() !== document.documentElement.lang.toLowerCase()) snippet.lang = match.lang;
        for (const part of createSearchSnippet(match.text, match.terms, match.lang)) {
            const node = part.match ? document.createElement('mark') : document.createTextNode(part.text);
            if (part.match) node.textContent = part.text;
            snippet.append(node);
        }
        link.append(context, snippet);
        item.append(link);
        return item;
    }));
}

function setStatus(status, message) {
    status.textContent = message;
}

function readPendingSearchHighlight() {
    try {
        pendingHighlight = JSON.parse(sessionStorage.getItem(PENDING_HIGHLIGHT_KEY));
    } catch { pendingHighlight = null; }
}

function applyPendingSearchHighlight() {
    if (!pendingHighlight || pagePath(pendingHighlight.page) !== pagePath(window.location.pathname)) return;
    const target = pendingHighlight.id
        ? document.getElementById(pendingHighlight.id)
        : pendingHighlight.selector?.type === 'TextQuoteSelector'
            ? resolveTextQuote(document.querySelector('main'), pendingHighlight.selector)
            : selectElm(pendingHighlight.selector);
    if (!target) return;
    clearSearchHighlight();
    const ranges = rangesForTerms(target, pendingHighlight.terms, pendingHighlight.lang);
    if (ranges.length && typeof CSS !== 'undefined' && CSS.highlights && typeof Highlight !== 'undefined') {
        searchHighlight = new Highlight(...ranges);
        CSS.highlights.set(SEARCH_HIGHLIGHT_NAME, searchHighlight);
    }
    if (pendingHighlight.selector) placeReaderAtTextQuote(target);
    pendingHighlight = null;
    try { sessionStorage.removeItem(PENDING_HIGHLIGHT_KEY); } catch { /* No persistent cleanup needed. */ }
}

function pagePath(pathname) {
    return pathname.replace(/\/index\.html$/, '/');
}

function placeReaderAtTextQuote(target) {
    target.scrollIntoView();
    const main = document.querySelector('main');
    if (main?.getAttribute('aria-hidden') === 'true') return;
    if (!target.matches('a[href], button, input, select, textarea, [tabindex]')) {
        target.setAttribute('tabindex', '-1');
    }
    target.focus({ preventScroll: true });
}

function rangesForTerms(target, terms, lang) {
    const matches = new Set(terms);
    const ranges = [];
    const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
    let textNode;
    while ((textNode = walker.nextNode())) {
        const text = textNode.nodeValue || '';
        if (!text.trim()) continue;
        const segments = typeof Intl?.Segmenter === 'function'
            ? Array.from(new Intl.Segmenter(lang || undefined, { granularity: 'word' }).segment(text))
            : [{ segment: text, index: 0, isWordLike: true }];
        for (const part of segments) {
            if (!part.isWordLike) continue;
            const normalized = tokenizeSearchText(part.segment, lang);
            if (!normalized.some(term => matches.has(term))) continue;
            const range = document.createRange();
            range.setStart(textNode, part.index);
            range.setEnd(textNode, part.index + part.segment.length);
            ranges.push(range);
        }
    }
    return ranges;
}

export function clearSearchHighlight() {
    searchHighlight?.clear?.();
    if (typeof CSS !== 'undefined') CSS.highlights?.delete?.(SEARCH_HIGHLIGHT_NAME);
    searchHighlight = null;
}
