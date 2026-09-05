import fs from 'fs-extra';
import path from 'path';
import winston from 'winston';
import * as epubParser from './epubParser/index.js';
import * as logger from './logger/index.js';
import { ImageAssetRegistry, copyImageAssets, copyUiAssets } from './assets.js';
import { TemplateRenderer } from './template.js';
import { buildSiteModel } from './model.js';
import { createAudioForPage } from './audio.js';
import { createOutputStaging, discardOutputStaging, finalizeOutput, outputPath } from './output.js';
import { transformContent } from './content-transform.js';

export type ConvertOptions = {
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
        const site = buildSiteModel(epub);
        const imageRegistry = new ImageAssetRegistry();
        const renderer = await TemplateRenderer.load(template);
        const coverAsset = site.metadata.coverPath
            ? imageRegistry.register(site.metadata.coverPath)
            : null;

        await copyUiAssets(template, outputPaths);

        for (const page of site.pages) {
            winston.info(`Rendering ${page.outputFilename}`);
            const content = await transformContent(page, site, imageRegistry);
            const audio = await createAudioForPage(page, outputPaths);
            const html = renderer.renderPage(site, page, content, audio, {
                coverHref: coverAsset?.href ?? ''
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
