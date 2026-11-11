// Add every new saved preference here as well as in its module. This is the single list used
// by export, import validation and reset. Reading positions and one-shot navigation flags aren't
// preferences. Values use localStorage's strings; null means use the default.
import { normalizeKeySpec, shortcutRejection } from './keyboard-shortcuts.js';

const oneOf = (...values) => value => values.includes(value);
const boolean = oneOf('true', 'false');
const color = value => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
const percent = value => typeof value === 'string' && /^(?:[5-9][0-9]|1[0-9]{2}|200)$/.test(value) && Number(value) % 5 === 0;

function shortcutMap(value) {
    if (typeof value !== 'string') return false;
    try {
        const map = JSON.parse(value);
        if (!isObject(map) || map.version !== 1 || !isObject(map.bindings)) return false;
        return Object.entries(map.bindings).every(([id, keys]) => /^[a-z][a-z0-9-]*$/.test(id)
            && Array.isArray(keys) && keys.every(key => normalizeKeySpec(key) && !shortcutRejection(key, id)));
    } catch { return false; }
}

export const SETTINGS_DEFINITIONS = Object.freeze({
    'webbook-colors': oneOf('', 'auto', 'light', 'dark', 'white', 'black', 'cream', 'sepia', 'gray', 'blue', 'custom'),
    'webbook-colors-text': color,
    'webbook-colors-background': color,
    'webbook-colors-text-auto': boolean,
    'webbook-highlight-auto': boolean,
    'webbook-highlight-color': color,
    'webbook-highlight-style': oneOf('background', 'underline', 'both'),
    'webbook-font-family': oneOf('system-ui', 'sans-serif', 'serif'),
    'webbook-font-size': percent,
    'webbook-line-height': oneOf('', '1.8', '2'),
    'webbook-letter-spacing': oneOf('', 'wider', 'widest'),
    'webbook-word-spacing': oneOf('', 'wider', 'widest'),
    'webbook-line-length': oneOf('narrow', 'medium', 'wide'),
    'webbook-copy-math-format': oneOf('latex', 'mathml'),
    'webbook-dialog-backdrop-blur': boolean,
    'webbook-toolbar-auto-hide': boolean,
    'webbook-rate': percent,
    'webbook-caption-mode': boolean,
    'webbook-skip-pagebreak': boolean,
    'webbook-skip-footnote': boolean,
    'webbook-skip-sidebar': boolean,
    'webbook-sound-headings': boolean,
    'webbook-sound-notes': boolean,
    'webbook-sound-lists-tables': boolean,
    'webbook-note-references': oneOf('button', 'pause', 'follow'),
    'webbook-note-auto-return': boolean,
    'webbook-resume-enabled': boolean,
    'webbook-keyboard-shortcuts': boolean,
    'webbook-keyboard-shortcut-map': shortcutMap,
    'webbook-agent-tools': boolean,
    'webbook-time-display': oneOf('elapsed', 'chapter', 'book'),
    'webbook-toc-depth': oneOf('1', '2', '3', 'all'),
    // Compatibility with the first-paint script and the former Appearance control.
    'webbook-appearance': oneOf('auto', 'light', 'dark'),
    'webbook-appearance-migrated': oneOf('true')
});

function isObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function validateSettingsFile(file) {
    if (!isObject(file) || file.format !== 'webbook-settings') throw new Error('This is not a reader settings file.');
    if (typeof file.version === 'number' && file.version > 1) throw new Error('This settings file needs a newer reader (version ' + file.version + ').');
    if (file.version !== 1) throw new Error('This settings file version is not supported.');
    if (!isObject(file.settings)) throw new Error('The settings file must contain a settings object.');
    const settings = {};
    for (const [key, value] of Object.entries(file.settings)) {
        if (!Object.hasOwn(SETTINGS_DEFINITIONS, key)) continue;
        if (value !== null && !SETTINGS_DEFINITIONS[key](value)) throw new Error(`Invalid value for ${key}.`);
        settings[key] = value;
    }
    return settings;
}

// A value this reader no longer accepts (left by an older version) is left out, rather than
// refusing the whole export
export function exportSettings(storage = localStorage, now = new Date()) {
    const settings = Object.fromEntries(Object.entries(SETTINGS_DEFINITIONS).map(([key, valid]) => {
        const value = storage.getItem(key);
        return [key, value !== null && valid(value) ? value : null];
    }));
    const file = { format: 'webbook-settings', version: 1, exported: now.toISOString(), settings };
    validateSettingsFile(file);
    return file;
}

// Validation is complete before the first write. Roll back if storage fails partway through.
function writeSettings(settings, storage) {
    const previous = Object.fromEntries(Object.keys(settings).map(key => [key, storage.getItem(key)]));
    const write = (key, value) => value === null ? storage.removeItem(key) : storage.setItem(key, value);
    try {
        for (const [key, value] of Object.entries(settings)) write(key, value);
    } catch {
        for (const [key, value] of Object.entries(previous)) {
            try { write(key, value); } catch { /* Storage may have become unavailable altogether. */ }
        }
        throw new Error('Browser storage is unavailable. Settings could not be saved.');
    }
}

export function importSettings(file, storage = localStorage) {
    const settings = validateSettingsFile(file);
    writeSettings(settings, storage);
}

export function resetSettings(storage = localStorage) {
    writeSettings(Object.fromEntries(Object.keys(SETTINGS_DEFINITIONS).map(key => [key, null])), storage);
}
