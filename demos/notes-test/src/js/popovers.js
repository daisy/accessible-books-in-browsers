import { lastNarratedElement } from './narration-position.js';
import { registerAction } from './reader-actions.js';
import { pageAudio } from './dom-utils.js';

const WEBBOOK_POPOVER_IDS = ['webbook-toc-nav', 'webbook-menu', 'webbook-settings', 'webbook-info', 'webbook-search'];
const POPOVER_CLOSE_LABELS = {
    'webbook-toc-nav': 'Close table of contents',
    'webbook-menu': 'Close go to page',
    'webbook-settings': 'Close settings',
    'webbook-info': 'Close about',
    'webbook-search': 'Close search'
};
const CLOSE_SVG = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M5.293 5.293a1 1 0 0 1 1.414 0L12 10.586l5.293-5.293a1 1 0 1 1 1.414 1.414L13.414 12l5.293 5.293a1 1 0 0 1-1.414 1.414L12 13.414l-5.293 5.293a1 1 0 0 1-1.414-1.414L10.586 12 5.293 6.707a1 1 0 0 1 0-1.414Z"/></svg>';

export function initPopoverActions() {
    // Alt+Shift (Option+Shift on a Mac) with a letter: free in NVDA, JAWS, Narrator and VoiceOver,
    // and in Chrome, Edge and Safari, which take A, B, I, N and T
    for (const [id, label, popoverId, code] of [
        ['open-toc', 'Table of contents', 'webbook-toc-nav', 'KeyC'],
        ['open-settings', 'Settings', 'webbook-settings', 'KeyS'],
        ['open-goto-page', 'Go to page', 'webbook-menu', 'KeyG'],
        ['open-search', 'Search', 'webbook-search', 'KeyF'],
        ['open-about', 'About this publication', 'webbook-info', 'KeyO']
    ]) {
        registerAction({ id, label, group: 'Panels', defaultKeys: [{ code, alt: true, shift: true }],
            isAvailable: () => typeof document.getElementById(popoverId)?.showPopover === 'function',
            run: () => {
                const popover = document.getElementById(popoverId);
                openedByPointer.delete(popoverId);
                // Establish the same focus-return point as opening the panel from its toolbar.
                document.querySelector(`button[popovertarget="${popoverId}"]:not(.webbook-popover-close)`)?.focus({ preventScroll: true });
                popover.showPopover();
                if (popoverId !== 'webbook-toc-nav') focusInitialPopoverControl(popover, popoverId);
            } });
    }
}

export function initPopoverCloseButtons() {
    WEBBOOK_POPOVER_IDS.forEach(id => {
        const popover = document.querySelector(`#${id}`);
        if (!popover || popover.querySelector('.webbook-popover-close')) return;

        const closeButton = document.createElement('button');
        closeButton.type = 'button';
        closeButton.className = 'webbook-popover-close';
        closeButton.title = 'Close';
        closeButton.setAttribute('aria-label', POPOVER_CLOSE_LABELS[id] || 'Close');
        closeButton.setAttribute('popovertarget', id);
        closeButton.setAttribute('popovertargetaction', 'hide');
        closeButton.innerHTML = CLOSE_SVG;
        closeButton.addEventListener('click', () => popover.hidePopover?.());
        popover.prepend(closeButton);
    });
}

function focusInitialPopoverControl(popover, id) {
    const preferredSelectors = {
        'webbook-menu': '#goto-page',
        'webbook-search': '#webbook-search-input'
    };
    const preferredSelector = preferredSelectors[id];
    const preferred = preferredSelector ? popover.querySelector(preferredSelector) : null;
    const firstFocusable = preferred || popover.querySelector('a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (firstFocusable) firstFocusable.focus();
}

// A link to another page closes the table of contents by loading that page; a link within this
// page has to close it here, then move focus to where the link went so keyboard and screen reader
// users continue from there rather than from the table of contents button
export function initTocInPageLinks() {
    const toc = document.querySelector('#webbook-toc-nav');
    if (!toc) return;
    toc.addEventListener('click', e => {
        const link = e.target instanceof Element ? e.target.closest('a[href]') : null;
        if (!link || link.closest('.webbook-popover-close')) return;
        let url;
        try { url = new URL(link.href, window.location.href); } catch { return; }
        const here = new URL(window.location.href);
        if (url.origin !== here.origin || url.pathname !== here.pathname) return;

        toc.hidePopover?.();
        const target = url.hash ? document.getElementById(decodeURIComponent(url.hash.slice(1))) : null;
        if (!target) return;
        if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
    });
}

// The converter marks a TOC link as the current page only when it points at the page itself. In
// books whose TOC links all point at sections within pages, none would be marked, so mark the
// section the reader is in: the last entry on this page that starts at or before where they are.
export function markCurrentTocEntry() {
    const { links, current } = currentTocEntry();
    if (!current) return null;
    if (links.find(link => link.getAttribute('aria-current') === 'page') !== current) {
        links.forEach(link => link.removeAttribute('aria-current'));
        current.setAttribute('aria-current', 'page');
    }
    return current;
}

export function currentTocEntry() {
    const links = Array.from(document.querySelectorAll('#webbook-cover-link, #webbook-toc-nav ol a[href]'));
    const here = pagePath(window.location.href);
    const pageLinks = links.filter(link => pagePath(link.href) === here);
    if (!pageLinks.length) return { links, current: null };

    const isReached = readingPositionTest();
    let current = pageLinks.find(link => !new URL(link.href).hash) ?? pageLinks[0];
    for (const link of pageLinks) {
        const id = decodeURIComponent(new URL(link.href).hash.slice(1));
        const target = id ? document.getElementById(id) : null;
        if (target && isReached(target)) current = link;
    }
    return { links, current };
}

function pagePath(href) {
    try {
        return new URL(href, window.location.href).pathname.replace(/\/index\.html$/, '/');
    } catch {
        return '';
    }
}

// Whether a section start is at or before where the reader is. That's the phrase being narrated,
// if audio is playing or that phrase is on screen. Otherwise it's what's on screen, since a reader
// who scrolled away while paused is reading there: a section counts once its start has scrolled
// up to just below the top toolbar.
export function readingPositionTest() {
    const audio = pageAudio();
    const narrated = lastNarratedElement();
    if (narrated && ((audio && !audio.paused) || isOnScreen(narrated))) {
        return target => target === narrated || target.contains(narrated)
            || Boolean(target.compareDocumentPosition(narrated) & Node.DOCUMENT_POSITION_FOLLOWING);
    }
    const toolbarBottom = document.querySelector('#webbook-top-toolbar')?.getBoundingClientRect().bottom ?? 0;
    const readingLine = Math.max(0, toolbarBottom) + 48;
    return target => target.getBoundingClientRect().top <= readingLine;
}

function isOnScreen(elm) {
    const rect = elm.getBoundingClientRect();
    return rect.bottom > 0 && rect.top < window.innerHeight;
}

// Track open state on toolbar buttons when their popovers toggle
// A panel opened with a click or tap: when it closes, the browser returns focus to its toolbar
// button, and Chrome had focused that button on the click. The toolbars stay shown while one of
// their controls has focus (so a keyboard user's focus is never on something invisible), which
// then kept them on screen until the next click, even with Hide toolbars automatically on (user,
// 2026-11-10). So after a panel opened by pointer closes, the button lets go of focus. Opened from
// the keyboard (Tab and Enter, or a shortcut), focus stays on the button, as before.
const openedByPointer = new Set();

export function initPopoverToggleTracking() {
    document.addEventListener('pointerdown', e => {
        const button = e.target instanceof Element
            ? e.target.closest('button[popovertarget]:not(.webbook-popover-close)') : null;
        if (button) openedByPointer.add(button.getAttribute('popovertarget'));
    }, { capture: true });
    document.addEventListener('keydown', e => {
        const button = e.target instanceof Element
            ? e.target.closest('button[popovertarget]:not(.webbook-popover-close)') : null;
        if (button && (e.key === 'Enter' || e.key === ' ')) openedByPointer.delete(button.getAttribute('popovertarget'));
    }, { capture: true });

    WEBBOOK_POPOVER_IDS.forEach(id => {
        const popover = document.querySelector(`#${id}`);
        if (!popover) return;
        // Before opening, while the page is still what's on screen rather than the popover
        if (id === 'webbook-toc-nav' || id === 'webbook-info') {
            popover.addEventListener('beforetoggle', e => {
                if (e.newState === 'open') markCurrentTocEntry();
            });
        }
        popover.addEventListener('toggle', e => {
            const btn = document.querySelector(`button[popovertarget="${id}"]:not(.webbook-popover-close)`);
            if (!btn) return;
            if (e.newState === 'open') {
                btn.classList.add('open');
                if (id === 'webbook-info') {
                    const progressSection = document.querySelector('#webbook-progress');
                    const current = Number(progressSection?.dataset.webbookPageNumber || 0);
                    const total = Number(progressSection?.dataset.webbookPageCount || 0);
                    const percentage = total > 0 ? Math.round(current / total * 100) : 0;
                    const pageLabel = document.querySelector('#webbook-current-page-label');
                    const progressBar = document.querySelector('#webbook-reading-progress');
                    const countLabel = document.querySelector('#webbook-progress-count');
                    if (pageLabel) {
                        const title = pageLabel.textContent.trim() || document.title.split(' – ')[0];
                        if (!title.startsWith('Section: ')) pageLabel.textContent = `Section: ${title}`;
                    }
                    if (progressBar) {
                        progressBar.value = percentage;
                        progressBar.textContent = `${percentage}%`;
                        progressBar.setAttribute('aria-valuetext', `${percentage}%`);
                    }
                    if (countLabel) countLabel.textContent = `${percentage}%`;
                    focusInitialPopoverControl(popover, id);
                } else {
                    focusInitialPopoverControl(popover, id);
                }
            } else {
                btn.classList.remove('open');
                if (openedByPointer.delete(id) && document.activeElement === btn) btn.blur();
            }
        });
    });
}
