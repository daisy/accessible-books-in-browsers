import fs from 'fs-extra';
import path from 'path';
import tmp from 'tmp';
import winston from 'winston';
import xpath from 'xpath';
import * as fileio from '../file-io.js';
import * as navDocument from './nav-document.js';
import * as packageDocument from './package-document.js';
import type { Epub, EpubParseOptions } from './types.js';
import { unzip } from './unzip-epub.js';

const selectContainer = xpath.useNamespaces({
    ocf: 'urn:oasis:names:tc:opendocument:xmlns:container'
});

async function parse(inputFilename: string, options: EpubParseOptions = {}): Promise<Epub> {
    const basedir = await setupBasedir(inputFilename);
    winston.info(`Reading files from ${basedir}`);

    const opfFilename = await calculatePackageDocPath(basedir);
    const packageObj = await packageDocument.parse(opfFilename, {
        includeNonLinear: options.includeNonLinear
    });
    const nav = await navDocument.parse(packageObj.navFilename, {
        warn: options.warn
    });

    const spine = await Promise.all(packageObj.spine.map(async item => ({
        ...item,
        ...await readDocumentTitles(item.path)
    })));

    return {
        spine,
        metadata: packageObj.metadata,
        navFilename: packageObj.navFilename,
        packageFilename: opfFilename,
        basedir,
        nav,
        coverDocumentHref: packageObj.coverDocumentHref,
        ...(packageObj.pageProgression ? { pageProgression: packageObj.pageProgression } : {})
    };
}

async function setupBasedir(inputFilename: string): Promise<string> {
    tmp.setGracefulCleanup();
    if (fs.statSync(inputFilename).isDirectory()) {
        winston.verbose('EPUB is already unpacked');
        return inputFilename;
    }

    winston.verbose('Extracting EPUB');
    return unzip(inputFilename);
}

async function readDocumentTitles(filename: string): Promise<{ title: string, headings: string[] }> {
    const doc = await fileio.parse(filename, true);
    const title = doc.getElementsByTagName('title')[0];
    const headings = Array.from(doc.getElementsByTagName('*') as ArrayLike<Element>)
        .filter(elm => /^h[1-6]$/.test(elm.localName ?? ''))
        .map(collapsedText)
        .filter(Boolean);
    return { title: title ? collapsedText(title) : '', headings };
}

function collapsedText(node: Node): string {
    return (node.textContent ?? '').replace(/\s+/g, ' ').trim();
}

async function calculatePackageDocPath(epubDir: string): Promise<string> {
    const containerFilePath = path.join(epubDir, 'META-INF', 'container.xml');
    const doc = await fileio.parse(containerFilePath);
    const rootfiles = selectContainer(
        '//ocf:rootfile[@media-type="application/oebps-package+xml"]/@full-path',
        doc
    );
    const rootfile = rootfiles[0] as Attr | undefined;
    if (!rootfile?.nodeValue) {
        throw new Error(`Could not find EPUB package document in ${containerFilePath}`);
    }
    return path.join(epubDir, rootfile.nodeValue);
}

export { parse };
export type { Epub };
