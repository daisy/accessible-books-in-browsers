import { elmForCue } from './cue-selector.js';
import { registerAction, announceReaderAction } from './reader-actions.js';
import { highlightElm, clearNarrationHighlight } from './narration-position.js';
import { showCaptionForCue, clearCaption } from './caption-mode.js';
import { cancelSkipPreroll, canPlay } from './skippability.js';
import { pageAudio } from './dom-utils.js';
import { keepSoundsForSeek } from './structure-sounds.js';
import { showShortcutHint } from './keyboard-shortcuts.js';
import { canReturnFromNote } from './notes-in-place.js';

// Escapability offers a way out of the current structure. Exclusion from narration
// is a separate preference in skippability.js, never a reason to create a button.
const ESCAPABLE_STRUCTURE_RULES = [
    // An equation narration reads on its own (user, 2026-11-11). MathML keeps its tag name lowercase
    // in an HTML page. webbook-equation: a numbered display equation (plan 24).
    { classes: ['webbook-equation'], tags: ['math'], label: 'equation' },
    { classes: ['epubtype_table'], tags: ['TABLE'], label: 'table' },
    { classes: ['epubtype_list'], tags: ['OL', 'UL'], label: 'list' },
    { classes: ['epubtype_figure'], tags: ['FIGURE'], label: 'figure' },
    { classes: ['epubtype_sidebar'], tags: [], label: 'sidebar' },
    { classes: ['epubtype_footnote'], tags: [], roles: ['doc-footnote'], label: 'note' },
    { classes: ['epubtype_endnote'], tags: [], roles: ['doc-endnote'], label: 'note' },
    { classes: ['epubtype_note'], tags: [], label: 'note' },
];
const NOTES_SECTION_SELECTOR = '.epubtype_endnotes, [role="doc-endnotes"]';

export function findEscapableStructure(elm) {
    const main = document.querySelector('main');
    let node = elm;
    while (node && node !== main) {
        if (node.matches(NOTES_SECTION_SELECTOR)) return { elm: node, label: 'notes' };
        const section = node.closest(NOTES_SECTION_SELECTOR);
        const rule = ESCAPABLE_STRUCTURE_RULES.find(rule => matchesStructureRule(node, rule));
        if (rule) {
            // Individual endnotes and their organizing list belong to the section's
            // escape. A real list/table inside a note still has its own way out.
            const noteAncestor = node.parentElement?.closest('li, .epubtype_endnote, .epubtype_footnote, .epubtype_note, [role="doc-endnote"], [role="doc-footnote"]');
            const organizingList = section && rule.label === 'list'
                && (!noteAncestor || !section.contains(noteAncestor));
            if (!(section && rule.label === 'note') && !organizingList) return { elm: node, label: rule.label };
        }
        node = node.parentElement;
    }
    return null;
}

function matchesStructureRule(elm, rule) {
    return rule.tags.includes(elm.tagName) || rule.classes.some(c => elm.classList.contains(c))
        || rule.roles?.some(role => (elm.getAttribute('role') || '').split(/\s+/).includes(role));
}

// The first phrase after the structure that the reader's skip settings don't skip; when the
// structure runs to the end of the page, the next page
function getEscapeTarget(ancestor, track, fromIdx) {
    const cues = Array.from(track.cues);
    for (let i = fromIdx + 1; i < cues.length; i++) {
        const elm = elmForCue(cues[i]);
        if (elm && !ancestor.contains(elm) && canPlay(elm)) return { cue: cues[i], elm, track };
    }
    const nextPage = document.querySelector('#webbook-spine-nav a[rel=next][href]');
    if (nextPage) return { nextPage };
    // There is still a way out of the last structure: finish its narration and stop.
    return cues.length ? { endTime: cues[cues.length - 1].endTime } : null;
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
        // A reference visit already has Back to text. Escape uses the same return
        // action, but there must not be a second visible button for it.
        escapeBtn.hidden = Boolean(escapeTarget?.noteReturn);
        escapeBtn.disabled = escapeBtn.hidden;
        escapeBtn.dataset.escapeTime = escapeTime;
        showShortcutHint(escapeBtn, 'skip-past');
    }
    if (escapeStatus) {
        if (escapeTarget?.noteReturn) escapeStatus.textContent = '';
        else if (announce) escapeStatus.textContent = `Inside ${label}. Leave ${label} button available.`;
    }
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
    // A note narration was sent to: notes-in-place.js takes the reader back to the text instead
    const skipping = new CustomEvent('webbook:skippast', { cancelable: true, detail: { structure } });
    if (!document.dispatchEvent(skipping)) {
        hideEscape();
        return;
    }
    // The visit may have ended since the button was shown.
    if (target.noteReturn) {
        hideEscape();
        return;
    }
    if (typeof target.endTime === 'number') {
        cancelSkipPreroll(audio);
        audio.pause();
        audio.currentTime = Math.min(target.endTime, audio.duration || target.endTime);
        hideEscape();
        clearNarrationHighlight();
        clearCaption();
        announceReaderAction('End of book.');
        return;
    }
    // Following the next-page link keeps narration playing there if it's playing here (player.js)
    if (target.nextPage) {
        cancelSkipPreroll(audio);
        hideEscape();
        target.nextPage.click();
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
    return Boolean(currentEscapableStructure && escapeTarget && pageAudio());
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
    const target = canReturnFromNote(escapableStructure.elm) ? { noteReturn: true }
        : getEscapeTarget(escapableStructure.elm, track, activeCueIdx);
    if (!target) {
        hideEscape();
        return;
    }
    const isNew = escapableStructure.elm !== currentEscapableStructure;
    currentEscapableStructure = escapableStructure.elm;
    escapeTarget = target;
    showEscape(escapableStructure, target.cue ? target.cue.startTime : target.noteReturn ? 'note-return'
        : typeof target.endTime === 'number' ? target.endTime : 'next-page', isNew);
}

// A reference visit can change the available way out without changing the cue.
export function refreshCurrentEscape() {
    const audio = pageAudio();
    const track = audio?.querySelector('track')?.track;
    const cues = Array.from(track?.cues || []);
    const index = cues.findIndex(cue => cue.startTime <= audio.currentTime && audio.currentTime < cue.endTime);
    const elm = index >= 0 ? elmForCue(cues[index]) : null;
    if (elm) handleEscapableStructure(elm, track, index);
    else hideEscape();
}

export function initEscapability() {
    escapeBtn = document.querySelector('#webbook-escape-btn');
    escapeStatus = document.querySelector('#webbook-escape-status');
    escapeLabelEl = document.querySelector('#webbook-escape-label');

    if (escapeBtn) {
        // Upgrade the label in already-converted books as well as new templates.
        const prefix = Array.from(escapeBtn.childNodes).find(node => node.nodeType === 3 && node.textContent.trim());
        if (prefix) prefix.textContent = 'Leave ';
        escapeBtn.addEventListener('click', activateEscape);
    }

    registerAction({ id: 'skip-past', label: 'Leave current table, list, note or other structure', group: 'Narration',
        defaultKeys: [{ code: 'Escape' }], run: activateCurrentEscape, isAvailable: canActivateCurrentEscape });
}
