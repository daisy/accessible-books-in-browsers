// The feature tour as a carousel (WAI-ARIA Authoring Practices carousel pattern). Without this
// script the page is a plain list of every slide, each with a still and a link to its clip.
//
// Each clip has the browser's own video controls, which can pause it. It plays on a loop while its
// slide is shown, muted until the viewer turns sound on in any clip's controls, which then applies
// to the others too; with reduced motion set, or in Show all, it waits to be played. Clips with sound have
// captions. Slides never advance on their own.

const tour = document.getElementById('tour');
const list = tour.querySelector('.slides');
const slides = [...list.children];
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
let current = 0;
let showingAll = false;
// Sound, as the viewer last set it on any clip's controls, carries on to the other clips
const sound = { muted: true, volume: 1 };

tour.setAttribute('aria-roledescription', 'carousel');
tour.classList.add('carousel');
// The slides become groups, so the list around them stops being a list
list.setAttribute('role', 'none');

const controls = document.createElement('div');
controls.className = 'controls';
controls.innerHTML = `
  <button type="button" class="previous">Previous</button>
  <span class="position" aria-hidden="true"></span>
  <button type="button" class="next">Next</button>
  <button type="button" class="show-all" aria-pressed="false">Show all slides</button>`;
tour.prepend(controls);
const previousButton = controls.querySelector('.previous');
const nextButton = controls.querySelector('.next');
const showAllButton = controls.querySelector('.show-all');
const position = controls.querySelector('.position');

const live = document.createElement('div');
live.className = 'visually-hidden';
live.setAttribute('aria-live', 'polite');
tour.append(live);

slides.forEach((slide, index) => {
    const title = slide.querySelector('h3').textContent;
    slide.setAttribute('role', 'group');
    slide.setAttribute('aria-roledescription', 'slide');
    slide.setAttribute('aria-label', `${index + 1} of ${slides.length}: ${title}`);

    const clip = slide.querySelector('.clip');
    const still = clip.querySelector('img');
    const link = clip.querySelector('a');
    const video = document.createElement('video');
    video.muted = true;
    video.controls = true;
    video.loop = true;
    video.addEventListener('volumechange', () => {
        if (video.dataset.syncing) return;
        sound.muted = video.muted;
        sound.volume = video.volume;
    });
    video.playsInline = true;
    video.preload = 'none';
    video.poster = still.getAttribute('src');
    // The still's size, so the page doesn't move as the clip loads
    video.setAttribute('width', still.getAttribute('width')); video.setAttribute('height', still.getAttribute('height'));
    video.src = link.getAttribute('href');
    video.setAttribute('aria-label', `Clip: ${title}`);
    if (slide.dataset.captions) {
        const track = document.createElement('track');
        track.kind = 'captions';
        track.srclang = slide.dataset.captions;
        track.label = 'Captions';
        track.src = link.getAttribute('href').replace(/\.mp4$/, '.vtt');
        track.default = true;
        video.append(track);
    }

    clip.replaceChildren(video);
});

function play(slide) {
    const video = slide.querySelector('video');
    applySound(video);
    video.currentTime = 0;
    video.play().catch(() => {
        // A browser that won't play it with sound may still play it muted; otherwise the controls
        // are there to start it
        if (video.muted) return;
        applySound(video, { muted: true });
        video.play().catch(() => {});
    });
}

function applySound(video, { muted = sound.muted } = {}) {
    video.dataset.syncing = 'true';
    video.muted = muted;
    video.volume = sound.volume;
    // volumechange fires after this, so the flag is cleared once it has
    setTimeout(() => { delete video.dataset.syncing; });
}

function stop(slide) {
    const video = slide.querySelector('video');
    if (!video.paused) video.pause();
}

function show(index, { announce = true } = {}) {
    stop(slides[current]);
    current = (index + slides.length) % slides.length;
    slides.forEach((slide, i) => { slide.hidden = i !== current; });
    position.textContent = `${current + 1} of ${slides.length}`;
    const slide = slides[current];
    if (announce) live.textContent = slide.getAttribute('aria-label');
    if (!reduceMotion.matches) play(slide);
    // Only after the reader moves: setting it while the page loads makes the browser scroll to it
    if (announce) history.replaceState(null, '', `#${slide.id}`);
}

function setShowAll(on) {
    showingAll = on;
    tour.classList.toggle('all', on);
    showAllButton.setAttribute('aria-pressed', String(on));
    previousButton.hidden = nextButton.hidden = position.hidden = on;
    if (on) {
        stop(slides[current]);
        live.textContent = '';
        // In the list, nothing plays until asked
        slides.forEach(slide => { slide.hidden = false; });
    } else {
        slides.forEach(slide => stop(slide));
        show(current);
    }
}

previousButton.addEventListener('click', () => show(current - 1));
nextButton.addEventListener('click', () => show(current + 1));
showAllButton.addEventListener('click', () => setShowAll(!showingAll));

const start = slides.findIndex(slide => `#${slide.id}` === location.hash);
show(start >= 0 ? start : 0, { announce: false });
