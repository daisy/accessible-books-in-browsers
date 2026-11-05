import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createAudioMap, cueOffsetForFragment } from '../build/audio-map.js';

test('maps pages and top-level chapters onto cumulative book audio time', () => {
    const site = {
        pages: [
            { outputFilename: 'index.html', title: 'Front' },
            { outputFilename: 'one.html', title: 'One' },
            { outputFilename: 'two.html', title: 'Two' }
        ],
        toc: [
            { title: 'One', href: 'one.html#chapter', children: [] },
            { title: 'Two', href: 'two.html', children: [] }
        ]
    };
    const sources = new Map([
        ['index.html', { audio: null, bodyHtml: '<h1>Front</h1>' }],
        ['one.html', { audio: { duration: 20, cues: [{ id: 'before', start: 0 }, { id: 'inside', start: 4 }] },
            bodyHtml: '<p id="before">Before</p><section id="chapter"><p id="inside">Inside</p></section>' }],
        ['two.html', { audio: { duration: 10, cues: [{ id: 'two', start: 0 }] }, bodyHtml: '<h1 id="two">Two</h1>' }]
    ]);

    const result = createAudioMap(site, sources);
    assert.equal(result.duration, 30);
    assert.deepEqual(result.pages.map(({ href, start, duration }) => ({ href, start, duration })), [
        { href: 'index.html', start: 0, duration: 0 },
        { href: 'one.html', start: 0, duration: 20 },
        { href: 'two.html', start: 20, duration: 10 }
    ]);
    assert.deepEqual(result.chapters, [
        { title: 'One', href: 'one.html#chapter', time: 4 },
        { title: 'Two', href: 'two.html', time: 20 }
    ]);
});

test('finds the first cue at, inside, or after a fragment target', () => {
    const html = '<p id="before">Before</p><section id="chapter"><h2>Chapter</h2><p id="inside">Text</p></section><p id="after">After</p>';
    const cues = [{ id: 'before', start: 0 }, { id: 'inside', start: 3 }, { id: 'after', start: 8 }];
    assert.equal(cueOffsetForFragment(html, 'chapter', cues), 3);
    assert.equal(cueOffsetForFragment(html, 'after', cues), 8);
    assert.equal(cueOffsetForFragment(html, 'missing', cues), 0);
});

test('does not create a map without narration, and gives chapters without narration no place', () => {
    const silent = { pages: [{ outputFilename: 'index.html', title: 'Book' }], toc: [] };
    assert.equal(createAudioMap(silent, new Map([['index.html', { audio: null, bodyHtml: '' }]])), null);

    const site = {
        pages: [
            { outputFilename: 'index.html', title: 'Book' },
            { outputFilename: 'one.html', title: 'One' },
            { outputFilename: 'end.html', title: 'End' }
        ],
        toc: [
            { title: 'Book', href: 'index.html', children: [] },
            { title: 'One', href: 'one.html', children: [] },
            { title: 'Silent end', href: 'end.html', children: [] }
        ]
    };
    const sources = new Map([
        ['index.html', { audio: null, bodyHtml: '<h1>Book</h1>' }],
        ['one.html', { audio: { duration: 5, cues: [{ id: 'one', start: 0 }] }, bodyHtml: '<h1 id="one">One</h1>' }],
        ['end.html', { audio: null, bodyHtml: '<h1>End</h1>' }]
    ]);
    assert.deepEqual(createAudioMap(site, sources).chapters.map(chapter => chapter.title), ['One']);
});

test('uses the level below when the top level holds fewer than two narrated chapters', () => {
    const site = {
        pages: [
            { outputFilename: 'index.html', title: 'Cover' },
            { outputFilename: 'one.html', title: 'One' },
            { outputFilename: 'two.html', title: 'Two' }
        ],
        toc: [
            { title: 'Report', href: 'one.html#report', children: [
                { title: 'One', href: 'one.html', children: [] },
                { title: 'Two', href: 'two.html', children: [] }
            ] }
        ]
    };
    const sources = new Map([
        ['index.html', { audio: null, bodyHtml: '<h1>Cover</h1>' }],
        ['one.html', { audio: { duration: 5, cues: [{ id: 'one', start: 0 }] }, bodyHtml: '<h1 id="one">One</h1>' }],
        ['two.html', { audio: { duration: 5, cues: [{ id: 'two', start: 0 }] }, bodyHtml: '<h1 id="two">Two</h1>' }]
    ]);
    assert.deepEqual(createAudioMap(site, sources).chapters.map(chapter => chapter.title), ['One', 'Two']);
});
