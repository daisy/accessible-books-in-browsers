import * as path from 'path';
import fs from 'fs-extra';
import { template } from './html-template.js';
import { getPackageMetadata } from './package-parser.js';
import { getTitleForNavEntry } from './nav-parser.js';
import { write } from 'file-io.js';
import { JSDOM } from 'jsdom';
import * as utils from './utils.js';
import iconv from 'iconv-lite';

// given a list of filenames, wrap the contents of each file in the html-template, and write to the output dir as filename.html
async function applyTemplate(inputFilenames, outputDirectory, packageDocFilename, navDocFilename) {
    let metadata = await getPackageMetadata(packageDocFilename);

    // copy the input files to the output directory
    let movedInputFilenames = [];
    for (let inputFilename of inputFilenames) {
        if (path.basename(inputFilename) != "index.html") {
            let outputFilename = path.resolve(outputDirectory, path.basename(inputFilename).replace(".xhtml", ".html"));
            movedInputFilenames.push(outputFilename);
            await fs.copyFile(inputFilename, outputFilename);
        }
        else {
            console.log("Don't forget about index.html");
        }
    }

    // use the moved input files from the above step
    // path resolution is easier if everything is in the destination folder already
    let i = 0;
    for (let inputFilename of movedInputFilenames) {
        let outputFilename = path.resolve(outputDirectory, path.basename(inputFilename).replace(".xhtml", ".html"));
        let previousSectionHref = i > 0 ? movedInputFilenames[i - 1] : null;
        let nextSectionHref = i < movedInputFilenames.length - 2 ? movedInputFilenames[i + 1] : null;
        if (i == 0) {
            // the first page should point back to the cover
            previousSectionHref = path.resolve(path.dirname(navDocFilename), 'index.html');
        }
        let templatizedContents = await 
            applyTemplateOneFile(inputFilename, 
                metadata, 
                previousSectionHref,
                nextSectionHref,
                navDocFilename);
        i++;
        await fs.writeFile(outputFilename, templatizedContents);
    }
}

async function applyTemplateOneFile(inputFilename, packageMetadata,
    previousSectionHref, nextSectionHref, navDocHref) {
    let bodyContents = "";
    let headContents = '';
    let encoding = utils.sniffEncoding(inputFilename);
    let fileContents = await fs.readFile(inputFilename);
    let fileContentsString = iconv.decode(fileContents, encoding);
    const dom = new JSDOM(fileContentsString);
    // this might be a weird file (found in dev experiments only) that starts with <section>
    if (fileContentsString.trim().substr(0, 8) == "<section")  {
        bodyContents = fileContentsString;
        headContents = `<link rel="stylesheet" type="text/css" href="../styles/a_default.css">`;
    }
    else {
        const dom = new JSDOM(fileContentsString);
        let documentElement = dom.window.document.documentElement;
        bodyContents = documentElement.querySelector("body").innerHTML;
        headContents = documentElement.querySelector("head").innerHTML;
    
    }
    let sectionTitle = await getTitleForNavEntry(inputFilename, navDocHref);
    let previousSectionTitle = await getTitleForNavEntry(previousSectionHref, navDocHref);
    let nextSectionTitle = await getTitleForNavEntry(nextSectionHref, navDocHref);

    // relativeize some paths
    let relPreviousSectionHref = previousSectionHref ? path.relative(path.dirname(inputFilename), previousSectionHref) : null;
    let relNextSectionHref = nextSectionHref ? path.relative(path.dirname(inputFilename), nextSectionHref) : null;
    let relNavDocHref = navDocHref ? path.relative(path.dirname(inputFilename), navDocHref) : null;

    let newContents = template(
        packageMetadata['dc:title'], 
        sectionTitle, 
        bodyContents,
        relPreviousSectionHref, 
        previousSectionTitle, 
        relNextSectionHref, 
        nextSectionTitle,
        relNavDocHref,
        headContents

    );

    return newContents;
}

export { applyTemplate }