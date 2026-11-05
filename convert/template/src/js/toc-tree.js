import { currentTocEntry } from './popovers.js';
import { normalizeSearchText } from './search-text.js';

const DEPTH_KEY = 'webbook-toc-depth';
const TYPEAHEAD_DELAY = 500;
const FIND_DELAY = 150;
const FIND_STATUS_DELAY = 600;

let toc;
let tree;
let items = [];
let actualCurrent = null;
let typeahead = '';
let typeaheadTimer;
let findInput = null;
let findStatus = null;
let findTimer;
let findStatusTimer;
// Each section's expanded state from before a find, put back when it's cleared
let expandedBeforeFind = null;

export function initTocTree() {
    toc = document.querySelector('#webbook-toc-nav');
    moveCoverLinkToAbout();
    tree = directChild(toc, 'ol');
    if (!toc || !tree) return;

    tree.setAttribute('role', 'tree');
    tree.setAttribute('aria-labelledby', 'webbook-toc-nav-hd');
    enhanceList(tree, 1);
    items = Array.from(tree.querySelectorAll('a[role="treeitem"]'));
    if (!items.length) return;

    actualCurrent = items.find(item => item.getAttribute('aria-current') === 'page') || null;
    addFindField();
    addDepthControl();
    applySavedDepth();
    setRovingItem(items[0]);

    tree.addEventListener('keydown', handleTreeKeydown);
    tree.addEventListener('click', handleTreeClick);
    toc.addEventListener('toggle', event => {
        if (event.newState !== 'open') {
            clearFind();
            return;
        }
        refreshTocTree({ expandCurrentPath: true, moveFocus: true });
    });
    document.addEventListener('webbook:pagechange', () => {
        refreshTocTree({ expandCurrentPath: true });
    });
    document.addEventListener('webbook:narrationpositionchange', () => {
        if (toc.matches(':popover-open')) refreshNarrationCurrent();
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

export function refreshTocTree({ expandCurrentPath = false, moveFocus = false } = {}) {
    if (!tree) return;
    const current = currentTocEntry().current;
    actualCurrent = current?.matches?.('[role="treeitem"]') ? current : null;
    if (actualCurrent && expandCurrentPath) expandPath(actualCurrent);

    const marked = renderCurrentMarker();

    const target = marked || visibleItems()[0] || items[0];
    setRovingItem(target);
    if (moveFocus && target) moveFocusToItem(target, { scroll: true });
}

function refreshNarrationCurrent() {
    const current = currentTocEntry().current;
    const next = current?.matches?.('[role="treeitem"]') ? current : null;
    if (next === actualCurrent) return;
    actualCurrent = next;
    renderCurrentMarker();
}

function renderCurrentMarker() {
    const marked = actualCurrent ? nearestVisibleItem(actualCurrent) : null;
    items.forEach(item => item.removeAttribute('aria-current'));
    marked?.setAttribute('aria-current', 'page');
    return marked;
}

// All tree focus changes pass here so a future talking-TOC feature has one hook.
function moveFocusToItem(item, { scroll = false } = {}) {
    if (!item) return;
    setRovingItem(item);
    item.focus({ preventScroll: !scroll });
    if (scroll) item.scrollIntoView({ block: 'nearest' });
}

function enhanceList(list, level) {
    if (level > 1) list.setAttribute('role', 'group');
    directChildren(list, 'li').forEach(li => {
        li.setAttribute('role', 'none');
        const item = directChild(li, 'a');
        const group = directChild(li, 'ol');
        if (item) {
            item.setAttribute('role', 'treeitem');
            item.tabIndex = -1;
        }
        if (group) {
            enhanceList(group, level + 1);
            if (item) {
                item.setAttribute('aria-expanded', 'true');
                li.insertBefore(createChevron(), item);
                addSubsectionCount(item, group);
            }
        }
    });
}

// Screen readers say whether a section is expanded, and where an entry is among its siblings, but
// not how many entries a section holds. Shown after the title, and given to screen readers as the
// entry's description rather than in its name.
function addSubsectionCount(item, group) {
    const count = directChildren(group, 'li').length;
    if (!count) return;
    const text = `${count} ${count === 1 ? 'subsection' : 'subsections'}`;
    item.setAttribute('aria-description', text);
    const badge = document.createElement('span');
    badge.className = 'webbook-toc-count';
    badge.setAttribute('aria-hidden', 'true');
    badge.title = text;
    badge.textContent = String(count);
    item.append(badge);
}

function createChevron() {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'webbook-toc-chevron';
    button.tabIndex = -1;
    button.setAttribute('aria-hidden', 'true');
    button.title = 'Expand or collapse section';
    return button;
}

// Type-ahead only finds the start of a title; this finds text anywhere in one, matched the way book
// search matches, and narrows the tree to the matching entries and the sections they're in
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
    if (event.key !== 'ArrowDown' && event.key !== 'Enter') return;
    clearTimeout(findTimer);
    if (findInput.value) applyFind(findInput.value);
    const first = findInput.value ? visibleItems().find(item => item.dataset.webbookTocMatch === 'true') : visibleItems()[0];
    if (!first) return;
    event.preventDefault();
    if (event.key === 'Enter') first.click();
    else moveFocusToItem(first, { scroll: true });
}

function applyFind(query) {
    const lang = document.documentElement.lang || '';
    const wanted = normalizeSearchText(query.trim().replace(/\s+/g, ' '), lang);
    if (!wanted) {
        clearFind({ keepText: true });
        return;
    }
    if (!expandedBeforeFind) {
        expandedBeforeFind = new Map(items.filter(groupForItem).map(item => [item, item.getAttribute('aria-expanded') === 'true']));
    }

    // Shown: the matches, the sections they're in (opened), and what's inside a matching section
    // (left closed, so it can still be opened)
    const shown = new Set();
    const opened = new Set();
    let matches = 0;
    for (const item of items) {
        const match = normalizeSearchText(itemText(item), lang).includes(wanted);
        item.dataset.webbookTocMatch = String(match);
        if (!match) continue;
        matches += 1;
        shown.add(item);
        groupForItem(item)?.querySelectorAll('a[role="treeitem"]').forEach(inner => shown.add(inner));
        for (let parent = parentItem(item); parent; parent = parentItem(parent)) {
            shown.add(parent);
            opened.add(parent);
        }
    }
    for (const item of items) {
        item.parentElement.hidden = !shown.has(item);
        if (groupForItem(item)) setExpanded(item, opened.has(item));
    }
    renderCurrentMarker();
    announceFind(matches);
}

function clearFind({ keepText = false } = {}) {
    clearTimeout(findTimer);
    clearTimeout(findStatusTimer);
    if (findInput && !keepText) findInput.value = '';
    if (findStatus) findStatus.textContent = '';
    if (!expandedBeforeFind) return;
    for (const item of items) {
        item.parentElement.hidden = false;
        delete item.dataset.webbookTocMatch;
    }
    expandedBeforeFind.forEach((expanded, item) => setExpanded(item, expanded));
    expandedBeforeFind = null;
    renderCurrentMarker();
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
    const maxDepth = Math.max(...items.map(itemDepth));
    if (maxDepth <= 1) return;
    const wrapper = document.createElement('div');
    wrapper.id = 'webbook-toc-depth-control';
    const label = document.createElement('label');
    label.htmlFor = 'webbook-toc-depth';
    label.textContent = 'Show levels';
    const select = document.createElement('select');
    select.id = 'webbook-toc-depth';
    for (let level = 1; level <= Math.min(3, maxDepth - 1); level += 1) {
        select.add(new Option(String(level), String(level)));
    }
    select.add(new Option('All', 'all'));
    select.addEventListener('change', () => {
        clearFind();
        writeDepth(select.value);
        applyDepth(select.value);
    });
    wrapper.append(label, select);
    header.append(wrapper);
}

function applySavedDepth() {
    const select = toc.querySelector('#webbook-toc-depth');
    if (!select) return;
    const saved = readDepth();
    const available = Array.from(select.options, option => option.value);
    select.value = available.includes(saved) ? saved : 'all';
    applyDepth(select.value);
}

function readDepth() {
    try {
        const value = localStorage.getItem(DEPTH_KEY);
        return ['1', '2', '3', 'all'].includes(value) ? value : 'all';
    } catch {
        return 'all';
    }
}

function writeDepth(value) {
    try { localStorage.setItem(DEPTH_KEY, value); } catch { }
}

function applyDepth(value) {
    const depth = value === 'all' ? Infinity : Number(value);
    items.forEach(item => {
        if (groupForItem(item)) setExpanded(item, itemDepth(item) < depth);
    });
    const current = actualCurrent || items.find(item => item.getAttribute('aria-current') === 'page');
    if (current) expandPath(current);
    const focused = document.activeElement?.matches?.('[role="treeitem"]') ? document.activeElement : null;
    if (focused && !isVisible(focused)) moveFocusToItem(nearestVisibleItem(focused));
    renderCurrentMarker();
}

function handleTreeClick(event) {
    const chevron = event.target instanceof Element ? event.target.closest('.webbook-toc-chevron') : null;
    if (!chevron || !tree.contains(chevron)) return;
    event.preventDefault();
    event.stopPropagation();
    const item = directChild(chevron.parentElement, 'a');
    if (item) {
        setExpanded(item, item.getAttribute('aria-expanded') !== 'true');
        renderCurrentMarker();
    }
}

function handleTreeKeydown(event) {
    const item = event.target instanceof Element ? event.target.closest('[role="treeitem"]') : null;
    if (!item || !tree.contains(item) || event.altKey || event.ctrlKey || event.metaKey) return;
    const visible = visibleItems();
    const index = visible.indexOf(item);
    let target = null;

    if (event.key === 'ArrowDown') target = visible[index + 1];
    else if (event.key === 'ArrowUp') {
        target = visible[index - 1];
        if (!target && findInput) {
            event.preventDefault();
            findInput.focus();
            return;
        }
    }
    else if (event.key === 'Home') target = visible[0];
    else if (event.key === 'End') target = visible.at(-1);
    else if (event.key === 'ArrowRight') {
        const group = groupForItem(item);
        if (group && item.getAttribute('aria-expanded') !== 'true') setExpanded(item, true);
        else if (group) target = firstItem(group);
    }
    else if (event.key === 'ArrowLeft') {
        if (groupForItem(item) && item.getAttribute('aria-expanded') === 'true') setExpanded(item, false);
        else target = parentItem(item);
    }
    else if (event.key === '*') expandSiblingGroups(item);
    else if (event.key.length === 1) target = typeaheadItem(item, event.key);
    else return;

    event.preventDefault();
    if (target) moveFocusToItem(target);
}

function typeaheadItem(current, character) {
    clearTimeout(typeaheadTimer);
    typeahead += character.toLocaleLowerCase(document.documentElement.lang || undefined);
    typeaheadTimer = setTimeout(() => { typeahead = ''; }, TYPEAHEAD_DELAY);
    const visible = visibleItems();
    const start = visible.indexOf(current);
    const ordered = [...visible.slice(start + 1), ...visible.slice(0, start + 1)];
    const match = ordered.find(item => itemLabel(item).startsWith(typeahead));
    if (match) return match;
    typeahead = character.toLocaleLowerCase(document.documentElement.lang || undefined);
    return ordered.find(item => itemLabel(item).startsWith(typeahead)) || null;
}

function itemLabel(item) {
    return itemText(item).toLocaleLowerCase(document.documentElement.lang || undefined);
}

// The entry's title alone, without the narrated mark or subsection count
function itemText(item) {
    const clone = item.cloneNode(true);
    clone.querySelectorAll('.sr-only, .webbook-narrated-mark, .webbook-toc-count').forEach(node => node.remove());
    return clone.textContent.trim().replace(/\s+/g, ' ');
}

function expandSiblingGroups(item) {
    const list = item.parentElement?.parentElement;
    directChildren(list, 'li').forEach(li => {
        const sibling = directChild(li, 'a');
        if (sibling && groupForItem(sibling)) setExpanded(sibling, true);
    });
}

function setExpanded(item, expanded) {
    const group = groupForItem(item);
    if (!group) return;
    item.setAttribute('aria-expanded', String(expanded));
    group.hidden = !expanded;
}

function expandPath(item) {
    let parent = parentItem(item);
    while (parent) {
        setExpanded(parent, true);
        parent = parentItem(parent);
    }
}

function nearestVisibleItem(item) {
    let candidate = item;
    while (candidate && !isVisible(candidate)) candidate = parentItem(candidate);
    return candidate;
}

function visibleItems() {
    return items.filter(isVisible);
}

function isVisible(item) {
    return !item.closest('ol[hidden], li[hidden]');
}

function setRovingItem(item) {
    items.forEach(candidate => { candidate.tabIndex = candidate === item ? 0 : -1; });
}

function itemDepth(item) {
    let depth = 1;
    let list = item.parentElement?.parentElement;
    while (list && list !== tree) {
        if (list.matches('ol')) depth += 1;
        list = list.parentElement?.closest('ol');
    }
    return depth;
}

function groupForItem(item) {
    return directChild(item.parentElement, 'ol');
}

function firstItem(list) {
    return directChild(directChild(list, 'li'), 'a');
}

function parentItem(item) {
    const parentList = item.parentElement?.parentElement;
    if (!parentList || parentList === tree) return null;
    return directChild(parentList.parentElement, 'a');
}

function directChild(parent, localName) {
    if (!parent) return null;
    return Array.from(parent.children).find(child => child.localName === localName) || null;
}

function directChildren(parent, localName) {
    if (!parent) return [];
    return Array.from(parent.children).filter(child => child.localName === localName);
}
