const RESUME_ENABLED_KEY = 'webbook-resume-enabled';
const RESUME_BANNER_PENDING_KEY = 'webbook-resume-banner-pending';
const RESUME_SESSION_CHECKED_KEY = 'webbook-resume-checked';
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

export function initResumeSetting() {
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

// Runs once per page load. The very first time this fires in a tab session, if a saved
// position exists for this book, this is the entry page, and the "resume" setting is on,
// redirects to the saved page/position and returns true. On later loads within the same
// session the redirect is skipped even on the entry page, so navigating back to it on
// purpose (e.g. the TOC's "Cover" link) doesn't bounce the reader away again. Otherwise
// records the current page as the latest-visited one and returns false.
export function initResumePosition() {
    const bookId = getBookId();

    if (localStorage.getItem(RESUME_BANNER_PENDING_KEY) === 'true') {
        localStorage.removeItem(RESUME_BANNER_PENDING_KEY);
        showResumeBanner();
    }

    if (!bookId) return false;

    // Only offer to resume once per tab session (sessionStorage, not localStorage) —
    // otherwise deliberately navigating back to the entry page later (e.g. clicking
    // "Cover" in the TOC) would immediately bounce the reader right back to their last
    // position instead of showing them the page they just asked for.
    const alreadyCheckedThisSession = sessionStorage.getItem(RESUME_SESSION_CHECKED_KEY) === 'true';
    sessionStorage.setItem(RESUME_SESSION_CHECKED_KEY, 'true');

    const resumeEnabled = localStorage.getItem(RESUME_ENABLED_KEY) !== 'false';
    if (resumeEnabled && !alreadyCheckedThisSession && isEntryPage()) {
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
export function recordResumePosition(elm, audio) {
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
export function applyResumeAudioTimeIfMatching(audio) {
    const bookId = getBookId();
    if (!bookId) return;
    const saved = readResumePosition(bookId);
    const hashId = decodeURIComponent((window.location.hash || '').replace(/^#/, ''));
    if (saved?.page === currentPageFilename() && saved.elementId && saved.elementId === hashId && typeof saved.audioTime === 'number') {
        audio.currentTime = saved.audioTime;
    }
}
