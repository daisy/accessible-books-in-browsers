// Browser converter (plan 19): run the converter's own ffmpeg commands in ffmpeg.wasm.
// Input files are copied from the in-memory file system into ffmpeg's own, at the same paths; the
// output is copied back. One command at a time: ffmpeg.wasm runs one at once.
import fs from './fs.js';
import path from 'path-browserify';

let ready;
const RESTART_EVERY = 40;   // ffmpeg.wasm's memory degrades over many commands ("memory access out of bounds")
let sinceStart = 0;
async function restart() {
    if (!ready) return;
    const old = await ready.catch(() => null);
    try { old?.terminate(); } catch { /* already gone */ }
    ready = undefined; present.clear(); sinceStart = 0; stats.restarts = (stats.restarts ?? 0) + 1;
}
export const stats = { commands: 0, ms: 0, loadMs: 0 };
globalThis.spike ??= {}; globalThis.spike.wasmStats = stats;
async function instance() {
    ready ??= (async () => {
        const started = performance.now();
        // ffmpeg.wasm, copied into vendor/ by build.mjs. Single-threaded: threads need the page to be
        // cross-origin isolated, which GitHub Pages can't arrange (it can't set the headers)
        const base = new URL('vendor/', document.baseURI).href;
        const { FFmpeg } = await import(/* runtime */ `${base}ffmpeg/index.js`);
        const ffmpeg = new FFmpeg();
        const core = `${base}ffmpeg-core/`;
        await ffmpeg.load({ coreURL: `${core}ffmpeg-core.js`, wasmURL: `${core}ffmpeg-core.wasm` });
        stats.loadMs = performance.now() - started; stats.threads = false;
        return ffmpeg;
    })();
    return ready;
}

const present = new Set();   // files already in ffmpeg's file system
async function ensureDir(ffmpeg, dir) {
    const parts = dir.split('/').filter(Boolean);
    for (let i = 1; i <= parts.length; i++) {
        try { await ffmpeg.createDir('/' + parts.slice(0, i).join('/')); } catch { /* exists */ }
    }
}
async function put(ffmpeg, file) {
    file = path.resolve('/', file);
    if (present.has(file) || !fs.existsSync(file)) return;
    await ensureDir(ffmpeg, path.dirname(file));
    await ffmpeg.writeFile(file, new Uint8Array(fs.readFileSync(file)));
    present.add(file);
}

let queue = Promise.resolve();
// By default, cut clips from source audio decoded by the browser. Set ?audio=wasm to cut them
// with FFmpeg.
const CUT_IN_BROWSER = new URLSearchParams(globalThis.location?.search ?? '').get('audio') !== 'wasm';
// ?free=off keeps everything to the end, as before, to measure what freeing saves
const FREE = new URLSearchParams(globalThis.location?.search ?? '').get('free') !== 'off';
// Each source path and sample rate maps to a promise for mono samples and the alignment offset.
const decoded = new Map();
async function decodeSource(file, rate) {
    const key = `${file}@${rate}`;
    // Only the latest source stays decoded: a page's clips come from one source, in order, and a
    // decoded hour of narration is 350 MB. A source used again later is decoded again.
    if (FREE && !decoded.has(key)) for (const old of [...decoded.keys()]) decoded.delete(old);
    if (!decoded.has(key)) decoded.set(key, (async () => {
        const started = performance.now();
        const bytes = fs.readFileSync(file);
        const ctx = new OfflineAudioContext(1, 1, rate);
        const buffer = await ctx.decodeAudioData(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
        const mono = new Float32Array(buffer.length);
        for (let c = 0; c < buffer.numberOfChannels; c++) { const data = buffer.getChannelData(c); for (let i = 0; i < data.length; i++) mono[i] += data[i] / buffer.numberOfChannels; }
        stats.decodeMs = (stats.decodeMs ?? 0) + performance.now() - started; stats.decodedSources = (stats.decodedSources ?? 0) + 1;
        const offset = ALIGN ? await offsetAgainstFfmpeg(file, rate, mono) : 0;
        return { mono, offset };
    })());
    return decoded.get(key);
}

// Browsers don't agree on where a decoded source starts. With no header recording the encoder
// delay (Kusamakura's MP3s), WebKit keeps the decoder's 529 samples of delay that Chrome, Firefox
// and FFmpeg drop, so its clips were cut 22 ms late. The cue times come from Node's FFmpeg, so
// each source is lined up with FFmpeg's own decoding: ffmpeg.wasm decodes the first seconds, and
// the shift that best matches the browser's decoding is applied to every cut from that source.
// Nothing about the browser or the format is assumed. ?align=off turns it off, for comparison.
const ALIGN = new URLSearchParams(globalThis.location?.search ?? '').get('align') !== 'off';
const ALIGN_SECONDS = 20, MAX_SHIFT_SECONDS = 0.2;
async function offsetAgainstFfmpeg(file, rate, browser) {
    const started = performance.now();
    const out = '/tmp/align-reference.raw';
    if (++sinceStart > RESTART_EVERY) await restart();
    const { code } = await runOnce(['-hide_banner', '-i', file, '-t', String(ALIGN_SECONDS), '-ac', '1', '-ar', String(rate), '-f', 'f32le', out]);
    if (code !== 0) { stats.alignFailures = (stats.alignFailures ?? 0) + 1; return 0; }
    const bytes = fs.readFileSync(out); fs.removeSync(out);
    const reference = new Float32Array(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
    const maxShift = Math.round(MAX_SHIFT_SECONDS * rate), window = rate;   // compare one second
    // The loudest second of the reference, so silence at the start can't match at any shift
    let start = maxShift, loudest = -1;
    for (let s = maxShift; s + window + maxShift <= reference.length; s += window >> 2) {
        let energy = 0; for (let i = 0; i < window; i++) energy += reference[s + i] ** 2;
        if (energy > loudest) { loudest = energy; start = s; }
    }
    if (loudest <= 0) return 0;
    let best = Infinity, offset = 0;
    for (let shift = -maxShift; shift <= maxShift; shift++) {
        let error = 0;
        for (let i = 0; i < window && error < best; i++) error += (reference[start + i] - (browser[start + shift + i] ?? 0)) ** 2;
        if (error < best) { best = error; offset = shift; }
    }
    // Only trust a clear match (the residual well below the signal); otherwise cut as decoded
    const residualDb = 10 * Math.log10(best / loudest);
    stats.align ??= []; stats.align.push({ file: path.basename(file), offset, residualDb: Math.round(residualDb * 10) / 10, ms: Math.round(performance.now() - started) });
    return residualDb < -10 ? offset : 0;
}
function wav(samples, rate) {
    const out = new Uint8Array(44 + samples.length * 2), view = new DataView(out.buffer);
    const text = (o, t) => [...t].forEach((c, i) => { out[o + i] = c.charCodeAt(0); });
    text(0, 'RIFF'); view.setUint32(4, 36 + samples.length * 2, true); text(8, 'WAVE'); text(12, 'fmt ');
    view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true); view.setUint32(24, rate, true);
    view.setUint32(28, rate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true); text(36, 'data'); view.setUint32(40, samples.length * 2, true);
    for (let i = 0; i < samples.length; i++) view.setInt16(44 + i * 2, Math.max(-32768, Math.min(32767, Math.round(samples[i] * 32768))), true);
    return out;
}
async function cutInBrowser(args) {
    const af = args[args.indexOf('-af') + 1], m = af?.match(/^atrim=([\d.]+):([\d.]+)$/);
    if (!m || args[args.indexOf('-c:a') + 1] !== 'pcm_s16le' || !/\.wav$/.test(args[args.length - 1])) return null;
    const rate = Number(args[args.indexOf('-ar') + 1]), source = args[args.indexOf('-i') + 1];
    const { mono: pcm, offset } = await decodeSource(path.resolve('/', source), rate);
    const started = performance.now();
    // The clip keeps the exact length FFmpeg's cut would have (the cues are built from it); where the
    // offset reaches before the browser's first sample or past its last, that part is silence
    const from = Math.round(Number(m[1]) * rate) + offset, to = Math.round(Number(m[2]) * rate) + offset;
    const clip = new Float32Array(Math.max(0, to - from));
    const lo = Math.max(0, from), hi = Math.min(pcm.length, to);
    if (hi > lo) clip.set(pcm.subarray(lo, hi), lo - from);
    fs.writeFileSync(args[args.length - 1], wav(clip, rate));
    stats.cuts = (stats.cuts ?? 0) + 1; stats.cutMs = (stats.cutMs ?? 0) + performance.now() - started;
    return { code: 0, log: '' };
}

// Queue a command and resolve with its exit code and log. Write the output to the converter's
// in-memory file system.
export function runFfmpeg(args) {
    const run = queue.then(async () => {
        if (CUT_IN_BROWSER) { const done = await cutInBrowser(args); if (done) return done; }
        if (++sinceStart > RESTART_EVERY) await restart();
        try { return await runOnce(args); }
        catch (error) { await restart(); stats.retries = (stats.retries ?? 0) + 1; return runOnce(args); }
    });
    queue = run.catch(() => {});
    return run;
}

async function runOnce(args) {
        const ffmpeg = await instance();
        const inputs = [];
        args.forEach((arg, i) => { if (args[i - 1] === '-i') inputs.push(arg); });
        const temporary = [];
        for (const input of inputs) {
            await put(ffmpeg, input);
            // The concat demuxer's list names more inputs
            if (input.endsWith('.txt')) for (const line of fs.readFileSync(input, 'utf8').split('\n')) {
                const m = line.match(/^file '(.*)'$/); if (m) { await put(ffmpeg, m[1].replace(/'\\''/g, "'")); temporary.push(path.resolve('/', m[1])); }
            }
            if (/\.(wav|txt)$/.test(input)) temporary.push(path.resolve('/', input));
        }
        const output = args[args.length - 1];
        const writes = output !== '-';
        if (writes) await ensureDir(ffmpeg, path.dirname(path.resolve('/', output)));
        let log = '';
        const onLog = ({ message }) => { log += message + '\n'; };
        ffmpeg.on('log', onLog);
        const started = performance.now();
        const code = await ffmpeg.exec(args);
        stats.commands++; stats.ms += performance.now() - started;
        ffmpeg.off('log', onLog);
        if (writes && code === 0) {
            const file = path.resolve('/', output);
            fs.writeFileSync(file, await ffmpeg.readFile(file));
            if (/\.wav$/.test(file)) present.add(file); else await ffmpeg.deleteFile(file).catch(() => {});
        }
        // Temporary WAVs are read once or twice; free them from ffmpeg's memory when the page is done
        for (const file of temporary) if (/joined|faded|\.txt$/.test(file)) { await ffmpeg.deleteFile(file).catch(() => {}); present.delete(file); }
        if (code !== 0 && /memory access out of bounds|Aborted/.test(log)) throw new Error(log.slice(-300));
        // The converter deletes each page's temporary audio files once the page is encoded (audio.ts);
        // drop any that are gone from ffmpeg.wasm's own file system too, so its memory doesn't hold them
        if (FREE) for (const file of [...present]) {
            if (fs.existsSync(file)) continue;
            await ffmpeg.deleteFile(file).catch(() => {}); present.delete(file);
            stats.filesDropped = (stats.filesDropped ?? 0) + 1;
        }
        return { code, log };
}

// Drops a finished page's temporary files from ffmpeg's memory
export async function forget(prefix) {
    const ffmpeg = await instance();
    for (const file of [...present]) if (file.startsWith(prefix)) { await ffmpeg.deleteFile(file).catch(() => {}); present.delete(file); }
}

// ffprobe's JSON for a file (sources and encoded output; WAVs are read from their header instead)
// After a conversion: drops the decoded source and every file in ffmpeg.wasm's file system, so
// nothing from one book stays in memory into the next (the next command starts ffmpeg.wasm again)
export function releaseAll() {
    const run = queue.then(async () => { decoded.clear(); await restart(); });
    queue = run.catch(() => {});
    return run;
}

export function probeFile(file) {
    const run = queue.then(async () => {
        const ffmpeg = await instance();
        await put(ffmpeg, file);
        const out = '/tmp/probe.json';
        await ensureDir(ffmpeg, '/tmp');
        let probeLog = '';
        const onLog = ({ message }) => { probeLog += message + '\n'; };
        ffmpeg.on('log', onLog);
        const code = await ffmpeg.ffprobe(['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', path.resolve('/', file), '-o', out]).catch(() => -1);
        let json;
        if (code === 0) json = JSON.parse(new TextDecoder().decode(await ffmpeg.readFile(out)));
        else {
            // ffmpeg.wasm's ffprobe failed: decode the whole file and take ffmpeg's final time (10 ms precision)
            stats.probeFailures = (stats.probeFailures ?? 0) + 1; stats.lastProbeLog = probeLog.slice(-300);
            let log = '';
            const onDecode = ({ message }) => { log += message + '\n'; };
            ffmpeg.on('log', onDecode);
            await ffmpeg.exec(['-hide_banner', '-i', path.resolve('/', file), '-f', 'null', '-']);
            ffmpeg.off('log', onDecode);
            // The last progress time, else the length in the file's header (10 ms precision either way)
            const times = [...log.matchAll(/(?:time=|Duration: )(\d+):(\d+):(\d+(?:\.\d+)?)/g)];
            const t = times[times.length - 1];
            stats.lastDecodeLog = log.slice(-200);
            const duration = t ? Number(t[1]) * 3600 + Number(t[2]) * 60 + Number(t[3]) : 0;
            json = { format: { duration }, streams: [{ codec_type: 'audio' }] };
        }
        ffmpeg.off('log', onLog);
        await ffmpeg.deleteFile(out).catch(() => {});
        if (!/\.wav$/.test(file)) { await ffmpeg.deleteFile(path.resolve('/', file)).catch(() => {}); present.delete(path.resolve('/', file)); }
        return json;
    });
    queue = run.catch(() => {});
    return run;
}
