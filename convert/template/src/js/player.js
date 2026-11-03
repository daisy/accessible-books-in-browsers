import { elmForCue } from './cue-selector.js';
import { highlightElm, syncHashToElement, seekToHashTarget } from './narration-position.js';
import { recordResumePosition, applyResumeAudioTimeIfMatching } from './resume-position.js';
import { showCaptionForCue, refreshCaptionItemsFromTrack } from './caption-mode.js';
import { handleEscapableStructure, hideEscape } from './escapability.js';
import { handleCuePlayability, restoreSkipMute, cancelSkipPreroll, canPlay } from './skippability.js';
import { requestAutoplayForForwardSpineLink, requestAutoplayForLink, clearAutoplayRequest, consumeAutoplayRequest, normalizeAutoplayUrl } from './autoplay.js';
import { keyboardShortcutsEnabled } from './settings.js';
import { isAnyPopoverOpen, isTextEntryTarget } from './dom-utils.js';
import { consumePageEntry, adjacentPageLink, stepAcrossPageBoundary } from './page-entry.js';

const PLAY_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20" aria-hidden="true"><polygon points="5,3 19,12 5,21"/></svg>`;
const PAUSE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20" aria-hidden="true"><rect x="5" y="3" width="4" height="18"/><rect x="15" y="3" width="4" height="18"/></svg>`;
const NARRATION_HIGHLIGHT_NAME = 'narration';

function formatTime(secs) {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

function clearNarrationHighlight() {
    if (typeof CSS === 'undefined' || !CSS.highlights) return;
    CSS.highlights.get?.(NARRATION_HIGHLIGHT_NAME)?.clear?.();
    CSS.highlights.delete(NARRATION_HIGHLIGHT_NAME);
}

export function initPlayer() {
    const shouldAutoplayThisPage = consumeAutoplayRequest();
    const startsPartway = Boolean(window.location.hash) || consumePageEntry() !== null;

    const audio = document.querySelector('audio');
    if (!audio) return;
    const controls = document.querySelector('#webbook-audio-controls');
    const hasAudioSource = Boolean(audio.getAttribute('src') || audio.currentSrc || audio.querySelector('source[src]'));
    if (!hasAudioSource) {
        controls?.setAttribute('hidden', '');
        return;
    }
    controls?.removeAttribute('hidden');

    const trackEl = audio.querySelector('track');
    if (!trackEl) return;
    const metadataTrack = trackEl.track || audio.textTracks?.[0];
    if (!metadataTrack) return;

    const previousPhraseBtn = document.querySelector('#webbook-previous-phrase');
    const playPauseBtn = document.querySelector('#webbook-audio-playpause');
    const nextPhraseBtn = document.querySelector('#webbook-next-phrase');
    const seekRange = document.querySelector('#webbook-seek');
    // Books converted from older templates link the slider to a tick-mark datalist; the ticks only add noise
    seekRange?.removeAttribute('list');
    const timeDisplay = document.querySelector('#webbook-time');

    function setSeekValueText(time) {
        if (!seekRange) return;
        const numericTime = typeof time === 'number' ? time : parseFloat(String(time));
        seekRange.setAttribute('aria-valuetext', formatTime(Number.isFinite(numericTime) ? numericTime : 0));
    }

    // Play/pause button
    function updatePlayPause() {
        if (!playPauseBtn) return;
        const paused = audio.paused || audio.ended;
        playPauseBtn.innerHTML = paused ? PLAY_SVG : PAUSE_SVG;
        playPauseBtn.title = paused ? 'Play' : 'Pause';
        playPauseBtn.setAttribute('aria-label', paused ? 'Play' : 'Pause');
    }
    updatePlayPause();
    function togglePlayback() {
        if (audio.paused || audio.ended) audio.play();
        else audio.pause();
    }
    playPauseBtn?.addEventListener('click', togglePlayback);
    audio.addEventListener('play', updatePlayPause);
    audio.addEventListener('pause', updatePlayPause);

    // Seek range and time display
    function setSeekMax() {
        if (seekRange && isFinite(audio.duration)) seekRange.max = audio.duration;
    }
    if (audio.readyState >= 1) {
        setSeekMax();
    } else {
        audio.addEventListener('loadedmetadata', setSeekMax);
    }

    let seeking = false;
    if (seekRange) {
        seekRange.addEventListener('pointerdown', () => { seeking = true; });
        seekRange.addEventListener('pointerup', () => { seeking = false; });
        seekRange.addEventListener('input', () => {
            cancelSkipPreroll(audio);
            audio.currentTime = seekRange.value;
            setSeekValueText(seekRange.value);
            updatePhraseButtons();
        });
        setSeekValueText(seekRange.value);
    }
    audio.addEventListener('timeupdate', () => {
        restoreSkipMute(audio);
        if (seekRange && !seeking) {
            seekRange.value = audio.currentTime;
            setSeekValueText(audio.currentTime);
        }
        if (timeDisplay) timeDisplay.textContent = formatTime(audio.currentTime);
    });
    // Anything can move the audio (caption mode, resume, a hash link, skipping), so the phrase
    // buttons always work from where the audio is rather than from the last phrase they stepped to
    audio.addEventListener('seeked', updatePhraseButtons);

    function updatePhraseButtons() {
        const cues = Array.from(metadataTrack.cues || []);
        const currentIdx = cueIndexAtOrBefore(audio.currentTime, cues);
        if (previousPhraseBtn) {
            previousPhraseBtn.disabled = playableCueIndex(cues, currentIdx, -1) < 0 && !adjacentPageLink(-1);
        }
        if (nextPhraseBtn) {
            nextPhraseBtn.disabled = playableCueIndex(cues, currentIdx, 1) < 0 && !adjacentPageLink(1);
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
    function stepPhrase(delta) {
        const cues = Array.from(metadataTrack.cues || []);
        if (!cues.length) return false;

        const idx = playableCueIndex(cues, cueIndexAtOrBefore(audio.currentTime, cues), delta);
        if (idx < 0) return stepAcrossPageBoundary(delta);

        seekToCue(cues[idx]);
        return true;
    }
    phraseStepper = stepPhrase;

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
        updatePhraseButtons();
        // Started here rather than with the autoplay attribute, so a page opened partway through
        // doesn't play its first moments before seeking there
        if (shouldAutoplayThisPage && startsPartway) audio.play().catch(() => {});
    }

    // Arriving from a phrase step across the page boundary
    function seekToPageEntry() {
        const entry = consumePageEntry();
        if (!entry) return;
        const cues = Array.from(metadataTrack.cues || []);
        const idx = entry === 'last'
            ? playableCueIndex(cues, cues.length, -1)
            : playableCueIndex(cues, -1, 1);
        if (idx >= 0) seekToCue(cues[idx]);
    }
    if (trackEl.readyState >= 2) {
        handleTrackReady();
    } else {
        trackEl.addEventListener('load', handleTrackReady);
    }

    // Keep playing after arriving from a page that was playing. play() rather than the autoplay
    // attribute, which is ignored once the audio has loaded, and a cached page loads it before
    // this runs.
    if (shouldAutoplayThisPage && !startsPartway) audio.play().catch(() => {});

    // Following a link moves narration with it: a link within this page seeks the audio, and a
    // link to another page of the book during playback keeps playing there
    function seekToHash(hash) {
        cancelSkipPreroll(audio);
        if (seekToHashTarget(audio, metadataTrack, hash)) updatePhraseButtons();
    }
    document.addEventListener('click', e => {
        if (e.defaultPrevented || e.button !== 0 || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
        const link = e.target instanceof Element ? e.target.closest('a[href]') : null;
        if (!link || (link.target && link.target !== '_self')) return;
        let url;
        try { url = new URL(link.href, window.location.href); } catch { return; }
        if (url.origin !== window.location.origin) return;

        if (normalizeAutoplayUrl(url.href) === normalizeAutoplayUrl(window.location.href)) {
            // A link to the hash the URL already has fires no hashchange, so seek here as well
            if (url.hash) seekToHash(url.hash);
        } else if (link.matches('#webbook-spine-nav a')) {
            // the spine links have their own autoplay rules
        } else if (!audio.paused && !audio.ended) {
            requestAutoplayForLink(link);
        }
    });
    // Back/forward between positions on this page
    window.addEventListener('hashchange', () => seekToHash(window.location.hash));

    const nextSpineLink = document.querySelector('#webbook-spine-nav a[rel=next][href]');
    nextSpineLink?.addEventListener('click', () => {
        if (!audio.paused && !audio.ended) {
            requestAutoplayForForwardSpineLink(nextSpineLink);
        } else if (!audio.ended) {
            // Not when the audio has ended: that is the page finishing, and its 'ended' handler
            // has just asked for the next page to keep playing
            clearAutoplayRequest();
        }
    });

    previousPhraseBtn?.addEventListener('click', () => stepPhrase(-1));
    nextPhraseBtn?.addEventListener('click', () => stepPhrase(1));
    updatePhraseButtons();

    // VTT cue-driven narration highlight
    metadataTrack.addEventListener('cuechange', () => {
        restoreSkipMute(audio);
        const track = metadataTrack;
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
    });

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

    // [ and ] step by phrase and \ plays and pauses, anywhere outside a text field or open popover,
    // unless the reader turned keyboard shortcuts off. Matched by physical key (e.code), not by
    // character: on layouts where these characters need AltGr, which arrives as Ctrl+Alt and so
    // can't be told apart from a modified shortcut, the same keys still work unmodified.
    // NVDA and JAWS don't use these keys on their own in browse mode.
    const shortcutActions = {
        BracketLeft: () => stepPhrase(-1),
        BracketRight: () => stepPhrase(1),
        Backslash: togglePlayback
    };
    document.addEventListener('keydown', e => {
        const action = shortcutActions[e.code];
        if (!action) return;
        if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
        if (!keyboardShortcutsEnabled() || isTextEntryTarget(e.target) || isAnyPopoverOpen()) return;
        e.preventDefault();
        action();
    });
}

let phraseStepper = null;

// Previous/next phrase for other parts of the UI (caption mode's arrow keys). Returns false on a
// page without narration, where there are no phrases to step through.
export function stepPhrase(delta) {
    return phraseStepper ? phraseStepper(delta) : false;
}
