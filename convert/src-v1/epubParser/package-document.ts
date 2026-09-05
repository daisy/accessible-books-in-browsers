import * as utils from '../utils.js';
import * as fileio from '../file-io.js';
import xpath from 'xpath';
import path from 'path';

let select = xpath.useNamespaces({
    html: 'http://www.w3.org/1999/xhtml',
    epub: "http://www.idpf.org/2007/ops",
    dc: "http://purl.org/dc/elements/1.1/",
    opf: "http://www.idpf.org/2007/opf"
});

async function parse(inputFilename) {
    let doc = await fileio.parse(inputFilename);
    
    let metadata = parseMetadata(doc);
    let spine = parseSpine(inputFilename, doc);
    let navFilename = getManifestItemHrefByProperty("nav", doc, inputFilename);
    let favico = getManifestItemHrefByProperty("favico", doc, inputFilename);
    let audioFiles = getManifestItemHrefsByMediaType("audio/mpeg", doc, inputFilename);
    let cssFiles = getManifestItemHrefsByMediaType("text/css", doc, inputFilename);
    metadata['cover'] = metadata['cover'] ? path.join(path.dirname(inputFilename), metadata['cover']) : '';
    return { metadata, spine, navFilename, dom: doc, favico, audioFiles, cssFiles };
}

function parseMetadata(doc) {
    let parsedMetadata = {};
    let metadataSection = select("//opf:metadata", doc)[0];
    // @ts-ignore
    Array.from(metadataSection.childNodes ?? [])
        //@ts-ignore
        .filter(child => child.nodeType == 1)
        .map(child => {
            //@ts-ignore
            if (child.nodeName == "opf:meta") {
                //@ts-ignore
                if (child.hasAttribute("property")) {
                    //@ts-ignore
                    utils.addItem(child.getAttribute("property"), child.textContent, parsedMetadata);    
                }
                //@ts-ignore
                else if (child.hasAttribute("name") && child.getAttribute("name") == "cover") {
                    // dereference the cover
                    //@ts-ignore
                    let coverElm = select(`//*[@id='${child.getAttribute('content')}']`, doc)[0];
                    //@ts-ignore
                    utils.addItem("cover", coverElm.getAttribute("href"), parsedMetadata);
                }
            }
            //@ts-ignore
            else {
                //@ts-ignore
                utils.addItem(child.nodeName, child.textContent, parsedMetadata);
            }
    });

    let coverImage = select("//opf:item[contains(@properties, 'cover-image')]", doc);
    if (coverImage.length > 0) {
        //@ts-ignore
        utils.addItem("cover", coverImage[0].getAttribute("href"), parsedMetadata);
    }
    return parsedMetadata;
}

function parseSpine(opfFilename, doc) {
    let spineItems = [];
    let spineItemIdrefs = select('//opf:itemref/@idref', doc);
    spineItemIdrefs.map(idref => {
        //@ts-ignore
        let manifestItems = select(`//opf:item[@id='${idref.nodeValue}']`, doc);
        if (manifestItems.length > 0) {
            //@ts-ignore
            let filename = manifestItems[0].getAttribute('href');
            let smilfilename = '';
            //@ts-ignore
            if (manifestItems[0].hasAttribute("media-overlay")) {
                //@ts-ignore
                let smilItems = select(`//opf:item[@id='${manifestItems[0].getAttribute("media-overlay")}']`, doc);
                if (smilItems.length > 0) {
                    //@ts-ignore
                    smilfilename = path.resolve(path.dirname(opfFilename), smilItems[0].getAttribute("href"));
                }
            }
            // don't add the toc
            //@ts-ignore
            if (manifestItems[0].getAttribute("properties").indexOf("nav") == -1) {
                spineItems.push({
                    path: path.resolve(path.dirname(opfFilename), filename),
                    moPath: smilfilename
                });
            }
            else {
                console.debug("Ignoring linear=no but not adding TOC to spine");
            }
        }
    });
    return spineItems;
}

function getManifestItemHrefByProperty(property, doc, opfFilename) {
    let items = select(`//opf:item[contains(@properties, '${property}')]`, doc);
    let item;
    if (items.length > 0) item = items[0];
    else return '';
    let href = item.getAttribute("href");
    return path.resolve(path.dirname(opfFilename), href);
}

function getManifestItemHrefsByMediaType(mediaType, doc, opfFilename) {
    let hrefs = Array.from(select(`//opf:item[contains(@media-type, '${mediaType}')]/@href`, doc));
    //@ts-ignore
    return hrefs.map(href => path.resolve(path.dirname(opfFilename), href.nodeValue));
}
export { parse };
