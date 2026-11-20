// template/src/js/cue-selector.js
var elementByCue = /* @__PURE__ */ new WeakMap();
function selectElm(selector) {
  if (selector.type === "FragmentSelector") {
    const anchor = document.getElementById(selector.value);
    return selector.refinedBy ? anchor?.querySelector(selector.refinedBy.value) ?? null : anchor;
  }
  if (selector.type === "CssSelector") {
    const root = selector.value.startsWith(":scope") ? document.querySelector("main") : document;
    if (selector.value === ":scope") return root;
    return root?.querySelector(selector.value) ?? null;
  }
  return null;
}
function cueAtTime(cues, time) {
  return cues.find((cue) => cue.startTime <= time && time < cue.endTime) ?? null;
}
function cueForElement(cues, target) {
  return cues.find((cue) => {
    const elm = elmForCue(cue);
    return elm && (elm === target || elm.contains(target) || target.contains(elm));
  }) ?? null;
}
function cacheCueElements(track) {
  for (const cue of Array.from(track?.cues || [])) elmForCue(cue);
}
function elmForCue(cue) {
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
function cueNeedsTime(cue, elm) {
  try {
    const selector = JSON.parse(cue.text).selector;
    return !(selector?.type === "FragmentSelector" && !selector.refinedBy && selector.value === elm?.id);
  } catch {
    return true;
  }
}

export {
  selectElm,
  cueAtTime,
  cueForElement,
  cacheCueElements,
  elmForCue,
  cueNeedsTime
};
