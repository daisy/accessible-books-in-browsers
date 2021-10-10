import fs from 'fs-extra';
import iconv from 'iconv-lite';
import { DOMParser, XMLSerializer } from 'xmldom';
import xpath from 'xpath';
import * as utils from './utils.js';
import path from 'path';
import { JSDOM } from 'jsdom';

// return a dom (JSDOM for HTML, XMLDOM for XML)
async function parse(filename, forceXml = false):Promise<any> {
    let encoding = utils.sniffEncoding(filename);
    let fileContents = await fs.readFile(filename);
    let fileContentsString = iconv.decode(fileContents, encoding);

    let ext = path.extname(filename);
    let domOrDoc = parseFromString(fileContentsString, ext == ".html" && !forceXml);
    return domOrDoc;
}

async function parseFromString(filestring, isHtml) {
    if (isHtml) {
        // parse as HTML
        
        let dom = new JSDOM(filestring);
        return dom;
    }
    else {
        // parse as XML
        let doc = new DOMParser().parseFromString(filestring);
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
        // if XML
        let serializer = new XMLSerializer();
        let domString = serializer.serializeToString(dom);
        await fs.writeFile(filename, domString);
    }
}

export {parse, parseFromString, write};