# How the reader works

The reader is the interface every converted book has: the toolbars, panels, narration, search and
settings. It's in [`convert/template/`](../convert/template/), and the converter copies it into each
book's `src/` folder. The [README](../README.md#features) describes what readers can do. This
explains how each feature is built and where its code is.

It's for people working on the reader. Code links go to files, so search the file for the function
name.

## The rules every feature follows

- **WCAG 2.2 AA at least.** Beyond that, we aim for the best reading experience for people who use
  assistive technology every day. Every demo page is checked with axe, except the math book,
  which is spot-checked because it's so large. People also check how it works with screen readers.
- **Every page works without JavaScript**, with the browser's own audio player. The script adds to
  HTML that already works. It never builds the book.
- **The book's markup belongs to the publisher.** The reader adds controls around `main`, never
  inside the text. The exceptions are highlighting, note returns and copy buttons, and the reader
  removes those again.
- **Settings apply to every book on the website**, except the Appearance option (As published or My
  settings), which is per book. Option labels name their values, like "Light" or "Dark", never
  "Normal" or "Default".
- **Every action can have a key**, and every key can be changed. New or changed actions are
  registered with [`reader-actions.js`](../convert/template/src/js/reader-actions.js), so they show up
  in the shortcut editor.
- **Every saved preference is listed** in [`settings-file.js`](../convert/template/src/js/settings-file.js).
  That's the one list export, import and reset use. Storage goes through
  [`stored-settings.js`](../convert/template/src/js/stored-settings.js), which copes when storage is
  blocked.

## How it fits together

### The page

A converted page is plain HTML. It has the book's content in `#webbook-main`, a bar of real links
(Contents, Go to page, About, Previous and Next), the browser's own audio player with the cue track,
and the live regions the reader uses for announcements. The table of contents, page list and About
are separate pages (`toc.html`, `pages.html` and `about.html`). Without script, that's the whole
book, and you can read and move around in it. See [How a book is converted](conversion.md#8-render-and-shape-each-page).

[`index.html`](../convert/template/index.html) is still the template. The converter fills in the
parts listed in [`template-contract.ts`](../convert/src/template-contract.ts), then turns the result
into the plain page.

### Startup

1. **The bootstrap** ([`bootstrap.js`](../convert/template/src/js/bootstrap.js)) is inline in every
   page, and picks which reader to load. That's either the book's own (`src/`), or, for a book
   converted with a UI channel, a release from the channel. A saved offline copy keeps the release
   it was saved with. If a release fails to load or start, it falls back to the book's own reader,
   and then to the plain page. The book's own reader isn't given up on for being slow: if it hasn't
   arrived after 5 seconds, the plain page shows (with its links and audio controls), and the
   reader takes over when it arrives. Only an error makes the plain page stay for the session.
   - Testers can choose with `?webbook-ui=local`, `remote`, `release:<version>` or `auto`. About
     shows any saved override, with a button to go back to automatic updates.
   - New conversions use the channel by default, and the converter says so. `--no-remote-ui` gives a
     fixed copy instead. [`REMOTE_UI.md`](../convert/REMOTE_UI.md) explains the channel and its
     safeguards.
   - The bootstrap is bundled, readable, and frozen into the book, so changing it means converting
     again. Its decisions (selection, manifest, inventory, overrides and failures) are pure functions
     with unit tests, in [`bootstrap-policy.js`](../convert/template/src/js/bootstrap-policy.js).
   - Every remote selection needs inventory hashes, including saved and pinned releases. Without
     them it uses the book's own reader. CSS uses SRI, and script bytes are checked before they're
     imported.
2. **The reader shell** ([`reader-shell.js`](../convert/template/src/js/reader-shell.js)) adds the
   toolbars, panels and settings around the plain page, and fills in the table of contents, page
   list and About from the navigation pages.
3. **`init()`** in [`main.js`](../convert/template/src/js/main.js) starts each feature in order. The
   order matters in two places. Shortcuts start after every action is registered, and in-place
   navigation starts last, so its click handler sees clicks after everything else. Search loads the first
   time it's needed. Media key support loads at the end of `init()`, separately, so a failure there
   doesn't stop the reader. Reader code shouldn't do anything when it's
   imported, only in `init()`, so a release can be loaded and checked before it starts.

### Moving between pages without reloading

When you follow a link to another page of the book,
[`in-place-navigation.js`](../convert/template/src/js/in-place-navigation.js) fetches that page and
swaps its content into this one. The audio element, open panels and the reader's state stay, and the
address and history update as if the page had loaded. Narration carries on across the boundary
([`page-entry.js`](../convert/template/src/js/page-entry.js), [`autoplay.js`](../convert/template/src/js/autoplay.js)).
Safari only lets audio play after a fresh tap or key press, so in that case the reader offers to
continue ([`continue-playing.js`](../convert/template/src/js/continue-playing.js)).

### Panels and toolbars

The table of contents, search, settings, About and the menu are popovers
([`popovers.js`](../convert/template/src/js/popovers.js)). The top and bottom toolbars can hide while
you read ([`toolbar.js`](../convert/template/src/js/toolbar.js)). The settings panel's sections and
their order are in [`settings-sections.js`](../convert/template/src/js/settings-sections.js), so the
layout doesn't depend on which feature starts first.

### Styles

[`style.css`](../convert/template/src/css/style.css) imports all the other stylesheets, and the
converter combines them into one file. Colors and sizes are tokens
([`tokens.css`](../convert/template/src/css/tokens.css)), which the color settings and As published
replace. If the book has publisher CSS, it sits in cascade layers below the reader's settings.

## Features

### Narration

| Part | Code |
|---|---|
| The player. There's one audio element for every page, with play, pause, speed, seeking and the timeline | [`player.js`](../convert/template/src/js/player.js) |
| Finding the phrase each cue names. Cue text is JSON with an id, or a CSS path from the nearest id | [`cue-selector.js`](../convert/template/src/js/cue-selector.js) |
| Highlighting the phrase, keeping it in view, and keeping the address pointed at where you are | [`narration-position.js`](../convert/template/src/js/narration-position.js), [`narration-highlight.css`](../convert/template/src/css/narration-highlight.css) |
| The whole-book timeline, and time left in the chapter and book, from the converter's audio map | [`book-timeline.js`](../convert/template/src/js/book-timeline.js) |
| Previous and next phrase, including across page boundaries | [`page-entry.js`](../convert/template/src/js/page-entry.js) |
| The lock screen and media keys (Media Session) | [`media-session.js`](../convert/template/src/js/media-session.js) |
| Highlight color and style | [`highlight-settings.js`](../convert/template/src/js/highlight-settings.js), with the contrast math in [`color-contrast.js`](../convert/template/src/js/color-contrast.js) |

Cue times come from the converter, built from exact sample counts, so the highlight stays with the
voice even on long pages (see [How a book is converted](conversion.md#7-make-each-pages-narration)).

### Caption mode

Caption mode shows the phrase being read, large and on its own. The arrow keys step through
phrases, even in books without narration.
[`caption-mode.js`](../convert/template/src/js/caption-mode.js),
[`caption-mode.css`](../convert/template/src/css/caption-mode.css).

### Getting around

| Feature | Code |
|---|---|
| The table of contents as the book's nested lists of links, with Find a section, Show levels (a select) and shortcuts for both. Opening it puts focus on the current section | [`toc-tree.js`](../convert/template/src/js/toc-tree.js), [`toc.css`](../convert/template/src/css/toc.css) |
| Go to a print page, and the current print page in the toolbar | [`current-print-page.js`](../convert/template/src/js/current-print-page.js) |
| Search across the book in any language. It loads the first time you search, splits words with `Intl.Segmenter`, and folds text with NFKC and the locale's case rules. Accents still count, except for a few language rules (like Arabic vowel marks) | [`search.js`](../convert/template/src/js/search.js), [`search-text.js`](../convert/template/src/js/search-text.js), [`search-ranking.js`](../convert/template/src/js/search-ranking.js), [`search-anchor.js`](../convert/template/src/js/search-anchor.js) |
| Where am I? tells you, when you ask, what structure you're in and which heading it's under | [`where-am-i.js`](../convert/template/src/js/where-am-i.js), [`structure-context.js`](../convert/template/src/js/structure-context.js) |
| The skip link goes to the phrase being read, or where you are, not to the top | [`skip-link.js`](../convert/template/src/js/skip-link.js) |
| Vertical writing and page direction, meaning which way the text is read, and scrolling and paging along it | [`reading-axis.js`](../convert/template/src/js/reading-axis.js), [`writing-mode.js`](../convert/template/src/js/writing-mode.js), [`writing-modes.css`](../convert/template/src/css/writing-modes.css) |

### Your place

| Feature | Code |
|---|---|
| Reopening a book goes back to the page and narration time you were at | [`resume-position.js`](../convert/template/src/js/resume-position.js) |
| The address always points to where you are, so browser bookmarks work. Copy link to this place copies it | [`browser-bookmarks.js`](../convert/template/src/js/browser-bookmarks.js), [`narration-position.js`](../convert/template/src/js/narration-position.js) |

Positions are saved under the book ID, which is the EPUB's unique identifier, so they're kept when
the book is converted again. A position only still works if its page and anchor are still there,
though. Converting with different options can change page names.

### Notes

Following a note reference shows the note, and Back to text takes you back exactly. During
narration, notes are read, skipped or paused at, depending on your settings.
[`notes-in-place.js`](../convert/template/src/js/notes-in-place.js),
[`notes-in-place.css`](../convert/template/src/css/notes-in-place.css).

### Leaving and skipping structures

| Feature | Code |
|---|---|
| Leave the current table, list, figure, equation, sidebar or note with one key (escapability) | [`escapability.js`](../convert/template/src/js/escapability.js) |
| Leave page numbers, notes or sidebars out of narration (skippability) | [`skippability.js`](../convert/template/src/js/skippability.js) |
| Structure sounds, which play tones at headings, notes, lists and tables, just before the phrase | [`structure-sounds.js`](../convert/template/src/js/structure-sounds.js) |

These work from the converter's `epubtype_*` classes and DPUB-ARIA roles.

### Settings

| Setting | Code |
|---|---|
| The settings panel, and Find a setting | [`settings.js`](../convert/template/src/js/settings.js), [`settings-filter.js`](../convert/template/src/js/settings-filter.js), [`settings-sections.js`](../convert/template/src/js/settings-sections.js) |
| Colors. Automatic, light, dark, reviewed pairs, or your own colors with readable text worked out for you | [`page-colors.js`](../convert/template/src/js/page-colors.js), [`color-contrast.js`](../convert/template/src/js/color-contrast.js) |
| Font, size, line, letter and word spacing, and line length | [`text-spacing.js`](../convert/template/src/js/text-spacing.js), [`settings.js`](../convert/template/src/js/settings.js) |
| As published or My settings, per book. In As published, the toolbars use the book's colors | [`appearance.js`](../convert/template/src/js/appearance.js), [`appearance-state.js`](../convert/template/src/js/appearance-state.js), [`published-colors.js`](../convert/template/src/js/published-colors.js) |
| Keyboard shortcuts, and the shortcut editor (which loads the first time it's used) | [`keyboard-shortcuts.js`](../convert/template/src/js/keyboard-shortcuts.js), [`keyboard-shortcut-settings.js`](../convert/template/src/js/keyboard-shortcut-settings.js), [`reader-actions.js`](../convert/template/src/js/reader-actions.js) |
| Exporting, importing and resetting settings | [`settings-file.js`](../convert/template/src/js/settings-file.js), [`settings-transfer.js`](../convert/template/src/js/settings-transfer.js) |

The default shortcuts avoid keys that screen readers use.

### Content

| Feature | Code |
|---|---|
| Copying equations (as MathML, or LaTeX converted in the reader) and code | [`copy-content.js`](../convert/template/src/js/copy-content.js), [`copy-math.js`](../convert/template/src/js/copy-math.js) |
| Equation numbers go beside short equations and below long ones | [`responsive-equations.js`](../convert/template/src/js/responsive-equations.js) |
| Wide tables scroll sideways, and the wrapper is only in the tab order when it actually scrolls | [`responsive-tables.js`](../convert/template/src/js/responsive-tables.js) |

### About

About shows the book's metadata, cover and your progress, and the publisher's accessibility claims
in plain language. The converter writes these (see
[How a book is converted](conversion.md#4-prepare-the-shared-parts)), and
[`info-panel.css`](../convert/template/src/css/info-panel.css) styles them.

### Offline reading

You can save a book from About and read it with no connection, narration included. Saved books
are managed on the Offline books page. The details are in the
[v0 contract](../convert/contracts/v0.md#offline-reading-optional-reader-enhancement).

| Part | Code |
|---|---|
| About's controls to find the size, save, cancel, check for updates, use an update, and remove | [`offline.js`](../convert/template/src/js/offline.js) |
| Finding every file the book needs, from its pages and the reader's inventory | [`offline-discovery.js`](../convert/template/src/js/offline-discovery.js), [`offline-resources.js`](../convert/template/src/js/offline-resources.js) |
| The service worker. The fixed `sw.js` stub loads it. It serves the saved copy, including byte ranges for audio, and keeps each book's state separately | [`offline-worker.js`](../convert/template/src/js/offline-worker.js), [`offline-worker-core.js`](../convert/template/src/js/offline-worker-core.js), [`offline-range.js`](../convert/template/src/js/offline-range.js), [`offline-network.js`](../convert/template/src/js/offline-network.js) |
| Long downloads run in a worker owned by the page, not in a service-worker event | [`offline-download-worker.js`](../convert/template/src/js/offline-download-worker.js) |
| Checking whether the book's server can be reached (the Offline indicator) | [`offline-connectivity.js`](../convert/template/src/js/offline-connectivity.js) |
| The Offline books page | [`offline-books.html`](../convert/template/src/offline-books.html), [`offline-books.js`](../convert/template/src/js/offline-books.js) |

A saved book with a UI channel keeps the reader release it was saved with. The bootstrap asks the
worker (`saved-ui`) before it asks the channel. The saved copy's checked file hashes give it
integrity without fetching an inventory while offline. The service and download workers always
use the book's own copy, because classic worker imports can't check integrity before running. The
page's reader can still update from the channel.

### AI assistants (experimental)

An assistant in the browser can move around the book, control narration and settings, and search
and read it, using WebMCP where the browser supports it. It's on by default there, and you can turn
it off in Settings, under All settings.
[`agent-tools.js`](../convert/template/src/js/agent-tools.js).

## Changing the reader

- To run the reader tests, use `cd convert && node --test template/test/*.test.mjs`.
- If you add a saved preference, add it to its module and to `settings-file.js`.
- If you add an action, register it with `reader-actions.js`. Only give it a default key if that key
  doesn't clash with screen reader commands.
- If you change what the converter fills in, update `template-contract.ts` and the
  [v0 contract](../convert/contracts/v0.md).
- Check light and dark, 320 px wide and 200% zoom, keyboard only, and axe. Then regenerate the demos
  with `./refresh-demos.sh` to see the change in real books.
