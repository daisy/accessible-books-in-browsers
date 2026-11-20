# The conversion report and log

Every conversion writes two files next to the web book.

- `conversion-report.md` is the report, for people to read.
- `output.log` is what the converter did, step by step.

There's no machine-readable report. Its format was never defined, and a book shouldn't carry a file
that tools could come to rely on. Code that converts books gets the same content, as the
[`ConversionReportData`](../convert/src/conversion-report.ts#L20) that `convert()` returns; the
browser converter uses it to list the warnings.

The report says what the converter changed, and what it found that someone should look at. It
isn't a validation. The converter expects an EPUB that already passes EPUBCheck and Ace, and the
report doesn't replace running them. [How a book is converted](conversion.md) explains each step.

[`ConversionReport`](../convert/src/conversion-report.ts#L53) builds the report, and
[`writeConversionReport`](../convert/src/conversion-report.ts#L149) writes it.

## The report, section by section

### Beta warning and source

If the book uses a UI channel (`--remote-ui` or `--ui-base-url`), the report starts with a warning
that the book loads its interface from the beta channel, and that the channel's address and
releases might change.

After that comes the source record, with the EPUB's file name, its identifier and the converter's
version. Keep the source EPUB, because a future reader contract will mean converting it again.
Every page has the same record in its `webbook-source` meta.

### Summary line

`Changes: 6193. Warnings for review: 98. Optional checks: Ace not requested, axe not requested.`

Changes are small mechanical edits to the markup, and each one is counted. Warnings are things to
look at. Neither one means the conversion failed. If a conversion fails, it doesn't write a book at
all.

### Options used

This lists the language the EPUB declares, the language actually used (only different with
`--language`), and most of the options that affect the output, with their values. A few aren't listed yet,
such as `--identifier` and `--include-non-linear`, so keep the command you used if you want to
convert the book again the same way.

### Publisher styles (As published)

This section is there unless you use `--no-publisher-styles`. It counts the publisher's CSS rules,
for the whole book and for each page.

- **Kept** rules are written out unchanged.
- **Frozen** rules are ones the conversion would otherwise have broken (by removing an empty
  paragraph, splitting a chapter, adding a heading link and so on). They're rewritten to match the
  same elements as before. "Frozen by step" says which step caused it, either `cleanup`,
  `splitting`, `permalink` or `table wrapper`.
- **Unapplied** rules didn't match anything in the source either. These are usually styles for
  content in other files, so they're listed but aren't a problem in themselves.
- **Fonts and images copied** for those rules, with their sizes. If a font couldn't be copied (for
  example, because it's encrypted in a way we don't support), that's a warning.

### Audio

This section is there for narrated books.

- The source and converted audio sizes, and the encoding (mode, format, channels, sample rate and
  bitrate).
- The **maximum encoder duration difference**, which is how far an encoded page's length is from
  what its cues add up to. It's normally a few milliseconds at most. Over 0.1 s is a warning in the
  log.
- **Cleanup**, whether it's on or off, the loudness target and true peak limit, and the filters
  used.
- The **loudness range before cleanup**, which is how much the pages' loudness varied before
  normalizing.
- **For each page**, its loudness (LUFS), peak (dBFS), the quietest stretch (an estimate of the
  noise floor) and how many samples are clipped.

### Changes

Each kind of change, with its total and the count for each page.

| Change | What it means |
|---|---|
| Book styles kept as reader classes (*property*) | A style that carries meaning (alignment, indents, emphasis and so on) was kept as a reader class, so it shows in My settings too |
| Book writing styles kept (*name*) / (*mode* text) | Vertical or right-to-left writing, emphasis marks, text orientation and so on were kept |
| Book writing styles not kept (a text string as the emphasis mark) | An emphasis mark given as a text string, which browsers can't show consistently |
| Chapter boundaries kept outside blocks | A chapter split fell inside a block, so the block was kept whole, on one page |
| Controls added to publication media | Audio or video in the book had no controls |
| Publication media autoplay removed | Audio or video in the book would have played on its own |
| Heading titles made visible / Redundant heading titles removed / Duplicate title-only headings removed | A heading's `title` attribute was shown as its text when the heading was empty, or dropped when it repeated the text, or an empty heading that only repeated the one next to it was removed |
| Empty heading permalinks omitted | Empty headings don't get a link to themselves |
| Empty paragraphs removed / Empty spans unwrapped | Markup with no content and no purpose |
| Publisher-styled empty paragraphs retained / Publisher-styled spans retained | The same, but the publisher's CSS uses them, so they were kept. The paragraphs only show in As published |
| Header cells given row/col scope | Table header cells that didn't say what they're headers for |
| Language attributes copied from xml:lang / Ineffective xml:lang attributes removed | HTML ignores `xml:lang`, so its value was moved to `lang` where the text matches |
| Nested main landmarks changed to div | The reader has its own `main` |
| Numbered equations given responsive layout | An equation and its number were laid out to wrap on narrow screens |
| Positive tabindex values changed to 0 | Positive values change the keyboard order |
| Tables given responsive scrolling wrappers | Wide tables scroll sideways on narrow screens |

### Warnings

Each kind of warning, then for each page how many there are, with up to three examples. These are
problems in the source. The converter doesn't fix them, because it doesn't guess at a book's
structure. Fix them in the EPUB and convert it again.

| Warning | What was found | What to do |
|---|---|---|
| Headings | An empty heading, a heading that's only an image, or a skipped level (h2 to h4) | Fix the headings in the EPUB |
| Paragraphs resembling headings | A short paragraph that's all bold | If it's a heading, mark it as one |
| Paragraphs resembling list items | A paragraph that starts with a bullet or "1." (outside notes) | If it's a list, mark it as one |
| Link text | A link whose text is a bare URL, "here", "click here" or "more" | Give the link text that says where it goes |
| Inline SVG | An SVG with no title or accessible name | Add a `<title>`, or hide it if it's decorative |
| Data tables without headers | A table with several rows and columns but no header cells | Mark the header cells |
| Tables resembling layout | A one-row or one-column table without headers | Check it isn't being used for layout, and use CSS instead if it is |
| Images without alt | Images with no `alt` attribute | Add alternative text, or `alt=""` if they're decorative |
| Decorative images | 90% or more of five or more images have an empty `alt` | Check that they really are all decorative |
| Element language | Elements whose `xml:lang` doesn't match the script of their text | Check the language tags |
| Book language | Most of the book's text isn't in the script its language suggests | Check the metadata, or use `--language` |
| Renamed ids | An id clashed with one of the reader's own and was renamed | Nothing, unless something outside the book links to it |
| Broken links | A link to a page, file or anchor that isn't in the converted book | Fix the link in the EPUB |
| Book stylesheet / Publisher styles selector / Publisher styles font not copied | CSS the converter couldn't read, a selector it couldn't match, or a font it couldn't copy | Usually cosmetic, and only in As published. Check the page |
| Audio clipping | Samples at or near full scale | Cleanup can't undo clipping. The recording itself is clipped |
| Audio noise floor | The quietest stretch is above −35 dBFS | Try `--audio-enhance noise` |
| Audio level | A page more than 6 LU from the book's median loudness | Listen to that page |

The analysis is in [`analyzeWarnings`](../convert/src/markup-cleanup.ts#L221) and
[`finishBookWarnings`](../convert/src/conversion-report.ts#L112). Audio warnings are in
[`addAudioReport`](../convert/src/convert.ts#L244), and broken links in
[`reportBrokenLinks`](../convert/src/convert.ts#L324).

### Optional checks

Ace and axe say "not requested" unless you convert with `--check`. With it, Ace checks the EPUB and
axe checks the converted pages, if they're installed. "Skipped" means one of them wasn't found, or its report was missing or couldn't be read
([`optional-checks.ts`](../convert/src/optional-checks.ts)).

The browser converter can't run them, or EPUBCheck. Its report adds a `validation` entry saying that
the person converting confirmed the EPUB passes EPUBCheck.

## The log

`output.log` has everything the converter said while converting, each with its time and level
(`info` or `warn`). It's set up in
[`logger/index.ts`](../convert/src/logger/index.ts), and the same messages go to the terminal.

Some things to look for:

- `Split <file> into N pages at its table of contents entries` is chapter splitting (step 3).
- `Every page is titled with the book title, so pages are titled by their first other heading`.
- `Rendering <page>` and `Merging audio clips into <file>` appear once per page, in order. They're
  handy for seeing where a slow or failed conversion was.
- Some warnings are only in the log, not the report. A narration target that wasn't found (its clip
  goes to the document's first page), a page whose encoded audio is more than 0.1 s off from its
  cues, loudness that couldn't be measured, a cover that couldn't be made into a favicon, and a
  damaged EPUB archive being repaired.
- When a conversion fails, no book is written, and the staging folder is deleted along with its
  log. The error is shown in the terminal.
