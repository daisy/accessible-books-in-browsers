# accessible-books-in-browsers

[GitHub project page](https://github.com/daisy/accessible-books-in-browsers)

Turns an EPUB into a book you read in the browser: plain HTML pages with a reading interface on
top. Narrated books (EPUB Media Overlays) play with the phrase being read highlighted. A converted
book is a folder of static files you can host anywhere, and it reads without JavaScript too.

- [Demos](#demos)
- [Browser converter](converter/): convert a book in your browser, nothing to install (beta, on a computer)
- [Documentation](docs/): how the converter and the reader work

## Features

**Reading**
- **Narration** with the phrase highlighted, carrying on from page to page and with the screen
  locked; a timeline for the whole book, time left, speed, and the lock screen and media keys.
- **Caption mode:** the phrase being read, large, alone on the screen.
- **Getting around:** the table of contents as a tree, with a filter; go to print page; previous
  and next page and phrase; search in any language; **Where am I?** says what you're in (a
  footnote, a table in a sidebar) and the heading it's under.
- **Your place:** a book reopens where you were, and the address always points at the reading
  position, so bookmarks and copied links return there.
- **Notes:** follow a note and come back to exactly where you were; narration reads the note and
  returns.
- **Skipping:** leave a table, list, figure, equation, sidebar or note with one key; skip page
  numbers, notes or sidebars altogether.
- **Vertical writing and right-to-left books** keep their direction.
- **Offline reading:** save a book from About and read it, narration included, with no connection.
  It needs HTTPS. Safari may delete a site's saved books after seven days without a visit, unless
  the site is on the Home Screen.
- **About:** the book's metadata, your progress, and the publisher's accessibility information.

**Settings**
- Colors, highlight, font, text size, spacing and line length; or **As published**, the
  publisher's own design, chosen per book.
- Keyboard shortcuts for every action, which you can change.
- Structure sounds (off by default): tones at headings, notes, lists and tables.
- Settings apply to every book on the same website, and can be exported and imported.

**Accessibility**
- Built and checked against WCAG 2.2 AA, with an automated axe check of every demo page, and
  shortcuts that avoid screen reader commands.
- Every page reads without JavaScript: plain links to Contents, About, Previous and Next, and the
  browser's own audio player.

**Experimental:** AI assistants in the browser (WebMCP, Chrome and Edge only for now) can move
through the book, control narration and settings, and search and read it.

## Demos

Made with the [converter](convert/). Who each book belongs to, and its license: [About the demos](demos/README.md).

* **Action for Heroes**: [demo](https://daisy.github.io/accessible-books-in-browsers/demos/action-for-heroes) · [HTML fileset](https://github.com/daisy/accessible-books-in-browsers/tree/main/demos/action-for-heroes) · [original EPUB](https://github.com/daisy/accessible-books-in-browsers/tree/main/source-epubs/action-for-heroes)
* **Moby Dick**: [demo](https://daisy.github.io/accessible-books-in-browsers/demos/moby-dick) · [HTML fileset](https://github.com/daisy/accessible-books-in-browsers/tree/main/demos/moby-dick) · [original EPUB](https://github.com/daisy/accessible-books-in-browsers/tree/main/source-epubs/moby-dick)
* **Amar Bangla Boi, Class 5** (আমার বাংলা বই পঞ্চম শ্রেণি): [demo](https://daisy.github.io/accessible-books-in-browsers/demos/AmarBanglaEPUB) · [HTML fileset](https://github.com/daisy/accessible-books-in-browsers/tree/main/demos/AmarBanglaEPUB) · [original EPUB](https://github.com/daisy/accessible-books-in-browsers/tree/main/source-epubs/AmarBanglaEPUB)
* **Bangladesh o Bishwoporichoy, Class 4** (বাংলাদেশ ও বিশ্ব পরিচয় চতুর্থ শ্রেণি): [demo](https://daisy.github.io/accessible-books-in-browsers/demos/BangladeshBishwoporichoyEPUB) · [HTML fileset](https://github.com/daisy/accessible-books-in-browsers/tree/main/demos/BangladeshBishwoporichoyEPUB) · [original EPUB](https://github.com/daisy/accessible-books-in-browsers/tree/main/source-epubs/BangladeshBishwoporichoyEPUB)
* **English for Today, Classes 9–10**: [demo](https://daisy.github.io/accessible-books-in-browsers/demos/EnglishForTodayEPUB) · [HTML fileset](https://github.com/daisy/accessible-books-in-browsers/tree/main/demos/EnglishForTodayEPUB) · [original EPUB](https://github.com/daisy/accessible-books-in-browsers/tree/main/source-epubs/EnglishForTodayEPUB)
* **Current Situation of SRHR of Persons with Disabilities in Bangladesh in the Context of SDGs and UNCRPD**: [demo](https://daisy.github.io/accessible-books-in-browsers/demos/CurrentSituationEPUB) · [HTML fileset](https://github.com/daisy/accessible-books-in-browsers/tree/main/demos/CurrentSituationEPUB) · [original EPUB](https://github.com/daisy/accessible-books-in-browsers/tree/main/source-epubs/CurrentSituationEPUB)
* **Kusamakura** (草枕), Natsume Sōseki: [demo](https://daisy.github.io/accessible-books-in-browsers/demos/kusamakura) · [HTML fileset](https://github.com/daisy/accessible-books-in-browsers/tree/main/demos/kusamakura) · [original EPUB](https://github.com/daisy/accessible-books-in-browsers/tree/main/source-epubs/kusamakura)

  Japanese in vertical writing, with ruby and narration for chapters 1 and 2.
* **Mathematical Optimization for Machine Learning**, De Gruyter: [demo](https://daisy.github.io/accessible-books-in-browsers/demos/math-optimization-ml) · [HTML fileset](https://github.com/daisy/accessible-books-in-browsers/tree/main/demos/math-optimization-ml) · [original EPUB](https://github.com/daisy/accessible-books-in-browsers/tree/main/source-epubs/math-optimization-ml)

  A math textbook with MathML: copying equations, and long pages.
* **The Real Mother Goose**: [demo](https://daisy.github.io/accessible-books-in-browsers/demos/real-mother-goose) · [HTML fileset](https://github.com/daisy/accessible-books-in-browsers/tree/main/demos/real-mother-goose) · [original EPUB](https://github.com/daisy/accessible-books-in-browsers/tree/main/source-epubs/real-mother-goose)

  A fixed-layout picture book, which the converter doesn't support yet: it shows how one converts today.

Test books:

* **Notes Test Book**: [demo](https://daisy.github.io/accessible-books-in-browsers/demos/notes-test) · [HTML fileset](https://github.com/daisy/accessible-books-in-browsers/tree/main/demos/notes-test) · [original EPUB](https://github.com/daisy/accessible-books-in-browsers/tree/main/source-epubs/notes-test)

  A short narrated book with footnotes on the same page and endnotes in a separate file, for testing notes. The narration is synthetic (macOS `say`).

## Keyboard shortcuts

| Shortcut | Where it works | What it does |
|---|---|---|
| `Escape` | While narration is positioned in an escapable structure | Leave the current structure, or return from a note visit to the text. At a page boundary, continue onto the next page; at the end of the book, stop. While a message from another shortcut is showing, the first `Escape` dismisses the message |
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
| Unassigned (choose a key in Settings) | Anywhere outside a text field; in an open panel too, if the key has `Alt`, `Ctrl` or `Cmd` | Where am I? Announce the structure and heading at the reading position, or the panel and item that has focus |
| Unassigned (choose a key in Settings) | Selection, focus or narrated phrase | Copy equation |
| Unassigned (choose a key in Settings) | Selected text or focused code block | Copy selection / Copy code |

On a Mac, `Alt` is `Option`. Change any shortcut in **Settings → Change keyboard shortcuts**; the
editor warns about keys a screen reader uses. `[`, `]` and `\` are matched by physical key, so they
work on any keyboard layout. The "Keyboard shortcuts" setting turns them all off (WCAG 2.1.4).

## Converting a book

Use the [browser converter](converter/), or the command line. In `convert/`:

```sh
npm install
npm run build
npm run convert -- <input> <output> template [options]
```

`<input>` is an EPUB file or folder, `<output>` the folder to write the book to, and `template`
the reader (`convert/template`). Only valid EPUBs are accepted: check yours with EPUBCheck first.
Keep the EPUB, since a new version of the book format means converting again.

| Option | What it does |
|---|---|
| `--no-publisher-styles` | Leave out the publisher stylesheet and Appearance group. |
| `--no-heading-titles` | Keep the EPUB's page titles. By default, when every page's title is just the book title, each page is titled by its first other heading. |
| `--no-split-chapters` | Keep each content document as one page. By default, a document is split into a page per chapter where the table of contents points to places inside it. |
| `--language <tag>` | Use this BCP 47 language instead of the one the EPUB declares, for the pages, search and accessibility information. |
| `--identifier <id>` | Key saved reading positions by this book ID instead of the EPUB's identifier. |
| `--include-non-linear` | Include spine items marked `linear="no"` in the reading order. |
| `--check` | Also run [Ace](https://daisy.github.io/ace/) on the EPUB and axe on the result, if they're installed. A check that can't run is skipped and explained in the report; it never stops the conversion. |
| `--audio-cache [dir]` | Reuse each page's merged narration from an earlier conversion when its audio clips haven't changed, kept in `dir` or the system's temp folder. Merging is most of a conversion's time. For development. |
| `--no-small-audio` | Keep the narration's source encoding (channels, sample rate and bitrate, encoded once). By default narration is made small for offline reading or expensive data: mono 24 kHz MP3 at 32 kb/s, tuned for speech. |
| `--no-audio-cleanup` | Leave narration levels and joins unchanged. By default the converter applies 5 ms fades at joins, removes rumble below 90 Hz, softens plosive pops (p, b), and normalizes every page to -18 LUFS with a -1.5 dBTP limit. |
| `--audio-enhance <list>` | Which narration filters to use, comma-separated: `warm-eq`, `compression`, `noise`, `deess`, `declick`, or `none`. By default all five are used, as chosen by ear on the demos; they can alter the sound substantially, so compare them by ear for a book whose recording differs. |
| `--no-remote-ui` | Always use the reader included in the book. By default a book gets reader updates from the beta channel, falling back to its own copy ([how it works](convert/REMOTE_UI.md)). |
| `--ui-base-url <url>` | Get reader updates from another channel. |

Each conversion writes a report (`conversion-report.md` and `.json`): the options used, what was
changed, and what a person should review. [What it all means](docs/conversion-report.md).
