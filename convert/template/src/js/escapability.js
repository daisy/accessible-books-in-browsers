import { selectElm } from './cue-selector.js';
import { isAnyPopoverOpen } from './dom-utils.js';

// Escapability: offer a Skip past button for the enclosing structure during playback.
const ESCAPABLE_STRUCTURE_RULES = [
    { classes: ['epubtype_table'], tags: ['TABLE'], label: 'table' },
    { classes: ['epubtype_list'], tags: ['OL', 'UL'], label: 'list' },
    { classes: ['epubtype_figure'], tags: ['FIGURE'], label: 'figure' },
    { classes: ['epubtype_sidebar'], tags: [], label: 'sidebar' },
    { classes: ['epubtype_footnote'], tags: [], label: 'footnote' },
    { classes: ['epubtype_endnote'], tags: [], label: 'endnote' },
    { classes: ['epubtype_note'], tags: [], label: 'note' },
];

function findEscapableStructure(elm) {
    const main = document.querySelector('main');
    let node = elm;
    while (node && node !== main) {
        const rule = ESCAPABLE_STRUCTURE_RULES.find(rule => matchesStructureRule(node, rule));
        if (rule) return { elm: node, label: rule.label };
        node = node.parentElement;
    }
    return null;
}

function matchesStructureRule(elm, rule) {
    return rule.tags.includes(elm.tagName) || rule.classes.some(c => elm.classList.contains(c));
}

function getEscapeTime(ancestor, track, fromIdx) {
    const cues = Array.from(track.cues);
    for (let i = fromIdx + 1; i < cues.length; i++) {
        try {
            const elm = selectElm(JSON.parse(cues[i].text).selector);
            if (elm && !ancestor.contains(elm)) return cues[i].startTime;
        } catch { /* skip malformed cue */ }
    }
    return null;
}

let escapeBtn;
let escapeStatus;
let escapeLabelEl;
let currentEscapableStructure = null;

function showEscape(structure, escapeTime, announce) {
    const label = structure.label;
    if (escapeLabelEl) escapeLabelEl.textContent = label;
    if (escapeBtn) {
        escapeBtn.hidden = false;
        escapeBtn.disabled = false;
        escapeBtn.dataset.escapeTime = escapeTime;
    }
    if (announce && escapeStatus) escapeStatus.textContent = `Inside ${label}. Skip past button available.`;
}

export function hideEscape() {
    if (escapeBtn) {
        escapeBtn.hidden = true;
        escapeBtn.disabled = true;
        delete escapeBtn.dataset.escapeTime;
    }
    if (escapeLabelEl) escapeLabelEl.textContent = '';
    if (escapeStatus) escapeStatus.textContent = '';
    currentEscapableStructure = null;
}

function activateEscape() {
    const t = parseFloat(escapeBtn.dataset.escapeTime);
    const audio = document.querySelector('audio');
    if (!isNaN(t) && audio) audio.currentTime = t;
    hideEscape();
}

export function canActivateCurrentEscape() {
    return Boolean(escapeBtn && !escapeBtn.hidden && !escapeBtn.disabled && escapeBtn.dataset.escapeTime);
}

export function activateCurrentEscape() {
    if (!canActivateCurrentEscape()) return false;
    activateEscape();
    return true;
}

// Called from the player's cuechange handler with the currently-narrated element, so the
// escape-pill state lives entirely in this module rather than being poked at from outside.
export function handleEscapableStructure(elm, track, activeCueIdx) {
    const escapableStructure = findEscapableStructure(elm);
    if (!escapableStructure) {
        hideEscape();
        return;
    }
    const escapeTime = getEscapeTime(escapableStructure.elm, track, activeCueIdx);
    if (escapeTime === null) {
        hideEscape();
        return;
    }
    const isNew = escapableStructure.elm !== currentEscapableStructure;
    currentEscapableStructure = escapableStructure.elm;
    showEscape(escapableStructure, escapeTime, isNew);
}

export function initEscapability() {
    escapeBtn = document.querySelector('#webbook-escape-btn');
    escapeStatus = document.querySelector('#webbook-escape-status');
    escapeLabelEl = document.querySelector('#webbook-escape-label');

    if (escapeBtn) {
        escapeBtn.addEventListener('click', activateEscape);
    }

    // Single-keystroke escape for non-visual users: plain Escape, not a modifier combo — this
    // project already removed its old Ctrl+Alt+* shortcuts specifically because they clashed
    // with JAWS/NVDA's own commands, and a new shortcut must not repeat that. Only acts while
    // the escape pill is actually showing, so Escape's native behavior (closing an open
    // popover) is completely unaffected the rest of the time.
    document.addEventListener('keydown', e => {
        if (e.key !== 'Escape' || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
        if (!escapeBtn || escapeBtn.hidden || escapeBtn.disabled) return;
        if (isAnyPopoverOpen()) return;
        e.preventDefault();
        activateCurrentEscape();
    });
}
