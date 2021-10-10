import * as path from 'path';
import fs from 'fs-extra';
import { template } from './html-template.js';
import * as packageParser from './epubParser/package-document.js';
import { write } from 'file-io.js';
import { JSDOM } from 'jsdom';
import * as utils from './utils.js';
import iconv from 'iconv-lite';
import { getTitleForNavEntry } from './epubParser/nav-document.js';

// given a list of filenames, wrap the contents of each file in the html-template, and write to the output dir as filename.html
async function applyTemplate(inputFilename, audioFilename, vttFilename, outputFilename, epub, aboutFilename, pathToSharedClientCode) {
    // spine position of current file
    let pos = epub.spine.findIndex(spineItem => spineItem.path == inputFilename);

    let previousSectionHref = pos > 0 ? epub.spine[pos - 1].path : null;
    let nextSectionHref = pos <= epub.spine.length - 2 ? epub.spine[pos + 1].path : null;
    
    let encoding = utils.sniffEncoding(inputFilename);
    let fileContents = await fs.readFile(inputFilename);
    let fileContentsString = iconv.decode(fileContents, encoding);
    
    const dom = new JSDOM(fileContentsString);
    let documentElement = dom.window.document.documentElement;
    
    let bodyContents = documentElement.querySelector("body").innerHTML;
    let headContents = documentElement.querySelector("head").innerHTML;
    let previousSectionTitle = await getTitleForNavEntry(previousSectionHref, epub.nav['toc']);
    let nextSectionTitle = await getTitleForNavEntry(nextSectionHref, epub.nav['toc']);

    // relativeize some paths
    let relPreviousSectionHref = previousSectionHref ? path.relative(path.dirname(inputFilename), previousSectionHref) : null;
    let relNextSectionHref = nextSectionHref ? path.relative(path.dirname(inputFilename), nextSectionHref) : null;
    let relNavDocHref = epub.navFilename ? path.relative(path.dirname(inputFilename), epub.navFilename) : null;
    let relVttFilename = vttFilename ? path.relative(path.dirname(inputFilename), vttFilename) : null;
    let relAudioFilename = audioFilename ? path.relative(path.dirname(inputFilename), audioFilename) : null;
    let relFavico = epub.spine.favico ? path.relative(path.dirname(inputFilename), epub.spine.favico) : null;
    let relAboutFilename = aboutFilename ? path.relative(path.dirname(inputFilename), aboutFilename) : null;
    let relSearchDataFilename = path.relative(path.dirname(inputFilename), path.join(path.dirname(epub.navFilename), "data.json"));
    let relSearchIndexFilename = path.relative(path.dirname(inputFilename), path.join(path.dirname(epub.navFilename), "idx.json"));

    let newContents = template(
        bodyContents,
        relPreviousSectionHref, 
        previousSectionTitle, 
        relNextSectionHref, 
        nextSectionTitle,
        relNavDocHref,
        headContents,
        relVttFilename,
        relAudioFilename,
        relFavico,
        relAboutFilename,
        pathToSharedClientCode,
        outputFilename,
        relSearchIndexFilename,
        relSearchDataFilename
    );

    await fs.writeFile(outputFilename, newContents);
}

export { applyTemplate }