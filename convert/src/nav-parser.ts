import fs from 'fs-extra';
import iconv from 'iconv-lite';
import { DOMParser, XMLSerializer } from 'xmldom';
import * as utils from './utils.js';
import { parse } from './file-io.js';
import xpath from 'xpath';
import path from 'path';

// find the label for the navigation entry with the given href
async function getTitleForNavEntry(href, navDocFilename) {
    if (!navDocFilename) return '';
    if (!href) return '';

    
    let doc = await parse(navDocFilename);
    
    let navlinks = [];
    // if JSDOM / HTML 
    // nav will always be xhtml except for the experiment I did where it's HTML
    if (doc.window) {
        let dom = doc.window.document;
        navlinks = Array.from(dom.querySelectorAll("nav > ol > li > a"));
    }
    else {
        const select = xpath.useNamespaces({
            html: 'http://www.w3.org/1999/xhtml',
            epub: "http://www.idpf.org/2007/ops"
        });
        navlinks = select("//html:nav/html:a", doc);
    }
    // @ts-ignore
    let navlinksData = navlinks.map(link => ({
        href: path.resolve(
            path.dirname(navDocFilename), 
            link.getAttribute("href")
        ), 
        label: link.textContent })
    );        
    
    let navlink = navlinksData.find(link => {
        // just compare the srcs 
        let linkHref = utils.splitSrcSelector(link.href).src;
        return linkHref === href;  
    });
    return navlink?.label;
    
}

export { getTitleForNavEntry };
