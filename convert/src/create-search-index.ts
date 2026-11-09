import fs from 'fs-extra';
import type { SiteModel, SitePage } from './model.js';
import type { OutputPaths } from './output.js';
import { outputPath } from './output.js';
import type { NarrationSelector } from './structure-ids.js';

export type SearchPage = {
    href: string;
    title: string;
};

export type SearchPassage = {
    page: number;
    id?: string;
    selector?: TextQuoteSelector | NarrationSelector;
    heading: string;
    text: string;
    lang?: string;
};

export type TextQuoteSelector = {
    type: 'TextQuoteSelector';
    exact: string;
    prefix?: string;
    suffix?: string;
};

export type SearchData = {
    version: 1;
    lang: string;
    pages: SearchPage[];
    passages: SearchPassage[];
};

const BLOCK_SELECTOR = 'p, li, h1, h2, h3, h4, h5, h6, td, th, blockquote, figcaption, dd, dt, caption';
const HEADING_SELECTOR = 'h1, h2, h3, h4, h5, h6';
const QUOTE_CONTEXT_LENGTH = 64;

function createSearchData(site: SiteModel): SearchData {
    return {
        version: 1,
        lang: site.metadata.language,
        pages: site.pages.map(page => ({ href: page.outputFilename, title: page.title })),
        passages: []
    };
}

// Collect after all content transforms so search text agrees with the emitted HTML. Narration cue
// targets retain their existing ids; ordinary passages use text quotes and do not alter the DOM.
function collectSearchPassages(
    data: SearchData,
    doc: Document,
    page: SitePage,
    narratedTargetIds: string[]
): void {
    const narrated = narratedTargetIds.length > 0;
    const elements = narrated
        ? narratedTargetIds.map(id => doc.getElementById(id)).filter((elm): elm is HTMLElement => Boolean(elm))
        : nonNarratedPassages(doc);
    const seen = new Set<Element>();
    const passages = elements.filter(elm => {
        if (seen.has(elm) || elm.matches('.epubtype_pagebreak') || !searchableText(elm)) return false;
        seen.add(elm);
        return true;
    });

    passages.forEach((elm, index) => {
        const text = searchableText(elm);
        const passage: SearchPassage = {
            page: page.index,
            heading: precedingHeading(elm, doc),
            text
        };
        if (narrated) {
            passage.id = elm.id;
        } else {
            const previous = index > 0 ? searchableText(passages[index - 1]) : '';
            const next = index + 1 < passages.length ? searchableText(passages[index + 1]) : '';
            passage.selector = {
                type: 'TextQuoteSelector',
                exact: text,
                ...(previous ? { prefix: contextEnd(previous) } : {}),
                ...(next ? { suffix: contextStart(next) } : {})
            };
        }
        const lang = elementLanguage(elm);
        if (lang && lang.toLowerCase() !== data.lang.toLowerCase()) passage.lang = lang;
        data.passages.push(passage);
    });
}

function nonNarratedPassages(doc: Document): Element[] {
    return Array.from(doc.querySelectorAll(BLOCK_SELECTOR)).filter(elm => {
        if (elm.matches('.epubtype_pagebreak')) return false;
        return !elm.parentElement?.closest(BLOCK_SELECTOR);
    });
}

function searchableText(elm: Element): string {
    const text = collapseWhitespace(elm.textContent ?? '');
    if (text) return text;
    const images = elm.matches('img[alt]') ? [elm] : Array.from(elm.querySelectorAll('img[alt]'));
    return collapseWhitespace(images.map(image => image.getAttribute('alt') ?? '').join(' '));
}

function precedingHeading(elm: Element, doc: Document): string {
    const ownHeading = elm.closest(HEADING_SELECTOR);
    if (ownHeading) return searchableText(ownHeading);
    let heading = '';
    for (const candidate of Array.from(doc.querySelectorAll(HEADING_SELECTOR))) {
        if (candidate === elm || candidate.compareDocumentPosition(elm) & 4) {
            heading = searchableText(candidate);
            continue;
        }
        break;
    }
    return heading;
}

function elementLanguage(elm: Element): string {
    const languageElm = elm.closest('[lang], [xml\\:lang]');
    return languageElm?.getAttribute('lang')?.trim()
        || languageElm?.getAttribute('xml:lang')?.trim()
        || '';
}

function collapseWhitespace(value: string): string {
    return value.replace(/\s+/g, ' ').trim();
}

function contextStart(value: string): string {
    return codePoints(value).slice(0, QUOTE_CONTEXT_LENGTH).join('');
}

function contextEnd(value: string): string {
    return codePoints(value).slice(-QUOTE_CONTEXT_LENGTH).join('');
}

function codePoints(value: string): string[] {
    // Code-point boundaries avoid splitting surrogate pairs. These strings are only contextual
    // disambiguators; the exact quotation remains authoritative.
    return Array.from(value);
}

async function generateSearchIndex(data: SearchData, outputPaths: OutputPaths): Promise<void> {
    await fs.writeJson(outputPath(outputPaths, 'search-data.json'), data);
}

export {
    collectSearchPassages,
    createSearchData,
    generateSearchIndex
};
