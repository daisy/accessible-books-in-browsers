import fs from 'fs-extra';
import path from 'path';
import winston from 'winston';
import * as epubParser from './epubParser/index.js';
import * as logger from './logger/index.js';
import { ImageAssetRegistry, copyImageAssets, copyUiAssets } from './assets.js';
import { TemplateRenderer } from './template.js';
import { buildSiteModel } from './model.js';
import { createAudioForPage, getMediaSegments, type MediaSegment } from './audio.js';
import { createOutputStaging, discardOutputStaging, finalizeOutput, outputPath } from './output.js';
import { transformContent } from './content-transform.js';

export type ConvertOptions = {
    headingTitles?: boolean;
    identifier?: string;
    includeNonLinear?: boolean;
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
        const site = buildSiteModel(epub, { identifier: options.identifier, headingTitles: options.headingTitles });
        if (options.headingTitles) {
            winston.info(site.headingTitles
                ? 'Every page is titled with the book title, so pages are titled by their first other heading'
                : 'Pages have their own titles, so --heading-titles has no effect');
        }
        if (options.identifier) {
            winston.info(`Using book ID ${options.identifier} (EPUB identifier: ${site.metadata.identifier || 'none'})`);
        }
        const imageRegistry = new ImageAssetRegistry();
        const renderer = await TemplateRenderer.load(template);
        const coverAsset = site.metadata.coverPath
            ? imageRegistry.register(site.metadata.coverPath)
            : null;

        await copyUiAssets(template, outputPaths);

        // Read ahead, so every page's table of contents can mark the narrated pages
        const mediaSegmentsByPage = new Map<string, MediaSegment[]>();
        for (const page of site.pages) {
            mediaSegmentsByPage.set(page.outputFilename, page.moPath ? await getMediaSegments(page) : []);
        }
        const narratedPages = new Set(site.pages
            .filter(page => (mediaSegmentsByPage.get(page.outputFilename) ?? []).length > 0)
            .map(page => page.outputFilename));

        for (const page of site.pages) {
            winston.info(`Rendering ${page.outputFilename}`);
            const mediaSegments = mediaSegmentsByPage.get(page.outputFilename) ?? [];
            const content = await transformContent(page, site, imageRegistry);
            const audio = await createAudioForPage(page, outputPaths, mediaSegments);
            const html = renderer.renderPage(site, page, content, audio, {
                coverHref: coverAsset?.href ?? '',
                narratedPages
            });
            await fs.writeFile(outputPath(outputPaths, page.outputFilename), html);
        }

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
