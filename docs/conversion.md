# How a book is converted

How the converter (`convert/`) turns an EPUB into a web book, step by step. Each step links to the
code that does it and gives the decisions behind it. For what the output contains, see the
[v0 contract](../convert/contracts/v0.md); for the report each conversion writes, see
[The conversion report and log](conversion-report.md).

Written for people working on the converter. Line links point at the code as of 2026-11-17; if a
line has moved, search the file for the function named.

## The rules every step follows

These decisions shape everything below. When a change seems to need breaking one, ask first.

- **Only valid EPUBs.** The converter builds on books that already pass EPUBCheck and Ace. It
  doesn't rescue inaccessible or broken books: it converts what it's given and reports problems.
  Small mechanical fixes are fine (an empty paragraph, a missing table header scope); guessing at
  structure is not.
- **Never add or remove the book's words.** Every change is to markup, never to text.
- **Rules are generic.** Each fix is a rule about a markup pattern, never about a publisher or a
  particular book.
- **Keep the book's writing direction.** Vertical writing modes and right-to-left direction always
  survive conversion (test book: `demos/kusamakura`).
- **The book ID is the EPUB's unique identifier** (or `--identifier`), and keys every reader's saved
  positions and bookmarks. It's the source EPUB's ID, never presented as the web book's own.
- **Parse once, write once.** The EPUB is read into one in-memory model; each page is transformed
  and rendered once; everything is written to a staging folder that replaces the output only when
  the whole conversion succeeds.
- **The authoring template supplies the reader shell.** `index.html` is filled as an intermediate
  document; `book-shape.ts` writes plain content and separate navigation pages. `copyUiAssets`
  extracts the runtime shell. Source-template hooks remain listed in [`template-contract.ts`](../convert/src/template-contract.ts).
- **Every page reads without JavaScript.** Each content page is plain HTML with real links and the
  browser's own audio player; the reader's controls are added by script (step 8).
- **Keep the source EPUB.** There is no book upgrader: a new contract means converting again from
  the EPUB, so each book records what it was converted from (step 4).

## The steps

The order is set by [`convert()`](../convert/src/convert.ts#L44), which only calls the steps
below.

### 1. Stage the output

[`createOutputStaging`](../convert/src/output.ts#L22) makes a temporary folder; everything is
written there. [`finalizeOutput`](../convert/src/output.ts#L40) moves it into place at the end,
and [`discardOutputStaging`](../convert/src/output.ts#L46) deletes it if anything fails, so a failed
conversion never leaves a half-written book. The log (`output.log`) is started here
([`logger/`](../convert/src/logger/)).

### 2. Read the EPUB

[`epubParser.parse`](../convert/src/epubParser/index.ts#L16) unzips the EPUB if it's a file
([`unzip-epub.ts`](../convert/src/epubParser/unzip-epub.ts#L6); a damaged archive is repaired and
unzipped once more), finds the package through `META-INF/container.xml`, and reads:

- the package document: metadata, manifest, spine, page progression direction and cover
  ([`package-document.ts`](../convert/src/epubParser/package-document.ts#L24));
- the navigation document: table of contents, page list and landmarks
  ([`nav-document.ts`](../convert/src/epubParser/nav-document.ts#L16)).

Spine items marked `linear="no"` are left out unless `--include-non-linear` is given
([`parseSpine`](../convert/src/epubParser/package-document.ts#L89)).

### 3. Build the site model

[`buildSiteModel`](../convert/src/model.ts#L85) turns the parsed EPUB into the plan for the web
book, without writing anything:

- **Pages:** each spine item gets its output file name once (`.html`, the first is `index.html`);
  nothing is renamed on disk.
- **Chapter splitting:** a content document is split into a page per chapter where the table of
  contents points to two or more places inside it
  ([`planDocumentSplit`](../convert/src/chapter-split.ts#L25)). Several top-level entries always mark
  chapters; nested entries count only in long documents (50 KiB or more), so ordinary chapter files
  aren't cut into their subsections. Off with `--no-split-chapters`.
- **Page titles:** when every page's `<title>` is just the book's title, each page is titled by its
  first other heading instead, so tabs and history can be told apart (`--no-heading-titles` turns
  this off).
- **Table of contents** ([`buildToc`](../convert/src/model.ts#L248)) keeps the nav document's real
  nesting; **page list** ([`buildPageList`](../convert/src/model.ts#L236)) gives the print page
  numbers; **metadata** ([`buildMetadata`](../convert/src/model.ts#L224)) the title, authors,
  language (or `--language`) and cover.
- Every id in the book is mapped to the page it ends up on (`idToOutput`), so links across split
  pages still resolve.

### 4. Prepare the shared parts

Back in [`convert()`](../convert/src/convert.ts):

- the **Reader updates** choice defaults to the beta channel, with a prominent notice naming
  it and explaining `--no-remote-ui` for a fixed bundled reader. `--ui-base-url <url>` selects
  another channel. The report records the choice and the converter prints a beta warning (see
  [`REMOTE_UI.md`](../convert/REMOTE_UI.md));
- the **source record**: the EPUB's file name, its identifier and the converter's version, for the
  report and a `webbook-source` meta in every page;
- the **conversion report** starts, recording the options used
  ([`ConversionReport`](../convert/src/conversion-report.ts#L53));
- **fonts:** obfuscated fonts (IDPF and Adobe) are found, to be de-obfuscated when copied
  ([`readFontEncryption`](../convert/src/font-obfuscation.ts#L23));
- the **accessibility metadata** is turned into plain-language sections for the About panel
  ([`readAccessibilityInfo`](../convert/src/accessibility-info.ts#L34)), in the wording and order of
  the W3C Accessibility Metadata Display Guide 2.0, and presented as the publisher's claims;
- the **reader's files** are copied from the template, from an explicit list, and its stylesheets
  combined into one ([`copyUiAssets`](../convert/src/assets.ts#L93),
  [`combineStylesheets`](../convert/src/assets.ts#L133));
- `sw.js`, the fixed stub for offline reading, is written
  ([`writeServiceWorkerStub`](../convert/src/assets.ts#L167));
- a **favicon** is made from the cover, or a generic one
  ([`createBookFavicon`](../convert/src/favicon.ts#L11)).

### 5. Find the narration

For each content document with a media overlay, [`getMediaSegments`](../convert/src/audio.ts#L151)
reads its SMIL: each phrase's text target and audio clip. Each clip is assigned to the output page
that holds its target, which matters when a document was split. This is read ahead, so every page's
table of contents can mark which pages are narrated.

### 6. Transform each page

[`transformContent`](../convert/src/content-transform.ts#L38) runs once per page, on one in-memory
DOM, in this order:

1. **Read the book's stylesheets** on the whole source page, before anything changes, so the
   publisher's selectors match as written ([`readPageStylesheets`](../convert/src/book-styles.ts#L352)).
2. **Meaningful styles become reader classes:** writing mode, direction, emphasis, alignment,
   indents and the like, which carry meaning in My settings too
   ([`applyWritingStyles`](../convert/src/book-styles.ts#L277)). Vertical writing and `-epub-`
   properties are kept here.
3. **Publisher styles are tracked** ([`PublisherSelectors`](../convert/src/publisher-selectors.ts#L120)):
   every later change that would stop a publisher rule matching "freezes" that rule first, so As
   published still looks as published.
4. **EPUB semantics:** `epub:type` becomes `epubtype_*` classes and, where DPUB-ARIA defines one, a
   role ([`translateEpubTypes`](../convert/src/content-transform.ts#L181)). Old
   `rearnote(s)` count as `endnote(s)`; deprecated `doc-endnote` roles are dropped.
5. **Images** are registered for copying and their references rewritten.
6. **Splitting:** for a split document, only this page's piece is kept
   ([`extractDocumentPiece`](../convert/src/chapter-split.ts#L76)), and links are rewritten to the
   final file names.
7. **Markup cleanup** ([`cleanPublicationMarkup`](../convert/src/markup-cleanup.ts#L21)), the small
   mechanical fixes, each counted in the report:
   - a heading's `title` attribute: shown as its text when the heading is otherwise empty, dropped
     when it repeats the text, and an empty heading that only repeats its neighbor removed
     ([`repairHeadingTitles`](../convert/src/conversion-rules.ts#L10));
   - `xml:lang`, which HTML ignores, is copied to `lang` where the element's text is in the
     expected script, and removed; where the script disagrees it isn't copied, and the report says
     so ([`repairLanguages`](../convert/src/markup-cleanup.ts#L44));
   - numbered equations marked ([`markNumberedEquations`](../convert/src/conversion-rules.ts#L41));
   - empty `<span>`s unwrapped and empty paragraphs removed; ones the publisher's CSS styles are
     kept, the paragraphs shown only As published (`webbook-publisher-only`), since publishers use
     them for spacing;
   - `scope` added to table header cells that lack it;
   - a publication's own `<main>` becomes a `div`, since the reader owns `main`;
   - positive `tabindex` values become 0; media lose `autoplay` and gain controls;
   - tables wrapped so they scroll sideways on narrow screens
     ([`wrapTables`](../convert/src/markup-cleanup.ts#L143)).

   It also looks for things to review and adds them to the report as warnings
   ([`analyzeWarnings`](../convert/src/markup-cleanup.ts#L221)). MathML `alttext` is left as the
   book has it.
8. **Heading permalinks:** each heading gets a self-link, with `tabindex="-1"` on the heading so
   following the link moves focus.
9. **Search passages** are collected from the cleaned-up text
   ([`collectSearchPassages`](../convert/src/create-search-index.ts#L50)).
10. **Narration targets:** ids are kept only where something needs them (narration, navigation,
    links, the publisher's CSS). A narrated phrase whose id isn't needed otherwise is found by a CSS
    path from the nearest kept id instead ([`applyStructureIds`](../convert/src/structure-ids.ts#L108)),
    so the book's markup stays clean.
11. **Id collisions:** an id that clashes with one of the reader's own is renamed, and every
    reference to it updated ([`renameCollidingIds`](../convert/src/markup-cleanup.ts#L167)).
12. **The publisher's CSS** for this page is written out: scoped to the book's content, in cascade
    layers under the reader's settings, with frozen rules padded to keep their specificity
    ([`publisherStyles`](../convert/src/publisher-styles.ts#L57)). Fonts and images it uses are
    copied. Left out entirely with `--no-publisher-styles`.

### 7. Make each page's narration

[`createAudioForPage`](../convert/src/audio.ts#L60) builds one audio file and one cue file per
narrated page:

1. **Cut** each clip from its source to an uncompressed WAV
   ([`extractAudioSegment`](../convert/src/audio.ts#L300)), four at a time.
2. **Fade** 5 ms in and out of each clip, so joins don't click
   ([`applyClipFades`](../convert/src/audio.ts#L281)).
3. **Join** the clips, byte for byte, into one WAV ([`joinPcmFiles`](../convert/src/audio.ts#L252)).
4. **Clean up** ([`cleanupFilters`](../convert/src/audio-cleanup.ts#L68)): a steep cut below 90 Hz
   (rumble), softening of "p" and "b" pops, then the chosen enhancements (warm EQ, compression,
   noise reduction, de-essing, click removal), then two-pass loudness normalization to −18 LUFS
   ([`measureLoudnorm`](../convert/src/audio-cleanup.ts#L115),
   [`loudnormFilter`](../convert/src/audio-cleanup.ts#L126)).
5. **Encode once** to the output format: with `--small-audio` (the default) mono MP3, 24 kHz,
   32 kb/s ([`SMALL_AUDIO_ENCODING`](../convert/src/audio.ts#L123)); otherwise matching the source.
6. **Measure** loudness, peaks and noise floor for the report
   ([`analyzeAudio`](../convert/src/audio-cleanup.ts#L94)).

Decisions:

- **Cues come from sample counts.** Each cue starts where the previous clips' exact WAV lengths add
  up to, not where the SMIL says, and the audio is encoded once at the end. Cutting each clip
  straight to MP3 and joining the files added each one's encoder padding to the audio but not to
  the cues, so the highlight drifted ahead of the voice over a long page.
- **FFmpeg 6** (`ffmpeg-static`), not the 4.4 that `@ffmpeg-installer` ships: 4.4's MP3 decoder adds
  a 6.9 kHz whistle to some sources, such as Kusamakura's 24 kHz, 40 kb/s mono MP3s
  ([`ffmpeg.ts`](../convert/src/ffmpeg.ts)).
- **The enhancements were chosen by ear** on the demo books; they can change a recording a lot, so
  `--audio-enhance` picks them, and `--no-audio-cleanup` turns all cleanup off.
- **The audio cache** (`--audio-cache`, a development convenience) reuses a page's audio when its
  clips and settings haven't changed ([`audio-cache.ts`](../convert/src/audio-cache.ts#L25)). Its
  version number (`MERGE_VERSION`) changes whenever the audio a conversion makes would change.

The cue file ([`createVtt`](../convert/src/vtt.ts#L8)) is WebVTT whose cue text is a JSON selector
for the phrase: an id, or a CSS path from the nearest id (step 6.10).

### 8. Render and shape each page

[`TemplateRenderer.renderPage`](../convert/src/template.ts#L43) clones the template and fills it
in: the page's content in `main`, its title and language, the table of contents with the current
page marked and narrated pages flagged ([`renderToc`](../convert/src/template.ts#L152)), previous
and next links, the audio and its cue track, the page list, the About panel's metadata and
accessibility summary, and the publisher stylesheet link. Writing direction and mode go on the
page as attributes ([`applyWritingStylesToPage`](../convert/src/template.ts#L97)). Identical
publisher stylesheets are written once, named by their hash (`styles/publisher-<hash>.css`).

Then [`shapeBookPage`](../convert/src/book-shape.ts) turns the rendered page into the book's
plain page (plan 11):

- a bar of real links: Contents (to this page's entry in `toc.html`), Go to page (`pages.html`,
  only if the book has a page list), About (`about.html`), Previous and Next;
- the book's content, the native `<audio controls>` with its cue track, and the live regions the
  reader announces through;
- the source record, the UI channel (if any) and a small stylesheet for reading without script;
- the **bootstrap**, prebuilt and readable by `build-bootstrap.mjs` from `bootstrap-source.js` and the
  unit-tested pure decisions in `bootstrap-policy.js`, inline and as `src/js/bootstrap.js` (for sites whose security policy allows
  only same-origin scripts). It picks the reader to load: the book's own, a saved copy's release,
  or the channel's current release, falling back to the book's own, and then to the plain page, if
  anything fails ([`bootstrap.js`](../convert/template/src/js/bootstrap.js)). It is frozen into every
  page, so it can only change by converting again.

With the first page, the **navigation pages** are written: `toc.html`, `about.html` (all the
EPUB's metadata, attributed to its source) and, if the book has a page list, `pages.html`. They
are ordinary pages, useful on their own and from the file system. Their names are reserved: a
source chapter called `about.xhtml` becomes `about-content.html`, with its links rewritten.

### 9. Book-wide files

- **Audio map** ([`generateAudioMap`](../convert/src/audio-map.ts#L177)): every narrated page's
  duration and cue starts, and where each chapter's narration begins, for the whole-book timeline,
  "time left" and resuming.
- **Search data** ([`generateSearchIndex`](../convert/src/create-search-index.ts#L146)): every
  passage, with its page, heading and selector, searched in the browser with words split by
  language.
- **Images** and fonts are copied ([`copyImageAssets`](../convert/src/assets.ts#L171)).

### 10. Report

- Audio findings become warnings (clipping, a high noise floor, a page far louder or quieter than
  the rest).
- Links are checked: every link to a page or anchor that isn't in the converted book is listed
  ([`reportBrokenLinks`](../convert/src/convert.ts#L307)).
- With `--check`, Ace (on the EPUB) and axe (on the output) are run if installed
  ([`runOptionalChecks`](../convert/src/optional-checks.ts#L12)).
- The report starts with the beta warning (with a UI channel) and the source record.
- The report is written as JSON and Markdown
  ([`writeConversionReport`](../convert/src/conversion-report.ts#L146)).

### 11. Finish

The staging folder replaces the output folder ([`finalizeOutput`](../convert/src/output.ts#L40)).

## Converting in the browser

The same source runs in a browser, bundled with stand-ins for Node's file system, jsdom, logging and
FFmpeg (plan 19). It lives in [`converter/`](../converter/README.md). Its narration is made differently: the browser decodes each
source once and cuts the clips itself, lined up sample for sample with FFmpeg's decoding;
ffmpeg.wasm does the fades, joins, cleanup and encode. The results and measurements are in
`.claude/19_BROWSER_CONVERTER_FINDINGS.md`.

The converter page offers every option above except the audio cache and the optional checks (Reader
updates, the UI channel, is always shown and starts on the channel), asks
the person converting to confirm the EPUB passes EPUBCheck (the browser can't run it), and works in
two steps: a **preview** of one of the book's content documents (often a chapter), converted from a copy
of the EPUB whose reading order is just that document and shown on the page, then the **whole book**, offered as a zip of the files to
put on any website. Nothing is kept in the browser. A preview can stop the narration after its first
5 minutes (the default), keeping only the phrases that start within them, so it converts in seconds
instead of as long as the chapter's narration.

## Changing the converter

- Build and test: `cd convert && npm run build && node --test tests/*.test.mjs`, then the reader
  tests: `node --test template/test/*.test.mjs`.
- Regenerate the demos with `./refresh-demos.sh` (from the repository root).
- A change to what the output contains is a contract change: update
  [`contracts/v0.md`](../convert/contracts/v0.md).
- A change to the audio a conversion makes: raise `MERGE_VERSION` in
  [`audio-cache.ts`](../convert/src/audio-cache.ts).
