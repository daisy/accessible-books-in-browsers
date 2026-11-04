# accessible-books-in-browsers

[Github project page](https://github.com/daisy/accessible-books-in-browsers)

## About 

Transform EPUB into a series of HTML files for reading directly in the browser, with built-in Media Overlays support too.

See an [example fileset](https://github.com/daisy/accessible-books-in-browsers/tree/main/demos/moby-dick)):

After conversion, the original EPUB is rewritten as:

- HTML files with the original contents, plus reading interface controls and links to the TOC, Previous, and Next pages.
- An About page containing publication metainformation
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

* [Action for Heroes](https://daisy.github.io/accessible-books-in-browsers/demos/action-for-heroes)
* [Moby Dick](https://daisy.github.io/accessible-books-in-browsers/demos/moby-dick)


## Reading features

- Synchronized narration playback with word/phrase-level highlighting (CSS Custom Highlight API), auto-continuing across chapters when a chapter's audio ends
- Table of contents generated from the EPUB's own navigation document, including nested sub-entries, with the current page marked
- Go-to-page, using the EPUB's page-list navigation where available
- Settings: appearance (auto/dark/light), font size and family, narration highlight color (auto or custom), playback rate, caption mode (a full-screen, narration-synced text view), skip-toggles for page numbers/footnotes/endnotes/notes/sidebars, and whether to resume the last reading position on open
- Resumes your last reading position (page, heading, and exact audio offset) automatically when you reopen a book, with an announced "Loaded last position" banner
- "Skip past" notification plus a single-keystroke escape (see Keyboard shortcuts below) so a table, list, figure, sidebar, footnote, endnote, or note doesn't have to be sat through during playback
- Every heading has a permalink (visible on hover/focus) for bookmarking or sharing a specific section
- The URL updates to reflect your reading position as narration plays, without adding browser-history entries

## Search

Search works within one book. Results link to the exact passage, including narration cue targets
when a book has synchronized audio. The reader loads `search-data.json` and builds its in-memory
index only after the first search.

Narrated results use the existing ids required by their timing cues. Other results use Web
Annotation-style `TextQuoteSelector` anchors: the passage's exact text plus nearby prefix and
suffix context. The reader resolves the quotation after loading the page, so search does not add
generated ids to publication content.

Search uses `Intl.Segmenter` to split text into words according to its language, including scripts
such as Chinese, Japanese, Thai, Lao, Khmer and Burmese that do not put spaces between every word.
When a browser lacks `Intl.Segmenter`, the fallback splits on Unicode whitespace and punctuation
and adds overlapping two-character pieces for Han, Hiragana, Katakana and Hangul text.

Matching ignores case and Unicode compatibility differences such as full-width forms and ligatures.
Combining marks remain significant because they are part of letters in Indic scripts, Vietnamese
and many other languages. Two explicit language rules ignore optional Arabic harakat and tatweel,
and Hebrew niqqud; new exceptions belong in the small rule table in `search-text.js`, with the
language-specific reason documented there.

The final query word can match a prefix. One-character typo tolerance applies only to words of at
least five characters written entirely in Latin, Cyrillic or Greek letters, where an edit is less
likely to change a vowel sign or tone mark. Search does not currently stem words or ignore accents
in Latin-script languages. Accurate `lang` markup in the publication improves word segmentation,
case folding, display direction and screen-reader pronunciation.

## Keyboard shortcuts

| Shortcut | Where it works | What it does |
|---|---|---|
| `Escape` | Anywhere, only while the "Skip past" notification is showing | Skip past the current table, list, figure, sidebar, footnote, endnote, or note during narration playback |
| `[` | Anywhere outside a text field or open popover | Previous phrase, continuing onto the previous page from the first phrase of a page |
| `]` | Anywhere outside a text field or open popover | Next phrase, continuing onto the next page from the last phrase of a page |
| `\` | Anywhere outside a text field or open popover | Play / pause |
| `↑` `↓` `←` `→` | Anywhere outside a form control or open popover, only while Caption mode is on | Same as `[` / `]` (on a page without narration, steps through its text) |

The defaults use unmodified single keys. An earlier version used `Ctrl`+`Alt` combinations, and screen reader users reported clashes with their assistive technology's commands (e.g. JAWS/NVDA table-navigation keys). The seek slider uses the browser's standard slider keys (arrows, `Page Up`/`Page Down`, `Home`/`End`).

Open **Settings**, then choose **Change keyboard shortcuts** to open the shortcut editor. Choose **Change** next to an action and press its new key, with any modifiers. Escape cancels a change. If another action already uses the key, the editor shows and announces a warning before asking you to confirm the move. **Remove** clears an action's shortcut; **Restore default** restores one action, and **Reset to defaults** restores the table above. Choices are shared across books on the same website and remembered when you return.

You can also assign shortcuts for previous/next page, opening panels, narration speed, text size and caption mode. These actions have no keys until you assign them. Escape stays reserved for **Skip past**; Tab (including Shift+Tab), Enter and Space are reserved for using controls. The editor warns when an unmodified key is also a screen reader browse-mode command. Caption mode's arrow keys remain fixed.

More about `[`, `]` and `\`:

- **Screen readers:** the keys were chosen because NVDA and JAWS don't use them on their own in browse mode, so they don't take away a screen reader command. In browse mode a screen reader may still keep them from reaching the page; they work in focus mode, and the hardware play/pause and previous/next track keys work in either mode.
- **Keyboard layouts:** they're matched by the physical key, not the character it types. On a US keyboard they're the three keys to the right of `P`. On other layouts the same physical keys work even though they type different characters (on a German keyboard, `Ü`, `+` and `#`), so they never need `AltGr`.
- **With `Shift` or another modifier** they do nothing unless you assign that exact combination.
- **Turning them off:** the "Keyboard shortcuts" setting disables all assigned shortcuts, including Skip past, as WCAG 2.1.4 (Character Key Shortcuts) requires. You can still edit shortcuts while they are off. Caption mode's arrow keys and the standard keys for controls keep working.

The hardware media keys are separate from these: play/pause plays and pauses, and previous/next track move to the previous or next page.


