import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import { transformContent } from '../build/content-transform.js';
import { ImageAssetRegistry, copyImageAssets } from '../build/assets.js';
import { ConversionReport } from '../build/conversion-report.js';

test('conversion copies and rewrites MathML fallback images, deduplicating shared image assets', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'webbook-copy-math-'));
    try {
        await fs.mkdir(path.join(dir, 'text'));
        await fs.mkdir(path.join(dir, 'graphic'));
        await fs.writeFile(path.join(dir, 'graphic', 'equation.png'), 'fixture image');
        const sourcePath = path.join(dir, 'text', 'chapter.xhtml');
        await fs.writeFile(sourcePath, '<body><math alttext="" altimg="../graphic/equation.png"><mi>x</mi></math><img src="../graphic/equation.png" alt="Equation"><math alttext="x squared" altimg="https://example.test/formula.png"><mi>x</mi></math></body>');
        const page = { index: 0, outputFilename: 'chapter.html', sourcePath };
        const site = { metadata: { language: 'en' }, toc: [], pageList: [], idToOutput: new Map() };
        const registry = new ImageAssetRegistry();
        const report = new ConversionReport({ declared: 'en', effective: 'en' }, {});
        const result = await transformContent(page, site, registry, undefined, [], [], false, {
            cleanup: true, report, reservedIds: new Set(), responsiveTables: false
        });
        const doc = new JSDOM(result.bodyHtml).window.document;
        const math = doc.querySelector('math');
        assert.equal(math.getAttribute('altimg'), doc.querySelector('img').getAttribute('src'));
        // An empty alttext stays as the book has it
        assert.equal(math.getAttribute('alttext'), '');
        assert.equal(doc.querySelectorAll('math')[1].getAttribute('alttext'), 'x squared');
        assert.equal(doc.querySelectorAll('math')[1].getAttribute('altimg'), 'https://example.test/formula.png');
        assert.equal(registry.all().length, 1);
        const imagesDir = path.join(dir, 'out-images');
        await fs.mkdir(imagesDir);
        await copyImageAssets(registry, { imagesDir });
        assert.equal(await fs.readFile(path.join(imagesDir, registry.all()[0].outputFilename), 'utf8'), 'fixture image');
    } finally { await fs.rm(dir, { recursive: true, force: true }); }
});
