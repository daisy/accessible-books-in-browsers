import assert from 'node:assert/strict';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import { SETTINGS_DEFINITIONS, exportSettings, importSettings, resetSettings, validateSettingsFile } from '../src/js/settings-file.js';

const file = settings => ({ format: 'webbook-settings', version: 1, settings });
const storage = () => new JSDOM('', { url: 'https://books.example/' }).window.localStorage;
const snapshot = store => Object.fromEntries(Object.entries(store));

test('registry includes all preferences and excludes reading state', () => {
    for (const key of ['webbook-colors', 'webbook-caption-mode', 'webbook-time-display', 'webbook-toc-depth', 'webbook-keyboard-shortcut-map']) assert.ok(Object.hasOwn(SETTINGS_DEFINITIONS, key));
    for (const key of ['webbook-resume:book', 'webbook-resume-banner-pending', 'webbook-autoplay', 'webbook-caption-entry', 'webbook-settings-return']) assert.equal(Object.hasOwn(SETTINGS_DEFINITIONS, key), false);
    assert.ok(Object.keys(SETTINGS_DEFINITIONS).every(key => !key.includes(':')));
});

test('export round trip includes defaults and shortcuts, excluding reading positions', () => {
    const store = storage();
    store.setItem('webbook-colors', 'sepia');
    store.setItem('webbook-caption-mode', 'true');
    const shortcuts = JSON.stringify({ version: 1, bindings: { 'next-phrase': [{ code: 'KeyJ', alt: true }], 'play-pause': [] } });
    store.setItem('webbook-keyboard-shortcut-map', shortcuts);
    store.setItem('webbook-resume:book', '{"audioTime":73}');
    const result = exportSettings(store, new Date('2026-11-10T12:00:00Z'));
    assert.equal(result.format, 'webbook-settings');
    assert.equal(result.version, 1);
    assert.equal(result.exported, '2026-11-10T12:00:00.000Z');
    assert.deepEqual(Object.keys(result.settings), Object.keys(SETTINGS_DEFINITIONS));
    assert.equal(result.settings['webbook-keyboard-shortcut-map'], shortcuts);
    assert.equal(result.settings['webbook-font-size'], null);
    assert.equal(result.settings['webbook-resume:book'], undefined);
    const other = storage();
    other.setItem('webbook-font-size', '150');
    importSettings(JSON.parse(JSON.stringify(result)), other);
    assert.deepEqual(exportSettings(other).settings, result.settings);
});

test('wrong formats, newer versions and invalid values change nothing', () => {
    const store = storage();
    store.setItem('webbook-rate', '100');
    store.setItem('webbook-colors', 'cream');
    store.setItem('webbook-resume:book', 'position');
    const before = snapshot(store);
    for (const entry of [null, [], {}, { ...file({}), format: 'other' }, { ...file({}), version: 2 }, { ...file({}), version: 0 }, { ...file({}), version: '1' }, file([]), file(null), file({ 'webbook-rate': '130', 'webbook-colors': 'invalid' })]) {
        assert.throws(() => importSettings(entry, store));
        assert.deepEqual(snapshot(store), before);
    }
    assert.throws(() => validateSettingsFile({ ...file({}), version: 3 }), /newer reader/);
    for (const key of Object.keys(SETTINGS_DEFINITIONS)) {
        for (const value of [{}, [], true, 123, 'not-a-setting-value']) {
            assert.throws(() => importSettings(file({ 'webbook-rate': '130', [key]: value }), store), /Invalid value/);
            assert.deepEqual(snapshot(store), before);
        }
    }
});

test('range, color and shortcut validators reject malformed values', () => {
    for (const settings of [
        { 'webbook-font-size': '49' }, { 'webbook-font-size': '101' }, { 'webbook-rate': '201' }, { 'webbook-rate': '100.5' },
        { 'webbook-colors-text': '#fff' }, { 'webbook-colors-background': '#gg0000' },
        { 'webbook-keyboard-shortcut-map': '{' },
        ...[{ version: 2, bindings: {} }, { version: 1, bindings: [] },
            { version: 1, bindings: { 'rate-up': [{ code: 'Tab' }] } },
            { version: 1, bindings: { 'rate-up': [{ code: 'Escape' }] } },
            { version: 1, bindings: { 'rate-up': [{ code: 'KeyJ', shift: 'yes' }] } }
        ].map(value => ({ 'webbook-keyboard-shortcut-map': JSON.stringify(value) }))
    ]) assert.throws(() => validateSettingsFile(file(settings)), /Invalid value/);
    for (const value of ['50', '100', '105', '200']) assert.doesNotThrow(() => validateSettingsFile(file({ 'webbook-rate': value })));
});

test('unknown keys are ignored; null removes a preference; missing keys stay unchanged', () => {
    const store = storage();
    store.setItem('webbook-font-size', '120');
    store.setItem('webbook-rate', '130');
    store.setItem('webbook-resume:book', 'position');
    importSettings(file(JSON.parse('{"webbook-font-size":null,"webbook-resume:book":"overwritten","unknown":{},"__proto__":{"polluted":true}}')), store);
    assert.equal(store.getItem('webbook-font-size'), null);
    assert.equal(store.getItem('webbook-rate'), '130');
    assert.equal(store.getItem('webbook-resume:book'), 'position');
    assert.equal(store.getItem('unknown'), null);
    assert.equal({}.polluted, undefined);
});

test('storage failure rolls back earlier writes', () => {
    const values = new Map([['webbook-rate', '100'], ['webbook-colors', 'cream']]);
    let failed = false;
    const store = { getItem: key => values.get(key) ?? null,
        setItem: (key, value) => {
            if (key === 'webbook-colors' && !failed) { failed = true; throw new Error('Quota exceeded'); }
            values.set(key, value);
        }, removeItem: key => values.delete(key) };
    assert.throws(() => importSettings(file({ 'webbook-rate': '150', 'webbook-colors': 'blue' }), store), /could not be saved/);
    assert.deepEqual([...values], [['webbook-rate', '100'], ['webbook-colors', 'cream']]);
});

test('reset removes preferences and retains reading state and unrelated storage', () => {
    const store = storage();
    for (const key of Object.keys(SETTINGS_DEFINITIONS)) store.setItem(key, 'saved');
    const untouched = { 'webbook-resume:book': 'position', 'webbook-autoplay': 'true', 'another-app': 'value' };
    for (const [key, value] of Object.entries(untouched)) store.setItem(key, value);
    resetSettings(store);
    assert.deepEqual(snapshot(store), untouched);
});

test('export leaves out a value this reader no longer accepts, rather than failing', () => {
    const store = storage();
    store.setItem('webbook-colors', 'book-default');
    store.setItem('webbook-font-size', '130');
    const exported = exportSettings(store);
    assert.equal(exported.settings['webbook-colors'], null);
    assert.equal(exported.settings['webbook-font-size'], '130');
});
