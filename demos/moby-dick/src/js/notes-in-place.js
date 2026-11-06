import { fetchPage, navigateTo } from './in-place-navigation.js';
import { elmForCue } from './cue-selector.js';
import { registerAction } from './reader-actions.js';
import { allowPlaybackOf, clearPlaybackException, cancelSkipPreroll } from './skippability.js';
import { pageAudio } from './dom-utils.js';

// Notes without losing your place. Following a note reference (or the note control that appears
// while narration reads a phrase with references) goes to the note, wherever it is in the book.
// If narration was playing, it reads the note and then goes back to the text and carries on; if
// not, the reader reads it. Back to text returns at any time, to exactly where the reader was.

const NOTE_SELECTOR = '.epubtype_footnote, .epubtype_endnote, .epubtype_note, [role="doc-footnote"], [role="doc-endnote"]';
const BACKLINK_SELECTOR = '[role="doc-backlink"], .epubtype_backlink';
let phraseButton;
let phraseMenu;
let status;
let phraseReferences = [];
let lastNoteReturn = null;
let phraseRequest = 0;
// While narration reads a note it was sent to: the note, and the time its narration ends
let autoReturn = null;

function referenceLabel(reference) {
    return reference.textContent.trim().replace(/^\[|\]$/g, '') || 'Note';
}

// The words just before the reference, which is how a reader tells a phrase's notes apart
function referenceContext(reference) {
    const passage = reference.closest('p, li, blockquote, figcaption, dd, dt') || reference.parentElement;
    if (!passage) return '';
    const clone = passage.cloneNode(true);
    const index = Array.from(passage.querySelectorAll('a[href]')).indexOf(reference);
    const clonedReference = clone.querySelectorAll('a[href]')[index];
    if (!clonedReference) return '';
    clonedReference.replaceWith(' WEBBOOKNOTE ');
    clone.querySelectorAll('a[href]').forEach(link => link.remove());
    const before = clone.textContent.replace(/\s+/g, ' ').split('WEBBOOKNOTE')[0] ?? '';
    const words = before.trim().split(/\s+/).filter(Boolean);
    return words.length ? `${words.length > 4 ? '…' : ''}${words.slice(-4).join(' ')}` : '';
}

function noteUrl(reference) {
    try { return new URL(reference.href, window.location.href); } catch { return null; }
}

function noteFromDocument(doc, url) {
    const id = url?.hash ? decodeURIComponent(url.hash.slice(1)) : '';
    const target = id ? doc.getElementById(id) : null;
    return target?.matches(NOTE_SELECTOR) ? target : target?.closest(NOTE_SELECTOR);
}

async function resolveNote(reference) {
    const url = noteUrl(reference);
    if (!url) return null;
    const here = new URL(window.location.href);
    if (url.origin === here.origin && url.pathname === here.pathname) {
        const note = noteFromDocument(document, url);
        return note ? { note, url, samePage: true } : null;
    }
    try {
        const doc = await fetchPage(url);
        const note = noteFromDocument(doc, url);
        return note ? { note, url, samePage: false } : null;
    } catch { return null; }
}

// The stretch of this page's narration that reads the note
function noteCueRange(note) {
    const track = pageAudio()?.querySelector('track')?.track;
    const cues = Array.from(track?.cues || []).filter(cue => {
        const elm = elmForCue(cue);
        return elm && (note === elm || note.contains(elm));
    });
    return cues.length ? { start: cues[0].startTime, end: cues[cues.length - 1].endTime } : null;
}

function returnRecord(reference) {
    const audio = pageAudio();
    return {
        href: window.location.href.split('#')[0] + (reference.id ? `#${encodeURIComponent(reference.id)}` : ''),
        scrollY: window.scrollY,
        audioTime: audio?.currentTime,
        autoplay: Boolean(audio && !audio.paused)
    };
}

function goToNote(reference) {
    const url = noteUrl(reference);
    if (!url) return;
    const origin = returnRecord(reference);
    // Which note this return belongs to: the address follows narration, so it can't tell
    origin.noteId = decodeURIComponent(url.hash.slice(1));
    lastNoteReturn = origin;
    // Read even when the reader skips this kind of note in the flow, now or when they press Play
    allowPlaybackOf(origin.noteId);
    const audio = pageAudio();
    const samePage = url.pathname === new URL(window.location.href).pathname;
    if (samePage) {
        navigateTo(url.href, { state: { webbookNoteReturn: origin }, autoplay: false });
        if (origin.autoplay) readNoteThenReturn();
    } else {
        // The note's page starts its narration at the note (the address's #id) and keeps playing
        // if narration was; readNoteThenReturn runs when it has loaded
        navigateTo(url.href, { state: { webbookNoteReturn: origin }, autoplay: origin.autoplay, moveFocus: true });
        if (origin.autoplay) document.addEventListener('webbook:pagechange', () => readNoteThenReturn(), { once: true });
    }
    if (!origin.autoplay) audio?.pause();
    setTimeout(showBackToText, 0);
}

// Narration was playing: read the note, then go back to the text. A note without narration is
// shown with narration paused, and Back to text resumes it.
function readNoteThenReturn() {
    const note = noteOfReturn();
    const audio = pageAudio();
    // A page just loaded in place may not have its narration timings yet
    const trackEl = audio?.querySelector('track');
    if (note && trackEl && trackEl.readyState < 2) {
        trackEl.addEventListener('load', () => readNoteThenReturn(), { once: true });
        return;
    }
    const range = note && noteCueRange(note);
    if (!audio || !range) {
        audio?.pause();
        return;
    }
    autoReturn = { note, end: range.end };
    // A skip the player may have started before this ran would leave the note muted
    cancelSkipPreroll(audio);
    audio.currentTime = range.start;
    audio.play().catch(() => {});
}

function handleTimeUpdate() {
    const audio = pageAudio();
    if (!autoReturn || !audio || audio.paused) return;
    if (audio.currentTime >= autoReturn.end - .05) {
        autoReturn = null;
        backToText();
    }
}

function noteOfReturn() {
    const origin = currentReturn();
    if (!origin) return null;
    return (origin.noteId && document.getElementById(origin.noteId))
        || noteFromDocument(document, new URL(window.location.href));
}

function currentReturn() {
    return history.state?.webbookNoteReturn || null;
}

// While the reader's Back to text shows, a book's own back links are hidden, so there's one
function showBackToText() {
    const button = document.getElementById('webbook-back-to-text');
    if (button) button.hidden = !currentReturn();
    document.documentElement.classList.toggle('webbook-note-return', Boolean(currentReturn()));
}

function dismissReturn() {
    autoReturn = null;
    clearPlaybackException();
    if (!currentReturn()) return;
    history.replaceState({ ...history.state, webbookNoteReturn: undefined }, '');
    showBackToText();
    lastNoteReturn = null;
}

async function backToText() {
    const origin = currentReturn();
    if (!origin) return false;
    autoReturn = null;
    clearPlaybackException();
    await navigateTo(origin.href, { push: false, replace: true, moveFocus: true, scrollY: origin.scrollY,
        audioTime: origin.audioTime, autoplay: origin.autoplay, state: null });
    lastNoteReturn = null;
    showBackToText();
    return true;
}

function referencesInPhrase(elm) {
    return Array.from(elm.querySelectorAll('a[href]'));
}

function openPhraseNotes() {
    if (phraseReferences.length === 1) {
        goToNote(phraseReferences[0]);
        return true;
    }
    phraseMenu.replaceChildren();
    phraseReferences.forEach((reference, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.setAttribute('role', 'menuitem');
        const label = document.createElement('span');
        label.className = 'webbook-note-menu-label';
        label.textContent = `Note ${referenceLabel(reference)}`;
        const context = document.createElement('span');
        context.className = 'webbook-note-menu-context';
        context.textContent = referenceContext(reference);
        button.append(label, context);
        button.addEventListener('click', () => {
            phraseMenu.hidePopover();
            goToNote(reference);
        });
        phraseMenu.append(button);
        if (!index) setTimeout(() => button.focus(), 0);
    });
    phraseMenu.showPopover();
    return true;
}

export async function handleNarratedPhrase(elm) {
    // Narration moving on from the note it was sent to is handled by the return; the reader moving
    // narration elsewhere ends it
    if (currentReturn() && !autoReturn) {
        const note = noteOfReturn();
        if (note && elm !== note && !note.contains(elm)) dismissReturn();
    }
    const request = ++phraseRequest;
    const candidates = referencesInPhrase(elm);
    const resolved = await Promise.all(candidates.map(reference => resolveNote(reference)));
    if (request !== phraseRequest) return;
    // Notes skipped in the flow (the default) are exactly the ones the button is for
    const references = candidates.filter((reference, index) => resolved[index]);
    const changed = references.length !== phraseReferences.length || references.some((ref, i) => ref !== phraseReferences[i]);
    phraseReferences = references;
    if (!references.length) return hidePhraseNotes();
    phraseButton.hidden = false;
    phraseButton.disabled = false;
    phraseButton.textContent = references.length === 1 ? `Note ${referenceLabel(references[0])}` : `Notes (${references.length})`;
    if (changed) status.textContent = `${phraseButton.textContent} available.`;
}

export function hidePhraseNotes() {
    phraseRequest++;
    phraseReferences = [];
    if (phraseButton) { phraseButton.hidden = true; phraseButton.disabled = true; }
    if (status) status.textContent = '';
}

function buildUi() {
    const escapeContainer = document.getElementById('webbook-escape-container');
    phraseButton = document.createElement('button');
    phraseButton.id = 'webbook-note-phrase-btn';
    phraseButton.type = 'button';
    phraseButton.hidden = true;
    phraseButton.disabled = true;
    phraseButton.addEventListener('click', openPhraseNotes);
    status = document.createElement('span');
    status.id = 'webbook-note-status';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    phraseMenu = document.createElement('div');
    phraseMenu.id = 'webbook-note-menu';
    phraseMenu.className = 'webbook';
    phraseMenu.setAttribute('popover', 'auto');
    phraseMenu.setAttribute('role', 'menu');
    phraseMenu.setAttribute('aria-label', 'Notes in this phrase');
    phraseMenu.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            phraseMenu.hidePopover();
            phraseButton.focus({ preventScroll: true });
            return;
        }
        if (!['ArrowDown', 'ArrowUp'].includes(e.key)) return;
        e.preventDefault();
        const items = Array.from(phraseMenu.querySelectorAll('[role=menuitem]'));
        const index = items.indexOf(document.activeElement);
        items[(index + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus();
    });
    escapeContainer?.append(status, phraseButton);

    const back = document.createElement('button');
    back.id = 'webbook-back-to-text';
    back.type = 'button';
    back.textContent = 'Back to text';
    back.hidden = true;
    back.addEventListener('click', backToText);
    document.body.append(phraseMenu, back);
}

async function handleNoteClick(e, capturing) {
    if (e.defaultPrevented) return;
    const link = e.target instanceof Element ? e.target.closest('a[href]') : null;
    if (!link || link.closest('#webbook-note-menu')) return;
    if (link.matches(BACKLINK_SELECTOR) && currentReturn()) {
        if (!capturing) return;
        e.preventDefault();
        backToText();
        return;
    }
    if (!link.closest('main')) {
        if (capturing && currentReturn()) dismissReturn();
        return;
    }
    const semantic = link.matches('.epubtype_noteref, [role="doc-noteref"]');
    const local = noteUrl(link);
    const here = new URL(location.href);
    const sameBookHash = local && local.origin === here.origin && local.hash
        && local.pathname.slice(0, local.pathname.lastIndexOf('/')) === here.pathname.slice(0, here.pathname.lastIndexOf('/'));
    const localNote = sameBookHash && local.pathname === here.pathname && noteFromDocument(document, local);
    const clearlyNote = semantic || Boolean(localNote);
    if (capturing !== clearlyNote) return;
    if (!sameBookHash) {
        if (currentReturn()) dismissReturn();
        return;
    }
    if (clearlyNote) {
        e.preventDefault();
        if (currentReturn()) dismissReturn();
        goToNote(link);
        return;
    }
    // A plain link into another page of the book: a note there is only known once it's fetched
    e.preventDefault();
    if (currentReturn()) dismissReturn();
    if (await resolveNote(link)) goToNote(link);
    else navigateTo(link.href);
}

export function initNotesInPlace() {
    buildUi();
    // Note references are handled in the capture phase, so the player (which seeks narration to a
    // same-page link's target) and in-place navigation don't act on them too. Only links that are
    // clearly notes: other same-book links, which may or may not lead to a note on another page,
    // are left to the bubble phase, after the player has seen them (it keeps narration playing
    // when they lead elsewhere).
    document.addEventListener('click', e => handleNoteClick(e, true), { capture: true });
    document.addEventListener('click', e => handleNoteClick(e, false));
    // The audio element can arrive with a later page, so listen on the document
    document.addEventListener('timeupdate', handleTimeUpdate, { capture: true });
    window.addEventListener('popstate', e => {
        autoReturn = null;
        showBackToText();
        if (e.state?.webbookNoteReturn || !lastNoteReturn) return;
        const origin = lastNoteReturn;
        if (new URL(origin.href).pathname !== location.pathname) return;
        setTimeout(() => {
            window.scrollTo(0, origin.scrollY);
            const reference = new URL(origin.href).hash
                ? document.getElementById(decodeURIComponent(new URL(origin.href).hash.slice(1))) : null;
            reference?.focus({ preventScroll: true });
            const audio = pageAudio();
            if (audio && typeof origin.audioTime === 'number') audio.currentTime = origin.audioTime;
            if (audio && origin.autoplay) audio.play().catch(() => {});
            lastNoteReturn = null;
        }, 0);
    });
    document.addEventListener('webbook:pagechange', showBackToText);
    window.addEventListener('scroll', () => {
        if (!currentReturn() || autoReturn) return;
        const note = noteOfReturn();
        if (!note) return;
        const rect = note.getBoundingClientRect();
        if (rect.bottom < -window.innerHeight || rect.top > window.innerHeight * 2) dismissReturn();
    }, { passive: true });
    registerAction({ id: 'go-to-phrase-note', label: 'Go to note in this phrase', group: 'Narration',
        defaultKeys: [], run: openPhraseNotes, isAvailable: () => phraseReferences.length > 0 });
    registerAction({ id: 'back-to-text', label: 'Back to text', group: 'Navigation',
        defaultKeys: [], run: backToText, isAvailable: () => Boolean(currentReturn()) });
    showBackToText();
}
