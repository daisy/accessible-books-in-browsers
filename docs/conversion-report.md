# The conversion report and log

Every conversion writes three files next to the web book:

- `conversion-report.md`: the report, to read;
- `conversion-report.json`: the same report, for tools;
- `output.log`: what the converter did, step by step.

The report says what the converter changed and what it found worth a person's review. It is not
a validation: the converter expects an EPUB that already passes EPUBCheck and Ace, and the report
doesn't replace running them. How each step works is in [How a book is converted](conversion.md).

The report is built by [`ConversionReport`](../convert/src/conversion-report.ts#L53) and written by
[`writeConversionReport`](../convert/src/conversion-report.ts#L146).

## The report, section by section

### Beta warning and source

With a UI channel (`--remote-ui` or `--ui-base-url`), the report opens with a warning that the book
loads its interface from the beta channel, whose address and releases may change.

Then the source record: the EPUB's file name, its identifier and the converter's version. Keep the
source EPUB: a future reader contract means converting again from it. Every page carries the same
record in its `webbook-source` meta.

### Summary line

`Changes: 6193. Warnings for review: 98. Optional checks: Ace not requested, axe not requested.`

Changes are small mechanical edits to the markup, each counted. Warnings are findings to look at.
Neither means the conversion failed: a conversion that fails writes no book at all.

### Options used

The language the EPUB declares, the language used (different only with `--language`), and every
option that affects the output, with its value. Use it to reconvert the same way.

### Publisher styles (As published)

Present unless `--no-publisher-styles`. Counts of the publisher's CSS rules, for the whole book and
per page:

- **Kept:** rules written out unchanged.
- **Frozen:** rules that the conversion would otherwise have broken (by removing an empty
  paragraph, splitting a chapter, adding a heading link and so on), rewritten to match the same
  elements as before. "Frozen by step" says which step caused it: `cleanup`, `splitting`,
  `permalink` or `table wrapper`.
- **Unapplied:** rules that matched nothing in the source either. Usually styles for content in
  other files; listed, not a problem in itself.
- **Fonts and images copied** for those rules, with their sizes. A font that couldn't be copied
  (for example, encrypted by an unsupported scheme) is a warning.

### Audio

Present for narrated books:

- source and converted audio sizes, and the encoding (mode, format, channels, sample rate, bitrate);
- **maximum encoder duration difference:** how far an encoded page's length is from the length its
  cues add up to. Normally under a few milliseconds; over 0.1 s is a warning in the log;
- **cleanup:** on or off, the loudness target and true peak limit, and the filters used;
- **loudness range before cleanup:** how much the pages' loudness differed before normalizing;
- **per page:** loudness (LUFS), peak (dBFS), the quietest stretch (an estimate of the noise floor)
  and the number of clipped samples.

### Changes

Each kind of change, with its total and per-page counts. The kinds:

| Change | What it means |
|---|---|
| Book styles kept as reader classes (*property*) | A style that carries meaning (alignment, indents, emphasis…) kept as a reader class, so it shows in My settings too |
| Book writing styles kept (*name*) / (*mode* text) | Vertical or right-to-left writing, emphasis marks, text orientation and the like, kept |
| Book writing styles not kept (a text string as the emphasis mark) | An emphasis mark given as a text string, which browsers can't show consistently |
| Chapter boundaries kept outside blocks | A chapter split fell inside a block; the block was kept whole, on one page |
| Controls added to publication media | Audio or video in the book had no controls |
| Publication media autoplay removed | Audio or video in the book would have played by itself |
| Heading titles made visible / Redundant heading titles removed / Duplicate title-only headings removed | A heading's `title` attribute: shown as its text when the heading was empty, dropped when it repeated the text, or an empty heading that only repeated its neighbor removed |
| Empty heading permalinks omitted | Empty headings get no self-link |
| Empty paragraphs removed / Empty spans unwrapped | Markup with no content and no purpose |
| Publisher-styled empty paragraphs retained / Publisher-styled spans retained | The same, but the publisher's CSS uses them: kept, the paragraphs shown only As published |
| Header cells given row/col scope | Table header cells that didn't say what they head |
| Language attributes copied from xml:lang / Ineffective xml:lang attributes removed | HTML ignores `xml:lang`; its value moved to `lang` where the text agrees |
| Nested main landmarks changed to div | The reader owns the page's `main` |
| Numbered equations given responsive layout | An equation and its number laid out to wrap on narrow screens |
| Positive tabindex values changed to 0 | Positive values reorder keyboard navigation |
| Tables given responsive scrolling wrappers | Wide tables scroll sideways on narrow screens |

### Warnings

Each kind, then per page: how many, with up to three examples. These are found in the source;
the converter doesn't fix them (it doesn't guess at a book's structure). Fix them in the EPUB and
convert again.

| Warning | What was found | What to do |
|---|---|---|
| Headings | An empty heading, a heading that's only an image, or a level skipped (h2 to h4) | Fix the headings in the EPUB |
| Paragraphs resembling headings | A short paragraph that's entirely bold | If it's a heading, mark it as one |
| Paragraphs resembling list items | A paragraph starting with a bullet or "1." (outside notes) | If it's a list, mark it as one |
| Link text | A link whose text is a bare URL, "here", "click here" or "more" | Give the link text that says where it goes |
| Inline SVG | An SVG with no title or accessible name | Add a `<title>`, or hide it if decorative |
| Data tables without headers | A table with several rows and columns but no header cells | Mark the header cells |
| Tables resembling layout | A one-row or one-column table without headers | Check it isn't layout; use CSS instead |
| Images without alt | Images with no `alt` attribute | Add alternative text, or `alt=""` if decorative |
| Decorative images | 90% or more of five or more images have empty `alt` | Check they really are all decorative |
| Element language | Elements whose `xml:lang` disagrees with the script of their text | Check the language tags |
| Book language | Most of the book's text isn't in the script its language implies | Check the metadata, or use `--language` |
| Renamed ids | An id clashed with one of the reader's own and was renamed | Nothing, unless something outside the book links to it |
| Broken links | A link to a page, file or anchor that isn't in the converted book | Fix the link in the EPUB |
| Book stylesheet / Publisher styles selector / Publisher styles font not copied | CSS the converter couldn't read, a selector it couldn't match, a font it couldn't copy | Usually cosmetic, As published only; check the page |
| Audio clipping | Samples at or near full scale | Cleanup can't restore clipped sound; the recording is clipped |
| Audio noise floor | The quietest stretch is above −35 dBFS | Try `--audio-enhance noise` |
| Audio level | A page more than 6 LU from the book's median loudness | Listen to that page |

The analysis is in [`analyzeWarnings`](../convert/src/markup-cleanup.ts#L221) and
[`finishBookWarnings`](../convert/src/conversion-report.ts#L112); audio warnings in
[`addAudioReport`](../convert/src/convert.ts#L227); broken links in
[`reportBrokenLinks`](../convert/src/convert.ts#L307).

### Optional checks

Ace and axe: "not requested" unless converted with `--check`. With it, Ace checks the EPUB and axe
the converted pages, if they're installed; "skipped" means one wasn't found
([`optional-checks.ts`](../convert/src/optional-checks.ts)).

The browser converter can't run them, nor EPUBCheck. Its report adds a `validation` entry saying
EPUBCheck was confirmed by the person converting.

## The JSON report

The same content as the Markdown, in this shape ([`ConversionReportData`](../convert/src/conversion-report.ts#L20)):

```
{
  "version": 1,
  "language": { "declared", "override"?, "effective" },
  "options": { "<option>": value, … },
  "changes": [ { "kind", "count", "pages": { "<page>": count } } ],
  "warnings": [ { "kind", "page"?, "message" } ],
  "checks": [ { "name": "Ace" | "axe", "status", "detail" } ],
  "publisherStyles"?: { "pages": { "<page>": counts }, "totals": counts },
  "audio"?: { "mode", "sourceBytes", "outputBytes", "settings", "maximumEncoderDriftSeconds", "cleanup" },
  "provenance"?: { "source", "identifier", "converter" },
  "betaWarning"?: "…",
  "validation"?: { "epubcheck", "converterChecks" }    (browser converter only)
}
```

`version` changes if the shape does.

## The log

`output.log` is everything the converter said while converting, each entry with its time and level
(`info` or `warn`; `error` when a conversion fails). Set up in
[`logger/index.ts`](../convert/src/logger/index.ts); the same messages go to the terminal.

Worth knowing:

- `Split <file> into N pages at its table of contents entries`: chapter splitting (step 3).
- `Every page is titled with the book title, so pages are titled by their first other heading`.
- `Rendering <page>` and `Merging audio clips into <file>`: one per page, in order; useful for
  seeing where a slow or failed conversion was.
- Warnings that aren't in the report: a narration target that wasn't found (the clip goes to the
  document's first page), a page whose encoded audio differs from its cues by more than 0.1 s,
  loudness that couldn't be measured, a cover that couldn't be made into a favicon, a damaged EPUB
  archive being repaired.
- When a conversion fails, the error is the last entry, and no book is written.
