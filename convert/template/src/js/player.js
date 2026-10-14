import { elmForCue } from './cue-selector.js';
import { highlightElm, syncHashToElement, seekToHashTarget } from './narration-position.js';
import { recordResumePosition, applyResumeAudioTimeIfMatching } from './resume-position.js';
import { showCaptionForCue, refreshCaptionItemsFromTrack } from './caption-mode.js';
import { handleEscapableStructure, hideEscape } from './escapability.js';
import { handleCuePlayability, restoreSkipMute, cancelSkipPreroll } from './skippability.js';
import { requestAutoplayForForwardSpineLink, clearAutoplayRequest, consumeAutoplayRequest } from './autoplay.js';

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
    const seekTicks = document.querySelector('#webbook-seek-ticks');
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
    if (playPauseBtn) {
        playPauseBtn.addEventListener('click', () => {
            if (audio.paused || audio.ended) audio.play();
            else audio.pause();
        });
    }
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
            activeCueIdx = cueIndexAtOrBefore(audio.currentTime, Array.from(metadataTrack.cues || []));
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

    let activeCueIdx = -1;
    function updatePhraseButtons() {
        const cues = Array.from(metadataTrack.cues || []);
        const hasCues = cues.length > 0;
        const currentIdx = activeCueIdx >= 0 ? activeCueIdx : cueIndexAtOrBefore(audio.currentTime, cues);
        if (previousPhraseBtn) previousPhraseBtn.disabled = !hasCues || currentIdx <= 0;
        if (nextPhraseBtn) nextPhraseBtn.disabled = !hasCues || currentIdx >= cues.length - 1;
    }

    function stepCue(delta) {
        const track = metadataTrack;
        if (!track?.cues?.length) return false;

        const cues = Array.from(track.cues);
        const currentIdx = activeCueIdx >= 0 ? activeCueIdx : cueIndexAtOrBefore(audio.currentTime, cues);
        let idx;
        if (delta < 0) {
            if (currentIdx <= 0) return false;
            idx = currentIdx - 1;
        } else {
            if (currentIdx >= cues.length - 1) return false;
            idx = currentIdx < 0 ? 0 : currentIdx + 1;
        }

        cancelSkipPreroll(audio);
        audio.currentTime = cues[idx].startTime;
        activeCueIdx = idx;
        updatePhraseButtons();
        return true;
    }

    function cueIndexAtOrBefore(time, cues) {
        for (let i = 0; i < cues.length; i++) {
            if (cues[i].startTime <= time && cues[i].endTime > time) return i;
            if (cues[i].startTime > time) return i - 1;
        }
        return cues.length - 1;
    }

    // Populate tick marks from VTT cues once track is loaded
    function populateTicks() {
        if (!seekTicks || !metadataTrack.cues) return;
        seekTicks.innerHTML = '';
        Array.from(metadataTrack.cues).forEach(cue => {
            const opt = document.createElement('option');
            opt.value = cue.startTime;
            seekTicks.appendChild(opt);
        });
    }
    function handleTrackReady() {
        populateTicks();
        refreshCaptionItemsFromTrack(metadataTrack);
        seekToHashTarget(audio, metadataTrack);
        applyResumeAudioTimeIfMatching(audio);
        updatePhraseButtons();
    }
    if (trackEl.readyState >= 2) {
        handleTrackReady();
    } else {
        trackEl.addEventListener('load', handleTrackReady);
    }

    // Autoplay on navigation
    if (shouldAutoplayThisPage) {
        audio.autoplay = true;
    }

    const nextSpineLink = document.querySelector('#webbook-spine-nav a[rel=next][href]');
    nextSpineLink?.addEventListener('click', () => {
        if (!audio.paused && !audio.ended) {
            requestAutoplayForForwardSpineLink(nextSpineLink);
        } else {
            clearAutoplayRequest();
        }
    });

    previousPhraseBtn?.addEventListener('click', () => stepCue(-1));
    nextPhraseBtn?.addEventListener('click', () => stepCue(1));
    updatePhraseButtons();

    // VTT cue-driven narration highlight
    metadataTrack.addEventListener('cuechange', () => {
        restoreSkipMute(audio);
        const track = metadataTrack;
        const activeCues = Array.from(track.activeCues || []);
        if (activeCues.length > 0) {
            const cue = activeCues[activeCues.length - 1];
            activeCueIdx = Array.from(track.cues || []).indexOf(cue);
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

    // Keyboard shortcuts when the seek slider has focus
    if (seekRange) {
        seekRange.addEventListener('keydown', e => {
            if (e.key === '[' || e.key === ']') {
                e.preventDefault();
                stepCue(e.key === '[' ? -1 : 1);
            } else if (e.shiftKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
                e.preventDefault();
                const delta = e.key === 'ArrowRight' ? 10 : -10;
                audio.currentTime = Math.max(0, Math.min(audio.duration, audio.currentTime + delta));
            }
            // plain arrow keys: default range step behavior
        });
    }
}
