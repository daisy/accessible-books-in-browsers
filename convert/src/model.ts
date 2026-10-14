import path from 'path';
import xpath from 'xpath';
import type { Epub, Metadata } from './epubParser/types.js';
import * as utils from './utils.js';

export type BookMetadata = {
    author: string;
    coverPath: string;
    date: string;
    identifier: string;
    language: string;
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

export type SitePage = {
    audioBaseName: string;
    index: number;
    moPath: string;
    outputFilename: string;
    sourcePath: string;
    title: string;
};

export type SiteModel = {
    // Keys saved reading positions (`webbook-book-id`). The EPUB's identifier unless overridden.
    bookId: string;
    metadata: BookMetadata;
    pageList: PageListEntry[];
    pages: SitePage[];
    sourceToOutput: Map<string, string>;
    toc: TocEntry[];
};

const select = xpath.useNamespaces({
    html: 'http://www.w3.org/1999/xhtml'
});

export type SiteModelOptions = {
    identifier?: string;
};

function buildSiteModel(epub: Epub, options: SiteModelOptions = {}): SiteModel {
    const sourceToOutput = buildSourceToOutputMap(epub.spine.map(item => item.path));
    const navLinks = collectNavLinks(epub.nav.toc);
    const navTitleBySource = new Map<string, string>();

    navLinks.forEach(link => {
        if (utils.getFrag(link.href)) return;

        const sourcePath = normalizeSourcePath(utils.getWithoutFrag(link.href));
        if (!navTitleBySource.has(sourcePath)) {
            navTitleBySource.set(sourcePath, link.title);
        }
    });

    const metadata = buildMetadata(epub.metadata);
    const pages = epub.spine.map((spineItem, index) => {
        const sourcePath = normalizeSourcePath(spineItem.path);
        const outputFilename = sourceToOutput.get(sourcePath);
        if (!outputFilename) {
            throw new Error(`No output filename assigned for ${sourcePath}`);
        }

        const title = navTitleBySource.get(sourcePath)
            || (index === 0 ? metadata.title : '')
            || path.basename(sourcePath, path.extname(sourcePath));

        return {
            audioBaseName: path.basename(outputFilename, path.extname(outputFilename)),
            index,
            moPath: spineItem.moPath,
            outputFilename,
            sourcePath,
            title
        };
    });

    return {
        bookId: options.identifier ?? metadata.identifier,
        metadata,
        pageList: buildPageList(epub.nav['page-list'], sourceToOutput),
        pages,
        sourceToOutput,
        toc: buildToc(epub.nav.toc, sourceToOutput)
    };
}

function buildSourceToOutputMap(sourcePaths: string[]): Map<string, string> {
    const usedFilenames = new Set<string>();
    const map = new Map<string, string>();

    sourcePaths.forEach((sourcePath, index) => {
        const normalizedSourcePath = normalizeSourcePath(sourcePath);
        const baseName = index === 0
            ? 'index.html'
            : `${path.basename(sourcePath, path.extname(sourcePath))}.html`;

        const outputFilename = uniqueFilename(baseName, usedFilenames);
        usedFilenames.add(outputFilename);
        map.set(normalizedSourcePath, outputFilename);
    });

    return map;
}

function uniqueFilename(filename: string, usedFilenames: Set<string>): string {
    if (!usedFilenames.has(filename)) return filename;

    const ext = path.extname(filename);
    const stem = path.basename(filename, ext);
    let index = 2;
    let candidate = `${stem}-${index}${ext}`;
    while (usedFilenames.has(candidate)) {
        index += 1;
        candidate = `${stem}-${index}${ext}`;
    }
    return candidate;
}

function buildMetadata(metadata: Metadata): BookMetadata {
    return {
        author: firstValue(metadata['dc:creator'] ?? metadata.creator),
        coverPath: firstValue(metadata.cover),
        date: firstValue(metadata['dc:date'] ?? metadata.date ?? metadata['dcterms:modified']),
        identifier: firstValue(metadata['dc:identifier'] ?? metadata.identifier),
        language: firstValue(metadata['dc:language'] ?? metadata.language) || 'en',
        title: firstValue(metadata['dc:title'] ?? metadata.title) || 'Untitled'
    };
}

function buildPageList(nav: Element | undefined, sourceToOutput: Map<string, string>): PageListEntry[] {
    return collectNavLinks(nav)
        .map(link => {
            const href = rewriteSourceHref(link.href, sourceToOutput);
            if (!href) return null;

            return {
                href,
                label: normalizePageLabel(link.title),
                sourceHref: link.href
            };
        })
        .filter((entry): entry is PageListEntry => Boolean(entry));
}

function buildToc(nav: Element | undefined, sourceToOutput: Map<string, string>): TocEntry[] {
    if (!nav) return [];
    return collectTocEntries(nav, sourceToOutput);
}

function collectTocEntries(parent: Element, sourceToOutput: Map<string, string>): TocEntry[] {
    return directChildElements(parent, 'li')
        .map(item => buildTocEntry(item, sourceToOutput))
        .filter((entry): entry is TocEntry => Boolean(entry));
}

function buildTocEntry(item: Element, sourceToOutput: Map<string, string>): TocEntry | null {
    const link = directChildElement(item, 'a');
    const label = link ?? directChildElement(item, 'span');
    const childList = directChildElement(item, 'ol');
    const children = childList ? collectTocEntries(childList, sourceToOutput) : [];

    const sourceHref = link?.getAttribute('href') ?? '';
    const href = sourceHref ? rewriteSourceHref(sourceHref, sourceToOutput) : '';
    if (sourceHref && !href && children.length === 0) return null;

    const title = normalizeWhitespace(label?.textContent ?? '');
    if (!title && children.length === 0) return null;

    return {
        children,
        href,
        sourceHref,
        title
    };
}

function collectNavLinks(nav: Element | undefined): Array<{ href: string; title: string }> {
    if (!nav) return [];

    const links = select('.//html:a', nav) as unknown as Element[];
    return links
        .map(link => ({
            href: link.getAttribute('href') ?? '',
            title: normalizeWhitespace(link.textContent ?? '')
        }))
        .filter(link => link.href && link.title);
}

function rewriteSourceHref(href: string, sourceToOutput: Map<string, string>): string {
    const sourcePath = normalizeSourcePath(utils.getWithoutFrag(href));
    const outputFilename = sourceToOutput.get(sourcePath);
    if (!outputFilename) return '';

    const frag = utils.getFrag(href);
    return frag ? `${outputFilename}#${frag}` : outputFilename;
}

function normalizePageLabel(label: string): string {
    return label.trim().replace(/^page[-\s]*/i, '');
}

function normalizeWhitespace(value: string): string {
    return value.trim().replace(/\s+/g, ' ');
}

function firstValue(value: string | string[] | undefined): string {
    if (Array.isArray(value)) return value[0] ?? '';
    return value ?? '';
}

function normalizeSourcePath(sourcePath: string): string {
    return path.resolve(sourcePath);
}

function directChildElement(parent: Element, localName: string): Element | null {
    return directChildElements(parent, localName)[0] ?? null;
}

function directChildElements(parent: Element, localName: string): Element[] {
    return Array.from(parent.childNodes)
        .filter((node): node is Element => node.nodeType === 1)
        .filter(element => element.localName === localName);
}

export {
    buildSiteModel,
    normalizeSourcePath,
    rewriteSourceHref
};
