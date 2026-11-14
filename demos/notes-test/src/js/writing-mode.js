// Saved preferences must also be listed in settings-file.js (export, import and reset).
// Vertical text (plan 28). A book in vertical writing (Japanese, Chinese) is shown vertically, read
// in columns from the right, and the page scrolls sideways. The Writing direction setting can set
// it horizontal instead: global, like every setting, and only shown on a book with vertical text.
// The head script sets html.webbook-vertical before the first paint; this keeps it in step with the
// setting and with pages loaded in place, and makes the mouse wheel and the paging keys move along
// the text.
import { appendSetting, settingsSection } from './settings-sections.js';
import { optionElement, readSetting, writeSetting } from './stored-settings.js';
import { isVerticalText, scrollAlongText, scrollToReading, viewportLength } from './reading-axis.js';

const KEY = 'webbook-writing-mode';
const ROW_ID = 'webbook-writing-mode-row';
const SELECT_ID = 'webbook-writing-mode';

function bookWritingMode() {
    const mode = document.documentElement.getAttribute('data-webbook-writing-mode');
    return mode === 'vertical-rl' || mode === 'vertical-lr' ? mode : null;
}

// The same decision as the head script in index.html
export function applyWritingMode() {
    const root = document.documentElement;
    const book = bookWritingMode();
    const vertical = Boolean(book) && readSetting(KEY) !== 'horizontal';
    const changed = vertical !== root.classList.contains('webbook-vertical');
    root.classList.toggle('webbook-vertical', vertical);
    root.classList.toggle('webbook-vertical-lr', vertical && book === 'vertical-lr');
    const row = document.getElementById(ROW_ID);
    if (row) row.hidden = !book;
    const select = document.getElementById(SELECT_ID);
    if (select) select.value = vertical || !book ? 'vertical' : 'horizontal';
    if (changed) document.dispatchEvent(new CustomEvent('webbook:layoutchange'));
}

function buildSetting() {
    if (document.getElementById(ROW_ID) || !settingsSection('text')) return;
    const row = document.createElement('div');
    row.id = ROW_ID;
    const label = document.createElement('label');
    label.htmlFor = SELECT_ID;
    label.textContent = 'Writing direction';
    const select = document.createElement('select');
    select.id = SELECT_ID;
    select.append(optionElement('vertical', 'Vertical'), optionElement('horizontal', 'Horizontal'));
    row.append(label, select);
    appendSetting('text', row);
    select.addEventListener('change', () => {
        writeSetting(KEY, select.value === 'horizontal' ? 'horizontal' : '');
        applyWritingMode();
        // From the start of the page: a scroll position along one axis means nothing along the other
        scrollToReading(0);
    });
}

// Inside a panel, the toolbars or anything that scrolls on its own, the wheel is the browser's
function wheelBelongsElsewhere(target) {
    if (!(target instanceof Element)) return false;
    if (!target.closest('main')) return true;
    for (let elm = target; elm && elm.tagName !== 'MAIN'; elm = elm.parentElement) {
        const style = getComputedStyle(elm);
        if (/(auto|scroll)/.test(style.overflowY) && elm.scrollHeight > elm.clientHeight) return true;
    }
    return false;
}

// Down the wheel is on through the text, as in Japanese reading apps
function onWheel(event) {
    if (!isVerticalText() || event.ctrlKey || event.defaultPrevented) return;
    if (Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
    if (wheelBelongsElsewhere(event.target)) return;
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewportLength() : 1;
    event.preventDefault();
    scrollAlongText(event.deltaY * unit);
}

function isTextEntry(target) {
    return target instanceof Element && Boolean(target.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]'));
}

// The paging keys move a screen along the text, Home and End to its start and end, and the up and
// down arrows a little, since the page has no up and down
function onKeyDown(event) {
    if (!isVerticalText() || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    if (isTextEntry(event.target) || document.querySelector('[popover]:popover-open')) return;
    const target = event.target instanceof Element ? event.target : null;
    if (target && !target.closest('main') && target !== document.body && target !== document.documentElement) return;
    const page = viewportLength() * .85;
    const step = 48;
    const moves = {
        PageDown: page, PageUp: -page,
        ' ': event.shiftKey ? -page : page,
        ArrowDown: step, ArrowUp: -step
    };
    if (event.key === 'Home' || event.key === 'End') {
        event.preventDefault();
        scrollToReading(event.key === 'Home' ? 0 : Number.MAX_SAFE_INTEGER / 4);
        return;
    }
    if (!(event.key in moves)) return;
    // A focused link or button keeps its own Space
    if (event.key === ' ' && target?.closest('a[href], button, summary, [role="button"]')) return;
    event.preventDefault();
    scrollAlongText(moves[event.key], event.repeat ? 'auto' : 'smooth');
}

export function initWritingMode() {
    buildSetting();
    applyWritingMode();
    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKeyDown);
}
