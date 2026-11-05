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
import { transformContent } from './content-transform.js';
import { createSearchData, generateSearchIndex } from './create-search-index.js';
import * as utils from './utils.js';
import { generateAudioMap, type PageAudioMapSource } from './audio-map.js';

export type ConvertOptions = {
    // A folder (or true for the default one in the system's temp folder) to reuse unchanged page
    // audio from; off by default
    audioCache?: string | boolean;
    headingTitles?: boolean;
    identifier?: string;
    includeNonLinear?: boolean;
    splitChapters?: boolean;
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
        const audioCache = openAudioCache(options.audioCache, site.bookId);
        const accessibility = await readAccessibilityInfo(epub.packageFilename);
        const searchData = createSearchData(site);
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

        for (const page of site.pages) {
            winston.info(`Rendering ${page.outputFilename}`);
            const mediaSegments = mediaSegmentsByPage.get(page.outputFilename) ?? [];
            const narratedTargetIds = mediaSegments.map(segment => utils.getFrag(segment.textSrc)).filter(Boolean);
            const content = await transformContent(page, site, imageRegistry, searchData, narratedTargetIds);
            const audio = await createAudioForPage(page, outputPaths, mediaSegments, audioCache);
            pageAudioSources.set(page.outputFilename, { audio, bodyHtml: content.bodyHtml });
            const html = renderer.renderPage(site, page, content, audio, {
                coverHref: coverAsset?.href ?? '',
                narratedPages,
                accessibility
            });
            await fs.writeFile(outputPath(outputPaths, page.outputFilename), html);
        }

        await generateAudioMap(site, pageAudioSources, outputPaths);
        await generateSearchIndex(searchData, outputPaths);
        await copyImageAssets(imageRegistry, outputPaths);
        await finalizeOutput(outputPaths);
        winston.info(`Wrote ${output}`);
    }
    catch (err) {
        await discardOutputStaging(outputPaths);
        throw err;
    }
}

export { convert };
