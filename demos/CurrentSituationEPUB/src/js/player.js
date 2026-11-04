import { elmForCue } from './cue-selector.js';
import { highlightElm, clearNarrationHighlight, syncHashToElement, seekToHashTarget } from './narration-position.js';
import { recordResumePosition, applyResumeAudioTimeIfMatching } from './resume-position.js';
import { showCaptionForCue, refreshCaptionItemsFromTrack } from './caption-mode.js';
import { handleEscapableStructure, hideEscape } from './escapability.js';
import { handleCuePlayability, restoreSkipMute, cancelSkipPreroll, canPlay } from './skippability.js';
import { playOrOfferToContinue } from './continue-playing.js';
import { requestAutoplayForForwardSpineLink, requestAutoplayForLink, clearAutoplayRequest, consumeAutoplayRequest, normalizeAutoplayUrl } from './autoplay.js';
import { consumePageEntry, adjacentPageLink, stepAcrossPageBoundary } from './page-entry.js';
import { registerAction } from './reader-actions.js';

const PLAY_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20" aria-hidden="true"><polygon points="5,3 19,12 5,21"/></svg>`;
const PAUSE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20" aria-hidden="true"><rect x="5" y="3" width="4" height="18"/><rect x="15" y="3" width="4" height="18"/></svg>`;
function formatTime(secs) {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
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
    initDocumentListeners();
    startPlayerForPage();
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
    audio.addEventListener('timeupdate', () => {
        restoreSkipMute(audio);
        if (ui.seekRange && !ui.seeking) {
            ui.seekRange.value = audio.currentTime;
            setSeekValueText(audio.currentTime);
        }
        if (ui.timeDisplay) ui.timeDisplay.textContent = formatTime(audio.currentTime);
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
        ui.seekRange.addEventListener('pointerup', () => { ui.seeking = false; });
        ui.seekRange.addEventListener('input', () => {
            cancelSkipPreroll(audio);
            audio.currentTime = ui.seekRange.value;
            setSeekValueText(ui.seekRange.value);
            updatePhraseButtons();
        });
    }
    ui.previousPhraseBtn?.addEventListener('click', () => stepPhrase(-1));
    ui.nextPhraseBtn?.addEventListener('click', () => stepPhrase(1));
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
        ui.seekRange.value = 0;
        ui.seekRange.max = isFinite(audio.duration) ? audio.duration : 0;
        setSeekValueText(0);
    }
    if (ui.timeDisplay) ui.timeDisplay.textContent = formatTime(0);
    updatePlayPause();
}

function setSeekValueText(time) {
    if (!ui.seekRange) return;
    const numericTime = typeof time === 'number' ? time : parseFloat(String(time));
    ui.seekRange.setAttribute('aria-valuetext', formatTime(Number.isFinite(numericTime) ? numericTime : 0));
}

function setSeekMax() {
    if (ui.seekRange && isFinite(audio.duration)) ui.seekRange.max = audio.duration;
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

function cueIndexAtOrBefore(time, cues) {
    for (let i = 0; i < cues.length; i++) {
        if (cues[i].startTime <= time && cues[i].endTime > time) return i;
        if (cues[i].startTime > time) return i - 1;
    }
    return cues.length - 1;
}

function handleTrackReady() {
    refreshCaptionItemsFromTrack(metadataTrack);
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
