# Documentation

These docs are for people working on the project. The main [README](../README.md) covers what the
reader does and how to run the converter.

- [How a book is converted](conversion.md) goes through the converter's steps, with links to the
  code and the reasons behind each decision.
- [The conversion report and log](conversion-report.md) explains each part of the report, and what
  to do about each warning.
- [How the reader works](reader.md) explains how the reader is built, and where each feature's code
  is.
- [The v0 contract](../convert/contracts/v0.md) describes what a converted book contains. The reader
  and the converter both rely on it.
- [Testing](testing.md) lists every test and check: what it covers, how to run it, and which
  ones CI runs.
- [The update channel](../convert/REMOTE_UI.md) explains how books load newer reader releases, and
  how releases are built, checked and published.
