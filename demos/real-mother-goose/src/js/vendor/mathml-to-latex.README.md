# mathml-to-latex

Pinned npm release: 1.8.0, MIT (Alexandre Nunes, copyright 2020).
Upstream: https://github.com/asnunes/mathml-to-latex
Package: https://registry.npmjs.org/mathml-to-latex/-/mathml-to-latex-1.8.0.tgz
Archive integrity: `sha512-gQ0uK3zqB8HwlfaXJkEL5rgaZNbKUiBMmBP/B/W+b+t6KcseLSuYb1b0BjLgS9ZiQa24ePkqTX8/6FaQuDL7wQ==`

`mathml-to-latex.js` is the release's `dist/index.mjs`, with its one external
DOMParser import replaced by the browser's native DOMParser. The MIT license is
included in the file. The reader passes serialized, well-formed MathML; it does not
need the dependency's recovery of malformed Word XML. No other upstream code is
changed. Size with the license/adaptation: 169,560 bytes;
gzip: 36,975 bytes. Loaded on the first copy
that needs MathML-to-LaTeX conversion, never on page load.

To update, download a pinned npm tarball, verify its npm integrity, retain its
license, repeat the one-line browser adaptation and run the copy-math tests.
