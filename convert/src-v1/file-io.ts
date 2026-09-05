import fs from 'fs-extra';
import iconv from 'iconv-lite';
import { DOMParser, XMLSerializer } from 'xmldom';
import * as utils from './utils.js';
import path from 'path';
import { JSDOM } from 'jsdom';

async function readToString(filename) {
    let encoding = utils.sniffEncoding(filename);
    let fileContents = await fs.readFile(filename);
    let fileContentsString = iconv.decode(fileContents, encoding);
    return fileContentsString;
}
// return a dom (JSDOM for HTML, XMLDOM for XML)
async function parse(filename, forceXml = false):Promise<any> {
    let fileContentsString = await readToString(filename);
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
async function write(filename, dom, forceXml = false) {
    let ext = path.extname(filename);
    if (ext == ".html" && !forceXml) {
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

export {parse, parseFromString, write, readToString};