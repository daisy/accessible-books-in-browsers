import path from 'path';
import xpath from 'xpath';
import { JSDOM } from 'jsdom';
import type { Epub, Metadata, SpineItem } from './epubParser/types.js';
import * as fileio from './file-io.js';
import * as utils from './utils.js';
import {
    ensureHeadingIds,
    extractDocumentPiece,
    pieceForElement,
    planDocumentSplit,
    titleForPiece,
    type DocumentSplitPlan,
    type TocFragmentTarget
} from './chapter-split.js';

export type BookMetadata = {
    author: string;
    coverPath: string;
    date: string;
    identifier: string;
    declaredLanguage: string;
    language: string;
    // The spine's page-progression-direction (plan 28)
    pageProgression?: 'ltr' | 'rtl';
    title: string;
};
export type TocEntry = {
    children: TocEntry[];
    href: string;
    sourceHref: string;
    title: string;
};
export type PageListEntry = {
    href: string;
    label: string;
    sourceHref: string;
};
export type PageSplit = DocumentSplitPlan & { piece: number };
export type SitePage = {
    audioBaseName: string;
    index: number;
    moPath: string;
    outputFilename: string;
    sourcePath: string;
    split?: PageSplit;
    title: string;
};
export type SiteModel = {
    bookId: string;
    headingTitles: boolean;
    idToOutput: Map<string, string>;
    cutPointToOutput: Map<string, string>;
    coverHref?: string;
    metadata: BookMetadata;
    pageList: PageListEntry[];
    pages: SitePage[];
    sourceToOutput: Map<string, string>;
    toc: TocEntry[];
};

const select = xpath.useNamespaces({ html: 'http://www.w3.org/1999/xhtml' });
const LONG_NESTED_DOCUMENT_BYTES = 50 * 1024;

export type SiteModelOptions = {
    identifier?: string;
    headingTitles?: boolean;
    splitChapters?: boolean;
    language?: string;
    warn?: (message: string) => void;
    onSplit?: (sourcePath: string, pieces: number) => void;
};

type PlannedPage = {
    doc: Document;
    headingTitle: string;
    outputFilename: string;
    piece: number;
    sourcePath: string;
    spineItem: SpineItem;
    split?: DocumentSplitPlan;
    tocTitle: string;
};

async function buildSiteModel(epub: Epub, options: SiteModelOptions = {}): Promise<SiteModel> {
    const metadata = { ...buildMetadata(epub.metadata, options.language),
        ...(epub.pageProgression ? { pageProgression: epub.pageProgression } : {}) };
    const bookTitle = collapseWhitespace(metadata.title);
    const sourceToOutput = new Map<string, string>();
    const usedFilenames = new Set<string>();
    const plannedPages: PlannedPage[] = [];

    for (const [spineIndex, spineItem] of epub.spine.entries()) {
        const sourcePath = normalizeSourcePath(spineItem.path);
        const source = await fileio.readToString(sourcePath);
        const doc = new JSDOM(source).window.document;
        ensureHeadingIds(doc);
        const targets = collectTocFragmentTargets(epub.nav.toc, sourcePath);
        const candidateSplit = options.splitChapters === false
            ? undefined
            : planDocumentSplit(doc, targets, message => options.warn?.(`${path.basename(sourcePath)}: ${message}`));
        // Multiple top-level entries unambiguously describe multiple chapters. Nested entries in
        // an ordinary chapter-sized spine item are usually subsections; promote them only for a
        // genuinely long document, as in books whose main text is concentrated in one file.
        const split = candidateSplit
            && (candidateSplit.depth === 1 || Buffer.byteLength(source) >= LONG_NESTED_DOCUMENT_BYTES)
            ? candidateSplit
            : undefined;
        if (split) options.onSplit?.(sourcePath, split.pieces);

        const pageCount = split?.pieces ?? 1;
        const stem = path.basename(sourcePath, path.extname(sourcePath));
        for (let piece = 0; piece < pageCount; piece += 1) {
            const baseName = piece === 0
                ? (spineIndex === 0 ? 'index.html' : `${stem}.html`)
                : `${stem}-${piece + 1}.html`;
            const outputFilename = uniqueFilename(baseName, usedFilenames);
            usedFilenames.add(outputFilename);
            if (piece === 0) sourceToOutput.set(sourcePath, outputFilename);

            const pieceDoc = split ? extractDocumentPiece(cloneDocument(doc), split, piece) : cloneDocument(doc);
            const headingTitle = Array.from(pieceDoc.querySelectorAll('h1, h2, h3, h4, h5, h6'))
                .map(heading => collapseWhitespace(heading.textContent ?? ''))
                .find(heading => heading && heading !== bookTitle) ?? '';
            plannedPages.push({ doc, headingTitle, outputFilename, piece, sourcePath, spineItem, split,
                tocTitle: split ? titleForPiece(split, piece) : '' });
        }
    }

    const idToOutput = new Map<string, string>();
    const cutPointToOutput = new Map<string, string>();
    for (const planned of plannedPages) {
        if (planned.piece !== 0) continue;
        const sourcePages = plannedPages.filter(page => page.sourcePath === planned.sourcePath);
        for (const element of Array.from(planned.doc.querySelectorAll('[id]'))) {
            const piece = planned.split ? pieceForElement(planned.doc, planned.split, element) : 0;
            const output = sourcePages[piece]?.outputFilename ?? sourcePages[0].outputFilename;
            idToOutput.set(fragmentKey(planned.sourcePath, element.id), output);
        }
        if (planned.split) {
            for (const id of planned.split.cutIds) {
                const output = idToOutput.get(fragmentKey(planned.sourcePath, id));
                if (output) cutPointToOutput.set(fragmentKey(planned.sourcePath, id), output);
            }
        }
    }

    const navLinks = collectNavLinks(epub.nav.toc);
    const navTitleBySource = new Map<string, string>();
    navLinks.forEach(link => {
        if (utils.getFrag(link.href)) return;
        const sourcePath = normalizeSourcePath(utils.getWithoutFrag(link.href));
        if (!navTitleBySource.has(sourcePath)) navTitleBySource.set(sourcePath, link.title);
    });
    const useHeadingTitles = options.headingTitles === true
        && plannedPages.length > 1
        && plannedPages.every(page => collapseWhitespace(page.spineItem.title ?? '') === bookTitle);
    const pages: SitePage[] = plannedPages.map((planned, index) => {
        const title = planned.tocTitle || navTitleBySource.get(planned.sourcePath)
            || (index === 0 ? metadata.title : '') || (useHeadingTitles ? planned.headingTitle : '')
            || planned.spineItem.title || path.basename(planned.sourcePath, path.extname(planned.sourcePath));
        return {
            audioBaseName: path.basename(planned.outputFilename, path.extname(planned.outputFilename)),
            index, moPath: planned.spineItem.moPath, outputFilename: planned.outputFilename,
            sourcePath: planned.sourcePath,
            ...(planned.split ? { split: { ...planned.split, piece: planned.piece } } : {}), title
        };
    });

    const coverSourceHref = landmarkCoverHref(epub.nav.landmarks) ?? epub.coverDocumentHref;
    const coverHref = coverSourceHref
        ? rewriteSourceHref(coverSourceHref, sourceToOutput, idToOutput, cutPointToOutput, true)
        : '';

    return {
        bookId: options.identifier ?? metadata.identifier, headingTitles: useHeadingTitles,
        idToOutput, cutPointToOutput, ...(coverHref ? { coverHref } : {}), metadata,
        pageList: buildPageList(epub.nav['page-list'], sourceToOutput, idToOutput, cutPointToOutput),
        pages, sourceToOutput,
        toc: buildToc(epub.nav.toc, sourceToOutput, idToOutput, cutPointToOutput)
    };
}

function landmarkCoverHref(landmarks: Element | undefined): string | undefined {
    if (!landmarks) return undefined;
    const link = Array.from(landmarks.getElementsByTagName('a')).find(element => {
        const type = element.getAttribute('epub:type') ?? element.getAttribute('type') ?? '';
        return type.toLowerCase().split(/\s+/).includes('cover');
    });
    return link?.getAttribute('href') ?? undefined;
}

function collectTocFragmentTargets(nav: Element | undefined, sourcePath: string): TocFragmentTarget[] {
    if (!nav) return [];
    const targets: TocFragmentTarget[] = [];
    const visit = (parent: Element, depth: number): void => {
        directChildElements(parent, 'li').forEach(item => {
            const link = directChildElement(item, 'a');
            const href = link?.getAttribute('href') ?? '';
            const fragment = utils.getFrag(href);
            if (fragment && normalizeSourcePath(utils.getWithoutFrag(href)) === sourcePath) {
                targets.push({ depth, fragment, title: normalizeWhitespace(link?.textContent ?? '') });
            }
            const childList = directChildElement(item, 'ol');
            if (childList) visit(childList, depth + 1);
        });
    };
    visit(nav, 1);
    return targets;
}

function uniqueFilename(filename: string, usedFilenames: Set<string>): string {
    if (!usedFilenames.has(filename)) return filename;
    const ext = path.extname(filename);
    const stem = path.basename(filename, ext);
    let index = 2;
    let candidate = `${stem}-${index}${ext}`;
    while (usedFilenames.has(candidate)) { index += 1; candidate = `${stem}-${index}${ext}`; }
    return candidate;
}

function buildMetadata(metadata: Metadata, languageOverride?: string): BookMetadata {
    const declaredLanguage = firstValue(metadata['dc:language'] ?? metadata.language).trim().split(/\s+/)[0] || 'en';
    return {
        author: firstValue(metadata['dc:creator'] ?? metadata.creator), coverPath: firstValue(metadata.cover),
        date: firstValue(metadata['dc:date'] ?? metadata.date ?? metadata['dcterms:modified']),
        identifier: firstValue(metadata['dc:identifier'] ?? metadata.identifier),
        declaredLanguage,
        language: languageOverride ?? declaredLanguage,
        title: firstValue(metadata['dc:title'] ?? metadata.title) || 'Untitled'
    };
}

function buildPageList(
    nav: Element | undefined,
    sourceToOutput: Map<string, string>,
    idToOutput: Map<string, string>,
    cutPointToOutput: Map<string, string>
): PageListEntry[] {
    return collectNavLinks(nav).map(link => {
        const href = rewriteSourceHref(link.href, sourceToOutput, idToOutput, cutPointToOutput, true);
        return href ? { href, label: normalizePageLabel(link.title), sourceHref: link.href } : null;
    }).filter((entry): entry is PageListEntry => Boolean(entry));
}

function buildToc(
    nav: Element | undefined,
    sourceToOutput: Map<string, string>,
    idToOutput: Map<string, string>,
    cutPointToOutput: Map<string, string>
): TocEntry[] {
    return nav ? collectTocEntries(nav, sourceToOutput, idToOutput, cutPointToOutput) : [];
}

function collectTocEntries(
    parent: Element,
    sourceToOutput: Map<string, string>,
    idToOutput: Map<string, string>,
    cutPointToOutput: Map<string, string>
): TocEntry[] {
    return directChildElements(parent, 'li').map(item => buildTocEntry(item, sourceToOutput, idToOutput, cutPointToOutput))
        .filter((entry): entry is TocEntry => Boolean(entry));
}

function buildTocEntry(
    item: Element,
    sourceToOutput: Map<string, string>,
    idToOutput: Map<string, string>,
    cutPointToOutput: Map<string, string>
): TocEntry | null {
    const link = directChildElement(item, 'a');
    const label = link ?? directChildElement(item, 'span');
    const childList = directChildElement(item, 'ol');
    const children = childList ? collectTocEntries(childList, sourceToOutput, idToOutput, cutPointToOutput) : [];
    const sourceHref = link?.getAttribute('href') ?? '';
    const href = sourceHref ? rewriteSourceHref(sourceHref, sourceToOutput, idToOutput, cutPointToOutput, true) : '';
    if (sourceHref && !href && children.length === 0) return null;
    const title = normalizeWhitespace(label?.textContent ?? '');
    if (!title && children.length === 0) return null;
    return { children, href, sourceHref, title };
}

function collectNavLinks(nav: Element | undefined): Array<{ href: string; title: string }> {
    if (!nav) return [];
    const links = select('.//html:a', nav) as unknown as Element[];
    return links.map(link => ({ href: link.getAttribute('href') ?? '', title: normalizeWhitespace(link.textContent ?? '') }))
        .filter(link => link.href && link.title);
}

function rewriteSourceHref(
    href: string,
    sourceToOutput: Map<string, string>,
    idToOutput: Map<string, string> = new Map(),
    cutPointToOutput: Map<string, string> = new Map(),
    stripCutPoint = false
): string {
    const sourcePath = normalizeSourcePath(utils.getWithoutFrag(href));
    const fragment = utils.getFrag(href);
    const key = fragmentKey(sourcePath, fragment);
    const outputFilename = (fragment ? idToOutput.get(key) : undefined) ?? sourceToOutput.get(sourcePath);
    if (!outputFilename) return '';
    if (!fragment || (stripCutPoint && cutPointToOutput.has(key))) return outputFilename;
    return `${outputFilename}#${fragment}`;
}

function fragmentKey(sourcePath: string, fragment: string): string {
    return `${normalizeSourcePath(sourcePath)}#${fragment}`;
}
function normalizePageLabel(label: string): string {
    return label.trim().replace(/^page[-\s]*/i, '');
}
function normalizeWhitespace(value: string): string {
    return value.trim().replace(/\s+/g, ' ');
}
function firstValue(value: string | string[] | undefined): string {
    return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}
function normalizeSourcePath(sourcePath: string): string {
    return path.resolve(sourcePath);
}
function directChildElement(parent: Element, localName: string): Element | null {
    return directChildElements(parent, localName)[0] ?? null;
}
function directChildElements(parent: Element, localName: string): Element[] {
    return Array.from(parent.childNodes).filter((node): node is Element => node.nodeType === 1)
        .filter(element => element.localName === localName);
}
function collapseWhitespace(value: string): string {
    return value.replace(/\s+/g, ' ').trim();
}
function cloneDocument(doc: Document): Document {
    return new JSDOM(doc.documentElement.outerHTML).window.document;
}

export { buildSiteModel, collapseWhitespace, fragmentKey, landmarkCoverHref, normalizeSourcePath, rewriteSourceHref };
