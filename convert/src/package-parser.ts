import fs from 'fs-extra';
import iconv from 'iconv-lite';
import { DOMParser, XMLSerializer } from 'xmldom';
import * as utils from './utils.js';
import { parse } from './file-io.js';
import xpath from 'xpath';

async function getPackageMetadata(inputFilename) {
    let doc = await parse(inputFilename);
    const select = xpath.useNamespaces({
        html: 'http://www.w3.org/1999/xhtml',
        epub: "http://www.idpf.org/2007/ops",
        dc: "http://purl.org/dc/elements/1.1/",
        opf: "http://www.idpf.org/2007/opf"
    });
    let metadata = {};
    let addItem = (key, value) => {
        // combine duplicates into an array
        if (metadata[key]) {
            if (Array.isArray(metadata[key])) { 
                metadata[key].push(value);
            }
            else {
                metadata[key] = [metadata[key], value];
            }
        } 
        else {
            metadata[key] = value; 
        }
    };

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
                    addItem(child.getAttribute("property"), child.textContent);    
                }
                //@ts-ignore
                else if (child.hasAttribute("name") && child.getAttribute("name") == "cover") {
                    // dereference the cover
                    //@ts-ignore
                    let coverElm = select(`//*[@id='${child.getAttribute('content')}']`, doc)[0];
                    //@ts-ignore
                    addItem("cover", coverElm.getAttribute("href"));
                }
            }
            //@ts-ignore
            else {
                //@ts-ignore
                addItem(child.nodeName, child.textContent);
            }
    });

    return metadata;
}

export { getPackageMetadata };
/*
  <opf:metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
    <dc:identifier id="epub-id-1">urn:uuid:cf9842c5-96a3-4c86-8da5-ecc124bfef75</dc:identifier>
    <dc:title id="epub-title-1">Action for Heros</dc:title>
    <dc:date id="epub-date">2021-03-24</dc:date>
    <dc:language>en-us</dc:language>
    <dc:creator id="epub-creator-1">IASC</dc:creator>
    <dc:description>Guide for Heart - to - Heart Chats with Children to accompany reading of My Hero Is You</dc:description>
    <dc:publisher>IASC</dc:publisher>
    <dc:source>The Word document was used as the source for page numbers.</dc:source>
    <dc:rights>IASC</dc:rights>
    <opf:meta name="cover" content="cover_png" />
    <opf:meta property="dcterms:modified">2021-03-24T16:57:15Z</opf:meta>
    <opf:meta property="schema:accessibilitySummary">The publication contains structural and page navigation. Alt text is included for images if this was present in source Word document.</opf:meta>
    <opf:meta property="schema:accessMode">textual</opf:meta>
    <opf:meta property="schema:accessMode">visual</opf:meta>
    <opf:meta property="schema:accessModeSufficient">textual</opf:meta>
    <opf:meta property="schema:accessibilityFeature">structuralNavigation</opf:meta>
    <opf:meta property="schema:accessibilityFeature">displayTransformability</opf:meta>
    <opf:meta property="schema:accessibilityFeature">readingOrder</opf:meta>
    <opf:meta property="schema:accessibilityFeature">tableOfContents</opf:meta>
    <opf:meta property="schema:accessibilityFeature">unlocked</opf:meta>
    <opf:meta property="schema:accessibilityFeature">printPageNumbers</opf:meta>
    <opf:meta property="schema:accessibilityHazard">none</opf:meta>
  </opf:metadata>
  */