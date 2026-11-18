const BLOCK_SELECTOR = 'p, li, h1, h2, h3, h4, h5, h6, td, th, blockquote, figcaption, dd, dt, caption';

export function searchablePassages(root) {
    if (!root) return [];
    return Array.from(root.querySelectorAll(BLOCK_SELECTOR)).filter(element => {
        if (element.matches('.epubtype_pagebreak')) return false;
        return !element.parentElement?.closest(BLOCK_SELECTOR) && passageText(element);
    });
}

export function passageText(element) {
    const text = collapseWhitespace(element.textContent || '');
    if (text) return text;
    const images = element.matches('img[alt]') ? [element] : Array.from(element.querySelectorAll('img[alt]'));
    return collapseWhitespace(images.map(image => image.getAttribute('alt') || '').join(' '));
}

// Resolve a Web Annotation TextQuoteSelector against the same addressable blocks the converter
// uses. Prefix and suffix distinguish repeated quotations while exact text remains the fallback.
export function resolveTextQuote(root, selector) {
    if (!selector || selector.type !== 'TextQuoteSelector' || !selector.exact) return null;
    const passages = searchablePassages(root);
    const exactMatches = passages
        .map((element, index) => ({ element, index }))
        .filter(({ element }) => passageText(element) === selector.exact);
    if (exactMatches.length < 2) return exactMatches[0]?.element || null;

    const contextualMatch = exactMatches.find(({ index }) => {
        const previous = index > 0 ? passageText(passages[index - 1]) : '';
        const next = index + 1 < passages.length ? passageText(passages[index + 1]) : '';
        return (!selector.prefix || previous.endsWith(selector.prefix))
            && (!selector.suffix || next.startsWith(selector.suffix));
    });
    return contextualMatch?.element || exactMatches[0].element;
}

function collapseWhitespace(value) {
    return value.replace(/\s+/g, ' ').trim();
}
