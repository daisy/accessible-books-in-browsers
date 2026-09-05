import fs from 'fs-extra';
import path from 'path';
import { OutputLayout } from './output.js';
import type { OutputPaths } from './output.js';
import * as utils from './utils.js';

const UI_ASSET_ALLOWLIST = ['script.js', 'style.css', 'reset.css'] as const;

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
    await Promise.all(UI_ASSET_ALLOWLIST.map(async filename => {
        const source = path.join(template, filename);
        if (await fs.pathExists(source)) {
            await fs.copy(source, path.join(outputPaths.stagingDir, filename));
        }
    }));
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
    UI_ASSET_ALLOWLIST
};
