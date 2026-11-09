import { elmForCue } from './cue-selector.js';
import { registerAction } from './reader-actions.js';
import { highlightElm } from './narration-position.js';
import { showCaptionForCue } from './caption-mode.js';
import { cancelSkipPreroll, canPlay } from './skippability.js';
import { pageAudio } from './dom-utils.js';
import { keepSoundsForSeek } from './structure-sounds.js';

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
// Inside a book's endnotes section, Skip past leaves the whole section, not just one note
const NOTES_SECTION_SELECTOR = '.epubtype_endnotes, [role="doc-endnotes"]';

function findEscapableStructure(elm) {
    const notesSection = elm.closest(NOTES_SECTION_SELECTOR);
    if (notesSection && document.querySelector('main')?.contains(notesSection)) return { elm: notesSection, label: 'notes' };
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

// The first phrase after the structure that the reader's skip settings don't skip
function getEscapeTarget(ancestor, track, fromIdx) {
    const cues = Array.from(track.cues);
    for (let i = fromIdx + 1; i < cues.length; i++) {
        const elm = elmForCue(cues[i]);
        if (elm && !ancestor.contains(elm) && canPlay(elm)) return { cue: cues[i], elm, track };
    }
    return null;
}

let escapeBtn;
let escapeStatus;
let escapeLabelEl;
let currentEscapableStructure = null;
let escapeTarget = null;

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
    escapeTarget = null;
}

// Moves narration, the highlight and the view to the phrase after the structure straight away,
// rather than when that phrase starts playing, which never happens while paused
function activateEscape() {
    const target = escapeTarget;
    const structure = currentEscapableStructure;
    const audio = pageAudio();
    if (!target || !audio) {
        hideEscape();
        return;
    }
    // Focus follows only from where skipping is about the text: the Skip past button (which is
    // about to disappear), the book text, or nowhere. From a toolbar control it stays put.
    const active = document.activeElement;
    const moveFocus = !active || active === document.body || escapeBtn.contains(active)
        || Boolean(structure?.contains(active)) || Boolean(document.querySelector('main')?.contains(active));

    cancelSkipPreroll(audio);
    keepSoundsForSeek();
    audio.currentTime = target.cue.startTime;
    hideEscape();
    highlightElm(target.elm);
    showCaptionForCue(target.cue, target.track);
    if (moveFocus) {
        if (!target.elm.hasAttribute('tabindex')) target.elm.setAttribute('tabindex', '-1');
        target.elm.focus({ preventScroll: true });
    }
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
    const target = getEscapeTarget(escapableStructure.elm, track, activeCueIdx);
    if (!target) {
        hideEscape();
        return;
    }
    const isNew = escapableStructure.elm !== currentEscapableStructure;
    currentEscapableStructure = escapableStructure.elm;
    escapeTarget = target;
    showEscape(escapableStructure, target.cue.startTime, isNew);
}

export function initEscapability() {
    escapeBtn = document.querySelector('#webbook-escape-btn');
    escapeStatus = document.querySelector('#webbook-escape-status');
    escapeLabelEl = document.querySelector('#webbook-escape-label');

    if (escapeBtn) {
        escapeBtn.addEventListener('click', activateEscape);
    }

    registerAction({ id: 'skip-past', label: 'Skip past table, list or note', group: 'Narration',
        defaultKeys: [{ code: 'Escape' }], run: activateCurrentEscape, isAvailable: canActivateCurrentEscape });
}
