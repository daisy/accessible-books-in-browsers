// Actions describe the reader's controls independently of the keys chosen for them. Each module
// registers its own controls at startup; availability is checked against the current page.
const actions = new Map();

export function registerAction(action) {
    actions.set(action.id, { isAvailable: () => true, ...action,
        defaultKeys: (action.defaultKeys ?? []).map(key => ({ shift: false, alt: false, ctrl: false, meta: false, ...key })) });
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

export function announceReaderAction(message) {
    const status = document.getElementById('webbook-action-status');
    if (!status) return;
    clearTimeout(announcementTimer);
    status.textContent = '';
    announcementTimer = setTimeout(() => { status.textContent = message; }, 30);
}
