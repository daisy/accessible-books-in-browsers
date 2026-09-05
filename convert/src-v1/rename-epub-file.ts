import fs from 'fs-extra';
import * as fileio from './file-io.js';
import xpath from 'xpath';
import * as path from 'path';
import * as utils from './utils.js';

let select = xpath.useNamespaces({
    html: 'http://www.w3.org/1999/xhtml',
    epub: "http://www.idpf.org/2007/ops",
    dc: "http://purl.org/dc/elements/1.1/",
    opf: "http://www.idpf.org/2007/opf",
    smil: "http://www.w3.org/ns/SMIL"
});

// in the entire EPUB
async function renameFileUpdateRefs(oldFilename, newFilename, epub, isNavFile=false) {
    console.debug("rename file", `${oldFilename} => ${newFilename}`);
    let spineItem = epub.spine.find(item => item.path == newFilename);
    if (spineItem && spineItem.moPath && spineItem.moPath != '') { // really we should check manifest not spine but this is faster and will work for now
        await updateSmil(spineItem.moPath, oldFilename, newFilename);
    }
    if (!isNavFile) {
        await updateXHtml(epub.navFilename, [{old: oldFilename, new: newFilename}]);
    }
    await updateSpine(epub.packageFilename, oldFilename, newFilename);
    await fs.move(oldFilename, newFilename, {overwrite: true});    
}

async function updateSmil(smilFilename, oldFilename, newFilename) {
    let smildoc = await fileio.parse(smilFilename);
    let allTexts = select("//smil:text", smildoc);
    Array.from(allTexts).map(textElm => {
        //@ts-ignore
        if (textElm.hasAttribute("src")) {
            //@ts-ignore
            let src = path.join(path.dirname(smilFilename), textElm.getAttribute("src"));
            if (utils.getWithoutFrag(src) == oldFilename) {
                let frag = utils.getFrag(src);
                let newFileSrc = path.relative(path.dirname(smilFilename), newFilename);
                //@ts-ignore
                textElm.setAttribute("src", newFileSrc + "#" + frag);
            }
        }
    });
    await fileio.write(smilFilename, smildoc);
}

// open contentFilename and replace each <a href="replacements[i].old" with replacements[i].new
// rewrite contentFilename
async function updateXHtml(contentFilename, replacements) {
    let doc = await fileio.parse(contentFilename, true);
    let allLinks = select("//html:a", doc);
    Array.from(allLinks).map(linkElm => {
        //@ts-ignore
        if (linkElm.hasAttribute("href")) {
            //@ts-ignore
            let src = path.join(path.dirname(contentFilename), linkElm.getAttribute("href"));
            let srcNoFrag = utils.getWithoutFrag(src);
            // if this src is among the things that need replacing... 
            if (replacements.map(item => item.old).includes(srcNoFrag)) {
                let frag = utils.getFrag(src);
                let replacement = replacements.find(item => item.old == srcNoFrag).new;
                let newFileSrc = path.relative(path.dirname(contentFilename), replacement);
                newFileSrc = frag ? `${newFileSrc}#${frag}` : newFileSrc;
                //@ts-ignore
                linkElm.setAttribute("href", newFileSrc);
            }
        }
    });
    await fileio.write(contentFilename, doc, true);
}

async function updateSpine(spineFilename, oldFilename, newFilename) {
    let spinedoc = await fileio.parse(spineFilename);
    let allManifestItems = select("//opf:manifest/opf:item", spinedoc);
    Array.from(allManifestItems).map(itemElm => {
        //@ts-ignore
        if (itemElm.hasAttribute("href")) {
            //@ts-ignore
            let src = path.join(path.dirname(spineFilename), itemElm.getAttribute("href"));
            if (utils.getWithoutFrag(src) == oldFilename) {
                let newFileSrc = path.relative(path.dirname(spineFilename), newFilename);
                //@ts-ignore
                itemElm.setAttribute("href", newFileSrc);
            }
        }
    });
    await fileio.write(spineFilename, spinedoc);
}

async function updateHtml(contentFilename, replacements) {
    let doc = await fileio.parse(contentFilename);
    let allLinks = doc.window.document.querySelectorAll("a");
    Array.from(allLinks).map(linkElm => {
        //@ts-ignore
        if (linkElm.hasAttribute("href")) {
            //@ts-ignore
            let src = path.join(path.dirname(contentFilename), linkElm.getAttribute("href"));
            let srcNoFrag = utils.getWithoutFrag(src);
            // if this src is among the things that need replacing... 
            if (replacements.map(item => item.old).includes(srcNoFrag)) {
                let frag = utils.getFrag(src);
                let replacement = replacements.find(item => item.old == src).new;
                let newFileSrc = path.relative(path.dirname(contentFilename), replacement);
                newFileSrc = frag ? `${newFileSrc}#${frag}` : newFileSrc;
                //@ts-ignore
                linkElm.setAttribute("href", newFileSrc);
            }
        }
    });
    await fileio.write(contentFilename, doc);
}

export { renameFileUpdateRefs, updateHtml, updateXHtml };