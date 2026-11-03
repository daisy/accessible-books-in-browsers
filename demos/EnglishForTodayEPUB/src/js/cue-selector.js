export function selectElm(selector) {
    if (selector.type === 'FragmentSelector') return document.querySelector(`#${selector.value}`);
    if (selector.type === 'CssSelector') return document.querySelector(selector.value);
    return null;
}

export function elmForCue(cue) {
    try {
        return selectElm(JSON.parse(cue.text).selector);
    } catch {
        return null;
    }
}
