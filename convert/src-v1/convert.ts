import * as epubParser from './epubParser/index.js';
import * as logger from './logger/index.js';
import * as path from 'path';
import * as utils from './utils.js';
import fs from 'fs-extra';
import {renameFileUpdateRefs, updateXHtml } from './rename-epub-file.js';
import { mergeAudioSegments } from './process-audio.js';
import xpath from 'xpath';
import * as fileio from './file-io.js';
import { createVtt } from './vtt.js';
import {applyTemplate} from './apply-template.js';
import {makeAboutPage} from './make-about-page.js';
import {removeXMLThings} from './exhtml.js';
import { generateSearchIndex } from './create-search-index.js';
import { selfAnchorHeadings } from './self-anchor-headings.js';
import * as nav from './nav.js';
import pretty from 'pretty';
import { adjustSelectors } from './adjust-css.js';

let select = xpath.useNamespaces({
    html: 'http://www.w3.org/1999/xhtml',
    epub: "http://www.idpf.org/2007/ops",
    dc: "http://purl.org/dc/elements/1.1/",
    opf: "http://www.idpf.org/2007/opf",
    smil: "http://www.w3.org/ns/SMIL"
});


async function convert(inputDir, outputDir, pathToSharedClientCode) {
    logger.initLogger(path.join(process.cwd(), "output.log"));

    // copy to a working directory
    let workingDir = path.join(outputDir, path.basename(inputDir));
    await utils.ensureDirectory(workingDir, true);
    
    await fs.copy(inputDir, workingDir);

    await prepareFiles(workingDir);
        
    // for each spine item, find its audio clips
    let epub = await epubParser.parse(workingDir);

    let aboutFilename = path.join(path.dirname(epub.navFilename), "about.html");
    let audioFilenames = [];
    let audioFilename;
    let vttFilename;
    for (let spineItem of epub.spine) {
        if (spineItem.moPath) {
            let mediaSegments = await getMediaSegments(spineItem);
            if (mediaSegments.length == 0) {
                console.error("No media segments found for ", spineItem);
            }
            let audioExt = mediaSegments.length > 0 ? path.extname(mediaSegments[0].src) : '';
            let spineItemFilename = path.basename(spineItem.path);
            
            let vttOutputDir = path.join(path.dirname(spineItem.path), "vtt");
            await utils.ensureDirectory(vttOutputDir);
            let audioOutputDir = path.join(path.dirname(spineItem.path), "audio");
            await utils.ensureDirectory(audioOutputDir);
            
            audioFilename = path.join(audioOutputDir, spineItemFilename.replace(".html", ".mp3"));
            vttFilename = path.join(vttOutputDir, spineItemFilename.replace(".html", '.vtt'));

            await mergeAudioSegments(mediaSegments, audioFilename);
            await createVtt(mediaSegments, vttFilename);
            audioFilenames.push(audioFilename);
        }

        // apply the HTML template to the spine item
        await applyTemplate(
            spineItem.path,
            spineItem.moPath ? audioFilename : null,
            vttFilename,
            spineItem.path,
            epub,
            aboutFilename,
            pathToSharedClientCode
        );

        await removeXMLThings(spineItem.path, spineItem.path);
    };
    
    for (let cssFilename of epub.cssFiles) {
        await adjustSelectors(cssFilename, cssFilename);
    }
    
    
    await removeXMLThings(epub.navFilename, epub.navFilename);
    await nav.createListOfNavs(epub.navFilename, epub.navFilename);
    await nav.addStylesheets(epub.navFilename, epub.navFilename);

    // clean up the directory
    // - remove mimetype, META-INF, opf, ncx
    await fs.remove(path.join(workingDir,"mimetype"));
    await fs.remove(path.join(workingDir, "META-INF"));
    await fs.remove(path.join(path.dirname(epub.navFilename), "ncx.xml"));
    await fs.remove(epub.packageFilename);
    for (let spineItem of epub.spine) {
        if (spineItem.moPath) {
            await fs.remove(spineItem.moPath);
        }
    }
    await Promise.all(epub.audioFiles.map(async audioFile => await fs.remove(audioFile)));
    
    await makeAboutPage(epub, aboutFilename);

    let removedDirs = [];

    // - collapse directories that contain only one directory
    let collapseDirs = async dir => {
        let files = await fs.readdir(dir);
        files = files.filter(file => file != '.DS_Store');
        if (files.length == 1) {
            let stat = await fs.stat(path.join(dir, files[0]));
            if (stat.isDirectory()) {
                // copy the contents of this directory to its parent and delete this directory
                await fs.copy(path.join(dir, files[0]), dir, {overwrite: true});
                await fs.remove(path.join(dir, files[0]));
                removedDirs.push(files[0]);
                // do it again
                await collapseDirs(dir);
            }
        }
    };

    await collapseDirs(workingDir);

    removedDirs.map(removedDir => epub.navFilename = epub.navFilename.replace(removedDir + "/", ''));
    epub.spine.map(item => removedDirs.map(removedDir => item.path = item.path.replace(removedDir + "/", '')));

    let spineFiles = epub.spine.map(item => item.path);

    for (let spineFile of spineFiles) {
        await selfAnchorHeadings(spineFile, spineFile);
    }

    // read the file, prettify it, overwrite it with prettier version
    let prettyHtml = async htmlFilename => {
        let filecontents = await fileio.readToString(htmlFilename);
        let prettyFilecontents = await pretty(filecontents);
        await fs.writeFile(htmlFilename, prettyFilecontents);
    }
    for (let spineFile of spineFiles) {
        await prettyHtml(spineFile);
    }
    await prettyHtml(epub.navFilename);
    await prettyHtml(path.join(path.dirname(epub.navFilename), "about.html"));

    await generateSearchIndex(spineFiles, path.dirname(epub.navFilename));
}

// modify the files in workingDir to prepare them for conversion
// rename xhtml to html
// make sure there's an index.html entry point file
async function prepareFiles(workingDir) {
    let epub = await epubParser.parse(workingDir);

    // the entry page is assumed to be the first spine item
    // another idea is to grab the cover, if there is one
    let entryPage = epub.spine[0];
    
    // TODO what if there was already a file called 'index'
    let renamedPaths = [];
    let renamedPath = {old: entryPage.path, new: path.join(path.dirname(entryPage.path), "index.html")};
    renamedPaths.push(renamedPath);
    entryPage.path = renamedPath.new;
    // rename entry page to index.html
    await renameFileUpdateRefs(
        renamedPath.old, 
        renamedPath.new,
        epub
    );

    // rename all other spine items from xhtml to html
    for (let spineItem of epub.spine.slice(1)) {
        if (path.extname(spineItem.path) == ".xhtml") {
            renamedPath = {old: spineItem.path, new: spineItem.path.replace(".xhtml", ".html")};
            renamedPaths.push(renamedPath);
            spineItem.path = renamedPath.new;
            await renameFileUpdateRefs(
                renamedPath.old,
                renamedPath.new,
                epub
            );
        }
    }
    // TODO what if there was already a file (a content doc file) called 'nav'? 
    renamedPath = {old: epub.navFilename, new: path.join(path.dirname(epub.navFilename), "nav.html")};
    renamedPaths.push(renamedPath);
    epub.navFilename = renamedPath.new;
    await renameFileUpdateRefs(
        renamedPath.old,
        renamedPath.new,
        epub,
        true
    );

    await Promise.all(epub.spine.map(async item => await updateXHtml(item.path, renamedPaths)));
}
async function getMediaSegments(spineItem) {
    let smildoc = await fileio.parse(spineItem.moPath);

    // expand all the srcs
    let srcs = select("//*/@src", smildoc);
    //@ts-ignore
    Array.from(srcs).map(src => src.ownerElement.setAttribute("src", path.join(path.dirname(spineItem.moPath), src.nodeValue)));

    let textElms = select(`//smil:text[contains(@src, '${spineItem.path}')]`, smildoc);

    let mediaSegments = [];

    Array.from(textElms).map(textElm => {
        //@ts-ignore
        let audioElms = select(".//smil:audio", textElm.parentNode);
        Array.from(audioElms).map(audioElm => {
            mediaSegments.push({
                //@ts-ignore
                src: audioElm.getAttribute("src"),
                //@ts-ignore
                clipBegin: utils.toSeconds(audioElm.getAttribute("clipBegin")),
                //@ts-ignore
                clipEnd: utils.toSeconds(audioElm.getAttribute("clipEnd")),
                //@ts-ignore
                textSrc: textElm.getAttribute("src")
            });
        }); 
    });
    return mediaSegments;
}


export { convert };