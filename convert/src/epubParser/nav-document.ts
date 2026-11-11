import fs from 'fs-extra';
import path from 'path';
import xpath from 'xpath';
import * as fileio from '../file-io.js';
import * as utils from '../utils.js';
import type { EpubNavMap } from './types.js';

const select = xpath.useNamespaces({
    html: 'http://www.w3.org/1999/xhtml'
});

export type NavDocumentParseOptions = {
    warn?: (message: string) => void;
};

async function parse(inputFilename: string, options: NavDocumentParseOptions = {}): Promise<EpubNavMap> {
    const navs: EpubNavMap = {};
    if (!inputFilename) return navs;

    const doc = await fileio.parse(inputFilename, true);
    const navElms = select('//html:nav', doc) as Element[];

    navElms.forEach(nav => {
        const epubType = nav.getAttribute('epub:type');
        const ol = nav.getElementsByTagName('ol')[0];
        if (!epubType || !ol) return;

        navs[epubType] = ol;
        const hrefs = select('.//html:a/@href', ol);
        hrefs.forEach(href => {
            const attr = href as Attr;
            if (!attr.nodeValue || !attr.ownerElement) return;
            attr.ownerElement.setAttribute(
                'href',
                resolveNavHref(inputFilename, attr.nodeValue, options.warn)
            );
        });
    });

    return navs;
}

function resolveNavHref(navFilename: string, href: string, warn?: (message: string) => void): string {
    const withoutFrag = utils.getWithoutFrag(href);
    // A fragment-only URL names an element in the navigation document itself. It
    // isn't an external URL or a reference to some other spine file.
    if (!withoutFrag && href.startsWith('#')) return `${path.resolve(navFilename)}${href}`;
    if (!isLocalFileHref(withoutFrag)) {
        warn?.(`Nav document href is not a local file reference in ${navFilename}; leaving unchanged: ${href}`);
        return href;
    }

    const frag = utils.getFrag(href);
    const resolved = path.resolve(path.dirname(navFilename), withoutFrag);
    if (!isFile(resolved)) {
        warn?.(`Nav document href does not resolve to a local file in ${navFilename}: ${href}`);
    }

    return frag ? `${resolved}#${frag}` : resolved;
}

function isLocalFileHref(href: string): boolean {
    return Boolean(href)
        && !path.isAbsolute(href)
        && !/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(href);
}

function isFile(filename: string): boolean {
    try {
        return fs.statSync(filename).isFile();
    }
    catch {
        return false;
    }
}

export { parse };
