// this standalone script is not part of the conversion process

import fs from 'fs-extra';
import iconv from 'iconv-lite';
import { DOMParser, XMLSerializer } from 'xmldom';
import * as utils from './utils.js';

// e.g. shift all the SMIL clips forward by 2.45 seconds
async function shiftClipTimes (filename: string, outFilename: string, shiftAmount: number): Promise<any> {
    let encoding = utils.sniffEncoding(filename);
    let fileContents = await fs.readFile(filename);
    let fileContentsString = iconv.decode(fileContents, encoding);

    let doc = new DOMParser().parseFromString(fileContentsString);
    
    visitXml(doc.documentElement, elm => shiftAttributeValues(elm, "clipBegin", shiftAmount));
    visitXml(doc.documentElement, elm => shiftAttributeValues(elm, "clipEnd", shiftAmount));

    let xmlserializer = new XMLSerializer();
    let modFileContents = xmlserializer.serializeToString(doc.documentElement);
    fs.writeFileSync(outFilename, modFileContents);
}

// basic visitor function
function visitXml(elm: any, fn: any) {
    fn(elm);
    if (elm.childNodes) {
        Array.from(elm.childNodes).map(childElm => visitXml(childElm, fn));
    }   
}

// shift the values of the given attribute by the given amount
function shiftAttributeValues(elm: any, attrName: string, shiftAmount: number) {
    if (elm.nodeType != elm.ELEMENT_NODE) {
        return;
    }
    if (elm.hasAttribute(attrName)) {
        let analyzeTimestamp = utils.toSeconds(elm.getAttribute(attrName));
        let newTimeInSeconds = analyzeTimestamp.seconds + shiftAmount;
        if (newTimeInSeconds < 0) {
            newTimeInSeconds = 0;
        }
        if (analyzeTimestamp.format == "hms") {
            elm.setAttribute(attrName, utils.toHHMMSS(newTimeInSeconds));
        }
        else {
            // TODO accommodate less common formats e.g. h, m, or ms
            // right now it just converts everything to seconds unless it's HMS
            elm.setAttribute(attrName, newTimeInSeconds);
        }
    }
}

export { shiftClipTimes };
