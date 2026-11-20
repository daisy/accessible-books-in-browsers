// Records the feature tour's clips from the demos, in Chromium, and encodes each as an MP4 with a
// JPEG still (the last frame), into tour/clips/. Slides with `sound: true` also get their sound
// and a captions file (<id>.vtt); the others are silent.
//
//   node tour/scripts/record.mjs [slide-id ...]
//
// Needs ffmpeg on PATH, and Chromium for playwright-core (`npx playwright install chromium`), or
// CHROME_PATH. Each slide is a function in slides.mjs that sets the page up, then acts while being
// recorded. Recording uses the DevTools screencast, so only frames that change are captured, each
// with its time, and ffmpeg holds each one until the next.

import { spawnSync } from 'node:child_process';
import { createReadStream, existsSync, mkdirSync, mkdtempSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { slides } from './slides.mjs';

const require = createRequire(new URL('../../convert/package.json', import.meta.url));
const { chromium } = require('playwright-core');

const root = fileURLToPath(new URL('../..', import.meta.url));
const clips = path.join(root, 'tour/clips');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
    '.json': 'application/json', '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.vtt': 'text/vtt', '.png': 'image/png',
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.gif': 'image/gif', '.webp': 'image/webp',
    '.woff2': 'font/woff2', '.woff': 'font/woff', '.otf': 'font/otf', '.ttf': 'font/ttf', '.xhtml': 'application/xhtml+xml' };

// A static server for the repository, with byte ranges so narration can seek
function serve() {
    const server = createServer((req, res) => {
        let file = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
        if (existsSync(file) && statSync(file).isDirectory()) file = path.join(file, 'index.html');
        if (!file.startsWith(root) || !existsSync(file)) { res.writeHead(404).end(); return; }
        const size = statSync(file).size;
        const headers = { 'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream', 'Accept-Ranges': 'bytes' };
        const range = /bytes=(\d*)-(\d*)/.exec(req.headers.range ?? '');
        if (range) {
            const start = range[1] ? Number(range[1]) : size - Number(range[2]);
            const end = range[1] && range[2] ? Number(range[2]) : size - 1;
            res.writeHead(206, { ...headers, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': end - start + 1 });
            createReadStream(file, { start, end }).pipe(res);
        } else {
            res.writeHead(200, { ...headers, 'Content-Length': size });
            createReadStream(file).pipe(res);
        }
    });
    return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

// How much slower than the waits written in slides.mjs (user, 2026-11-18: "pacing could be a little slower")
const PACE = 1.4;
// Clips with sound play this much longer, and their sound fades out over the last part
const TAIL_SECONDS = 2;
const FADE_SECONDS = 1.5;

const VIEWPORTS = {
    desktop: { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, outputWidth: 1280 },
    phone: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, outputWidth: 540 }
};

// Sound, for slides that have it. Headless Chrome can't capture a tab, so the page's own sound is
// captured: the narration's audio element plays through a Web Audio graph, and anything the page
// connects to a Web Audio destination (the reader's structure sounds) is also sent to the capture.
// While recording, it notes the narration's highlighted phrase every 50 ms, and when each
// structure sound starts, for the captions.
const AUDIO_SCRIPT = `
(() => {
    const capture = new AudioContext();
    const out = capture.createMediaStreamDestination();
    const connect = AudioNode.prototype.connect;
    AudioNode.prototype.connect = function (target, ...rest) {
        const result = connect.call(this, target, ...rest);
        if (target instanceof AudioDestinationNode && this.context !== capture) {
            const ctx = this.context;
            if (!ctx.tourTap) {
                ctx.tourTap = ctx.createMediaStreamDestination();
                connect.call(capture.createMediaStreamSource(ctx.tourTap.stream), out);
            }
            connect.call(this, ctx.tourTap);
        }
        return result;
    };
    const sounds = [];
    const startSource = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (when = 0, ...rest) {
        const delay = Math.max(0, when - this.context.currentTime);
        sounds.push({ time: performance.now() + delay * 1000, duration: this.buffer ? this.buffer.duration : 0 });
        return startSource.call(this, when, ...rest);
    };
    const fed = new WeakSet();
    addEventListener('play', event => {
        const media = event.target;
        if (!(media instanceof HTMLMediaElement) || fed.has(media)) return;
        fed.add(media);
        const source = capture.createMediaElementSource(media);
        connect.call(source, capture.destination);
        connect.call(source, out);
    }, true);
    const NOTES = '[role~="doc-footnote"], [role~="doc-endnote"], .epubtype_footnote, .epubtype_endnote, .epubtype_note';
    // Recording starts with the page, and the clip's sound is cut from when the clip starts: the
    // first moments of a recording aren't reliable
    // An inaudible tone (30 Hz, -80 dB) keeps the recording continuous: the recorder leaves out
    // silence, which would throw off where the clip's sound starts
    const hum = capture.createOscillator();
    const humLevel = capture.createGain();
    hum.frequency.value = 30;
    humLevel.gain.value = 0.0001;
    connect.call(connect.call(hum, humLevel), out);
    hum.start();
    const chunks = [];
    const recorder = new MediaRecorder(out.stream, { mimeType: 'audio/webm;codecs=opus' });
    recorder.ondataavailable = event => chunks.push(event.data);
    capture.resume();
    recorder.start();
    let samples, timer, t0, t0Wall;
    window.tourAudio = {
        start() {
            samples = []; sounds.length = 0; t0 = performance.now(); t0Wall = Date.now();
            timer = setInterval(() => {
                const audio = document.querySelector('audio');
                const highlight = CSS.highlights && CSS.highlights.get('narration');
                let text = '';
                // Only the words read aloud: not back links or note reference numbers, and ruby once
                if (highlight) for (const range of highlight) {
                    const node = range.commonAncestorContainer;
                    const element = node.nodeType === 1 ? node : node.parentElement;
                    if (element && element.closest('[role~="doc-backlink"], [role~="doc-noteref"], rt, rp')) continue;
                    const link = element && element.closest('a[href^="#"]');
                    const target = link && document.getElementById(decodeURIComponent(link.getAttribute('href').slice(1)));
                    if (target && target.matches(NOTES)) continue;
                    const copy = range.cloneContents();
                    copy.querySelectorAll('[role~="doc-backlink"], [role~="doc-noteref"], rt, rp').forEach(el => el.remove());
                    copy.querySelectorAll('a[href^="#"]').forEach(a => {
                        const note = document.getElementById(decodeURIComponent(a.getAttribute('href').slice(1)));
                        if (note && note.matches(NOTES)) a.remove();
                    });
                    text += copy.textContent;
                }
                samples.push({ t: (performance.now() - t0) / 1000, playing: Boolean(audio && !audio.paused), text: text.replace(/\\s+/g, ' ').trim() });
            }, 50);
        },
        stop() {
            clearInterval(timer);
            // The recording ends here, so the clip's sound is its last stretch of this length
            const clipLength = (performance.now() - t0) / 1000;
            return new Promise(resolve => {
                recorder.onstop = async () => {
                    const bytes = new Uint8Array(await new Blob(chunks).arrayBuffer());
                    let binary = '';
                    for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
                    resolve({ audio: btoa(binary), clipLength, startWall: t0Wall / 1000, samples, sounds: sounds.map(s => ({ t: (s.time - t0) / 1000, duration: s.duration })) });
                };
                recorder.stop();
            });
        }
    };
})();`;

// What each structure sound is, from its length (the SOUNDS table in structure-sounds.js)
function soundCaption(duration) {
    if (duration < 0.1) return '[tick: narration waiting at a note]';
    if (duration < 0.3) return '[two wood knocks: a list or table]';
    if (Math.abs(duration - 0.47) < 0.01) return '[bell: a note]';
    return '[two rising piano notes: a heading]';
}

// Captions describe the sound in brackets, rather than transcribing it (user, 2026-11-19): each
// stretch of narration, and each structure sound
function captions(result, length, narration = '[narration reading the highlighted text]', extra = []) {
    const cues = [];
    for (const sample of result ? result.samples : []) {
        if (!sample.playing) continue;
        const last = cues.at(-1);
        // A pause for a sound, or a jump to the next phrase, is still the same stretch
        if (last && sample.t - last.end < 1) last.end = sample.t;
        else cues.push({ start: sample.t, end: sample.t, text: narration });
    }
    for (const sound of result ? result.sounds : []) cues.push({ start: sound.t, end: sound.t + Math.max(sound.duration, 0.8), text: sound.label });
    // Keys pressed, each until the next or for 1.5 s
    extra.forEach((cue, i) => cues.push({ start: cue.t, end: Math.min(cue.t + 1.5, extra[i + 1] ? extra[i + 1].t : Infinity, length), text: cue.text }));
    // One caption at a time: where a sound plays during narration, the caption names both
    const times = [...new Set(cues.flatMap(cue => [cue.start, cue.end]))].sort((a, b) => a - b);
    const merged = [];
    for (let i = 0; i + 1 < times.length; i++) {
        const [from, to] = [times[i], times[i + 1]];
        const text = cues.filter(cue => cue.start <= from && cue.end >= to).sort((a, b) => (a.text === narration) - (b.text === narration)).map(cue => cue.text).join(' ');
        if (!text) continue;
        const last = merged.at(-1);
        if (last && last.text === text && Math.abs(last.end - from) < 0.001) last.end = to;
        else merged.push({ start: from, end: to, text });
    }
    cues.length = 0;
    cues.push(...merged);
    const stamp = s => {
        const ms = Math.round(Math.max(0, Math.min(s, length)) * 1000);
        return `${String(Math.floor(ms / 60000)).padStart(2, '0')}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}.${String(ms % 1000).padStart(3, '0')}`;
    };
    return `WEBVTT\n\n${cues.filter(cue => cue.text && cue.start < length).sort((a, b) => a.start - b.start)
        .map(cue => `${stamp(cue.start)} --> ${stamp(cue.end)}\n${cue.text}`).join('\n\n')}\n`;
}

// A visible pointer, since screencasts don't show the mouse. Clicks and typing go through it.
const POINTER_SCRIPT = `
addEventListener('DOMContentLoaded', () => {
    const dot = document.createElement('div');
    dot.id = 'tour-pointer';
    dot.setAttribute('aria-hidden', 'true');
    dot.style.cssText = 'position:fixed;z-index:2147483647;left:0;top:0;width:28px;height:28px;margin:-14px 0 0 -14px;border-radius:50%;background:rgba(255,64,64,.45);border:3px solid #fff;box-shadow:0 0 0 2px rgba(0,0,0,.5);pointer-events:none;opacity:0;transition:transform .5s ease, opacity .2s;';
    document.documentElement.append(dot);
});`;

function helpers(page, keyCues) {
    let recordingStart = null;
    const pointer = async (x, y) => page.evaluate(([x, y]) => {
        const dot = document.getElementById('tour-pointer');
        if (!dot) return;
        if (!document.documentElement.contains(dot)) document.documentElement.append(dot);
        dot.style.opacity = '1';
        dot.style.transform = `translate(${x}px, ${y}px)`;
    }, [x, y]);
    const locate = target => typeof target === 'string' ? page.locator(target).first() : target;
    const inView = box => box && box.y >= 0 && box.y + box.height <= page.viewportSize().height;
    // Moves the pointer to the element, without clicking. The mouse moves first, as a person's
    // would, so auto-hidden toolbars come back; the page only scrolls if the element is still out
    // of view.
    async function point(target, { pause = 900 } = {}) {
        const locator = locate(target);
        const viewport = page.viewportSize();
        await page.mouse.move(viewport.width / 2, viewport.height / 2);
        await page.waitForTimeout(350);
        if (!inView(await locator.boundingBox())) await locator.scrollIntoViewIfNeeded();
        const box = await locator.boundingBox();
        if (box) {
            await pointer(box.x + box.width / 2, box.y + box.height / 2);
            await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 8 });
            await page.waitForTimeout(pause);
        }
    }
    return {
        page,
        point,
        wait: ms => page.waitForTimeout(ms * PACE),
        // Moves the pointer to the element, then clicks it
        // Clicks with the mouse where the element is, as a person would. Playwright's own click
        // scrolls the page to the element first, even when it's already in view in a toolbar.
        async click(target, { pause = 900, clickCount = 1 } = {}) {
            await point(target, { pause });
            const box = await locate(target).boundingBox();
            if (inView(box)) await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { clickCount });
            else await locate(target).click({ clickCount });
        },
        // Points at a select, shows its options by opening it as a list in place (the browser's
        // own dropdown is drawn outside the page, so recordings never show it), selects the choice
        // in that list, then closes it again
        async choose(target, value, { pause = 900 } = {}) {
            await point(target, { pause });
            const locator = locate(target);
            await locator.evaluate(select => { select.size = Math.min(select.options.length, 8); });
            await page.waitForTimeout(900 * PACE);
            const option = locator.locator(`option[value="${value}"]`);
            const box = await option.boundingBox();
            if (box) {
                await pointer(box.x + Math.min(box.width / 2, 60), box.y + box.height / 2);
                await page.waitForTimeout(500 * PACE);
            }
            await locator.selectOption(value);
            await page.waitForTimeout(700 * PACE);
            await locator.evaluate(select => { select.size = 0; select.removeAttribute('size'); });
        },
        async type(text, { delay = 170 } = {}) { await page.keyboard.type(text, { delay }); },
        // Presses a key, and captions it: what's pressed and what it does
        async key(key, caption, { after = 900 } = {}) {
            if (caption && recordingStart !== null) keyCues.push({ t: (Date.now() - recordingStart) / 1000, text: caption });
            await page.keyboard.press(key);
            await page.waitForTimeout(after * PACE);
        },
        async typeCaptioned(text, caption, { delay = 220 } = {}) {
            if (caption && recordingStart !== null) keyCues.push({ t: (Date.now() - recordingStart) / 1000, text: caption });
            await page.keyboard.type(text, { delay });
        },
        startedRecording() { recordingStart = Date.now(); },
        async hidePointer() { await page.evaluate(() => { const d = document.getElementById('tour-pointer'); if (d) d.style.opacity = '0'; }); }
    };
}

async function record(browser, base, id, slide) {
    const { outputWidth, ...options } = VIEWPORTS[slide.device ?? 'desktop'];
    const context = await browser.newContext({ ...options, reducedMotion: 'no-preference', colorScheme: slide.colorScheme ?? 'light' });
    await context.addInitScript(POINTER_SCRIPT);
    if (slide.sound) await context.addInitScript(AUDIO_SCRIPT);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const keyCues = [];
    const tools = helpers(page, keyCues);

    await page.goto(new URL(slide.url, base).href, { waitUntil: 'networkidle' });
    if (slide.setup) await slide.setup(tools);
    await page.waitForTimeout(500);

    const frames = mkdtempSync(path.join(tmpdir(), `tour-${id}-`));
    const cdp = await context.newCDPSession(page);
    const list = [];
    cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
        const file = path.join(frames, `${String(list.length).padStart(5, '0')}.jpg`);
        writeFileSync(file, Buffer.from(data, 'base64'));
        list.push({ file, time: metadata.timestamp });
        await cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
    });
    const { width, height } = options.viewport;
    const scale = options.deviceScaleFactor;
    await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: width * scale, maxHeight: height * scale });
    if (slide.sound) await page.evaluate(() => window.tourAudio.start());
    const start = Date.now() / 1000;
    tools.startedRecording();
    await slide.act(tools);
    // Sound carries on a little longer, to fade out rather than stop (user, 2026-11-19)
    if (slide.sound) await page.waitForTimeout(TAIL_SECONDS * 1000);
    // The last frame is the still, so it ends without the pointer
    await tools.hidePointer();
    await page.waitForTimeout(300);
    const end = Date.now() / 1000;
    await cdp.send('Page.stopScreencast');
    const sound = slide.sound ? await page.evaluate(() => window.tourAudio.stop()) : null;
    await context.close();
    if (errors.length) console.warn(`${id}: page errors: ${errors.join('; ')}`);
    if (!list.length) throw new Error(`${id}: no frames were captured`);

    // The video starts with its first frame, which can come before the sound recording started:
    // the sound, and every caption, are lined up to it by the clock
    const videoStart = Math.min(list[0].time, start);
    const soundDelay = sound ? Math.max(0, sound.startWall - videoStart) : 0;
    if (sound) {
        sound.samples.forEach(sample => { sample.t += soundDelay; });
        sound.sounds.forEach(s => { s.t += soundDelay; });
    }
    keyCues.forEach(cue => { cue.t += start - videoStart; });
    // Each frame lasts until the next, and the last one until the recording ended
    const lines = [];
    list.forEach((frame, i) => {
        const next = i + 1 < list.length ? list[i + 1].time : Math.max(end, frame.time + 0.04);
        const from = i === 0 ? Math.min(frame.time, start) : frame.time;
        lines.push(`file '${frame.file}'`, `duration ${Math.max(next - from, 0.001).toFixed(4)}`);
    });
    lines.push(`file '${list.at(-1).file}'`);
    const concat = path.join(frames, 'frames.txt');
    writeFileSync(concat, `${lines.join('\n')}\n`);

    const video = path.join(clips, `${id}.mp4`);
    const still = path.join(clips, `${id}.jpg`);
    // Clips with captions get a dark strip under the recording, where the browser shows them,
    // so they don't cover the reader's toolbar in the recording (user, 2026-11-19)
    // Tall enough for the browser's controls and one line of captions above them
    const band = slide.sound || keyCues.length ? Math.round(outputWidth * (slide.device === 'phone' ? 0.26 : 0.13) / 2) * 2 : 0;
    const scaleFilter = `scale=${outputWidth}:-2:flags=lanczos${band ? `,pad=iw:ih+${band}:0:0:color=0x111111` : ''}`;
    const audioArgs = ['-an'];
    let audioInput = [];
    if (sound) {
        const recorded = path.join(frames, 'sound.webm');
        writeFileSync(recorded, Buffer.from(sound.audio, 'base64'));
        // Decoded first, for its true length (the recorder's file doesn't say)
        const audioFile = path.join(frames, 'sound.wav');
        run('ffmpeg', ['-y', '-v', 'quiet', '-i', recorded, audioFile]);
        const recordedLength = Number(spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', audioFile]).stdout.toString());
        audioInput = ['-ss', Math.max(0, recordedLength - sound.clipLength).toFixed(3), '-i', audioFile];
        const fadeStart = Math.max(0, end - videoStart - FADE_SECONDS).toFixed(2);
        const delay = Math.round(soundDelay * 1000);
        audioArgs.splice(0, 1, '-map', '0:v', '-map', '1:a', '-af', `adelay=delays=${delay}:all=1,apad,afade=t=out:st=${fadeStart}:d=${FADE_SECONDS}`, '-shortest', '-c:a', 'aac', '-b:a', '96k');
        sound.sounds.forEach(s => { s.label = soundCaption(s.duration); });
        if (process.env.TOUR_DEBUG) console.log(id, JSON.stringify(sound.sounds));
    }
    if (sound || keyCues.length) writeFileSync(path.join(clips, `${id}.vtt`), captions(sound, end - videoStart, slide.narrationCaption, keyCues));
    run('ffmpeg', ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', concat, ...audioInput,
        '-vf', `${scaleFilter},fps=30,format=yuv420p`, '-c:v', 'libx264', '-preset', 'slow', '-crf', '26',
        '-profile:v', 'high', '-movflags', '+faststart', ...audioArgs, video]);
    run('ffmpeg', ['-y', '-v', 'error', '-i', list.at(-1).file, '-vf', scaleFilter, '-q:v', '4', still]);
    rmSync(frames, { recursive: true, force: true });
    const seconds = (end - start).toFixed(1);
    console.log(`${id}: ${seconds} s, ${(statSync(video).size / 1024).toFixed(0)} KB video, ${(statSync(still).size / 1024).toFixed(0)} KB still`);
}

function run(command, args) {
    const result = spawnSync(command, args, { stdio: 'inherit' });
    if (result.status !== 0) throw new Error(`${command} failed`);
}

const wanted = process.argv.slice(2);
const ids = wanted.length ? wanted : Object.keys(slides);
for (const id of ids) if (!slides[id]) throw new Error(`No slide called ${id}. Slides: ${Object.keys(slides).join(', ')}`);
mkdirSync(clips, { recursive: true });

const server = await serve();
const base = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || undefined,
    args: ['--autoplay-policy=no-user-gesture-required']
});
try {
    for (const id of ids) await record(browser, base, id, slides[id]);
} finally {
    await browser.close();
    server.close();
}
