// Saved preferences must also be listed in settings-file.js (export, import and reset).
import { appendSetting } from './settings-sections.js';
import { getActions, runAction, initReaderActionStatus } from './reader-actions.js';
import { keyboardShortcutsEnabled } from './settings.js';
import { isAnyPopoverOpen, isTextEntryTarget } from './dom-utils.js';

const STORAGE_KEY = 'webbook-keyboard-shortcut-map';
const MODIFIERS = ['shift', 'alt', 'ctrl', 'meta'];
const REPEAT_ACTIONS = new Set(['rate-down', 'rate-up', 'font-smaller', 'font-larger']);
const KEY_NAMES = {
    BracketLeft: ['[', 'Left bracket'], BracketRight: [']', 'Right bracket'],
    Backslash: ['\\', 'Backslash'], IntlBackslash: ['\\', 'Backslash'],
    Comma: [',', 'Comma'], Period: ['.', 'Period'], Slash: ['/', 'Slash'],
    Semicolon: [';', 'Semicolon'], Quote: ["'", 'Apostrophe'],
    Minus: ['-', 'Minus'], Equal: ['=', 'Equals'], Backquote: ['`', 'Backquote'],
    Escape: ['Escape', 'Escape'], Backspace: ['Backspace', 'Backspace'],
    Delete: ['Delete', 'Delete'], Insert: ['Insert', 'Insert'],
    Home: ['Home', 'Home'], End: ['End', 'End'],
    PageUp: ['Page Up', 'Page up'], PageDown: ['Page Down', 'Page down'],
    ArrowUp: ['↑', 'Up arrow'], ArrowDown: ['↓', 'Down arrow'],
    ArrowLeft: ['←', 'Left arrow'], ArrowRight: ['→', 'Right arrow'],
    NumpadAdd: ['Numpad +', 'Numpad plus'], NumpadSubtract: ['Numpad −', 'Numpad minus'],
    NumpadMultiply: ['Numpad *', 'Numpad multiply'], NumpadDivide: ['Numpad /', 'Numpad divide'],
    NumpadDecimal: ['Numpad .', 'Numpad decimal'], NumpadEqual: ['Numpad =', 'Numpad equals'],
    IntlRo: ['IntlRo', 'International Ro key'], IntlYen: ['¥', 'Yen']
};
// A Mac's keyboard names these differently: the key above Return is "delete" (⌫), and the one that
// deletes forward is "forward delete" (⌦, fn+delete on a laptop) (user, 2026-11-10: the Back to
// text hint said Backspace, which a Mac doesn't have)
const MAC_KEY_NAMES = {
    Backspace: ['⌫', 'Delete'],
    Delete: ['⌦', 'Forward delete']
};
const SPOKEN_CHARACTERS = Object.fromEntries(Object.values(KEY_NAMES).map(([key, name]) => [key, name]));
let changes = {};
let capturing = false;
let initialized = false;
let layoutMap = null;

export function keySpecForEvent(event) {
    return { code: event.code, shift: event.shiftKey, alt: event.altKey, ctrl: event.ctrlKey, meta: event.metaKey };
}

export function normalizeKeySpec(spec) {
    if (!spec || typeof spec !== 'object' || typeof spec.code !== 'string') return null;
    if (!Object.hasOwn(KEY_NAMES, spec.code) && !/^(Key[A-Z]|Digit[0-9]|Numpad[0-9]|F([1-9]|1[0-9]|2[0-4]))$/.test(spec.code)) return null;
    if (MODIFIERS.some(name => spec[name] !== undefined && typeof spec[name] !== 'boolean')) return null;
    return { code: spec.code, ...Object.fromEntries(MODIFIERS.map(name => [name, spec[name] === true])) };
}

function sameKey(first, second) {
    return first.code === second.code && MODIFIERS.every(name => Boolean(first[name]) === Boolean(second[name]));
}

export function shortcutRejection(spec, actionId) {
    if (['Tab', 'Enter', 'NumpadEnter', 'Space'].includes(spec.code)) {
        return 'Tab, Enter and Space are reserved for moving between and activating controls.';
    }
    if (spec.code === 'Escape' && actionId !== 'skip-past') return 'Escape is reserved for Skip past.';
    if (!normalizeKeySpec(spec)) return 'This key cannot be used as a shortcut. Choose another key.';
    return '';
}

export function isBrowseModeKey(spec) {
    // Shift+comma and Shift+period too: NVDA's start of container, JAWS's previous and next element
    if (spec.shift && !spec.alt && !spec.ctrl && !spec.meta && ['Comma', 'Period'].includes(spec.code)) return true;
    return !MODIFIERS.some(name => spec[name])
        && (/^Key[A-Z]$/.test(spec.code) || ['Comma', 'Minus', 'Semicolon', 'Slash', 'Quote'].includes(spec.code));
}

// Alt+Shift with A, B, I, N or T are Chrome's and Edge's own commands (focus the toolbar, the
// bookmarks bar and so on), so the browser may take them first
function isBrowserKey(spec) {
    return spec.alt && spec.shift && !spec.ctrl && !spec.meta && ['KeyA', 'KeyB', 'KeyI', 'KeyN', 'KeyT'].includes(spec.code);
}

// What might take a key before the reader does; the reader allows it, but says so
export function shortcutWarning(spec) {
    if (isBrowseModeKey(spec)) return 'Warning: this key is a screen reader command in browse mode.';
    if (isBrowserKey(spec)) return 'Warning: Chrome and Edge use this key for their own commands.';
    return '';
}

function readChanges() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
        if (saved?.version !== 1 || !saved.bindings || typeof saved.bindings !== 'object') return {};
        const result = {};
        for (const action of getActions()) {
            if (!Object.hasOwn(saved.bindings, action.id)) continue;
            const specs = saved.bindings[action.id];
            if (!Array.isArray(specs)) continue;
            const valid = specs.map(normalizeKeySpec).filter(spec => spec && !shortcutRejection(spec, action.id));
            if (specs.length && !valid.length) continue;
            result[action.id] = valid.filter((spec, index) => valid.findIndex(other => sameKey(spec, other)) === index);
        }
        return result;
    } catch {
        return {};
    }
}

function saveChanges() {
    try {
        if (Object.keys(changes).length) localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, bindings: changes }));
        else localStorage.removeItem(STORAGE_KEY);
    } catch { /* Keep the choices for this document when storage is unavailable. */ }
}

export function getActionKeys(id) {
    const action = getActions().find(action => action.id === id);
    return changes[id] ?? action?.defaultKeys ?? [];
}

function setActionKeys(action, keys) {
    if (keys.length === action.defaultKeys.length && keys.every((key, index) => sameKey(key, action.defaultKeys[index]))) {
        delete changes[action.id];
    } else {
        changes[action.id] = keys;
    }
}

// Moving a key also records its removal from an action using a default, so that removal survives
// reload without storing a snapshot of every other action's defaults.
export function assignShortcut(id, spec) {
    const key = normalizeKeySpec(spec);
    const action = getActions().find(action => action.id === id);
    if (!action || !key || shortcutRejection(key, id)) return [];
    const moved = [];
    for (const other of getActions()) {
        if (other.id === id) continue;
        const keys = getActionKeys(other.id);
        if (!keys.some(current => sameKey(current, key))) continue;
        setActionKeys(other, keys.filter(current => !sameKey(current, key)));
        moved.push(other);
    }
    setActionKeys(action, [key]);
    saveChanges();
    return moved;
}

export function shortcutConflicts(id, keys) {
    return getActions().filter(action => action.id !== id
        && getActionKeys(action.id).some(current => keys.some(key => sameKey(current, key))));
}

export function restoreActionDefaults(id) {
    const action = getActions().find(action => action.id === id);
    if (!action) return [];
    const moved = shortcutConflicts(id, action.defaultKeys);
    for (const other of moved) {
        const keys = getActionKeys(other.id);
        setActionKeys(other, keys.filter(current => !action.defaultKeys.some(key => sameKey(current, key))));
    }
    setActionKeys(action, action.defaultKeys);
    saveChanges();
    return moved;
}

export function removeShortcut(id) {
    const action = getActions().find(action => action.id === id);
    if (!action) return;
    setActionKeys(action, []);
    saveChanges();
}

export function resetShortcuts() {
    changes = {};
    saveChanges();
}

export function setShortcutCapture(active) {
    capturing = active;
}

// A floating button an action also runs from (Skip past, a phrase's notes, Back to text) shows its
// first key, as the reader has it, for keyboard users to learn; screen readers get aria-keyshortcuts
export function showShortcutHint(button, actionId) {
    button.querySelector('.webbook-shortcut-hint')?.remove();
    button.removeAttribute('aria-keyshortcuts');
    const [spec] = keyboardShortcutsEnabled() ? getActionKeys(actionId) : [];
    if (!spec) return;
    const modifiers = [['ctrl', 'Control'], ['alt', 'Alt'], ['shift', 'Shift'], ['meta', 'Meta']].filter(([flag]) => spec[flag]).map(([, name]) => name);
    button.setAttribute('aria-keyshortcuts', [...modifiers, spec.code.replace(/^(Key|Digit)/, '')].join('+'));
    const hint = document.createElement('kbd');
    hint.className = 'webbook-shortcut-hint';
    hint.setAttribute('aria-hidden', 'true');
    hint.textContent = shortcutName(spec).text;
    button.append(hint);
}

export function shortcutName(spec) {
    const mac = /Mac|iPhone|iPad/.test(navigator.platform);
    const fallback = (mac && MAC_KEY_NAMES[spec.code]) || KEY_NAMES[spec.code] || [spec.code.replace(/^(Key|Digit)/, '').replace(/^Numpad/, 'Numpad '), spec.code.replace(/^(Key|Digit)/, '').replace(/^Numpad/, 'Numpad ')];
    const layoutKey = layoutMap?.get(spec.code);
    const key = layoutKey ? (/^[a-z]$/i.test(layoutKey) ? layoutKey.toUpperCase() : layoutKey) : fallback[0];
    const spoken = layoutKey ? (SPOKEN_CHARACTERS[key] ?? key) : fallback[1];
    const names = [['ctrl', 'Ctrl', 'Control', '⌃'], ['alt', 'Alt', mac ? 'Option' : 'Alt', '⌥'], ['shift', 'Shift', 'Shift', '⇧'], ['meta', mac ? 'Cmd' : 'Meta', mac ? 'Command' : 'Meta', '⌘']];
    const modifiers = names.filter(([flag]) => spec[flag]);
    return {
        text: mac ? modifiers.map(([, , , symbol]) => symbol).join('') + key : [...modifiers.map(([, label]) => label), key].join('+'),
        ariaLabel: [...modifiers.map(([, , label]) => label), spoken].join(' plus ')
    };
}

export async function loadKeyboardLayout() {
    try { layoutMap = await navigator.keyboard?.getLayoutMap(); } catch { /* Use physical-key names. */ }
}

// The button that opens the shortcut editor, in Settings. The editor itself (a large module) is
// loaded the first time it's opened.
export function initKeyboardShortcutEditorButton() {
    const toggle = document.getElementById('webbook-keyboard-shortcuts-toggle');
    if (!toggle || document.querySelector('.webbook-keyboard-shortcuts-row')) return;
    const openRow = document.createElement('div');
    openRow.className = 'webbook-keyboard-shortcuts-row';
    const openButton = document.createElement('button');
    openButton.type = 'button';
    openButton.textContent = 'Change keyboard shortcuts';
    openRow.append(openButton);
    appendSetting('keyboard', openRow);
    openButton.addEventListener('click', async () => {
        const { openKeyboardShortcutEditor } = await import('./keyboard-shortcut-settings.js');
        openKeyboardShortcutEditor(openButton);
    });
}

export function initKeyboardShortcuts() {
    if (initialized) return;
    initialized = true;
    changes = readChanges();
    initReaderActionStatus();
    document.addEventListener('keydown', event => {
        if (capturing || event.defaultPrevented || event.isComposing || !keyboardShortcutsEnabled()) return;
        if (isTextEntryTarget(event.target)) return;
        const key = keySpecForEvent(event);
        const action = getActions().find(action => getActionKeys(action.id).some(spec => sameKey(spec, key)));
        // Shortcuts rest while a panel is open, so its own keys work. An action that describes the
        // panel (Where am I?) runs there too, on a key with Alt, Ctrl or Cmd, never a plain key.
        if (isAnyPopoverOpen() && !(action?.inPanels && (key.alt || key.ctrl || key.meta))) return;
        if (!action || (event.repeat && !REPEAT_ACTIONS.has(action.id)) || !action.isAvailable()) return;
        event.preventDefault();
        runAction(action.id);
    });
}
