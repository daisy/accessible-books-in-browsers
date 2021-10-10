import tmp from 'tmp';
import * as path from 'path';
import winston from 'winston';
import fs from 'fs-extra';
import { unzip } from './unzip-epub.js'
import * as packageDocument from './package-document.js';
import * as navDocument from './nav-document.js';
import * as fileio from '../file-io.js';
import xpath from 'xpath';

async function parse(inputFilename):Promise<Epub> {
    let basedir = await setupBasedir(inputFilename);
    winston.info(`Reading files from ${basedir}`);
    let opfFilename = await calculatePackageDocPath(basedir);
    let packageObj = await packageDocument.parse(opfFilename);
    let nav = await navDocument.parse(packageObj.navFilename);

    return { 
       spine: packageObj.spine,
       metadata: packageObj.metadata,
       navFilename: packageObj.navFilename, 
       packageFilename: opfFilename,
       basedir,
       nav,
       favico: packageObj.favico,
       audioFiles: packageObj.audioFiles
    };
}

// unzip to temp dir if needed
async function setupBasedir(inputFilename) {
    tmp.setGracefulCleanup();
    if (fs.statSync(inputFilename).isDirectory()) {
        winston.verbose('EPUB is already unpacked');
        return inputFilename;
    } 
    else {
        winston.verbose('Extracting EPUB');
        let tmpdir = await unzip(inputFilename);
        return tmpdir;
    }
}

async function calculatePackageDocPath (epubDir) {
    const containerFilePath = `${epubDir}/META-INF/container.xml`;
    let doc = await fileio.parse(containerFilePath);
    const select = xpath.useNamespaces({ ocf: 'urn:oasis:names:tc:opendocument:xmlns:container' });
    const rootfiles = select('//ocf:rootfile[@media-type="application/oebps-package+xml"]/@full-path', doc);
    // just grab the first one as we're not handling the case of multiple renditions
    if (rootfiles.length > 0) {
        //@ts-ignore
        return (path.join(epubDir, rootfiles[0].nodeValue));
    }
    return '';
}

export { parse };