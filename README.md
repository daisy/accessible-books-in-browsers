# accessible-books-in-browsers

[Github project page](https://github.com/daisy/accessible-books-in-browsers)

## About 

Transform EPUB into a series of HTML files for reading directly in the browser, with built-in Media Overlays support too.

By default, the converter splits a content document containing several chapters into one page per
chapter at its table of contents entries. Use `--no-split-chapters` to preserve the source content
documents as pages. Heading-based page titles are also on by default; use `--no-heading-titles` to
turn them off. Multiple top-level entries always identify chapters; nested entries are used as
chapter boundaries only in long content documents (at least 50 KiB), so ordinary chapter files
are not split into their subsections.

See an [example fileset](https://github.com/daisy/accessible-books-in-browsers/tree/main/demos/moby-dick)):

After conversion, the original EPUB is rewritten as:

- HTML files with the original contents, plus reading interface controls and links to the TOC, Previous, and Next pages.
- An About page containing publication metainformation, and the publisher's accessibility information presented as the W3C [Accessibility Metadata Display Guide](https://w3c.github.io/cg-reports/publishingcg/CG-FINAL-a11y-display-guidelines-20250422/) describes
- A TOC based on the original EPUB Nav Document

Media Overlays conversion adds the following:
- Creation of one audio file per HTML page
- Embedding that audio file in the HTML page
- A VTT file containing the phrase timing information for that audio file


## Latest

September 2026

* The converter has been rewritten around a clean parse-once, render-once pipeline, resulting in faster conversions.
* Accessibility fixes based on direct feedback from screen reader testers: 
  * proper ARIA roles for footnotes, endnotes, and pagebreaks; 
  * accessible names and values on sliders and sidebars; 
  * a single-keystroke way to skip past tables, lists, and footnotes during narration; 
  * heading permalinks that are more usable by screen reader users. 

See [Reading features](#reading-features) and [Keyboard shortcuts](#keyboard-shortcuts) below.

## Demos

These demos were created using this [conversion script](https://github.com/daisy/accessible-books-in-browsers/tree/main/convert). 

* **Action for Heroes**: [demo](https://daisy.github.io/accessible-books-in-browsers/demos/action-for-heroes) · [HTML fileset](https://github.com/daisy/accessible-books-in-browsers/tree/main/demos/action-for-heroes) · [original EPUB](https://github.com/daisy/accessible-books-in-browsers/tree/main/source-epubs/action-for-heroes)
* **Moby Dick**: [demo](https://daisy.github.io/accessible-books-in-browsers/demos/moby-dick) · [HTML fileset](https://github.com/daisy/accessible-books-in-browsers/tree/main/demos/moby-dick) · [original EPUB](https://github.com/daisy/accessible-books-in-browsers/tree/main/source-epubs/moby-dick)
* **Amar Bangla Boi, Class 5** (আমার বাংলা বই পঞ্চম শ্রেণি): [demo](https://daisy.github.io/accessible-books-in-browsers/demos/AmarBanglaEPUB) · [HTML fileset](https://github.com/daisy/accessible-books-in-browsers/tree/main/demos/AmarBanglaEPUB) · [original EPUB](https://github.com/daisy/accessible-books-in-browsers/tree/main/source-epubs/AmarBanglaEPUB)
* **Bangladesh o Bishwoporichoy, Class 4** (বাংলাদেশ ও বিশ্ব পরিচয় চতুর্থ শ্রেণি): [demo](https://daisy.github.io/accessible-books-in-browsers/demos/BangladeshBishwoporichoyEPUB) · [HTML fileset](https://github.com/daisy/accessible-books-in-browsers/tree/main/demos/BangladeshBishwoporichoyEPUB) · [original EPUB](https://github.com/daisy/accessible-books-in-browsers/tree/main/source-epubs/BangladeshBishwoporichoyEPUB)
* **English for Today, Classes 9–10**: [demo](https://daisy.github.io/accessible-books-in-browsers/demos/EnglishForTodayEPUB) · [HTML fileset](https://github.com/daisy/accessible-books-in-browsers/tree/main/demos/EnglishForTodayEPUB) · [original EPUB](https://github.com/daisy/accessible-books-in-browsers/tree/main/source-epubs/EnglishForTodayEPUB)
* **Current Situation of SRHR of Persons with Disabilities in Bangladesh in the Context of SDGs and UNCRPD**: [demo](https://daisy.github.io/accessible-books-in-browsers/demos/CurrentSituationEPUB) · [HTML fileset](https://github.com/daisy/accessible-books-in-browsers/tree/main/demos/CurrentSituationEPUB) · [original EPUB](https://github.com/daisy/accessible-books-in-browsers/tree/main/source-epubs/CurrentSituationEPUB)

Test books:

* **Notes Test Book**: [demo](https://daisy.github.io/accessible-books-in-browsers/demos/notes-test) · [HTML fileset](https://github.com/daisy/accessible-books-in-browsers/tree/main/demos/notes-test) · [original EPUB](https://github.com/daisy/accessible-books-in-browsers/tree/main/source-epubs/notes-test)

  A short narrated book with footnotes on the same page and endnotes in a separate file, for testing notes. The narration is synthetic (macOS `say`).


## Reading features

- **Narration** with the phrase being read highlighted, carrying on from chapter to chapter, and a
  timeline for the whole book. The time shows elapsed time, time left in the chapter or time left
  in the book, allowing for speed.
- **Getting around:** the book's own table of contents (nested, with the current section marked
  and a filter to find a section), go to page (the toolbar shows the current print page), and a
  link on every heading.
- **Bookmarks:** the address bar always points at the reading position, to the phrase in narrated
  books, so the browser's own bookmarks return there. **Copy link to this place** copies it.
- **Resume** where you left off when you reopen a book, to the exact narration time.
- **Notes:** a note reference goes to the note, and **Back to text** returns to exactly where you
  were. While narration plays, it reads the note and goes back. Settings choose whether it goes
  back, and what narration does at a phrase with notes: keep reading, pause briefly, or read each
  note.
- **Skipping:** **Skip past** leaves a table, list, figure, sidebar or note with one key; page
  numbers, notes and sidebars can be skipped altogether (footnotes and endnotes are by default).
- **Structure sounds** (off by default): a tone at headings, a bell at notes, and knocks into and
  out of lists and tables, just before the phrase.
- **Settings:**
  - **Colors:** automatic (the system's light or dark), light or dark; reviewed pairs, each at least 7:1; or
    custom, with automatic black or white text. Per book, or shared with other books.
  - **Highlight:** a color chosen to stand out from the page (or your own) and a style:
    background, underline or both.
  - **Text:** font, size, and line, letter and word spacing and line length, up to WCAG 1.4.12's
    values.
  - **Narration:** speed, and caption mode, the narrated text full screen.
  - **Toolbars:** hide automatically (the default: they fade a few seconds after you last move
    the mouse, touch or press a key), or stay on screen. For every book.

## Keyboard shortcuts

| Shortcut | Where it works | What it does |
|---|---|---|
| `Escape` | Anywhere, only while the "Skip past" notification is showing | Skip past the current table, list, figure, sidebar, footnote, endnote, or note during narration playback; at the end of a page, go to the next one. While a message from another shortcut is showing, the first `Escape` dismisses the message |
| `[` | Anywhere outside a text field or open popover | Previous phrase, continuing onto the previous page from the first phrase of a page |
| `]` | Anywhere outside a text field or open popover | Next phrase, continuing onto the next page from the last phrase of a page |
| `\` | Anywhere outside a text field or open popover | Play / pause |
| `Alt`+`Shift`+`P` | Anywhere outside a text field or open popover | Go to narration position: moves focus, and a screen reader, to the phrase narration is on, e.g. to read on from there after pausing |
| `Alt`+`Shift`+`R` | Anywhere outside a text field or open popover | Play from here: starts narration at the phrase that has focus (a screen reader's cursor brings focus with it) or at selected text |
| `Alt`+`Shift`+`L` | Anywhere outside a text field or open popover | Show and announce the listening time left in the current chapter and book |
| `Alt`+`Shift`+`Q` | Anywhere outside a text field or open popover | Show and announce the current print page |
| `Alt`+`Shift`+`E` | While narration is on a phrase containing a note reference | Go to the note in this phrase, or open its list of notes |
| `Alt`+`Shift`+`Backspace` (`Option`+`Shift`+`Delete` on a Mac) | After following **Go to note** | Back to text at the exact reference and narration position |
| `Shift`+`[` / `Shift`+`]` | Anywhere outside a text field or open popover | Previous / next page |
| `Shift`+`\` | Anywhere outside a text field or open popover | Caption mode on or off |
| `Alt`+`Shift`+`C` | Anywhere outside a text field or open popover | Open the table of contents |
| `Alt`+`Shift`+`F` | Anywhere outside a text field or open popover | Open search |
| `Alt`+`Shift`+`G` | Anywhere outside a text field or open popover | Open Go to page |
| `Alt`+`Shift`+`S` | Anywhere outside a text field or open popover | Open Settings |
| `Alt`+`Shift`+`O` | Anywhere outside a text field or open popover | Open About this publication |
| `Alt`+`Shift`+`,` / `Alt`+`Shift`+`.` | Anywhere outside a text field or open popover | Narration slower / faster |
| `Alt`+`Shift`+`-` / `Alt`+`Shift`+`=` | Anywhere outside a text field or open popover | Smaller / larger text |
| `↑` `↓` `←` `→` | Anywhere outside a form control or open popover, only while Caption mode is on | Same as `[` / `]` (on a page without narration, steps through its text) |

The narration keys are unmodified single keys. An earlier version used `Ctrl`+`Alt` combinations, and screen reader users reported clashes with their assistive technology's commands (e.g. JAWS/NVDA table-navigation keys). The narration slider uses the usual slider keys (arrows, `Page Up`/`Page Down`, `Home`/`End`); on the full-book timeline they move by the amounts described under [Reading features](#reading-features).

Open **Settings**, then choose **Change keyboard shortcuts** to open the shortcut editor. Choose **Change** next to an action and press its new key, with any modifiers. Escape cancels a change. If another action already uses the key, the editor shows and announces a warning before asking you to confirm the move. **Remove** clears an action's shortcut; **Restore default** restores one action, and **Reset to defaults** restores the table above. Choices are shared across books on the same website and remembered when you return.

On a Mac, `Alt` is `Option`. Escape closes an open panel. The panel, narration position, speed and text size keys use `Alt`+`Shift` because NVDA, JAWS, Narrator and VoiceOver don't use it with letters or punctuation, and Chrome, Edge and Safari don't use these letters with it; `Shift`+`,` and `Shift`+`.` would have clashed with NVDA's and JAWS's browse-mode commands. Escape stays reserved for **Skip past**; Tab (including Shift+Tab), Enter and Space are reserved for using controls. The editor warns when a key is also a screen reader browse-mode command (an unmodified letter or some punctuation, or `Shift`+`,` and `Shift`+`.`). Caption mode's arrow keys remain fixed.

More about `[`, `]` and `\`:

- **Screen readers:** the keys were chosen because NVDA and JAWS don't use them on their own in browse mode, so they don't take away a screen reader command. In browse mode a screen reader may still keep them from reaching the page; they work in focus mode, and the hardware play/pause and previous/next track keys work in either mode.
- **Keyboard layouts:** they're matched by the physical key, not the character it types. On a US keyboard they're the three keys to the right of `P`. On other layouts the same physical keys work even though they type different characters (on a German keyboard, `Ü`, `+` and `#`), so they never need `AltGr`.
- **With `Shift`**, `[` and `]` move by page and `\` turns caption mode on or off. With any other modifier they do nothing unless you assign that exact combination.
- **Turning them off:** the "Keyboard shortcuts" setting disables all assigned shortcuts, including Skip past, as WCAG 2.1.4 (Character Key Shortcuts) requires. You can still edit shortcuts while they are off. Caption mode's arrow keys and the standard keys for controls keep working.

The hardware media keys are separate from these: play/pause plays and pauses, and previous/next track move to the previous or next page.

In the book timeline, Left/Right move 10 seconds, Up/Down 30 seconds (as does a screen reader's
slider adjustment), Page Up/Page Down move by chapter, and Home/End go to the start or end. In the
table of contents, Up/Down move through visible entries, Right/Left expand or collapse, Home/End
go to the ends, `*` expands siblings, typing finds an entry, and Enter follows it; in **Find a
section**, Down moves into the results, Enter follows the first, and Escape clears it.

## Search

Search finds words in the book and links to the exact passage. Its index (`search-data.json`) loads
on the first search. Passages are found the way narration finds its phrases, or by a quote of their
text, so search adds no ids to the book.

- **Any language:** words are split by language with `Intl.Segmenter`, including scripts without
  spaces between words, such as Chinese, Japanese and Thai. Without it, search splits on spaces and
  punctuation, and into two-character pieces for Chinese, Japanese and Korean.
- **Matching** ignores case and forms such as full-width letters and ligatures, but not marks that
  are part of letters (Indic scripts, Vietnamese). Optional Arabic and Hebrew vowel marks are
  ignored; exceptions like these are listed, with reasons, in `search-text.js`.
- **Forgiving:** the last word can be the start of a word, and words of five or more Latin, Cyrillic
  or Greek letters allow one typo. There's no stemming, and accents count.
- Accurate `lang` markup in the book helps search, as it helps display and screen reader
  pronunciation.

## AI assistants in the browser

The reader progressively exposes WebMCP tools to AI assistants running in a browser that supports
the experimental WebMCP API. An assistant can report the reading position, list or search the
contents, move through the book, control narration, change reading options, and read text from the
current phrase, section or page. Book text returned to an assistant is marked as untrusted content.

As of November 2026, WebMCP is experimental and available for testing in Chrome or Edge with its
WebMCP testing feature enabled, including through WebMCP inspector extensions. Browsers without
WebMCP continue to work normally. **Let AI assistants in this browser control the reader** is on by
default in Settings when WebMCP is available and is shared across books on the same website; turn
it off to unregister all of the reader's tools. Unsupported browsers do not show the setting.

## Reading without JavaScript

Every page is a complete HTML page. Without JavaScript, it has a plain header with a Contents button (the table of contents opens without JavaScript, as a native popover) and links to the previous and next pages, and narrated pages have the browser's own audio player at the bottom. The reading interface's toolbars only appear when its script runs.

## Converting a book

In `convert/`:

```sh
npm install
npm run build
npm run convert -- <input> <output> template [options]
```

`<input>` is an EPUB file or an unzipped EPUB folder, `<output>` the folder to write the book to,
and `template` the reader (`convert/template`). Only valid EPUBs are accepted.

| Option | What it does |
|---|---|
| `--no-split-chapters` | Keep each content document as one page. By default, a document that holds several chapters is split into a page per chapter, at its table of contents entries. |
| `--no-heading-titles` | Keep the EPUB's page titles. By default, when every page's title is just the book title, each page is titled by its first other heading. |
| `--no-markup-cleanup` | Leave the book's markup as it is. By default the converter copies `xml:lang` to `lang` where the text is in that language's script, unwraps empty spans, removes empty paragraphs, adds `scope` to header cells, makes a book's own `<main>` a `div`, renames ids that clash with the reader's, makes positive `tabindex` 0, and removes autoplay from the book's media. |
| `--no-responsive-tables` | Leave tables as they are. By default, each table scrolls sideways in its own region instead of widening the page. |
| `--keep-all-ids` | Keep every id from the EPUB. By default, only structures (headings, sections, notes, tables, lists and the like) and anything referred to keep theirs; narration finds other phrases from the nearest of those. |
| `--language <tag>` | Use this BCP 47 language instead of the one the EPUB declares, for the pages, search and accessibility information. |
| `--identifier <id>` | Key saved reading positions by this book ID instead of the EPUB's identifier. |
| `--include-non-linear` | Include spine items marked `linear="no"` in the reading order. |
| `--check` | Also run [Ace](https://daisy.github.io/ace/) on the EPUB and axe on the result, if they're installed. A check that can't run is skipped and explained in the report; it never stops the conversion. |
| `--audio-cache [dir]` | Reuse each page's merged narration from an earlier conversion when its audio clips haven't changed, kept in `dir` or the system's temp folder. Merging is most of a conversion's time. For development. |
| `--small-audio` | Make narration smaller for offline reading or expensive data: mono 24 kHz MP3 at 32 kb/s, tuned for speech. |
| `--no-audio-cleanup` | Leave narration levels and joins unchanged. By default the converter applies 5 ms fades at joins, removes rumble below 90 Hz, softens plosive pops (p, b), and normalizes every page to -18 LUFS with a -1.5 dBTP limit. |
| `--audio-enhance <list>` | Add one or more comma-separated, optional narration filters: `warm-eq`, `compression`, `noise`, `deess`, or `declick`. These can alter the sound substantially, so compare them by ear. |

Every conversion also writes `conversion-report.md` and `conversion-report.json`: the options used,
the source and converted narration sizes and encoding settings, every change by page, and warnings
for a person to review, such as language markup that doesn't match the text, images all marked
decorative, broken links and heading problems. Narration is cut through lossless PCM and encoded
once per page. By default it uses source-matched channel, sample-rate and bitrate settings;
`--small-audio` uses its speech encoding instead.
Audio cleanup never changes the PCM-derived page or cue duration. The conversion report includes
pre-cleanup loudness, peaks, quiet-stretch levels, clipping findings, and the applied filters.
