// Saved preferences must also be listed in settings-file.js (export, import and reset).
import { elmForCue } from './cue-selector.js';
import { hideEscape } from './escapability.js';
import { captionModeEnabled, showCaptionForCurrentState } from './caption-mode.js';
import { keepSoundsForSeek } from './structure-sounds.js';

const SKIP_SEEK_PREROLL_SECONDS = 0.2;
const SKIP_UNMUTE_BEFORE_TARGET_SECONDS = 0.05;

// Skippability: when enabled, do not play cues inside these structure types. Footnotes and
// endnotes are skipped unless the reader turns that off: following a note reference, or the note
// button narration shows for a phrase with notes, reads the note and comes back, so reading them
// in the flow as well would repeat them (and a book's endnotes section would be read at its end).
export const SKIPPABLE_STRUCTURE_RULES = [
    { classes: ['epubtype_pagebreak'],               key: 'webbook-skip-pagebreak', id: 'webbook-skip-pagebreak-toggle' },
    { classes: ['epubtype_footnote', 'epubtype_endnote', 'epubtype_endnotes'], key: 'webbook-skip-footnote', id: 'webbook-skip-footnote-toggle', skipByDefault: true },
    { classes: ['epubtype_note'],                    key: 'webbook-skip-note',      id: 'webbook-skip-note-toggle' },
    { classes: ['epubtype_sidebar'],                 key: 'webbook-skip-sidebar',   id: 'webbook-skip-sidebar-toggle' },
];

let skipSeekIgnoreUntil = 0;
let skipMuteUntil = 0;
// The id of a structure the reader asked to hear (a note they went to), played even if its kind is
// skipped. By id, so it can be set before the note's page has loaded.
let playableExceptionId = '';

function skipping({ key, skipByDefault }) {
    let stored = null;
    try { stored = localStorage.getItem(key); } catch { /* use the default */ }
    return stored === null ? Boolean(skipByDefault) : stored === 'true';
}

export function canPlay(elm) {
    if (playableExceptionId && elm.closest(`[id="${CSS.escape(playableExceptionId)}"]`)) return true;
    for (const rule of SKIPPABLE_STRUCTURE_RULES) {
        if (findClosestWithAnyClass(elm, rule.classes)) return !skipping(rule);
    }
    return true;
}

export function allowPlaybackOf(id) {
    playableExceptionId = id || '';
}

export function clearPlaybackException() {
    playableExceptionId = '';
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
        keepSoundsForSeek();
        audio.currentTime = Math.max(0, nextCue.startTime - SKIP_SEEK_PREROLL_SECONDS);
        // Sound back on just before the next phrase, timed once the seek has landed: waiting for
        // timeupdate (every quarter second in Safari) could clip the phrase's first syllable
        audio.addEventListener('seeked', () => scheduleUnmute(audio), { once: true });
    } else {
        skipSeekIgnoreUntil = 0;
        skipMuteUntil = 0;
        keepSoundsForSeek();
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

let unmuteTimer = 0;
function scheduleUnmute(audio) {
    clearTimeout(unmuteTimer);
    if (!skipMuteUntil) return;
    // Aimed at just before the phrase: the audio clock runs a little behind a timer right after a
    // seek, so the margin timeupdate needs (SKIP_UNMUTE_BEFORE_TARGET_SECONDS) let the skipped
    // structure's last moment through
    const left = (skipMuteUntil + SKIP_UNMUTE_BEFORE_TARGET_SECONDS - .01 - audio.currentTime) / (audio.playbackRate || 1);
    unmuteTimer = setTimeout(() => clearSkipMute(audio), Math.max(0, left * 1000));
}

export function clearSkipMute(audio) {
    clearTimeout(unmuteTimer);
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
    clearTimeout(skipAheadTimer);
    if (!canPlay(elm)) {
        if (audio.currentTime >= skipSeekIgnoreUntil) skipCue(audio, track, activeCueIdx, cue);
        return false;
    }
    skipSeekIgnoreUntil = 0;
    scheduleSkipAhead(audio, track, activeCueIdx, cue);
    return true;
}

// The cuechange for a skipped cue comes a moment after it starts (up to a quarter of a second, as
// timeupdate goes), so its first syllable was heard before the seek: a stutter, e.g. at "The lamp
// was lit" after a skipped footnote in the Notes Test Book (user, 2026-11-10). So while the phrase
// before a skipped one plays, the skip is timed for that phrase's end. The cuechange is still
// there as a fallback, after a pause or a change of speed.
let skipAheadTimer = 0;
const SKIP_AHEAD_MARGIN_SECONDS = 0.03;
function scheduleSkipAhead(audio, track, activeCueIdx, cue) {
    const cues = track.cues;
    const next = cues?.[activeCueIdx + 1];
    const nextElm = next ? elmForCue(next) : null;
    if (!nextElm || canPlay(nextElm)) return;
    const check = () => {
        if (audio.paused || track !== (audio.querySelector('track')?.track ?? track)) return;
        const time = audio.currentTime;
        if (time < cue.startTime - .05 || time > cue.endTime + .25) return;
        const left = (cue.endTime - time) / (audio.playbackRate || 1);
        if (left > SKIP_AHEAD_MARGIN_SECONDS + .01) {
            skipAheadTimer = setTimeout(check, Math.max(10, (left - SKIP_AHEAD_MARGIN_SECONDS) * 1000));
            return;
        }
        skipCue(audio, track, activeCueIdx, cue);
    };
    const left = (cue.endTime - audio.currentTime) / (audio.playbackRate || 1);
    skipAheadTimer = setTimeout(check, Math.max(0, (left - SKIP_AHEAD_MARGIN_SECONDS) * 1000));
}

export function initSkippability() {
    for (const { key, id } of SKIPPABLE_STRUCTURE_RULES) {
        const toggle = document.querySelector(`#${id}`);
        if (!toggle) continue;
        toggle.checked = skipping(SKIPPABLE_STRUCTURE_RULES.find(rule => rule.key === key));
        toggle.addEventListener('change', () => {
            localStorage.setItem(key, toggle.checked);
            if (captionModeEnabled) showCaptionForCurrentState();
        });
    }
}
