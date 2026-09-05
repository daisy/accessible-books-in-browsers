import path from 'path';
import { JSDOM } from 'jsdom';
import type { ImageAssetRegistry } from './assets.js';
import type { SiteModel, SitePage } from './model.js';
import { normalizeSourcePath, rewriteSourceHref } from './model.js';
import * as fileio from './file-io.js';
import * as utils from './utils.js';

export type TransformedContent = {
    bodyHtml: string;
    title: string;
};

async function transformContent(
    page: SitePage,
    site: SiteModel,
    imageRegistry: ImageAssetRegistry
): Promise<TransformedContent> {
    const source = await fileio.readToString(page.sourcePath);
    const dom = new JSDOM(source);
    const doc = dom.window.document;

    stripXmlNamespaceAttributes(doc);
    translateEpubTypes(doc);
    rewriteInternalLinks(doc, page, site);
    rewriteImageReferences(doc, page, imageRegistry);
    selfAnchorHeadings(doc);

    return {
        bodyHtml: doc.body.innerHTML,
        title: doc.querySelector('title')?.textContent?.trim() ?? ''
    };
}

function stripXmlNamespaceAttributes(doc: Document): void {
    doc.querySelectorAll('*').forEach(elm => {
        elm.removeAttribute('xmlns');
        elm.removeAttribute('xmlns:epub');
    });
}

function translateEpubTypes(doc: Document): void {
    doc.querySelectorAll('*').forEach(elm => {
        const epubType = elm.getAttribute('epub:type');
        if (!epubType) return;

        const types = epubType.split(/\s+/).filter(Boolean);
        types.forEach(type => elm.classList.add(`epubtype_${type.replace(/:/g, '_')}`));
        applyDpubAria(elm, types);
        applyAccessibleStructureName(elm, types);
        elm.removeAttribute('epub:type');
    });
}

const EPUB_TYPE_ROLE_PRIORITY = [
    { type: 'footnote', role: 'doc-footnote' },
    { type: 'endnote', role: 'doc-endnote' },
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
        if (!href || shouldLeaveHrefAlone(href)) return;
        if (href.startsWith('#')) return;

        const absoluteHref = resolveContentHref(page.sourcePath, href);
        const rewrittenHref = rewriteSourceHref(absoluteHref, site.sourceToOutput);
        if (rewrittenHref) link.setAttribute('href', rewrittenHref);
    });
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
        if (!value || shouldLeaveHrefAlone(value)) return;

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
            if (!imagePath || shouldLeaveHrefAlone(imagePath)) return candidate.trim();

            const asset = imageRegistry.register(resolveContentHref(sourcePath, imagePath));
            return [asset.href, ...parts].join(' ');
        })
        .join(', ');
}

function selfAnchorHeadings(doc: Document): void {
    const headings = Array.from(doc.querySelectorAll('h1, h2, h3, h4, h5, h6'));
    headings.forEach((heading, index) => {
        const headingId = heading.getAttribute('id')
            || heading.getAttribute('data-number')
            || `h-${index}`;
        heading.setAttribute('id', headingId);
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

        const anchor = doc.createElement('a');
        const anchorLabel = `Link to ${heading.textContent?.trim() ?? 'heading'}`;
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

function shouldLeaveHrefAlone(href: string): boolean {
    return /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(href);
}

export { transformContent };
