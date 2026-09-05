function selectElm(selector) {
    if (selector.type === 'FragmentSelector') return document.querySelector(`#${selector.value}`);
    if (selector.type === 'CssSelector') return document.querySelector(selector.value);
    return null;
}
// Escapability: offer a Skip past button for the enclosing structure during playback.
const ESCAPABLE_STRUCTURE_RULES = [
    { classes: ['epubtype_table'], tags: ['TABLE'], label: 'table' },
    { classes: ['epubtype_list'], tags: ['OL', 'UL'], label: 'list' },
    { classes: ['epubtype_figure'], tags: ['FIGURE'], label: 'figure' },
    { classes: ['epubtype_sidebar'], tags: [], label: 'sidebar' },
    { classes: ['epubtype_footnote'], tags: [], label: 'footnote' },
    { classes: ['epubtype_endnote'], tags: [], label: 'endnote' },
    { classes: ['epubtype_note'], tags: [], label: 'note' },
];

function findEscapableStructure(elm) {
    const main = document.querySelector('main');
    let node = elm;
    while (node && node !== main) {
        const rule = ESCAPABLE_STRUCTURE_RULES.find(rule => matchesStructureRule(node, rule));
        if (rule) return { elm: node, label: rule.label };
        node = node.parentElement;
    }
    return null;
}

function matchesStructureRule(elm, rule) {
    return rule.tags.includes(elm.tagName) || rule.classes.some(c => elm.classList.contains(c));
}

function getEscapeTime(ancestor, track, fromIdx) {
    const cues = Array.from(track.cues);
    for (let i = fromIdx + 1; i < cues.length; i++) {
        try {
            const elm = selectElm(JSON.parse(cues[i].text).selector);
            if (elm && !ancestor.contains(elm)) return cues[i].startTime;
        } catch { /* skip malformed cue */ }
    }
    return null;
}

const SKIP_SEEK_PREROLL_SECONDS = 0.2;
const SKIP_UNMUTE_BEFORE_TARGET_SECONDS = 0.05;
const escapeBtn = document.querySelector('#webbook-escape-btn');
const escapeStatus = document.querySelector('#webbook-escape-status');
const escapeLabelEl = document.querySelector('#webbook-escape-label');
let currentEscapableStructure = null;
let skipSeekIgnoreUntil = 0;
let skipMuteUntil = 0;

function showEscape(structure, escapeTime, announce) {
    const label = structure.label;
    if (escapeLabelEl) escapeLabelEl.textContent = label;
    if (escapeBtn) {
        escapeBtn.hidden = false;
        escapeBtn.disabled = false;
        escapeBtn.dataset.escapeTime = escapeTime;
    }
    if (announce && escapeStatus) escapeStatus.textContent = `Inside ${label}. Skip past button available.`;
}
function hideEscape() {
    if (escapeBtn) {
        escapeBtn.hidden = true;
        escapeBtn.disabled = true;
        delete escapeBtn.dataset.escapeTime;
    }
    if (escapeLabelEl) escapeLabelEl.textContent = '';
    if (escapeStatus) escapeStatus.textContent = '';
    currentEscapableStructure = null;
}
if (escapeBtn) {
    escapeBtn.addEventListener('click', () => {
        const t = parseFloat(escapeBtn.dataset.escapeTime);
        const audio = document.querySelector('audio');
        if (!isNaN(t) && audio) audio.currentTime = t;
        hideEscape();
    });
}

// Skippability: when enabled, do not play cues inside these structure types.
const SKIPPABLE_STRUCTURE_RULES = [
    { classes: ['epubtype_pagebreak'],               key: 'webbook-skip-pagebreak', id: 'webbook-skip-pagebreak-toggle' },
    { classes: ['epubtype_footnote', 'epubtype_endnote'], key: 'webbook-skip-footnote', id: 'webbook-skip-footnote-toggle' },
    { classes: ['epubtype_note'],                    key: 'webbook-skip-note',      id: 'webbook-skip-note-toggle' },
    { classes: ['epubtype_sidebar'],                 key: 'webbook-skip-sidebar',   id: 'webbook-skip-sidebar-toggle' },
];

function canPlay(elm) {
    for (const { classes, key } of SKIPPABLE_STRUCTURE_RULES) {
        if (findClosestWithAnyClass(elm, classes)) {
            return localStorage.getItem(key) !== 'true';
        }
    }
    return true;
}

function findNextPlayableCue(cues, fromIdx) {
    for (let i = fromIdx + 1; i < cues.length; i++) {
        const elm = elmForCue(cues[i]);
        if (!elm || canPlay(elm)) return cues[i];
    }
    return null;
}

function elmForCue(cue) {
    try {
        return selectElm(JSON.parse(cue.text).selector);
    } catch {
        return null;
    }
}

function skipCue(audio, track, fromIdx, cue) {
    const nextCue = findNextPlayableCue(Array.from(track.cues), fromIdx);
    if (nextCue) {
        skipSeekIgnoreUntil = nextCue.startTime + SKIP_UNMUTE_BEFORE_TARGET_SECONDS;
        skipMuteUntil = Math.max(0, nextCue.startTime - SKIP_UNMUTE_BEFORE_TARGET_SECONDS);
        if (!audio.muted) {
            audio.dataset.webbookMutedForSkip = 'true';
            audio.muted = true;
        }
        audio.currentTime = Math.max(0, nextCue.startTime - SKIP_SEEK_PREROLL_SECONDS);
    } else {
        skipSeekIgnoreUntil = 0;
        skipMuteUntil = 0;
        audio.currentTime = Math.min(cue.endTime, audio.duration || cue.endTime);
    }
    hideEscape();
}

function restoreSkipMute(audio) {
    if (!skipMuteUntil || audio.currentTime < skipMuteUntil) return;

    clearSkipMute(audio);
}

function cancelSkipPreroll(audio) {
    skipSeekIgnoreUntil = 0;
    skipMuteUntil = 0;
    clearSkipMute(audio);
}

function clearSkipMute(audio) {
    skipMuteUntil = 0;
    if (audio.dataset.webbookMutedForSkip === 'true') {
        audio.muted = false;
        delete audio.dataset.webbookMutedForSkip;
    }
}

function findClosestWithAnyClass(elm, classes) {
    const main = document.querySelector('main');
    let node = elm;
    while (node && node !== main) {
        if (classes.some(c => node.classList.contains(c))) return node;
        node = node.parentElement;
    }
    return null;
}
function highlightElm(elm) {
    if (CSS?.highlights) {
        const range = document.createRange();
        range.selectNodeContents(elm);
        CSS.highlights.set('narration', new Highlight(range));
    }
    const rect = elm.getBoundingClientRect();
    if (rect.top < 0 || rect.bottom > window.innerHeight) {
        elm.scrollIntoView({ block: 'center' });
    }
}

// Keep the URL hash pointed at the currently-narrated element (write side of deep-linking).
// Uses replaceState (not location.hash) so it never triggers a native scroll-jump or
// pollutes browser history — only the address bar reflects the current position.
function syncHashToElement(elm) {
    if (!elm?.id) return;
    const target = `#${elm.id}`;
    if (window.location.hash === target) return;
    history.replaceState(null, '', target);
}

// Read side: on load, if the URL already has a hash (a deep link, a TOC/footnote jump that
// landed here, or a resumed position), seek playback to the cue matching that element so
// narration continues from the right place instead of the very start of the page.
function seekToHashTarget(audio, track) {
    const id = decodeURIComponent((window.location.hash || '').replace(/^#/, ''));
    if (!id) return;
    const target = document.getElementById(id);
    if (!target) return;

    const cues = Array.from(track.cues || []);
    const cue = cues.find(c => elmForCue(c) === target)
        || cues.find(c => { const e = elmForCue(c); return e && e.contains(target); });
    if (cue) audio.currentTime = cue.startTime;
}

// --- Remember last reading position ---

const RESUME_ENABLED_KEY = 'webbook-resume-enabled';
const RESUME_BANNER_PENDING_KEY = 'webbook-resume-banner-pending';
const RESUME_BANNER_TEXT = 'Loaded last position.';

function getBookId() {
    return document.querySelector('meta[name="webbook-book-id"]')?.content?.trim() || '';
}

function resumeStorageKey(bookId) {
    return `webbook-resume:${bookId}`;
}

function currentPageFilename() {
    return location.pathname.split('/').pop() || 'index.html';
}

// The converter removes #webbook-previous-document entirely when a page has no previous
// sibling; the hand-authored template fixture instead leaves it in the DOM without an
// href. Checking for a present href covers both.
function isEntryPage() {
    return !document.querySelector('#webbook-previous-document[href]');
}

function readResumePosition(bookId) {
    try {
        const raw = localStorage.getItem(resumeStorageKey(bookId));
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

function writeResumePosition(bookId, fields) {
    if (!bookId) return;
    const existing = readResumePosition(bookId) || {};
    localStorage.setItem(resumeStorageKey(bookId), JSON.stringify({ ...existing, ...fields, ts: Date.now() }));
}

function initResumeSetting() {
    const toggle = document.querySelector('#webbook-resume-toggle');
    if (!toggle) return;
    toggle.checked = localStorage.getItem(RESUME_ENABLED_KEY) !== 'false';
    toggle.addEventListener('change', () => {
        localStorage.setItem(RESUME_ENABLED_KEY, toggle.checked);
    });
}

function showResumeBanner() {
    const el = document.querySelector('#webbook-resume-banner');
    if (!el) return;
    el.hidden = false;
    el.textContent = RESUME_BANNER_TEXT;
    clearTimeout(showResumeBanner._timer);
    showResumeBanner._timer = setTimeout(() => { el.hidden = true; }, 4000);
}

// Runs once per page load. If a saved position exists for this book, this is the entry
// page, and the "resume" setting is on, redirects to the saved page/position and returns
// true. Otherwise records the current page as the latest-visited one and returns false.
function initResumePosition() {
    const bookId = getBookId();

    if (localStorage.getItem(RESUME_BANNER_PENDING_KEY) === 'true') {
        localStorage.removeItem(RESUME_BANNER_PENDING_KEY);
        showResumeBanner();
    }

    if (!bookId) return false;

    const resumeEnabled = localStorage.getItem(RESUME_ENABLED_KEY) !== 'false';
    if (resumeEnabled && isEntryPage()) {
        const saved = readResumePosition(bookId);
        if (saved?.page && saved.page !== currentPageFilename()) {
            localStorage.setItem(RESUME_BANNER_PENDING_KEY, 'true');
            window.location.href = saved.elementId ? `${saved.page}#${saved.elementId}` : saved.page;
            return true;
        }
    }

    writeResumePosition(bookId, { page: currentPageFilename() });
    return false;
}

// Called on each narration cuechange alongside syncHashToElement — same low frequency,
// same "purely additive" write, keyed by book id so multiple books in the same origin
// don't collide.
function recordResumePosition(elm, audio) {
    const bookId = getBookId();
    if (!bookId || !elm?.id) return;
    writeResumePosition(bookId, {
        page: currentPageFilename(),
        elementId: elm.id,
        audioTime: audio?.currentTime ?? 0
    });
}

// Refines the coarse cue-start seek from seekToHashTarget to the exact stored offset,
// but only when this page+element is precisely the saved resume position — never applies
// to an ordinary TOC/footnote hash jump that merely happens to land on the same element.
function applyResumeAudioTimeIfMatching(audio) {
    const bookId = getBookId();
    if (!bookId) return;
    const saved = readResumePosition(bookId);
    const hashId = decodeURIComponent((window.location.hash || '').replace(/^#/, ''));
    if (saved?.page === currentPageFilename() && saved.elementId && saved.elementId === hashId && typeof saved.audioTime === 'number') {
        audio.currentTime = saved.audioTime;
    }
}

initResumePosition();

const WEBBOOK_POPOVER_IDS = ['webbook-toc-nav', 'webbook-menu', 'webbook-settings', 'webbook-info', 'webbook-search'];
const POPOVER_CLOSE_LABELS = {
    'webbook-toc-nav': 'Close table of contents',
    'webbook-menu': 'Close go to page',
    'webbook-settings': 'Close settings',
    'webbook-info': 'Close about',
    'webbook-search': 'Close search'
};
const CLOSE_SVG = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M5.293 5.293a1 1 0 0 1 1.414 0L12 10.586l5.293-5.293a1 1 0 1 1 1.414 1.414L13.414 12l5.293 5.293a1 1 0 0 1-1.414 1.414L12 13.414l-5.293 5.293a1 1 0 0 1-1.414-1.414L10.586 12 5.293 6.707a1 1 0 0 1 0-1.414Z"/></svg>';

function initPopoverCloseButtons() {
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

initPopoverCloseButtons();

// Track open state on toolbar buttons when their popovers toggle
WEBBOOK_POPOVER_IDS.forEach(id => {
    const popover = document.querySelector(`#${id}`);
    if (!popover) return;
    popover.addEventListener('toggle', e => {
        const btn = document.querySelector(`button[popovertarget="${id}"]:not(.webbook-popover-close)`);
        if (!btn) return;
        if (e.newState === 'open') {
            btn.classList.add('open');
            if (id === 'webbook-toc-nav') {
                const current = popover.querySelector('a[aria-current="page"]');
                if (current) { current.scrollIntoView(); current.focus(); }
            } else if (id === 'webbook-info') {
                const tocLinks = Array.from(document.querySelectorAll('#webbook-cover-link, #webbook-toc-nav > ol > li > a'));
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

// Auto-hide toolbars and spine nav
const toolbar = document.querySelector('#webbook-toolbar');
const topToolbar = document.querySelector('#webbook-top-toolbar');
const spineNav = document.querySelector('#webbook-spine-nav');
let hideTimer;
let darkModeMediaQueryListener = null;

function showToolbar() {
    toolbar.classList.add('visible');
    topToolbar.classList.add('visible');
    spineNav.classList.add('visible');
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
        toolbar.classList.remove('visible');
        topToolbar.classList.remove('visible');
        spineNav.classList.remove('visible');
    }, 3000);
}

// Settings
initPageNavigation();
initAppearance();
initDialogBackdropBlur();
initHighlightColor();
initFontSize();
initFontFamily();
initRate();
initSkippability();
initResumeSetting();

function initPageNavigation() {
    const input = document.querySelector('#goto-page');
    const button = document.querySelector('#webbook-goto-page-go');
    const datalist = document.querySelector('#pages');
    if (!input || !button || !datalist) return;

    const goToPage = () => {
        const option = findPageOption(input.value, datalist);
        const href = option?.dataset.href;
        if (!href) {
            input.setAttribute('aria-invalid', 'true');
            return;
        }

        input.removeAttribute('aria-invalid');
        window.location.href = href;
    };

    button.addEventListener('click', goToPage);
    input.addEventListener('keydown', e => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        goToPage();
    });
    input.addEventListener('input', () => input.removeAttribute('aria-invalid'));
}

function findPageOption(value, datalist) {
    const normalizedValue = value.trim().toLowerCase();
    if (!normalizedValue) return null;

    return Array.from(datalist.options).find(option => {
        const optionValue = option.value.trim().toLowerCase();
        const optionLabel = option.label.trim().toLowerCase();
        return optionValue === normalizedValue || optionLabel === normalizedValue;
    }) ?? null;
}

function initHighlightColor() {
    const autoToggle = document.querySelector('#webbook-highlight-auto-toggle');
    const colorPicker = document.querySelector('#webbook-color-picker');
    if (!autoToggle || !colorPicker) return;

    const isAuto = localStorage.getItem('webbook-highlight-auto') !== 'false';
    const color = localStorage.getItem('webbook-highlight-color') || '#ffdd00';

    autoToggle.checked = isAuto;
    colorPicker.value = color;
    colorPicker.disabled = isAuto;
    applyHighlightColor(isAuto ? null : color);

    autoToggle.addEventListener('change', () => {
        localStorage.setItem('webbook-highlight-auto', autoToggle.checked);
        colorPicker.disabled = autoToggle.checked;
        applyHighlightColor(autoToggle.checked ? null : colorPicker.value);
    });
    colorPicker.addEventListener('input', () => {
        localStorage.setItem('webbook-highlight-color', colorPicker.value);
        applyHighlightColor(colorPicker.value);
    });
}
function applyHighlightColor(color) {
    if (color) {
        document.body.style.setProperty('--webbook-highlight-color', color);
    } else {
        document.body.style.removeProperty('--webbook-highlight-color');
    }
}

function initFontSize() {
    const range = document.querySelector('#webbook-font-size-range');
    const reset = document.querySelector('#webbook-reset-font-size');
    if (!range) return;

    const size = localStorage.getItem('webbook-font-size') || '100';
    range.value = size;
    applyFontSize(size);

    range.addEventListener('input', () => applyFontSize(range.value));
    reset?.addEventListener('click', () => {
        range.value = '100';
        applyFontSize('100');
    });
}

function applyFontSize(size) {
    const numericSize = parseInt(size, 10);
    const normalizedSize = Number.isFinite(numericSize) ? numericSize : 100;
    localStorage.setItem('webbook-font-size', String(normalizedSize));
    document.documentElement.style.setProperty('--webbook-main-font-size', `${normalizedSize}%`);

    const range = document.querySelector('#webbook-font-size-range');
    if (range) range.setAttribute('aria-valuetext', `${normalizedSize}%`);

    const main = document.querySelector('main');
    if (main) main.style.fontSize = `${normalizedSize}%`;

    const display = document.querySelector('#webbook-font-size-value');
    if (display) display.textContent = `${normalizedSize}%`;
}

function initFontFamily() {
    const select = document.querySelector('#webbook-font-family-options');
    if (!select) return;

    const font = localStorage.getItem('webbook-font-family') || 'system-ui';
    select.value = font;
    applyFontFamily(font);

    select.addEventListener('change', () => {
        localStorage.setItem('webbook-font-family', select.value);
        applyFontFamily(select.value);
    });
}
function applyFontFamily(font) {
    document.documentElement.style.setProperty('--webbook-main-font-family', font);
    const main = document.querySelector('main');
    if (main) main.style.fontFamily = font;
}

function initAppearance() {
    const select = document.querySelector('#webbook-appearance-options');
    const appearance = localStorage.getItem('webbook-appearance') || 'auto';
    if (select) select.value = appearance;
    applyAppearance(appearance);
    if (select) select.addEventListener('change', () => applyAppearance(select.value));
}
function applyAppearance(value) {
    localStorage.setItem('webbook-appearance', value);
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    if (darkModeMediaQueryListener) {
        mq.removeEventListener('change', darkModeMediaQueryListener);
        darkModeMediaQueryListener = null;
    }
    const apply = dark => {
        document.documentElement.classList.toggle('webbook-dark', dark);
        document.documentElement.classList.toggle('webbook-light', !dark);
        document.body.classList.toggle('webbook-dark', dark);
        document.body.classList.toggle('webbook-light', !dark);
    };
    if (value === 'auto') {
        apply(mq.matches);
        darkModeMediaQueryListener = e => apply(e.matches);
        mq.addEventListener('change', darkModeMediaQueryListener);
    } else {
        apply(value === 'dark');
    }
}

function initDialogBackdropBlur() {
    const toggle = document.querySelector('#webbook-dialog-blur-toggle');
    const enabled = localStorage.getItem('webbook-dialog-backdrop-blur') !== 'false';
    if (toggle) {
        toggle.checked = enabled;
        toggle.addEventListener('change', () => {
            localStorage.setItem('webbook-dialog-backdrop-blur', toggle.checked);
            applyDialogBackdropBlur(toggle.checked);
        });
    }
    applyDialogBackdropBlur(enabled);
}

function applyDialogBackdropBlur(enabled) {
    document.body.classList.toggle('webbook-dialog-backdrop-blur', enabled);
}

function initRate() {
    const rateRange = document.querySelector('#webbook-rate-range');
    if (!rateRange) return;

    const rate = localStorage.getItem('webbook-rate') || '100';
    rateRange.value = rate;
    applyRate(rate);

    rateRange.addEventListener('input', () => applyRate(rateRange.value));
    document.querySelector('#webbook-reset-rate')?.addEventListener('click', () => {
        rateRange.value = '100';
        applyRate('100');
    });
}
function applyRate(rate) {
    localStorage.setItem('webbook-rate', rate);
    const display = document.querySelector('#webbook-rate-value');
    if (display) display.textContent = `${rate}%`;
    const range = document.querySelector('#webbook-rate-range');
    if (range) range.setAttribute('aria-valuetext', `${rate}%`);
    const audio = document.querySelector('audio');
    if (audio) audio.playbackRate = parseInt(rate) / 100;
}

function initSkippability() {
    for (const { key, id } of SKIPPABLE_STRUCTURE_RULES) {
        const toggle = document.querySelector(`#${id}`);
        if (!toggle) continue;
        toggle.checked = localStorage.getItem(key) === 'true';
        toggle.addEventListener('change', () => {
            localStorage.setItem(key, toggle.checked);
            if (captionModeEnabled) showCaptionForCurrentState();
        });
    }
}

const CAPTION_STORAGE_KEY = 'webbook-caption-mode';
const CAPTION_ENTRY_STORAGE_KEY = 'webbook-caption-entry';
const CAPTION_CANDIDATE_SELECTOR = 'h1, h2, h3, h4, h5, h6, p, li, blockquote, figcaption, caption, th, td, .epubtype_pagebreak';
let captionModeEnabled = false;
let captionBoundaryEntry = null;
let captionItems = [];
let captionIndex = -1;
let captionView = null;
let captionText = null;
let captionCount = null;

function initCaptionMode() {
    ensureCaptionView();
    const toggle = document.querySelector('#webbook-caption-mode-toggle');
    captionModeEnabled = localStorage.getItem(CAPTION_STORAGE_KEY) === 'true';
    captionBoundaryEntry = consumeCaptionBoundaryEntry();
    if (toggle) {
        toggle.checked = captionModeEnabled;
        toggle.addEventListener('change', () => setCaptionMode(toggle.checked));
    }
    setCaptionMode(captionModeEnabled, { persist: false });
    document.addEventListener('keydown', handleCaptionKeydown);
}

function ensureCaptionView() {
    if (captionView) return;
    captionView = document.createElement('section');
    captionView.id = 'webbook-caption-view';
    captionView.className = 'webbook';
    captionView.setAttribute('aria-label', 'Caption mode');
    captionView.hidden = true;

    captionCount = document.createElement('p');
    captionCount.id = 'webbook-caption-count';
    captionCount.setAttribute('aria-hidden', 'true');

    captionText = document.createElement('p');
    captionText.id = 'webbook-caption-text';
    captionText.setAttribute('role', 'status');
    captionText.setAttribute('aria-live', 'polite');

    captionView.append(captionCount, captionText);
    document.body.append(captionView);
}

function setCaptionMode(enabled, options = {}) {
    captionModeEnabled = enabled;
    if (options.persist !== false) localStorage.setItem(CAPTION_STORAGE_KEY, String(enabled));

    document.documentElement.classList.toggle('webbook-caption-mode', enabled);
    document.body.classList.toggle('webbook-caption-mode', enabled);
    const main = document.querySelector('main');
    if (main) {
        if (enabled) main.setAttribute('aria-hidden', 'true');
        else main.removeAttribute('aria-hidden');
    }
    if (captionView) captionView.hidden = !enabled;

    if (enabled) {
        refreshCaptionItems();
        showCaptionForCurrentState();
    } else {
        captionBoundaryEntry = null;
        clearCaption();
    }
}

function clearCaption() {
    if (captionText) captionText.textContent = '';
    if (captionCount) captionCount.textContent = '';
}

function consumeCaptionBoundaryEntry() {
    const entry = localStorage.getItem(CAPTION_ENTRY_STORAGE_KEY);
    localStorage.removeItem(CAPTION_ENTRY_STORAGE_KEY);
    return entry === 'first' || entry === 'last' ? entry : null;
}

function getReaderAudio() {
    return document.querySelector('audio');
}

function hasUsableAudio(audio) {
    return Boolean(audio && (audio.getAttribute('src') || audio.currentSrc || audio.querySelector('source[src]')));
}

function getReaderTextTrack(audio = getReaderAudio()) {
    return audio?.textTracks?.[0] || audio?.querySelector('track')?.track || null;
}

function refreshCaptionItems() {
    const trackItems = captionItemsForTrack(getReaderTextTrack());
    captionItems = trackItems.length ? trackItems : collectManualCaptionItems();
    if (captionIndex >= captionItems.length) captionIndex = captionItems.length - 1;
}

function refreshCaptionItemsFromTrack(track) {
    const trackItems = captionItemsForTrack(track);
    if (!trackItems.length) return;
    captionItems = trackItems;
    if (captionIndex >= captionItems.length) captionIndex = captionItems.length - 1;
    if (captionModeEnabled) showCaptionForCurrentState();
}

function captionItemsForTrack(track) {
    if (!track?.cues?.length) return [];
    return Array.from(track.cues)
        .map(cue => {
            const elm = elmForCue(cue);
            if (!elm || !captionTextForElement(elm)) return null;
            return { elm, cue };
        })
        .filter(Boolean);
}

function collectManualCaptionItems() {
    const main = document.querySelector('main');
    if (!main) return [];
    return Array.from(main.querySelectorAll(CAPTION_CANDIDATE_SELECTOR))
        .filter(elm => !elm.closest('[hidden]') && Boolean(captionTextForElement(elm)))
        .map(elm => ({ elm }));
}

function captionTextForElement(elm) {
    if (elm.classList.contains('epubtype_pagebreak')) {
        const label = elm.getAttribute('aria-label');
        if (label) return label.trim();
    }
    return (elm.textContent || '').replace(/\s+/g, ' ').trim();
}

function playableCaptionItems() {
    return captionItems.filter(item => item.elm && canPlay(item.elm) && Boolean(captionTextForElement(item.elm)));
}

function showCaptionForCurrentState() {
    if (!captionModeEnabled) return;
    if (!captionItems.length) refreshCaptionItems();

    if (showCaptionForBoundaryEntry()) return;

    const currentCueItem = findCaptionItemAtCurrentTime();
    if (currentCueItem) {
        showCaptionItem(currentCueItem);
        return;
    }

    const currentItem = captionItems[captionIndex];
    if (currentItem && canPlay(currentItem.elm)) {
        showCaptionItem(currentItem);
        return;
    }

    const nextIndex = captionIndex >= 0 ? findNextCaptionIndex(captionIndex, 1) : -1;
    if (nextIndex >= 0) {
        showCaptionItem(captionItems[nextIndex]);
        return;
    }

    showCaptionItem(playableCaptionItems()[0] || null);
}

function showCaptionForBoundaryEntry() {
    if (!captionBoundaryEntry) return false;
    const visibleItems = playableCaptionItems();
    const item = captionBoundaryEntry === 'last' ? visibleItems[visibleItems.length - 1] : visibleItems[0];
    if (!item) return false;

    showCaptionItem(item);
    syncAudioToCaptionItem(item);
    if (item.cue || !hasPendingCaptionTrack()) captionBoundaryEntry = null;
    return true;
}

function hasPendingCaptionTrack() {
    const audio = getReaderAudio();
    const trackEl = audio?.querySelector('track');
    const readyState = typeof trackEl?.readyState === 'number' ? trackEl.readyState : 0;
    return hasUsableAudio(audio) && Boolean(trackEl) && !captionItems.some(item => item.cue) && readyState < 2;
}

function findCaptionItemAtCurrentTime() {
    const audio = getReaderAudio();
    if (!hasUsableAudio(audio)) return null;
    const activeItem = captionItems.find(item =>
        item.cue &&
        canPlay(item.elm) &&
        item.cue.startTime <= audio.currentTime &&
        item.cue.endTime > audio.currentTime
    );
    if (activeItem) return activeItem;
    return captionItems.find(item =>
        item.cue &&
        canPlay(item.elm) &&
        item.cue.startTime > audio.currentTime
    ) || null;
}

function showCaptionForCue(cue, track) {
    if (!captionModeEnabled) return;
    if (!captionItems.some(item => item.cue === cue)) refreshCaptionItemsFromTrack(track);
    const item = captionItems.find(item => item.cue === cue);
    if (item && canPlay(item.elm)) showCaptionItem(item);
}

function showCaptionItem(item) {
    if (!captionModeEnabled || !captionText || !captionCount) return;
    if (!item) {
        clearCaption();
        return;
    }

    captionIndex = captionItems.indexOf(item);
    const visibleItems = playableCaptionItems();
    const visibleIndex = visibleItems.indexOf(item);
    captionText.textContent = captionTextForElement(item.elm);
    captionCount.textContent = visibleIndex >= 0 ? `${visibleIndex + 1} of ${visibleItems.length}` : '';
}

function handleCaptionKeydown(e) {
    if (!captionModeEnabled || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
    if (!['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(e.key)) return;
    if (isInteractiveTarget(e.target) || isAnyPopoverOpen()) return;

    e.preventDefault();
    stepCaption((e.key === 'ArrowRight' || e.key === 'ArrowDown') ? 1 : -1);
}

function isInteractiveTarget(target) {
    if (!(target instanceof Element)) return false;
    return Boolean(target.closest('input, select, textarea, button, [contenteditable="true"], [contenteditable=""]'));
}

function isAnyPopoverOpen() {
    try {
        return Boolean(document.querySelector('.webbook[popover]:popover-open'));
    } catch {
        return false;
    }
}

function stepCaption(delta) {
    if (!captionItems.length) refreshCaptionItems();
    const nextIndex = findNextCaptionIndex(captionIndex, delta);
    if (nextIndex < 0) {
        navigateCaptionBoundary(delta);
        return;
    }

    const item = captionItems[nextIndex];
    syncAudioToCaptionItem(item);
    highlightElm(item.elm);
    showCaptionItem(item);
}

function syncAudioToCaptionItem(item) {
    const audio = getReaderAudio();
    if (item?.cue && hasUsableAudio(audio)) {
        cancelSkipPreroll(audio);
        audio.currentTime = item.cue.startTime;
    }
}

function navigateCaptionBoundary(delta) {
    const link = document.querySelector(`#webbook-spine-nav a[rel=${delta > 0 ? 'next' : 'prev'}][href]`);
    if (!link) return;

    localStorage.setItem(CAPTION_ENTRY_STORAGE_KEY, delta > 0 ? 'first' : 'last');
    const audio = getReaderAudio();
    if (delta > 0 && hasUsableAudio(audio) && !audio.paused && !audio.ended) {
        requestAutoplayForForwardSpineLink(link);
    } else {
        clearAutoplayRequest();
    }
    link.click();
}

function findNextCaptionIndex(fromIndex, delta) {
    let index = fromIndex < 0 ? (delta > 0 ? -1 : 0) : fromIndex;
    while (true) {
        index += delta;
        if (index < 0 || index >= captionItems.length) return -1;
        if (canPlay(captionItems[index].elm)) return index;
    }
}

initCaptionMode();



// --- Audio player ---

const AUTOPLAY_STORAGE_KEY = 'webbook-autoplay';
const AUTOPLAY_TARGET_STORAGE_KEY = 'webbook-autoplay-target';
const PLAY_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20" aria-hidden="true"><polygon points="5,3 19,12 5,21"/></svg>`;
const PAUSE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20" aria-hidden="true"><rect x="5" y="3" width="4" height="18"/><rect x="15" y="3" width="4" height="18"/></svg>`;

function formatTime(secs) {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

// Init
const shouldAutoplayThisPage = consumeAutoplayRequest();
initPlayer();

function normalizeAutoplayUrl(href) {
    try {
        const url = new URL(href, window.location.href);
        url.hash = '';
        return url.href;
    } catch {
        return '';
    }
}

function clearAutoplayRequest() {
    localStorage.removeItem(AUTOPLAY_STORAGE_KEY);
    localStorage.removeItem(AUTOPLAY_TARGET_STORAGE_KEY);
}

function requestAutoplayForForwardSpineLink(link) {
    if (!link?.matches?.('#webbook-spine-nav a[rel=next][href]')) return;
    const target = normalizeAutoplayUrl(link.href);
    if (!target) return;
    localStorage.setItem(AUTOPLAY_STORAGE_KEY, 'true');
    localStorage.setItem(AUTOPLAY_TARGET_STORAGE_KEY, target);
}

function consumeAutoplayRequest() {
    const requested = localStorage.getItem(AUTOPLAY_STORAGE_KEY) === 'true';
    const target = localStorage.getItem(AUTOPLAY_TARGET_STORAGE_KEY);
    clearAutoplayRequest();
    return requested && Boolean(target) && target === normalizeAutoplayUrl(window.location.href);
}

function initPlayer() {
    const audio = document.querySelector('audio');
    if (!audio) return;
    const controls = document.querySelector('#webbook-audio-controls');
    const hasAudioSource = Boolean(audio.getAttribute('src') || audio.currentSrc || audio.querySelector('source[src]'));
    if (!hasAudioSource) {
        controls?.setAttribute('hidden', '');
        return;
    }
    controls?.removeAttribute('hidden');

    const trackEl = audio.querySelector('track');
    if (!trackEl) return;
    const metadataTrack = trackEl.track || audio.textTracks?.[0];
    if (!metadataTrack) return;

    const playPauseBtn = document.querySelector('#webbook-audio-playpause');
    const seekRange = document.querySelector('#webbook-seek');
    const seekTicks = document.querySelector('#webbook-seek-ticks');
    const timeDisplay = document.querySelector('#webbook-time');

    function setSeekValueText(time) {
        if (!seekRange) return;
        const numericTime = typeof time === 'number' ? time : parseFloat(String(time));
        seekRange.setAttribute('aria-valuetext', formatTime(Number.isFinite(numericTime) ? numericTime : 0));
    }

    // Play/pause button
    function updatePlayPause() {
        if (!playPauseBtn) return;
        const paused = audio.paused || audio.ended;
        playPauseBtn.innerHTML = paused ? PLAY_SVG : PAUSE_SVG;
        playPauseBtn.title = paused ? 'Play' : 'Pause';
        playPauseBtn.setAttribute('aria-label', paused ? 'Play' : 'Pause');
    }
    updatePlayPause();
    if (playPauseBtn) {
        playPauseBtn.addEventListener('click', () => {
            if (audio.paused || audio.ended) audio.play();
            else audio.pause();
        });
    }
    audio.addEventListener('play', updatePlayPause);
    audio.addEventListener('pause', updatePlayPause);

    // Seek range and time display
    function setSeekMax() {
        if (seekRange && isFinite(audio.duration)) seekRange.max = audio.duration;
    }
    if (audio.readyState >= 1) {
        setSeekMax();
    } else {
        audio.addEventListener('loadedmetadata', setSeekMax);
    }

    let seeking = false;
    if (seekRange) {
        seekRange.addEventListener('pointerdown', () => { seeking = true; });
        seekRange.addEventListener('pointerup', () => { seeking = false; });
        seekRange.addEventListener('input', () => {
            cancelSkipPreroll(audio);
            audio.currentTime = seekRange.value;
            setSeekValueText(seekRange.value);
        });
        setSeekValueText(seekRange.value);
    }
    audio.addEventListener('timeupdate', () => {
        restoreSkipMute(audio);
        if (seekRange && !seeking) {
            seekRange.value = audio.currentTime;
            setSeekValueText(audio.currentTime);
        }
        if (timeDisplay) timeDisplay.textContent = formatTime(audio.currentTime);
    });

    // Populate tick marks from VTT cues once track is loaded
    function populateTicks() {
        if (!seekTicks || !metadataTrack.cues) return;
        seekTicks.innerHTML = '';
        Array.from(metadataTrack.cues).forEach(cue => {
            const opt = document.createElement('option');
            opt.value = cue.startTime;
            seekTicks.appendChild(opt);
        });
    }
    function handleTrackReady() {
        populateTicks();
        refreshCaptionItemsFromTrack(metadataTrack);
        seekToHashTarget(audio, metadataTrack);
        applyResumeAudioTimeIfMatching(audio);
    }
    if (trackEl.readyState >= 2) {
        handleTrackReady();
    } else {
        trackEl.addEventListener('load', handleTrackReady);
    }

    // Autoplay on navigation
    if (shouldAutoplayThisPage) {
        audio.autoplay = true;
    }

    const nextSpineLink = document.querySelector('#webbook-spine-nav a[rel=next][href]');
    nextSpineLink?.addEventListener('click', () => {
        if (!audio.paused && !audio.ended) {
            requestAutoplayForForwardSpineLink(nextSpineLink);
        } else {
            clearAutoplayRequest();
        }
    });

    // VTT cue-driven narration highlight
    let activeCueIdx = -1;
    metadataTrack.addEventListener('cuechange', () => {
        restoreSkipMute(audio);
        const track = metadataTrack;
        const activeCues = Array.from(track.activeCues || []);
        if (activeCues.length > 0) {
            const cue = activeCues[activeCues.length - 1];
            activeCueIdx = Array.from(track.cues || []).indexOf(cue);
            const elm = elmForCue(cue);
            if (!elm) return;
            if (!canPlay(elm)) {
                if (audio.currentTime >= skipSeekIgnoreUntil) skipCue(audio, track, activeCueIdx, cue);
                return;
            }
            skipSeekIgnoreUntil = 0;
            highlightElm(elm);
            syncHashToElement(elm);
            recordResumePosition(elm, audio);
            showCaptionForCue(cue, track);
            const escapableStructure = findEscapableStructure(elm);
            if (escapableStructure) {
                const escapeTime = getEscapeTime(escapableStructure.elm, track, activeCueIdx);
                if (escapeTime !== null) {
                    const isNew = escapableStructure.elm !== currentEscapableStructure;
                    currentEscapableStructure = escapableStructure.elm;
                    showEscape(escapableStructure, escapeTime, isNew);
                } else {
                    hideEscape();
                }
            } else {
                hideEscape();
            }
        } else if (CSS?.highlights) {
            CSS.highlights.delete('narration');
            hideEscape();
        }
    });

    audio.addEventListener('ended', () => {
        cancelSkipPreroll(audio);
        if (CSS?.highlights) CSS.highlights.delete('narration');
        updatePlayPause();
        const next = document.querySelector('#webbook-spine-nav a[rel=next][href]');
        if (next) {
            requestAutoplayForForwardSpineLink(next);
            next.click();
        }
    });

    // Keyboard shortcuts when the seek slider has focus
    if (seekRange) {
        seekRange.addEventListener('keydown', e => {
            if (e.key === '[' || e.key === ']') {
                e.preventDefault();
                const track = metadataTrack;
                if (!track?.cues?.length) return;
                const cues = Array.from(track.cues);
                if (e.key === '[') {
                    const idx = activeCueIdx > 0 ? activeCueIdx - 1 : 0;
                    audio.currentTime = cues[idx].startTime;
                } else {
                    const idx = activeCueIdx < cues.length - 1 ? activeCueIdx + 1 : activeCueIdx;
                    audio.currentTime = cues[idx].startTime;
                }
            } else if (e.shiftKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
                e.preventDefault();
                const delta = e.key === 'ArrowRight' ? 10 : -10;
                audio.currentTime = Math.max(0, Math.min(audio.duration, audio.currentTime + delta));
            }
            // plain arrow keys: default range step behavior
        });
    }
}


// Show briefly on load
showToolbar();

// Reset timer on any user activity
['mousemove', 'touchstart', 'keydown'].forEach(evt => {
    document.addEventListener(evt, showToolbar, { passive: true });
});
