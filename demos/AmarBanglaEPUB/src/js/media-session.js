import { requestAutoplayForForwardSpineLink, clearAutoplayRequest } from './autoplay.js';
import { pageAudio } from './dom-utils.js';
import { cancelSoundPause, pausedForSound } from './structure-sounds.js';

export function initMediaSessionControls() {
    try {
        initMediaSession();
    } catch (error) {
        console.warn('Media Session controls unavailable.', error);
    }
}

function initMediaSession() {
    if (!('mediaSession' in navigator)) return;

    setMediaActionHandler('play', () => { playReaderAudio(); });
    setMediaActionHandler('pause', () => {
        cancelSoundPause();
        getReaderAudio()?.pause();
    });
    setMediaActionHandler('nexttrack', () => navigateSpine(1));
    setMediaActionHandler('previoustrack', () => navigateSpine(-1));

    const audio = getReaderAudio();
    if (!audio) return;

    const syncPlaybackState = () => {
        // Narration waiting a moment for a structure sound is still playing, to the lock screen
        if (pausedForSound()) return;
        try {
            navigator.mediaSession.playbackState = audio.paused || audio.ended ? 'paused' : 'playing';
        } catch {
            // Some implementations expose Media Session but reject playback state updates.
        }
    };
    audio.addEventListener('play', syncPlaybackState);
    audio.addEventListener('pause', syncPlaybackState);
    audio.addEventListener('ended', syncPlaybackState);
    syncPlaybackState();
}

function setMediaActionHandler(action, handler) {
    try {
        navigator.mediaSession.setActionHandler(action, handler);
    } catch {
        // Some browsers expose Media Session but not every action.
    }
}

function getReaderAudio() {
    return pageAudio();
}

function hasUsableAudio(audio = getReaderAudio()) {
    return Boolean(audio && (audio.getAttribute('src') || audio.currentSrc || audio.querySelector('source[src]')));
}

function playReaderAudio() {
    const audio = getReaderAudio();
    if (!hasUsableAudio(audio)) return false;
    const playPromise = audio.play();
    if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {});
    }
    return true;
}

function navigateSpine(delta) {
    const rel = delta > 0 ? 'next' : 'prev';
    const link = document.querySelector(`#webbook-spine-nav a[rel=${rel}][href]`);
    if (!link) return false;

    const audio = getReaderAudio();
    if (delta > 0 && audio && !audio.paused && !audio.ended) {
        requestAutoplayForForwardSpineLink(link);
    } else {
        clearAutoplayRequest();
    }
    link.click();
    return true;
}
