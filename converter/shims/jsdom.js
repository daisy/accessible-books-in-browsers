// Browser converter (plan 19): the part of jsdom the converter uses (new JSDOM(source[, { contentType }]).window.document),
// on the browser's own parser. HTML by default, as jsdom: the converter parses XHTML pages as HTML.
export class JSDOM {
    constructor(source = '', options = {}) {
        const type = ['application/xml', 'application/xhtml+xml', 'image/svg+xml'].includes(options.contentType) ? 'application/xml' : 'text/html';
        const document = new DOMParser().parseFromString(String(source), type);
        this.window = { document, DOMParser, XMLSerializer, Node, NodeFilter, Element, HTMLElement, CustomEvent, Event, getComputedStyle: () => ({}) };
    }
    serialize() { return '<!DOCTYPE html>\n' + this.window.document.documentElement.outerHTML; }
}
export default { JSDOM };
