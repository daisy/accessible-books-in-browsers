import { startPlayerForPage } from './player.js';
import { startCaptionModeForPage } from './caption-mode.js';
import { hideEscape } from './escapability.js';
import { clearNarrationHighlight, readingPositionTime } from './narration-position.js';
import { recordPageVisit } from './resume-position.js';
import { resetPageEntry } from './page-entry.js';
import { requestAutoplayForLink } from './autoplay.js';

// Moving to another page of the book swaps that page's content into this one instead of loading
// it: its text, title, spine links and narration go in, and the address bar shows its URL. The
// reason is narration. Safari won't start audio on a newly loaded page without a fresh tap, which
// stopped listening at every page end (with the screen locked, for good), but it lets the audio
// element that's already playing go on to the next page's audio.
//
// Every page is still a complete page and every link a real link: without JavaScript, or whenever
// a page can't be loaded in place, the browser loads it as usual.

const PREFETCH_LIMIT = 4;
const pageCache = new Map();
let currentPage = '';
let navigationCount = 0;

export function initInPlaceNavigation() {
    if (!window.fetch || !window.DOMParser || !history.pushState) return;
    currentPage = pagePath(window.location.href);
    document.addEventListener('click', handleLinkClick);
    window.addEventListener('popstate', e => {
        if (pagePath(window.location.href) !== currentPage) {
            loadInPlace(new URL(window.location.href), {
                push: false,
                moveFocus: true,
                scrollY: e.state?.webbookScrollY,
                audioTime: e.state?.webbookAudioTime,
                autoplay: e.state?.webbookWasPlaying === true
            });
        }
    });
    prefetchNextPage();
}

// Go to a URL in this book, loading it in place where possible
export function navigateTo(href, { push = true, moveFocus = true, audioTime, autoplay = false,
    scrollY, state = null, replace = false } = {}) {
    let url;
    try { url = new URL(href, window.location.href); } catch { return; }
    if (currentPage && pagePath(url.href) === currentPage) {
        const audio = document.querySelector('#webbook-toolbar audio');
        if (audio && typeof audioTime === 'number') audio.currentTime = audioTime;
        if (push) history.pushState(state, '', url.href);
        else history.replaceState(state, '', url.href);
        const target = url.hash ? document.getElementById(decodeURIComponent(url.hash.slice(1))) : null;
        if (typeof scrollY === 'number') window.scrollTo(0, scrollY);
        else target?.scrollIntoView();
        if (moveFocus && target) {
            if (!target.matches('a[href], button, input, select, textarea, [tabindex]')) target.setAttribute('tabindex', '-1');
            target.focus({ preventScroll: true });
        }
        if (autoplay && audio?.paused) audio.play().catch(() => {});
        return;
    }
    if (autoplay) requestAutoplayForLink({ href: url.href });
    if (!currentPage || !isOtherPageOfBook(url)) {
        window.location.href = url.href;
        return;
    }
    return loadInPlace(url, { push, moveFocus, audioTime, scrollY, state, replace, autoplay });
}

// Registered after the other click handlers, so they have seen the click (and asked for playback
// to continue on the next page) before it's taken over here
function handleLinkClick(e) {
    if (e.defaultPrevented || e.button !== 0 || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    const link = e.target instanceof Element ? e.target.closest('a[href]') : null;
    if (!link || (link.target && link.target !== '_self') || link.hasAttribute('download')) return;
    let url;
    try { url = new URL(link.href, window.location.href); } catch { return; }
    if (!isOtherPageOfBook(url)) return;

    e.preventDefault();
    // A click the reader made moves focus to where they're going. One made by the reader itself,
    // when narration reaches the end of a page or steps past it, leaves focus where it is.
    loadInPlace(url, { push: true, moveFocus: e.isTrusted });
}

function isOtherPageOfBook(url) {
    if (url.origin !== window.location.origin) return false;
    const here = new URL(window.location.href);
    const directory = path => path.slice(0, path.lastIndexOf('/') + 1);
    if (directory(url.pathname) !== directory(here.pathname)) return false;
    if (!/(\.html?|\/)$/i.test(url.pathname)) return false;
    return pagePath(url.href) !== currentPage;
}

function pagePath(href) {
    try {
        return new URL(href, window.location.href).pathname.replace(/\/index\.html$/, '/');
    } catch {
        return '';
    }
}

async function loadInPlace(url, { push, moveFocus, scrollY, audioTime, state = null, replace = false, autoplay = false }) {
    const navigation = ++navigationCount;
    let doc;
    try {
        doc = await fetchPage(url);
    } catch {
        doc = null;
    }
    // A later navigation started while this page was loading
    if (navigation !== navigationCount) return;
    if (!doc || !canSwapIn(doc)) {
        if (push) window.location.href = url.href;
        else window.location.reload();
        return;
    }

    // Position-tracking features must not react to the focus and scroll changes used to place
    // the incoming page before its requested hash or Back/Forward position is established.
    document.dispatchEvent(new CustomEvent('webbook:pageplacing'));

    const focusWasInContent = !document.activeElement
        || document.activeElement === document.body
        || Boolean(document.activeElement.closest('main'));

    // Kept with the page being left, so Back returns to the same place on it. While narration is
    // paused, the reader may have scrolled away from it, and the URL follows where they're reading
    // (browser-bookmarks.js): Back returns there, and Play continues from there.
    if (push) {
        const audio = document.querySelector('#webbook-toolbar audio');
        const narrated = audio?.getAttribute('src') || audio?.querySelector('source[src]');
        const playing = narrated ? !audio.paused : false;
        history.replaceState({
            ...history.state,
            webbookScrollY: window.scrollY,
            webbookAudioTime: narrated ? (playing ? audio.currentTime : readingPositionTime(audio)) : undefined,
            webbookWasPlaying: playing
        }, '');
    }
    if (autoplay) requestAutoplayForLink({ href: url.href });
    swapIn(doc);
    if (push) history.pushState(state, '', url.href);
    else if (replace) history.replaceState(state, '', url.href);
    currentPage = pagePath(url.href);
    startPage({ audioTime });
    placeReader(url.hash, moveFocus || focusWasInContent, scrollY);
    document.dispatchEvent(new CustomEvent('webbook:pagechange', { detail: { url: url.href } }));
    prefetchNextPage();
}

export function fetchPage(url) {
    const key = pagePath(url.href);
    if (!pageCache.has(key)) {
        const page = fetch(url.href, { credentials: 'same-origin' })
            .then(response => {
                if (!response.ok) throw new Error(`${response.status} ${url.href}`);
                return response.text();
            })
            .then(html => new DOMParser().parseFromString(html, 'text/html'));
        page.catch(() => pageCache.delete(key));
        pageCache.set(key, page);
        while (pageCache.size > PREFETCH_LIMIT) pageCache.delete(pageCache.keys().next().value);
    }
    return pageCache.get(key);
}

// Fetched ahead, so continuing onto the next page at the end of this one doesn't wait on the
// network, which matters most with the screen locked
function prefetchNextPage() {
    const next = document.querySelector('#webbook-spine-nav a[rel=next][href]');
    if (next) fetchPage(new URL(next.href, window.location.href)).catch(() => {});
}

// Only a page of the same book, made for the same UI, with the same stylesheets: anything else is
// loaded the usual way
function canSwapIn(doc) {
    const root = doc.documentElement;
    if (root.dataset.webbookContract !== document.documentElement.dataset.webbookContract) return false;
    const bookId = d => d.querySelector('meta[name="webbook-book-id"]')?.content?.trim() || '';
    if (bookId(doc) !== bookId(document)) return false;
    const stylesheets = d => Array.from(d.querySelectorAll('link[rel~="stylesheet"]'), link => link.getAttribute('href')).join('\n');
    if (stylesheets(doc) !== stylesheets(document)) return false;
    return Boolean(doc.querySelector('main') && doc.querySelector('#webbook-toolbar') && document.querySelector('main'));
}

function swapIn(doc) {
    document.querySelectorAll('[popover]').forEach(popover => {
        if (popover.matches(':popover-open')) popover.hidePopover();
    });
    hideEscape();
    clearNarrationHighlight();

    document.title = doc.title;
    const lang = doc.documentElement.getAttribute('lang');
    if (lang) document.documentElement.setAttribute('lang', lang);

    // Same <main> element, new content and attributes. Caption mode's aria-hidden stays.
    const main = document.querySelector('main');
    const newMain = doc.querySelector('main');
    for (const { name } of Array.from(main.attributes)) {
        if (name !== 'aria-hidden') main.removeAttribute(name);
    }
    for (const { name, value } of Array.from(newMain.attributes)) {
        if (name !== 'aria-hidden') main.setAttribute(name, value);
    }
    main.replaceChildren(...Array.from(newMain.childNodes, node => document.importNode(node, true)));

    // Same nav element (the toolbar's show/hide keeps a reference to it), new links
    const spineNav = document.querySelector('#webbook-spine-nav');
    const newSpineNav = doc.querySelector('#webbook-spine-nav');
    if (spineNav && newSpineNav) {
        spineNav.replaceChildren(...Array.from(newSpineNav.childNodes, node => document.importNode(node, true)));
    }

    // The converter's marking of the current page in the table of contents
    const tocLinks = document.querySelectorAll('#webbook-toc-nav ol a');
    const newTocLinks = doc.querySelectorAll('#webbook-toc-nav ol a');
    if (tocLinks.length === newTocLinks.length) {
        tocLinks.forEach((link, i) => {
            const current = newTocLinks[i].getAttribute('aria-current');
            if (current) link.setAttribute('aria-current', current);
            else link.removeAttribute('aria-current');
        });
    }

    // Page position is converter-provided because not every spine page is necessarily in the TOC.
    const progress = document.querySelector('#webbook-progress');
    const newProgress = doc.querySelector('#webbook-progress');
    if (progress && newProgress) {
        progress.dataset.webbookPageNumber = newProgress.dataset.webbookPageNumber || '';
        progress.dataset.webbookPageCount = newProgress.dataset.webbookPageCount || '';
        const label = progress.querySelector('#webbook-current-page-label');
        const newLabel = newProgress.querySelector('#webbook-current-page-label');
        if (label && newLabel) label.textContent = newLabel.textContent;
    }

    swapNarration(doc);
}

// The page's audio and timing track go into the audio element that's already here
function swapNarration(doc) {
    const toolbar = document.querySelector('#webbook-toolbar');
    const newAudio = doc.querySelector('#webbook-toolbar audio');
    let audio = document.querySelector('#webbook-toolbar audio');
    let controls = document.querySelector('#webbook-audio-controls');

    if (!newAudio) {
        if (audio) {
            audio.pause();
            audio.removeAttribute('src');
            audio.replaceChildren();
            audio.load();
        }
        controls?.setAttribute('hidden', '');
        return;
    }

    // Arriving from a page without narration, which has no audio element or controls of its own
    if (!audio && toolbar) {
        const tocButton = toolbar.querySelector('button[popovertarget="webbook-toc-nav"]');
        audio = document.importNode(newAudio, true);
        audio.replaceChildren();
        audio.removeAttribute('src');
        const newControls = doc.querySelector('#webbook-audio-controls');
        controls = newControls ? document.importNode(newControls, true) : null;
        const after = tocButton ? tocButton.nextSibling : toolbar.firstChild;
        toolbar.insertBefore(audio, after);
        if (controls) toolbar.insertBefore(controls, audio.nextSibling);
    }
    if (!audio) return;

    audio.replaceChildren(...Array.from(newAudio.childNodes, node => document.importNode(node, true)));
    const src = newAudio.getAttribute('src');
    if (src) audio.setAttribute('src', src);
    else audio.removeAttribute('src');
    // Starts loading the new source; anything playing stops until the page says to go on
    audio.load();
}

function startPage({ audioTime }) {
    resetPageEntry();
    recordPageVisit();
    startPlayerForPage({ audioTime });
    startCaptionModeForPage();
}

// Where a newly loaded page would put the reader: at the link's target, or at the top
function placeReader(hash, moveFocus, scrollY) {
    const id = hash ? decodeURIComponent(hash.slice(1)) : '';
    const target = id ? document.getElementById(id) : null;
    if (typeof scrollY === 'number') {
        window.scrollTo(0, scrollY);
    } else if (target) {
        target.scrollIntoView();
    } else {
        window.scrollTo(0, 0);
    }
    const main = document.querySelector('main');
    // Not into the page text while caption mode hides it
    if (!moveFocus || main?.getAttribute('aria-hidden') === 'true') return;

    // Focus goes where the page starts, as a page load would put a screen reader there: the link's
    // target, or the first heading, so the new page is announced by name
    const focusTarget = target || main?.querySelector('h1, h2, h3, h4, h5, h6') || main;
    if (!focusTarget) return;
    if (!focusTarget.matches('a[href], button, input, select, textarea, [tabindex]')) {
        focusTarget.setAttribute('tabindex', '-1');
    }
    focusTarget.focus({ preventScroll: true });
}
