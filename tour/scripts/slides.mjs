// What each clip of the feature tour shows. `url` is relative to the repository root; `setup` runs
// before recording starts, and `act` is what's recorded. Keep each `act` to a few seconds.

export const slides = {
    'follow-along': {
        sound: true,
        // The heading, then "Call me Ishmael.", then the next sentence
        url: 'demos/moby-dick/chapter_001.html',
        // Starts 3 s in, near the end of the heading
        async setup({ page }) {
            await page.click('#webbook-audio-playpause');
            await page.waitForTimeout(3000);
        },
        async act({ wait }) {
            await wait(5000);
        }
    },
    'caption-mode': {
        sound: true,
        // Caption mode shows the phrase on its own, without a highlight
        narrationCaption: '[narration reading the phrase on screen]',
        device: 'phone',
        url: 'demos/moby-dick/chapter_001.html',
        // From the start, so the heading is read in full before "Call me Ishmael."
        async setup({ page }) {
            await page.evaluate(() => document.getElementById('webbook-caption-mode-toggle').click());
        },
        async act({ click, wait }) {
            await click('#webbook-audio-playpause');
            await wait(5000);
        }
    },
    contents: {
        // All by keyboard, each key captioned: focus starts on the current section, the level
        // shortcuts, then Find a section
        url: 'demos/valentin-hauy/valentinhauy11-3.html',
        async act({ key, typeCaptioned, wait }) {
            await wait(600);
            await key('Alt+Shift+KeyC', '[Alt+Shift+C opens the table of contents, with focus on the current section]', { after: 1600 });
            await key('Tab', '[Tab to the next section]', { after: 1200 });
            await key('Alt+Shift+Digit2', '[Alt+Shift+2 shows 2 levels]', { after: 1600 });
            await key('Alt+Shift+Digit1', '[Alt+Shift+1 shows only the top level]', { after: 1600 });
            await key('Alt+Shift+Digit0', '[Alt+Shift+0 shows all levels]', { after: 1600 });
            await key('Alt+Shift+KeyF', '[Alt+Shift+F goes to Find a section]', { after: 1100 });
            await typeCaptioned('Russia', '[types “Russia”, which narrows the sections]');
            await wait(1300);
            await key('Enter', '[Enter opens the first match, “3.9 Valentin Haüy in Russia”]', { after: 1800 });
        }
    },
    search: {
        url: 'demos/moby-dick/chapter_001.html',
        async act({ click, type, wait, page }) {
            await click('#webbook-top-toolbar button[popovertarget="webbook-search"]');
            await wait(400);
            await type('whale');
            await page.keyboard.press('Enter');
            await wait(1200);
            await click(page.locator('#webbook-search-results a').nth(1));
            await wait(1500);
        }
    },
    'where-am-i': {
        // A results table full of equations: "Equation, in a table. Under '4.2 A hyperbolic problem'."
        url: 'demos/math-optimization-ml/9783111375854_001001-5.html',
        async setup({ page }) {
            await page.locator('main table').nth(2).evaluate(table => table.scrollIntoView({ block: 'center' }));
        },
        async act({ click, wait, page }) {
            await click(page.locator('main table').nth(2).locator('td').nth(2), { clickCount: 3 });
            await wait(400);
            await click('#webbook-where-am-i');
            await wait(2500);
        }
    },
    notes: {
        // Narration reaches a phrase with an endnote in another file; the reader's Note button shows it
        sound: true,
        url: 'demos/notes-test/chapter2.html',
        async setup({ page }) {
            await page.click('#webbook-audio-playpause');
            await page.locator('#webbook-note-phrase-btn').waitFor({ state: 'visible', timeout: 30000 });
        },
        async act({ click, wait }) {
            await wait(900);
            await click('#webbook-note-phrase-btn');
            await wait(2200);
            await click('#webbook-back-to-text');
            await wait(1600);
        }
    },
    leave: {
        sound: true,
        // Narration reads into the List of contents table; Leave table skips the rest of it and
        // carries on with the Preface, on the next page
        url: 'demos/valentin-hauy/valentinhauy11-2.html',
        async act({ click, wait, page }) {
            await click('#webbook-audio-playpause', { pause: 600 });
            await page.locator('#webbook-escape-btn').waitFor({ state: 'visible', timeout: 15000 });
            await wait(2500);
            await click('#webbook-escape-btn');
            await wait(3500);
        }
    },
    'structure-sounds': {
        // The sounds as narration reaches what they're for: the heading "List of contents", then its
        // table. The settings are turned on before recording and not shown (user, 2026-11-19).
        sound: true,
        url: 'demos/valentin-hauy/valentinhauy11-2.html',
        async setup({ page }) {
            await page.evaluate(() => {
                for (const id of ['webbook-sound-headings-toggle', 'webbook-sound-notes-toggle', 'webbook-sound-lists-tables-toggle']) {
                    const toggle = document.getElementById(id);
                    if (!toggle.checked) toggle.click();
                }
                const skip = document.getElementById('webbook-skip-footnote-toggle');
                if (skip.checked) skip.click();
            });
            // Past the settings' own sample sounds
            await page.waitForTimeout(1500);
        },
        async act({ click, wait, page }) {
            await click('#webbook-audio-playpause', { pause: 600 });
            await wait(7000);
        }
    },
    'colors-and-text': {
        // Slowly, closing Settings twice to show the page: colors first, then text
        device: 'phone',
        url: 'demos/valentin-hauy/valentinhauy11-3.html',
        async act({ click, choose, wait, page }) {
            const open = () => click('button[popovertarget="webbook-settings"]');
            const close = () => click('#webbook-settings button[aria-label="Close settings"]');
            await wait(800);
            await open();
            await wait(900);
            await choose('#webbook-colors-options', 'cream');
            await wait(1400);
            await close();
            await wait(2000);
            await open();
            await wait(700);
            await click(page.locator('#webbook-settings a', { hasText: 'Text' }).first());
            await wait(900);
            await choose('#webbook-font-family-options', 'serif');
            await wait(1100);
            await click('#webbook-font-size-range', { pause: 600 });
            for (let i = 0; i < 4; i++) { await page.keyboard.press('ArrowRight'); await wait(300); }
            await wait(800);
            await choose('#webbook-line-height-options', '2');
            await wait(1100);
            await choose('#webbook-letter-spacing-options', 'wider');
            await wait(1100);
            await choose('#webbook-word-spacing-options', 'wider');
            await wait(1100);
            await close();
            await wait(2500);
        }
    },
    'as-published': {
        // Switches to the publisher's design, then closes Settings to show the text in it
        url: 'demos/moby-dick/chapter_001.html',
        async act({ click, wait }) {
            await wait(600);
            await click('button[popovertarget="webbook-settings"]');
            await wait(800);
            await click('label[for="webbook-appearance-published"]');
            await wait(1800);
            await click('#webbook-settings button[aria-label="Close settings"]');
            await wait(2800);
        }
    },
    'vertical-writing': {
        sound: true,
        narrationCaption: '[Japanese narration reading the highlighted text]',
        url: 'demos/kusamakura/一.html',
        // Two phrases in vertical columns, then the switch to horizontal
        async act({ click, choose, wait, page }) {
            await click('#webbook-audio-playpause', { pause: 600 });
            await page.waitForFunction(() => {
                const audio = document.querySelector('audio');
                const cues = [...(audio?.querySelector('track')?.track?.cues ?? [])];
                return cues.length > 2 && audio.currentTime >= cues[1].endTime - 0.3;
            }, null, { timeout: 30000 });
            await click('button[popovertarget="webbook-settings"]');
            await wait(1200);
            await choose('#webbook-writing-mode', 'horizontal', { pause: 1400 });
            await wait(1800);
            await click('#webbook-settings button[aria-label="Close settings"]');
            await wait(3500);
        }
    },
    offline: {
        device: 'phone',
        url: 'demos/valentin-hauy/valentinhauy11-3.html',
        async act({ click, wait, page }) {
            await click('button[popovertarget="webbook-info"]');
            await wait(900);
            await click('#webbook-offline-save');
            await page.waitForFunction(() => /Saved for offline reading,/.test(document.getElementById('webbook-info')?.textContent ?? ''), null, { timeout: 60000 });
            await wait(1000);
            await page.context().setOffline(true);
            await click('#webbook-info button[aria-label="Close about"]');
            await wait(400);
            await click('#webbook-next-document');
            await wait(1800);
        }
    },
    // The converter's own slides (tour/converter.html)
    'convert-choose': {
        url: 'converter/',
        async act({ wait, page, point }) {
            await wait(600);
            await point('#book');
            await page.setInputFiles('#book', new URL('../../source-epubs/packaged/valentin-hauy.epub', import.meta.url).pathname);
            await wait(1200);
            await page.locator('section[aria-labelledby="choose-heading"]').evaluate(s => s.scrollIntoView({ block: 'start', behavior: 'smooth' }));
            await wait(2600);
        }
    },
    'convert-options': {
        url: 'converter/',
        async setup({ page }) {
            await page.setInputFiles('#book', new URL('../../source-epubs/packaged/valentin-hauy.epub', import.meta.url).pathname);
            await page.waitForTimeout(1500);
        },
        async act({ wait, page, point }) {
            await page.locator('#options-heading').evaluate(h => h.scrollIntoView({ block: 'start', behavior: 'smooth' }));
            await wait(1500);
            for (const legend of ['Reader updates', 'Narration', 'Extra enhancements', 'Appearance and pages']) {
                const item = page.locator('section[aria-labelledby="options-heading"] legend', { hasText: legend }).first();
                await item.evaluate(l => l.scrollIntoView({ block: 'start', behavior: 'smooth' }));
                await wait(700);
                await point(item, { pause: 1600 });
            }
            await wait(800);
        }
    },
    'convert-preview': {
        url: 'converter/',
        async setup({ page }) {
            await page.setInputFiles('#book', new URL('../../source-epubs/packaged/valentin-hauy.epub', import.meta.url).pathname);
            await page.waitForTimeout(1500);
            await page.locator('#confirm-valid').check();
            await page.locator('#preview-heading').evaluate(h => h.scrollIntoView({ block: 'start' }));
        },
        async act({ click, wait, page }) {
            await wait(700);
            await click('#preview-button');
            await page.locator('#preview-frame[src]').waitFor({ timeout: 180000 });
            await page.frameLocator('#preview-frame').locator('h1').first().waitFor({ timeout: 60000 });
            await page.locator('#preview-frame').evaluate(f => f.scrollIntoView({ block: 'center', behavior: 'smooth' }));
            await wait(1500);
            await click(page.frameLocator('#preview-frame').locator('#webbook-audio-playpause'));
            await wait(5000);
        }
    },
    'convert-whole': {
        // A short narrated book, so the whole conversion fits in a clip
        url: 'converter/',
        async setup({ page }) {
            await page.setInputFiles('#book', new URL('../../source-epubs/packaged/notes-test.epub', import.meta.url).pathname);
            await page.waitForTimeout(1500);
            await page.locator('#confirm-valid').check();
            await page.locator('#convert-heading').evaluate(h => h.scrollIntoView({ block: 'start' }));
        },
        async act({ click, wait, page }) {
            await wait(700);
            await click('#convert');
            await page.locator('#result').waitFor({ state: 'visible', timeout: 300000 });
            await page.locator('#result').evaluate(r => r.scrollIntoView({ block: 'start', behavior: 'smooth' }));
            await wait(1500);
            await click('#download');
            await wait(2000);
        }
    }
};
