# Beta remote reader UI

Remote delivery is opt-in. Convert with `--remote-ui` to use
`https://daisy.github.io/accessible-books-in-browsers/v0/`, or supply
`--ui-base-url https://your-channel.example/v0/`. The latter also enables remote delivery.
`WEBBOOK_UI_BASE_URL` can override the default for `--remote-ui`. Ordinary conversions make no
channel requests. Keep the source EPUB: a different book contract requires reconversion.
The converter prints a beta warning and records it at the top of the conversion report.

Each opted-in book keeps its local reader. A valid channel release loads its CSS and exported
`init()` together; download, CORS, CSP and compatibility failures select the complete local
reader. Startup crashes reload cleanly into local UI, then the plain baseline if local startup
also fails. Flags and URL fallbacks prevent loops even when storage is blocked. Nothing hides
the publication while loading. The inline bootstrap has a local external copy for CSPs that
permit only same-origin scripts. Reader code must have no startup side effects at import time.

The channel's publisher can run JavaScript with the book's origin privileges, including access
to reading settings. Protect repository access and the release environment. Channel requests
expose network information such as IP address; opted-in pages use `no-referrer` to avoid sending
the book URL. Manifest/SRI hashes detect corruption, not compromise of the channel account.

## Book files and source records

Content pages contain main text, real navigation links, previous/next links, native narration
with cues, the permanent live regions, provenance, styles and bootstrap. `toc.html`, `about.html`
and optional `pages.html` are ordinary standalone pages. They remain useful without JavaScript,
without popovers and from `file://`. The reader builds its chrome from its own UI shell and those
navigation documents before initializing features. Failed navigation fetches keep ordinary
links; books with no print-page list have no Go to page control. Navigation filenames are
reserved; source chapters named `about.xhtml`, for example, become `about-content.html` and
all internal links are rewritten normally.

`about.html` attributes the original EPUB's metadata to its source and preserves all metadata
XML, including contributor-role refinements. Every content page has `webbook-source` metadata;
the JSON/Markdown reports record source filename, identifier and converter package version.
The authoring template's hook checks remain internal to the converter; shipped controls are
reader-owned, not frozen content hooks. Existing books with embedded controls are detected and
continue to work, but a remote bootstrap cannot be retrofitted without changing their files.

## Overrides and saved books

Use `?webbook-ui=local`, `remote`, `release:VERSION`, or `auto`. Local persists for that book;
remote/release testing persists for the tab, and auto clears overrides. Valid override parameters
are removed from the address bar. Storage keys are scoped to the book root (not origin-wide).
Local overrides use the bundled worker/core and UI. Testing overrides require any uncached
release to be available online and do not rewrite saved content.

An offline snapshot's UI descriptor is consulted before channel state. The lightweight
`saved-ui` worker command avoids scanning every cached book resource just to choose a reader.
An uncertain/timed-out worker reply selects local fallback, rather than risking the latest
channel UI over an unknown saved generation. Older workers use a feature-detected status reply.
A saved book keeps its complete saved release, online or offline. Check/Refresh downloads a
replacement release and content alongside the current copy; activation remains explicit.
Closing other book tabs is required. Worker updates wait normally; there is no forced
`skipWaiting`. The fixed root `sw.js` is unchanged.

## Build, check and promote

From the repository root:

```sh
npm ci --prefix convert
npm run compile --prefix convert
node convert/scripts/build-ui-release.mjs /tmp/ui-channel/v0 2026-11-17
node convert/scripts/check-ui-release.mjs /tmp/ui-channel/v0 2026-11-17
node convert/scripts/promote-ui-release.mjs /tmp/ui-channel/v0 2026-11-17
```

The check uses an installed Chrome (`CHROME_PATH` can select it), two actual origins, freshly
converted text/narrated fixtures, cold offline navigation and audio ranges, fallback/crash and
override scenarios, plus axe in both appearances and no-JavaScript states. It writes a receipt
bound to the complete inventory bytes. Promotion verifies the receipt and rehashes every asset.
A failed build/check does not change `current.json`. An existing release cannot be overwritten.
The manifest archive and checks live alongside retained release directories.

A release includes `main.js` (all static/lazy module imports bundled), `style.css`, the classic
`offline-worker.js` factory bundle, and `ui-files.json` with hashes, sizes and inventory revision.
The main bundle embeds its own reader shell. Book data always resolves against the book URL.
The complete local fallback and selected remote release are included when saving offline.

For rollback, promote an earlier retained, checked version. To select bundled local UI globally:

```sh
node convert/scripts/promote-ui-release.mjs /tmp/ui-channel/v0 --local
```

`current.json` is mutable; all release directories are retained. Cached channel changes apply
on the next page view for unsaved books. Saved books wait for an explicit update. A release's
`contract` must be 0 and `minBootstrap` must be 1; unsupported offline protocols use fallback.
Optional SHA-256 integrity fields are supported for CSS and bundled JS; JS is verified before
execution through a module Blob URL (a CSP that blocks that URL selects local UI).

## Publish in this repository

The user selected `daisy/accessible-books-in-browsers`, rather than the earlier separate-repo
proposal. Its existing Pages configuration serves `main` at `/`. The release workflow retains
channel files in `v0/` and changes no demo files. A GitHub Release tagged `ui-v0-YYYY-MM-DD`
builds/checks the tagged source, compares any existing immutable assets, then commits the new
release, its receipt and `current.json` on main. The workflow explicitly requests a legacy Pages
build because token-authored commits do not trigger that build by themselves.

Before enabling publication, configure required reviewers on the `ui-channel-release` GitHub
environment and permit its reviewed commit to main under the repository's branch rules. The
workflow never bypasses branch protection. A manual dispatch supports release/rollback/local.
Artifacts retain the built channel; GitHub Releases record the tag and notes. Readers load files
from Pages, not GitHub Release downloads. Keep all previous versions on main.

After publication, verify `current.json` and the release files at the real Pages URL: MIME/CORS,
cache propagation, rollback, CSP, offline/save/update and browser behavior. No live channel is
published by merely implementing this code. Real iPhone/Safari media and spoken VoiceOver/NVDA
checks remain human release checks; desktop automation cannot establish them.

References: [GitHub Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages),
[requesting a Pages build](https://docs.github.com/en/rest/pages/pages#request-a-github-pages-build),
[esbuild bundling](https://esbuild.github.io/api/#bundle).
