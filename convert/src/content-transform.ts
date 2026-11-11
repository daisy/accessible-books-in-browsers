import path from 'path';
import { JSDOM } from 'jsdom';
import type { ImageAssetRegistry } from './assets.js';
import type { SiteModel, SitePage } from './model.js';
import { fragmentKey, normalizeSourcePath, rewriteSourceHref } from './model.js';
import { ensureHeadingIds, extractDocumentPiece, removeIdsNotOwnedByPage } from './chapter-split.js';
import * as fileio from './file-io.js';
import * as utils from './utils.js';
import type { SearchData } from './create-search-index.js';
import { collectSearchPassages } from './create-search-index.js';
import { applyStructureIds, type NarrationSelector } from './structure-ids.js';
import { cleanPublicationMarkup, renameCollidingIds } from './markup-cleanup.js';
import { cssReferencedIds, isExternalHref } from './ids.js';
import type { ConversionReport } from './conversion-report.js';

export type TransformedContent = {
    bodyAttributes: Array<{ name: string; value: string }>;
    bodyHtml: string;
    title: string;
    narrationSelectors: Map<string, NarrationSelector>;
    renamedIds: Map<string, string>;
};

export type ContentCleanupOptions = {
    cleanup: boolean;
    report: ConversionReport;
    reservedIds: Set<string>;
    responsiveTables: boolean;
};

async function transformContent(
    page: SitePage,
    site: SiteModel,
    imageRegistry: ImageAssetRegistry,
    searchData?: SearchData,
    narratedTargetIds: string[] = [],
    externallyReferencedIds: string[] = [],
    keepAllIds = false,
    cleanupOptions?: ContentCleanupOptions
): Promise<TransformedContent> {
    const source = await fileio.readToString(page.sourcePath);
    const dom = new JSDOM(source);
    const doc = dom.window.document;

    stripXmlNamespaceAttributes(doc);
    translateEpubTypes(doc);
    rewriteImageReferences(doc, page, imageRegistry);
    selfAnchorHeadings(doc);
    if (page.split) extractDocumentPiece(doc, page.split, page.split.piece);
    removeIdsOwnedByOtherPages(doc, page, site);
    rewriteInternalLinks(doc, page, site);
    const navigationIds = [
        ...navigationFragmentIds(site, page.outputFilename),
        ...externallyReferencedIds,
        ...await stylesheetReferencedIds(doc, page.sourcePath)
    ];
    if (cleanupOptions) {
        cleanPublicationMarkup(doc, {
            bookLanguage: site.metadata.language,
            cleanup: cleanupOptions.cleanup,
            page: page.outputFilename,
            protectedIds: navigationIds,
            narratedTargetIds,
            responsiveTables: cleanupOptions.responsiveTables,
            report: cleanupOptions.report
        });
    }
    if (searchData) collectSearchPassages(searchData, doc, page, narratedTargetIds);
    // The CSS paths in narration selectors are worked out here, on the cleaned-up markup, which
    // is what the book contains
    const narrationSelectors = applyStructureIds(doc, narratedTargetIds, navigationIds, keepAllIds);
    // After the structure-id pass, so only ids that stay in the book are renamed
    const renamedIds = cleanupOptions?.cleanup
        ? renameCollidingIds(doc, narrationSelectors, cleanupOptions.reservedIds, page.outputFilename, cleanupOptions.report)
        : new Map<string, string>();
    if (searchData) updateNarratedSearchSelectors(searchData, page.index, narrationSelectors);

    return {
        bodyAttributes: page.split
            ? Array.from(doc.body.attributes, attribute => ({ name: attribute.name, value: attribute.value }))
            : [],
        bodyHtml: doc.body.innerHTML,
        title: doc.querySelector('title')?.textContent?.trim() ?? '',
        narrationSelectors,
        renamedIds
    };
}

async function stylesheetReferencedIds(doc: Document, sourcePath: string): Promise<string[]> {
    const ids = new Set<string>();
    for (const link of Array.from(doc.querySelectorAll('link[rel~="stylesheet"][href]'))) {
        const href = (link.getAttribute('href') || '').split(/[?#]/)[0];
        if (!href || isExternalHref(href)) continue;
        try {
            const cssPath = path.resolve(path.dirname(sourcePath), decodeURIComponent(href));
            const css = await fileio.readToString(cssPath);
            cssReferencedIds(css).forEach(id => ids.add(id));
        } catch {
            // Resource rewriting reports missing publication assets. An unreadable stylesheet
            // must not make this final id-retention pass fail independently.
        }
    }
    return Array.from(ids);
}

function navigationFragmentIds(site: SiteModel, outputFilename: string): string[] {
    const entries: Array<{ href: string }> = [...site.pageList];
    const addToc = (toc: SiteModel['toc']) => toc.forEach(entry => { entries.push({ href: entry.href }); addToc(entry.children); });
    addToc(site.toc);
    return entries.filter(entry => utils.getWithoutFrag(entry.href) === outputFilename)
        .map(entry => utils.getFrag(entry.href)).filter(Boolean);
}

function updateNarratedSearchSelectors(data: SearchData, pageIndex: number, selectors: Map<string, NarrationSelector>): void {
    data.passages.filter(passage => passage.page === pageIndex && passage.id).forEach(passage => {
        const selector = selectors.get(passage.id!);
        if (!selector) return;
        // A phrase that keeps its own id is still found by it (renamed, if it was)
        if (selector.type === 'FragmentSelector' && !selector.refinedBy) {
            passage.id = selector.value;
            return;
        }
        delete passage.id;
        passage.selector = selector;
    });
}

function stripXmlNamespaceAttributes(doc: Document): void {
    doc.querySelectorAll('*').forEach(elm => {
        elm.removeAttribute('xmlns');
        elm.removeAttribute('xmlns:epub');
    });
}

function translateEpubTypes(doc: Document): void {
    // A role the source gave its endnotes, which DPUB-ARIA 1.1 deprecated
    doc.querySelectorAll('[role="doc-endnote"]').forEach(elm => elm.removeAttribute('role'));
    doc.querySelectorAll('*').forEach(elm => {
        const epubType = elm.getAttribute('epub:type');
        if (!epubType) return;

        // EPUB 3 replaced rearnotes/rearnote with endnotes/endnote; treat the old terms as the new
        const types = epubType.split(/\s+/).filter(Boolean).flatMap(type =>
            type === 'rearnotes' ? [type, 'endnotes'] : type === 'rearnote' ? [type, 'endnote'] : [type]);
        types.forEach(type => elm.classList.add(`epubtype_${type.replace(/:/g, '_')}`));
        applyDpubAria(elm, types);
        applyAccessibleStructureName(elm, types);
        elm.removeAttribute('epub:type');
    });
}

// No role for endnotes: DPUB-ARIA 1.1 deprecated doc-endnote (and doc-endnotes' items are plain list
// items); the epubtype_endnote class still marks them for the reader
const EPUB_TYPE_ROLE_PRIORITY = [
    { type: 'footnote', role: 'doc-footnote' },
    // The section of endnotes: a landmark, so screen reader users can go to it
    { type: 'endnotes', role: 'doc-endnotes' },
    { type: 'noteref', role: 'doc-noteref' },
    { type: 'pagebreak', role: 'doc-pagebreak' }
];

const EPUB_TYPE_LABELS = [
    { type: 'sidebar', label: 'sidebar' },
    { type: 'note', label: 'note' }
];

function applyDpubAria(elm: Element, types: string[]): void {
    const mappedRole = EPUB_TYPE_ROLE_PRIORITY.find(({ type }) => types.includes(type))?.role;
    if (mappedRole && !elm.hasAttribute('role')) {
        elm.setAttribute('role', mappedRole);
    }

    if (types.includes('pagebreak')) {
        const label = pagebreakPrintLabel(elm);
        if (!elm.hasAttribute('aria-label')) {
            elm.setAttribute('aria-label', label ? `Page ${label}` : 'Page break');
        }
        // DAISY-derived EPUBs (the common case) mark pagebreaks as empty spans with the
        // printed page label only in `title` — verified against every real sample EPUB in
        // source-epubs/ except moby-dick (which has no pagebreaks at all). Without this,
        // the pagebreak renders as an empty, invisible box for sighted readers too.
        if (label && !(elm.textContent ?? '').trim()) {
            elm.textContent = label;
        }
    }
}

function pagebreakPrintLabel(elm: Element): string {
    const raw = elm.getAttribute('title') || elm.textContent || '';
    return raw.trim().replace(/\s+/g, ' ').replace(/^page[-\s]*/i, '');
}

function applyAccessibleStructureName(elm: Element, types: string[]): void {
    if (hasAccessibleStructureName(elm)) return;

    const label = EPUB_TYPE_LABELS.find(({ type }) => types.includes(type))?.label;
    if (label) elm.setAttribute('aria-label', label);
}

function hasAccessibleStructureName(elm: Element): boolean {
    if (elm.getAttribute('aria-label')?.trim()) return true;
    if (elm.getAttribute('aria-labelledby')?.trim()) return true;
    return Boolean(elm.firstElementChild?.matches('h1, h2, h3, h4, h5, h6'));
}

function rewriteInternalLinks(doc: Document, page: SitePage, site: SiteModel): void {
    doc.querySelectorAll('a[href]').forEach(link => {
        const href = link.getAttribute('href');
        if (!href || isExternalHref(href)) return;
        if (href.startsWith('#')) {
            const fragment = utils.getFrag(href);
            const output = site.idToOutput.get(fragmentKey(page.sourcePath, fragment));
            if (output && output !== page.outputFilename) link.setAttribute('href', `${output}#${fragment}`);
            return;
        }

        const absoluteHref = resolveContentHref(page.sourcePath, href);
        const rewrittenHref = rewriteSourceHref(absoluteHref, site.sourceToOutput, site.idToOutput, site.cutPointToOutput);
        if (rewrittenHref) link.setAttribute('href', rewrittenHref);
    });
}

function removeIdsOwnedByOtherPages(doc: Document, page: SitePage, site: SiteModel): void {
    if (!page.split) return;
    removeIdsNotOwnedByPage(doc, page.sourcePath, page.outputFilename, site.idToOutput);
}

function rewriteImageReferences(doc: Document, page: SitePage, imageRegistry: ImageAssetRegistry): void {
    rewriteUrlAttribute(doc, page, imageRegistry, 'img[src]', 'src');
    rewriteUrlAttribute(doc, page, imageRegistry, 'image[href]', 'href');
    rewriteUrlAttribute(doc, page, imageRegistry, 'image[xlink\\:href]', 'xlink:href');

    doc.querySelectorAll('img[srcset], source[srcset]').forEach(elm => {
        const srcset = elm.getAttribute('srcset');
        if (!srcset) return;
        elm.setAttribute('srcset', rewriteSrcset(srcset, page.sourcePath, imageRegistry));
    });
}

function rewriteUrlAttribute(
    doc: Document,
    page: SitePage,
    imageRegistry: ImageAssetRegistry,
    selector: string,
    attributeName: string
): void {
    doc.querySelectorAll(selector).forEach(elm => {
        const value = elm.getAttribute(attributeName);
        if (!value || isExternalHref(value)) return;

        const frag = utils.getFrag(value);
        const sourcePath = normalizeSourcePath(resolveContentHref(page.sourcePath, utils.getWithoutFrag(value)));
        const asset = imageRegistry.register(sourcePath);
        elm.setAttribute(attributeName, frag ? `${asset.href}#${frag}` : asset.href);
    });
}

function rewriteSrcset(srcset: string, sourcePath: string, imageRegistry: ImageAssetRegistry): string {
    return srcset.split(',')
        .map(candidate => {
            const parts = candidate.trim().split(/\s+/);
            const imagePath = parts.shift();
            if (!imagePath || isExternalHref(imagePath)) return candidate.trim();

            const asset = imageRegistry.register(resolveContentHref(sourcePath, imagePath));
            return [asset.href, ...parts].join(' ');
        })
        .join(', ');
}

function selfAnchorHeadings(doc: Document): void {
    ensureHeadingIds(doc);
    const headings = Array.from(doc.querySelectorAll('h1, h2, h3, h4, h5, h6'));
    headings.forEach(heading => {
        const headingId = heading.id;
        // Same-page anchor targets aren't natively focusable, so activating a link to one
        // is normally a silent no-op for a screen reader user (no scroll, no focus change,
        // nothing perceptible happens). tabindex="-1" makes the heading a real focus target
        // without adding it to the tab order — the standard fix for this class of link.
        if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1');

        const hasSelfAnchor = Array.from(heading.children).some(child =>
            child.tagName.toLowerCase() === 'a'
            && child.getAttribute('href') === `#${headingId}`
        );
        if (hasSelfAnchor) return;
        // A heading with nothing to see (no text, no image) is one the publisher meant for screen
        // readers only, e.g. <h1 class="blind" title="Copyright"></h1>: a link in it would be all
        // that shows, labelled "Link to heading", and would become the heading's name
        const text = (heading.textContent ?? '').trim().replace(/\s+/g, ' ');
        if (!text && !heading.querySelector('img, svg, math, picture, video, canvas')) return;

        const anchor = doc.createElement('a');
        const headingLabel = text || 'heading';
        const anchorLabel = `Link to ${headingLabel}`;
        anchor.setAttribute('href', `#${headingId}`);
        anchor.setAttribute('rel', 'bookmark');
        anchor.setAttribute('class', 'webbook');
        anchor.setAttribute('title', anchorLabel);
        anchor.setAttribute('aria-label', anchorLabel);
        anchor.innerHTML = selfAnchorSvg();
        heading.appendChild(anchor);
    });
}

function selfAnchorSvg(): string {
    return '<svg aria-hidden="true" role="img" width="24" height="24" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><g transform="rotate(135 12 12)"><path d="M9 7a1 1 0 0 1 .117 1.993L9 9H7a3 3 0 0 0-.176 5.995L7 15h2a1 1 0 0 1 .117 1.993L9 17H7a5 5 0 0 1-.217-9.995L7 7h2Zm8 0a5 5 0 0 1 .217 9.995L17 17h-2a1 1 0 0 1-.117-1.993L15 15h2a3 3 0 0 0 .176-5.995L17 9h-2a1 1 0 0 1-.117-1.993L15 7h2ZM7 11h10a1 1 0 0 1 .117 1.993L17 13H7a1 1 0 0 1-.117-1.993L7 11h10H7Z" fill="currentColor"/></g></svg>';
}

function resolveContentHref(sourcePath: string, href: string): string {
    const baseDir = path.dirname(sourcePath);
    const noFrag = utils.getWithoutFrag(href);
    const frag = utils.getFrag(href);
    const resolved = path.resolve(baseDir, noFrag);
    return frag ? `${resolved}#${frag}` : resolved;
}

export { rewriteInternalLinks, selfAnchorHeadings, transformContent };
