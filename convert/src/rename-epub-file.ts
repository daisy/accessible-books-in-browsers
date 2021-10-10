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


async function renameFileUpdateRefs(oldFilename, newFilename, epub) {
    await fs.move(oldFilename, newFilename, {overwrite: true});    
    let spineItem = epub.spine.find(item => item.path == oldFilename);
    if (spineItem) { // really we should check manifest not spine but this is faster and will work for now
        await updateSmil(spineItem.moPath, oldFilename, newFilename);
    }
    await updateNav(newFilename, oldFilename, newFilename);
    await updateSpine(epub.packageFilename, oldFilename, newFilename);
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

async function updateNav(navFilename, oldFilename, newFilename) {
    let navdoc = await fileio.parse(navFilename);
    let allLinks = select("//html:a", navdoc);
    Array.from(allLinks).map(linkElm => {
        //@ts-ignore
        if (linkElm.hasAttribute("src")) {
            //@ts-ignore
            let src = path.join(path.dirname(smilFilename), linkElm.getAttribute("src"));
            if (utils.getWithoutFrag(src) == oldFilename) {
                let frag = utils.getFrag(src);
                let newFileSrc = path.relative(path.dirname(navFilename), newFilename);
                //@ts-ignore
                linkElm.setAttribute("src", newFileSrc + "#" + frag);
            }
        }
    });
    await fileio.write(navFilename, navdoc);
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

export { renameFileUpdateRefs };