import fs from 'fs-extra';
import { createHash } from 'crypto';
import path from 'path';
import { JSDOM } from 'jsdom';
import { deobfuscateFont, readFontEncryption, type FontEncryption } from './font-obfuscation.js';
import type { ConversionReport } from './conversion-report.js';
import { OutputLayout } from './output.js';
import type { OutputPaths } from './output.js';
import * as utils from './utils.js';

const UI_ASSET_DIRS = ['src'] as const;

export type ImageAsset = {
    href: string;
    outputFilename: string;
    sourcePath: string;
};

class ImageAssetRegistry {
    private encryption = new Map<string, FontEncryption>();
    private publisherUses = new Map<string, Map<string, 'fonts' | 'images'>>();
    private report?: ConversionReport;
    async configureFonts(root: string, packageFilename: string, report: ConversionReport): Promise<void> {
        this.report = report;
        this.encryption = await readFontEncryption(root, packageFilename);
    }
    registerPublisherAsset(source: string, page: string, font = false): ImageAsset | null {
        const normalized = path.resolve(source), policy = this.encryption.get(normalized);
        if (policy && !policy.key) { this.report?.warning('Publisher styles font not copied', `${path.basename(source)}: ${policy.reason}`, page); return null; }
        const uses = this.publisherUses.get(page) ?? new Map<string, 'fonts' | 'images'>();
        uses.set(normalized, font || /\.(?:ttf|otf|woff2?|eot)$/i.test(source) ? 'fonts' : 'images');
        this.publisherUses.set(page, uses);
        return this.register(source);
    }
    async copyAsset(asset: ImageAsset, destination: string): Promise<void> {
        const policy = this.encryption.get(asset.sourcePath);
        if (policy && !policy.key) return;
        if (policy?.key) await fs.writeFile(destination, deobfuscateFont(await fs.readFile(asset.sourcePath), policy.key, policy.algorithm));
        else await fs.copy(asset.sourcePath, destination);
    }
    async reportPublisherAssets(): Promise<void> {
        const total = new Map<string, 'fonts' | 'images'>();
        for (const [page, uses] of this.publisherUses) {
            const counts = { fonts: { count: 0, bytes: 0 }, images: { count: 0, bytes: 0 } };
            for (const [source, kind] of uses) {
                try { counts[kind].bytes += (await fs.stat(source)).size; counts[kind].count++; total.set(source, kind); } catch { /* copy reports missing resource */ }
            }
            this.report?.publisherAssets(page, counts);
        }
        const counts = { fonts: { count: 0, bytes: 0 }, images: { count: 0, bytes: 0 } };
        for (const [source, kind] of total) { counts[kind].count++; counts[kind].bytes += (await fs.stat(source)).size; }
        this.report?.publisherAssetsTotal(counts);
    }
    private assetsBySource = new Map<string, ImageAsset>();
    private usedFilenames = new Set<string>();

    register(sourcePath: string): ImageAsset {
        const normalizedSourcePath = path.resolve(sourcePath);
        const existing = this.assetsBySource.get(normalizedSourcePath);
        if (existing) return existing;

        const outputFilename = this.uniqueImageFilename(path.basename(normalizedSourcePath));
        const asset = {
            href: utils.toPosixPath(path.join(OutputLayout.imagesDir, outputFilename)),
            outputFilename,
            sourcePath: normalizedSourcePath
        };

        this.assetsBySource.set(normalizedSourcePath, asset);
        this.usedFilenames.add(outputFilename);
        return asset;
    }

    all(): ImageAsset[] {
        return Array.from(this.assetsBySource.values());
    }

    private uniqueImageFilename(filename: string): string {
        if (!this.usedFilenames.has(filename)) return filename;

        const ext = path.extname(filename);
        const stem = path.basename(filename, ext);
        let index = 2;
        let candidate = `${stem}-${index}${ext}`;
        while (this.usedFilenames.has(candidate)) {
            index += 1;
            candidate = `${stem}-${index}${ext}`;
        }
        return candidate;
    }
}

async function copyUiAssets(template: string, outputPaths: OutputPaths): Promise<void> {
    await Promise.all(UI_ASSET_DIRS.map(async dirname => {
        const source = path.join(template, dirname);
        if (await fs.pathExists(source)) {
            await fs.copy(source, path.join(outputPaths.stagingDir, dirname));
        }
    }));
    await useReaderBundle(template, outputPaths);
    const templatePage = path.join(template, 'index.html');
    if (await fs.pathExists(templatePage)) {
        const doc = new JSDOM(await fs.readFile(templatePage, 'utf8')).window.document;
        doc.querySelectorAll('main, #webbook-basic-nav, #webbook-skip-link, script, #webbook-resume-banner, #webbook-escape-status, audio').forEach(node => node.remove());
        doc.querySelector('#webbook-toc-nav ol')?.replaceChildren();
        doc.querySelector('#pages')?.replaceChildren();
        doc.querySelectorAll('#webbook-info .webbook-info-body > :not(h2):not(#webbook-progress)').forEach(node => node.remove());
        doc.querySelector('#webbook-cover')?.removeAttribute('src');
        await fs.writeFile(path.join(outputPaths.stagingDir, 'src/reader-shell.html'), doc.body.innerHTML);
    }
    await combineStylesheets(path.join(outputPaths.stagingDir, 'src', 'css'), 'style.css');
    const files: { href: string; bytes: number; sha256: string }[] = [];
    const walk = async (directory: string): Promise<void> => {
        for (const name of (await fs.readdir(directory)).sort()) {
            const filename = path.join(directory, name);
            if ((await fs.stat(filename)).isDirectory()) await walk(filename);
            else if (name !== 'ui-files.json') {
                const bytes = await fs.readFile(filename);
                files.push({ href: utils.toPosixPath(path.relative(outputPaths.stagingDir, filename)), bytes: bytes.length,
                    sha256: createHash('sha256').update(bytes).digest('hex') });
            }
        }
    };
    await walk(path.join(outputPaths.stagingDir, 'src'));
    files.sort((a, b) => a.href < b.href ? -1 : a.href > b.href ? 1 : 0);
    const revision = createHash('sha256').update(JSON.stringify(files)).digest('hex');
    await fs.writeJson(path.join(outputPaths.stagingDir, 'src', 'ui-files.json'), { version: 1, contract: 0, revision, files }, { spaces: 2 });
}

// The reader is about 70 modules. A browser only finds each one after loading the one that
// imports it, so on a slow connection the reader took many round trips to arrive. When the
// template has been bundled (scripts/build-reader.mjs, part of `npm run compile`), a book gets the
// bundle, a few files, in place of the modules it contains. Files the bundle doesn't contain stay:
// the offline workers, which load with importScripts, and the bootstrap's own copy.
async function useReaderBundle(template: string, outputPaths: OutputPaths): Promise<void> {
    const listing = path.join(template, 'build', 'bundled.json');
    if (!await fs.pathExists(listing)) return;
    const js = path.join(outputPaths.stagingDir, 'src', 'js');
    const bundled: string[] = await fs.readJson(listing);
    await Promise.all(bundled.map(file => fs.remove(path.join(js, file))));
    for (const directory of new Set(bundled.map(file => path.dirname(file)).filter(dir => dir !== '.'))) {
        const remaining = path.join(js, directory);
        // A folder keeps any notices (vendor/ keeps its license README)
        if (await fs.pathExists(remaining) && !(await fs.readdir(remaining)).length) await fs.remove(remaining);
    }
    await fs.copy(path.join(template, 'build', 'js'), js);
}

// The template keeps its CSS in one file per component, joined by @import in style.css. A browser
// only finds each imported file after loading the one before, so a book would show unstyled for a
// moment on every full page load. In the book, style.css holds them all, in the same order (not
// minified), and the separate files are left out.
async function combineStylesheets(cssDir: string, entry: string): Promise<void> {
    const entryPath = path.join(cssDir, entry);
    if (!await fs.pathExists(entryPath)) return;
    const inlined = new Set<string>();
    const inline = async(file: string): Promise<string> => {
        const css = await fs.readFile(file, 'utf8');
        const parts: string[] = [];
        let rest = css;
        const importRule = /@import\s+(?:url\()?["']([^"')]+)["']\)?\s*;/;
        for (let match = importRule.exec(rest); match; match = importRule.exec(rest)) {
            parts.push(rest.slice(0, match.index));
            const imported = path.resolve(path.dirname(file), match[1]);
            if (!inlined.has(imported) && await fs.pathExists(imported)) {
                inlined.add(imported);
                parts.push(`/* ${path.basename(imported)} */\n${(await inline(imported)).trim()}\n`);
            }
            rest = rest.slice(match.index + match[0].length);
        }
        parts.push(rest);
        return parts.join('');
    };
    const combined = await inline(entryPath);
    await fs.writeFile(entryPath, combined.replace(/\n{3,}/g, '\n\n'));
    await Promise.all(Array.from(inlined, file => fs.remove(file)));
}

// A service worker only controls pages in its own folder and below, and must come from the book's
// own site, so offline reading needs this file at the book's root; a CDN or a later UI upgrade
// can't add it. It's the same for every book and does nothing by itself: the behavior lives with
// the reader's files, which can be upgraded. The reader registers it when offline features are used.
const SERVICE_WORKER_STUB = `// Offline reading. The behavior lives with the reader's files, so it can be upgraded with them.
importScripts('src/js/offline-worker.js');
`;

async function writeServiceWorkerStub(outputPaths: OutputPaths): Promise<void> {
    await fs.writeFile(path.join(outputPaths.stagingDir, OutputLayout.serviceWorkerFilename), SERVICE_WORKER_STUB);
}

async function copyImageAssets(registry: ImageAssetRegistry, outputPaths: OutputPaths): Promise<void> {
    await Promise.all(registry.all().map(async asset => {
        await registry.copyAsset(asset, path.join(outputPaths.imagesDir, asset.outputFilename));
    }));
    await registry.reportPublisherAssets();
}

export {
    copyImageAssets,
    copyUiAssets,
    ImageAssetRegistry,
    UI_ASSET_DIRS,
    writeServiceWorkerStub
};
