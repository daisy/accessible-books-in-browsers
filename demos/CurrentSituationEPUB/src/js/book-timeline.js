import { cancelSkipPreroll } from './skippability.js';
import { announceReaderAction } from './reader-actions.js';

// The narration slider as a timeline for the whole book, when the converter wrote audio-map.json:
// book time, chapters in its label and spoken value, seeking across pages, and the time display
// that also shows time left. Without the map, the player keeps a slider for the page alone.

const TIME_DISPLAY_STORAGE_KEY = 'webbook-time-display';
const TIME_DISPLAY_MODES = ['elapsed', 'chapter', 'book'];
// Seconds moved by Up/Down and by one screen reader adjustment of the book timeline
const ASSISTIVE_STEP = 30;

let bookAudioMap = null;
let lastSpokenBookSecond = -1;
// From the player: its controls (ui), its audio element, and what to do once the map has loaded
let ui = {};
let player = { getAudio: () => null, updatePhraseButtons: () => {}, onReady: () => {} };

export function initBookTimeline(context) {
    ui = context.ui;
    player = context;
    loadBookAudioMap();
}

export function hasBookTimeline() {
    return Boolean(bookAudioMap);
}

// Exact, so the thumb shows where the audio is; how far an adjustment moves is decided by the
// keyboard handler and stepFromAssistiveTechnology, not by the step
export function resetBookTimeline() {
    if (!ui.seekRange || !bookAudioMap) return;
    ui.seekRange.max = bookAudioMap.duration;
    ui.seekRange.step = 'any';
    updateBookTimeline(true);
}

export function canAnnounceTimeLeft() {
    return Boolean(bookAudioMap && currentAudioMapPage() && player.getAudio());
}

export function formatTime(secs) {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

function formatBookTime(secs) {
    const total = Math.max(0, Math.floor(secs));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = String(total % 60).padStart(2, '0');
    return bookAudioMap?.duration >= 3600
        ? `${hours}:${String(minutes).padStart(2, '0')}:${seconds}`
        : `${Math.floor(total / 60)}:${seconds}`;
}

async function loadBookAudioMap() {
    try {
        const response = await fetch(new URL('audio-map.json', window.location.href), { credentials: 'same-origin' });
        if (!response.ok) return;
        const data = await response.json();
        if (data?.version !== 1 || !(data.duration > 0) || !Array.isArray(data.pages) || !Array.isArray(data.chapters)) return;
        // Only chapters with narration have a place on the timeline (maps written before the
        // converter dropped the others may still list them)
        const narrated = new Set(data.pages.filter(page => page.duration > 0).map(page => page.href));
        data.chapters = data.chapters.filter(chapter => narrated.has(String(chapter.href).split('#')[0]));
        bookAudioMap = data;
        player.onReady();
    } catch {
        // Older books and offline copies keep the per-page timeline.
    }
}

export function enhanceBookTimeline() {
    if (!ui.seekRange || ui.timelineWrapper) return;
    initTimeDisplayToggle();
    const wrapper = document.createElement('div');
    wrapper.id = 'webbook-book-timeline';
    ui.seekRange.before(wrapper);
    wrapper.append(ui.seekRange);

    // Chapters show in this label (on hover, focus and drag) rather than as tick marks on the track,
    // which looked cluttered and only ever helped sighted readers
    const label = document.createElement('span');
    label.id = 'webbook-timeline-label';
    label.hidden = true;
    wrapper.append(label);
    ui.timelineWrapper = wrapper;
    ui.timelineLabel = label;

    wrapper.addEventListener('pointermove', event => {
        if (event.pointerType === 'touch') return;
        ui.timelineHovered = true;
        const rect = ui.seekRange.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
        showTimelineLabel(ratio * bookAudioMap.duration, ratio * 100);
    });
    wrapper.addEventListener('pointerleave', () => {
        ui.timelineHovered = false;
        if (!timelineLabelWanted()) hideTimelineLabel();
    });
    // A tap leaves the slider focused, so on touch the label shows only while dragging
    ui.seekRange.addEventListener('pointerup', event => {
        if (event.pointerType === 'touch') setTimeout(() => { if (!ui.seeking) hideTimelineLabel(); }, 0);
    });
    ui.seekRange.addEventListener('focus', () => showTimelineValue(Number(ui.seekRange.value)));
    ui.seekRange.addEventListener('blur', () => {
        setTimeout(() => {
            if (!wrapper.matches(':hover') && !ui.seeking) hideTimelineLabel();
        }, 0);
    });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && !label.hidden) hideTimelineLabel();
    });
}

export function updateBookTimeline(forceSpoken = false) {
    const audio = player.getAudio();
    if (!ui.seekRange || !player.getAudio() || !bookAudioMap) return;
    const page = currentAudioMapPage();
    const time = Math.max(0, Math.min(bookAudioMap.duration, (page?.start ?? 0) + player.getAudio().currentTime));
    ui.seekRange.value = time;
    updateTimeDisplay(time);
    const second = Math.floor(time);
    if (forceSpoken || second !== lastSpokenBookSecond) {
        setBookSeekValueText(time);
        lastSpokenBookSecond = second;
    }
    if (document.activeElement === ui.seekRange && ui.timelineLabel && !ui.timelineLabel.hidden) showTimelineValue(time);
}

// The label is for a mouse over the timeline, keyboard focus on it, and dragging: not for a slider
// that a tap or a screen reader happened to leave focused
function timelineLabelWanted() {
    return Boolean(ui.seeking || ui.timelineHovered || ui.seekRange?.matches(':focus-visible'));
}

export function currentAudioMapPage() {
    const filename = window.location.pathname.split('/').pop() || 'index.html';
    return bookAudioMap?.pages.find(page => page.href === filename);
}

export function bookTimelineStatus() {
    const audio = player.getAudio();
    const page = currentAudioMapPage();
    if (!bookAudioMap || !audio || !page) return null;
    const time = Math.max(0, Math.min(bookAudioMap.duration, page.start + audio.currentTime));
    const left = timeLeftAt(time);
    return { time, duration: bookAudioMap.duration, timeLeft: left.book };
}

function pageForBookTime(time) {
    const narrated = bookAudioMap.pages.filter(page => page.duration > 0);
    return narrated.find(page => time < page.start + page.duration) || narrated.at(-1) || null;
}

function chapterForBookTime(time) {
    let chapter = null;
    for (const candidate of bookAudioMap.chapters) {
        if (candidate.time > time) break;
        chapter = candidate;
    }
    return chapter;
}

export function bookTimeDestination(time) {
    if (!bookAudioMap) return null;
    const target = Math.max(0, Math.min(bookAudioMap.duration, Number(time) || 0));
    const page = pageForBookTime(target);
    const chapter = chapterForBookTime(target);
    return page ? { href: page.href, title: chapter?.title || page.title, samePage: currentAudioMapPage()?.href === page.href } : null;
}

function setBookSeekValueText(time) {
    if (!ui.seekRange) return;
    const chapter = chapterForBookTime(time);
    const page = pageForBookTime(time);
    const title = chapter?.title || page?.title || 'Book';
    const chapterTime = Math.max(0, time - (chapter?.time ?? page?.start ?? 0));
    ui.seekRange.setAttribute('aria-valuetext',
        `${title}, ${formatTime(chapterTime)}. ${formatBookTime(time)} of ${formatBookTime(bookAudioMap.duration)}`);
}

export function showTimelineValue(time) {
    if (timelineLabelWanted()) showTimelineLabel(time, time / bookAudioMap.duration * 100);
    setBookSeekValueText(time);
    updateTimeDisplay(time);
}

function initTimeDisplayToggle() {
    if (!ui.timeDisplay || ui.timeToggle) return;
    let mode = 'elapsed';
    try {
        const stored = localStorage.getItem(TIME_DISPLAY_STORAGE_KEY);
        if (TIME_DISPLAY_MODES.includes(stored)) mode = stored;
    } catch {}
    ui.timeDisplayMode = mode;

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.id = 'webbook-time-mode';
    ui.timeDisplay.replaceWith(toggle);
    toggle.append(ui.timeDisplay);
    toggle.addEventListener('click', () => {
        const index = TIME_DISPLAY_MODES.indexOf(ui.timeDisplayMode);
        ui.timeDisplayMode = TIME_DISPLAY_MODES[(index + 1) % TIME_DISPLAY_MODES.length];
        try { localStorage.setItem(TIME_DISPLAY_STORAGE_KEY, ui.timeDisplayMode); } catch {}
        updateBookTimeline(true);
    });
    // Its name is the time it shows ("Elapsed: 6:48"), so voice control users can say what they see
    // (WCAG 2.5.3); what activating it does goes in the description
    const hint = 'Switches between elapsed time, time left in the chapter and time left in the book';
    toggle.setAttribute('aria-description', hint);
    toggle.title = hint;
    ui.timeToggle = toggle;
}

function timeLeftAt(bookTime) {
    const page = pageForBookTime(bookTime);
    const pageTime = Math.max(0, bookTime - (page?.start ?? 0));
    const rate = player.getAudio()?.playbackRate > 0 ? player.getAudio().playbackRate : 1;
    const chapter = Math.max(0, (page?.duration ?? 0) - pageTime) / rate;
    const book = Math.max(0, bookAudioMap.duration - bookTime) / rate;
    const pageIndex = bookAudioMap.pages.indexOf(page);
    const hasUnnarratedPagesAfter = bookAudioMap.pages.slice(pageIndex + 1).some(candidate => candidate.duration === 0);
    return { chapter, book, hasUnnarratedPagesAfter };
}

function formatRemainingTime(seconds) {
    return formatBookTime(Math.ceil(Math.max(0, seconds)));
}

function spokenTimeLeft(seconds) {
    const total = Math.max(0, Math.ceil(seconds));
    if (total < 60) return `${total} ${total === 1 ? 'second' : 'seconds'}`;
    const minutes = Math.ceil(total / 60);
    if (minutes < 60) return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    return `${hours} ${hours === 1 ? 'hour' : 'hours'}${remainder ? ` ${remainder} ${remainder === 1 ? 'minute' : 'minutes'}` : ''}`;
}

function updateTimeDisplay(bookTime) {
    if (!ui.timeDisplay || !bookAudioMap) return;
    const left = timeLeftAt(bookTime);
    if (ui.timeDisplayMode === 'chapter') {
        ui.timeDisplay.textContent = `Remaining in chapter: ${formatRemainingTime(left.chapter)}`;
    } else if (ui.timeDisplayMode === 'book') {
        ui.timeDisplay.textContent = `${left.hasUnnarratedPagesAfter ? 'Left in book audio' : 'Left in book'}: ${formatRemainingTime(left.book)}`;
    } else {
        ui.timeDisplay.textContent = `Elapsed: ${formatBookTime(bookTime)}`;
    }
}

export function announceTimeLeft() {
    if (!bookAudioMap || !player.getAudio()) return;
    const page = currentAudioMapPage();
    const left = timeLeftAt((page?.start ?? 0) + player.getAudio().currentTime);
    const bookKind = left.hasUnnarratedPagesAfter ? ' of narrated time' : '';
    announceReaderAction(`${spokenTimeLeft(left.chapter)} left in this chapter, ${spokenTimeLeft(left.book)}${bookKind} left in the book.`);
}

function showTimelineLabel(time, position) {
    if (!ui.timelineLabel) return;
    const chapter = chapterForBookTime(time);
    const page = pageForBookTime(time);
    ui.timelineLabel.textContent = `${chapter?.title || page?.title || 'Book'} — ${formatBookTime(time)}`;
    ui.timelineLabel.hidden = false;
    const wrapperWidth = ui.timelineWrapper.clientWidth;
    const halfLabel = ui.timelineLabel.offsetWidth / 2;
    const trackStart = ui.seekRange.offsetLeft;
    const desired = trackStart + ui.seekRange.offsetWidth * Math.max(0, Math.min(100, position)) / 100;
    ui.timelineLabel.style.insetInlineStart = `${Math.max(halfLabel, Math.min(wrapperWidth - halfLabel, desired))}px`;
}

function hideTimelineLabel() {
    if (ui.timelineLabel) ui.timelineLabel.hidden = true;
}

export function handleBookTimelineKeydown(event) {
    if (!bookAudioMap || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const current = currentAudioMapPage();
    const position = (current?.start ?? 0) + (player.getAudio()?.currentTime ?? 0);
    let target;
    if (event.key === 'ArrowLeft') target = position - 10;
    else if (event.key === 'ArrowRight') target = position + 10;
    else if (event.key === 'ArrowDown') target = position - ASSISTIVE_STEP;
    else if (event.key === 'ArrowUp') target = position + ASSISTIVE_STEP;
    else if (event.key === 'Home') target = 0;
    else if (event.key === 'End') target = bookAudioMap.duration;
    else if (event.key === 'PageUp') {
        target = [...bookAudioMap.chapters].reverse().find(chapter => chapter.time < position - .01)?.time ?? 0;
    } else if (event.key === 'PageDown') {
        target = bookAudioMap.chapters.find(chapter => chapter.time > position + .01)?.time ?? bookAudioMap.duration;
    } else return;
    event.preventDefault();
    seekBookTime(target, Boolean(player.getAudio() && !player.getAudio().paused && !player.getAudio().ended));
}

// A change that came from neither a pointer nor a key the timeline handles: a screen reader
// adjusting the slider (VoiceOver's swipe up or down, VO-Shift-arrows). Only its direction is used,
// so one adjustment always moves a useful amount whatever increment the screen reader asked for.
export function stepFromAssistiveTechnology() {
    const current = currentAudioMapPage();
    const position = (current?.start ?? 0) + (player.getAudio()?.currentTime ?? 0);
    const requested = Number(ui.seekRange.value);
    if (requested === position) return;
    const target = position + Math.sign(requested - position) * ASSISTIVE_STEP;
    seekBookTime(target, Boolean(player.getAudio() && !player.getAudio().paused && !player.getAudio().ended));
}

export function seekBookTime(time, autoplay) {
    if (!bookAudioMap) return;
    const target = Math.max(0, Math.min(bookAudioMap.duration, time));
    const page = pageForBookTime(target);
    if (!page) return;
    const pageTime = Math.max(0, Math.min(page.duration, target - page.start));
    showTimelineValue(target);
    const current = currentAudioMapPage();
    if (current?.href === page.href) {
        cancelSkipPreroll(player.getAudio());
        player.getAudio().currentTime = pageTime;
        player.updatePhraseButtons();
        return Promise.resolve();
    }
    return import('./in-place-navigation.js').then(({ navigateTo }) => {
        return navigateTo(page.href, { audioTime: pageTime, autoplay, moveFocus: false });
    });
}
