import fs from 'fs-extra';
import iconv from 'iconv-lite';
import { DOMParser, XMLSerializer } from 'xmldom';
import xpath from 'xpath';
import * as utils from './utils.js';
import path from 'path';
import { JSDOM } from 'jsdom';

// return a dom (JSDOM for HTML, XMLDOM for XML)
async function parse(filename):Promise<any> {
    let encoding = utils.sniffEncoding(filename);
    let fileContents = await fs.readFile(filename);
    let fileContentsString = iconv.decode(fileContents, encoding);

    let ext = path.extname(filename);
    if (ext == ".html") {
        // parse as HTML
        let dom = new JSDOM(fileContentsString, { runScripts: "dangerously" });
        return dom;
    }
    else {
        // parse as XML
        let doc = new DOMParser().parseFromString(fileContentsString);
        return doc;
    }

}

// write a dom
async function write(filename, dom) {
    let ext = path.extname(filename);
    if (ext == ".html") {
        // if HTML
        let domString = dom.serialize();
        await fs.writeFile(filename, domString);
    }
    else {
        // TODO if XML
    }
}

export {parse, write};