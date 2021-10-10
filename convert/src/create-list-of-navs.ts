import fs from 'fs-extra';
import * as path from 'path';
import * as fileio from './file-io.js';

async function createListOfNavs(inputFilename, outputFilename) {
    let dom = await fileio.parse(inputFilename);

    // <nav id="p4w-list-of-navs">
    //      <ol>
    //          <li><a href="#toc">Table of Contents</a></li>
    //          <li><a href="#guide">Landmarks</a></li>
    //      </ol>
    //  </nav>

    // this should be html
    let doc = dom.window.document;

    let navs = Array.from(doc.querySelectorAll("nav"));

    let listOfNavs = doc.createElement("nav");
    listOfNavs.id = "p4w-list-of-navs";
    
    listOfNavs.innerHTML = 
    //@ts-ignore
    `<ol>${navs.map(nav => `<li><a href="#${nav.id}">${getNavTitle(nav)}</a></li>`).join('')}</ol>`;

    doc.querySelector("body").insertBefore(listOfNavs, doc.querySelector("body").firstChild);
    await fileio.write(outputFilename, dom);
}

function getNavTitle(nav) {
    if (nav.classList.contains("epubtype_toc")) {
        return "Table of Contents";
    }
    else if (nav.classList.contains("epubtype_guide")) {
        return "Landmarks";
    }
    else if (nav.classList.contains("epubtype_page-list")) {
        return "Pages";
    }
}

export { createListOfNavs };