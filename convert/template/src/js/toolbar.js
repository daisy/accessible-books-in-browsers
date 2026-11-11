import { announceReaderAction, registerAction } from './reader-actions.js';
import { readSetting, writeSetting } from './stored-settings.js';

// Global, like the other reader settings without a book in their key: on (the toolbars fade three
// seconds after the last mouse move, touch or key) unless the reader turns it off. Off, the
// toolbars and page arrows stay, e.g. for sighted screen reader and voice control users, who lose
// track of controls that come and go (user, 2026-11-10).
const AUTO_HIDE_KEY = 'webbook-toolbar-auto-hide';

export function initToolbarAutoHide() {
    // The reader is running: the basic navigation for reading without JavaScript can go. The
    // head's appearance script usually says so first (webbook-dark/webbook-light), but not when
    // storage is blocked.
    document.documentElement.classList.add('webbook-js');
    const toolbar = document.querySelector('#webbook-toolbar');
    const topToolbar = document.querySelector('#webbook-top-toolbar');
    const spineNav = document.querySelector('#webbook-spine-nav');
    let hideTimer;
    let autoHide = readSetting(AUTO_HIDE_KEY) !== 'false';

    function showToolbar() {
        toolbar.classList.add('visible');
        topToolbar.classList.add('visible');
        spineNav.classList.add('visible');
        clearTimeout(hideTimer);
        if (!autoHide) return;
        hideTimer = setTimeout(() => {
            toolbar.classList.remove('visible');
            topToolbar.classList.remove('visible');
            spineNav.classList.remove('visible');
        }, 3000);
    }

    // Things that float above the toolbar (Skip past) need its height, and scrolling to a link's
    // target or to focus needs both toolbars' (layout.css); they change with the screen width and
    // text size
    if (typeof ResizeObserver === 'function') {
        const observer = new ResizeObserver(() => {
            document.documentElement.style.setProperty('--webbook-toolbar-height', `${toolbar.offsetHeight}px`);
            document.documentElement.style.setProperty('--webbook-top-toolbar-height', `${topToolbar.offsetHeight}px`);
        });
        observer.observe(toolbar);
        observer.observe(topToolbar);
    }

    const toggle = buildAutoHideSetting();
    const setAutoHide = enabled => {
        autoHide = enabled;
        writeSetting(AUTO_HIDE_KEY, enabled ? '' : 'false');
        if (toggle) toggle.checked = enabled;
        showToolbar();
    };
    toggle?.addEventListener('change', () => setAutoHide(toggle.checked));
    if (toggle) toggle.checked = autoHide;
    registerAction({ id: 'toggle-toolbar-auto-hide', label: 'Hide toolbars automatically, on or off', group: 'Reading',
        run: () => {
            setAutoHide(!autoHide);
            announceReaderAction(`Hide toolbars automatically ${autoHide ? 'on' : 'off'}.`);
        } });

    // Show briefly on load (or for good, with auto-hide off)
    showToolbar();

    // Reset timer on any user activity
    ['mousemove', 'touchstart', 'keydown'].forEach(evt => {
        document.addEventListener(evt, showToolbar, { passive: true });
    });
}

// The UI creates this setting itself, after Blur background behind dialogs, so books converted
// before it existed get it too
function buildAutoHideSetting() {
    const existing = document.getElementById('webbook-toolbar-auto-hide-toggle');
    if (existing) return existing;
    const fieldset = document.querySelector('#webbook-settings fieldset');
    if (!fieldset) return null;
    const row = document.createElement('div');
    row.id = 'webbook-toolbar-auto-hide';
    const label = document.createElement('label');
    label.htmlFor = 'webbook-toolbar-auto-hide-toggle';
    label.textContent = 'Hide toolbars automatically';
    const toggle = document.createElement('input');
    toggle.type = 'checkbox';
    toggle.id = 'webbook-toolbar-auto-hide-toggle';
    row.append(label, toggle);
    const blurRow = document.getElementById('webbook-dialog-blur-toggle')?.closest('div');
    if (blurRow?.parentElement === fieldset) blurRow.after(row);
    else fieldset.append(row);
    return toggle;
}
