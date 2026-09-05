import * as fileio from './file-io.js';

async function removeXMLThings(inputFilename, outputFilename) {

    let dom = await fileio.parse(inputFilename);
    let doc = dom.window.document;
    // remove attributes xmlns, xmlns:epub
    //@ts-ignore
    Array.from(doc.querySelectorAll("*[xmlns]")).map(elm => elm.removeAttribute("xmlns"));
    //@ts-ignore
    Array.from(doc.querySelectorAll("*[xmlns:epub]")).map(elm => elm.removeAttribute("xmlns:epub"));

    // translate epub:type into class names
    Array.from(doc.querySelectorAll("*[epub:type]")).map(elm => {
        //@ts-ignore
        let epubTypes = elm.getAttribute("epub:type").split(' ');
        //@ts-ignore
        epubTypes.map(epubType => elm.classList.add(`epubtype_${epubType}`));
        //@ts-ignore
        elm.removeAttribute("epub:type");
    });

    await fileio.write(outputFilename, dom);

}

export { removeXMLThings };