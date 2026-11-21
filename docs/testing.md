# Testing

Every test and check, what it covers, and how to run it. All commands are from the repository
root, after `npm ci` in `convert/` (and in `converter/` for the browser converter's check).

Before committing, run both unit test folders. The others are for changes in their area, and CI
runs most of them.

| Check | What it covers | Run it | In CI |
|---|---|---|---|
| Converter tests ([`convert/tests/`](../convert/tests/)) | The converter, through its built command line and its modules: conversion rules, markup cleanup, styles, splitting, ids, audio, the report, output paths, scripts removed from books, resources (encoded names, the book's own media), releases and reader update choices | `cd convert && npm run build && node --test tests/*.test.mjs` | [Tests](../.github/workflows/tests.yml), on every push and pull request |
| Reader tests ([`convert/template/test/`](../convert/template/test/)) | The reader's own code, without a browser: color contrast, page colors, search, bookmarks, settings files, offline resources, the update bootstrap's decisions, agent tools and so on | `cd convert && node --test template/test/*.test.mjs` | [Tests](../.github/workflows/tests.yml) |
| Accessibility ([`check-accessibility.mjs`](../convert/scripts/check-accessibility.mjs)) | axe-core, for WCAG 2.2 A and AA, on every page of the converted books in a folder (the demos by default). Each book's first page is also checked in each preset color, with the panels that are there open, and in a simulation of the plain layout (the reader's scripts are blocked, but JavaScript stays on for axe, so the inline bootstrap still runs). The math book is spot-checked on two pages only, because it's so large | `cd convert && npm run check:a11y` (or `node scripts/check-accessibility.mjs <folder> [--pages N] [--width N] [--report file.json]`) | [Accessibility check](../.github/workflows/accessibility.yml), when `demos/` or `convert/` change |
| Browser converter ([`check-converter.mjs`](../converter/check-converter.mjs)) | The built browser converter in Chrome, on small EPUBs it makes: a conversion, the book's scripts removed, file names that lead outside the book refused, memory cleared after each conversion (failed ones too), the preview serving encoded names, media and the contents link, and no offline saving in a preview. Narration isn't checked: ffmpeg.wasm takes minutes. `ONLY=name` runs only the checks whose names include it | `node converter/check-converter.mjs`, after rebuilding both (see [Rebuilding](../converter/README.md#rebuilding)) | [Browser converter is up to date](../.github/workflows/browser-converter.yml), which first checks that `converter/dist/` matches the source |
| Reader release ([`check-ui-release.mjs`](../convert/scripts/check-ui-release.mjs)) | A built reader release, before it can be promoted: freshly converted test books on two origins, offline saving and audio ranges, fallbacks, crashes and overrides, and axe at phone and desktop widths, in both appearances and without JavaScript. Writes the receipt that promotion needs | See [Build, check and promote](../convert/REMOTE_UI.md#build-check-and-promote) | [The release workflow](../.github/workflows/ui-release.yml), when a release is made |
| Update channel network ([`check-ui-channel-network.mjs`](../convert/scripts/check-ui-channel-network.mjs)) | How books reach a release through the stable URL: redirects, timeouts, failures part way through, connection speeds, saving for offline through the redirect, what the console and About say, and books with updates off never contacting the channel. `ONLY=pattern` runs some checks, and `DEBUG=1` logs more | After building a release: `cd convert && node scripts/check-ui-channel-network.mjs <channel-folder> <version>` | No: run it when the bootstrap, the channel or offline saving changes |

**What they need:**
- **Chrome or Chromium,** for everything but the two unit test folders. Set `CHROME_PATH`, or they
  look in the usual places.
- **`openssl`,** for the network check, which makes a throwaway certificate.

**At conversion time:** `--check` runs Ace on the EPUB and axe on the converted book, and puts the
results in the report. It never stops a conversion. See
[Optional checks](conversion-report.md#optional-checks).
