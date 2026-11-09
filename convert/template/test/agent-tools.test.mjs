import assert from 'node:assert/strict';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';

const dom = new JSDOM(`<!doctype html><html><head><title>Test book</title></head><body>
  <main><h1>Chapter one</h1><p id="phrase">Text</p></main>
  <nav id="webbook-toc-nav"><ol><li><a href="chapter1.html">Chapter one</a></li></ol></nav>
  <section id="webbook-settings"><fieldset></fieldset></section>
  <section id="webbook-toolbar"><audio></audio></section>
</body></html>`, { url: 'https://example.test/chapter1.html' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
Object.defineProperty(globalThis, 'location', { value: dom.window.location, configurable: true });
globalThis.localStorage = dom.window.localStorage;
globalThis.Event = dom.window.Event;
globalThis.Element = dom.window.Element;
globalThis.Node = dom.window.Node;
globalThis.CustomEvent = dom.window.CustomEvent;

const registrations = [];
document.modelContext = {
    registerTool(tool, options) {
        registrations.push({ tool, options });
        return Promise.resolve();
    }
};

const { initAgentTools, agentToolDefinitions, chapterTocItems, textForCurrentSection } = await import('../src/js/agent-tools.js');
const { registerAction } = await import('../src/js/reader-actions.js');

test('registers the stable tool set with object schemas and an abort signal', async () => {
    initAgentTools();
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.deepEqual(registrations.map(entry => entry.tool.name), [
        'reader_status', 'list_contents', 'go_to', 'narration', 'set_reading_option', 'search_book', 'read_text'
    ]);
    for (const { tool, options } of registrations) {
        assert.match(tool.name, /^[A-Za-z0-9_.-]{1,128}$/);
        assert.equal(tool.inputSchema.type, 'object');
        assert.equal(tool.outputSchema.type, 'object');
        assert.equal(typeof tool.execute, 'function');
        assert.ok(options.signal instanceof dom.window.AbortSignal || options.signal?.constructor.name === 'AbortSignal');
    }
});

test('runs reader actions and reports unavailable actions without throwing', () => {
    let calls = 0;
    registerAction({ id: 'next-phrase', label: 'Next phrase', run: () => { calls++; }, isAvailable: () => true });
    registerAction({ id: 'previous-phrase', label: 'Previous phrase', run: () => { calls++; }, isAvailable: () => false });
    const narration = agentToolDefinitions().find(tool => tool.name === 'narration');
    assert.equal(narration.execute({ action: 'next_phrase' }).error, undefined);
    assert.equal(calls, 1);
    assert.equal(narration.execute({ action: 'previous_phrase' }).error, true);
    assert.equal(calls, 1);
});

test('narration reports the requested state instead of the generic toggle label', () => {
    const audio = document.querySelector('audio');
    let paused = false;
    Object.defineProperty(audio, 'paused', { configurable: true, get: () => paused });
    registerAction({ id: 'play-pause', label: 'Play or pause', run: () => { paused = !paused; }, isAvailable: () => true });
    const narration = agentToolDefinitions().find(tool => tool.name === 'narration');
    assert.equal(narration.execute({ action: 'pause' }).message, 'Paused.');
    assert.equal(paused, true);
    assert.equal(narration.execute({ action: 'play' }).message, 'Playing.');
    assert.equal(paused, false);
});

test('current section includes content after a heading-only target and stops at the next entry', () => {
    document.querySelector('main').innerHTML = '<h1 id="one">One</h1><p>First section text.</p><h2 id="two">Two</h2><p>Second section text.</p>';
    document.querySelector('#webbook-toc-nav ol').innerHTML = '<li><a href="#one">One</a></li><li><a href="#two">Two</a></li>';
    document.getElementById('one').getBoundingClientRect = () => ({ top: 0, bottom: 20 });
    document.getElementById('two').getBoundingClientRect = () => ({ top: 1000, bottom: 1020 });
    assert.equal(textForCurrentSection(), 'One First section text.');
});

test('chapters use the level below a single top-level wrapper', () => {
    document.querySelector('#webbook-toc-nav ol').innerHTML = '<li><a href="index.html">Book</a><ol><li><a href="one.html">One</a></li><li><a href="two.html">Two</a></li></ol></li>';
    assert.deepEqual(chapterTocItems().map(item => item.title), ['One', 'Two']);
});

test('the global setting defaults on and aborts every registration when turned off', () => {
    const toggle = document.getElementById('webbook-agent-tools-toggle');
    assert.equal(toggle.checked, true);
    toggle.checked = false;
    toggle.dispatchEvent(new Event('change', { bubbles: true }));
    assert.equal(localStorage.getItem('webbook-agent-tools'), 'false');
    assert.ok(registrations.every(entry => entry.options.signal.aborted));
});
