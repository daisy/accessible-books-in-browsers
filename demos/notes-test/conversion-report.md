# Conversion report

Changes: 4. Warnings for review: 0. Optional checks: Ace not requested, axe not requested.

## Options used

- Declared language: en
- Effective language: en
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

Source audio: 1.1 MB. Converted audio: 586.3 KB.
Mode: small audio (mp3). Maximum encoder duration difference: 0.000 seconds.
- MP3, mono, 24000 Hz, 32 kb/s (libmp3lame)

Cleanup: on; target -18 LUFS, true peak -1.5 dBTP.
Filters: 5 ms fades at joins, asubcut=cutoff=90:order=10, acrossover=split=200[lo][hi];[lo]acompressor=threshold=0.015:ratio=20:attack=0.1:release=40:knee=2[loc];[loc][hi]amix=inputs=2,volume=2, equalizer=f=220:t=q:w=1:g=0.75, equalizer=f=2800:t=q:w=0.7:g=-3, equalizer=f=5200:t=q:w=1:g=-1, acompressor=threshold=0.063:ratio=2:attack=20:release=250:makeup=1.1, afftdn=nr=8:nf=-35, deesser=i=0.2:m=0.5:f=0.5, adeclick, two-pass loudnorm.
Loudness range before cleanup: 0.2 LU.
- index.html: -16.8 LUFS; peak -2.3 dBFS; quietest stretch -75.0 dBFS; clipping samples 0
- chapter1.html: -17.0 LUFS; peak -1.6 dBFS; quietest stretch -77.9 dBFS; clipping samples 0
- chapter2.html: -16.9 LUFS; peak -2.0 dBFS; quietest stretch -77.9 dBFS; clipping samples 0
- endnotes.html: -16.9 LUFS; peak -1.9 dBFS; quietest stretch -78.4 dBFS; clipping samples 0

## Changes (4)

### Ineffective xml:lang attributes removed (4)

- index.html: 1
- chapter1.html: 1
- chapter2.html: 1
- endnotes.html: 1

## Warnings (0)

No warnings.

## Optional checks

- Ace: not requested. Run with --check to request this check.
- axe: not requested. Run with --check to request this check.

