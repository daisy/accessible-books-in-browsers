// this standalone script is not part of the conversion process

import fs from 'fs-extra';
import { JSDOM } from 'jsdom';
import iconv from 'iconv-lite';
import * as utils from './utils.js';

// open an HTML file (not XHTML) and add IDs to elements that are indicated by the selectors
async function addIds(inputFilename: string, outputFilename: string, selectors: Array<string>, prefix: string = 'id-') {
    let encoding = utils.sniffEncoding(inputFilename);
    let fileContents = await fs.readFile(inputFilename);
    let fileContentsString = iconv.decode(fileContents, encoding);
    const dom = new JSDOM(fileContentsString);

    let documentElement = dom.window.document.documentElement;
    let elms = selectors.map(selector => Array.from(documentElement.querySelectorAll(selector))).flat();

    // the elements might not be in order but all we want is to give things unique IDs, so it doesn't matter
    let count = 1;
    elms.map(elm => {
        if (!elm.hasAttribute("id")) {
            elm.setAttribute("id", `${prefix}${count}`);
            count++;
        }
    });

    await fs.writeFile(outputFilename, dom.serialize());
}

export { addIds };