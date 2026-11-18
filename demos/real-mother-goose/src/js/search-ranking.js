export const MATCH_QUALITY = {
    exact: 0,
    prefix: 1,
    fuzzy: 2
};

// MiniSearch reports the indexed terms that matched. Classify each query term by its best match,
// then use the least exact term as the result's overall quality.
export function searchMatchQuality(match, queryTerms) {
    const indexedTerms = Object.keys(match.match || {});
    return queryTerms.reduce((quality, queryTerm) => {
        if (indexedTerms.includes(queryTerm)) return quality;
        if (indexedTerms.some(indexedTerm => indexedTerm.startsWith(queryTerm))) {
            return Math.max(quality, MATCH_QUALITY.prefix);
        }
        return MATCH_QUALITY.fuzzy;
    }, MATCH_QUALITY.exact);
}

export function compareSearchResults(first, second) {
    return first.matchQuality - second.matchQuality || first.order - second.order;
}
