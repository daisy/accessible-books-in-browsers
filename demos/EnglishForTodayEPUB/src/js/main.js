import { initEscapability } from './escapability.js';
import { initResumePosition, initResumeSetting } from './resume-position.js';
import { initPopoverCloseButtons, initPopoverToggleTracking, initTocInPageLinks } from './popovers.js';
import { initSettings } from './settings.js';
import { initSkippability } from './skippability.js';
import { initCaptionMode } from './caption-mode.js';
import { initPlayer } from './player.js';
import { initToolbarAutoHide } from './toolbar.js';
import { initInPlaceNavigation } from './in-place-navigation.js';

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
// Last, so its click handler runs after the others have seen the click
initInPlaceNavigation();

import('./media-session.js')
    .then(({ initMediaSessionControls }) => initMediaSessionControls())
    .catch(error => console.warn('Media Session controls unavailable.', error));
