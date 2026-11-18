import assert from 'node:assert/strict';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
const dom = new JSDOM('<main><section class="epubtype_endnotes" id="notes"><p id="n1">Note one</p><p id="n2">Note two</p></section><p id="text">Main text</p></main>', { url: 'https://books.example/book/' });
for (const key of ['window', 'document', 'localStorage', 'Element']) globalThis[key] = dom.window[key];
globalThis.CSS = { escape: value => value };
const { allNarrationSkipped, allowPlaybackOf, clearPlaybackException, skipCue } = await import('../src/js/skippability.js');
const cue = id => ({ text: JSON.stringify({ selector: { type: 'FragmentSelector', value: id } }), startTime: 0, endTime: 1 });
const notes = { cues: [cue('n1'), cue('n2')] };
test('an entirely excluded page is distinguished from partial exclusions, no narration and unresolved cues', () => {
    assert.equal(allNarrationSkipped(notes), true);
    assert.equal(allNarrationSkipped({ cues: [...notes.cues, cue('text')] }), false);
    assert.equal(allNarrationSkipped({ cues: [] }), false);
    assert.equal(allNarrationSkipped(null), false);
    assert.equal(allNarrationSkipped({ cues: [cue('missing')] }), false);
});
test('changing skip settings and explicitly following a note make its page playable', () => {
    localStorage.setItem('webbook-skip-footnote', 'false');
    assert.equal(allNarrationSkipped(notes), false);
    localStorage.removeItem('webbook-skip-footnote');
    allowPlaybackOf('notes');
    assert.equal(allNarrationSkipped(notes), false);
    clearPlaybackException();
    assert.equal(allNarrationSkipped(notes), true);
});
test('an excluded page pauses without seeking to its end or advancing the book', () => {
    let paused = false;
    const audio = { currentTime: 0, dataset: {}, pause: () => { paused = true; } };
    skipCue(audio, notes, 0, notes.cues[0]);
    assert.equal(paused, true);
    assert.equal(audio.currentTime, 0);
});
