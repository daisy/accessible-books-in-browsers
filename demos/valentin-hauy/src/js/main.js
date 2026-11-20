import { initReaderUpdates } from './reader-updates.js';
import { prepareReaderShell } from './reader-shell.js';
import { initOfflineReading } from './offline.js';
import { initEscapability } from './escapability.js';
import { initResumePosition, initResumeSetting } from './resume-position.js';
import {
    initPopoverCloseButtons,
    initPopoverToggleTracking,
    initTocInPageLinks,
    initPopoverActions,
} from './popovers.js';
import { initAppearance } from './appearance.js';
import { initSettings } from './settings.js';
import { initSkippability } from './skippability.js';
import { initCaptionMode } from './caption-mode.js';
import { initPlayer } from './player.js';
import { initToolbarAutoHide } from './toolbar.js';
import { initInPlaceNavigation } from './in-place-navigation.js';
import { initPageActions } from './page-entry.js';
import { initKeyboardShortcuts, initKeyboardShortcutEditorButton } from './keyboard-shortcuts.js';
import { initTocActions, initTocTree } from './toc-tree.js';
import { initCurrentPrintPage } from './current-print-page.js';
import { initNotesInPlace } from './notes-in-place.js';
import { initAgentTools } from './agent-tools.js';
import { initBrowserBookmarks } from './browser-bookmarks.js';
import { initResponsiveTables } from './responsive-tables.js';
import { initSkipLink } from './skip-link.js';
import { initReaderActionNotice } from './reader-actions.js';
import { initSettingsTransfer } from './settings-transfer.js';
import { initCopyContent } from './copy-content.js';
import { initResponsiveEquations } from './responsive-equations.js';
import { initWhereAmI } from './where-am-i.js';
import { initWritingMode } from './writing-mode.js';
import { initSettingsFilter } from './settings-filter.js';

export async function init() {
    if (document.documentElement.dataset.webbookContract !== '0')
        throw new Error('Incompatible book contract.');
    await prepareReaderShell();
    initEscapability();
    initResumePosition();
    initPopoverCloseButtons();
    initPopoverToggleTracking();
    initTocInPageLinks();
    initSettings();
    initWritingMode();
    initAppearance();
    initSettingsFilter();
    initSkippability();
    initResumeSetting();
    initCaptionMode();
    initPlayer();
    initToolbarAutoHide();
    initPageActions();
    initPopoverActions();
    initTocActions();
    initCurrentPrintPage();
    initNotesInPlace();
    initCopyContent();
    initResponsiveEquations();
    initSettingsTransfer();
    initOfflineReading();
    initReaderUpdates();
    // Before the shortcuts start: they read saved keys only for actions already registered
    initWhereAmI();
    initKeyboardShortcuts();
    initKeyboardShortcutEditorButton();
    initSearchOnDemand();
    initTocTree();
    initAgentTools();
    initBrowserBookmarks();
    initResponsiveTables();
    initSkipLink();
    initReaderActionNotice();
    // Last, so its click handler runs after the others have seen the click
    initInPlaceNavigation();

    import('./media-session.js')
        .then(({ initMediaSessionControls }) => initMediaSessionControls())
        .catch((error) => console.warn('Media Session controls unavailable.', error));
}

// Search is loaded when the reader first opens it, or right away after following a search result
// to another page by a full page load, so that page can highlight the matched words
function initSearchOnDemand() {
    const panel = document.getElementById('webbook-search');
    if (!panel) return;
    let loading = null;
    const load = () =>
        (loading ??= import('./search.js')
            .then(({ initSearch }) => initSearch())
            .catch((error) => console.warn('Search unavailable.', error)));
    panel.addEventListener('beforetoggle', (event) => {
        if (event.newState === 'open') load();
    });
    try {
        if (sessionStorage.getItem('webbook-search-highlight')) load();
    } catch {
        /* Without session storage there's nothing pending. */
    }
}

// Older v0 pages loaded main.js directly. Keep package-only local updates working;
// the release build removes this branch, and bootstrapped pages call init explicitly.
if (
    typeof __WEBBOOK_RELEASE__ === 'undefined' &&
    !window.webbookBootstrapStarted &&
    !document.documentElement.hasAttribute('data-webbook-shell') &&
    document.querySelector('script[type="module"][src$="src/js/main.js"]')
) {
    if (new URL(location.href).searchParams.get('webbook-baseline') === '1') {
        document.documentElement.classList.remove('webbook-js', 'webbook-dark', 'webbook-light', 'webbook-caption-mode');
    } else {
        window.webbookUI = { local: true };
        document.documentElement.dataset.webbookUi = 'local';
        init().catch(() => {
            const url = new URL(location.href);
            url.searchParams.set('webbook-baseline', '1');
            location.replace(url);
        });
    }
}
