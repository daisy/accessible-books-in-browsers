import { initEscapability } from './escapability.js';
import { initResumePosition, initResumeSetting } from './resume-position.js';
import { initPopoverCloseButtons, initPopoverToggleTracking, initTocInPageLinks, initPopoverActions } from './popovers.js';
import { initSettings } from './settings.js';
import { initSkippability } from './skippability.js';
import { initCaptionMode } from './caption-mode.js';
import { initPlayer } from './player.js';
import { initToolbarAutoHide } from './toolbar.js';
import { initInPlaceNavigation } from './in-place-navigation.js';
import { initPageActions } from './page-entry.js';
import { initKeyboardShortcuts, initKeyboardShortcutEditorButton } from './keyboard-shortcuts.js';
import { initTocTree } from './toc-tree.js';
import { initCurrentPrintPage } from './current-print-page.js';
import { initNotesInPlace } from './notes-in-place.js';
import { initAgentTools } from './agent-tools.js';
import { initBrowserBookmarks } from './browser-bookmarks.js';
import { initResponsiveTables } from './responsive-tables.js';
import { initSkipLink } from './skip-link.js';
import { initReaderActionNotice } from './reader-actions.js';
import { initSettingsTransfer } from './settings-transfer.js';
import { initCopyContent } from './copy-content.js';

initEscapability();
initResumePosition();
initPopoverCloseButtons();
initPopoverToggleTracking();
initTocInPageLinks();
initSettings();
initSkippability();
initResumeSetting();
initCaptionMode();
initPlayer();
initToolbarAutoHide();
initPageActions();
initPopoverActions();
initCurrentPrintPage();
initNotesInPlace();
initCopyContent();
initSettingsTransfer();
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
    .catch(error => console.warn('Media Session controls unavailable.', error));

// Search is loaded when the reader first opens it, or right away after following a search result
// to another page by a full page load, so that page can highlight the matched words
function initSearchOnDemand() {
    const panel = document.getElementById('webbook-search');
    if (!panel) return;
    let loading = null;
    const load = () => loading ??= import('./search.js')
        .then(({ initSearch }) => initSearch())
        .catch(error => console.warn('Search unavailable.', error));
    panel.addEventListener('beforetoggle', event => { if (event.newState === 'open') load(); });
    try {
        if (sessionStorage.getItem('webbook-search-highlight')) load();
    } catch { /* Without session storage there's nothing pending. */ }
}
