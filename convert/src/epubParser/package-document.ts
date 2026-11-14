import path from 'path';
import xpath from 'xpath';
import * as fileio from '../file-io.js';
import * as utils from '../utils.js';
import type { Metadata, SpineItem } from './types.js';

const select = xpath.useNamespaces({
    opf: 'http://www.idpf.org/2007/opf'
});

export type PackageDocument = {
    coverDocumentHref?: string;
    metadata: Metadata;
    navFilename: string;
    // The spine's page-progression-direction, when it says rtl or ltr
    pageProgression?: 'ltr' | 'rtl';
    spine: SpineItem[];
};

export type PackageDocumentParseOptions = {
    includeNonLinear?: boolean;
};

async function parse(inputFilename: string, options: PackageDocumentParseOptions = {}): Promise<PackageDocument> {
    const doc = await fileio.parse(inputFilename);
    const metadata = parseMetadata(doc, inputFilename);
    return {
        coverDocumentHref: parseGuideCoverHref(inputFilename, doc),
        metadata,
        spine: parseSpine(inputFilename, doc, options),
        ...pageProgression(doc),
        navFilename: getManifestItemHrefByProperty('nav', doc, inputFilename)
    };
}

function parseGuideCoverHref(opfFilename: string, doc: Document): string | undefined {
    const reference = (select('//opf:guide/opf:reference', doc) as Element[]).find(element =>
        (element.getAttribute('type') ?? '').toLowerCase().split(/\s+/).includes('cover'));
    const href = reference?.getAttribute('href');
    if (!href) return undefined;
    const [filename, fragment] = href.split('#', 2);
    const resolved = path.resolve(path.dirname(opfFilename), filename);
    return fragment ? `${resolved}#${fragment}` : resolved;
}

function parseMetadata(doc: Document, opfFilename: string): Metadata {
    const parsedMetadata: Metadata = {};
    const metadataSection = select('//opf:metadata', doc)[0] as Element | undefined;
    if (!metadataSection) return parsedMetadata;

    Array.from(metadataSection.childNodes ?? [])
        .filter((child): child is Element => child.nodeType === 1)
        .forEach(child => {
            if (child.nodeName === 'opf:meta' || child.nodeName === 'meta') {
                if (child.hasAttribute('property')) {
                    utils.addItem(child.getAttribute('property') ?? '', child.textContent ?? '', parsedMetadata);
                }
                else if (child.getAttribute('name') === 'cover') {
                    const coverElm = select(`//*[@id='${child.getAttribute('content')}']`, doc)[0] as Element | undefined;
                    if (coverElm) {
                        utils.addItem('cover', coverElm.getAttribute('href') ?? '', parsedMetadata);
                    }
                }
            }
            else {
                utils.addItem(child.nodeName, child.textContent ?? '', parsedMetadata);
            }
        });

    const coverImage = getManifestItemByProperty('cover-image', doc);
    if (coverImage) {
        utils.addItem('cover', coverImage.getAttribute('href') ?? '', parsedMetadata);
    }

    const cover = firstMetadataValue(parsedMetadata.cover);
    if (cover) {
        parsedMetadata.cover = path.resolve(path.dirname(opfFilename), cover);
    }

    return parsedMetadata;
}

function pageProgression(doc: Document): { pageProgression?: 'ltr' | 'rtl' } {
    const spine = (select('//opf:spine', doc) as Element[])[0];
    const value = (spine?.getAttribute('page-progression-direction') ?? '').trim().toLowerCase();
    return value === 'rtl' || value === 'ltr' ? { pageProgression: value } : {};
}

function parseSpine(opfFilename: string, doc: Document, options: PackageDocumentParseOptions): SpineItem[] {
    const spineItems: SpineItem[] = [];
    const spineItemrefs = select('//opf:spine/opf:itemref', doc) as Element[];
    const manifestItems = buildManifestItemMap(doc);

    spineItemrefs.forEach(itemref => {
        if (!options.includeNonLinear && (itemref.getAttribute('linear') ?? '').toLowerCase() === 'no') return;

        const idrefValue = itemref.getAttribute('idref');
        if (!idrefValue) return;

        const manifestItem = manifestItems.get(idrefValue);
        if (!manifestItem) return;

        const filename = manifestItem.getAttribute('href');
        if (!filename) return;

        const properties = manifestItem.getAttribute('properties') ?? '';
        if (properties.split(/\s+/).includes('nav')) return;

        let smilfilename = '';
        const mediaOverlayId = manifestItem.getAttribute('media-overlay');
        if (mediaOverlayId) {
            const smilItem = manifestItems.get(mediaOverlayId);
            const smilHref = smilItem?.getAttribute('href');
            if (smilHref) {
                smilfilename = path.resolve(path.dirname(opfFilename), smilHref);
            }
        }

        spineItems.push({
            path: path.resolve(path.dirname(opfFilename), filename),
            moPath: smilfilename
        });
    });

    return spineItems;
}

function getManifestItemHrefByProperty(property: string, doc: Document, opfFilename: string): string {
    const item = getManifestItemByProperty(property, doc);
    const href = item?.getAttribute('href');
    return href ? path.resolve(path.dirname(opfFilename), href) : '';
}

function getManifestItemByProperty(property: string, doc: Document): Element | undefined {
    const items = select('//opf:manifest/opf:item', doc) as Element[];
    return items.find(item => {
        const properties = item.getAttribute('properties') ?? '';
        return properties.split(/\s+/).includes(property);
    });
}

function buildManifestItemMap(doc: Document): Map<string, Element> {
    const manifestItems = new Map<string, Element>();
    (select('//opf:manifest/opf:item', doc) as Element[]).forEach(item => {
        const id = item.getAttribute('id');
        if (id) manifestItems.set(id, item);
    });
    return manifestItems;
}

function firstMetadataValue(value: string | string[] | undefined): string {
    if (Array.isArray(value)) return value[0] ?? '';
    return value ?? '';
}

export { parse, parseGuideCoverHref };
