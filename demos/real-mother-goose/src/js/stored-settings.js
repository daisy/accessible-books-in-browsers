// Settings kept in localStorage, which can be unavailable (blocked storage, some private modes):
// then a setting lasts this session only
// Register new preferences and their accepted values in settings-file.js for export/import/reset.
export function readSetting(key) {
    try { return localStorage.getItem(key); } catch { return null; }
}

// An empty value removes the setting
export function writeSetting(key, value) {
    try {
        if (value) localStorage.setItem(key, value);
        else localStorage.removeItem(key);
    } catch { /* this session only */ }
}

// An <option> for a setting's <select>; not `new Option()`, which jsdom (the tests) lacks
export function optionElement(value, text) {
    const element = document.createElement('option');
    element.value = value;
    element.textContent = text;
    return element;
}
