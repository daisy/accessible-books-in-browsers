// Where am I? (plan 26): on request, says what structure the reading position is in, or which
// reader panel and item has focus. It only answers: it doesn't move focus, scroll, seek, pause or
// change the selection, and it says nothing unless asked.
//
// The position is the browser's: keyboard focus, the selection, narration, the caption, or what's
// at the reading line. A screen reader's virtual cursor, when it doesn't move focus, is invisible to
// the page, so the answer can be for where focus last was rather than where the cursor reads.
import { describeStructure, formatStructure, plainName, capText } from './structure-context.js';
import { lastNarratedElement, readingLine } from './narration-position.js';
import { readingEnd, readingStart, viewportLength } from './reading-axis.js';
import { currentCaptionElement } from './caption-mode.js';
import { pausedForSound } from './structure-sounds.js';
import { registerAction, announceReaderAction } from './reader-actions.js';
import { pageAudio } from './dom-utils.js';

const BUTTON_ID = 'webbook-where-am-i';
// What had focus and the selection when the button was pressed, before pressing it moved focus
const SNAPSHOT_MS = 2000;
let snapshot = null;

const PANEL_NAMES = {
    'webbook-toc-nav': 'Table of contents',
    'webbook-search': 'Search',
    'webbook-settings': 'Settings',
    'webbook-info': 'About this publication',
    'webbook-menu': 'Go to page',
};

const COMPASS_SVG = '<svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/><path d="M15.5 8.5 13.4 13.4 8.5 15.5 10.6 10.6Z" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>';

export function initWhereAmI() {
    registerAction({
        id: 'where-am-i',
        label: 'Where am I?',
        group: 'Navigation',
        // Its answer for an open panel is the panel, so it runs there, on a modified key
        inPanels: true,
        run: () => announceReaderAction(whereAmI()),
    });
    createButton();
    // Remembered context belongs to the page it was taken on
    document.addEventListener('webbook:pagechange', () => { snapshot = null; });
}

function createButton() {
    const toolbar = document.getElementById('webbook-top-toolbar');
    if (!toolbar || document.getElementById(BUTTON_ID)) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.id = BUTTON_ID;
    button.title = 'Where am I?';
    button.setAttribute('aria-label', 'Where am I?');
    button.innerHTML = COMPASS_SVG;
    // pointerdown comes before the click moves focus to the button (Chrome, Firefox)
    button.addEventListener('pointerdown', () => { snapshot = takeSnapshot(); });
    button.addEventListener('click', () => {
        const recent = snapshot && performance.now() - snapshot.time < SNAPSHOT_MS ? snapshot : null;
        snapshot = null;
        announceReaderAction(whereAmI(recent ?? undefined));
    });
    const search = toolbar.querySelector('button[popovertarget="webbook-search"]');
    if (search) search.before(button);
    else toolbar.append(button);
}

function takeSnapshot() {
    const selection = window.getSelection?.();
    const range = selection && selection.rangeCount && !selection.isCollapsed ? selection.getRangeAt(0).cloneRange() : null;
    return { time: performance.now(), active: document.activeElement, range };
}

// The answer, for the focus and selection now, or as they were when the button was pressed
export function whereAmI(context = takeSnapshot()) {
    const panel = panelAnswer(context.active);
    if (panel) return panel;
    return formatStructure(describeStructure(readingPosition(context)));
}

function isUsable(elm) {
    const main = document.querySelector('main');
    return elm instanceof Element && elm.isConnected && Boolean(main?.contains(elm));
}

function narrationIsPlaying() {
    const audio = pageAudio();
    return Boolean(audio && ((!audio.paused && !audio.ended) || pausedForSound()));
}

function selectionStart(range) {
    if (!range) return null;
    const node = range.startContainer;
    const elm = node.nodeType === Node.ELEMENT_NODE ? (node.childNodes[range.startOffset] ?? node) : node.parentElement;
    return elm instanceof Element ? elm : elm?.parentElement ?? null;
}

// One order for the button and the shortcut: the caption (the text itself is hidden then), the
// phrase being narrated, the selection, focus in the text, then where the reader is on screen
export function readingPosition({ active, range } = {}) {
    const main = document.querySelector('main');
    const caption = currentCaptionElement();
    if (isUsable(caption)) return caption;
    const narrated = lastNarratedElement();
    if (narrationIsPlaying() && isUsable(narrated)) return narrated;
    const selected = selectionStart(range);
    if (isUsable(selected)) return selected;
    // Focus on <main> itself (after Skip to text, or a page change) isn't a place in the text
    if (isUsable(active) && active !== main) return active;
    if (isUsable(narrated) && isOnScreen(narrated)) return narrated;
    const atLine = elementAtReadingLine(main);
    if (isUsable(atLine)) return atLine;
    return isUsable(narrated) ? narrated : null;
}

function isOnScreen(elm) {
    if (typeof elm.getBoundingClientRect !== 'function') return false;
    const rect = elm.getBoundingClientRect();
    return readingEnd(rect) > 0 && readingStart(rect) < viewportLength();
}

const TEXT_BLOCKS = 'h1, h2, h3, h4, h5, h6, p, li, dt, dd, th, td, caption, figcaption, blockquote, pre, math, img';

// The first piece of the book's text still on screen at the reading line (below the top
// toolbar), so a page scrolled to the top answers with what's at the top
function elementAtReadingLine(main) {
    if (!main) return null;
    const line = readingLine();
    for (const elm of main.querySelectorAll(TEXT_BLOCKS)) {
        if (elm.closest('.webbook, [hidden], [aria-hidden="true"]') || !elm.getClientRects().length) continue;
        if (readingEnd(elm.getBoundingClientRect()) > line) return elm;
    }
    return null;
}

// Focus in an open reader panel: that panel and the item in it, even while narration plays elsewhere
function panelAnswer(active) {
    if (!(active instanceof Element) || !active.isConnected) return null;
    const panel = active.closest('[popover]');
    if (!panel || !isOpen(panel)) return null;
    const name = PANEL_NAMES[panel.id] || accessibleName(panel);
    if (!name) return null;
    const detail = panelDetail(panel, active);
    return detail ? `${name}. ${detail}` : `${name}.`;
}

function isOpen(panel) {
    try {
        return panel.matches(':popover-open');
    } catch {
        return !panel.hidden;
    }
}

function accessibleName(elm) {
    const labelledBy = (elm.getAttribute('aria-labelledby') || '').split(/\s+/).filter(Boolean)
        .map(id => plainName(document.getElementById(id))).filter(Boolean).join(' ');
    return capText(labelledBy || elm.getAttribute('aria-label') || '');
}

function panelDetail(panel, active) {
    if (panel.id === 'webbook-toc-nav') {
        const item = active.closest('[role="treeitem"]');
        if (!item) return '';
        let level = 1;
        for (let group = item.parentElement?.closest('[role="group"]'); group && panel.contains(group); group = group.parentElement?.closest('[role="group"]')) level++;
        return `‘${plainName(item)}’, level ${level}.`;
    }
    if (panel.id === 'webbook-settings') {
        const section = active.closest('.webbook-settings-section');
        const heading = section?.querySelector('h3');
        return heading ? `${plainName(heading)} section.` : '';
    }
    if (panel.id === 'webbook-search') {
        const result = active.closest('#webbook-search-results > li');
        if (!result) return '';
        const results = Array.from(result.parentElement.children);
        return `Result ${results.indexOf(result) + 1} of ${results.length}.`;
    }
    return '';
}
