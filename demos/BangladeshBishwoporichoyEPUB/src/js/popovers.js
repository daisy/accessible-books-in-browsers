import { lastNarratedElement } from './narration-position.js';
import { registerAction } from './reader-actions.js';

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
    for (const [id, label, popoverId] of [
        ['open-toc', 'Table of contents', 'webbook-toc-nav'],
        ['open-settings', 'Settings', 'webbook-settings'],
        ['open-goto-page', 'Go to page', 'webbook-menu'],
        ['open-search', 'Search', 'webbook-search'],
        ['open-about', 'About this publication', 'webbook-info']
    ]) {
        registerAction({ id, label, group: 'Panels',
            isAvailable: () => typeof document.getElementById(popoverId)?.showPopover === 'function',
            run: () => {
                const popover = document.getElementById(popoverId);
                // Establish the same focus-return point as opening the panel from its toolbar.
                document.querySelector(`button[popovertarget="${popoverId}"]:not(.webbook-popover-close)`)?.focus({ preventScroll: true });
                popover.showPopover();
                focusInitialPopoverControl(popover, popoverId);
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
function markCurrentTocEntry() {
    const links = Array.from(document.querySelectorAll('#webbook-cover-link, #webbook-toc-nav ol a[href]'));
    const here = pagePath(window.location.href);
    const pageLinks = links.filter(link => pagePath(link.href) === here);
    if (!pageLinks.length) return;

    const isReached = readingPositionTest();
    let current = pageLinks.find(link => !new URL(link.href).hash) ?? pageLinks[0];
    for (const link of pageLinks) {
        const id = decodeURIComponent(new URL(link.href).hash.slice(1));
        const target = id ? document.getElementById(id) : null;
        if (target && isReached(target)) current = link;
    }
    links.forEach(link => link.removeAttribute('aria-current'));
    current.setAttribute('aria-current', 'page');
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
function readingPositionTest() {
    const audio = document.querySelector('audio');
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
export function initPopoverToggleTracking() {
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
                if (id === 'webbook-toc-nav') {
                    const current = popover.querySelector('a[aria-current="page"]');
                    if (current) { current.scrollIntoView(); current.focus(); }
                } else if (id === 'webbook-info') {
                    const tocLinks = Array.from(document.querySelectorAll('#webbook-cover-link, #webbook-toc-nav ol a'));
                    const currentIdx = tocLinks.findIndex(a => a.getAttribute('aria-current') === 'page');
                    const total = tocLinks.length;
                    const pageLabel = document.querySelector('#webbook-current-page-label');
                    const progressBar = document.querySelector('#webbook-reading-progress');
                    const countLabel = document.querySelector('#webbook-progress-count');
                    if (pageLabel) pageLabel.textContent = currentIdx >= 0 ? tocLinks[currentIdx].textContent.trim() : '';
                    if (progressBar && total > 0) progressBar.value = currentIdx >= 0 ? Math.round((currentIdx + 1) / total * 100) : 0;
                    if (countLabel && total > 0) countLabel.textContent = currentIdx >= 0 ? `${currentIdx + 1} of ${total}` : '';
                    focusInitialPopoverControl(popover, id);
                } else {
                    focusInitialPopoverControl(popover, id);
                }
            } else {
                btn.classList.remove('open');
            }
        });
    });
}
