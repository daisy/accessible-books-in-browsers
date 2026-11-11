import { appendSetting, settingsSection } from './settings-sections.js';
import { exportSettings, importSettings, resetSettings, validateSettingsFile } from './settings-file.js';
import { announceReaderAction, registerAction } from './reader-actions.js';
import { pageAudio } from './dom-utils.js';
import { playOrOfferToContinue } from './continue-playing.js';
import { readingLine } from './narration-position.js';

const RETURN_KEY = 'webbook-settings-return'; // session-only UI state, never exported
const READING_BLOCKS = 'h1, h2, h3, h4, h5, h6, p, li, blockquote, td, th, figcaption, dt, dd';

function readingBlocks() {
    return Array.from(document.querySelector('main')?.querySelectorAll(READING_BLOCKS) ?? []);
}

export function initSettingsTransfer() {
    if (!settingsSection('all') || document.getElementById('webbook-settings-transfer')) return;
    const group = document.createElement('div');
    group.id = 'webbook-settings-transfer';
    const status = document.createElement('p');
    status.id = 'webbook-settings-result';
    const report = message => {
        status.textContent = message;
        // Assigned shortcuts can run while Settings is closed; show their result there too.
        announceReaderAction(message, { show: !status.getClientRects().length });
    };
    const button = (id, label, run) => {
        const element = document.createElement('button');
        element.id = id;
        element.type = 'button';
        element.textContent = label;
        element.addEventListener('click', run);
        return element;
    };
    const exportButton = button('webbook-settings-export', 'Export settings', () => {
        try {
            const blob = new Blob([JSON.stringify(exportSettings(), null, 2) + '\n'], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'webbook-settings.json';
            document.body.append(link);
            link.click();
            link.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            report('Settings exported');
        } catch (error) { report(`Settings not exported. ${error.message}`); }
    });
    const picker = document.createElement('input');
    picker.type = 'file';
    picker.accept = 'application/json,.json';
    picker.hidden = true;
    picker.id = 'webbook-settings-file';
    const importButton = button('webbook-settings-import', 'Import settings', () => {
        picker.value = '';
        picker.click();
    });
    picker.addEventListener('change', async () => {
        const file = picker.files?.[0];
        if (!file) return;
        try {
            if (file.size > 1024 * 1024) throw new Error('Choose a settings file smaller than 1 MB.');
            let data;
            try { data = JSON.parse(await file.text()); }
            catch { throw new Error('The file is not valid JSON.'); }
            validateSettingsFile(data);
            const reload = prepareReload('Settings imported', importButton.id);
            importSettings(data);
            reload();
        } catch (error) {
            clearReturnState();
            report(`Settings not imported. ${error.message}`);
        }
    });
    const confirmation = document.createElement('div');
    confirmation.id = 'webbook-settings-reset-confirmation';
    confirmation.hidden = true;
    confirmation.setAttribute('role', 'group');
    confirmation.setAttribute('aria-labelledby', 'webbook-settings-reset-question');
    const question = document.createElement('p');
    question.id = 'webbook-settings-reset-question';
    question.textContent = 'Reset all settings? Your reading positions will be kept.';
    const resetButton = button('webbook-settings-reset', 'Reset all settings', () => {
        document.getElementById('webbook-settings').showPopover?.();
        confirmation.hidden = false;
        resetButton.setAttribute('aria-expanded', 'true');
        cancel.focus();
        announceReaderAction(question.textContent, { show: false });
    });
    resetButton.setAttribute('aria-controls', confirmation.id);
    resetButton.setAttribute('aria-expanded', 'false');
    const confirm = button('webbook-settings-reset-confirm', 'Yes, reset all settings', () => {
        try {
            const reload = prepareReload('All settings reset', resetButton.id);
            resetSettings();
            reload();
        } catch (error) {
            clearReturnState();
            report(`Settings not reset. ${error.message}`);
        }
    });
    const cancel = button('webbook-settings-reset-cancel', 'Cancel', () => {
        confirmation.hidden = true;
        resetButton.setAttribute('aria-expanded', 'false');
        resetButton.focus();
    });
    confirmation.append(question, cancel, confirm);
    group.append(exportButton, importButton, picker, resetButton, confirmation, status);
    appendSetting('all', group);
    for (const [id, label, control] of [
        ['export-settings', 'Export settings', exportButton],
        ['import-settings', 'Import settings', importButton],
        ['reset-settings', 'Reset all settings', resetButton]
    ]) {
        registerAction({ id, label, group: 'Settings', run: () => control.click() });
    }
    restoreAfterReload(report);
}

// Save the current page and narration time in this tab, independently of the resume preference.
// Reinitializing the reader on this same page applies every module's settings together.
function prepareReload(message, focusId) {
    const audio = pageAudio();
    const panel = document.getElementById('webbook-settings');
    // A text block and its position in the viewport survive a font/spacing change better than
    // an absolute scroll offset. The same page's block order stays the same on reload.
    const blocks = readingBlocks();
    const blockIndex = blocks.findIndex(element => element.getClientRects().length && element.getBoundingClientRect().bottom > readingLine());
    const block = blocks[blockIndex]?.getBoundingClientRect();
    const state = { url: location.href, scrollY: window.scrollY, audioTime: audio?.currentTime ?? 0,
        blockIndex, blockOffset: block ? block.top - readingLine() : 0,
        playing: Boolean(audio && !audio.paused), panelScroll: panel.scrollTop, message, focusId };
    // Check session storage before changing any preferences: without it a reload could lose place.
    sessionStorage.setItem(RETURN_KEY, JSON.stringify(state));
    return () => location.reload();
}

function clearReturnState() {
    try { sessionStorage.removeItem(RETURN_KEY); } catch { /* Storage itself may be blocked. */ }
}

function restoreAfterReload(report) {
    let state;
    try {
        state = JSON.parse(sessionStorage.getItem(RETURN_KEY));
        sessionStorage.removeItem(RETURN_KEY);
    } catch { return; }
    if (!state || state.url !== location.href) return;
    const restore = () => {
        const audio = pageAudio();
        const seek = () => {
            if (audio) audio.currentTime = state.audioTime;
            if (audio && state.playing) playOrOfferToContinue(audio);
        };
        if (audio && audio.readyState < 1) audio.addEventListener('loadedmetadata', seek, { once: true });
        else seek();
        const block = readingBlocks()[state.blockIndex];
        const top = block?.getClientRects().length
            ? window.scrollY + block.getBoundingClientRect().top - readingLine() - state.blockOffset
            : state.scrollY;
        window.scrollTo(0, top);
        const panel = document.getElementById('webbook-settings');
        // Opening the panel moves focus to its first control (popovers.js, on toggle), so the
        // button the reader used gets it back after that
        const refocus = () => {
            document.getElementById(state.focusId)?.focus({ preventScroll: true });
            panel.scrollTop = state.panelScroll;
        };
        panel.addEventListener('toggle', () => setTimeout(refocus), { once: true });
        panel.showPopover?.();
        refocus();
        report(state.message);
    };
    const afterPlayer = () => {
        const audio = pageAudio();
        const track = audio?.querySelector('track');
        const hasSource = audio && (audio.getAttribute('src') || audio.querySelector('source[src]'));
        // A slow track can arrive after window.load. Let the player's initial hash/resume seek
        // finish first, or it would replace the exact time restored here with the cue's start.
        const settled = () => window.requestAnimationFrame(() => window.requestAnimationFrame(restore));
        if (hasSource && track && track.readyState < 2) {
            const ready = () => {
                document.removeEventListener('webbook:playerready', ready);
                track.removeEventListener('error', ready);
                settled();
            };
            document.addEventListener('webbook:playerready', ready, { once: true });
            track.addEventListener('error', ready, { once: true });
        } else settled();
    };
    if (document.readyState === 'complete') afterPlayer();
    else window.addEventListener('load', afterPlayer, { once: true });
}
