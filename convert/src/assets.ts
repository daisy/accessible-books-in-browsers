import fs from 'fs-extra';
import path from 'path';
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
    await combineStylesheets(path.join(outputPaths.stagingDir, 'src', 'css'), 'style.css');
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
// the reader's files, which can be upgraded. Nothing registers it yet.
const SERVICE_WORKER_STUB = `// Offline reading. The behavior lives with the reader's files, so it can be upgraded with them.
importScripts('src/js/offline-worker.js');
`;

async function writeServiceWorkerStub(outputPaths: OutputPaths): Promise<void> {
    await fs.writeFile(path.join(outputPaths.stagingDir, OutputLayout.serviceWorkerFilename), SERVICE_WORKER_STUB);
}

async function copyImageAssets(registry: ImageAssetRegistry, outputPaths: OutputPaths): Promise<void> {
    await Promise.all(registry.all().map(async asset => {
        await fs.copy(asset.sourcePath, path.join(outputPaths.imagesDir, asset.outputFilename));
    }));
}

export {
    copyImageAssets,
    copyUiAssets,
    ImageAssetRegistry,
    UI_ASSET_DIRS,
    writeServiceWorkerStub
};
