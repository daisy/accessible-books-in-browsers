import * as fileio from './file-io.js';

// TODO dynamic favico
async function addStylesheets(inputFilename, outputFilename) {
    let dom = await fileio.parse(inputFilename);
    let doc = dom.window.document;
    let head = doc.querySelector("head");
    head.innerHTML = 
    `
    <link rel="stylesheet" type="text/css" href="../src/styles/theme.css">
    <link rel="stylesheet" type="text/css" href="../src/styles/content.css">
    <link rel="stylesheet" type="text/css" href="../src/styles/nav.css">

    <link rel="icon" type="image/png" sizes="96x96" href="favicon-96x96.png">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    ${head.innerHTML}
    `;

    let title = doc.querySelector("title");
    title.textContent = `${title.textContent}: Navigation Document`;

    await fileio.write(outputFilename, dom);

}
async function createListOfNavs(inputFilename, outputFilename) {
    let dom = await fileio.parse(inputFilename);

    // <nav id="abinb-list-of-navs">
    //      <ol>
    //          <li><a href="#toc">Table of Contents</a></li>
    //          <li><a href="#guide">Landmarks</a></li>
    //      </ol>
    //  </nav>

    // this should be html
    let doc = dom.window.document;

    let navs = Array.from(doc.querySelectorAll("nav"));
    
    navs.map((nav, idx) => {
        //@ts-ignore
        if (!nav.id) {
            //@ts-ignore
            nav.id = `nav-${idx}`;
        }
    });
    let listOfNavs = doc.createElement("nav");
    listOfNavs.id = "abinb-list-of-navs";
    
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
    else if (nav.classList.contains("epubtype_landmarks")) {
        return "Landmarks";
    }
    else if (nav.classList.contains("epubtype_page-list")) {
        return "Pages";
    }
}

export { createListOfNavs, addStylesheets };