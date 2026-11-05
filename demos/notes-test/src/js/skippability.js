import { elmForCue } from './cue-selector.js';
import { hideEscape } from './escapability.js';
import { captionModeEnabled, showCaptionForCurrentState } from './caption-mode.js';

const SKIP_SEEK_PREROLL_SECONDS = 0.2;
const SKIP_UNMUTE_BEFORE_TARGET_SECONDS = 0.05;

// Skippability: when enabled, do not play cues inside these structure types.
export const SKIPPABLE_STRUCTURE_RULES = [
    { classes: ['epubtype_pagebreak'],               key: 'webbook-skip-pagebreak', id: 'webbook-skip-pagebreak-toggle' },
    { classes: ['epubtype_footnote', 'epubtype_endnote'], key: 'webbook-skip-footnote', id: 'webbook-skip-footnote-toggle' },
    { classes: ['epubtype_note'],                    key: 'webbook-skip-note',      id: 'webbook-skip-note-toggle' },
    { classes: ['epubtype_sidebar'],                 key: 'webbook-skip-sidebar',   id: 'webbook-skip-sidebar-toggle' },
];

let skipSeekIgnoreUntil = 0;
let skipMuteUntil = 0;

export function canPlay(elm) {
    for (const { classes, key } of SKIPPABLE_STRUCTURE_RULES) {
        if (findClosestWithAnyClass(elm, classes)) {
            return localStorage.getItem(key) !== 'true';
        }
    }
    return true;
}

function findNextPlayableCue(cues, fromIdx) {
    for (let i = fromIdx + 1; i < cues.length; i++) {
        const elm = elmForCue(cues[i]);
        if (!elm || canPlay(elm)) return cues[i];
    }
    return null;
}

export function skipCue(audio, track, fromIdx, cue) {
    const nextCue = findNextPlayableCue(Array.from(track.cues), fromIdx);
    if (nextCue) {
        skipSeekIgnoreUntil = nextCue.startTime + SKIP_UNMUTE_BEFORE_TARGET_SECONDS;
        skipMuteUntil = Math.max(0, nextCue.startTime - SKIP_UNMUTE_BEFORE_TARGET_SECONDS);
        if (!audio.muted) {
            audio.dataset.webbookMutedForSkip = 'true';
            audio.muted = true;
        }
        audio.currentTime = Math.max(0, nextCue.startTime - SKIP_SEEK_PREROLL_SECONDS);
    } else {
        skipSeekIgnoreUntil = 0;
        skipMuteUntil = 0;
        audio.currentTime = Math.min(cue.endTime, audio.duration || cue.endTime);
    }
    hideEscape();
}

export function restoreSkipMute(audio) {
    if (!skipMuteUntil || audio.currentTime < skipMuteUntil) return;

    clearSkipMute(audio);
}

export function cancelSkipPreroll(audio) {
    skipSeekIgnoreUntil = 0;
    skipMuteUntil = 0;
    clearSkipMute(audio);
}

export function clearSkipMute(audio) {
    skipMuteUntil = 0;
    if (audio.dataset.webbookMutedForSkip === 'true') {
        audio.muted = false;
        delete audio.dataset.webbookMutedForSkip;
    }
}

export function findClosestWithAnyClass(elm, classes) {
    const main = document.querySelector('main');
    let node = elm;
    while (node && node !== main) {
        if (classes.some(c => node.classList.contains(c))) return node;
        node = node.parentElement;
    }
    return null;
}

// Called from the player's cuechange handler. Returns true when the cue's element is
// playable and narration should continue normally; returns false when it skipped ahead
// (or to the end) because the element falls inside a structure the reader has opted to skip.
export function handleCuePlayability(elm, audio, track, activeCueIdx, cue) {
    if (!canPlay(elm)) {
        if (audio.currentTime >= skipSeekIgnoreUntil) skipCue(audio, track, activeCueIdx, cue);
        return false;
    }
    skipSeekIgnoreUntil = 0;
    return true;
}

export function initSkippability() {
    for (const { key, id } of SKIPPABLE_STRUCTURE_RULES) {
        const toggle = document.querySelector(`#${id}`);
        if (!toggle) continue;
        toggle.checked = localStorage.getItem(key) === 'true';
        toggle.addEventListener('change', () => {
            localStorage.setItem(key, toggle.checked);
            if (captionModeEnabled) showCaptionForCurrentState();
        });
    }
}
