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
const SPOKEN_CHARACTERS = Object.fromEntries(Object.values(KEY_NAMES).map(([key, name]) => [key, name]));
let changes = {};
let capturing = false;
let initialized = false;
let layoutMap = null;

export function keySpecForEvent(event) {
    return { code: event.code, shift: event.shiftKey, alt: event.altKey, ctrl: event.ctrlKey, meta: event.metaKey };
}

function normalizeKeySpec(spec) {
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
    return !MODIFIERS.some(name => spec[name])
        && (/^Key[A-Z]$/.test(spec.code) || ['Comma', 'Minus', 'Semicolon', 'Slash', 'Quote'].includes(spec.code));
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

export function shortcutName(spec) {
    const fallback = KEY_NAMES[spec.code] ?? [spec.code.replace(/^(Key|Digit)/, '').replace(/^Numpad/, 'Numpad '), spec.code.replace(/^(Key|Digit)/, '').replace(/^Numpad/, 'Numpad ')];
    const layoutKey = layoutMap?.get(spec.code);
    const key = layoutKey ? (/^[a-z]$/i.test(layoutKey) ? layoutKey.toUpperCase() : layoutKey) : fallback[0];
    const spoken = layoutKey ? (SPOKEN_CHARACTERS[key] ?? key) : fallback[1];
    const mac = /Mac|iPhone|iPad/.test(navigator.platform);
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

export function initKeyboardShortcuts() {
    if (initialized) return;
    initialized = true;
    changes = readChanges();
    initReaderActionStatus();
    document.addEventListener('keydown', event => {
        if (capturing || event.defaultPrevented || event.isComposing || !keyboardShortcutsEnabled()) return;
        if (isTextEntryTarget(event.target) || isAnyPopoverOpen()) return;
        const key = keySpecForEvent(event);
        const action = getActions().find(action => getActionKeys(action.id).some(spec => sameKey(spec, key)));
        if (!action || (event.repeat && !REPEAT_ACTIONS.has(action.id)) || !action.isAvailable()) return;
        event.preventDefault();
        runAction(action.id);
    });
}
