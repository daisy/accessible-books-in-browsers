/*
create an index for use with fusejs search tool

input: URL of HTML page
output: generated index

*/
import { parse } from './file-io.js';
import path from 'path';
import fs from 'fs-extra';
import Fuse from 'fuse.js'
import winston from 'winston';

async function generateSearchIndex(filenames: Array<string>, outputDirname) {
    winston.info("Generating search index");
    
    let data = [];

    for (let filename of filenames) {
        let retval = await generateData(filename);
        data.push(retval);
    }

    data = data.flat();

    // generate an index from this data
    let idx = Fuse.createIndex(['text', "selector"], data);
    
    await fs.writeFile(path.resolve(outputDirname, "idx.json"), JSON.stringify(idx));
    await fs.writeFile(path.resolve(outputDirname, "data.json"), JSON.stringify(data));
}

async function generateData(inputFilename) {
    // parse the document in JSDOM
    let dom = await parse(inputFilename);
    let document = dom.window.document;
    let textNodesData = [];

    // get a flat list of all text nodes
    let textNodes = [];
    var walker = document.createTreeWalker(
        document.querySelector("main"), 
        dom.window.NodeFilter.SHOW_TEXT, 
        null, 
        false
    );
    
    let node;
    while(node = walker.nextNode()) {
        if (node && node.nodeValue.trim() != '') textNodes.push(node);
    }

    // for each one, create a selector
    textNodes.map(textNode => {
        let selector = getCssSelector(textNode.parentElement);
        textNodesData.push({
            text: textNode.nodeValue.trim(),
            selector,
            filename: path.basename(inputFilename), // TODO use the top-level spine reference 
            filetitle: document.querySelector("title").textContent
        });
    });
    return textNodesData;
}

function getCssSelector(element) {
    let names = [];
    while (element.parentNode){
        if (element.id) {
            names.unshift('#'+element.id);
            break;
        }
        else {
            if (element == element.ownerDocument.documentElement) {
                names.unshift(element.tagName);
            }
            else {
                let c, e;
                for (c = 1,e = element; e.previousElementSibling; e = e.previousElementSibling, c++);
                names.unshift(element.tagName+":nth-child("+c+")");
            }
            element=element.parentNode;
        }
    }
    return names.join(" > ");
}

export { generateSearchIndex };