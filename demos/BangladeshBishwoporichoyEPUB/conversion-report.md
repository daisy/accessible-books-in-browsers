# Conversion report

Changes: 3671. Warnings for review: 80. Optional checks: Ace not requested, axe not requested.

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

Source audio: 59.1 MB. Converted audio: 39.4 MB.
Mode: small audio (mp3). Maximum encoder duration difference: 0.002 seconds.
- MP3, mono, 24000 Hz, 32 kb/s (libmp3lame)

Cleanup: on; target -18 LUFS, true peak -1.5 dBTP.
Filters: 5 ms fades at joins, asubcut=cutoff=90:order=10, acrossover=split=200[lo][hi];[lo]acompressor=threshold=0.015:ratio=20:attack=0.1:release=40:knee=2[loc];[loc][hi]amix=inputs=2,volume=2, equalizer=f=220:t=q:w=1:g=0.75, equalizer=f=2800:t=q:w=0.7:g=-3, equalizer=f=5200:t=q:w=1:g=-1, acompressor=threshold=0.063:ratio=2:attack=20:release=250:makeup=1.1, afftdn=nr=8:nf=-35, deesser=i=0.2:m=0.5:f=0.5, adeclick, two-pass loudnorm.
Loudness range before cleanup: 4.2 LU.
- index.html: -20.8 LUFS; peak -3.3 dBFS; quietest stretch -92.8 dBFS; clipping samples 0
- package-2.html: -21.2 LUFS; peak -2.4 dBFS; quietest stretch -99.3 dBFS; clipping samples 0
- package-3.html: -21.6 LUFS; peak -0.5 dBFS; quietest stretch -99.4 dBFS; clipping samples 0
- package-4.html: -24.8 LUFS; peak -2.8 dBFS; quietest stretch -99.5 dBFS; clipping samples 0
- package-5.html: -23.2 LUFS; peak -1.3 dBFS; quietest stretch below measurement floor; clipping samples 0
- package-6.html: -23.2 LUFS; peak -2.0 dBFS; quietest stretch -99.9 dBFS; clipping samples 0
- package-7.html: -23.1 LUFS; peak -5.0 dBFS; quietest stretch -99.8 dBFS; clipping samples 0
- package-8.html: -23.5 LUFS; peak -2.9 dBFS; quietest stretch -99.7 dBFS; clipping samples 0
- package-9.html: -22.2 LUFS; peak -1.5 dBFS; quietest stretch -99.7 dBFS; clipping samples 0
- package-10.html: -21.6 LUFS; peak -1.9 dBFS; quietest stretch -99.8 dBFS; clipping samples 0
- package-11.html: -21.2 LUFS; peak -1.0 dBFS; quietest stretch below measurement floor; clipping samples 0
- package-12.html: -20.6 LUFS; peak -0.0 dBFS; quietest stretch -99.8 dBFS; clipping samples 2
- package-13.html: -21.2 LUFS; peak -0.3 dBFS; quietest stretch -99.8 dBFS; clipping samples 0
- package-14.html: -21.3 LUFS; peak -0.1 dBFS; quietest stretch below measurement floor; clipping samples 0
- package-15.html: -21.3 LUFS; peak -0.6 dBFS; quietest stretch -99.8 dBFS; clipping samples 0
- package-16.html: -20.6 LUFS; peak -0.9 dBFS; quietest stretch -99.5 dBFS; clipping samples 0
- package-17.html: -20.7 LUFS; peak -0.8 dBFS; quietest stretch below measurement floor; clipping samples 0
- package-18.html: -21.0 LUFS; peak -0.1 dBFS; quietest stretch -99.7 dBFS; clipping samples 0
- package-19.html: -21.0 LUFS; peak -0.5 dBFS; quietest stretch -99.7 dBFS; clipping samples 0
- package-20.html: -21.4 LUFS; peak -0.9 dBFS; quietest stretch -99.6 dBFS; clipping samples 0
- package-21.html: -22.2 LUFS; peak -1.9 dBFS; quietest stretch -99.7 dBFS; clipping samples 0
- package-22.html: -21.8 LUFS; peak -0.6 dBFS; quietest stretch -99.6 dBFS; clipping samples 0
- package-23.html: -21.2 LUFS; peak -0.4 dBFS; quietest stretch -99.5 dBFS; clipping samples 0
- package-24.html: -21.0 LUFS; peak 0.0 dBFS; quietest stretch below measurement floor; clipping samples 2
- package-25.html: -20.8 LUFS; peak 0.1 dBFS; quietest stretch -99.4 dBFS; clipping samples 2

## Changes (3671)

### Empty paragraphs removed (2)

- package-25.html: 1
- package-26.html: 1

### Empty spans unwrapped (1)

- package-21.html: 1

### Ineffective xml:lang attributes removed (1963)

- index.html: 1
- package-2.html: 2
- package-3.html: 21
- package-4.html: 9
- package-5.html: 29
- package-6.html: 174
- package-7.html: 57
- package-8.html: 52
- package-9.html: 69
- package-10.html: 128
- package-11.html: 123
- package-12.html: 107
- package-13.html: 68
- package-14.html: 111
- package-15.html: 119
- package-16.html: 68
- package-17.html: 51
- package-18.html: 129
- package-19.html: 109
- package-20.html: 97
- package-21.html: 84
- package-22.html: 76
- package-23.html: 74
- package-24.html: 144
- package-25.html: 60
- package-26.html: 1

### Language attributes copied from xml:lang (1641)

- package-2.html: 1
- package-3.html: 18
- package-4.html: 7
- package-5.html: 25
- package-6.html: 131
- package-7.html: 25
- package-8.html: 27
- package-9.html: 52
- package-10.html: 115
- package-11.html: 108
- package-12.html: 72
- package-13.html: 55
- package-14.html: 81
- package-15.html: 106
- package-16.html: 67
- package-17.html: 46
- package-18.html: 117
- package-19.html: 98
- package-20.html: 82
- package-21.html: 70
- package-22.html: 70
- package-23.html: 66
- package-24.html: 143
- package-25.html: 58
- package-26.html: 1

### Tables given responsive scrolling wrappers (64)

- package-6.html: 1
- package-7.html: 1
- package-8.html: 2
- package-9.html: 3
- package-10.html: 6
- package-11.html: 7
- package-12.html: 5
- package-13.html: 4
- package-14.html: 4
- package-15.html: 5
- package-16.html: 2
- package-17.html: 2
- package-18.html: 7
- package-19.html: 2
- package-20.html: 4
- package-21.html: 5
- package-23.html: 3
- package-25.html: 1

## Warnings (80)

### Element language (10)

- package-3.html: 1 finding — 1 element marked en-US use a different dominant script; lang was not copied. Examples: <h1 id="dtb_8"> (“বাংলাদেশ ও বিশ্ব পরিচয়”).
- package-7.html: 1 finding — 3 elements marked nl-NL use a different dominant script; lang was not copied. Examples: <p id="dtb_624"> (“বাংলাদেশের ভূপ্রকৃতি”); <p id="dtb_638"> (“বাংলাদেশের জনসংখ্যা”); <p id="dtb_652"> (“আমাদের মুক্তিযুদ্ধ”).
- package-8.html: 2 findings — 4 elements marked nl-NL use a different dominant script; lang was not copied. Examples: <h1 id="dtb_680"> (“আমাদের পরিবেশ ও সমাজ”); <h1 id="dtb_681"> (“১। প্রাকৃতিক পরিবেশের বৈচিত্র্য”); <p id="dtb_684"> (“প্রকৃতির বিভিন্ন উপাদান নিয়ে প্রাকৃতিক পরিবেশ গঠিত হয়। প্রকৃতির উপাদানগুলো হল…”).; 1 element marked en-US use a different dominant script; lang was not copied. Examples: <h1 id="dtb_769"> (“২ সামাজিক পরিবেশের উপর প্রকৃতির প্রভাব”).
- package-9.html: 1 finding — 2 elements marked en-US use a different dominant script; lang was not copied. Examples: <h1 id="dtb_848"> (“সমাজে পরস্পরের সহযোগিতা”); <h1 id="dtb_961"> (“২। সামাজিক বিভিন্নতা ও বিশেষ চাহিদাসম্পন্ন শিশু”).
- package-10.html: 1 finding — 1 element marked en-US use a different dominant script; lang was not copied. Examples: <h1 id="dtb_1071"> (“বাংলাদেশের ক্ষুদ্র নৃ-গোষ্ঠী”).
- package-11.html: 1 finding — 1 element marked en-US use a different dominant script; lang was not copied. Examples: <h1 id="dtb_1756"> (“৩। অর্থনৈতিক অধিকার”).
- package-12.html: 1 finding — 2 elements marked en-US use a different dominant script; lang was not copied. Examples: <h1 id="dtb_1903"> (“মূল্যবোধ ও আচরণ”); <h1 id="dtb_1904"> (“১ ভালো হওয়া ও ভালো কাজ করা”).
- package-13.html: 1 finding — 1 element marked en-US use a different dominant script; lang was not copied. Examples: <h1 id="dtb_2229"> (“১। অধিকাংশের মত গ্রহণ”).
- package-14.html: 1 finding — 1 element marked en-US use a different dominant script; lang was not copied. Examples: <h1 id="dtb_2686"> (“৩ আইন শৃঙ্খলা রক্ষায় নিয়োজিত পেশা”).

### Data tables without headers (52)

- package-6.html: 1 finding — Table has 43 rows and 4 columns but no header cells.
- package-7.html: 1 finding — Table has 19 rows and 3 columns but no header cells.
- package-8.html: 2 findings — Table has 6 rows and 2 columns but no header cells.; Table has 5 rows and 2 columns but no header cells.
- package-9.html: 2 findings — Table has 5 rows and 3 columns but no header cells.; Table has 2 rows and 2 columns but no header cells.
- package-10.html: 5 findings — Table has 2 rows and 3 columns but no header cells.; Table has 2 rows and 3 columns but no header cells.; Table has 6 rows and 2 columns but no header cells.; and 2 more
- package-11.html: 6 findings — Table has 3 rows and 2 columns but no header cells.; Table has 3 rows and 2 columns but no header cells.; Table has 5 rows and 3 columns but no header cells.; and 3 more
- package-12.html: 5 findings — Table has 5 rows and 2 columns but no header cells.; Table has 6 rows and 2 columns but no header cells.; Table has 8 rows and 4 columns but no header cells.; and 2 more
- package-13.html: 2 findings — Table has 3 rows and 2 columns but no header cells.; Table has 3 rows and 2 columns but no header cells.
- package-14.html: 3 findings — Table has 5 rows and 3 columns but no header cells.; Table has 5 rows and 3 columns but no header cells.; Table has 3 rows and 2 columns but no header cells.
- package-15.html: 3 findings — Table has 5 rows and 2 columns but no header cells.; Table has 5 rows and 2 columns but no header cells.; Table has 5 rows and 2 columns but no header cells.
- package-17.html: 1 finding — Table has 4 rows and 2 columns but no header cells.
- package-18.html: 7 findings — Table has 4 rows and 2 columns but no header cells.; Table has 2 rows and 3 columns but no header cells.; Table has 4 rows and 2 columns but no header cells.; and 4 more
- package-19.html: 1 finding — Table has 4 rows and 4 columns but no header cells.
- package-20.html: 4 findings — Table has 6 rows and 2 columns but no header cells.; Table has 5 rows and 2 columns but no header cells.; Table has 3 rows and 3 columns but no header cells.; and 1 more
- package-21.html: 5 findings — Table has 2 rows and 3 columns but no header cells.; Table has 2 rows and 6 columns but no header cells.; Table has 3 rows and 2 columns but no header cells.; and 2 more
- package-23.html: 3 findings — Table has 3 rows and 2 columns but no header cells.; Table has 2 rows and 3 columns but no header cells.; Table has 3 rows and 2 columns but no header cells.
- package-25.html: 1 finding — Table has 28 rows and 2 columns but no header cells.

### Tables resembling layout (12)

- package-9.html: 1 finding — Table has no headers and appears to be used for layout.
- package-10.html: 1 finding — Table has no headers and appears to be used for layout.
- package-11.html: 1 finding — Table has no headers and appears to be used for layout.
- package-13.html: 2 findings — Table has no headers and appears to be used for layout.; Table has no headers and appears to be used for layout.
- package-14.html: 1 finding — Table has no headers and appears to be used for layout.
- package-15.html: 2 findings — Table has no headers and appears to be used for layout.; Table has no headers and appears to be used for layout.
- package-16.html: 2 findings — Table has no headers and appears to be used for layout.; Table has no headers and appears to be used for layout.
- package-17.html: 1 finding — Table has no headers and appears to be used for layout.
- package-19.html: 1 finding — Table has no headers and appears to be used for layout.

### Paragraphs resembling list items (1)

- package-16.html: 1 finding — “• হাসপাতাল” starts like a list item.

### Audio clipping (3)

- package-12.html: 1 finding — 2 samples are at or near full scale. Cleanup cannot restore clipped detail.
- package-24.html: 1 finding — 2 samples are at or near full scale. Cleanup cannot restore clipped detail.
- package-25.html: 1 finding — 2 samples are at or near full scale. Cleanup cannot restore clipped detail.

### Decorative images (1)

- 1 finding — 71 of 71 images (100%) have empty alternative text; review whether they are all decorative.

### Book language (1)

- 1 finding — The dominant script of the book's text does not match en-US; review the metadata or use --language.

## Optional checks

- Ace: not requested. Run with --check to request this check.
- axe: not requested. Run with --check to request this check.

