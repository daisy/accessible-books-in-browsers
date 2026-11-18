// Browser converter (plan 19): child_process.spawn('ffmpeg', args) as audio-cleanup.ts uses it (stderr
// read for loudness and statistics), run in ffmpeg.wasm
import { runFfmpeg } from './ffmpeg-wasm-runner.js';
export function spawn(_binary, args) {
    const handlers = { data: [], close: [], error: [] };
    const child = {
        stderr: { setEncoding() {}, on(event, fn) { if (event === 'data') handlers.data.push(fn); } },
        on(event, fn) { (handlers[event] ??= []).push(fn); return child; }
    };
    runFfmpeg(args).then(({ code, log }) => { handlers.data.forEach(fn => fn(log)); handlers.close.forEach(fn => fn(code)); },
        error => handlers.error.forEach(fn => fn(error)));
    return child;
}
export default { spawn };
