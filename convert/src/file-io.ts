import fs from 'fs-extra';
import iconv from 'iconv-lite';
import { JSDOM } from 'jsdom';
import path from 'path';
import { DOMParser } from 'xmldom';
import * as utils from './utils.js';

async function readToString(filename: string): Promise<string> {
    const encoding = utils.sniffEncoding(filename);
    const fileContents = await fs.readFile(filename);
    return iconv.decode(fileContents, encoding);
}

async function parse(filename: string, forceXml = false): Promise<any> {
    const fileContentsString = await readToString(filename);
    const ext = path.extname(filename);
    if (ext === '.html' && !forceXml) return new JSDOM(fileContentsString);
    return new DOMParser().parseFromString(fileContentsString);
}

export {
    parse,
    readToString
};
