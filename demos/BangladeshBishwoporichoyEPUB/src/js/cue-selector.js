// Each narration cue's text is JSON naming the element it narrates. Looking it up means parsing
// that and querying the document, and several features walk every cue of a page each time the
// phrase changes, so the element is remembered per cue. Cues belong to a page's track, so a new
// page brings new cues; an element that has left the document is looked up again.
const elementByCue = new WeakMap();

export function selectElm(selector) {
    // getElementById, not querySelector('#…'): an id may start with a digit or contain characters
    // that a CSS selector would need escaped
    if (selector.type === 'FragmentSelector') {
        const anchor = document.getElementById(selector.value);
        return selector.refinedBy ? anchor?.querySelector(selector.refinedBy.value) ?? null : anchor;
    }
    if (selector.type === 'CssSelector') {
        const root = selector.value.startsWith(':scope') ? document.querySelector('main') : document;
        if (selector.value === ':scope') return root;
        return root?.querySelector(selector.value) ?? null;
    }
    return null;
}

// The cue playing at a time, in seconds
export function cueAtTime(cues, time) {
    return cues.find(cue => cue.startTime <= time && time < cue.endTime) ?? null;
}

// The cue whose element is this one, holds it, or is inside it
export function cueForElement(cues, target) {
    return cues.find(cue => {
        const elm = elmForCue(cue);
        return elm && (elm === target || elm.contains(target) || target.contains(elm));
    }) ?? null;
}

export function cacheCueElements(track) {
    for (const cue of Array.from(track?.cues || [])) elmForCue(cue);
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

// A cue whose plain fragment is the narrated element's own id (a heading, say) is already
// phrase-precise in the hash, so it needs no audio time in the URL.
export function cueNeedsTime(cue, elm) {
    try {
        const selector = JSON.parse(cue.text).selector;
        return !(selector?.type === 'FragmentSelector' && !selector.refinedBy && selector.value === elm?.id);
    } catch {
        return true;
    }
}
