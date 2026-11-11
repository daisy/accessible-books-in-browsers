// Builds a temporary listening page for choosing plan 17's --small-audio codec.
// Run from convert/: node scripts/create-small-audio-listening.mjs [output directory]

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';

const convertRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(convertRoot, '..');
const output = path.resolve(process.argv[2] ?? '/private/tmp/abb-small-audio-listening');
const ffmpeg = ffmpegInstaller.path;
const samples = [
    { id: 'english', title: 'English for Today', start: 0,
        source: 'source-epubs/EnglishForTodayEPUB/EPUB/audio/aud092.mp3' },
    { id: 'bangla', title: 'Amar Bangla', start: 60,
        source: 'source-epubs/AmarBanglaEPUB/EPUB/audio/aud092.mp3' },
    { id: 'heroes', title: 'Action for Heroes', start: 30,
        source: 'source-epubs/action-for-heroes/EPUB/Content/speechgen0041.mp3' }
];
const variants = [
    { id: 'source', label: 'Original source excerpt — no re-encoding', ext: 'mp3', streamCopy: true },
    { id: 'old', label: 'Previous converter — MP3, stereo, 128 kb/s', ext: 'mp3', codec: 'libmp3lame', channels: 2, rate: 44100, bitrate: 128 },
    { id: 'matched', label: 'New default — source-matched MP3', ext: 'mp3', codec: 'libmp3lame', sourceMatched: true },
    { id: 'mp3', label: 'Small MP3 — mono, 24 kHz, 32 kb/s', ext: 'mp3', codec: 'libmp3lame', channels: 1, rate: 24000, bitrate: 32 },
    { id: 'aac', label: 'Small AAC — mono, 24 kHz, 36 kb/s', ext: 'm4a', codec: 'aac', channels: 1, rate: 24000, bitrate: 36 },
    { id: 'opus', label: 'Small Opus/WebM — mono, 24 kHz, 24 kb/s', ext: 'webm', codec: 'libopus', channels: 1, rate: 24000, bitrate: 24 },
    { id: 'cleanup', label: 'Default cleanup — joins, rumble, loudness', ext: 'mp3', codec: 'libmp3lame', sourceMatched: true, cleanup: [] },
    { id: 'warm-eq', label: 'Default cleanup + warm EQ', ext: 'mp3', codec: 'libmp3lame', sourceMatched: true, cleanup: ['warm-eq'] },
    { id: 'compression', label: 'Default cleanup + compression', ext: 'mp3', codec: 'libmp3lame', sourceMatched: true, cleanup: ['compression'] },
    { id: 'noise', label: 'Default cleanup + noise reduction', ext: 'mp3', codec: 'libmp3lame', sourceMatched: true, cleanup: ['noise'] },
    { id: 'deess', label: 'Default cleanup + de-essing', ext: 'mp3', codec: 'libmp3lame', sourceMatched: true, cleanup: ['deess'] },
    { id: 'declick', label: 'Default cleanup + de-clicking', ext: 'mp3', codec: 'libmp3lame', sourceMatched: true, cleanup: ['declick'] },
    { id: 'all-cleanup', label: 'Default cleanup + every enhancement (selected warm EQ)', ext: 'mp3', codec: 'libmp3lame', sourceMatched: true,
        cleanup: ['warm-eq', 'compression', 'noise', 'deess', 'declick'] }
];

fs.mkdirSync(output, { recursive: true });

for (const sample of samples) {
    const source = path.join(repoRoot, sample.source);
    const sourceInfo = probe(source);
    for (const variant of variants) {
        const filename = `${sample.id}-${variant.id}.${variant.ext}`;
        if (variant.streamCopy) {
            run(ffmpeg, ['-y', '-hide_banner', '-loglevel', 'error', '-ss', String(sample.start), '-t', '20',
                '-i', source, '-map', '0:a:0', '-c:a', 'copy', path.join(output, filename)]);
            continue;
        }
        const channels = variant.sourceMatched ? sourceInfo.channels : variant.channels;
        const rate = variant.sourceMatched ? sourceInfo.sampleRate : variant.rate;
        const bitrate = variant.sourceMatched ? Math.ceil(sourceInfo.bitrate / 1000) : variant.bitrate;
        const args = ['-y', '-hide_banner', '-loglevel', 'error', '-ss', String(sample.start), '-t', '20', '-i', source,
            '-vn', '-ac', String(channels), '-ar', String(rate), '-c:a', variant.codec, '-b:a', `${bitrate}k`];
        if (variant.cleanup) args.push('-af', cleanupFilter(source, sample.start, variant.cleanup));
        if (variant.ext === 'm4a') args.push('-movflags', '+faststart');
        args.push(path.join(output, filename));
        run(ffmpeg, args);
    }
}

function cleanupFilter(source, start, enhancements) {
    const filters = ['highpass=f=75', ...enhancementFilters(enhancements)];
    const firstPass = [...filters, 'loudnorm=I=-17:LRA=7:TP=-1.5:print_format=json'].join(',');
    const measuredRun = run(ffmpeg, ['-hide_banner', '-nostats', '-ss', String(start), '-t', '20', '-i', source,
        '-af', firstPass, '-f', 'null', '-']);
    const matches = measuredRun.stderr.match(/\{\s*"input_i"[\s\S]*?\}/g);
    if (!matches?.length) throw new Error(`Could not measure ${source}`);
    const measured = JSON.parse(matches[matches.length - 1]);
    filters.push(`loudnorm=I=-17:LRA=7:TP=-1.5:measured_I=${measured.input_i}:measured_LRA=${measured.input_lra}:measured_TP=${measured.input_tp}:measured_thresh=${measured.input_thresh}:offset=${measured.target_offset}:linear=true`);
    filters.push('apad', 'atrim=duration=20');
    return filters.join(',');
}

function enhancementFilters(enhancements) {
    const filters = [];
    for (const enhancement of enhancements) {
        if (enhancement === 'warm-eq') filters.push('equalizer=f=220:t=q:w=1:g=0.75', 'equalizer=f=2800:t=q:w=0.7:g=-3', 'equalizer=f=5200:t=q:w=1:g=-1');
        else if (enhancement === 'compression') filters.push('acompressor=threshold=0.063:ratio=2:attack=20:release=250:makeup=1.1');
        else if (enhancement === 'noise') filters.push('afftdn=nr=8:nf=-35');
        else if (enhancement === 'deess') filters.push('deesser=i=0.2:m=0.5:f=0.5');
        else if (enhancement === 'strong-deess') filters.push('deesser=i=0.35:m=0.5:f=0.5');
        else if (enhancement === 'declick') filters.push('adeclick');
    }
    return filters;
}

const projections = projectBooks();
fs.writeFileSync(path.join(output, 'index.html'), listeningHtml(projections));
console.log(`Wrote ${path.join(output, 'index.html')}`);

function probe(filename) {
    const result = run('ffprobe', ['-v', 'error', '-select_streams', 'a:0',
        '-show_entries', 'stream=sample_rate,channels,bit_rate:format=duration,bit_rate', '-of', 'json', filename]);
    const data = JSON.parse(result.stdout);
    const stream = data.streams?.[0] ?? {};
    return {
        bitrate: Number(stream.bit_rate ?? data.format?.bit_rate) || 64000,
        channels: Number(stream.channels) || 1,
        duration: Number(data.format?.duration) || 0,
        sampleRate: Number(stream.sample_rate) || 44100
    };
}

function run(command, args) {
    const result = spawnSync(command, args, { encoding: 'utf8' });
    if (result.status !== 0) throw new Error(`${command} failed: ${result.stderr || result.stdout}`);
    return result;
}

function audioFiles(dir) {
    return fs.readdirSync(dir, { recursive: true })
        .filter(name => /\.(?:mp3|m4a|aac|wav)$/i.test(name))
        .map(name => path.join(dir, name));
}

function projectBooks() {
    return [
        ['English for Today', 'EnglishForTodayEPUB'],
        ['Amar Bangla', 'AmarBanglaEPUB'],
        ['Action for Heroes', 'action-for-heroes']
    ].map(([title, folder]) => {
        const files = audioFiles(path.join(repoRoot, 'source-epubs', folder));
        const duration = files.reduce((sum, file) => sum + probe(file).duration, 0);
        const sourceBytes = files.reduce((sum, file) => sum + fs.statSync(file).size, 0);
        return { title, duration, sourceBytes };
    });
}

function mb(bytes) {
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function estimate(duration, kbps) {
    return duration * kbps * 1000 / 8;
}

function escape(value) {
    return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

function listeningHtml(projections) {
    const byId = Object.fromEntries(variants.map(variant => [variant.id, variant]));
    const groups = [
        { id: 'formats', title: 'Encoding and default cleanup', reference: 'source',
            comparisons: ['old', 'matched', 'mp3', 'aac', 'opus', 'cleanup'] },
        { id: 'enhancements', title: 'Optional enhancements', reference: 'cleanup',
            comparisons: ['warm-eq', 'compression', 'noise', 'deess', 'declick', 'all-cleanup'] }
    ];
    const sampleSections = samples.map(sample => {
        const groupHtml = groups.map(group => {
            const reference = byId[group.reference];
            const referenceFilename = `${sample.id}-${reference.id}.${reference.ext}`;
            const referenceSize = fs.statSync(path.join(output, referenceFilename)).size;
            const comparisons = group.comparisons.map(id => {
                const variant = byId[id];
                const filename = `${sample.id}-${variant.id}.${variant.ext}`;
                const size = fs.statSync(path.join(output, filename)).size;
                return `<article class="sample"><h4>${escape(variant.label)}</h4><audio controls preload="metadata" src="${filename}"></audio><p class="size">${mb(size)} for 20 seconds</p></article>`;
            }).join('');
            return `<section class="comparison-group"><h3>${group.title}</h3><div class="comparison-layout"><aside class="original" aria-label="Fixed reference"><p class="eyebrow">Fixed reference for this group</p><h4>${escape(reference.label)}</h4><audio controls preload="metadata" src="${referenceFilename}"></audio><p>${mb(referenceSize)} for 20 seconds</p><p class="hint">Replay this whenever you need to reset your ear.</p></aside><div class="comparisons">${comparisons}</div></div></section>`;
        }).join('');
        return `<section class="book"><h2>${escape(sample.title)}</h2>${groupHtml}</section>`;
    }).join('');
    const rows = projections.map(book => `<tr><th scope="row">${escape(book.title)}</th><td>${mb(book.sourceBytes)}</td><td>${mb(estimate(book.duration, 128))}</td><td>${mb(estimate(book.duration, 32))}</td><td>${mb(estimate(book.duration, 36))}</td><td>${mb(estimate(book.duration, 24))}</td></tr>`).join('');
    return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Small audio listening comparison</title>
<style>:root{color-scheme:light}*{box-sizing:border-box}body{font:1rem/1.5 system-ui;max-width:80rem;margin:auto;padding:1rem;color:#171717;background:#f7f7f5}h1,h2,h3,h4{line-height:1.2}.book{border-top:3px solid #222;padding-block:1.5rem;margin-top:2rem}.comparison-group{margin-block:2rem 3rem}.comparison-layout{display:grid;grid-template-columns:minmax(17rem,21rem) minmax(0,1fr);gap:1.5rem;align-items:start}.original{position:sticky;top:1rem;padding:1rem;border:3px solid #222;border-radius:.75rem;background:#fff;box-shadow:0 .25rem 1rem #0002}.original h4,.original p{margin-block:.35rem}.eyebrow{font-size:.8rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em}.hint,.size{color:#555}.comparisons{display:grid;gap:1rem}.sample{padding:1rem;border:1px solid #aaa;border-radius:.75rem;background:#fff}.sample h4{margin-top:0}audio{width:100%}table{border-collapse:collapse;width:100%;display:block;overflow:auto;background:#fff}th,td{border:1px solid;padding:.5rem;text-align:left}@media(max-width:44rem){.comparison-layout{display:block}.original{top:0;z-index:2;margin-bottom:1rem;padding:.75rem}.original .hint{display:none}.comparisons{gap:.75rem}}</style>
<main><h1>Audio listening comparison</h1><p>Each group changes its fixed reference so you can isolate what you are hearing. Play the fixed reference whenever you need to reset your ear, then scroll through the alternatives.</p>
<details><summary>Projected whole-book audio sizes</summary><table><thead><tr><th>Book</th><th>Source</th><th>Previous 128 kb/s</th><th>MP3 32 kb/s</th><th>AAC 36 kb/s</th><th>Opus 24 kb/s</th></tr></thead><tbody>${rows}</tbody></table></details>${sampleSections}</main>
<script>document.querySelectorAll('audio').forEach(player=>player.addEventListener('play',()=>document.querySelectorAll('audio').forEach(other=>{if(other!==player)other.pause()})));</script></html>`;
}
