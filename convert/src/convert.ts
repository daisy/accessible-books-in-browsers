import fs from 'fs-extra';
import path from 'path';
import winston from 'winston';
import * as epubParser from './epubParser/index.js';
import * as logger from './logger/index.js';
import { ImageAssetRegistry, copyImageAssets, copyUiAssets, writeServiceWorkerStub } from './assets.js';
import { TemplateRenderer } from './template.js';
import { buildSiteModel } from './model.js';
import { createAudioForPage, getMediaSegments, type MediaSegment } from './audio.js';
import { openAudioCache } from './audio-cache.js';
import { readAccessibilityInfo } from './accessibility-info.js';
import { createOutputStaging, discardOutputStaging, finalizeOutput, outputPath } from './output.js';
import { transformContent, type TransformedContent } from './content-transform.js';
import { createSearchData, generateSearchIndex } from './create-search-index.js';
import * as utils from './utils.js';
import { generateAudioMap, type PageAudioMapSource } from './audio-map.js';
import * as fileio from './file-io.js';
import { ConversionReport, writeConversionReport } from './conversion-report.js';
import { rewriteRenamedFragment } from './markup-cleanup.js';
import { isExternalHref } from './ids.js';
import { JSDOM } from 'jsdom';
import { runOptionalChecks } from './optional-checks.js';

export type ConvertOptions = {
    // A folder (or true for the default one in the system's temp folder) to reuse unchanged page
    // audio from; off by default
    audioCache?: string | boolean;
    headingTitles?: boolean;
    identifier?: string;
    includeNonLinear?: boolean;
    splitChapters?: boolean;
    keepAllIds?: boolean;
    language?: string;
    markupCleanup?: boolean;
    responsiveTables?: boolean;
    check?: boolean;
};

async function convert(input: string, output: string, template: string, options: ConvertOptions = {}): Promise<void> {
    const outputPaths = await createOutputStaging(output);
    logger.initLogger(outputPaths.logFile);

    try {
        winston.info(`Converting ${input}`);
        winston.info(`Using template from ${template}`);
        if (options.includeNonLinear) {
            winston.info('Including OPF spine items marked linear="no" in reading order');
        }

        const epub = await epubParser.parse(input, {
            includeNonLinear: options.includeNonLinear,
            warn: message => winston.warn(message)
        });
        if (options.splitChapters === false) winston.info('Chapter splitting is off');
        const site = await buildSiteModel(epub, {
            identifier: options.identifier,
            headingTitles: options.headingTitles !== false,
            splitChapters: options.splitChapters !== false,
            language: options.language,
            warn: message => winston.warn(message),
            onSplit: (sourcePath, pieces) => winston.info(
                `Split ${path.basename(sourcePath)} into ${pieces} pages at its table of contents entries`
            )
        });
        if (options.headingTitles !== false) {
            winston.info(site.headingTitles
                ? 'Every page is titled with the book title, so pages are titled by their first other heading'
                : 'Pages have their own titles, so --heading-titles has no effect');
        }
        if (options.identifier) {
            winston.info(`Using book ID ${options.identifier} (EPUB identifier: ${site.metadata.identifier || 'none'})`);
        }
        const imageRegistry = new ImageAssetRegistry();
        const renderer = await TemplateRenderer.load(template);
        const report = new ConversionReport({
            declared: site.metadata.declaredLanguage,
            ...(options.language ? { override: site.metadata.language } : {}),
            effective: site.metadata.language
        }, {
            'split chapters': options.splitChapters !== false,
            'heading titles': options.headingTitles !== false,
            'markup cleanup': options.markupCleanup !== false,
            'responsive tables': options.responsiveTables !== false,
            'keep all ids': options.keepAllIds === true,
            'optional checks': options.check === true
        });
        const audioCache = openAudioCache(options.audioCache, site.bookId);
        const accessibility = await readAccessibilityInfo(epub.packageFilename);
        const searchData = createSearchData(site);
        const referencedIdsByPage = await crossPageReferencedIds(site);
        const coverAsset = site.metadata.coverPath
            ? imageRegistry.register(site.metadata.coverPath)
            : null;

        await copyUiAssets(template, outputPaths);
        await writeServiceWorkerStub(outputPaths);

        // Read ahead, so every page's table of contents can mark the narrated pages
        const mediaSegmentsByPage = new Map<string, MediaSegment[]>(site.pages.map(page => [page.outputFilename, []]));
        const pagesBySource = new Map<string, typeof site.pages>();
        const pageAudioSources = new Map<string, PageAudioMapSource>();
        for (const page of site.pages) {
            const pages = pagesBySource.get(page.sourcePath) ?? [];
            pages.push(page);
            pagesBySource.set(page.sourcePath, pages);
        }
        for (const [sourcePath, pages] of pagesBySource) {
            const firstPage = pages[0];
            const segments = firstPage.moPath ? await getMediaSegments(firstPage) : [];
            for (const segment of segments) {
                const id = utils.getFrag(segment.textSrc);
                const output = id ? site.idToOutput.get(`${sourcePath}#${id}`) : undefined;
                const target = output ?? firstPage.outputFilename;
                if (!output && pages.length > 1) {
                    winston.warn(`Narration target ${id ? `#${id}` : segment.textSrc} was not found; using ${target}`);
                }
                mediaSegmentsByPage.get(target)?.push(segment);
            }
        }
        const narratedPages = new Set(site.pages
            .filter(page => (mediaSegmentsByPage.get(page.outputFilename) ?? []).length > 0)
            .map(page => page.outputFilename));

        const transformed = new Map<string, { content: TransformedContent; audio: Awaited<ReturnType<typeof createAudioForPage>> }>();
        const renamesByPage = new Map<string, Map<string, string>>();
        for (const page of site.pages) {
            winston.info(`Rendering ${page.outputFilename}`);
            const mediaSegments = mediaSegmentsByPage.get(page.outputFilename) ?? [];
            const narratedTargetIds = mediaSegments.map(segment => utils.getFrag(segment.textSrc)).filter(Boolean);
            const content = await transformContent(page, site, imageRegistry, searchData, narratedTargetIds,
                referencedIdsByPage.get(page.outputFilename) ?? [], options.keepAllIds === true, {
                    cleanup: options.markupCleanup !== false,
                    report,
                    reservedIds: renderer.reservedContentIds(),
                    responsiveTables: options.responsiveTables !== false
                });
            const audio = await createAudioForPage(page, outputPaths, mediaSegments, audioCache, content.narrationSelectors);
            pageAudioSources.set(page.outputFilename, { audio, bodyHtml: content.bodyHtml });
            transformed.set(page.outputFilename, { content, audio });
            renamesByPage.set(page.outputFilename, content.renamedIds);
        }

        const contentDocuments = rewriteRenamedTargets(site, transformed, renamesByPage);

        for (const page of site.pages) {
            const result = transformed.get(page.outputFilename)!;
            pageAudioSources.set(page.outputFilename, { audio: result.audio, bodyHtml: result.content.bodyHtml });
            const html = renderer.renderPage(site, page, result.content, result.audio, {
                coverHref: coverAsset?.href ?? '',
                narratedPages,
                accessibility
            });
            await fs.writeFile(outputPath(outputPaths, page.outputFilename), html);
        }

        await generateAudioMap(site, pageAudioSources, outputPaths);
        await generateSearchIndex(searchData, outputPaths);
        await copyImageAssets(imageRegistry, outputPaths);
        await reportBrokenLinks(site, contentDocuments, outputPaths, report);
        report.finishBookWarnings();
        if (options.check !== true) {
            report.checks.push(
                { name: 'Ace', status: 'not requested', detail: 'Run with --check to request this check.' },
                { name: 'axe', status: 'not requested', detail: 'Run with --check to request this check.' }
            );
        }
        if (options.check === true) await runOptionalChecks(input, outputPaths, report);
        await writeConversionReport(report, outputPaths);
        await finalizeOutput(outputPaths);
        winston.info(`Wrote ${output}`);
    }
    catch (err) {
        await discardOutputStaging(outputPaths);
        throw err;
    }
}

function rewriteRenamedTargets(
    site: Awaited<ReturnType<typeof buildSiteModel>>,
    transformed: Map<string, { content: TransformedContent }>,
    renamesByPage: Map<string, Map<string, string>>
): Map<string, Document> {
    const documents = new Map<string, Document>();
    for (const [page, result] of transformed) {
        const doc = new JSDOM(`<body>${result.content.bodyHtml}</body>`).window.document;
        documents.set(page, doc);
        doc.querySelectorAll('[href]').forEach(elm => {
            const href = elm.getAttribute('href') ?? '';
            const rewritten = rewriteRenamedFragment(href, page, renamesByPage);
            if (rewritten !== href) elm.setAttribute('href', rewritten);
        });
        result.content.bodyHtml = doc.body.innerHTML;
    }
    const rewriteEntry = (entry: { href: string; children?: Array<any> }) => {
        entry.href = rewriteRenamedFragment(entry.href, '', renamesByPage);
        entry.children?.forEach(rewriteEntry);
    };
    site.toc.forEach(rewriteEntry);
    site.pageList.forEach(entry => { entry.href = rewriteRenamedFragment(entry.href, '', renamesByPage); });
    if (site.coverHref) site.coverHref = rewriteRenamedFragment(site.coverHref, '', renamesByPage);
    return documents;
}

export async function reportBrokenLinks(
    site: Awaited<ReturnType<typeof buildSiteModel>>,
    documents: Map<string, Document>,
    paths: { stagingDir: string },
    report: ConversionReport
): Promise<void> {
    const idsByPage = new Map<string, Set<string>>();
    for (const [page, doc] of documents) {
        idsByPage.set(page, new Set(Array.from(doc.querySelectorAll('[id]'), elm => elm.id)));
    }
    const pages = new Set(site.pages.map(page => page.outputFilename));
    for (const [page, doc] of documents) {
        for (const link of Array.from(doc.querySelectorAll('a[href]'))) {
            const href = link.getAttribute('href') ?? '';
            if (!href || isExternalHref(href)) continue;
            let url: URL;
            try { url = new URL(href, `https://book.invalid/${page}`); } catch { continue; }
            const target = decodeURIComponent(url.pathname.replace(/^\//, '')) || page;
            const fragment = url.hash ? decodeURIComponent(url.hash.slice(1)) : '';
            const pageLink = fragment || /\.x?html?$/i.test(target);
            if (!pageLink) {
                if (!await fs.pathExists(path.join(paths.stagingDir, target))) {
                    report.warning('Broken links', `${href} points to a file that is not in the converted book.`, page);
                }
                continue;
            }
            if (!pages.has(target)) {
                report.warning('Broken links', `${href} points to a page that is not in the converted book.`, page);
                continue;
            }
            if (fragment && !idsByPage.get(target)?.has(fragment)) {
                report.warning('Broken links', `${href} points to missing #${fragment}.`, page);
            }
        }
    }
}

async function crossPageReferencedIds(site: Awaited<ReturnType<typeof buildSiteModel>>): Promise<Map<string, string[]>> {
    const result = new Map<string, Set<string>>();
    for (const sourcePath of new Set(site.pages.map(page => page.sourcePath))) {
        const source = await fileio.readToString(sourcePath);
        for (const match of source.matchAll(/\bhref\s*=\s*["']([^"']*#[^"']+)["']/gi)) {
            const href = match[1];
            if (isExternalHref(href)) continue;
            const hash = href.slice(href.indexOf('#') + 1);
            if (!hash) continue;
            const targetSource = href.startsWith('#')
                ? sourcePath
                : path.resolve(path.dirname(sourcePath), href.slice(0, href.indexOf('#')));
            const output = site.idToOutput.get(`${targetSource}#${hash}`);
            if (!output) continue;
            const ids = result.get(output) ?? new Set<string>();
            ids.add(hash);
            result.set(output, ids);
        }
    }
    return new Map(Array.from(result, ([output, ids]) => [output, Array.from(ids)]));
}

export { convert };
