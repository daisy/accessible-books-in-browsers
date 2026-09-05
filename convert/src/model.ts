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
    metadata: BookMetadata;
    pageList: PageListEntry[];
    pages: SitePage[];
    sourceToOutput: Map<string, string>;
    toc: TocEntry[];
};

const select = xpath.useNamespaces({
    html: 'http://www.w3.org/1999/xhtml'
});

function buildSiteModel(epub: Epub): SiteModel {
    const sourceToOutput = buildSourceToOutputMap(epub.spine.map(item => item.path));
    const navLinks = collectNavLinks(epub.nav.toc);
    const navTitleBySource = new Map<string, string>();

    navLinks.forEach(link => {
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

    const toc = pages.map(page => ({
        href: page.outputFilename,
        sourceHref: page.sourcePath,
        title: page.title
    }));

    return {
        metadata,
        pageList: buildPageList(epub.nav['page-list'], sourceToOutput),
        pages,
        sourceToOutput,
        toc
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

function collectNavLinks(nav: Element | undefined): Array<{ href: string; title: string }> {
    if (!nav) return [];

    const links = select('.//html:a', nav) as Element[];
    return links
        .map(link => ({
            href: link.getAttribute('href') ?? '',
            title: (link.textContent ?? '').trim()
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

function firstValue(value: string | string[] | undefined): string {
    if (Array.isArray(value)) return value[0] ?? '';
    return value ?? '';
}

function normalizeSourcePath(sourcePath: string): string {
    return path.resolve(sourcePath);
}

export {
    buildSiteModel,
    normalizeSourcePath,
    rewriteSourceHref
};
