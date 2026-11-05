import { elmForCue } from './cue-selector.js';
import { highlightElm, clearNarrationHighlight, syncHashToElement, seekToHashTarget, lastNarratedElement } from './narration-position.js';
import { recordResumePosition, applyResumeAudioTimeIfMatching } from './resume-position.js';
import { showCaptionForCue, refreshCaptionItemsFromTrack } from './caption-mode.js';
import { handleEscapableStructure, hideEscape } from './escapability.js';
import { handleCuePlayability, restoreSkipMute, cancelSkipPreroll, canPlay } from './skippability.js';
import { playOrOfferToContinue } from './continue-playing.js';
import { requestAutoplayForForwardSpineLink, requestAutoplayForLink, clearAutoplayRequest, consumeAutoplayRequest, normalizeAutoplayUrl } from './autoplay.js';
import { consumePageEntry, adjacentPageLink, stepAcrossPageBoundary } from './page-entry.js';
import { registerAction, announceReaderAction } from './reader-actions.js';

const PLAY_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20" aria-hidden="true"><polygon points="5,3 19,12 5,21"/></svg>`;
const PAUSE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20" aria-hidden="true"><rect x="5" y="3" width="4" height="18"/><rect x="15" y="3" width="4" height="18"/></svg>`;
const TIME_DISPLAY_STORAGE_KEY = 'webbook-time-display';
const TIME_DISPLAY_MODES = ['elapsed', 'chapter', 'book'];
function formatTime(secs) {
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

// The audio element and the controls are set up once. Everything tied to a page's narration (its
// timing track, where to start, whether to keep playing) is set up again by startPlayerForPage for
// each page, whether it arrived by a page load or was loaded in place by in-place-navigation.js.
// Keeping one audio element across pages is what lets narration carry on from one page to the next:
// browsers that block audio on a newly loaded page still let an element that's already playing go on.
let audio = null;
let metadataTrack = null;
let trackEl = null;
let shouldAutoplayThisPage = false;
let startsPartway = false;
let returnToTime = null;
let controlsReady = false;
let bookAudioMap = null;
// Seconds moved by Up/Down and by one screen reader adjustment of the book timeline
const ASSISTIVE_STEP = 30;
let lastSpokenBookSecond = -1;
const ui = {};

export function initPlayer() {
    registerAction({ id: 'play-pause', label: 'Play or pause', group: 'Narration',
        defaultKeys: [{ code: 'Backslash' }], run: togglePlayback, isAvailable: () => Boolean(metadataTrack) });
    for (const [id, label, code, delta] of [
        ['previous-phrase', 'Previous phrase', 'BracketLeft', -1],
        ['next-phrase', 'Next phrase', 'BracketRight', 1]
    ]) {
        registerAction({ id, label, group: 'Narration', defaultKeys: [{ code }],
            run: () => stepPhrase(delta),
            isAvailable: () => {
                const cues = pageCues();
                return Boolean(cues.length && (playableCueIndex(cues, cueIndexAtOrBefore(audio.currentTime, cues), delta) >= 0 || adjacentPageLink(delta)));
            } });
    }
    // Alt+Shift+P (position): free in the screen readers and browsers checked, see the README
    registerAction({ id: 'go-to-narration', label: 'Go to narration position', group: 'Narration',
        defaultKeys: [{ code: 'KeyP', alt: true, shift: true }],
        run: goToNarrationPosition,
        isAvailable: () => Boolean(narrationPositionElement())
            && document.querySelector('main')?.getAttribute('aria-hidden') !== 'true' });
    // Alt+Shift+R (read from here): the other way round, narration starts where the reader is
    registerAction({ id: 'play-from-here', label: 'Play from here', group: 'Narration',
        defaultKeys: [{ code: 'KeyR', alt: true, shift: true }],
        run: playFromHere, isAvailable: () => pageCues().length > 0 });
    // Alt+Shift+L (left): free in the screen readers and browsers checked, see .claude/TODOS.md
    registerAction({ id: 'announce-time-left', label: 'Announce time left', group: 'Narration',
        defaultKeys: [{ code: 'KeyL', alt: true, shift: true }],
        run: announceTimeLeft, isAvailable: () => Boolean(bookAudioMap && currentAudioMapPage() && audio) });
    initDocumentListeners();
    startPlayerForPage();
    loadBookAudioMap();
}

// audioTime: the exact position to return to, when going back to a page loaded in place
export function startPlayerForPage({ audioTime } = {}) {
    returnToTime = typeof audioTime === 'number' ? audioTime : null;
    shouldAutoplayThisPage = consumeAutoplayRequest();
    startsPartway = Boolean(window.location.hash) || consumePageEntry() !== null;
    phraseStepper = null;
    metadataTrack = null;
    trackEl = null;

    const pageAudio = document.querySelector('audio');
    if (pageAudio && pageAudio !== audio) {
        audio = pageAudio;
        initAudioElement();
    }
    if (!audio) return;
    applyStoredPlaybackRate();
    if (!controlsReady) initControls();
    resetTimeline();

    const controls = document.querySelector('#webbook-audio-controls');
    const hasAudioSource = Boolean(audio.getAttribute('src') || audio.querySelector('source[src]'));
    if (!hasAudioSource) {
        controls?.setAttribute('hidden', '');
        return;
    }
    controls?.removeAttribute('hidden');

    trackEl = audio.querySelector('track');
    if (!trackEl) return;
    metadataTrack = trackEl.track || audio.textTracks?.[0];
    if (!metadataTrack) return;
    // A track added after load isn't always turned on by its default attribute
    if (metadataTrack.mode === 'disabled') metadataTrack.mode = 'hidden';
    metadataTrack.addEventListener('cuechange', handleCueChange);
    phraseStepper = stepPhraseOnPage;

    if (trackEl.readyState >= 2) {
        handleTrackReady();
    } else {
        const pageTrackEl = trackEl;
        pageTrackEl.addEventListener('load', () => {
            if (pageTrackEl === trackEl) handleTrackReady();
        }, { once: true });
    }

    // Keep playing after arriving from a page that was playing. play() rather than the autoplay
    // attribute, which is ignored once the audio has loaded, and a cached page loads it before
    // this runs.
    if (shouldAutoplayThisPage && !startsPartway) playOrOfferToContinue(audio);
    updatePhraseButtons();
}

function initAudioElement() {
    audio.addEventListener('play', updatePlayPause);
    audio.addEventListener('pause', updatePlayPause);
    audio.addEventListener('loadedmetadata', setSeekMax);
    audio.addEventListener('ratechange', () => updateTimelineFromAudio(true));
    audio.addEventListener('timeupdate', () => {
        restoreSkipMute(audio);
        if (ui.seekRange && !ui.seeking) {
            updateTimelineFromAudio();
        }
    });
    // Anything can move the audio (caption mode, resume, a hash link, skipping), so the phrase
    // buttons always work from where the audio is rather than from the last phrase they stepped to
    audio.addEventListener('seeked', updatePhraseButtons);
    audio.addEventListener('ended', () => {
        cancelSkipPreroll(audio);
        clearNarrationHighlight();
        updatePlayPause();
        const next = document.querySelector('#webbook-spine-nav a[rel=next][href]');
        if (next) {
            requestAutoplayForForwardSpineLink(next);
            next.click();
        }
    });
}

function applyStoredPlaybackRate() {
    let percent = 100;
    try { percent = Number(localStorage.getItem('webbook-rate')) || 100; } catch {}
    audio.playbackRate = Math.max(50, Math.min(200, percent)) / 100;
}

function initControls() {
    controlsReady = true;
    ui.previousPhraseBtn = document.querySelector('#webbook-previous-phrase');
    ui.playPauseBtn = document.querySelector('#webbook-audio-playpause');
    ui.nextPhraseBtn = document.querySelector('#webbook-next-phrase');
    ui.seekRange = document.querySelector('#webbook-seek');
    // Books converted from older templates link the slider to a tick-mark datalist; the ticks only add noise
    ui.seekRange?.removeAttribute('list');
    ui.timeDisplay = document.querySelector('#webbook-time');
    ui.seeking = false;

    ui.playPauseBtn?.addEventListener('click', togglePlayback);
    if (ui.seekRange) {
        ui.seekRange.addEventListener('pointerdown', () => { ui.seeking = true; });
        // After the change event that ends a drag; a press that didn't move the thumb fires none
        ui.seekRange.addEventListener('pointerup', () => setTimeout(() => {
            if (!ui.seeking) return;
            ui.seeking = false;
            updateTimelineFromAudio();
        }, 0));
        ui.seekRange.addEventListener('pointercancel', () => {
            ui.seeking = false;
            updateTimelineFromAudio();
        });
        ui.seekRange.addEventListener('input', () => {
            if (bookAudioMap) {
                if (ui.seeking) showTimelineValue(Number(ui.seekRange.value));
                else stepFromAssistiveTechnology();
                return;
            }
            cancelSkipPreroll(audio);
            audio.currentTime = ui.seekRange.value;
            setSeekValueText(ui.seekRange.value);
            updatePhraseButtons();
        });
        ui.seekRange.addEventListener('change', () => {
            if (!bookAudioMap || !ui.seeking) return;
            const wasPlaying = Boolean(audio && !audio.paused && !audio.ended);
            ui.seeking = false;
            seekBookTime(Number(ui.seekRange.value), wasPlaying);
        });
        ui.seekRange.addEventListener('keydown', handleBookTimelineKeydown);
    }
    ui.previousPhraseBtn?.addEventListener('click', () => stepPhrase(-1));
    ui.nextPhraseBtn?.addEventListener('click', () => stepPhrase(1));
    if (bookAudioMap) enhanceBookTimeline();
}

// Registered at load, before in-place-navigation.js takes over link clicks, so these see them first
function initDocumentListeners() {
    // Following a link moves narration with it: a link within this page seeks the audio, and a
    // link to another page of the book during playback keeps playing there
    document.addEventListener('click', e => {
        if (e.defaultPrevented || e.button !== 0 || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
        const link = e.target instanceof Element ? e.target.closest('a[href]') : null;
        if (!link || (link.target && link.target !== '_self')) return;
        let url;
        try { url = new URL(link.href, window.location.href); } catch { return; }
        if (url.origin !== window.location.origin || !audio) return;
        const playing = !audio.paused && !audio.ended;

        if (normalizeAutoplayUrl(url.href) === normalizeAutoplayUrl(window.location.href)) {
            // A link to the hash the URL already has fires no hashchange, so seek here as well
            if (url.hash) seekToHash(url.hash);
        } else if (link.matches('#webbook-spine-nav a[rel=next]')) {
            if (playing) {
                requestAutoplayForForwardSpineLink(link);
            } else if (!audio.ended) {
                // Not when the audio has ended: that is the page finishing, and its 'ended'
                // handler has just asked for the next page to keep playing
                clearAutoplayRequest();
            }
        } else if (link.matches('#webbook-spine-nav a')) {
            // the previous link doesn't keep playing
        } else if (playing) {
            requestAutoplayForLink(link);
        }
    });
    // Back/forward between positions on this page
    window.addEventListener('hashchange', () => seekToHash(window.location.hash));
}

function resetTimeline() {
    if (ui.seekRange) {
        if (bookAudioMap) {
            ui.seekRange.max = bookAudioMap.duration;
            // Exact, so the thumb shows where the audio is; how far an adjustment moves is decided
            // by the keyboard handler and stepFromAssistiveTechnology, not by the step
            ui.seekRange.step = 'any';
            updateTimelineFromAudio(true);
        } else {
            ui.seekRange.value = 0;
            ui.seekRange.max = isFinite(audio.duration) ? audio.duration : 0;
            setSeekValueText(0);
        }
    }
    if (ui.timeDisplay && !bookAudioMap) ui.timeDisplay.textContent = formatTime(0);
    updatePlayPause();
}

function setSeekValueText(time) {
    if (!ui.seekRange) return;
    const numericTime = typeof time === 'number' ? time : parseFloat(String(time));
    ui.seekRange.setAttribute('aria-valuetext', formatTime(Number.isFinite(numericTime) ? numericTime : 0));
}

function setSeekMax() {
    if (ui.seekRange && !bookAudioMap && isFinite(audio.duration)) ui.seekRange.max = audio.duration;
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
        if (ui.seekRange) {
            enhanceBookTimeline();
            resetTimeline();
        }
    } catch {
        // Older books and offline copies keep the per-page timeline.
    }
}

function enhanceBookTimeline() {
    if (!ui.seekRange || ui.timelineWrapper) return;
    initTimeDisplayToggle();
    const wrapper = document.createElement('div');
    wrapper.id = 'webbook-book-timeline';
    ui.seekRange.before(wrapper);
    wrapper.append(ui.seekRange);

    const ticks = document.createElement('div');
    ticks.id = 'webbook-chapter-ticks';
    ticks.setAttribute('aria-hidden', 'true');
    for (const chapter of bookAudioMap.chapters) {
        const tick = document.createElement('span');
        tick.className = 'webbook-chapter-tick';
        tick.style.insetInlineStart = `${chapter.time / bookAudioMap.duration * 100}%`;
        ticks.append(tick);
    }
    const label = document.createElement('span');
    label.id = 'webbook-timeline-label';
    label.hidden = true;
    wrapper.append(ticks, label);
    ui.timelineWrapper = wrapper;
    ui.timelineLabel = label;
    updateTimeDisplayToggle();

    wrapper.addEventListener('pointermove', event => {
        if (event.pointerType === 'touch') return;
        const rect = ui.seekRange.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
        showTimelineLabel(ratio * bookAudioMap.duration, ratio * 100);
    });
    wrapper.addEventListener('pointerleave', () => {
        if (document.activeElement !== ui.seekRange && !ui.seeking) hideTimelineLabel();
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

function updateTimelineFromAudio(forceSpoken = false) {
    if (!ui.seekRange || !audio) return;
    if (!bookAudioMap) {
        ui.seekRange.value = audio.currentTime;
        setSeekValueText(audio.currentTime);
        if (ui.timeDisplay) ui.timeDisplay.textContent = formatTime(audio.currentTime);
        return;
    }
    const page = currentAudioMapPage();
    const time = Math.max(0, Math.min(bookAudioMap.duration, (page?.start ?? 0) + audio.currentTime));
    ui.seekRange.value = time;
    updateTimeDisplay(time);
    const second = Math.floor(time);
    if (forceSpoken || second !== lastSpokenBookSecond) {
        setBookSeekValueText(time);
        lastSpokenBookSecond = second;
    }
    if (document.activeElement === ui.seekRange) showTimelineValue(time);
}

function currentAudioMapPage() {
    const filename = window.location.pathname.split('/').pop() || 'index.html';
    return bookAudioMap?.pages.find(page => page.href === filename);
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

function setBookSeekValueText(time) {
    if (!ui.seekRange) return;
    const chapter = chapterForBookTime(time);
    const page = pageForBookTime(time);
    const title = chapter?.title || page?.title || 'Book';
    const chapterTime = Math.max(0, time - (chapter?.time ?? page?.start ?? 0));
    ui.seekRange.setAttribute('aria-valuetext',
        `${title}, ${formatTime(chapterTime)}. ${formatBookTime(time)} of ${formatBookTime(bookAudioMap.duration)}`);
}

function showTimelineValue(time) {
    showTimelineLabel(time, time / bookAudioMap.duration * 100);
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
        updateTimelineFromAudio(true);
    });
    ui.timeToggle = toggle;
    updateTimeDisplayToggle();
}

function updateTimeDisplayToggle(description) {
    if (!ui.timeToggle) return;
    const names = { elapsed: 'Elapsed time', chapter: 'Time left in chapter', book: 'Time left in book' };
    const current = description || names[ui.timeDisplayMode];
    ui.timeToggle.setAttribute('aria-label', `${current}. Change time display.`);
    ui.timeToggle.title = `${current}; activate to change`;
}

function timeLeftAt(bookTime) {
    const page = pageForBookTime(bookTime);
    const pageTime = Math.max(0, bookTime - (page?.start ?? 0));
    const rate = audio?.playbackRate > 0 ? audio.playbackRate : 1;
    const chapter = Math.max(0, (page?.duration ?? 0) - pageTime) / rate;
    const book = Math.max(0, bookAudioMap.duration - bookTime) / rate;
    const pageIndex = bookAudioMap.pages.indexOf(page);
    const hasUnnarratedPagesAfter = bookAudioMap.pages.slice(pageIndex + 1).some(candidate => candidate.duration === 0);
    return { chapter, book, hasUnnarratedPagesAfter };
}

function compactTimeLeft(seconds) {
    const total = Math.max(0, Math.ceil(seconds));
    if (total < 60) return `${total} sec`;
    const minutes = Math.ceil(total / 60);
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    return `${hours} h${remainder ? ` ${remainder} min` : ''}`;
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
    let description;
    if (ui.timeDisplayMode === 'chapter') {
        ui.timeDisplay.textContent = `Remaining in chapter: ${formatRemainingTime(left.chapter)}`;
        description = `${compactTimeLeft(left.chapter)} left in chapter`;
    } else if (ui.timeDisplayMode === 'book') {
        ui.timeDisplay.textContent = `${left.hasUnnarratedPagesAfter ? 'Left in book audio' : 'Left in book'}: ${formatRemainingTime(left.book)}`;
        description = `${compactTimeLeft(left.book)}${left.hasUnnarratedPagesAfter ? ' narrated time' : ''} left in book`;
    } else {
        ui.timeDisplay.textContent = `Elapsed: ${formatBookTime(bookTime)}`;
        description = `Elapsed time ${formatBookTime(bookTime)}`;
    }
    updateTimeDisplayToggle(description);
}

function announceTimeLeft() {
    if (!bookAudioMap || !audio) return;
    const page = currentAudioMapPage();
    const left = timeLeftAt((page?.start ?? 0) + audio.currentTime);
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

function handleBookTimelineKeydown(event) {
    if (!bookAudioMap || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const current = currentAudioMapPage();
    const position = (current?.start ?? 0) + (audio?.currentTime ?? 0);
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
    seekBookTime(target, Boolean(audio && !audio.paused && !audio.ended));
}

// A change that came from neither a pointer nor a key the timeline handles: a screen reader
// adjusting the slider (VoiceOver's swipe up or down, VO-Shift-arrows). Only its direction is used,
// so one adjustment always moves a useful amount whatever increment the screen reader asked for.
function stepFromAssistiveTechnology() {
    const current = currentAudioMapPage();
    const position = (current?.start ?? 0) + (audio?.currentTime ?? 0);
    const requested = Number(ui.seekRange.value);
    if (requested === position) return;
    const target = position + Math.sign(requested - position) * ASSISTIVE_STEP;
    seekBookTime(target, Boolean(audio && !audio.paused && !audio.ended));
}

function seekBookTime(time, autoplay) {
    if (!bookAudioMap) return;
    const target = Math.max(0, Math.min(bookAudioMap.duration, time));
    const page = pageForBookTime(target);
    if (!page) return;
    const pageTime = Math.max(0, Math.min(page.duration, target - page.start));
    showTimelineValue(target);
    const current = currentAudioMapPage();
    if (current?.href === page.href) {
        cancelSkipPreroll(audio);
        audio.currentTime = pageTime;
        updatePhraseButtons();
        return;
    }
    import('./in-place-navigation.js').then(({ navigateTo }) => {
        navigateTo(page.href, { audioTime: pageTime, autoplay, moveFocus: false });
    });
}

function updatePlayPause() {
    if (!ui.playPauseBtn || !audio) return;
    const paused = audio.paused || audio.ended;
    ui.playPauseBtn.innerHTML = paused ? PLAY_SVG : PAUSE_SVG;
    ui.playPauseBtn.title = paused ? 'Play' : 'Pause';
    ui.playPauseBtn.setAttribute('aria-label', paused ? 'Play' : 'Pause');
}

function togglePlayback() {
    if (!metadataTrack) return;
    if (audio.paused || audio.ended) playOrOfferToContinue(audio);
    else audio.pause();
}

function pageCues() {
    return Array.from(metadataTrack?.cues || []);
}

function updatePhraseButtons() {
    if (!metadataTrack) return;
    const cues = pageCues();
    const currentIdx = cueIndexAtOrBefore(audio.currentTime, cues);
    if (ui.previousPhraseBtn) {
        ui.previousPhraseBtn.disabled = playableCueIndex(cues, currentIdx, -1) < 0 && !adjacentPageLink(-1);
    }
    if (ui.nextPhraseBtn) {
        ui.nextPhraseBtn.disabled = playableCueIndex(cues, currentIdx, 1) < 0 && !adjacentPageLink(1);
    }
}

// The next phrase in the given direction that isn't skipped by the reader's skip settings.
// Landing on a skipped one would let skipping carry playback straight back past it.
function playableCueIndex(cues, fromIdx, delta) {
    for (let i = fromIdx + delta; i >= 0 && i < cues.length; i += delta) {
        const elm = elmForCue(cues[i]);
        if (!elm || canPlay(elm)) return i;
    }
    return -1;
}

// Previous/next phrase, continuing onto the neighboring page past either end of this one
function stepPhraseOnPage(delta) {
    const cues = pageCues();
    if (!cues.length) return false;

    const idx = playableCueIndex(cues, cueIndexAtOrBefore(audio.currentTime, cues), delta);
    if (idx < 0) return stepAcrossPageBoundary(delta);

    seekToCue(cues[idx]);
    return true;
}

function seekToCue(cue) {
    cancelSkipPreroll(audio);
    audio.currentTime = cue.startTime;
    updatePhraseButtons();
    // Shown now rather than on cuechange, which a paused element may not fire
    const elm = elmForCue(cue);
    if (elm) highlightElm(elm);
    showCaptionForCue(cue, metadataTrack);
}

// The phrase narration last reached, or, before it has played, the one at the audio's position
function narrationPositionElement() {
    const cues = pageCues();
    const idx = cues.length ? Math.max(0, cueIndexAtOrBefore(audio.currentTime, cues)) : -1;
    return lastNarratedElement() ?? (idx >= 0 ? elmForCue(cues[idx]) : null);
}

// Screen readers don't follow the highlight, so after pausing they pick up wherever their cursor
// last was. This moves focus, and with it the screen reader, to the phrase.
function goToNarrationPosition() {
    const elm = narrationPositionElement();
    if (!elm) return;
    highlightElm(elm);
    if (!elm.matches('a[href], button, input, select, textarea, [tabindex]')) elm.setAttribute('tabindex', '-1');
    elm.focus({ preventScroll: true });
}

// The phrase the reader is at: the one holding focus (a screen reader's cursor brings focus with it
// onto the phrases, which are focusable for this), else the one at the start of a text selection
function cueAtReader(cues) {
    const located = cues.map(cue => ({ cue, elm: elmForCue(cue) })).filter(({ elm }) => elm);
    const focused = document.activeElement;
    if (focused && focused !== document.body && document.querySelector('main')?.contains(focused)) {
        const match = located.find(({ elm }) => elm === focused || elm.contains(focused) || focused.contains(elm));
        if (match) return match.cue;
    }
    const selection = window.getSelection?.();
    if (selection && selection.rangeCount && !selection.isCollapsed) {
        const node = selection.getRangeAt(0).startContainer;
        const match = located.find(({ elm }) => elm.contains(node))
            ?? located.find(({ elm }) => node.compareDocumentPosition(elm) & Node.DOCUMENT_POSITION_FOLLOWING);
        if (match) return match.cue;
    }
    return null;
}

function playFromHere() {
    const cue = cueAtReader(pageCues());
    if (cue) seekToCue(cue);
    playOrOfferToContinue(audio);
}

// So that a screen reader's cursor, moving through the text, brings keyboard focus with it, and
// Play from here knows where it is. tabindex -1 keeps them out of the Tab order.
function makePhrasesFocusable() {
    for (const cue of pageCues()) {
        const elm = elmForCue(cue);
        if (elm && !elm.matches('a[href], button, input, select, textarea, [tabindex]')) elm.setAttribute('tabindex', '-1');
    }
}

function cueIndexAtOrBefore(time, cues) {
    for (let i = 0; i < cues.length; i++) {
        if (cues[i].startTime <= time && cues[i].endTime > time) return i;
        if (cues[i].startTime > time) return i - 1;
    }
    return cues.length - 1;
}

function handleTrackReady() {
    refreshCaptionItemsFromTrack(metadataTrack);
    makePhrasesFocusable();
    seekToHashTarget(audio, metadataTrack);
    applyResumeAudioTimeIfMatching(audio);
    seekToPageEntry();
    // The URL's #id only gives the start of the phrase
    if (returnToTime !== null) {
        audio.currentTime = returnToTime;
        returnToTime = null;
    }
    updatePhraseButtons();
    // Started here rather than with the autoplay attribute, so a page opened partway through
    // doesn't play its first moments before seeking there
    if (shouldAutoplayThisPage && startsPartway) playOrOfferToContinue(audio);
}

// Arriving from a phrase step across the page boundary
function seekToPageEntry() {
    const entry = consumePageEntry();
    if (!entry) return;
    const cues = pageCues();
    const idx = entry === 'last'
        ? playableCueIndex(cues, cues.length, -1)
        : playableCueIndex(cues, -1, 1);
    if (idx >= 0) seekToCue(cues[idx]);
}

function seekToHash(hash) {
    if (!metadataTrack) return;
    cancelSkipPreroll(audio);
    if (seekToHashTarget(audio, metadataTrack, hash)) updatePhraseButtons();
}

// VTT cue-driven narration highlight
function handleCueChange(e) {
    const track = e.target;
    // A track from a page that has since been replaced
    if (track !== metadataTrack) return;
    restoreSkipMute(audio);
    const activeCues = Array.from(track.activeCues || []);
    if (activeCues.length > 0) {
        const cue = activeCues[activeCues.length - 1];
        const activeCueIdx = Array.from(track.cues || []).indexOf(cue);
        updatePhraseButtons();
        const elm = elmForCue(cue);
        if (!elm) return;
        if (!handleCuePlayability(elm, audio, track, activeCueIdx, cue)) return;
        highlightElm(elm);
        syncHashToElement(elm);
        recordResumePosition(elm, audio);
        showCaptionForCue(cue, track);
        handleEscapableStructure(elm, track, activeCueIdx);
    } else {
        clearNarrationHighlight();
        hideEscape();
        updatePhraseButtons();
    }
}

let phraseStepper = null;

// Previous/next phrase for other parts of the UI (caption mode's arrow keys). Returns false on a
// page without narration, where there are no phrases to step through.
export function stepPhrase(delta) {
    return phraseStepper ? phraseStepper(delta) : false;
}
