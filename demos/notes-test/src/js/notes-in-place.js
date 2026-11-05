import { fetchPage, navigateTo } from './in-place-navigation.js';
import { elmForCue } from './cue-selector.js';
import { registerAction } from './reader-actions.js';
import { canPlay } from './skippability.js';

const NOTE_SELECTOR = '.epubtype_footnote, .epubtype_endnote, .epubtype_note, [role="doc-footnote"], [role="doc-endnote"]';
const BACKLINK_SELECTOR = '[role="doc-backlink"], .epubtype_backlink';
let popover;
let heading;
let content;
let goToNote;
let playNote;
let phraseButton;
let phraseMenu;
let status;
let activeReference = null;
let phraseReferences = [];
let resumeAfterPopover = false;
let noteAudioReturn = null;
let lastNoteReturn = null;
let phraseRequest = 0;

function referenceLabel(reference) {
    return reference.textContent.trim().replace(/^\[|\]$/g, '') || 'Note';
}

function referenceContext(reference) {
    const passage = reference.closest('p, li, blockquote, figcaption, dd, dt') || reference.parentElement;
    if (!passage) return '';
    const clone = passage.cloneNode(true);
    const index = Array.from(passage.querySelectorAll('a[href]')).indexOf(reference);
    const clonedReference = clone.querySelectorAll('a[href]')[index];
    if (!clonedReference) return '';
    clonedReference.replaceWith(' WEBBOOKNOTE ');
    clone.querySelectorAll('a[href]').forEach(link => link.remove());
    const [before = '', after = ''] = clone.textContent.replace(/\s+/g, ' ').split('WEBBOOKNOTE');
    const beforeWords = before.trim().split(/\s+/).filter(Boolean).slice(-2).join(' ');
    const afterWords = after.trim().split(/\s+/).filter(Boolean).slice(0, 2).join(' ');
    return [beforeWords && `…${beforeWords}`, afterWords && `${afterWords}…`].filter(Boolean).join(' ');
}

function noteHeading(reference, note) {
    const label = referenceLabel(reference);
    if (label && label !== 'Note') return `Note ${label}`;
    if (note.matches('.epubtype_footnote, [role="doc-footnote"]')) return 'Footnote';
    if (note.matches('.epubtype_endnote, [role="doc-endnote"]')) return 'Endnote';
    return 'Note';
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

function strippedClone(note) {
    const clone = note.cloneNode(true);
    clone.removeAttribute('id');
    clone.querySelectorAll('[id]').forEach(elm => elm.removeAttribute('id'));
    clone.querySelectorAll(BACKLINK_SELECTOR).forEach(link => link.remove());
    return clone;
}

function positionPopover(reference) {
    const rect = reference.getBoundingClientRect();
    const top = rect.bottom + 8;
    popover.style.setProperty('--webbook-note-left', `${Math.min(window.innerWidth - 20, Math.max(12, rect.left))}px`);
    popover.style.setProperty('--webbook-note-top', `${top}px`);
    popover.classList.toggle('webbook-note-above', top + Math.min(360, window.innerHeight * .6) > window.innerHeight);
    if (popover.classList.contains('webbook-note-above')) {
        popover.style.setProperty('--webbook-note-top', `${Math.max(12, rect.top - 8)}px`);
    }
}

async function openNote(reference) {
    const resolved = await resolveNote(reference);
    if (!resolved || typeof popover?.showPopover !== 'function') return false;
    activeReference = reference;
    const audio = document.querySelector('#webbook-toolbar audio');
    resumeAfterPopover = Boolean(audio && !audio.paused);
    if (resumeAfterPopover) audio.pause();
    heading.textContent = noteHeading(reference, resolved.note);
    content.replaceChildren(strippedClone(resolved.note));
    goToNote.href = resolved.url.href;
    playNote.hidden = !resolved.samePage || !noteCueRange(resolved.note);
    positionPopover(reference);
    popover.showPopover();
    heading.focus();
    return true;
}

function noteCueRange(note) {
    const track = document.querySelector('#webbook-toolbar audio track')?.track;
    const cues = Array.from(track?.cues || []).filter(cue => {
        const elm = elmForCue(cue);
        return elm && (note === elm || note.contains(elm));
    });
    return cues.length ? { start: cues[0].startTime, end: cues[cues.length - 1].endTime } : null;
}

function playCurrentNote() {
    const url = noteUrl(activeReference);
    const note = url ? noteFromDocument(document, url) : null;
    const range = note && noteCueRange(note);
    const audio = document.querySelector('#webbook-toolbar audio');
    if (!range || !audio) return;
    noteAudioReturn = { time: audio.currentTime, playing: resumeAfterPopover };
    resumeAfterPopover = false;
    audio.currentTime = range.start;
    audio.play();
    const finish = () => {
        if (!noteAudioReturn || audio.currentTime < range.end - .05) return;
        const saved = noteAudioReturn;
        noteAudioReturn = null;
        audio.pause();
        audio.currentTime = saved.time;
        if (saved.playing) audio.play().catch(() => {});
        audio.removeEventListener('timeupdate', finish);
    };
    audio.addEventListener('timeupdate', finish);
}

function returnRecord(reference) {
    const audio = document.querySelector('#webbook-toolbar audio');
    return {
        href: window.location.href.split('#')[0] + (reference.id ? `#${encodeURIComponent(reference.id)}` : ''),
        scrollY: window.scrollY,
        audioTime: audio?.currentTime,
        autoplay: Boolean(audio && !audio.paused)
    };
}

function followToNote(reference) {
    const url = noteUrl(reference);
    if (!url) return;
    const origin = returnRecord(reference);
    lastNoteReturn = origin;
    popover?.hidePopover?.();
    navigateTo(url.href, { state: { webbookNoteReturn: origin }, autoplay: false });
    setTimeout(showBackToText, 0);
}

function currentReturn() {
    return history.state?.webbookNoteReturn || null;
}

function showBackToText() {
    const button = document.getElementById('webbook-back-to-text');
    if (button) button.hidden = !currentReturn();
}

function dismissReturn() {
    if (!currentReturn()) return;
    history.replaceState({ ...history.state, webbookNoteReturn: undefined }, '');
    document.getElementById('webbook-back-to-text')?.setAttribute('hidden', '');
    lastNoteReturn = null;
}

async function backToText() {
    const origin = currentReturn();
    if (!origin) return false;
    await navigateTo(origin.href, { push: false, replace: true, moveFocus: true, scrollY: origin.scrollY,
        audioTime: origin.audioTime, autoplay: origin.autoplay, state: null });
    lastNoteReturn = null;
    document.getElementById('webbook-back-to-text')?.setAttribute('hidden', '');
    return true;
}

function referencesInPhrase(elm) {
    return Array.from(elm.querySelectorAll('a[href]'));
}

function openPhraseNotes() {
    if (phraseReferences.length === 1) {
        followToNote(phraseReferences[0]);
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
            followToNote(reference);
        });
        phraseMenu.append(button);
        if (!index) setTimeout(() => button.focus(), 0);
    });
    phraseMenu.showPopover();
    return true;
}

export async function handleNarratedPhrase(elm) {
    if (currentReturn()) {
        const note = noteFromDocument(document, new URL(window.location.href));
        if (note && elm !== note && !note.contains(elm)) dismissReturn();
    }
    const request = ++phraseRequest;
    const candidates = referencesInPhrase(elm);
    const resolved = await Promise.all(candidates.map(reference => resolveNote(reference)));
    if (request !== phraseRequest) return;
    const references = candidates.filter((reference, index) => resolved[index] && canPlay(resolved[index].note));
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
    popover = document.createElement('aside');
    popover.id = 'webbook-note-popover';
    popover.className = 'webbook';
    popover.setAttribute('popover', 'auto');
    popover.setAttribute('aria-labelledby', 'webbook-note-heading');
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'webbook-note-close';
    close.textContent = 'Close';
    close.addEventListener('click', () => popover.hidePopover());
    heading = document.createElement('h2');
    heading.id = 'webbook-note-heading';
    heading.tabIndex = -1;
    content = document.createElement('div');
    content.id = 'webbook-note-content';
    playNote = document.createElement('button');
    playNote.type = 'button';
    playNote.textContent = 'Play note';
    playNote.addEventListener('click', playCurrentNote);
    goToNote = document.createElement('a');
    goToNote.textContent = 'Go to note';
    goToNote.addEventListener('click', e => { e.preventDefault(); followToNote(activeReference); });
    const actions = document.createElement('div');
    actions.className = 'webbook-note-actions';
    actions.append(playNote, goToNote, close);
    popover.append(heading, content, actions);
    popover.addEventListener('keydown', e => {
        if (e.key !== 'Escape') return;
        e.preventDefault();
        e.stopPropagation();
        popover.hidePopover();
    });
    popover.addEventListener('toggle', e => {
        if (e.newState === 'closed') {
            activeReference?.focus({ preventScroll: true });
            const audio = document.querySelector('#webbook-toolbar audio');
            if (resumeAfterPopover && audio) audio.play().catch(() => {});
            resumeAfterPopover = false;
        }
    });

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
    document.body.append(popover, phraseMenu, back);
}

export function initNotesInPlace() {
    buildUi();
    document.addEventListener('click', async e => {
        const link = e.target instanceof Element ? e.target.closest('a[href]') : null;
        if (!link || link.closest('#webbook-note-popover, #webbook-note-menu')) return;
        if (link.matches(BACKLINK_SELECTOR) && currentReturn()) {
            e.preventDefault();
            backToText();
            return;
        }
        if (currentReturn()) dismissReturn();
        if (!link.closest('main')) return;
        const semantic = link.matches('.epubtype_noteref, [role="doc-noteref"]');
        const local = noteUrl(link);
        const here = new URL(location.href);
        const sameBookHash = local && local.origin === here.origin && local.hash
            && local.pathname.slice(0, local.pathname.lastIndexOf('/')) === here.pathname.slice(0, here.pathname.lastIndexOf('/'));
        const localNote = sameBookHash && local.pathname === here.pathname && noteFromDocument(document, local);
        if (!semantic && !localNote && !sameBookHash) return;
        e.preventDefault();
        const opened = await openNote(link);
        if (opened) return;
        if (semantic) followToNote(link);
        else navigateTo(link.href);
    });
    window.addEventListener('popstate', e => {
        showBackToText();
        if (e.state?.webbookNoteReturn || !lastNoteReturn) return;
        const origin = lastNoteReturn;
        if (new URL(origin.href).pathname !== location.pathname) return;
        setTimeout(() => {
            window.scrollTo(0, origin.scrollY);
            const reference = new URL(origin.href).hash
                ? document.getElementById(decodeURIComponent(new URL(origin.href).hash.slice(1))) : null;
            reference?.focus({ preventScroll: true });
            const audio = document.querySelector('#webbook-toolbar audio');
            if (audio && typeof origin.audioTime === 'number') audio.currentTime = origin.audioTime;
            if (audio && origin.autoplay) audio.play().catch(() => {});
            lastNoteReturn = null;
        }, 0);
    });
    document.addEventListener('webbook:pagechange', showBackToText);
    window.addEventListener('scroll', () => {
        if (!currentReturn()) return;
        const note = noteFromDocument(document, new URL(window.location.href));
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
