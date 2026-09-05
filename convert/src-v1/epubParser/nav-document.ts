import * as fileio from '../file-io.js';
import xpath from 'xpath';
import path from 'path';

let select = xpath.useNamespaces({
    html: 'http://www.w3.org/1999/xhtml',
    epub: "http://www.idpf.org/2007/ops",
    dc: "http://purl.org/dc/elements/1.1/",
    opf: "http://www.idpf.org/2007/opf"
});

// return {epubtype: OL element, ...}
async function parse(inputFilename):Promise<Object> {
    let navs = {};
    let doc = await fileio.parse(inputFilename, true);
    let navElms = select("//html:nav", doc);
    navElms.map(nav => {
        //@ts-ignore
        let epubType = nav.getAttribute("epub:type");
        //@ts-ignore
        navs[epubType] = nav.getElementsByTagName("ol")[0];

        // update all hrefs with absolute paths
        let hrefs = select("//html:a/@href", navs[epubType]);
        //@ts-ignore
        Array.from(hrefs).map(href => href.ownerElement.setAttribute("href", path.join(path.dirname(inputFilename), href.nodeValue)));

        // TODO could also collect the optional heading content
        // https://www.w3.org/publishing/epub32/epub-packages.html#sec-package-nav-def-model
    });
    return navs;
}

// find the label for the navigation entry with the given href
async function getTitleForNavEntry(href, navlist) {
    let navlinks = select(`.//html:a[contains(@href, '${href}')]`, navlist);
    if (navlinks.length > 0) {
        //@ts-ignore
        return navlinks[0].textContent;
    }
    else return '';
}

export { parse, getTitleForNavEntry };
