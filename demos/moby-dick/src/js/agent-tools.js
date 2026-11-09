import { getActions, runAction, announceReaderAction } from './reader-actions.js';
import { navigateTo } from './in-place-navigation.js';
import { currentTocEntry } from './popovers.js';
import { currentPrintPageLabel } from './current-print-page.js';
import { lastNarratedElement } from './narration-position.js';
import { pageAudio } from './dom-utils.js';
import { bookTimelineStatus, bookTimeDestination, seekBookTime } from './book-timeline.js';
import { adjacentPageLink } from './page-entry.js';

const STORAGE_KEY = 'webbook-agent-tools';
let controller = null;
let settingToggle = null;

const objectSchema = properties => ({ type: 'object', properties, additionalProperties: false });
const enumSchema = values => ({ type: 'string', enum: values });
const result = (message, fields = {}) => ({ message, ...fields });
const error = message => ({ error: true, message });

function modelContext() {
    return document.modelContext || navigator.modelContext || null;
}

function enabled() {
    try { return localStorage.getItem(STORAGE_KEY) !== 'false'; } catch { return true; }
}

function pageTitle() {
    return document.querySelector('main h1, main h2, main h3')?.textContent?.trim()
        || document.title.split(' – ')[0].trim();
}

function chapterTitle() {
    return currentTocEntry().current?.textContent?.trim() || pageTitle();
}

function settingState() {
    const value = selector => document.querySelector(selector)?.value;
    const checked = selector => Boolean(document.querySelector(selector)?.checked);
    return {
        speed: Number(value('#webbook-rate-range') || 100),
        textSize: Number(value('#webbook-font-size-range') || 100),
        captionMode: checked('#webbook-caption-mode-toggle'),
        skipPageNumbers: checked('#webbook-skip-pagebreak-toggle'),
        skipFootnotes: checked('#webbook-skip-footnote-toggle'),
        skipNotes: checked('#webbook-skip-note-toggle'),
        skipSidebars: checked('#webbook-skip-sidebar-toggle')
    };
}

function readerStatus() {
    const audio = pageAudio();
    const timeline = bookTimelineStatus();
    const options = settingState();
    const title = document.title.split(' – ').at(-1)?.trim() || document.title;
    const status = {
        bookTitle: title,
        page: pageTitle(),
        chapter: chapterTitle(),
        printPage: currentPrintPageLabel() || null,
        narration: audio ? (audio.paused || audio.ended ? 'paused' : 'playing') : 'unavailable',
        pageTime: audio ? audio.currentTime : null,
        bookTime: timeline?.time ?? null,
        bookTimeLeft: timeline?.timeLeft ?? null,
        ...options
    };
    return result(`${status.narration === 'playing' ? 'Narration playing' : status.narration === 'paused' ? 'Narration paused' : 'No narration'} at ${status.chapter}.`, status);
}

function tocItems() {
    const walk = list => Array.from(list?.children || []).filter(item => item.matches('li')).map(item => {
        const link = item.querySelector(':scope > a[href]');
        const nested = item.querySelector(':scope > ol');
        return link ? { id: link.getAttribute('href'), title: link.textContent.trim(), children: walk(nested) } : null;
    }).filter(Boolean);
    return walk(document.querySelector('#webbook-toc-nav > ol'));
}

function flatToc(items = tocItems()) {
    const flatten = items => items.flatMap(item => [item, ...flatten(item.children || [])]);
    return flatten(items);
}

function actionState() {
    const audio = pageAudio();
    return {
        page: pageTitle(),
        chapter: chapterTitle(),
        narration: audio ? (audio.paused || audio.ended ? 'paused' : 'playing') : 'unavailable',
        speed: Number(document.querySelector('#webbook-rate-range')?.value || 100),
        textSize: Number(document.querySelector('#webbook-font-size-range')?.value || 100)
    };
}

async function focusDestination(href, title) {
    await navigateTo(href, { moveFocus: true });
    const message = `Moved to ${title}.`;
    announceReaderAction(message);
    return result(message, { target: href, title, state: actionState() });
}

export function chapterTocItems() {
    const top = tocItems();
    return top.length >= 2 ? top : (top[0]?.children?.length ? top[0].children : top);
}

function itemContainsHref(item, href) {
    const absolute = value => new URL(value, window.location.href).href;
    return absolute(item.id) === href || item.children?.some(child => itemContainsHref(child, href));
}

async function goTo(input) {
    if (input.section) {
        const wanted = String(input.section).trim().toLocaleLowerCase();
        const item = flatToc().find(item => item.id === input.section || item.title.toLocaleLowerCase() === wanted)
            || flatToc().find(item => item.title.toLocaleLowerCase().includes(wanted));
        if (item) {
            return focusDestination(item.id, item.title);
        }
        // Exact passage targets returned by search_book use this same input. Keep them inside the
        // current book; an agent must not turn the reader into a general-purpose navigator.
        const rawTarget = String(input.section);
        let target;
        try { target = new URL(rawTarget, window.location.href); } catch {}
        const here = new URL(window.location.href);
        if ((rawTarget.includes('#') || /(?:\.html?|\/$)/i.test(target?.pathname || ''))
            && target?.origin === here.origin
            && target.pathname.slice(0, target.pathname.lastIndexOf('/')) === here.pathname.slice(0, here.pathname.lastIndexOf('/'))) {
            return focusDestination(target.href, 'the search result');
        }
        return error(`No section matched “${input.section}”.`);
    }
    if (input.print_page !== undefined) {
        const wanted = String(input.print_page).trim().toLocaleLowerCase();
        const option = Array.from(document.querySelectorAll('#pages option')).find(option =>
            option.value.trim().toLocaleLowerCase() === wanted || option.label.trim().toLocaleLowerCase() === wanted);
        if (!option?.dataset.href) return error(`Print page ${input.print_page} is not available.`);
        const label = `print page ${input.print_page}`;
        const moved = await focusDestination(option.dataset.href, label);
        return { ...moved, printPage: String(input.print_page) };
    }
    if (input.book_time !== undefined) {
        if (!bookTimelineStatus()) return error('Book time is not available for this book.');
        const destination = bookTimeDestination(Number(input.book_time));
        await seekBookTime(Number(input.book_time), false);
        if (!runAction('go-to-narration')) {
            await new Promise(resolve => document.addEventListener('webbook:playerready', resolve, { once: true }));
            runAction('go-to-narration');
        }
        const message = `Moved to ${destination?.title || `${Math.round(Number(input.book_time))} seconds in the book`}.`;
        announceReaderAction(message);
        return result(message, { bookTime: Number(input.book_time), state: actionState() });
    }
    const actions = { next_page: 'next-page', previous_page: 'previous-page' };
    if (actions[input.direction]) {
        const link = adjacentPageLink(input.direction === 'next_page' ? 1 : -1);
        if (!link) return error(`There is no ${input.direction === 'next_page' ? 'next' : 'previous'} page.`);
        const title = link.textContent.trim() || `${input.direction === 'next_page' ? 'next' : 'previous'} page`;
        return focusDestination(link.href, title);
    }
    if (input.direction === 'next_chapter' || input.direction === 'previous_chapter') {
        const items = chapterTocItems();
        const current = currentTocEntry().current;
        const index = items.findIndex(item => current && itemContainsHref(item, current.href));
        const target = items[index + (input.direction === 'next_chapter' ? 1 : -1)];
        if (!target) return error(`There is no ${input.direction === 'next_chapter' ? 'next' : 'previous'} chapter.`);
        return focusDestination(target.id, target.title);
    }
    return error('Choose a section, print page, book time, or direction.');
}

function runReaderAction(id) {
    const action = getActions().find(candidate => candidate.id === id);
    if (!action?.isAvailable()) return error(`${action?.label || id} is not available here.`);
    runAction(id);
    announceReaderAction(`${action.label}.`);
    return result(`${action.label}.`, { action: id, state: actionState() });
}

function narration(input) {
    const audio = pageAudio();
    if (input.action === 'play' || input.action === 'pause') {
        if (!audio) return error('Narration is not available on this page.');
        const shouldPlay = input.action === 'play';
        if (shouldPlay === !audio.paused) return result(`Narration is already ${shouldPlay ? 'playing' : 'paused'}.`);
        const action = getActions().find(candidate => candidate.id === 'play-pause');
        if (!action?.isAvailable()) return error('Narration is not available on this page.');
        runAction('play-pause');
        const message = shouldPlay ? 'Playing.' : 'Paused.';
        announceReaderAction(message);
        return result(message, { action: input.action, state: actionState() });
    }
    return runReaderAction({
        play_from_here: 'play-from-here', next_phrase: 'next-phrase', previous_phrase: 'previous-phrase', skip_past: 'skip-past'
    }[input.action]);
}

const OPTION_CONTROLS = {
    speed: ['#webbook-rate-range', 'input', 50, 200],
    text_size: ['#webbook-font-size-range', 'input', 50, 200],
    caption_mode: ['#webbook-caption-mode-toggle', 'change'],
    skip_page_numbers: ['#webbook-skip-pagebreak-toggle', 'change'],
    skip_footnotes: ['#webbook-skip-footnote-toggle', 'change'],
    skip_notes: ['#webbook-skip-note-toggle', 'change'],
    skip_sidebars: ['#webbook-skip-sidebar-toggle', 'change']
};

function setReadingOption(input) {
    const config = OPTION_CONTROLS[input.option];
    const control = config && document.querySelector(config[0]);
    if (!control) return error(`${input.option} is not available.`);
    if (control.type === 'checkbox') control.checked = Boolean(input.value);
    else {
        const value = Number(input.value);
        if (!Number.isFinite(value) || value < config[2] || value > config[3]) return error(`${input.option} must be between ${config[2]} and ${config[3]}.`);
        control.value = String(value);
    }
    control.dispatchEvent(new Event(config[1], { bubbles: true }));
    const shown = control.type === 'checkbox' ? (control.checked ? 'on' : 'off') : `${control.value} percent`;
    const label = document.querySelector(`label[for="${control.id}"]`)?.textContent?.trim() || input.option;
    announceReaderAction(`${label} ${shown}.`);
    return result(`${label} ${shown}.`, { option: input.option, value: control.type === 'checkbox' ? control.checked : Number(control.value), state: actionState() });
}

async function search(input) {
    const { searchBook, describeSearchResult } = await import('./search.js');
    const matches = await searchBook(String(input.query || ''));
    if (matches === null) return error("Search isn't available for this book.");
    const results = matches.slice(0, 5).map(describeSearchResult).filter(Boolean);
    return result(`${results.length} results for “${input.query}”.`, { results });
}

function visibleText(root) {
    if (!root) return '';
    const clone = root.cloneNode(true);
    clone.querySelectorAll?.('address, article, aside, blockquote, br, caption, dd, div, dl, dt, figcaption, figure, footer, h1, h2, h3, h4, h5, h6, header, hr, li, main, nav, ol, p, pre, section, table, td, th, tr, ul')
        .forEach(element => element.after(' '));
    return clone.textContent?.replace(/\s+/g, ' ').trim() || '';
}

export function textForCurrentSection() {
    const main = document.querySelector('main');
    const current = currentTocEntry().current;
    const currentUrl = current ? new URL(current.href, window.location.href) : null;
    const id = currentUrl?.hash ? decodeURIComponent(currentUrl.hash.slice(1)) : '';
    const target = (id && document.getElementById(id)) || main;
    if (!target) return '';
    if (target === main) return visibleText(main);
    if (target.matches('section, article')) return visibleText(target);

    const entries = flatToc();
    const currentIndex = entries.findIndex(item => current && new URL(item.id, window.location.href).href === current.href);
    const nextTarget = entries.slice(currentIndex + 1).map(item => {
        const url = new URL(item.id, window.location.href);
        if (url.pathname !== window.location.pathname || !url.hash) return null;
        return document.getElementById(decodeURIComponent(url.hash.slice(1)));
    }).find(candidate => candidate && (target.compareDocumentPosition(candidate) & Node.DOCUMENT_POSITION_FOLLOWING));

    const range = document.createRange();
    range.setStartBefore(target);
    if (nextTarget) range.setEndBefore(nextTarget);
    else range.setEndAfter(main.lastChild || target);
    return visibleText(range.cloneContents());
}

function readText(input) {
    let root;
    if (input.scope === 'current_phrase') root = lastNarratedElement();
    else if (input.scope !== 'current_section') root = document.querySelector('main');
    const maximum = Math.max(100, Math.min(20000, Number(input.max_characters) || 2000));
    const full = input.scope === 'current_section' ? textForCurrentSection() : visibleText(root);
    if (!full) return error(`${input.scope.replace('_', ' ')} is not available.`);
    const text = full.length > maximum ? `${full.slice(0, maximum)}…` : full;
    return result(`Read ${text.length} characters from the ${input.scope.replace('_', ' ')}.`, { text, truncated: full.length > maximum });
}

function definitions() {
    return [
        { name: 'reader_status', title: 'Reader status', description: 'Use only when the reader asks where they are or asks for playback or setting status. Do not call this before another action.', inputSchema: objectSchema({}), annotations: { readOnlyHint: true, untrustedContentHint: true }, execute: readerStatus },
        { name: 'list_contents', title: 'List contents', description: 'Use when the reader asks what chapters or sections exist, or before go_to when their destination is unclear. Do not call for a named chapter that go_to can match directly.', inputSchema: objectSchema({}), annotations: { readOnlyHint: true, untrustedContentHint: true }, execute: () => result('Table of contents.', { contents: tocItems() }) },
        { name: 'go_to', title: 'Go to a place', description: 'Call directly for requests to go, move, or jump somewhere. Accepts a section title or id, search_book target, print page, book seconds, or next/previous page or chapter. Do not call reader_status first.', inputSchema: { ...objectSchema({ section: { type: 'string' }, print_page: { type: ['string', 'number'] }, book_time: { type: 'number', minimum: 0 }, direction: enumSchema(['next_page', 'previous_page', 'next_chapter', 'previous_chapter']) }), oneOf: [{ required: ['section'] }, { required: ['print_page'] }, { required: ['book_time'] }, { required: ['direction'] }] }, execute: goTo },
        { name: 'narration', title: 'Control narration', description: 'Call directly for play, pause, play from here, next or previous phrase, or skip past. For “pause,” use action pause immediately; do not inspect status first.', inputSchema: { ...objectSchema({ action: enumSchema(['play', 'pause', 'play_from_here', 'next_phrase', 'previous_phrase', 'skip_past']) }), required: ['action'] }, execute: narration },
        { name: 'set_reading_option', title: 'Set a reading option', description: 'Call directly to change speed, text size, caption mode, or skipped content. Do not inspect status first; the result includes the new value and state.', inputSchema: { ...objectSchema({ option: enumSchema(Object.keys(OPTION_CONTROLS)), value: { type: ['boolean', 'number'] } }), required: ['option', 'value'] }, execute: setReadingOption },
        { name: 'search_book', title: 'Search book', description: 'Use to find where the book discusses a word, phrase, or topic. Returns up to five concise results whose target can be passed to go_to.', inputSchema: { ...objectSchema({ query: { type: 'string', minLength: 1 } }), required: ['query'] }, annotations: { readOnlyHint: true, untrustedContentHint: true }, execute: search },
        { name: 'read_text', title: 'Read book text', description: 'Use when answering a question about the current phrase, section, or page. Prefer the smallest sufficient scope; defaults to at most 2,000 characters.', inputSchema: { ...objectSchema({ scope: enumSchema(['current_phrase', 'current_section', 'current_page']), max_characters: { type: 'number', minimum: 100, maximum: 20000 } }), required: ['scope'] }, annotations: { readOnlyHint: true, untrustedContentHint: true }, execute: readText }
    ].map(definition => ({ outputSchema: { type: 'object' }, ...definition }));
}

async function registerTools() {
    const context = modelContext();
    if (!context?.registerTool || !enabled() || controller) return;
    controller = new AbortController();
    try {
        await Promise.all(definitions().map(tool => context.registerTool(tool, { signal: controller.signal })));
    } catch {
        controller.abort();
        controller = null;
    }
}

function unregisterTools() {
    controller?.abort();
    controller = null;
}

function createSetting() {
    if (!modelContext()?.registerTool) return;
    const fieldset = document.querySelector('#webbook-settings fieldset');
    if (!fieldset || document.getElementById('webbook-agent-tools-toggle')) return;
    const row = document.createElement('div');
    row.className = 'webbook-agent-tools-row';
    const label = document.createElement('label');
    label.htmlFor = 'webbook-agent-tools-toggle';
    label.textContent = 'Let AI assistants in this browser control the reader';
    settingToggle = document.createElement('input');
    settingToggle.type = 'checkbox';
    settingToggle.id = 'webbook-agent-tools-toggle';
    settingToggle.checked = enabled();
    settingToggle.addEventListener('change', () => {
        try { localStorage.setItem(STORAGE_KEY, String(settingToggle.checked)); } catch {}
        if (settingToggle.checked) registerTools();
        else unregisterTools();
    });
    row.append(label, settingToggle);
    fieldset.append(row);
}

export function initAgentTools() {
    if (!modelContext()?.registerTool) return;
    createSetting();
    registerTools();
}

export { definitions as agentToolDefinitions, enabled as agentToolsEnabled };
