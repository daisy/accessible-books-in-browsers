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

## Shims

[`entry.js`](entry.js) imports `convert()` from `convert/build`, the command-line converter's
compiled TypeScript. [`build.mjs`](build.mjs) bundles it with esbuild, and points each Node module
it uses at a stand-in in [`shims/`](shims/). The shims hold the only browser-specific code: change
one when the converter starts using a Node call it doesn't have yet. A call a shim doesn't cover
fails, rather than doing something different.

| Shim | Stands in for | What it does, and its limits |
|---|---|---|
| [`fs.js`](shims/fs.js) | `fs`, `fs-extra`, `fs/promises`, `graceful-fs` | An in-memory file system (a map of POSIX paths to bytes), with the sync, promise and fs-extra calls the converter and the libraries it bundles (chardet, iconv-lite) use. The page reads the output from it (`vfs`). `openSync` throws. |
| [`chardet-fs.js`](shims/chardet-fs.js) | chardet's own file reading (`./fs/node`, swapped in by a plugin in `build.mjs`) | Points chardet at `fs.js`. |
| [`jsdom.js`](shims/jsdom.js) | `jsdom` | `new JSDOM(source, { contentType }).window.document`, on the browser's own `DOMParser`: HTML by default, as jsdom, and XML for an XML `contentType`. `serialize()` adds the doctype. `getComputedStyle` returns nothing. **The browser's parser isn't jsdom's, so this is where the two converters' output is most likely to differ.** |
| [`ffmpeg-wasm.js`](shims/ffmpeg-wasm.js) | `fluent-ffmpeg` | Builds the command line fluent-ffmpeg would, and runs it through the runner. Probing reads a WAV file's header itself, and uses ffprobe for anything else. |
| [`child-process-wasm.js`](shims/child-process-wasm.js) | `child_process.spawn('ffmpeg', …)` | For the audio cleanup (`audio-cleanup.ts`), which reads loudness and statistics from FFmpeg's stderr. Runs the command through the runner and hands back its log. |
| [`ffmpeg-wasm-runner.js`](shims/ffmpeg-wasm-runner.js) | (used by the two above) | Runs FFmpeg commands in ffmpeg.wasm from `vendor/`, one at a time and single-threaded (threads need cross-origin isolation, which GitHub Pages can't set up). Copies input files in and output back. Restarts ffmpeg.wasm every 40 commands, and retries a command once after a crash. Clip cuts (`atrim` to a WAV) skip FFmpeg: the browser decodes each source once and cuts the samples, lined up with FFmpeg's decoding (`entry.js` turns off the converter's own range decoding for this). When ffprobe fails, it decodes the file to get its length (to 10 ms). |
| [`crypto.js`](shims/crypto.js) | `crypto` | `createHash` for sha1 and sha256, synchronous, from `@noble/hashes`. Other algorithms throw. |
| [`extract-zip.js`](shims/extract-zip.js) | `extract-zip` | Unzips the EPUB into `fs.js` with fflate. |
| [`tmp.js`](shims/tmp.js) | `tmp` | Temporary files and folders under `/tmp` in `fs.js`. Nothing is cleaned up automatically. The converter removes each page's audio folder itself. |
| [`winston.js`](shims/winston.js) | `winston`, `logform` | Messages are kept in `log` (and passed to `globalThis.spikeLog`, if a page sets it; this one doesn't), not written to a file. Formats do nothing. |
| [`globals.js`](shims/globals.js) | the `Buffer` and `process` globals | Injected into the bundle: `Buffer` from the `buffer` package, and a minimal `process` with no environment variables (the page passes the update channel itself, `UI_CHANNEL` in `page.js`). |
| [`node-stubs.js`](shims/node-stubs.js) | `os`, `url`, `node:module`, `node:child_process`, `@ffmpeg-installer/ffmpeg`, `ffmpeg-static` | The few harmless values the converter reads (`tmpdir`, `EOL`, file URL conversion). Anything else throws "not available in the browser converter", so a new Node dependency shows up at once. |

`path` is the `path-browserify` package, not a shim. The bundle defines `global` as `globalThis`.

## Rebuilding

After changing the converter (`convert/`) or the reader template:

    cd convert && npm run build
    cd ../converter && npm install && npm run build

Commit `dist/` (the bundle, the packed reader template and the converter's version) and `vendor/`
(fflate and ffmpeg.wasm, copied from `node_modules`). GitHub Pages publishes files as they are and
builds nothing.

To try it locally, serve this folder, for example with `npx http-server converter -c-1`. The
preview needs a service worker, so use `localhost` or https.
