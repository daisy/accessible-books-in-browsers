import { lastNarratedElement } from './narration-position.js';
import { cueAtReadingLine, structureAtReadingLine } from './browser-bookmarks.js';
import { pageAudio } from './dom-utils.js';

// Skip to text goes to where the reader is, not the top of the page: the phrase being read aloud,
// else the phrase or structure at the reading line. Handled here, so the link's #webbook-main
// (what it does without JavaScript) doesn't become the page's position or seek the narration.
export function initSkipLink() {
    const link = document.getElementById('webbook-skip-link');
    if (!link) return;
    link.addEventListener('click', e => {
        const main = document.querySelector('main');
        if (!main) return;
        e.preventDefault();
        const audio = pageAudio();
        const playing = audio && !audio.paused && !audio.ended;
        const target = (playing && lastNarratedElement())
            || cueAtReadingLine()?.elm || structureAtReadingLine() || main;
        if (!target.matches('a[href], button, input, select, textarea, [tabindex]')) target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
    });
}
