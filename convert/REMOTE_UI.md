# Beta remote reader UI

Reader updates use the beta channel by default: `https://webbook.daisy.org/ui/releases/v0/`.
That's a stable URL, so the files can move without changing any book: `https://webbook.daisy.org/ui/*`
redirects (302, `Cache-Control: public, max-age=3600`, `Access-Control-Allow-Origin: *`) to
`https://daisy.github.io/accessible-books-in-browsers/ui/*`, where the release workflow publishes
them, and later to a CDN. In the channel folder, `current.json` names the current release, and
each release is a folder named by its version: `v0/current.json`, `v0/2026-11-20/main.js`. The redirect needs the CORS header itself: browsers check it on the
redirect, and without it every book quietly uses its own reader. Saving for offline follows the
redirect for release files only (they're checked against the release's hashes), and stores them
under the stable URL. `scripts/check-ui-channel-network.mjs` tests the redirect, timeouts,
failures, connection speeds, offline saving and books with updates off. The command-line converter always
announces this choice and explains `--no-remote-ui`, which selects a fixed bundled reader.
`--ui-base-url https://your-channel.example/releases/v0/` selects a different channel and conflicts with
`--no-remote-ui`. `--remote-ui` explicitly selects the default; `WEBBOOK_UI_BASE_URL` can change
that default for a deployment. The conversion report records either the channel or the fixed
bundled choice. The browser converter presents Reader updates as a visible required choice with
the channel preselected. Keep the source EPUB: a different contract requires reconversion.

Every channel-enabled book keeps its local reader. A valid channel release loads its CSS and exported
`init()` together; download, CORS, CSP and compatibility failures select the complete local
reader. Startup crashes reload cleanly into local UI, then the plain baseline if local startup
also fails. Flags and URL fallbacks prevent loops even when storage is blocked. Nothing hides
the publication while loading. The inline bootstrap is prebuilt and readable by `npm run compile`, using the same bytes as its
external copy. Pure decisions in `bootstrap-policy.js` have unit tests; no untested copy of the
policy is maintained in the frozen script. Conversions copy the prebuilt bundle, keeping the shared
conversion code browser-compatible. The inline bootstrap has a local external copy for CSPs that
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
are removed from the address bar. About’s Reader updates section shows any saved override
and offers **Return to automatic updates**, keeping the reading position through the reload.
Auto also clears internal URL crash guards. Storage keys are scoped to the book root (not origin-wide).
Local overrides use the bundled worker/core and UI. Testing overrides require any uncached
release to be available online and do not rewrite saved content.

An offline snapshot's UI descriptor is consulted before channel state. The lightweight
`saved-ui` worker command avoids scanning every cached book resource just to choose a reader.
An uncertain/timed-out worker reply selects local fallback, rather than risking the latest
channel UI over an unknown saved generation. Older workers use a feature-detected status reply.
A saved book keeps its complete saved release, online or offline. Check/Refresh downloads a
replacement release and content alongside the current copy; activation remains explicit.
Closing other book tabs is required. Workers remain local; compatible local worker updates wait normally; there is no forced
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
Every remote selection requires SHA-256 hashes from `ui-files.json` before script or stylesheet
loading, even when current.json omits its optional integrity fields. Pinned releases fetch their
inventory; saved releases use the verified file hashes stored with the saved descriptor. Missing
or inconsistent hashes select the complete local reader. CSS uses mandatory SRI; JS bytes are
verified before importing a module Blob URL (a CSP blocking that URL selects local UI). The
release manifest also publishes integrity fields; they must agree with the inventory.

Classic `importScripts` cannot enforce SRI before execution. The current reader therefore uses
bundled service/download workers, including when its page UI is remote. The saved release still
includes a checked worker bundle, but that remote bundle is not executed. Remote worker updates
must wait for a delivery mechanism that can guarantee pre-execution integrity; the old bridge
remains an explicitly testable compatibility API, not the channel reader's loading path.

## Publish in this repository

The user selected `daisy/accessible-books-in-browsers`, rather than the earlier separate-repo
proposal. Its existing Pages configuration serves `main` at `/`. The release workflow retains
channel files in `ui/releases/v0/` and changes no demo files. A GitHub Release tagged `ui-v0-YYYY-MM-DD`
builds/checks the tagged source, compares any existing immutable assets, then commits the new
release, its receipt and `current.json` on main. The workflow explicitly requests a legacy Pages
build because token-authored commits do not trigger that build by themselves.

Before enabling publication, configure required reviewers on the `ui-channel-release` GitHub
environment and permit its reviewed commit to main under the repository's branch rules. The
workflow never bypasses branch protection. A manual dispatch supports release/rollback/local.
Artifacts retain the built channel; GitHub Releases record the tag and notes. Readers load files
from Pages, not GitHub Release downloads. Keep all previous versions on main. Each bot release commit advances remote main: before your
next local push, run `git pull --ff-only` (or reconcile any local commits explicitly). If branch
protection disallows the bot’s push, publication stops; use an approved PR-based release path or
a separate publishing branch/repository rather than bypassing protection. Sharing the repository
was the user's choice; it trades simpler hosting for this coordination with ordinary development.

After publication, verify `current.json` and the release files at the real Pages URL: MIME/CORS,
cache propagation, rollback, CSP, offline/save/update and browser behavior. No live channel is
published by merely implementing this code. Real iPhone/Safari media and spoken VoiceOver/NVDA
checks remain human release checks; desktop automation cannot establish them.

References: [GitHub Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages),
[requesting a Pages build](https://docs.github.com/en/rest/pages/pages#request-a-github-pages-build),
[esbuild bundling](https://esbuild.github.io/api/#bundle).
