// Each narration cue's text is JSON naming the element it narrates. Looking it up means parsing
// that and querying the document, and several features walk every cue of a page each time the
// phrase changes, so the element is remembered per cue. Cues belong to a page's track, so a new
// page brings new cues; an element that has left the document is looked up again.
const elementByCue = new WeakMap();

export function selectElm(selector) {
    // getElementById, not querySelector('#…'): an id may start with a digit or contain characters
    // that a CSS selector would need escaped
    if (selector.type === 'FragmentSelector') return document.getElementById(selector.value);
    if (selector.type === 'CssSelector') return document.querySelector(selector.value);
    return null;
}

export function elmForCue(cue) {
    const remembered = elementByCue.get(cue);
    if (remembered?.isConnected) return remembered;
    try {
        const elm = selectElm(JSON.parse(cue.text).selector);
        if (elm) elementByCue.set(cue, elm);
        return elm;
    } catch {
        return null;
    }
}
