import { fileURLToPath } from 'node:url';
import fs from 'fs-extra';
import path from 'path';
import winston from 'winston';
import * as epubParser from './epubParser/index.js';
import * as logger from './logger/index.js';
import { ImageAssetRegistry, copyImageAssets, copyUiAssets, writeServiceWorkerStub } from './assets.js';
import { TemplateRenderer } from './template.js';
import { createBookFavicon } from './favicon.js';
import { shapeBookPage } from './book-shape.js';
import { buildSiteModel } from './model.js';
import { createAudioForPage, getMediaSegments, runWithConcurrency, type MediaSegment } from './audio.js';
import os from 'os';
import { openAudioCache } from './audio-cache.js';
import { readAccessibilityInfo } from './accessibility-info.js';
import { checkOutputPath, createOutputStaging, discardOutputStaging, finalizeOutput, outputPath } from './output.js';
import { transformContent, type TransformedContent } from './content-transform.js';
import { createSearchData, generateSearchIndex } from './create-search-index.js';
import * as utils from './utils.js';
import { generateAudioMap, type PageAudioMapSource } from './audio-map.js';
import * as fileio from './file-io.js';
import { ConversionReport, writeConversionReport, type ConversionReportData } from './conversion-report.js';
import { rewriteRenamedFragment } from './markup-cleanup.js';
import { isExternalHref } from './ids.js';
import { createHash } from 'crypto';
import { JSDOM } from 'jsdom';
import { runOptionalChecks } from './optional-checks.js';
import { audioCleanupSettings, cleanupFilters, type AudioEnhancement, type AudioCleanupSettings } from './audio-cleanup.js';

// Half the cores, up to 4: pages also cut their clips 4 at a time (audio.ts)
const AUDIO_PAGE_CONCURRENCY = Math.max(1, Math.min(4, Math.floor(os.cpus().length / 2)));

export type ConvertOptions = {
    remoteUi?: boolean;
    uiBaseUrl?: string;
    // A folder (or true for the default one in the system's temp folder) to reuse unchanged page
    // audio from; off by default
    audioCache?: string | boolean;
    audioCleanup?: boolean;
    audioEnhance?: AudioEnhancement[];
    headingTitles?: boolean;
    identifier?: string;
    includeNonLinear?: boolean;
    publisherStyles?: boolean;
    language?: string;
    smallAudio?: boolean;
    // Split a content document into a page per chapter at its table of contents entries; on by default
    splitChapters?: boolean;
    check?: boolean;
};

async function convert(input: string, output: string, template: string, options: ConvertOptions = {}): Promise<ConversionReportData> {
    if (options.remoteUi === false && options.uiBaseUrl) throw new Error('--no-remote-ui cannot be combined with --ui-base-url.');
    const channelValue = options.uiBaseUrl || (options.remoteUi !== false ? process.env.WEBBOOK_UI_BASE_URL || 'https://webbook.daisy.org/ui/releases/v0/' : undefined);
    if (options.remoteUi && !channelValue) throw new Error('The beta UI channel is not configured. Supply --ui-base-url or WEBBOOK_UI_BASE_URL.');
    let channel: string | undefined;
    if (channelValue) {
        const url = new URL(channelValue);
        if (!(url.protocol === 'https:' || url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) || url.username || url.password || url.search || url.hash || !url.pathname.endsWith('/')) throw new Error('The UI channel must be an HTTPS directory URL (localhost HTTP is allowed for testing).');
        channel = url.href;
    }
    const converterVersion = (await fs.readJson(fileURLToPath(new URL('../package.json', import.meta.url)))).version;
    await checkOutputPath(output, { input, template });
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
            ...(options.publisherStyles === false ? { '--no-publisher-styles': true } : { 'publisher styles': true }),
            'heading titles': options.headingTitles !== false,
            'split chapters': options.splitChapters !== false,
            'small audio': options.smallAudio === true,
            'audio cleanup': options.audioCleanup !== false,
            'audio enhancements': options.audioEnhance?.join(',') || false,
            'optional checks': options.check === true,
            'reader updates': channel || 'bundled (fixed copy)'
        });
        await imageRegistry.configureFonts(epub.basedir, epub.packageFilename, report);
        report.provenance = { source: path.basename(input), identifier: site.metadata.identifier || '', converter: converterVersion };
        if (channel) {
            report.betaWarning = `READER UPDATES: this book will receive reader updates from the beta channel at ${channel}. To choose a fixed bundled copy, use --no-remote-ui. The address and releases may change; a new contract requires reconverting from the source EPUB. Keep the EPUB.`;
            winston.warn(report.betaWarning);
        } else winston.info('READER UPDATES: fixed bundled reader selected with --no-remote-ui. This book will not receive channel updates.');
        const audioCache = openAudioCache(options.audioCache, site.bookId);
        const cleanup = audioCleanupSettings(options.audioCleanup !== false, options.audioEnhance ?? []);
        const accessibility = await readAccessibilityInfo(epub.packageFilename);
        const metadataXml = new JSDOM(await fileio.readToString(epub.packageFilename), { contentType: 'application/xml' }).window.document.querySelector('metadata')?.outerHTML;
        const searchData = createSearchData(site);
        const referencedIdsByPage = await crossPageReferencedIds(site);
        const coverAsset = site.metadata.coverPath
            ? imageRegistry.register(site.metadata.coverPath)
            : null;

        await copyUiAssets(template, outputPaths);
        const bootstrap = await fs.readFile(path.join(outputPaths.stagingDir, 'src/js/bootstrap.js'), 'utf8');
        await writeServiceWorkerStub(outputPaths);
        const favicon = await createBookFavicon(site.metadata.coverPath, outputPaths);

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
                referencedIdsByPage.get(page.outputFilename) ?? [], false, {
                    publisherStyles: options.publisherStyles !== false,
                    cleanup: true,
                    report,
                    reservedIds: renderer.reservedContentIds(),
                    responsiveTables: true
                });
            transformed.set(page.outputFilename, { content, audio: null });
            renamesByPage.set(page.outputFilename, content.renamedIds);
        }

        // Narration, a few pages at a time: each page's ffmpeg work (above all the loudness pass and
        // the encode) runs on one core. One at a time in the browser converter, whose ffmpeg.wasm
        // runs one job at a time anyway (its os.cpus() is a single entry).
        await runWithConcurrency(site.pages, AUDIO_PAGE_CONCURRENCY, async page => {
            const result = transformed.get(page.outputFilename)!;
            result.audio = await createAudioForPage(
                page, outputPaths, mediaSegmentsByPage.get(page.outputFilename) ?? [], audioCache,
                result.content.narrationSelectors, options.smallAudio === true, cleanup
            );
        });
        for (const page of site.pages) {
            const result = transformed.get(page.outputFilename)!;
            pageAudioSources.set(page.outputFilename, { audio: result.audio, bodyHtml: result.content.bodyHtml });
        }

        const contentDocuments = rewriteRenamedTargets(site, transformed, renamesByPage);

        const hasPublished = Array.from(transformed.values()).some(result => Boolean(result.content.publisherCss));
        const writtenDesigns = new Map<string, string>();
        for (const page of site.pages) {
            const result = transformed.get(page.outputFilename)!;
            let publisherHref = '';
            if (result.content.publisherCss) {
                const digest = createHash('sha256').update(result.content.publisherCss).digest('hex').slice(0, 20);
                publisherHref = `styles/publisher-${digest}.css`;
                if (!writtenDesigns.has(digest)) {
                    await fs.ensureDir(path.join(outputPaths.stagingDir, 'styles'));
                    await fs.writeFile(outputPath(outputPaths, publisherHref), result.content.publisherCss);
                    writtenDesigns.set(digest, publisherHref);
                }
            }
            pageAudioSources.set(page.outputFilename, { audio: result.audio, bodyHtml: result.content.bodyHtml });
            const html = renderer.renderPage(site, page, result.content, result.audio, {
                coverHref: coverAsset?.href ?? '',
                favicon,
                narratedPages,
                accessibility,
                publisherHref,
                hasPublished
            });
            const shaped = shapeBookPage(html, { channel, source: path.basename(input), identifier: site.metadata.identifier || '', converter: converterVersion, bootstrap, page: page.outputFilename, metadataXml, navigation: page.index === 0 });
            await fs.writeFile(outputPath(outputPaths, page.outputFilename), shaped.html);
            if (page.index === 0) for (const [filename, content] of Object.entries(shaped.navigation)) await fs.writeFile(outputPath(outputPaths, filename), content);
        }

        await generateAudioMap(site, pageAudioSources, outputPaths);
        await generateSearchIndex(searchData, outputPaths);
        await copyImageAssets(imageRegistry, outputPaths);
        await addAudioReport(report, mediaSegmentsByPage, transformed, outputPaths, options.smallAudio === true, cleanup);
        await reportBrokenLinks(site, contentDocuments, outputPaths, report);
        report.finishBookWarnings();
        if (options.check !== true) {
            report.checks.push(
                { name: 'Ace', status: 'not requested', detail: 'Run with --check to request this check.' },
                { name: 'axe', status: 'not requested', detail: 'Run with --check to request this check.' }
            );
        }
        if (options.check === true) await runOptionalChecks(input, outputPaths, report);
        const reportData = await writeConversionReport(report, outputPaths);
        await finalizeOutput(outputPaths);
        winston.info(`Wrote ${output}`);
        return reportData;
    }
    catch (err) {
        await discardOutputStaging(outputPaths);
        throw err;
    }
}

async function addAudioReport(
    report: ConversionReport,
    segmentsByPage: Map<string, MediaSegment[]>,
    transformed: Map<string, { audio: Awaited<ReturnType<typeof createAudioForPage>> }>,
    paths: { stagingDir: string },
    smallAudio: boolean,
    cleanup: AudioCleanupSettings
): Promise<void> {
    const sources = new Set<string>();
    for (const segments of segmentsByPage.values()) {
        for (const segment of segments) sources.add(utils.getWithoutFrag(segment.src));
    }
    const sourceBytes = (await Promise.all(Array.from(sources, source => fs.stat(source).then(stat => stat.size))))
        .reduce((sum, size) => sum + size, 0);
    const audioEntries = Array.from(transformed, ([page, result]) => ({ page, asset: result.audio }))
        .filter((entry): entry is { page: string; asset: NonNullable<typeof entry.asset> } => entry.asset !== null);
    const audio = audioEntries.map(entry => entry.asset);
    const outputBytes = (await Promise.all(audio.map(asset =>
        fs.stat(path.join(paths.stagingDir, asset.audioHref)).then(stat => stat.size))))
        .reduce((sum, size) => sum + size, 0);
    const settings = Array.from(new Set(audio.map(asset => {
        const value = asset.encoding;
        return `${value.extension.replace(/^\./, '').toUpperCase()}, ${value.channels === 1 ? 'mono' : `${value.channels} channels`}, ${value.sampleRate} Hz, ${value.bitrateKbps} kb/s${value.codec ? ` (${value.codec})` : ''}`;
    })));
    const loudness = audio.map(asset => asset.findings.loudnessLufs).filter((value): value is number => value !== null);
    const loudnessRange = loudness.length ? Math.max(...loudness) - Math.min(...loudness) : null;
    const ordered = [...loudness].sort((a, b) => a - b);
    const median = ordered.length ? ordered[Math.floor(ordered.length / 2)] : null;
    const findings = audioEntries.map(({ page, asset }) => ({ page, ...asset.findings }));
    for (const finding of findings) {
        if (finding.clippingSamples > 0) {
            report.warning('Audio clipping', `${finding.clippingSamples} samples are at or near full scale. Cleanup cannot restore clipped detail.`, finding.page);
        }
        if (finding.noiseFloorDb !== null && finding.noiseFloorDb > -35) {
            report.warning('Audio noise floor', `Quietest measured stretch is ${finding.noiseFloorDb.toFixed(1)} dBFS; consider --audio-enhance noise.`, finding.page);
        }
        if (median !== null && finding.loudnessLufs !== null && Math.abs(finding.loudnessLufs - median) > 6) {
            report.warning('Audio level', `Measured ${finding.loudnessLufs.toFixed(1)} LUFS, far from the book median of ${median.toFixed(1)} LUFS.`, finding.page);
        }
    }
    report.setAudio({
        mode: smallAudio ? 'small audio (mp3)' : 'source-matched, single encode', sourceBytes, outputBytes, settings,
        maximumEncoderDriftSeconds: Math.max(0, ...audio.map(asset => Math.abs(asset.encoderDrift))),
        cleanup: {
            enabled: cleanup.enabled,
            targetLufs: cleanup.loudnessLufs,
            truePeakDb: cleanup.truePeakDb,
            filters: cleanup.enabled ? ['5 ms fades at joins', ...cleanupFilters(cleanup), 'raised to the loudness target if quieter (never lowered)', 'peak limiter'] : [],
            loudnessRangeBeforeLu: loudnessRange,
            pages: findings
        }
    });
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
            // The navigation pages the converter writes (a link to the book's own contents goes to toc.html)
            if (!fragment && ['toc.html', 'pages.html', 'about.html'].includes(target) && await fs.pathExists(path.join(paths.stagingDir, target))) continue;
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
                : utils.resolveHrefPath(path.dirname(sourcePath), href.slice(0, href.indexOf('#')));
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
