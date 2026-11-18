# How the reader works

The reader is the interface every converted book shares: toolbars, panels, narration, search,
settings. It lives in [`convert/template/`](../convert/template/), and the converter copies it into
each book's `src/` folder. What readers can do is described in the [README](../README.md#reading-features);
this explains how each feature is built and where its code is.

Written for people working on the reader. Code links are to files; search a file for the function
named.

## The rules every feature follows

- **WCAG 2.2 AA at least**, and judged against the higher bar of the best reading experience for
  people who use assistive technology daily. Every demo page is checked with axe; screen reader
  behaviour is checked by people.
- **Every page reads without JavaScript,** with the browser's own audio player. The script adds to
  working HTML; it never builds the book.
- **The book's markup is the publisher's.** The reader adds controls around `main`, never inside
  the text, except highlighting, note returns and copy buttons, which it removes again.
- **Settings apply to every book on the website**, except the per-book Appearance option (As
  published or My settings). Option labels name their values ("Light", "Dark"), never "Normal" or
  "Default".
- **Every action can have a key,** and every key can be changed. A new or changed action is
  registered with [`reader-actions.js`](../convert/template/src/js/reader-actions.js) so it appears in
  the shortcut editor.
- **Every saved preference is listed** in [`settings-file.js`](../convert/template/src/js/settings-file.js),
  the single list that export, import and reset use. Storage goes through
  [`stored-settings.js`](../convert/template/src/js/stored-settings.js), which survives blocked
  storage.

## How it fits together

### The page

A converted page is plain HTML: the book's content in `#webbook-main`, a bar of real links
(Contents, Go to page, About, Previous, Next), the browser's own audio player with the cue track,
and the live regions the reader announces through. The table of contents, the page list and About
are pages of their own (`toc.html`, `pages.html`, `about.html`). Without script, that is the whole
book, readable and navigable. See [How a book is converted](conversion.md#8-render-and-shape-each-page).

[`index.html`](../convert/template/index.html) is still the template: the converter fills in the
parts listed in [`template-contract.ts`](../convert/src/template-contract.ts), then shapes the result
into the plain page.

### Startup

1. **The bootstrap** ([`bootstrap.js`](../convert/template/src/js/bootstrap.js)), inline in every page,
   picks which reader to load: the book's own (`src/`), or, for a book converted with a UI channel,
   a release from the channel. A saved offline copy keeps the release it was saved with. If a
   release fails to load or start, it falls back to the book's own reader, and then to the plain
   page. Testers can choose with `?webbook-ui=local`, `remote`, `release:<version>` or `auto`.
   The channel and its safeguards are explained in [`REMOTE_UI.md`](../convert/REMOTE_UI.md).
   New conversions default to the channel, announced by the converter; `--no-remote-ui` chooses
   a fixed copy. About shows saved overrides and offers Return to automatic updates.
   The bootstrap is bundled, readable and frozen into the book: changing it means converting again.
   Its pure selection, manifest, inventory, override and failure decisions are unit-tested in
   [`bootstrap-policy.js`](../convert/template/src/js/bootstrap-policy.js). Every remote selection
   needs inventory hashes, including saved and pinned releases. Missing hashes use local fallback;
   CSS uses SRI and script bytes are verified before import.
2. **The reader shell** ([`reader-shell.js`](../convert/template/src/js/reader-shell.js)) adds the
   reader's toolbars, panels and settings around the plain page, and fills the table of contents,
   page list and About from the navigation pages.
3. **`init()`** in [`main.js`](../convert/template/src/js/main.js) starts each feature in order. The
   order matters in two places: shortcuts start after every action is registered, and in-place
   navigation starts last, so its click handler sees clicks after the others. Search and the
   media-key support load only when first needed. Reader code must do nothing when imported, only
   in `init()`, so a release can be loaded and checked before it starts.

### Moving between pages without reloading

[`in-place-navigation.js`](../convert/template/src/js/in-place-navigation.js): following a link to
another page of the book fetches that page and swaps its content into this one, keeping the audio
element, the open panels and the reader's state; the address and history update as if the page
had loaded. Narration continues across the boundary
([`page-entry.js`](../convert/template/src/js/page-entry.js), [`autoplay.js`](../convert/template/src/js/autoplay.js)),
and Safari's rule that audio needs a fresh gesture is handled by offering to continue
([`continue-playing.js`](../convert/template/src/js/continue-playing.js)).

### Panels and toolbars

Panels are popovers ([`popovers.js`](../convert/template/src/js/popovers.js)): the table of contents,
search, settings, About and the menu. The top and bottom toolbars can hide while reading
([`toolbar.js`](../convert/template/src/js/toolbar.js)). The settings panel's sections and order are in
[`settings-sections.js`](../convert/template/src/js/settings-sections.js), so startup order never
decides layout.

### Styles

[`style.css`](../convert/template/src/css/style.css) imports the rest; the converter combines them
into one file. Colours and sizes are tokens ([`tokens.css`](../convert/template/src/css/tokens.css)),
which the colour settings and As published replace. The book's publisher CSS, when present, sits in
cascade layers below the reader's settings.

## Features

### Narration

| Part | Code |
|---|---|
| The player: one audio element for every page; play, pause, speed, seeking, the timeline | [`player.js`](../convert/template/src/js/player.js) |
| Finding the phrase each cue names: cue text is JSON with an id, or a CSS path from the nearest id | [`cue-selector.js`](../convert/template/src/js/cue-selector.js) |
| Highlighting the phrase, keeping it in view, and keeping the address at the reading position | [`narration-position.js`](../convert/template/src/js/narration-position.js), [`narration-highlight.css`](../convert/template/src/css/narration-highlight.css) |
| The whole-book timeline, time left in chapter and book, from the converter's audio map | [`book-timeline.js`](../convert/template/src/js/book-timeline.js) |
| Previous and next phrase, and stepping across a page boundary | [`page-entry.js`](../convert/template/src/js/page-entry.js) |
| Lock screen and media keys (Media Session) | [`media-session.js`](../convert/template/src/js/media-session.js) |
| Highlight colour and style | [`highlight-settings.js`](../convert/template/src/js/highlight-settings.js), contrast maths in [`color-contrast.js`](../convert/template/src/js/color-contrast.js) |

Cue times come from the converter, built from exact sample counts, so the highlight stays with the
voice over long pages (see [How a book is converted](conversion.md#7-make-each-pages-narration)).

### Caption mode

The phrase being read, large and alone on screen; arrow keys step through phrases, also in books
without narration. [`caption-mode.js`](../convert/template/src/js/caption-mode.js),
[`caption-mode.css`](../convert/template/src/css/caption-mode.css).

### Getting around

| Feature | Code |
|---|---|
| Table of contents as a tree, with a filter and a depth setting | [`toc-tree.js`](../convert/template/src/js/toc-tree.js), [`toc.css`](../convert/template/src/css/toc.css) |
| Go to print page, and the current print page in the toolbar | [`current-print-page.js`](../convert/template/src/js/current-print-page.js) |
| Search across the book, in any language: loaded on first use, words split with `Intl.Segmenter`, text folded with NFKC and the locale's case rules; accents stay significant except for a few language rules (such as Arabic vowel marks) | [`search.js`](../convert/template/src/js/search.js), [`search-text.js`](../convert/template/src/js/search-text.js), [`search-ranking.js`](../convert/template/src/js/search-ranking.js), [`search-anchor.js`](../convert/template/src/js/search-anchor.js) |
| Where am I?: the structure the reading position is in, and the heading it's under, on request | [`where-am-i.js`](../convert/template/src/js/where-am-i.js), [`structure-context.js`](../convert/template/src/js/structure-context.js) |
| Skip link: to the phrase being read, or the reading position, not the top | [`skip-link.js`](../convert/template/src/js/skip-link.js) |
| Vertical writing and page direction: which way the text is read, scrolling and paging along it | [`reading-axis.js`](../convert/template/src/js/reading-axis.js), [`writing-mode.js`](../convert/template/src/js/writing-mode.js), [`writing-modes.css`](../convert/template/src/css/writing-modes.css) |

### Your place

| Feature | Code |
|---|---|
| Resume: reopening a book returns to the page and narration time | [`resume-position.js`](../convert/template/src/js/resume-position.js) |
| Bookmarks: the address always points at the reading position, so browser bookmarks work; Copy link to this place | [`browser-bookmarks.js`](../convert/template/src/js/browser-bookmarks.js), [`narration-position.js`](../convert/template/src/js/narration-position.js) |

Positions are kept per book ID, the EPUB's unique identifier, so a reconverted book keeps them.

### Notes

Following a note reference shows the note; Back to text returns exactly. During narration, notes
are read, skipped or paused at, as set. [`notes-in-place.js`](../convert/template/src/js/notes-in-place.js),
[`notes-in-place.css`](../convert/template/src/css/notes-in-place.css).

### Leaving and skipping structures

| Feature | Code |
|---|---|
| Leave the current table, list, figure, equation, sidebar or note with one key (escapability) | [`escapability.js`](../convert/template/src/js/escapability.js) |
| Exclude page numbers, notes or sidebars from narration (skippability) | [`skippability.js`](../convert/template/src/js/skippability.js) |
| Structure sounds: tones at headings, notes, lists and tables, just before the phrase | [`structure-sounds.js`](../convert/template/src/js/structure-sounds.js) |

Both work from the converter's `epubtype_*` classes and DPUB-ARIA roles.

### Making it yours

| Setting | Code |
|---|---|
| The settings panel, and Find a setting | [`settings.js`](../convert/template/src/js/settings.js), [`settings-filter.js`](../convert/template/src/js/settings-filter.js), [`settings-sections.js`](../convert/template/src/js/settings-sections.js) |
| Colours: automatic, light, dark, reviewed pairs, or your own with readable text worked out | [`page-colors.js`](../convert/template/src/js/page-colors.js), [`color-contrast.js`](../convert/template/src/js/color-contrast.js) |
| Font, size, line, letter and word spacing, line length | [`text-spacing.js`](../convert/template/src/js/text-spacing.js), [`settings.js`](../convert/template/src/js/settings.js) |
| As published or My settings, per book; with As published, the toolbars take the book's colours | [`appearance.js`](../convert/template/src/js/appearance.js), [`appearance-state.js`](../convert/template/src/js/appearance-state.js), [`published-colors.js`](../convert/template/src/js/published-colors.js) |
| Keyboard shortcuts, and the editor (loaded on first use) | [`keyboard-shortcuts.js`](../convert/template/src/js/keyboard-shortcuts.js), [`keyboard-shortcut-settings.js`](../convert/template/src/js/keyboard-shortcut-settings.js), [`reader-actions.js`](../convert/template/src/js/reader-actions.js) |
| Export, import and reset settings | [`settings-file.js`](../convert/template/src/js/settings-file.js), [`settings-transfer.js`](../convert/template/src/js/settings-transfer.js) |

Shortcut defaults avoid keys that screen readers use.

### Content

| Feature | Code |
|---|---|
| Copy equations (MathML, or LaTeX converted in the reader) and code | [`copy-content.js`](../convert/template/src/js/copy-content.js), [`copy-math.js`](../convert/template/src/js/copy-math.js) |
| Equation numbers beside short expressions, below long ones | [`responsive-equations.js`](../convert/template/src/js/responsive-equations.js) |
| Wide tables scroll sideways; the wrapper is in the tab order only when it actually scrolls | [`responsive-tables.js`](../convert/template/src/js/responsive-tables.js) |

### About

The book's metadata, cover and progress, and the publisher's accessibility claims in plain language
(written by the converter, see [How a book is converted](conversion.md#4-prepare-the-shared-parts)).
[`info-panel.css`](../convert/template/src/css/info-panel.css); the content is filled in by the
converter.

### Offline reading

Save a book from About and read it, narration included, with no connection; manage saved books
on the Offline books page. Contract details are in the
[v0 contract](../convert/contracts/v0.md#offline-reading-optional-reader-enhancement).

| Part | Code |
|---|---|
| The About panel's controls: find size, save, cancel, check for updates, use an update, remove | [`offline.js`](../convert/template/src/js/offline.js) |
| Finding every file the book needs, from its pages and the reader's inventory | [`offline-discovery.js`](../convert/template/src/js/offline-discovery.js), [`offline-resources.js`](../convert/template/src/js/offline-resources.js) |
| The service worker: the fixed `sw.js` stub loads it; it serves the saved snapshot, byte ranges for audio, and keeps a book's state per root | [`offline-worker.js`](../convert/template/src/js/offline-worker.js), [`offline-worker-core.js`](../convert/template/src/js/offline-worker-core.js), [`offline-range.js`](../convert/template/src/js/offline-range.js), [`offline-network.js`](../convert/template/src/js/offline-network.js) |
| Long downloads in a page-owned worker, not a service-worker event | [`offline-download-worker.js`](../convert/template/src/js/offline-download-worker.js) |
| Whether the book's server is reachable (the Offline indicator) | [`offline-connectivity.js`](../convert/template/src/js/offline-connectivity.js) |
| The Offline books page | [`offline-books.html`](../convert/template/src/offline-books.html), [`offline-books.js`](../convert/template/src/js/offline-books.js) |

A saved book with a UI channel keeps the reader release it was saved with: the bootstrap asks the
worker (`saved-ui`) before the channel. Its stored verified file hashes supply integrity without
fetching an inventory while offline. Service and download workers remain bundled locally because
classic worker imports cannot enforce pre-execution integrity; remote page UI still updates.

### AI assistants (experimental)

An assistant in the browser can navigate, control narration and settings, and search and read the
book, through WebMCP, where the browser supports it. On by default there; **Settings → All settings** turns it off.
[`agent-tools.js`](../convert/template/src/js/agent-tools.js).

## Changing the reader

- Run the reader tests: `cd convert && node --test template/test/*.test.mjs`.
- A new saved preference: add it to its module and to `settings-file.js`.
- A new action: register it with `reader-actions.js`; give it a default key only if it avoids screen
  reader commands.
- A change to what the converter fills in: update `template-contract.ts` and the
  [v0 contract](../convert/contracts/v0.md).
- Check light and dark, 320 px and 200% zoom, keyboard only, and axe, then regenerate the demos with
  `./refresh-demos.sh` to see it in real books.
