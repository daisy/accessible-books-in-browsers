# Conversion report

Changes: 0. Warnings for review: 6. Optional checks: Ace not requested, axe not requested.

## Options used

- Declared language: en-US
- Effective language: en-US
- split chapters: true
- heading titles: true
- markup cleanup: true
- responsive tables: true
- small audio: true
- audio cleanup: true
- audio enhancements: warm-eq,compression,noise,deess,declick
- keep all ids: false
- optional checks: false

## Audio

Source audio: 8.7 MB. Converted audio: 5.4 MB.
Mode: small audio (mp3). Maximum encoder duration difference: 0.000 seconds.
- MP3, mono, 24000 Hz, 32 kb/s (libmp3lame)

Cleanup: on; target -18 LUFS, true peak -1.5 dBTP.
Filters: 5 ms fades at joins, asubcut=cutoff=90:order=10, acrossover=split=200[lo][hi];[lo]acompressor=threshold=0.015:ratio=20:attack=0.1:release=40:knee=2[loc];[loc][hi]amix=inputs=2,volume=2, equalizer=f=220:t=q:w=1:g=0.75, equalizer=f=2800:t=q:w=0.7:g=-3, equalizer=f=5200:t=q:w=1:g=-1, acompressor=threshold=0.063:ratio=2:attack=20:release=250:makeup=1.1, afftdn=nr=8:nf=-35, deesser=i=0.2:m=0.5:f=0.5, adeclick, two-pass loudnorm.
Loudness range before cleanup: 0.9 LU.
- chapter_001.html: -24.5 LUFS; peak -1.9 dBFS; quietest stretch -75.8 dBFS; clipping samples 0
- chapter_002.html: -23.6 LUFS; peak -2.1 dBFS; quietest stretch -75.9 dBFS; clipping samples 0

## Changes (0)

No markup changes.

## Warnings (6)

### Headings (4)

- chapter_040.html: 1 finding — Heading level skips from 1 to 3: HARPOONEERS AND SAILORS..
- chapter_100.html: 1 finding — Heading level skips from 1 to 3: The Pequod, of Nantucket, Meets the Samuel Enderby, of London..
- chapter_108.html: 1 finding — Heading level skips from 1 to 3: The Deck—First Night Watch..
- chapter_120.html: 1 finding — Heading level skips from 1 to 3: AHAB STANDING BY THE HELM. STARBUCK APPROACHING HIM..

### Link text (1)

- copyright.html: 1 finding — “www.gutenberg.org” does not describe its destination.

### Broken links (1)

- toc-short.html: 1 finding — toc.xhtml points to a page that is not in the converted book.

## Optional checks

- Ace: not requested. Run with --check to request this check.
- axe: not requested. Run with --check to request this check.

