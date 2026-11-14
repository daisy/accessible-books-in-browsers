# Conversion report

Changes: 96. Warnings for review: 5. Optional checks: Ace not requested, axe not requested.

## Options used

- Declared language: ja-jp
- Effective language: ja-jp
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

Source audio: 17.2 MB. Converted audio: 13.7 MB.
Mode: small audio (mp3). Maximum encoder duration difference: 0.000 seconds.
- MP3, mono, 24000 Hz, 32 kb/s (libmp3lame)

Cleanup: on; target -18 LUFS, true peak -1.5 dBTP.
Filters: 5 ms fades at joins, asubcut=cutoff=90:order=10, acrossover=split=200[lo][hi];[lo]acompressor=threshold=0.015:ratio=20:attack=0.1:release=40:knee=2[loc];[loc][hi]amix=inputs=2,volume=2, equalizer=f=220:t=q:w=1:g=0.75, equalizer=f=2800:t=q:w=0.7:g=-3, equalizer=f=5200:t=q:w=1:g=-1, acompressor=threshold=0.063:ratio=2:attack=20:release=250:makeup=1.1, afftdn=nr=8:nf=-35, deesser=i=0.2:m=0.5:f=0.5, adeclick, two-pass loudnorm.
Loudness range before cleanup: 1.4 LU.
- 一.html: -22.5 LUFS; peak 0.5 dBFS; quietest stretch -57.5 dBFS; clipping samples 2
- 二.html: -23.9 LUFS; peak 0.4 dBFS; quietest stretch -58.9 dBFS; clipping samples 2

## Changes (96)

### Book writing styles kept (vertical-rl text) (15)

- index.html: 1
- 一.html: 1
- 二.html: 1
- 三.html: 1
- 四.html: 1
- 五.html: 1
- 六.html: 1
- 七.html: 1
- 八.html: 1
- 九.html: 1
- 十.html: 1
- 十一.html: 1
- 十二.html: 1
- 十三.html: 1
- 後付.html: 1

### Book writing styles kept (webbook-style-combine) (25)

- index.html: 6
- 後付.html: 19

### Book writing styles kept (webbook-style-emphasis-sesame) (18)

- 一.html: 6
- 二.html: 3
- 三.html: 2
- 四.html: 3
- 五.html: 1
- 六.html: 1
- 七.html: 1
- 十三.html: 1

### Ineffective xml:lang attributes removed (19)

- index.html: 2
- 一.html: 2
- 二.html: 1
- 三.html: 1
- 四.html: 3
- 五.html: 1
- 六.html: 1
- 七.html: 1
- 八.html: 1
- 九.html: 1
- 十.html: 1
- 十一.html: 1
- 十二.html: 1
- 十三.html: 1
- 後付.html: 1

### Language attributes copied from xml:lang (19)

- index.html: 2
- 一.html: 2
- 二.html: 1
- 三.html: 1
- 四.html: 3
- 五.html: 1
- 六.html: 1
- 七.html: 1
- 八.html: 1
- 九.html: 1
- 十.html: 1
- 十一.html: 1
- 十二.html: 1
- 十三.html: 1
- 後付.html: 1

## Warnings (5)

### Link text (3)

- 後付.html: 3 findings — “http://www.aozora.gr.jp/cards/000148/card776.html” does not describe its destination.; “http://nightly.webkit.org/” does not describe its destination.; “https://sites.google.com/a/chromium.org/dev/getting-involved/dev-channel” does not describe its destination.

### Audio clipping (2)

- 一.html: 1 finding — 2 samples are at or near full scale. Cleanup cannot restore clipped detail.
- 二.html: 1 finding — 2 samples are at or near full scale. Cleanup cannot restore clipped detail.

## Optional checks

- Ace: not requested. Run with --check to request this check.
- axe: not requested. Run with --check to request this check.

