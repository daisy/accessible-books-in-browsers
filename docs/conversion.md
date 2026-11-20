# How a book is converted

This is how the converter (`convert/`) turns an EPUB into a web book, step by step. Each step links
to the code that does it, with the reasons behind it. The [v0 contract](../convert/contracts/v0.md)
describes what the output contains, and [The conversion report and log](conversion-report.md) explains
the report each conversion writes.

It's for people working on the converter. The line links point at the code as of 2026-11-17. If a
line has moved, search the file for the function name.

## The rules every step follows

Everything below follows these rules. If a change seems to need breaking one, ask first.

- **Only valid EPUBs.** The converter expects books that already pass EPUBCheck and Ace. It doesn't
  fix inaccessible or broken books. It converts what it's given and reports problems. Small
  mechanical fixes are OK, like removing an empty paragraph or adding a missing table header scope.
  Guessing at structure is not.
- **Never add or remove the book's words.** Changes are only ever to markup, never to text. The
  one exception is an empty heading with a `title` attribute, whose title is shown as its text.
- **Rules are generic.** Every fix is a rule about a markup pattern, never about a publisher or a
  particular book.
- **Keep the book's writing direction.** Vertical writing and right-to-left text always survive
  conversion. The test book for this is `demos/kusamakura`.
- **The book ID is the EPUB's unique identifier** (or `--identifier`). Readers' saved positions and
  bookmarks are kept under it. It's the source EPUB's ID, and we never present it as the web book's
  own.
- **Write once.** The EPUB is read into an in-memory model, and each page is transformed and
  rendered once. (The content documents are parsed twice, once for the model and again when
  they're transformed.) Everything goes into a staging folder, which only replaces the
  output if the whole conversion works.
- **The authoring template supplies the reader shell.** `index.html` is filled in as an
  intermediate document, then `book-shape.ts` writes plain content pages and separate navigation
  pages. `copyUiAssets` extracts the runtime shell. The template's hooks are still listed in
  [`template-contract.ts`](../convert/src/template-contract.ts).
- **Every page works without JavaScript.** Each content page is plain HTML with real links and the
  browser's own audio player. The reader's controls are added by script (step 8).
- **Keep the source EPUB.** There's no way to upgrade a converted book. A new contract means
  converting again from the EPUB, so each book records what it was converted from (step 4).

## The steps

[`convert()`](../convert/src/convert.ts#L52) runs the steps below, in this order.

### 1. Stage the output

[`createOutputStaging`](../convert/src/output.ts#L22) makes a temporary folder, and everything is
written there. At the end, [`finalizeOutput`](../convert/src/output.ts#L40) moves it into place. If
anything fails, [`discardOutputStaging`](../convert/src/output.ts#L46) deletes it, so a failed
conversion never leaves a half-written book behind. The log (`output.log`) starts here
([`logger/`](../convert/src/logger/)).

### 2. Read the EPUB

[`epubParser.parse`](../convert/src/epubParser/index.ts#L16) unzips the EPUB if it's a file
([`unzip-epub.ts`](../convert/src/epubParser/unzip-epub.ts#L6)). A damaged archive gets repaired and
unzipped again. Then it finds the package through `META-INF/container.xml` and reads two things.

- The package document, for the metadata, manifest, spine, page progression direction and cover
  ([`package-document.ts`](../convert/src/epubParser/package-document.ts#L24)).
- The navigation document, for the table of contents, page list and landmarks
  ([`nav-document.ts`](../convert/src/epubParser/nav-document.ts#L16)).

Spine items marked `linear="no"` are left out, unless you use `--include-non-linear`
([`parseSpine`](../convert/src/epubParser/package-document.ts#L89)).

### 3. Build the site model

[`buildSiteModel`](../convert/src/model.ts#L85) works out the plan for the web book, without writing
anything yet.

- Each spine item gets its output file name (`.html`, and the first one is `index.html`). Nothing is
  renamed on disk.
- A content document is split into a page per chapter if the table of contents points to two or
  more places inside it ([`planDocumentSplit`](../convert/src/chapter-split.ts#L25)). Several
  top-level entries always mean chapters. Nested entries only count in long documents (50 KiB or
  more), so regular chapter files don't get cut into their subsections. `--no-split-chapters` turns
  this off.
- If every page's `<title>` is just the book's title, each page gets its first other heading as its
  title instead, so you can tell tabs and history entries apart. `--no-heading-titles` turns this
  off.
- The table of contents ([`buildToc`](../convert/src/model.ts#L248)) keeps the nav document's
  nesting. The page list ([`buildPageList`](../convert/src/model.ts#L236)) has the print page
  numbers. The metadata ([`buildMetadata`](../convert/src/model.ts#L224)) has the title, authors,
  language (or `--language`) and cover.
- Every id in the book is mapped to the page it ends up on (`idToOutput`), so links still work across
  split pages.

### 4. Prepare the shared parts

Back in [`convert()`](../convert/src/convert.ts), a few things are set up for the whole book.

- **Reader updates** use the beta channel by default. The converter prints a notice naming the
  channel and explaining `--no-remote-ui` for a fixed reader, and `--ui-base-url <url>` picks a
  different channel. The report records the choice, and the converter prints a beta warning (see
  [`REMOTE_UI.md`](../convert/REMOTE_UI.md)).
- **The source record** has the EPUB's file name, its identifier and the converter's version. It goes
  in the report, and in a `webbook-source` meta on every page.
- **The conversion report** starts, with the options used
  ([`ConversionReport`](../convert/src/conversion-report.ts#L53)).
- **Fonts** that are obfuscated (IDPF and Adobe) are found, so they can be de-obfuscated when copied
  ([`readFontEncryption`](../convert/src/font-obfuscation.ts#L23)).
- **The accessibility metadata** is turned into plain-language sections for the About panel
  ([`readAccessibilityInfo`](../convert/src/accessibility-info.ts#L34)). It uses the wording and
  order of the W3C Accessibility Metadata Display Guide 2.0, and presents them as the publisher's
  claims.
- **The reader's files** are copied from the template, from a fixed list, and its stylesheets are
  combined into one ([`copyUiAssets`](../convert/src/assets.ts#L93),
  [`combineStylesheets`](../convert/src/assets.ts#L153)). Its scripts go in as a bundle: `npm run
  compile` runs [`build-reader.mjs`](../convert/scripts/build-reader.mjs), which bundles the reader's
  70 or so modules into a few files, with the parts that load only when used (search, math copying,
  the shortcut editor) in their own. Each module was a separate request, found only after the one
  that imports it, so on a slow connection the reader took many round trips to arrive. The offline
  workers stay separate files. Without a bundle, a book gets the separate modules
  ([`useReaderBundle`](../convert/src/assets.ts#L135)).
- **`sw.js`**, the fixed stub for offline reading, is written
  ([`writeServiceWorkerStub`](../convert/src/assets.ts#L187)).
- **A favicon** is made from the cover, or a generic one is used
  ([`createBookFavicon`](../convert/src/favicon.ts#L11)).

### 5. Find the narration

For each content document with a media overlay, [`getMediaSegments`](../convert/src/audio.ts#L158)
reads its SMIL, with each phrase's text target and audio clip. Each clip goes with the output page
that has its target, which matters when a document was split. This happens first so that every
page's table of contents can show which pages have narration.

### 6. Transform each page

[`transformContent`](../convert/src/content-transform.ts#L38) runs once per page, on one in-memory
DOM, in this order.

1. **Read the book's stylesheets** on the whole source page, before anything changes, so the
   publisher's selectors match the way they were written
   ([`readPageStylesheets`](../convert/src/book-styles.ts#L352)).
2. **Turn meaningful styles into reader classes.** Writing mode, direction, emphasis, alignment,
   indents and so on carry meaning, so they need to show in My settings too
   ([`applyWritingStyles`](../convert/src/book-styles.ts#L277)). Vertical writing and `-epub-`
   properties are kept here.
3. **Track the publisher's styles** ([`PublisherSelectors`](../convert/src/publisher-selectors.ts#L120)).
   If a later change would stop a publisher rule from matching, that rule is "frozen" first, so As
   published still looks the way it was published.
4. **EPUB semantics.** `epub:type` becomes `epubtype_*` classes and, where DPUB-ARIA has one, a role
   ([`translateEpubTypes`](../convert/src/content-transform.ts#L181)). Old `rearnote(s)` count as
   `endnote(s)`, and deprecated `doc-endnote` roles are dropped.
5. **Images** are registered for copying, and their references are rewritten.
6. **Splitting.** For a split document, only this page's piece is kept
   ([`extractDocumentPiece`](../convert/src/chapter-split.ts#L76)), and links are rewritten to the
   final file names.
7. **Markup cleanup** ([`cleanPublicationMarkup`](../convert/src/markup-cleanup.ts#L21)). These are
   the small mechanical fixes, and each one is counted in the report.
   - A heading's `title` attribute is shown as its text if the heading is otherwise empty, and
     dropped if it repeats the text. An empty heading that only repeats the one next to it is
     removed ([`repairHeadingTitles`](../convert/src/conversion-rules.ts#L10)).
   - `xml:lang` doesn't do anything in HTML, so it's copied to `lang` when the element's text is in
     the expected script, and then removed. If the script doesn't match, it isn't copied, and the
     report says so ([`repairLanguages`](../convert/src/markup-cleanup.ts#L44)).
   - Numbered equations are marked ([`markNumberedEquations`](../convert/src/conversion-rules.ts#L41)).
   - Empty `<span>`s are unwrapped and empty paragraphs are removed. If the publisher's CSS styles
     them, they're kept, and the paragraphs only show in As published (`webbook-publisher-only`),
     since publishers use them for spacing.
   - Table header cells without a `scope` get one.
   - A publication's own `<main>` becomes a `div`, because the reader has its own `main`.
   - Positive `tabindex` values become 0. Media lose `autoplay` and get controls.
   - Tables are wrapped so they scroll sideways on narrow screens
     ([`wrapTables`](../convert/src/markup-cleanup.ts#L143)).

   It also looks for things to review and adds them to the report as warnings
   ([`analyzeWarnings`](../convert/src/markup-cleanup.ts#L221)). MathML `alttext` is left the way
   the book has it.
8. **Heading permalinks.** Each heading gets a link to itself, with `tabindex="-1"` on the heading
   so following the link moves focus.
9. **Search passages** are collected from the cleaned-up text
   ([`collectSearchPassages`](../convert/src/create-search-index.ts#L50)).
10. **Narration targets.** Ids are only kept where something needs them (narration, navigation,
    links, or the publisher's CSS). If a narrated phrase's id isn't needed for anything else, the
    phrase is found by a CSS path from the nearest kept id instead
    ([`applyStructureIds`](../convert/src/structure-ids.ts#L108)). This keeps the book's markup
    clean.
11. **Id collisions.** An id that clashes with one of the reader's own is renamed, and everything
    that points to it is updated ([`renameCollidingIds`](../convert/src/markup-cleanup.ts#L167)).
12. **The publisher's CSS** for this page is written out. It's scoped to the book's content, in
    cascade layers under the reader's settings, and frozen rules are padded to keep their
    specificity ([`publisherStyles`](../convert/src/publisher-styles.ts#L57)). Fonts and images it
    uses are copied. `--no-publisher-styles` leaves it out completely.

### 7. Make each page's narration

[`createAudioForPage`](../convert/src/audio.ts#L67) makes one audio file and one cue file for each
narrated page.

1. **Cut** each clip into an uncompressed WAV, four at a time. Each source the page uses is first
   decoded once, from its first clip to its last, and the clips are cut from that
   ([`decodeSourceRanges`](../convert/src/audio.ts#L330), [`cutToWav`](../convert/src/audio.ts#L353)).
   Pages are converted up to four at a time, half the computer's cores.
2. **Fade** each clip in and out over 5 ms, so the joins don't click
   ([`applyClipFades`](../convert/src/audio.ts#L310)).
3. **Join** the clips, byte for byte, into one WAV ([`joinPcmFiles`](../convert/src/audio.ts#L281)).
4. **Clean up** ([`cleanupFilters`](../convert/src/audio-cleanup.ts#L58)). This cuts everything
   below 90 Hz (rumble), softens "p" and "b" pops, applies the chosen enhancements (warm EQ,
   compression, noise reduction, de-essing, click removal). Then it measures the loudness once
   ([`measureLoudness`](../convert/src/audio-cleanup.ts#L106)) and raises narration quieter than −18
   LUFS to that level. Louder narration keeps its level. A limiter holds the peaks under −1.5 dB
   without delaying the audio ([`loudnessFilters`](../convert/src/audio-cleanup.ts#L121)).
5. **Encode once** to the output format. With `--small-audio` (the default) that's mono MP3, 24 kHz,
   32 kb/s ([`SMALL_AUDIO_ENCODING`](../convert/src/audio.ts#L130)). Otherwise it matches the source.
6. **Measure** loudness, peaks and noise floor for the report
   ([`analyzeAudio`](../convert/src/audio-cleanup.ts#L84)).

Some decisions behind this:

- **Cues come from sample counts.** Each cue starts where the earlier clips' exact WAV lengths add
  up to, not where the SMIL says, and the audio is only encoded once, at the end. We used to cut
  each clip straight to MP3 and join the files, but that added each clip's encoder padding to the
  audio and not to the cues, so on a long page the highlight drifted ahead of the voice.
- **We use FFmpeg 6** (`ffmpeg-static`), not the 4.4 that `@ffmpeg-installer` ships. FFmpeg 4.4's MP3
  decoder adds a 6.9 kHz whistle to some sources, like Kusamakura's 24 kHz, 40 kb/s mono MP3s
  ([`ffmpeg.ts`](../convert/src/ffmpeg.ts)).
- **The enhancements were chosen by listening** to the demo books. They can change a recording a
  lot, so `--audio-enhance` lets you pick them, and `--no-audio-cleanup` turns all cleanup off.
- **The audio cache** (`--audio-cache`) is for development. It reuses a page's audio if its clips
  and settings haven't changed ([`audio-cache.ts`](../convert/src/audio-cache.ts#L25)). Its version
  number (`MERGE_VERSION`) goes up whenever the audio a conversion makes would be different.

The cue file ([`createVtt`](../convert/src/vtt.ts#L8)) is WebVTT. Each cue's text is a JSON selector
for its phrase, either an id or a CSS path from the nearest id (step 6.10).

### 8. Render and shape each page

[`TemplateRenderer.renderPage`](../convert/src/template.ts#L43) copies the template and fills it in.
That means the page's content in `main`, its title and language, the table of contents (with the
current page marked and narrated pages flagged, [`renderToc`](../convert/src/template.ts#L152)),
previous and next links, the audio and its cue track, the page list, the About panel's metadata and
accessibility summary, and the link to the publisher's stylesheet. Writing direction and mode go
on the page as attributes ([`applyWritingStylesToPage`](../convert/src/template.ts#L97)). Identical
publisher stylesheets are only written once, named by their hash (`styles/publisher-<hash>.css`).

Then [`shapeBookPage`](../convert/src/book-shape.ts) turns the rendered page into the book's plain
page (plan 11). Each page gets:

- a bar of real links, to Contents (this page's entry in `toc.html`), Go to page (`pages.html`, only
  if the book has a page list), About (`about.html`), Previous and Next;
- the book's content, the native `<audio controls>` with its cue track, and the live regions the
  reader uses for announcements;
- the source record, the UI channel if there is one, and a small stylesheet for reading without
  script;
- the **bootstrap**. `build-bootstrap.mjs` builds it, readable, from `bootstrap-source.js` and the
  unit-tested decisions in `bootstrap-policy.js`. It goes inline, and also into
  `src/js/bootstrap.js` for sites whose security policy only allows same-origin scripts. It picks
  which reader to load: the book's own, the release a saved copy has, or the channel's current
  release. If anything fails, it falls back to the book's own reader, and then to the plain page
  ([`bootstrap.js`](../convert/template/src/js/bootstrap.js)). It's frozen into every page, so the
  only way to change it is to convert the book again.

With the first page, the navigation pages are written too. These are `toc.html`, `about.html` (all
the EPUB's metadata, credited to its source) and, if the book has a page list, `pages.html`.
They're regular pages that work on their own, even from the file system. Their names are reserved,
so a source chapter called `about.xhtml` becomes `about-content.html`, and its links are updated.

### 9. Book-wide files

- **The audio map** ([`generateAudioMap`](../convert/src/audio-map.ts#L177)) has every narrated
  page's duration and cue starts, and where each chapter's narration begins. The reader uses it for
  the whole-book timeline, time left and resuming.
- **The search data** ([`generateSearchIndex`](../convert/src/create-search-index.ts#L146)) has
  every passage, with its page, heading and selector. Search runs in the browser, and splits words
  by language.
- **Images** and fonts are copied ([`copyImageAssets`](../convert/src/assets.ts#L191)).

### 10. Report

- Audio findings become warnings, for clipping, a high noise floor, or a page that's much louder or
  quieter than the rest.
- Links are checked, and any link to a page or anchor that isn't in the converted book is listed
  ([`reportBrokenLinks`](../convert/src/convert.ts#L324)).
- With `--check`, Ace (on the EPUB) and axe (on the output) run if they're installed
  ([`runOptionalChecks`](../convert/src/optional-checks.ts#L12)).
- The report starts with the beta warning, if the book uses a UI channel, and the source record.
- The report is written as JSON and Markdown
  ([`writeConversionReport`](../convert/src/conversion-report.ts#L146)).

### 11. Finish

The staging folder replaces the output folder ([`finalizeOutput`](../convert/src/output.ts#L40)).

## Converting in the browser

The same code runs in a browser, bundled with stand-ins for Node's file system, jsdom, logging and
FFmpeg (plan 19). It's in [`converter/`](../converter/README.md). Narration works a little
differently there. The browser decodes each audio source once and cuts the clips itself, lined up
sample for sample with FFmpeg's decoding, and ffmpeg.wasm does the fades, joins, cleanup and
encoding. The results and measurements are in `.claude/19_BROWSER_CONVERTER_FINDINGS.md`.

The converter page has every option above except the audio cache, the optional checks and
`--ui-base-url` (the page always uses the v0 update channel). Reader
updates is always shown, and starts on the channel. The page asks you to confirm the EPUB passes
EPUBCheck, since the browser can't run it. Then it works in two steps. First you preview one of the
book's content documents (often a chapter), converted from a copy of the EPUB whose reading order
is just that document, and shown right on the page. Then you convert the whole book and get a zip
of the files to put on any website. Nothing is kept in the browser for good. The preview's files are in the browser's Cache Storage
until the next preview replaces them, or the converter page is opened again. By default the preview stops the
narration after 5 minutes, keeping only the phrases that start before then, so it converts in
seconds instead of taking as long as the whole chapter.

## Changing the converter

- To build and test, run `cd convert && npm run build && node --test tests/*.test.mjs`, then the
  reader tests with `node --test template/test/*.test.mjs`.
- To regenerate the demos, run `./refresh-demos.sh` from the repository root.
- If you change what the output contains, that's a contract change, so update
  [`contracts/v0.md`](../convert/contracts/v0.md).
- If you change the audio a conversion makes, raise `MERGE_VERSION` in
  [`audio-cache.ts`](../convert/src/audio-cache.ts).
