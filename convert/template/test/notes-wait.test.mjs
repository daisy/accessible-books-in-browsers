import assert from 'node:assert/strict';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import { initNotesInPlace, handleNarratedPhrase, hidePhraseNotes, canReturnFromNote } from '../src/js/notes-in-place.js';
import { initMediaSessionControls } from '../src/js/media-session.js';
import { runAction } from '../src/js/reader-actions.js';
import { initInPlaceNavigation } from '../src/js/in-place-navigation.js';
import { clearPlaybackException } from '../src/js/skippability.js';
import { initEscapability, handleEscapableStructure, canActivateCurrentEscape } from '../src/js/escapability.js';

test('the brief note wait ticks quietly and stops on completion, play, pause, seeking, following a note and navigation', async t => {
    const dom = new JSDOM(`<main><p id="phrase">Text<a href="#note" role="doc-noteref">1</a>.</p>
        <aside id="note" role="doc-footnote" class="epubtype_footnote"><p>A note.</p></aside><p id="next">Next phrase.</p></main>
        <div id="webbook-escape-container"><button id="webbook-escape-btn" hidden><span id="webbook-escape-label"></span></button><span id="webbook-escape-status"></span></div><section id="webbook-settings"></section>
        <section id="webbook-toolbar"><audio src="chapter.mp3"><track></audio></section>`,
    { url: 'https://books.example/chapter.html' });
    for (const name of ['window', 'document', 'history', 'location', 'localStorage', 'Event', 'CustomEvent', 'Element', 'Option']) globalThis[name] = dom.window[name];
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: dom.window.navigator });
    globalThis.CSS = { escape: value => value };
    window.scrollTo = () => {};
    window.Element.prototype.scrollIntoView = () => {};
    window.fetch = () => Promise.reject(new Error('This fixture has no other pages.'));
    localStorage.setItem('webbook-note-references', 'pause');
    const sources = [];
    const gains = [];
    let context;
    window.AudioContext = class {
        constructor() { context = this; this.state = 'suspended'; this.currentTime = 100; this.destination = {}; }
        resume() { this.state = 'running'; return Promise.resolve(); }
        createBuffer(channels, length, sampleRate) {
            return { length, duration: length / sampleRate, copyToChannel() {} };
        }
        createBufferSource() {
            const source = { stops: 0, connect() { return this; }, disconnect() {},
                start(when) { this.when = when; }, stop() { this.stops++; } };
            sources.push(source);
            return source;
        }
        createGain() {
            const gain = { gain: { value: 0 }, connect() { return this; }, disconnect() { this.disconnected = true; } };
            gains.push(gain);
            return gain;
        }
    };
    const mediaActions = new Map();
    Object.defineProperty(navigator, 'mediaSession', { value: { setActionHandler: (name, handler) => mediaActions.set(name, handler) } });
    const audio = document.querySelector('audio');
    let paused = false;
    let plays = 0;
    Object.defineProperty(audio, 'paused', { get: () => paused });
    audio.play = () => {
        plays++;
        if (paused) { paused = false; audio.dispatchEvent(new Event('play')); }
        return Promise.resolve();
    };
    audio.pause = () => {
        if (!paused) { paused = true; audio.dispatchEvent(new Event('pause')); }
    };
    const cue = { startTime: 0, endTime: 5,
        text: JSON.stringify({ selector: { type: 'FragmentSelector', value: 'phrase' } }) };
    const noteCue = { startTime: 5, endTime: 8, text: JSON.stringify({ selector: { type: 'FragmentSelector', value: 'note' } }) };
    const nextCue = { startTime: 8, endTime: 12, text: JSON.stringify({ selector: { type: 'FragmentSelector', value: 'next' } }) };
    Object.defineProperty(document.querySelector('track'), 'track', { value: { cues: [cue, noteCue, nextCue], activeCues: [cue] } });
    t.mock.timers.enable({ apis: ['setTimeout'] });
    try {
        initEscapability();
        initNotesInPlace();
        initInPlaceNavigation();
        initMediaSessionControls();
        const toggle = document.getElementById('webbook-note-wait-sound-toggle');
        assert.equal(toggle.checked, false);
        assert.equal(toggle.disabled, false);
        assert.equal(document.querySelector(`label[for="${toggle.id}"]`).textContent, 'Play ticking sound while paused');
        document.body.dispatchEvent(new Event('click', { bubbles: true }));
        assert.equal(context, undefined, 'silent waits do not initialize Web Audio');
        const beginWait = async (expectedTicks = 4) => {
            history.replaceState(null, '', 'chapter.html');
            clearPlaybackException();
            localStorage.setItem('webbook-note-references', 'pause');
            paused = false;
            audio.currentTime = 4.94;
            const before = sources.length;
            await handleNarratedPhrase(document.getElementById('phrase'));
            t.mock.timers.tick(1);
            const ticks = sources.slice(before).filter(source => source.buffer.length > 1);
            assert.equal(paused, true);
            assert.equal(ticks.length, expectedTicks);
            return ticks;
        };
        await beginWait(0);
        t.mock.timers.tick(2000);
        assert.equal(paused, false, 'silent waits still resume narration');
        assert.equal(audio.currentTime, 8, 'wait resumes after the skipped inline note');
        localStorage.setItem('webbook-skip-footnote', 'false');
        await beginWait(0);
        t.mock.timers.tick(2000);
        assert.equal(audio.currentTime, 5, 'notes remain in the flow when skipping is turned off');
        localStorage.removeItem('webbook-skip-footnote');
        toggle.checked = true;
        toggle.dispatchEvent(new Event('change'));
        assert.equal(localStorage.getItem('webbook-note-wait-sound'), 'true');
        // Unlock on a reader's press even with every optional structure sound turned off.
        document.body.dispatchEvent(new Event('click', { bubbles: true }));
        assert.equal(context.state, 'running');
        let ticks = await beginWait();
        assert.deepEqual(ticks.map(source => source.when), [100, 100.5, 101, 101.5]);
        assert.ok(gains.at(-1).gain.value > 0 && gains.at(-1).gain.value < .1);
        audio.volume = .5;
        audio.dispatchEvent(new Event('volumechange'));
        assert.equal(gains.at(-1).gain.value, .04);
        audio.muted = true;
        audio.dispatchEvent(new Event('volumechange'));
        assert.equal(gains.at(-1).gain.value, 0);
        audio.muted = false;
        audio.volume = 1;
        audio.dispatchEvent(new Event('volumechange'));
        t.mock.timers.tick(1990);
        assert.equal(paused, true);
        t.mock.timers.tick(20);
        assert.equal(paused, false);
        assert.ok(ticks.every(source => source.stops === 1));
        assert.equal(gains.at(-1).disconnected, true);

        ticks = await beginWait();
        toggle.checked = false;
        toggle.dispatchEvent(new Event('change'));
        assert.equal(localStorage.getItem('webbook-note-wait-sound'), 'false');
        assert.ok(ticks.every(source => source.stops === 1));
        assert.equal(paused, true, 'turning ticking off keeps the original wait');
        t.mock.timers.tick(2000);
        assert.equal(paused, false);
        toggle.checked = true;
        toggle.dispatchEvent(new Event('change'));

        ticks = await beginWait();
        await audio.play(); // The reader resumes before the two seconds have elapsed.
        const resumed = plays;
        assert.ok(ticks.every(source => source.stops === 1));
        t.mock.timers.tick(3000);
        assert.equal(plays, resumed);

        for (const cancel of [
            () => mediaActions.get('pause')(), // Already paused: the media element emits no event.
            () => audio.dispatchEvent(new Event('seeking')),
            () => {
                runAction('go-to-phrase-note');
                assert.equal(history.state.webbookNoteReturn.audioTime, 8, 'return from a note skips its inline narration');
            },
            () => document.dispatchEvent(new CustomEvent('webbook:pageplacing')),
            () => window.dispatchEvent(new Event('pagehide')),
            () => hidePhraseNotes()
        ]) {
            ticks = await beginWait();
            const before = plays;
            cancel();
            assert.ok(ticks.every(source => source.stops === 1));
            t.mock.timers.tick(3000);
            assert.equal(plays, before, 'cancelled waits must not restart narration');
        }

        ticks = await beginWait();
        const select = document.getElementById('webbook-note-references-options');
        select.value = 'button';
        select.dispatchEvent(new Event('change'));
        assert.ok(ticks.every(source => source.stops === 1));
        assert.equal(paused, false);
        assert.equal(toggle.disabled, true);
        assert.equal(toggle.checked, true);
        assert.equal(localStorage.getItem('webbook-note-wait-sound'), 'true');
        select.value = 'follow';
        select.dispatchEvent(new Event('change'));
        assert.equal(toggle.disabled, true);
        select.value = 'pause';
        select.dispatchEvent(new Event('change'));
        assert.equal(toggle.disabled, false);
        assert.equal(toggle.checked, true);
        select.value = 'button';
        select.dispatchEvent(new Event('change'));
        const before = sources.length;
        audio.currentTime = 4.94;
        await handleNarratedPhrase(document.getElementById('phrase'));
        t.mock.timers.tick(3000);
        assert.equal(sources.length, before, 'Keep reading makes no waiting ticks');

        // A final-page note has no following cue or page, but Skip past must still
        // use the note visit's return point and keep narration playing.
        document.getElementById('next').remove();
        const track = document.querySelector('track').track;
        track.cues = [cue, noteCue];
        Object.defineProperty(document.querySelector('track'), 'readyState', { value: 2 });
        await beginWait();
        runAction('go-to-phrase-note');
        const nestedTable = document.createElement('table');
        document.getElementById('note').append(nestedTable);
        assert.equal(canReturnFromNote(nestedTable), false, 'leaving a nested structure is distinct from returning to text');
        nestedTable.remove();
        handleEscapableStructure(document.getElementById('note'), track, 1);
        assert.equal(canActivateCurrentEscape(), true);
        assert.equal(document.getElementById('webbook-escape-btn').hidden, true, 'a reference visit has only Back to text');
        assert.equal(document.getElementById('webbook-back-to-text').hidden, false);
        assert.equal(runAction('skip-past'), true);
        assert.equal(history.state?.webbookNoteReturn, undefined);
        assert.equal(paused, false);
        assert.equal(audio.currentTime, 8);
    } finally {
        hidePhraseNotes();
        t.mock.timers.reset();
        dom.window.close();
    }
});

test('unavailable Web Audio leaves the note wait usable and its stop function safe', async () => {
    const dom = new JSDOM('<main></main>', { url: 'https://books.example/' });
    globalThis.window = dom.window;
    globalThis.document = dom.window.document;
    const { playNoteWaitSound } = await import('../src/js/structure-sounds.js?without-audio');
    assert.doesNotThrow(() => { const stop = playNoteWaitSound(2); stop(); stop(); });
    dom.window.close();
});
