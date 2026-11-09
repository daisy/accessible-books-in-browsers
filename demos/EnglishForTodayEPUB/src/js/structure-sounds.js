// Sounds that tell a listener what kind of content narration is reading, like a screen reader's
// speech and sounds schemes: two rising piano notes as a heading starts (lower for higher-level
// headings), a small bell as a footnote or endnote starts, and two wood knocks, rising as narration
// enters a list or table and falling as it leaves (by reading on, or by Skip past). Generated here,
// so books need no sound files, and played from a Web Audio context of their own: the narration
// itself never goes through Web Audio, which would lose the lock screen controls on iOS. Narration
// stops for a moment just before the phrase, so the sound comes before its first words rather than
// over them. Only reading makes these sounds: stepping or seeking to a phrase doesn't.

import { cueAtTime, elmForCue } from './cue-selector.js';
import { pageAudio } from './dom-utils.js';
import { canPlay } from './skippability.js';

const NOTE_SELECTOR = '.epubtype_footnote, .epubtype_endnote, .epubtype_note, [role="doc-footnote"], [role="doc-endnote"]';
const NOTES_SECTION_SELECTOR = '.epubtype_endnotes, [role="doc-endnotes"]';
const HEADING_SELECTOR = 'h1, h2, h3, h4, h5, h6, [role="heading"]';
const LIST_OR_TABLE_SELECTOR = 'ul, ol, dl, table, [role="list"], [role="table"], [role="grid"]';
const RATE = 44100;
const VOLUME = .35;
// How long narration waits for a sound (its tail rings on under the phrase), and for each further one
const PAUSE_SECONDS = .3;
const PAUSE_SECONDS_PER_EXTRA_SOUND = .25;

// Each sound: its setting, and its notes as [frequency (Hz), start (s), length (s), timbre]
const SOUNDS = {
    'heading-1': [[392, 0, .35, 'piano'], [523.25, .09, .4, 'piano']],
    'heading-2': [[440, 0, .3, 'piano'], [587.33, .08, .35, 'piano']],
    'heading-3': [[523.25, 0, .25, 'piano'], [659.25, .07, .3, 'piano']],
    note: [[1760, 0, .45, 'bell']],
    enter: [[520, 0, .07, 'wood'], [700, .11, .07, 'wood']],
    exit: [[700, 0, .07, 'wood'], [520, .11, .07, 'wood']]
};
const SETTINGS = [
    { key: 'webbook-sound-headings', id: 'webbook-sound-headings-toggle', label: 'Tone before headings', sample: 'heading-1' },
    { key: 'webbook-sound-notes', id: 'webbook-sound-notes-toggle', label: 'Bell before footnotes and endnotes', sample: 'note' },
    { key: 'webbook-sound-lists-tables', id: 'webbook-sound-lists-tables-toggle', label: 'Knocks entering and leaving lists and tables', sample: 'enter' }
];
const [HEADINGS, NOTES, LISTS_AND_TABLES] = SETTINGS;
let context = null;
const buffers = {};
// The phrase narration last reached, to tell what changed at the next
let lastElm = null;
// While narration waits for a sound: the timer that resumes it
let soundPause = null;
// The timer that stops narration just before the next phrase with a sound
let nextSound = null;
// What the coming seek is: 'own' (resuming after a sound), 'keep' (see keepSoundsForSeek), or the reader's
let expectedSeek = null;

function enabled({ key }) {
    try { return localStorage.getItem(key) === 'true'; } catch { return false; }
}

function renderNote(data, [frequency, start, length, timbre]) {
    const from = Math.round(start * RATE);
    const count = Math.round(length * RATE);
    for (let i = 0; i < count && from + i < data.length; i++) {
        const t = i / RATE;
        const attack = Math.min(1, i / (RATE * .004));
        let sample;
        if (timbre === 'bell') {
            // A high partial and an inharmonic one that dies away faster
            sample = Math.exp(-t * 7) * (Math.sin(2 * Math.PI * frequency * t) + .5 * Math.sin(2 * Math.PI * frequency * 2.76 * t) * Math.exp(-t * 14));
        } else if (timbre === 'wood') {
            // Two inharmonic partials that stop almost at once
            sample = Math.exp(-t * 60) * (Math.sin(2 * Math.PI * frequency * t) + .6 * Math.sin(2 * Math.PI * frequency * 1.58 * t));
        } else {
            // A fundamental and two harmonics, decaying like a struck string
            sample = Math.exp(-t * 9) * (Math.sin(2 * Math.PI * frequency * t) + .4 * Math.sin(4 * Math.PI * frequency * t) + .15 * Math.sin(6 * Math.PI * frequency * t));
        }
        data[from + i] += attack * sample;
    }
}

function buffer(ctx, name) {
    if (!buffers[name]) {
        const notes = SOUNDS[name];
        const length = Math.max(...notes.map(([, start, len]) => start + len)) + .02;
        const data = new Float32Array(Math.ceil(length * RATE));
        notes.forEach(note => renderNote(data, note));
        const peak = data.reduce((max, sample) => Math.max(max, Math.abs(sample)), 0) || 1;
        for (let i = 0; i < data.length; i++) data[i] /= peak;
        buffers[name] = ctx.createBuffer(1, data.length, RATE);
        buffers[name].copyToChannel(data, 0);
    }
    return buffers[name];
}

function audioContext() {
    if (!context) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return null;
        context = new AudioContextClass();
    }
    return context;
}

// Sounds for one phrase play one after another
function play(names) {
    const ctx = audioContext();
    if (!ctx || !names.length) return false;
    if (ctx.state !== 'running') ctx.resume().catch(() => {});
    let when = ctx.currentTime;
    for (const name of names) {
        const source = ctx.createBufferSource();
        const gain = ctx.createGain();
        gain.gain.value = VOLUME;
        source.buffer = buffer(ctx, name);
        source.connect(gain).connect(ctx.destination);
        source.start(when);
        when += source.buffer.duration + .05;
    }
    return true;
}

export function pausedForSound() {
    return Boolean(soundPause);
}

// The reader pressed pause (or play) while narration waited: theirs wins
export function cancelSoundPause() {
    if (!soundPause) return;
    clearTimeout(soundPause);
    soundPause = null;
}

// For moves along the reading (skipping a note, Skip past, going to a note), whose phrase gets its
// sound. Any other move is the reader's (a phrase step, the seek bar): no sound where they land.
export function keepSoundsForSeek() {
    expectedSeek = 'keep';
}

function cuesOf(audio) {
    return Array.from(audio.querySelector('track')?.track?.cues || []);
}

function cueAt(audio, time) {
    return cueAtTime(cuesOf(audio), time);
}

function headingLevel(heading) {
    const level = Number(heading.getAttribute('aria-level') || heading.tagName.slice(1));
    return Number.isFinite(level) && level > 0 ? level : 2;
}

// Lists that hold notes (a book's endnotes are often an ol), and lists and tables inside a note,
// are left to the note's bell
function listsAndTablesAround(elm) {
    const found = [];
    for (let node = elm?.closest(LIST_OR_TABLE_SELECTOR); node; node = node.parentElement?.closest(LIST_OR_TABLE_SELECTOR)) {
        if (!node.closest(`${NOTE_SELECTOR}, ${NOTES_SECTION_SELECTOR}`) && !node.querySelector(NOTE_SELECTOR)) found.push(node);
    }
    return found;
}

// The sounds for narration moving from one phrase to the next. Leaving a list or table (a nested
// one too) comes first, then entering one, then a heading or note starting, each once however
// deep the nesting.
function soundsFor(from, to) {
    const sounds = [];
    if (enabled(LISTS_AND_TABLES)) {
        const before = listsAndTablesAround(from);
        const now = listsAndTablesAround(to);
        if (before.some(structure => !now.includes(structure))) sounds.push('exit');
        if (now.some(structure => !before.includes(structure))) sounds.push('enter');
    }
    const heading = to.closest(HEADING_SELECTOR);
    const note = to.closest(NOTE_SELECTOR);
    if (heading && heading !== from?.closest(HEADING_SELECTOR) && enabled(HEADINGS)) sounds.push(`heading-${Math.min(3, headingLevel(heading))}`);
    else if (note && note !== from?.closest(NOTE_SELECTOR) && enabled(NOTES)) sounds.push('note');
    return sounds;
}

// Plays the sounds for narration reaching a phrase, holding narration meanwhile and then going on
// from resumeAt. Returns whether there were any.
function soundBefore(audio, elm, resumeAt) {
    const sounds = soundsFor(lastElm, elm);
    lastElm = elm;
    if (!play(sounds)) return false;
    clearTimeout(nextSound);
    cancelSoundPause();
    soundPause = setTimeout(() => {
        soundPause = null;
        if (!audio.paused) return;
        expectedSeek = 'own';
        audio.currentTime = resumeAt;
        audio.play().catch(() => {});
    }, (PAUSE_SECONDS + PAUSE_SECONDS_PER_EXTRA_SOUND * (sounds.length - 1)) * 1000);
    audio.pause();
    return true;
}

// Time updates come too late to stop before a phrase starts (and a little of it would be heard
// twice), so a timer stops narration just before the next phrase that has a sound
function scheduleNextSound(audio) {
    clearTimeout(nextSound);
    if (!SETTINGS.some(enabled) || audio.paused || soundPause) return;
    const next = cuesOf(audio).find(cue => cue.startTime > audio.currentTime + .01);
    const elm = next && elmForCue(next);
    // A skipped phrase is skipped by seeking past it, and the phrase after is scheduled then
    if (!elm || !canPlay(elm) || !soundsFor(lastElm, elm).length) return;
    nextSound = setTimeout(() => {
        if (audio.paused || soundPause) return;
        if (audio.currentTime < next.startTime - .3 || audio.currentTime > next.startTime + .15) return scheduleNextSound(audio);
        soundBefore(audio, elm, next.startTime);
    }, Math.max(0, ((next.startTime - audio.currentTime) / (audio.playbackRate || 1) - .03) * 1000));
}

// Called for each phrase narration reads. Its sound has usually played before it started; this
// catches the rest.
export function soundForNarratedPhrase(elm) {
    const audio = pageAudio();
    // Stepping through phrases while paused makes no sound, and leaves narration's place where it was
    if (!audio || audio.paused) return;
    if (elm !== lastElm) {
        const cue = cueAt(audio, audio.currentTime);
        if (soundBefore(audio, elm, cue && elmForCue(cue) === elm ? cue.startTime : audio.currentTime)) return;
    }
    scheduleNextSound(audio);
}

// Pressing Play: the phrase's sound comes before any of it is heard. Started partway through a
// phrase, narration goes on from there.
function handlePlay(audio) {
    cancelSoundPause();
    const cue = cueAt(audio, audio.currentTime);
    const elm = cue && elmForCue(cue);
    if (elm && elm !== lastElm && canPlay(elm)
        && soundBefore(audio, elm, audio.currentTime - cue.startTime < .35 ? cue.startTime : audio.currentTime)) return;
    scheduleNextSound(audio);
}

function handleSeeking(audio) {
    clearTimeout(nextSound);
    const kind = expectedSeek;
    expectedSeek = null;
    // Moving while paused: Play will sound for where it is
    if (audio.paused) return;
    // Resuming after a sound, whose seek comes after its play
    if (kind === 'own') return scheduleNextSound(audio);
    const cue = cueAt(audio, audio.currentTime);
    const elm = cue && elmForCue(cue);
    if (kind === 'keep') {
        if (elm && canPlay(elm) && audio.currentTime - cue.startTime < .05 && soundBefore(audio, elm, cue.startTime)) return;
    } else {
        const landed = elm || elmForCue(cuesOf(audio).find(cue => cue.startTime > audio.currentTime) || {});
        if (landed) lastElm = landed;
    }
    scheduleNextSound(audio);
}

// Browsers only let a page start sound after the reader has interacted with it, and narration can
// reach a heading or note long after that, so the context is started on the reader's presses until
// it runs. A touch counts only as it ends (pointerdown doesn't, on iOS), and iOS needs a sound
// started during the press, so a silent one is.
const UNLOCK_EVENTS = ['pointerup', 'touchend', 'click', 'keydown'];

function unlockOnPress() {
    const unlock = () => {
        if (!SETTINGS.some(enabled)) return;
        const ctx = audioContext();
        if (!ctx) return;
        if (ctx.state !== 'running') {
            ctx.resume().catch(() => {});
            const source = ctx.createBufferSource();
            source.buffer = ctx.createBuffer(1, 1, RATE);
            source.connect(ctx.destination);
            source.start();
            return;
        }
        UNLOCK_EVENTS.forEach(type => document.removeEventListener(type, unlock, true));
    };
    UNLOCK_EVENTS.forEach(type => document.addEventListener(type, unlock, true));
}

// Web Audio on iOS follows the ringer switch, unlike narration, unless the page says it plays media
function playEvenOnSilent() {
    try {
        if (navigator.audioSession && SETTINGS.some(enabled)) navigator.audioSession.type = 'playback';
    } catch { /* not supported */ }
}

// The UI creates these settings itself, so books converted before they existed get them too
function buildSettings() {
    const fieldset = document.querySelector('#webbook-settings fieldset');
    if (!fieldset) return;
    let after = (document.getElementById('webbook-note-auto-return-toggle') || document.getElementById('webbook-skip-footnote-toggle'))?.closest('div');
    if (after?.parentElement !== fieldset) after = null;
    for (const setting of SETTINGS) {
        if (document.getElementById(setting.id)) continue;
        const row = document.createElement('div');
        const label = document.createElement('label');
        label.htmlFor = setting.id;
        label.textContent = setting.label;
        const toggle = document.createElement('input');
        toggle.type = 'checkbox';
        toggle.id = setting.id;
        toggle.checked = enabled(setting);
        toggle.addEventListener('change', () => {
            try { localStorage.setItem(setting.key, String(toggle.checked)); } catch { /* this session only */ }
            // Turning it on is a press, so the sound can be heard straight away
            if (toggle.checked) {
                playEvenOnSilent();
                play([setting.sample]);
            }
        });
        row.append(label, toggle);
        if (after) after.after(row);
        else fieldset.append(row);
        after = row;
    }
}

export function initStructureSounds() {
    buildSettings();
    playEvenOnSilent();
    unlockOnPress();
    // The audio element can arrive with a later page, so listen on the document
    const on = (type, handler) => document.addEventListener(type, e => { if (e.target === pageAudio()) handler(e.target); }, { capture: true });
    // A play event queued before a pause arrives after it, with the audio paused: not the reader's
    on('play', audio => { if (!audio.paused) handlePlay(audio); });
    on('pause', () => clearTimeout(nextSound));
    on('seeking', handleSeeking);
    on('ratechange', audio => scheduleNextSound(audio));
}
