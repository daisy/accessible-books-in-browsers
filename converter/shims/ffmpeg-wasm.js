// Browser converter (plan 19): fluent-ffmpeg's interface, building the same command line it would
// and running it in ffmpeg.wasm (ffmpeg-wasm-runner.js).
import fs from './fs.js';
import path from 'path-browserify';
import { runFfmpeg, probeFile } from './ffmpeg-wasm-runner.js';

class Command {
    constructor() { this.inputs = []; this.options = []; this.handlers = {}; }
    input(file) { this.inputs.push({ file, options: [] }); return this; }
    inputOptions(list) { this.inputs[this.inputs.length - 1].options.push(...[].concat(list).flatMap(o => o.split(' '))); return this; }
    audioFilters(filters) { this.options.push('-af', [].concat(filters).join(',')); return this; }
    audioCodec(codec) { this.options.push('-c:a', codec); return this; }
    audioChannels(n) { this.options.push('-ac', String(n)); return this; }
    audioFrequency(n) { this.options.push('-ar', String(n)); return this; }
    audioBitrate(b) { this.options.push('-b:a', String(b)); return this; }
    outputOptions(list) { this.options.push(...[].concat(list).flatMap(o => o.split(' '))); return this; }
    output(file) { this.out = file; return this; }
    on(event, handler) { this.handlers[event] = handler; return this; }
    run() {
        const args = ['-hide_banner', '-y'];
        for (const input of this.inputs) args.push(...input.options, '-i', input.file);
        args.push(...this.options, this.out);
        runFfmpeg(args).then(({ code, log }) => {
            if (code === 0) this.handlers.end?.();
            else this.handlers.error?.(new Error(`ffmpeg exited ${code}: ${log.slice(-600)}`));
        }, error => this.handlers.error?.(error));
    }
}

// A WAV's length from its header: the exact sample count, which the cues are built from
function wavInfo(file) {
    const b = fs.readFileSync(file);
    const view = new DataView(b.buffer, b.byteOffset, b.byteLength);
    let offset = 12, format;
    while (offset + 8 <= view.byteLength) {
        const id = String.fromCharCode(b[offset], b[offset + 1], b[offset + 2], b[offset + 3]);
        let size = view.getUint32(offset + 4, true);
        if (id === 'fmt ') format = { channels: view.getUint16(offset + 10, true), sampleRate: view.getUint32(offset + 12, true), bits: view.getUint16(offset + 22, true) };
        if (id === 'data') {
            size = Math.min(size, view.byteLength - offset - 8);
            const bytesPerSecond = format.sampleRate * format.channels * format.bits / 8;
            return { duration: size / bytesPerSecond, format };
        }
        offset += 8 + size + (size % 2);
    }
    return null;
}

async function probe(file) {
    const wav = /\.wav$/i.test(file) ? wavInfo(file) : null;
    if (wav) return { format: { duration: wav.duration, bit_rate: wav.format.sampleRate * wav.format.channels * wav.format.bits }, streams: [{ codec_type: 'audio', codec_name: 'pcm_s16le', channels: wav.format.channels, sample_rate: wav.format.sampleRate }] };
    const json = await probeFile(file);
    json.format.duration = Number(json.format.duration);
    return json;
}

function ffmpeg() { return new Command(); }
ffmpeg.setFfmpegPath = () => {}; ffmpeg.setFfprobePath = () => {};
ffmpeg.ffprobe = (file, callback) => { probe(file).then(data => callback(null, data), error => callback(error)); };
export default ffmpeg;
