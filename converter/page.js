// The converter page (plan 19, step 5). The converter's own source runs here, bundled with
// stand-ins for Node (dist/converter-wasm.js); narration is converted with approach C.
// Preview one chapter, then convert the whole book to a zip (user, 2026-11-17).
// The browser cuts each narration clip and ffmpeg.wasm does the rest ("approach C"). URL options for
// testing: ?audio=wasm (ffmpeg.wasm for everything, "approach A"); ?align=off; ?free=off.
const AUDIO = new URLSearchParams(location.search).get('audio') === 'wasm' ? 'wasm' : 'wasm-c';
await import('./dist/converter.js');
import { zipSync, strToU8, strFromU8 } from './vendor/fflate.js';
import { checkEpub } from './epub-check.js';
import { chapterEpub, showPreview, previewAvailable, cleanUp } from './preview.js';
const { convert, vfs } = globalThis.spike;

let templateLoaded;
function loadTemplate() {
    templateLoaded ??= Promise.all([
        fetch('dist/template.json').then(r => r.json()).then(files => {
            for (const [rel, b64] of Object.entries(files)) vfs.writeFileSync(`/template/${rel}`, Uint8Array.from(atob(b64), c => c.charCodeAt(0)));
        }),
        // The converter reads its version from its package.json, next to its build
        fetch('dist/converter-package.json').then(r => r.text()).then(text => vfs.writeFileSync('/package.json', text))
    ]);
    return templateLoaded;
}

// The beta reader channel (plan 11)
const UI_CHANNEL = 'https://daisy.github.io/accessible-books-in-browsers/v0/';
// The command line's defaults (convert/src/index.ts)
export const CLI_DEFAULTS = { smallAudio: true, audioCleanup: true, audioEnhance: ['warm-eq', 'compression', 'noise', 'deess', 'declick'], headingTitles: true, publisherStyles: true, includeNonLinear: false, splitChapters: true };
// Converts EPUB bytes; returns the output as { path: Uint8Array }
export async function convertBytes(bytes, options = {}, fileName = 'book.epub') {
    options = { ...CLI_DEFAULTS, ...options, audioCache: false };
    await loadTemplate();
    vfs.removeSync('/in'); vfs.removeSync('/out');
    // The converter records the EPUB's file name in the report and each page, so keep the person's own
    const name = String(fileName).replace(/[\\/\u0000]/g, '_') || 'book.epub';
    vfs.writeFileSync(`/in/${name}`, bytes);
    await convert(`/in/${name}`, '/out', '/template', options);
    const out = {};
    for (const [p, data] of vfs.files) if (p.startsWith('/out/')) out[p.slice(5)] = data;
    vfs.removeSync('/in'); vfs.removeSync('/out');
    return out;
}
globalThis.convertBytes = convertBytes;

// --- The page (skipped by the test harnesses' pages, which have no form) ---
const form = document.getElementById('convert-form');
if (form) initPage();

function initPage() {
    const $ = id => document.getElementById(id);
    const fileInput = $('book'), info = $('book-info'), checkErrors = $('check-errors');
    const status = $('status'), errorBox = $('error');
    const progressSection = $('progress-section'), progress = $('progress'), progressDetail = $('progress-detail');
    const result = $('result'), download = $('download'), report = $('report');
    const cleanup = $('audioCleanup'), enhancements = $('enhancements');
    const confirmBox = $('confirm-valid'), confirmError = $('confirm-error');
    const language = $('language'), languageError = $('language-error');
    const chapterSelect = $('chapter'), previewArea = $('preview-area'), previewFrame = $('preview-frame');
    let book = null;   // { file, bytes, check }

    // Remove what earlier versions of this page kept in the browser, and any old preview
    cleanUp().catch(() => {});

    // Desktop only (user, 2026-11-17): a device with only a coarse pointer is a phone or tablet
    if (matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches) {
        $('device-notice').hidden = false;
        for (const element of form.elements) element.disabled = true;
    }

    const syncEnhancements = () => { enhancements.disabled = !cleanup.checked; };
    cleanup.addEventListener('change', syncEnhancements); syncEnhancements();

    const minutesText = seconds => {
        const m = Math.round(seconds / 60);
        if (seconds < 60) return 'under a minute';
        if (m < 60) return `${m} minute${m === 1 ? '' : 's'}`;
        const h = Math.floor(m / 60), r = m % 60;
        return `${h} hour${h === 1 ? '' : 's'}${r ? ` ${r} minute${r === 1 ? '' : 's'}` : ''}`;
    };
    // About 2.4 s per narrated minute in Chrome on the user's Mac (plan 19 findings); slower computers correct it while running
    const RATE = 2.5 / 60;
    const estimateSeconds = narration => 5 + narration * RATE;
    const estimateText = narration => estimateSeconds(narration) < 60 ? 'less than a minute' : `about ${minutesText(estimateSeconds(narration))}`;

    fileInput.addEventListener('change', async () => {
        const file = fileInput.files[0];
        info.hidden = true; info.replaceChildren(); checkErrors.replaceChildren(); errorBox.replaceChildren(); book = null;
        previewArea.hidden = true; previewFrame.removeAttribute('src');
        chapterSelect.replaceChildren(); chapterSelect.disabled = true; $('chapter-hint').textContent = 'Choose an EPUB first.';
        if (!file) return;
        const bytes = new Uint8Array(await file.arrayBuffer());
        const check = checkEpub(bytes);
        if (check.errors.length) {
            const intro = document.createElement('p'); intro.textContent = `${file.name} can’t be converted:`;
            const list = document.createElement('ul');
            for (const message of check.errors) { const li = document.createElement('li'); li.textContent = message; list.append(li); }
            checkErrors.append(intro, list);
            return;
        }
        book = { file, bytes, check };
        const rows = [['Title', check.book.title], ['Language', check.book.language], ['Pages', String(check.book.pages)],
            ['Narration', check.book.narrationSeconds ? minutesText(check.book.narrationSeconds) : 'none'],
            ['Converting the whole book takes', `${estimateText(check.book.narrationSeconds)} on a recent computer`]];
        const dl = document.createElement('dl');
        for (const [term, value] of rows) { const dt = document.createElement('dt'), dd = document.createElement('dd'); dt.textContent = term; dd.textContent = value; dl.append(dt, dd); }
        info.append(dl);
        for (const message of check.warnings) { const p = document.createElement('p'); p.className = 'hint'; p.textContent = message; info.append(p); }
        info.hidden = false;
        const narrated = check.book.narrationSeconds > 0;
        $('no-narration').hidden = narrated;
        for (const element of $('narration-options').querySelectorAll('input')) element.disabled = !narrated || (element.closest('#enhancements') && !cleanup.checked);
        // The chapters to preview: the first narrated one is chosen, so a narrated book previews its narration
        const chapters = check.book.chapters.filter(chapter => chapter.linear);
        for (const chapter of chapters) {
            const option = document.createElement('option');
            option.value = String(chapter.index);
            option.textContent = chapter.narrated ? `${chapter.title} (narrated, ${minutesText(chapter.seconds)})` : chapter.title;
            chapterSelect.append(option);
        }
        const first = chapters.find(chapter => chapter.narrated) ?? chapters[0];
        if (first) chapterSelect.value = String(first.index);
        chapterSelect.disabled = !chapters.length;
        $('chapter-hint').textContent = narrated ? 'The first narrated chapter is chosen; pick any other.' : 'This book has no narration.';
    });

    function options() {
        const audioEnhance = cleanup.checked ? [...enhancements.querySelectorAll('input:checked')].map(input => input.value) : [];
        // Reader updates (user, 2026-11-17): the beta channel unless the person chooses the bundled reader
        const channel = $('ui-channel').checked ? { remoteUi: true, uiBaseUrl: UI_CHANNEL } : { remoteUi: false };
        const result = { ...channel, smallAudio: $('smallAudio').checked, audioCleanup: cleanup.checked, audioEnhance, publisherStyles: $('publisherStyles').checked, headingTitles: $('headingTitles').checked, splitChapters: $('splitChapters').checked, includeNonLinear: $('includeNonLinear').checked };
        const tag = language.value.trim();
        if (tag) result.language = Intl.getCanonicalLocales(tag)[0];
        const id = $('identifier').value.trim();
        if (id) result.identifier = id;
        return result;
    }

    function fail(message, focusTarget) {
        errorBox.replaceChildren(Object.assign(document.createElement('p'), { textContent: message }));
        focusTarget?.focus();
    }

    // What both the preview and the whole conversion need first; returns the options, or null
    function ready() {
        errorBox.replaceChildren(); confirmError.textContent = ''; languageError.textContent = '';
        if (!book) { fail('Choose an EPUB file first.', fileInput); return null; }
        if (!confirmBox.checked) { confirmError.textContent = 'Check your EPUB with EPUBCheck, then tick this box.'; confirmBox.focus(); return null; }
        try { return options(); }
        catch { languageError.textContent = 'That isn’t a valid language tag. Try one like en, fr-CA or bn.'; $('identifier').closest('details').open = true; language.focus(); return null; }
    }

    $('preview-button').addEventListener('click', async () => {
        const chosen = ready();
        if (!chosen) return;
        if (!previewAvailable()) { fail('Previews need a secure page (https or localhost) with browser storage turned on. You can still convert the whole book.'); return; }
        const chapter = book.check.book.chapters.find(item => String(item.index) === chapterSelect.value);
        if (!chapter) { fail('Choose a chapter to preview.', chapterSelect); return; }
        // A preview of the book under its own ID would share the book's saved reading positions
        const identifier = `${chosen.identifier || book.check.book.identifier} (preview)`;
        // Partial narration (user, 2026-11-17): the first 5 minutes, unless the person asks for all of it
        const PREVIEW_NARRATION = 5 * 60;
        const short = $('preview-short').checked && chapter.seconds > PREVIEW_NARRATION;
        const share = short ? PREVIEW_NARRATION / chapter.seconds : 1;
        const out = await run({ title: `“${chapter.title}”`, bytes: chapterEpub(book.bytes, book.check.book.opfPath, chapter.idref, short ? { narrationLimit: PREVIEW_NARRATION } : {}),
            options: { ...chosen, identifier }, narration: chapter.seconds * share, clips: Math.ceil(chapter.clips * share), pages: chapter.narrated ? 1 : 0 });
        if (!out) return;
        const url = await showPreview(out);
        previewFrame.src = url + '?preview=' + Date.now();
        $('preview-open').href = url;
        previewFrame.title = `Preview of ${chapter.title}`;
        $('preview-summary').textContent = `Preview of “${chapter.title}”, with the options above${short ? '; narration stops after about 5 minutes' : ''}. Change them and preview again, or convert the whole book.`;
        previewArea.hidden = false;
        status.textContent = `Preview of ${chapter.title} ready.`;
        $('preview-summary').tabIndex = -1; $('preview-summary').focus();
    });

    form.addEventListener('submit', async event => {
        event.preventDefault();
        const chosen = ready();
        if (!chosen) return;
        const out = await run({ title: book.check.book.title, bytes: book.bytes, options: chosen, narration: book.check.book.narrationSeconds,
            clips: book.check.book.narrationClips, pages: book.check.book.chapters.filter(chapter => chapter.narrated).length, whole: true });
        if (!out) return;
        recordConfirmation(out);
        const zip = zipSync(out, { level: 0 });   // the audio is already compressed; storing is much faster
        if (download.href) URL.revokeObjectURL(download.href);
        download.href = URL.createObjectURL(new Blob([zip], { type: 'application/zip' }));
        download.download = book.file.name.replace(/\.epub$/i, '') + '-web.zip';
        showReport(out);
        $('result-summary').textContent = `${Object.keys(out).length} files, ${(zip.byteLength / 1e6).toFixed(1)} MB.`;
        form.hidden = true; result.hidden = false;
        status.textContent = `Finished. ${$('result-summary').textContent}`;
        $('result-heading').focus();
    });

    // Converts with progress; returns the output, or null after showing the error
    async function run({ title, bytes, options: chosen, narration, clips, pages, whole = false }) {
        form.hidden = true; result.hidden = true; progressSection.hidden = false;
        $('progress-what').textContent = whole ? `The whole book, ${title}.` : `A preview of ${title}.`;
        $('progress-heading').focus();
        status.textContent = `Converting ${whole ? 'the whole book' : `a preview of ${title}`}. ${narration ? `${estimateText(narration)[0].toUpperCase()}${estimateText(narration).slice(1)}.` : ''}`;
        const started = performance.now();
        // Progress follows the audio work: each clip is cut, then faded, and each narrated page takes
        // about five more steps (join, measure, normalise, encode, check). Counted from this run's start.
        const steps = clips * 2 + pages * 5;
        const base = { ...(globalThis.spike.wasmStats ?? {}) };
        const done = () => { const stats = globalThis.spike.wasmStats ?? {}; return ((stats.cuts ?? 0) - (base.cuts ?? 0)) + ((stats.commands ?? 0) - (base.commands ?? 0)); };
        const tick = setInterval(() => {
            const elapsed = (performance.now() - started) / 1000;
            if (!steps) { progress.removeAttribute('value'); progressDetail.textContent = `${minutesText(elapsed)} so far.`; return; }
            const fraction = Math.min(0.99, done() / steps);
            progress.max = 100; progress.value = Math.round(fraction * 100);
            const left = fraction > 0.05 ? elapsed / fraction - elapsed : estimateSeconds(narration) - elapsed;
            progressDetail.textContent = `Converting the narration (${Math.round(fraction * 100)}%). ${minutesText(elapsed)} so far; about ${minutesText(Math.max(0, left))} left.`;
        }, 1000);
        // Screen readers hear the progress once a minute, not every second
        const announce = setInterval(() => { if (steps) status.textContent = progressDetail.textContent; }, 60000);
        try {
            return await convertBytes(bytes, chosen, book.file.name);
        } catch (e) {
            console.error(e);
            fail(`The book couldn’t be converted: ${e.message}`);
            status.textContent = 'The book couldn’t be converted.';
            errorBox.setAttribute('tabindex', '-1'); errorBox.focus();
            return null;
        } finally {
            clearInterval(tick); clearInterval(announce);
            progressSection.hidden = true; form.hidden = false;
        }
    }

    // The conversion report says who checked the EPUB: the user, not the converter (plan 19, step 5)
    function recordConfirmation(out) {
        const note = 'EPUBCheck: confirmed by the person converting; the browser converter ran basic checks only.';
        if (out['conversion-report.json']) {
            const json = JSON.parse(strFromU8(out['conversion-report.json']));
            json.validation = { epubcheck: 'confirmed by the person converting', converterChecks: 'basic (browser)' };
            out['conversion-report.json'] = strToU8(JSON.stringify(json, null, 2) + '\n');
        }
        if (out['conversion-report.md']) out['conversion-report.md'] = strToU8(strFromU8(out['conversion-report.md']).replace(/\n/, `\n\n${note}\n`));
    }

    function showReport(out) {
        report.replaceChildren();
        if (!out['conversion-report.json']) return;
        const json = JSON.parse(strFromU8(out['conversion-report.json']));
        const h = document.createElement('h3'); h.textContent = 'What to review'; report.append(h);
        const warnings = json.warnings ?? [];
        if (!warnings.length) { report.append(Object.assign(document.createElement('p'), { className: 'ok', textContent: 'No warnings.' })); }
        else {
            report.append(Object.assign(document.createElement('p'), { textContent: `${warnings.length} warning${warnings.length === 1 ? '' : 's'}, by kind. The full report is in the zip (conversion-report.md).` }));
            const kinds = new Map();
            for (const w of warnings) { if (!kinds.has(w.kind)) kinds.set(w.kind, []); kinds.get(w.kind).push(w); }
            for (const [kind, list] of kinds) {
                const details = document.createElement('details'), summary = document.createElement('summary'), ul = document.createElement('ul');
                summary.textContent = `${kind} (${list.length})`;
                for (const w of list.slice(0, 50)) { const li = document.createElement('li'); li.className = 'detail'; li.textContent = `${w.page ? w.page + ': ' : ''}${w.message}`; ul.append(li); }
                if (list.length > 50) ul.append(Object.assign(document.createElement('li'), { className: 'detail', textContent: `and ${list.length - 50} more in the report.` }));
                details.append(summary, ul); report.append(details);
            }
        }
    }

    $('again').addEventListener('click', () => {
        result.hidden = true; form.hidden = false; fileInput.value = ''; info.hidden = true; book = null; confirmBox.checked = false;
        previewArea.hidden = true; previewFrame.removeAttribute('src');
        chapterSelect.replaceChildren(); chapterSelect.disabled = true;
        fileInput.focus();
    });
}
