// this script is not generically applicable
// it's optimized for the action for heroes book, which was created by
// word-daisy202, pipeline-epub3

import * as epubParser from './epubParser/index.js';
import * as fileio from './file-io.js';
import xpath from 'xpath';
import * as logger from './logger/index.js';
import * as path from 'path';
import { DOMParser, XMLSerializer } from 'xmldom';
export { singleToMultiPage };
import fs from 'fs-extra';
import * as utils from './utils.js';
import winston from 'winston';

let select = xpath.useNamespaces({
    html: 'http://www.w3.org/1999/xhtml',
    epub: "http://www.idpf.org/2007/ops",
    dc: "http://purl.org/dc/elements/1.1/",
    opf: "http://www.idpf.org/2007/opf",
    smil: "http://www.w3.org/ns/SMIL"
});

// WARNING: this overwrites what's in inputDir
// it assumes you've made a copy of the book in an earlier step, and that's what we're working from here
// or that you don't care
//
// this takes an EPUB with a single content document and creates an EPUB with multiple content documents instead
// the document is broken into files according to <div class="file"> elements
// all nav, spine, smil refs are updated accordingly
// this is not a generic solution and prob not a feature that will make it into the final? script
// but it makes the demo content look nicer
async function singleToMultiPage(inputDir) {
    let epub = await epubParser.parse(inputDir);
    if (epub.spine.length == 0) {
        winston.warn("Does not have any content documents");
        return;
    }
    if (epub.spine.length > 1) {
        winston.info("Already has multiple content documents");
        return;
    }

    let contentDoc = await fileio.parse(epub.spine[0].path);
    let docHead = select("//html:head", contentDoc)[0];

    let serializer = new XMLSerializer();
    // the content doc has been slightly modified (manually), to add <div class="file"> around each chunk
    let fileDivs = select("//html:div[contains(@class, 'file')]", contentDoc);

    let idx = 0;
    let newFiles = [];
    for(let fileDiv of fileDivs) {
        let filename = `${idx.toString().padStart(3, '0')}.html`;
        //@ts-ignore
        let headString = serializer.serializeToString(docHead);
        //@ts-ignore
        let bodyString = serializer.serializeToString(fileDiv);
        let fileString = 
        `<!DOCTYPE html>
        <html>
            ${headString} 
            <body>
                ${bodyString}
            </body>
        </html>
        `;
        idx++;
        newFiles.push({
            // use the same path as the content doc at spine[0]
            path: path.join(path.dirname(epub.spine[0].path), filename),
            content: fileString
        });
    }

    newFiles = await Promise.all(newFiles.map(async newFile => await postProcess(newFile)));

    // save the new files
    for (let newFile of newFiles) {
        await fs.writeFile(newFile.path, newFile.content);
    }

    let findNewFileWithId = id => newFiles.find(newFile => newFile.ids.includes(id));

    let packageDoc = await fileio.parse(epub.packageFilename);
    // rewrite the SMIL file
    // assume one media overlay since there was originally just one content doc
    let moItem = select("//opf:item[@media-type='application/smil+xml']", packageDoc)[0];
    //@ts-ignore
    let moHref = path.join(path.dirname(epub.packageFilename), moItem.getAttribute("href"));
    let smildoc = await fileio.parse(moHref);
    let allTexts = select("//smil:text", smildoc);
    Array.from(allTexts).map(textElm => {
        //@ts-ignore
        let frag = utils.getFrag(textElm.getAttribute("src"));
        let newFile = findNewFileWithId(frag);
        //@ts-ignore
        textElm.setAttribute("src", path.relative(path.dirname(moHref), newFile.path) + "#" + frag);
    });
    await fileio.write(moHref, smildoc);

    // rewrite the nav doc
    let navdoc = await fileio.parse(epub.navFilename);
    let hrefs = select("//*/@href", navdoc);
    hrefs.map(href => {
        //@ts-ignore
        let frag = utils.getFrag(href.value);
        let newFile = findNewFileWithId(frag);
        //@ts-ignore
        href.value = path.relative(path.dirname(epub.navFilename), newFile.path + "#" + frag);
    });
    await fileio.write(path.join(epub.navFilename), navdoc);

    let manifestElm = select("//opf:manifest", packageDoc)[0];
    let spineElm = select("//opf:spine", packageDoc)[0];
    // clear the spine
    //@ts-ignore
    Array.from(spineElm.childNodes).map(child => spineElm.removeChild(child));
        
    // rewrite the spine
    newFiles.map((newFile, idx) => {
        let item = packageDoc.createElement("item");
        item.setAttribute("media-type", "application/xhtml+xml");
        item.setAttribute("href", path.relative(path.dirname(epub.packageFilename), newFile.path));
        let newId = `new-${idx}`;
        item.setAttribute("id", newId);
        //@ts-ignore
        item.setAttribute("media-overlay", moItem.getAttribute("id"));
        //@ts-ignore
        manifestElm.appendChild(item);

        let itemref = packageDoc.createElement("itemref");
        itemref.setAttribute("idref", newId);
        itemref.setAttribute("id", `itemref-${newId}`);
        //@ts-ignore
        spineElm.appendChild(itemref);
    });
    await fileio.write(epub.packageFilename, packageDoc);

    // delete the original content doc
    await fs.remove(epub.spine[0].path);
    
    // this book has no internal links so we don't have to update those
}

async function postProcess(file) {
    let newFile = {path: file.path};
    let doc = await fileio.parseFromString(file.content, false);
    
    removeLevelDivs(doc);
    fixHeadings(doc);
    //@ts-ignore
    newFile.ids = select("//*/@id", doc).map(attr => attr.value);
    //@ts-ignore
    newFile.content = new XMLSerializer().serializeToString(doc);
    return newFile;
}

// remove div class="level*"
function removeLevelDivs(doc) {
    let getDivsByClass = classname => select(`//html:div[contains(@class, '${classname}')]`, doc);

    let removeAndReparent = div => {
        //@ts-ignore
        Array.from(div.childNodes).map(child => div.parentNode.insertBefore(child, div));
        div.parentNode.removeChild(div);
    };

    let level1Divs = getDivsByClass("level1");
    let level2Divs = getDivsByClass("level2");
    let level3Divs = getDivsByClass("level3");
    let level4Divs = getDivsByClass("level4");
    let level5Divs = getDivsByClass("level5");
    let level6Divs = getDivsByClass("level6");

    let allLevelDivs = level1Divs.concat(level2Divs).concat(level3Divs).concat(level4Divs).concat(level5Divs).concat(level6Divs);

    allLevelDivs.map(div => removeAndReparent(div));
}

function fixHeadings(document) {
    let renameElement = (elm, newTagName) => {
        let newElm = document.createElement(newTagName);
        // copy attributes
        //@ts-ignore
        Array.from(elm.attributes).map(attr => newElm.setAttribute(attr.name, attr.value));
        // copy children
        Array.from(elm.childNodes).map(child => newElm.appendChild(child));
        // append to parent
        elm.parentNode.insertBefore(newElm, elm);
        // remove original
        elm.parentNode.removeChild(elm);
    };
    let renameElements = (oldTagName, newTagName) => {
        let elms = select(`//html:${oldTagName}`, document);
        for (let elm of elms) {
            renameElement(elm, newTagName);
        }
    };
    let h1s = select("//html:h1", document);
    // if there are no h1s, promote other headings
    if (h1s.length == 0) {
        renameElements("h2", "h1");
        renameElements("h3", "h2");
        renameElements("h4", "h3");
        renameElements("h5", "h4");
        renameElements("h6", "h5");
    }
}

