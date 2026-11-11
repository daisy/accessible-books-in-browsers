import assert from 'node:assert/strict';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import { getActions, runAction } from '../src/js/reader-actions.js';
import { initSettingsTransfer } from '../src/js/settings-transfer.js';
import { openKeyboardShortcutEditor } from '../src/js/keyboard-shortcut-settings.js';

function setup({ restoring = false } = {}) {
    const dom = new JSDOM('<main><p>Reading</p></main><section id="webbook-settings"><h2>Settings</h2></section><section id="webbook-toolbar"><audio src="chapter.mp3"><track></audio></section>', { url: 'https://books.example/chapter.html' });
    for (const name of ['window', 'document', 'localStorage', 'sessionStorage', 'Element', 'Event', 'location']) globalThis[name] = dom.window[name];
    Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
    dom.window.HTMLElement.prototype.showPopover = function () { this.dataset.open = 'true'; };
    dom.window.HTMLElement.prototype.hidePopover = function () { delete this.dataset.open; };
    if (restoring) {
        Object.defineProperty(document.querySelector('audio'), 'readyState', { value: 4 });
        dom.window.scrollTo = () => {};
        dom.window.requestAnimationFrame = callback => callback();
        sessionStorage.setItem('webbook-settings-return', JSON.stringify({ url: location.href,
            audioTime: 9.321, scrollY: 0, panelScroll: 0, message: 'Settings imported', focusId: 'webbook-settings-import' }));
    }
    initSettingsTransfer();
    return dom;
}

test('transfer actions have no default bindings and all appear in the shortcut editor', () => {
    const dom = setup();
    const actions = getActions().filter(action => action.group === 'Settings');
    assert.deepEqual(actions.map(action => action.id), ['export-settings', 'import-settings', 'reset-settings']);
    assert.ok(actions.every(action => action.defaultKeys.length === 0));
    openKeyboardShortcutEditor(document.getElementById('webbook-settings-export'));
    assert.deepEqual(Array.from(document.querySelectorAll('#webbook-keyboard-shortcuts .webbook-shortcut-label'), label => label.textContent), ['Export settings', 'Import settings', 'Reset all settings']);
    dom.window.close();
});

test('reset action asks for confirmation, focuses Cancel and leaves all storage unchanged on cancellation', () => {
    const dom = setup();
    localStorage.setItem('webbook-colors', 'cream');
    localStorage.setItem('webbook-resume:book', 'position');
    const before = Object.fromEntries(Object.entries(localStorage));
    assert.equal(runAction('reset-settings'), true);
    assert.equal(document.getElementById('webbook-settings-reset-confirmation').hidden, false);
    assert.equal(document.activeElement.id, 'webbook-settings-reset-cancel');
    assert.deepEqual(Object.fromEntries(Object.entries(localStorage)), before);
    document.activeElement.click();
    assert.equal(document.getElementById('webbook-settings-reset-confirmation').hidden, true);
    assert.equal(document.activeElement.id, 'webbook-settings-reset');
    assert.deepEqual(Object.fromEntries(Object.entries(localStorage)), before);
    dom.window.close();
});

test('restoration waits for a slow track to finish the initial seek before restoring exact time', () => {
    const dom = setup({ restoring: true });
    const audio = document.querySelector('audio');
    window.dispatchEvent(new Event('load'));
    assert.equal(audio.currentTime, 0);
    assert.equal(document.getElementById('webbook-settings-result').textContent, '');
    // The player's track-ready handler first seeks to the phrase's start.
    audio.currentTime = 3.158;
    document.dispatchEvent(new Event('webbook:playerready'));
    assert.equal(audio.currentTime, 9.321);
    assert.equal(document.getElementById('webbook-settings-result').textContent, 'Settings imported');
    assert.equal(document.activeElement.id, 'webbook-settings-import');
    dom.window.close();
});
