import { getActions, runAction, announceReaderAction } from './reader-actions.js';
import { navigateTo } from './in-place-navigation.js';
import { currentTocEntry } from './popovers.js';
import { currentPrintPageLabel } from './current-print-page.js';
import { lastNarratedElement } from './narration-position.js';
import { pageAudio } from './dom-utils.js';
import { searchBook, describeSearchResult } from './search.js';
import { bookTimelineStatus, seekBookTime } from './book-timeline.js';

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
    const title = document.querySelector('meta[name="webbook-book-title"]')?.content
        || document.querySelector('#webbook-info-hd')?.textContent?.trim() || document.title;
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

function flatToc() {
    const flatten = items => items.flatMap(item => [item, ...flatten(item.children || [])]);
    return flatten(tocItems());
}

function focusDestination(href) {
    navigateTo(href, { moveFocus: true });
    announceReaderAction(`Moved to ${chapterTitle()}.`);
}

function goTo(input) {
    if (input.section) {
        const wanted = String(input.section).trim().toLocaleLowerCase();
        const item = flatToc().find(item => item.id === input.section || item.title.toLocaleLowerCase() === wanted)
            || flatToc().find(item => item.title.toLocaleLowerCase().includes(wanted));
        if (!item) return error(`No section matched “${input.section}”.`);
        focusDestination(item.id);
        return result(`Moved to ${item.title}.`, { target: item.id, title: item.title });
    }
    if (input.print_page !== undefined) {
        const wanted = String(input.print_page).trim().toLocaleLowerCase();
        const option = Array.from(document.querySelectorAll('#pages option')).find(option =>
            option.value.trim().toLocaleLowerCase() === wanted || option.label.trim().toLocaleLowerCase() === wanted);
        if (!option?.dataset.href) return error(`Print page ${input.print_page} is not available.`);
        focusDestination(option.dataset.href);
        return result(`Moved to print page ${input.print_page}.`, { printPage: String(input.print_page) });
    }
    if (input.book_time !== undefined) {
        if (!bookTimelineStatus()) return error('Book time is not available for this book.');
        seekBookTime(Number(input.book_time), false);
        announceReaderAction(`Moved to ${Math.round(Number(input.book_time))} seconds in the book.`);
        return result(`Moved to ${Math.round(Number(input.book_time))} seconds in the book.`, { bookTime: Number(input.book_time) });
    }
    const actions = { next_page: 'next-page', previous_page: 'previous-page' };
    if (actions[input.direction]) return runReaderAction(actions[input.direction]);
    if (input.direction === 'next_chapter' || input.direction === 'previous_chapter') {
        const items = flatToc();
        const current = currentTocEntry().current;
        const index = items.findIndex(item => current && new URL(item.id, location.href).href === current.href);
        const target = items[index + (input.direction === 'next_chapter' ? 1 : -1)];
        if (!target) return error(`There is no ${input.direction === 'next_chapter' ? 'next' : 'previous'} chapter.`);
        focusDestination(target.id);
        return result(`Moved to ${target.title}.`, { target: target.id, title: target.title });
    }
    return error('Choose a section, print page, book time, or direction.');
}

function runReaderAction(id) {
    const action = getActions().find(candidate => candidate.id === id);
    if (!action?.isAvailable()) return error(`${action?.label || id} is not available here.`);
    runAction(id);
    announceReaderAction(`${action.label}.`);
    return result(`${action.label}.`, { action: id });
}

function narration(input) {
    const audio = pageAudio();
    if (input.action === 'play' || input.action === 'pause') {
        if (!audio) return error('Narration is not available on this page.');
        const shouldPlay = input.action === 'play';
        if (shouldPlay === !audio.paused) return result(`Narration is already ${shouldPlay ? 'playing' : 'paused'}.`);
        return runReaderAction('play-pause');
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
    return result(`${label} ${shown}.`, { option: input.option, value: control.type === 'checkbox' ? control.checked : Number(control.value) });
}

async function search(input) {
    const matches = await searchBook(String(input.query || ''));
    if (matches === null) return error("Search isn't available for this book.");
    const results = matches.slice(0, 10).map(describeSearchResult).filter(Boolean);
    return result(`${results.length} results for “${input.query}”.`, { results });
}

function visibleText(root) {
    return root?.textContent?.replace(/\s+/g, ' ').trim() || '';
}

function readText(input) {
    let root;
    if (input.scope === 'current_phrase') root = lastNarratedElement();
    else if (input.scope === 'current_section') {
        const current = currentTocEntry().current;
        const id = current ? decodeURIComponent(new URL(current.href).hash.slice(1)) : '';
        root = (id && document.getElementById(id)) || document.querySelector('main');
    } else root = document.querySelector('main');
    if (!root) return error(`${input.scope.replace('_', ' ')} is not available.`);
    const maximum = Math.max(100, Math.min(20000, Number(input.max_characters) || 5000));
    const full = visibleText(root);
    const text = full.length > maximum ? `${full.slice(0, maximum)}…` : full;
    return result(`Read ${text.length} characters from the ${input.scope.replace('_', ' ')}.`, { text, truncated: full.length > maximum });
}

function definitions() {
    return [
        { name: 'reader_status', title: 'Reader status', description: 'Get the current book, reading position, narration state, time, speed, and skip settings.', inputSchema: objectSchema({}), annotations: { readOnlyHint: true }, execute: readerStatus },
        { name: 'list_contents', title: 'List contents', description: 'List this book’s table of contents. Use an item id with go_to.', inputSchema: objectSchema({}), annotations: { readOnlyHint: true }, execute: () => result('Table of contents.', { contents: tocItems() }) },
        { name: 'go_to', title: 'Go to a place', description: 'Move to a section, print page, book time in seconds, or adjacent page or chapter.', inputSchema: objectSchema({ section: { type: 'string' }, print_page: { type: ['string', 'number'] }, book_time: { type: 'number', minimum: 0 }, direction: enumSchema(['next_page', 'previous_page', 'next_chapter', 'previous_chapter']) }), execute: goTo },
        { name: 'narration', title: 'Control narration', description: 'Play or pause narration, play from the reading position, move by phrase, or skip the current structure.', inputSchema: { ...objectSchema({ action: enumSchema(['play', 'pause', 'play_from_here', 'next_phrase', 'previous_phrase', 'skip_past']) }), required: ['action'] }, execute: narration },
        { name: 'set_reading_option', title: 'Set a reading option', description: 'Change a reading setting using the same controls as the reader interface.', inputSchema: { ...objectSchema({ option: enumSchema(Object.keys(OPTION_CONTROLS)), value: { type: ['boolean', 'number'] } }), required: ['option', 'value'] }, execute: setReadingOption },
        { name: 'search_book', title: 'Search book', description: 'Search this book and return up to ten results with targets for go_to.', inputSchema: { ...objectSchema({ query: { type: 'string', minLength: 1 } }), required: ['query'] }, annotations: { readOnlyHint: true, untrustedContentHint: true }, execute: search },
        { name: 'read_text', title: 'Read book text', description: 'Read text from the current phrase, section, or page.', inputSchema: { ...objectSchema({ scope: enumSchema(['current_phrase', 'current_section', 'current_page']), max_characters: { type: 'number', minimum: 100, maximum: 20000 } }), required: ['scope'] }, annotations: { readOnlyHint: true, untrustedContentHint: true }, execute: readText }
    ];
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
    createSetting();
    registerTools();
}

export { definitions as agentToolDefinitions, enabled as agentToolsEnabled };
