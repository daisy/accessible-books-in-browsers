// Actions describe the reader's controls independently of the keys chosen for them. Each module
// registers its own controls at startup; availability is checked against the current page.
const actions = new Map();

export function registerAction(action) {
    const defaultKeys = (action.defaultKeys ?? []).map(key => ({ shift: false, alt: false, ctrl: false, meta: false, ...key }));
    // Two actions given the same key by default: only one of them would ever run
    const same = (a, b) => a.code === b.code && ['shift', 'alt', 'ctrl', 'meta'].every(name => a[name] === b[name]);
    for (const other of actions.values()) {
        if (other.id !== action.id && other.defaultKeys.some(key => defaultKeys.some(mine => same(key, mine)))) {
            console.warn(`Reader actions ${other.id} and ${action.id} share a default key`);
        }
    }
    actions.set(action.id, { isAvailable: () => true, ...action, defaultKeys });
}

export function getActions() {
    return Array.from(actions.values());
}

export function runAction(id) {
    const action = actions.get(id);
    if (!action?.isAvailable()) return false;
    action.run();
    return true;
}

export function initReaderActionStatus() {
    if (document.getElementById('webbook-action-status')) return;
    const status = document.createElement('div');
    status.id = 'webbook-action-status';
    status.className = 'sr-only';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-atomic', 'true');
    document.body.append(status);
}

let announcementTimer;
let noticeTimer;
const NOTICE_SECONDS = 5;

// Said to screen readers, and shown for a few seconds for everyone else: most actions that announce
// (time left, print page, link copied) have nothing else to show. A message about something already
// on screen (a setting in the open panel) passes show: false.
export function announceReaderAction(message, { show = true } = {}) {
    const status = document.getElementById('webbook-action-status');
    if (!status) return;
    clearTimeout(announcementTimer);
    status.textContent = '';
    announcementTimer = setTimeout(() => { status.textContent = message; }, 30);
    if (show) showNotice(message);
}

function showNotice(message) {
    let notice = document.getElementById('webbook-action-notice');
    if (!notice) {
        notice = document.createElement('div');
        notice.id = 'webbook-action-notice';
        notice.className = 'webbook';
        // The status above already says it
        notice.setAttribute('aria-hidden', 'true');
        document.body.append(notice);
    }
    notice.textContent = message;
    notice.hidden = false;
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => { notice.hidden = true; }, NOTICE_SECONDS * 1000);
}

function hideNotice() {
    const notice = document.getElementById('webbook-action-notice');
    if (!notice || notice.hidden) return false;
    clearTimeout(noticeTimer);
    notice.hidden = true;
    return true;
}

// The newest thing on screen goes first: while the message shows, Escape dismisses only it (the
// next Escape is Skip past again). On window, in capture, so it's seen before the shortcuts are.
// A click or tap anywhere dismisses it too (user, 2026-11-13), and still does what it was for. On
// pointerdown, so a click on a button that shows a new message (Where am I? again) shows that one.
export function initReaderActionNotice() {
    window.addEventListener('keydown', e => {
        if (e.key !== 'Escape' || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
        if (!hideNotice()) return;
        e.preventDefault();
        e.stopImmediatePropagation();
    }, { capture: true });
    window.addEventListener('pointerdown', () => { hideNotice(); }, { capture: true });
}
