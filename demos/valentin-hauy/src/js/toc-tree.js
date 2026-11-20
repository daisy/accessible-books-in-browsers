// Saved preferences must also be listed in settings-file.js (export, import and reset).
//
// The table of contents is the book's nested lists of links, kept as they are: each section is an
// ordinary link, one Tab stop each, and screen readers read the lists' nesting and item counts as
// usual. No ARIA widget roles (user, 2026-11-19: standard controls only). Two standard controls go
// with it:
// - Find a section, a search field that narrows the lists to the matching sections and the sections
//   they're in. Enter opens the first match; Escape clears it.
// - Show levels, a select (1, 2, 3, All): how many levels of sections show, from only the outermost
//   to every level.
// Shortcuts while it's open (remappable, like every reader key): Alt+Shift+F goes to Find a section
// (Search's key, see popovers.js), and Alt+Shift+1, 2, 3 and 0 show 1, 2, 3 or all levels. Each says
// what it did.
import { announceReaderAction, registerAction } from './reader-actions.js';
import { currentTocEntry } from './popovers.js';
import { normalizeSearchText } from './search-text.js';

const DEPTH_KEY = 'webbook-toc-depth';
const DEPTHS = ['1', '2', '3', 'all'];
const FIND_DELAY = 150;
const FIND_STATUS_DELAY = 600;

let toc;
let list;
let links = [];
let depth = 'all';
let findInput = null;
let findStatus = null;
let findTimer;
let findStatusTimer;

// Registered with the other panel actions, before the shortcuts start (main.js)
export function initTocActions() {
    for (const [value, code] of [['1', 'Digit1'], ['2', 'Digit2'], ['3', 'Digit3'], ['all', 'Digit0']]) {
        registerAction({
            id: `toc-levels-${value}`,
            label: value === 'all' ? 'Table of contents: show all levels' : `Table of contents: show ${value} ${value === '1' ? 'level' : 'levels'}`,
            group: 'Panels',
            inPanels: true,
            defaultKeys: [{ code, alt: true, shift: true }],
            isAvailable: () => Boolean(toc?.matches(':popover-open') && depthValues().includes(value)),
            run: () => {
                clearFind();
                writeDepth(value);
                applyDepth(value);
                announceReaderAction(levelsMessage(value));
            }
        });
    }
}

function levelsMessage(value) {
    return value === 'all' ? 'Showing all levels.' : value === '1' ? 'Showing the top level.' : `Showing ${value} levels.`;
}

// For Search's key while the table of contents is open
export function tocFindAvailable() {
    return Boolean(toc?.matches(':popover-open') && findInput);
}

export function focusTocFind() {
    if (!tocFindAvailable()) return false;
    findInput.focus();
    findInput.select();
    announceReaderAction('Find a section.');
    return true;
}

export function initTocTree() {
    toc = document.querySelector('#webbook-toc-nav');
    moveCoverLinkToAbout();
    list = directChild(toc, 'ol');
    if (!toc || !list) return;
    list.setAttribute('aria-labelledby', 'webbook-toc-nav-hd');
    links = Array.from(list.querySelectorAll('li > a'));
    if (!links.length) return;

    addFindField();
    addDepthControl();
    applyDepth(readDepth());

    toc.addEventListener('toggle', event => {
        if (event.newState !== 'open') {
            clearFind();
            return;
        }
        refreshTocTree({ moveFocus: true });
    });
    document.addEventListener('webbook:pagechange', () => refreshTocTree());
    document.addEventListener('webbook:narrationpositionchange', () => {
        if (toc.matches(':popover-open')) renderCurrentMarker();
    });
}

function moveCoverLinkToAbout() {
    const coverLink = document.querySelector('#webbook-cover-link');
    const infoBody = document.querySelector('#webbook-info .webbook-info-body');
    const progress = infoBody?.querySelector('#webbook-progress');
    if (!coverLink || !infoBody) return;
    coverLink.textContent = 'Go to cover';
    coverLink.classList.add('webbook-cover-page-link');
    if (progress) infoBody.insertBefore(coverLink, progress);
    else infoBody.append(coverLink);
}

// Marks the section being read, and on opening the panel puts focus on it
export function refreshTocTree({ moveFocus = false } = {}) {
    if (!list) return;
    const marked = renderCurrentMarker();
    if (!moveFocus) return;
    const target = marked || visibleLinks()[0];
    if (!target) return;
    target.focus({ preventScroll: true });
    target.scrollIntoView({ block: 'nearest' });
}

// The section being read, or the nearest section around it that shows at the chosen levels
function renderCurrentMarker() {
    const current = currentTocEntry().current;
    const actual = current && links.includes(current) ? current : null;
    const marked = actual ? nearestVisibleLink(actual) : null;
    links.forEach(link => link.removeAttribute('aria-current'));
    marked?.setAttribute('aria-current', 'page');
    return marked;
}

// Matched the way book search matches, anywhere in a title
function addFindField() {
    const header = toc.querySelector('#webbook-toc-header');
    if (!header || header.querySelector('#webbook-toc-find')) return;
    const wrapper = document.createElement('div');
    wrapper.id = 'webbook-toc-find';
    const label = document.createElement('label');
    label.htmlFor = 'webbook-toc-find-input';
    label.textContent = 'Find a section';
    findInput = document.createElement('input');
    findInput.type = 'search';
    findInput.id = 'webbook-toc-find-input';
    findInput.autocomplete = 'off';
    findInput.setAttribute('aria-describedby', 'webbook-toc-find-status');
    findStatus = document.createElement('p');
    findStatus.id = 'webbook-toc-find-status';
    findStatus.setAttribute('role', 'status');
    findStatus.setAttribute('aria-atomic', 'true');
    wrapper.append(label, findInput, findStatus);
    header.append(wrapper);

    findInput.addEventListener('input', () => {
        clearTimeout(findTimer);
        findTimer = setTimeout(() => applyFind(findInput.value), FIND_DELAY);
    });
    findInput.addEventListener('keydown', handleFindKeydown);
}

function handleFindKeydown(event) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === 'Escape' && findInput.value) {
        // Clears the find; a second Escape closes the panel as usual
        event.preventDefault();
        event.stopPropagation();
        clearFind();
        return;
    }
    if (event.key !== 'Enter' || !findInput.value) return;
    clearTimeout(findTimer);
    applyFind(findInput.value);
    const first = links.find(link => link.dataset.webbookTocMatch === 'true');
    if (!first) return;
    event.preventDefault();
    first.click();
}

// Shows the matches, the sections they're in, and what's inside a matching section, at every level
function applyFind(query) {
    const lang = document.documentElement.lang || '';
    const wanted = normalizeSearchText(query.trim().replace(/\s+/g, ' '), lang);
    if (!wanted) {
        clearFind({ keepText: true });
        return;
    }
    const shown = new Set();
    let matches = 0;
    for (const link of links) {
        const match = normalizeSearchText(linkText(link), lang).includes(wanted);
        link.dataset.webbookTocMatch = String(match);
        if (!match) continue;
        matches += 1;
        shown.add(link);
        sublistFor(link)?.querySelectorAll('li > a').forEach(inner => shown.add(inner));
        for (let parent = parentLink(link); parent; parent = parentLink(parent)) shown.add(parent);
    }
    for (const link of links) link.parentElement.hidden = !shown.has(link);
    nestedLists().forEach(nested => { nested.hidden = false; });
    renderCurrentMarker();
    announceFind(matches);
}

function clearFind({ keepText = false } = {}) {
    clearTimeout(findTimer);
    clearTimeout(findStatusTimer);
    if (findInput && !keepText) findInput.value = '';
    if (findStatus) findStatus.textContent = '';
    if (!links.some(link => 'webbookTocMatch' in link.dataset)) return;
    for (const link of links) {
        link.parentElement.hidden = false;
        delete link.dataset.webbookTocMatch;
    }
    applyDepth(depth);
}

// After a pause in typing, as book search does, so it isn't read out on every key
function announceFind(matches) {
    clearTimeout(findStatusTimer);
    findStatusTimer = setTimeout(() => {
        findStatus.textContent = matches === 0 ? 'No sections match'
            : `${matches} ${matches === 1 ? 'section matches' : 'sections match'}`;
    }, FIND_STATUS_DELAY);
}

function addDepthControl() {
    const header = toc.querySelector('#webbook-toc-header');
    if (!header || header.querySelector('#webbook-toc-depth')) return;
    const maxDepth = Math.max(...links.map(linkDepth));
    if (maxDepth <= 1) return;
    const wrapper = document.createElement('div');
    wrapper.id = 'webbook-toc-depth-control';
    const label = document.createElement('label');
    label.htmlFor = 'webbook-toc-depth';
    label.textContent = 'Show levels';
    const select = document.createElement('select');
    select.id = 'webbook-toc-depth';
    for (const value of [...DEPTHS.slice(0, Math.min(3, maxDepth - 1)), 'all']) {
        select.add(new Option(value === 'all' ? 'All' : value, value));
    }
    select.addEventListener('change', () => {
        clearFind();
        writeDepth(select.value);
        applyDepth(select.value);
        // The select already says which it is; this is for anyone not hearing it
        announceReaderAction(levelsMessage(select.value), { show: false });
    });
    wrapper.append(label, select);
    header.append(wrapper);
}

function depthSelect() {
    return toc?.querySelector('#webbook-toc-depth') || null;
}

function depthValues() {
    return Array.from(depthSelect()?.options || [], option => option.value);
}

function readDepth() {
    try {
        const value = localStorage.getItem(DEPTH_KEY);
        return DEPTHS.includes(value) ? value : 'all';
    } catch {
        return 'all';
    }
}

function writeDepth(value) {
    try { localStorage.setItem(DEPTH_KEY, value); } catch { }
}

// Hides the lists of sections deeper than the chosen level
function applyDepth(value) {
    depth = depthValues().includes(value) ? value : 'all';
    const select = depthSelect();
    if (select) select.value = depth;
    const shownLevels = depth === 'all' ? Infinity : Number(depth);
    nestedLists().forEach(nested => { nested.hidden = listLevel(nested) > shownLevels; });
    renderCurrentMarker();
    // A section that's now hidden can't keep focus: the nearest one still shown gets it
    const focused = document.activeElement;
    if (focused && links.includes(focused) && !isVisible(focused)) nearestVisibleLink(focused)?.focus({ preventScroll: true });
}

// The entry's title alone, without the narrated mark
function linkText(link) {
    const clone = link.cloneNode(true);
    clone.querySelectorAll('.sr-only, .webbook-narrated-mark').forEach(node => node.remove());
    return clone.textContent.trim().replace(/\s+/g, ' ');
}

function nearestVisibleLink(link) {
    let candidate = link;
    while (candidate && !isVisible(candidate)) candidate = parentLink(candidate);
    return candidate;
}

function visibleLinks() {
    return links.filter(isVisible);
}

function isVisible(link) {
    return !link.closest('ol[hidden], li[hidden]');
}

function nestedLists() {
    return Array.from(list.querySelectorAll('ol'));
}

// The outermost list is level 1
function listLevel(ol) {
    let level = 1;
    for (let parent = ol.parentElement?.closest('ol'); parent && list.contains(parent); parent = parent.parentElement?.closest('ol')) level += 1;
    return level;
}

function linkDepth(link) {
    return listLevel(link.closest('ol'));
}

function sublistFor(link) {
    return directChild(link.parentElement, 'ol');
}

function parentLink(link) {
    const parentList = link.parentElement?.parentElement;
    if (!parentList || parentList === list) return null;
    return directChild(parentList.parentElement, 'a');
}

function directChild(parent, localName) {
    if (!parent) return null;
    return Array.from(parent.children).find(child => child.localName === localName) || null;
}
