// Builds a temporary listening page for choosing how narration's loudness is normalized: ffmpeg's
// loudnorm, run twice (what the converter does now, and most of a conversion's time), against one
// ebur128 measurement and a plain volume change with a limiter (about 4 times faster to measure).
// Both use the converter's own cleanup filters and targets, and the same encoding.
// Run from convert/ after a build: node scripts/create-loudness-listening.mjs [output directory]

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ffmpegPath from 'ffmpeg-static';
import { audioCleanupSettings, cleanupFilters, loudnormFilter } from '../build/audio-cleanup.js';

const convertRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(convertRoot, '..');
const output = path.resolve(process.argv[2] ?? '/private/tmp/abb-loudness-listening');
const SECONDS = 45;
const settings = audioCleanupSettings(true, []);
const cleanup = cleanupFilters(settings);
// alimiter limits sample peaks, not true peaks: half a decibel under the true-peak target leaves
// room for the peaks between samples
const LIMIT_DB = settings.truePeakDb - 0.5;
const samples = [
    { id: 'valentin', title: 'Valentin Haüy', note: 'Recorded human narration', start: 600, source: 'source-epubs/valentin-hauy/OEBPS/audio/hauy_0020.mp3' },
    { id: 'moby', title: 'Moby-Dick', note: 'Recorded human narration', start: 30, source: 'source-epubs/moby-dick/OPS/audio/mobydick_001_002_melville.mp4' },
    { id: 'kusamakura', title: 'Kusamakura', note: 'Recorded human narration, Japanese', start: 30, source: 'source-epubs/kusamakura/OPS/audio/fmse004b.mp3' },
    { id: 'heroes', title: 'Action for Heroes', note: 'Synthetic speech', start: 0, source: 'source-epubs/action-for-heroes/EPUB/Content/speechgen0039.mp3' },
    { id: 'english', title: 'English for Today', note: 'Narration (human or synthetic: not known)', start: 0, source: 'source-epubs/EnglishForTodayEPUB/EPUB/audio/aud045.mp3' },
    { id: 'bangla', title: 'Amar Bangla Boi', note: 'Recorded human narration, Bangla', start: 0, source: 'source-epubs/AmarBanglaEPUB/EPUB/audio/aud055.mp3' },
    { id: 'bishwoporichoy', title: 'Bangladesh o Bishwoporichoy', note: 'Recorded human narration, Bangla', start: 60, source: 'source-epubs/BangladeshBishwoporichoyEPUB/EPUB/audio/aud062.mp3' },
    { id: 'notes', title: 'Notes Test Book', note: 'Synthetic speech (macOS say)', start: 0, source: 'source-epubs/notes-test/EPUB/audio/endnotes.mp3' }
];

fs.mkdirSync(output, { recursive: true });
const results = [];
for (const sample of samples) {
    const source = path.join(repoRoot, sample.source);
    const info = probe(source);
    const excerpt = ['-ss', String(sample.start), '-t', String(SECONDS), '-i', source];
    const encode = ['-vn', '-ac', String(info.channels), '-ar', String(info.sampleRate), '-c:a', 'libmp3lame', '-b:a', '128k'];

    // The source as it is, for reference
    const sourceExt = /\.mp4$|\.m4a$/i.test(source) ? 'm4a' : 'mp3';
    const sourceFile = `${sample.id}-source.${sourceExt}`;
    run(['-y', ...excerpt, '-vn', '-c:a', 'copy', path.join(output, sourceFile)]);

    // A: as the converter does it now, loudnorm measuring, then loudnorm again with what it measured
    const firstPass = run(['-nostats', ...excerpt, '-af', [...cleanup, loudnormFilter(settings, null)].join(','), '-f', 'null', '-']);
    const measured = lastJson(firstPass.stderr);
    const secondPassFilter = loudnormFilter(settings, measured) + ':print_format=json';
    const a = run(['-y', '-nostats', ...excerpt, '-af', [...cleanup, secondPassFilter].join(','), ...encode, path.join(output, `${sample.id}-loudnorm.mp3`)]);
    const mode = lastJson(a.stderr).normalization_type;

    // B: one measurement with ebur128, then one volume change, and a limiter for any peak it pushes
    // over (latency=1 keeps the limiter from delaying the audio, which would move the cues)
    const before = loudness(run(['-nostats', ...excerpt, '-af', [...cleanup, 'ebur128=peak=true'].join(','), '-f', 'null', '-']).stderr);
    const gain = settings.loudnessLufs - before.integrated;
    const limit = Math.min(1, Math.max(0.0625, 10 ** (LIMIT_DB / 20)));
    run(['-y', '-nostats', ...excerpt, '-af', [...cleanup, `volume=${gain.toFixed(2)}dB`, `alimiter=limit=${limit.toFixed(4)}:level=false:latency=1`].join(','),
        ...encode, path.join(output, `${sample.id}-gain.mp3`)]);

    results.push({
        ...sample, sourceFile, mode,
        gain, peakBeforeLimit: before.truePeak + gain,
        a: measure(path.join(output, `${sample.id}-loudnorm.mp3`)),
        b: measure(path.join(output, `${sample.id}-gain.mp3`))
    });
    console.log(`${sample.title}: loudnorm ${mode}, gain ${gain.toFixed(1)} dB`);
}
fs.writeFileSync(path.join(output, 'index.html'), page(results));
console.log(`Wrote ${path.join(output, 'index.html')}`);

function run(args) {
    const result = spawnSync(ffmpegPath, ['-hide_banner', ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    if (result.status !== 0) throw new Error(`ffmpeg failed: ${result.stderr.slice(-800)}`);
    return result;
}

function probe(file) {
    const stderr = spawnSync(ffmpegPath, ['-hide_banner', '-i', file], { encoding: 'utf8' }).stderr;
    const stream = stderr.match(/Audio: [^\n]*?(\d+) Hz, (mono|stereo)/);
    return { sampleRate: Number(stream?.[1] ?? 44100), channels: stream?.[2] === 'stereo' ? 2 : 1 };
}

function lastJson(text) {
    const matches = text.match(/\{\s*"input_i"[\s\S]*?\}/g);
    if (!matches?.length) throw new Error('No loudnorm measurement');
    return JSON.parse(matches[matches.length - 1]);
}

function loudness(text) {
    const summary = text.slice(text.lastIndexOf('Summary:'));
    const number = pattern => Number(summary.match(pattern)?.[1]);
    return {
        integrated: number(/I:\s*(-?\d+(?:\.\d+)?) LUFS/),
        range: number(/LRA:\s*(-?\d+(?:\.\d+)?) LU/),
        truePeak: number(/Peak:\s*(-?\d+(?:\.\d+)?) dBFS/)
    };
}

function measure(file) {
    return loudness(run(['-nostats', '-i', file, '-af', 'ebur128=peak=true', '-f', 'null', '-']).stderr);
}

function escape(value) {
    return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function numbers(m) {
    return `${m.integrated.toFixed(1)} LUFS, loudness range ${m.range.toFixed(1)} LU, peak ${m.truePeak.toFixed(1)} dB`;
}

function page(rows) {
    const sections = rows.map(row => {
        const limited = row.peakBeforeLimit > LIMIT_DB;
        return `<section aria-labelledby="${row.id}-h">
<h2 id="${row.id}-h">${escape(row.title)}</h2>
<p class="note">${escape(row.note)}. ${SECONDS} seconds from ${row.start} s. ${row.mode === 'dynamic'
            ? '<strong>Here loudnorm switched to its dynamic mode</strong> (a plain volume change would have pushed peaks over the limit), so A and B can differ.'
            : 'Here loudnorm stayed linear (a plain volume change), so A and B should sound nearly the same.'}</p>
<div class="players">
<div class="player"><h3>Source</h3><audio controls preload="none" src="${row.sourceFile}"></audio><p>No processing.</p></div>
<div class="player"><h3>A: loudnorm (now)</h3><audio controls preload="none" src="${row.id}-loudnorm.mp3"></audio><p>${numbers(row.a)}</p></div>
<div class="player"><h3>B: volume change and limiter</h3><audio controls preload="none" src="${row.id}-gain.mp3"></audio><p>${numbers(row.b)}. ${limited
            ? `Volume ${row.gain >= 0 ? '+' : ''}${row.gain.toFixed(1)} dB; the limiter took about ${(row.peakBeforeLimit - LIMIT_DB).toFixed(1)} dB off the loudest peaks.`
            : `Volume ${row.gain >= 0 ? '+' : ''}${row.gain.toFixed(1)} dB; the limiter didn't act.`}</p></div>
</div>
</section>`;
    }).join('\n');
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Loudness listening check</title>
<style>
:root { color-scheme: light dark; --bg: #f7f7f5; --fg: #171717; --muted: #4a4a4a; --card: #fff; --line: #8a8a8a; }
@media (prefers-color-scheme: dark) { :root { --bg: #161616; --fg: #f0f0f0; --muted: #c4c4c4; --card: #222; --line: #777; } }
body { font: 1rem/1.5 system-ui, sans-serif; max-width: 72rem; margin: auto; padding: 1rem; background: var(--bg); color: var(--fg); }
section { border-top: 2px solid var(--line); margin-top: 2rem; padding-top: .5rem; }
.note, .player p { color: var(--muted); }
.players { display: grid; grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr)); gap: 1rem; }
.player { background: var(--card); border: 1px solid var(--line); border-radius: .5rem; padding: .75rem 1rem; }
.player h3 { margin: 0 0 .5rem; font-size: 1.05rem; }
audio { width: 100%; }
</style>
</head>
<body>
<main>
<h1>Loudness listening check</h1>
<p>Each book has the source and two versions. Both versions go through the same cleanup (low cut, deplosive) and aim for the same loudness (${settings.loudnessLufs} LUFS, peaks under ${settings.truePeakDb} dB). They differ only in how they get there:</p>
<ul>
<li><strong>A</strong> is what the converter does now: loudnorm, which measures the audio, then runs again to adjust it. Most of a conversion's time goes to these two passes.</li>
<li><strong>B</strong> measures once with ebur128, then makes one volume change, with a limiter catching any peak that goes over. It would make conversions much faster.</li>
</ul>
<p>Listen for differences in loudness, pumping (the level rising and falling), or squashed loud syllables. Starting one player pauses the others.</p>
${sections}
</main>
<script>
document.querySelectorAll('audio').forEach(player => player.addEventListener('play', () => {
    document.querySelectorAll('audio').forEach(other => { if (other !== player) other.pause(); });
}));
</script>
</body>
</html>
`;
}
