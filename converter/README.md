# Browser converter

Converts an EPUB into a web book in the browser, with nothing uploaded (plan 19). Published with the
rest of this repository on GitHub Pages, at `converter/`.

How it works:
- **The converter itself is unchanged.** `convert/build` is bundled with stand-ins for the Node
  modules it uses (`shims/`): an in-memory file system, the browser's DOM parser for jsdom, and
  ffmpeg.wasm for FFmpeg.
- **Narration:** the browser decodes each narration file once and cuts the clips, lined up sample
  for sample with FFmpeg's decoding. ffmpeg.wasm does the fades, joins, cleanup and encode.
- **The page:**
  - basic EPUB checks, plus a confirmation that the EPUB passes EPUBCheck, which can't run in a
    browser;
  - the converter's options;
  - a preview of one of the book’s content documents (often a chapter), optionally with its first 5 minutes of narration only;
  - the whole book, as a zip download.
- Computers only: narrated books need more memory than phones and tablets have.

How a book is converted is in [docs/conversion.md](../docs/conversion.md). The measurements behind
this design are in plan 19's findings (`.claude/`, not published).

## Rebuilding

After changing the converter (`convert/`) or the reader template:

    cd convert && npm run build
    cd ../converter && npm install && npm run build

Commit `dist/` (the bundle, the packed reader template and the converter's version) and `vendor/`
(fflate and ffmpeg.wasm, copied from `node_modules`). GitHub Pages publishes files as they are and
builds nothing.

To try it locally, serve this folder, for example with `npx http-server converter -c-1`. The
preview needs a service worker, so use `localhost` or https.
