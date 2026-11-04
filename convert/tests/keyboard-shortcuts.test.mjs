import assert from 'node:assert/strict';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import { registerAction } from '../template/src/js/reader-actions.js';

let instance = 0;

async function setup(saved) {
    const dom = new JSDOM('<main><input><div contenteditable="true"><span>Text</span></div></main>', { url: 'https://books.example/book/chapter.html' });
    for (const name of ['window', 'document', 'localStorage', 'Element']) globalThis[name] = dom.window[name];
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: dom.window.navigator });
    if (saved !== undefined) localStorage.setItem('webbook-keyboard-shortcut-map', saved);
    const calls = [];
    let available = true;
    for (const [id, code] of [['play-pause', 'Backslash'], ['next-phrase', 'BracketRight'], ['skip-past', 'Escape'], ['rate-up', null]]) {
        registerAction({ id, label: id, group: 'Narration', defaultKeys: code ? [{ code }] : [],
            run: () => calls.push(id), isAvailable: () => available });
    }
    const shortcuts = await import(`../template/src/js/keyboard-shortcuts.js?test=${++instance}`);
    shortcuts.initKeyboardShortcuts();
    const press = (code, options = {}, target = document.body) => {
        const event = new dom.window.KeyboardEvent('keydown', { code, bubbles: true, cancelable: true, ...options });
        target.dispatchEvent(event);
        return event.defaultPrevented;
    };
    return { shortcuts, dom, calls, press, setAvailable: value => { available = value; } };
}

test('defaults match physical keys and exact modifiers; unavailable actions leave keys alone', async () => {
    const { calls, press, setAvailable } = await setup();
    assert.equal(press('Backslash', { key: '#' }), true);
    assert.deepEqual(calls, ['play-pause']);
    for (const flag of ['ctrlKey', 'altKey', 'shiftKey', 'metaKey']) assert.equal(press('Backslash', { [flag]: true }), false);
    assert.equal(press('Backslash', { repeat: true }), false);
    setAvailable(false);
    assert.equal(press('Escape'), false);
    assert.equal(press('BracketRight'), false);
});

test('typing, popovers, disabled shortcuts, capture and already-handled keys block actions', async () => {
    const { shortcuts, dom, calls, press } = await setup();
    assert.equal(press('Backslash', {}, document.querySelector('input')), false);
    assert.equal(press('Backslash', {}, document.querySelector('[contenteditable] span')), false);
    const querySelector = document.querySelector.bind(document);
    document.querySelector = selector => selector.includes(':popover-open') ? {} : querySelector(selector);
    assert.equal(press('Backslash'), false);
    document.querySelector = querySelector;
    localStorage.setItem('webbook-keyboard-shortcuts', 'false');
    assert.equal(press('Escape'), false);
    localStorage.removeItem('webbook-keyboard-shortcuts');
    shortcuts.setShortcutCapture(true);
    assert.equal(press('Backslash'), false);
    shortcuts.setShortcutCapture(false);
    assert.equal(press('Backslash', { isComposing: true }), false);
    const event = new dom.window.KeyboardEvent('keydown', { code: 'Backslash', bubbles: true, cancelable: true });
    event.preventDefault();
    document.body.dispatchEvent(event);
    assert.deepEqual(calls, []);
});

test('moving a default key persists its removal and only the changed bindings', async () => {
    const { shortcuts, press, calls } = await setup();
    assert.deepEqual(shortcuts.assignShortcut('rate-up', { code: 'BracketRight' }).map(action => action.id), ['next-phrase']);
    assert.equal(press('BracketRight'), true);
    assert.deepEqual(calls, ['rate-up']);
    const saved = localStorage.getItem('webbook-keyboard-shortcut-map');
    assert.deepEqual(Object.keys(JSON.parse(saved).bindings).sort(), ['next-phrase', 'rate-up']);
    const reloaded = await setup(saved);
    assert.deepEqual(reloaded.shortcuts.getActionKeys('next-phrase'), []);
    assert.equal(reloaded.press('BracketRight', { repeat: true }), true);
    assert.deepEqual(reloaded.calls, ['rate-up']);
    reloaded.shortcuts.resetShortcuts();
    assert.equal(localStorage.getItem('webbook-keyboard-shortcut-map'), null);
    assert.equal(reloaded.shortcuts.getActionKeys('next-phrase')[0].code, 'BracketRight');
    assert.deepEqual(reloaded.shortcuts.getActionKeys('rate-up'), []);
});

test('restoring one action default reports and resolves conflicts', async () => {
    const { shortcuts } = await setup();
    shortcuts.assignShortcut('rate-up', { code: 'BracketRight' });
    assert.deepEqual(shortcuts.shortcutConflicts('next-phrase', shortcuts.getActionKeys('play-pause').map(() => ({ code: 'BracketRight' }))).map(action => action.id), ['rate-up']);
    assert.deepEqual(shortcuts.restoreActionDefaults('next-phrase').map(action => action.id), ['rate-up']);
    assert.equal(shortcuts.getActionKeys('next-phrase')[0].code, 'BracketRight');
    assert.deepEqual(shortcuts.getActionKeys('rate-up'), []);
});

test('reserved keys cannot be assigned or restored from storage', async () => {
    const { shortcuts } = await setup();
    for (const code of ['Tab', 'Enter', 'NumpadEnter', 'Space', 'Escape']) {
        shortcuts.assignShortcut('rate-up', { code, shift: true });
        assert.deepEqual(shortcuts.getActionKeys('rate-up'), []);
        assert(shortcuts.shortcutRejection({ code }, 'rate-up'));
    }
    assert.equal(shortcuts.shortcutRejection({ code: 'Escape' }, 'skip-past'), '');
    const restored = await setup(JSON.stringify({ version: 1, bindings: { 'play-pause': [{ code: 'Escape' }] } }));
    assert.equal(restored.shortcuts.getActionKeys('play-pause')[0].code, 'Backslash');
});

test('malformed storage is tolerated; unknown fields and actions do not discard valid choices', async () => {
    for (const saved of ['{', 'null', '[]', '{"version":2,"bindings":{}}', '{"version":1,"bindings":{"play-pause":[null,{"code":"__proto__"},{"code":"constructor"},{"code":"F9","alt":"yes"}]}}']) {
        const { shortcuts } = await setup(saved);
        assert.equal(shortcuts.getActionKeys('play-pause')[0].code, 'Backslash');
    }
    const { shortcuts } = await setup(JSON.stringify({ version: 1, future: true, bindings: { unknown: [{ code: 'F8' }], 'play-pause': [{ code: 'F9', shift: true, future: 123 }] } }));
    assert.deepEqual(shortcuts.getActionKeys('play-pause'), [{ code: 'F9', shift: true, alt: false, ctrl: false, meta: false }]);
    shortcuts.removeShortcut('play-pause');
    assert.deepEqual(shortcuts.getActionKeys('play-pause'), []);
});

test('the off switch still works when storage can be read but writes fail', async () => {
    const { dom, press } = await setup();
    document.body.insertAdjacentHTML('beforeend', '<section id="webbook-settings"><fieldset><div><input type="checkbox" id="webbook-keyboard-shortcuts-toggle"></div></fieldset></section>');
    window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
    const { initSettings } = await import('../template/src/js/settings.js');
    initSettings();
    const storage = localStorage;
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
        getItem: storage.getItem.bind(storage),
        setItem() { throw new Error('Storage full'); }
    } });
    const toggle = document.getElementById('webbook-keyboard-shortcuts-toggle');
    toggle.checked = false;
    toggle.dispatchEvent(new dom.window.Event('change'));
    assert.equal(press('Backslash'), false);
    toggle.checked = true;
    toggle.dispatchEvent(new dom.window.Event('change'));
    assert.equal(press('Backslash'), true);
    globalThis.localStorage = storage;
    toggle.dispatchEvent(new dom.window.Event('change'));
});

test('storage failures keep in-document choices usable', async () => {
    const { shortcuts, press, calls } = await setup();
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
        getItem() { throw new Error('Storage blocked'); },
        setItem() { throw new Error('Storage full'); },
        removeItem() { throw new Error('Storage blocked'); }
    } });
    assert.doesNotThrow(() => shortcuts.assignShortcut('rate-up', { code: 'F9' }));
    assert.equal(press('F9'), true);
    assert.deepEqual(calls, ['rate-up']);
    assert.doesNotThrow(() => shortcuts.resetShortcuts());
    const blocked = await import(`../template/src/js/keyboard-shortcuts.js?test=${++instance}`);
    assert.doesNotThrow(() => blocked.initKeyboardShortcuts());
    assert.equal(blocked.getActionKeys('play-pause')[0].code, 'Backslash');
});

test('layout names have spoken alternatives and browse-mode keys can be warned about', async () => {
    const { shortcuts } = await setup();
    assert.equal(shortcuts.shortcutName({ code: 'BracketLeft' }).ariaLabel, 'Left bracket');
    assert.equal(shortcuts.shortcutName({ code: 'KeyF', shift: true }).ariaLabel, 'Shift plus F');
    assert.equal(shortcuts.isBrowseModeKey({ code: 'KeyH' }), true);
    assert.equal(shortcuts.isBrowseModeKey({ code: 'Comma' }), true);
    assert.equal(shortcuts.isBrowseModeKey({ code: 'KeyH', ctrl: true }), false);
    assert.equal(shortcuts.isBrowseModeKey({ code: 'BracketRight' }), false);
    Object.defineProperty(navigator, 'keyboard', { value: { getLayoutMap: async () => new Map([['BracketLeft', 'ü']]) } });
    await shortcuts.loadKeyboardLayout();
    assert.equal(shortcuts.shortcutName({ code: 'BracketLeft' }).text, 'ü');
});
