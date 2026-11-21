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
const { convert, vfs, releaseAll } = globalThis.spike;

let templateLoaded;
function loadTemplate() {
    templateLoaded ??= Promise.all([
        fetch('dist/template.json').then(r => r.json()).then(files => {
            for (const [rel, b64] of Object.entries(files)) vfs.writeFileSync(`/template/${rel}`, Uint8Array.from(atob(b64), c => c.charCodeAt(0)));
        }),
        // The converter reads its version from the package.json above its own module (convert.ts:
        // new URL('../package.json', import.meta.url)). In the bundle that's relative to
        // dist/converter.js, so its path depends on where the page is hosted: /package.json at a
        // server's root, /accessible-books-in-browsers/converter/package.json on GitHub Pages.
        fetch('dist/converter-package.json').then(r => r.text()).then(text =>
            vfs.writeFileSync(decodeURIComponent(new URL('../package.json', new URL('dist/converter.js', document.baseURI)).pathname), text))
    ]);
    return templateLoaded;
}

// The beta reader channel (plan 11)
const UI_CHANNEL = 'https://webbook.daisy.org/ui/releases/v0/';
// The converter's options, listed once in convert/src/options.ts: the command line and this page's
// form both come from it. Defaults are the command line's.
const OPTIONS = globalThis.spike.options, OPTION_GROUPS = globalThis.spike.optionGroups;
export const CLI_DEFAULTS = Object.fromEntries(OPTIONS.flatMap(option =>
    option.web.kind === 'list' ? [[option.key, option.web.items.map(item => item.value)]]
        : typeof option.defaultValue === 'boolean' ? [[option.key, option.defaultValue]] : []));
// Converts EPUB bytes; returns the output as { path: Uint8Array }, and the conversion report's data
export async function convertBytes(bytes, options = {}, fileName = 'book.epub') {
    options = { ...CLI_DEFAULTS, ...options, audioCache: false };
    if (options.remoteUi && !options.uiBaseUrl) options.uiBaseUrl = UI_CHANNEL;
    await loadTemplate();
    await releaseConversion();
    // Use the selected EPUB's filename for the conversion report and each page's source metadata.
    const name = String(fileName).replace(/[\\/\u0000]/g, '_') || 'book.epub';
    vfs.writeFileSync(`/in/${name}`, bytes);
    try {
        const report = await convert(`/in/${name}`, '/out', '/template', options);
        const files = {};
        for (const [p, data] of vfs.files) if (p.startsWith('/out/')) files[p.slice(5)] = data;
        return { files, report };
    } finally {
        await releaseConversion();
    }
}
// Everything one conversion leaves in memory, whether it worked or not: the EPUB, the output (once
// it's been handed back), the unpacked EPUB and other temporary files in /tmp, and ffmpeg.wasm's
// decoded audio and files. The template stays: it's the same for every book.
async function releaseConversion() {
    for (const folder of ['/in', '/out', '/tmp']) vfs.removeSync(folder);
    await releaseAll();
}
globalThis.convertBytes = convertBytes;

// --- The page (skipped by the test harnesses' pages, which have no form) ---
const form = document.getElementById('convert-form');
if (form) initPage();

// The option controls, built from the options list: fieldsets with legends, labeled checkboxes,
// radio buttons and text fields, and hints tied to them with aria-describedby
function buildOptionForm(container) {
    const el = (tag, props = {}, ...children) => { const node = Object.assign(document.createElement(tag), props); node.append(...children); return node; };
    const hint = (id, text) => el('p', { className: 'hint', id, textContent: text });
    const check = (type, id, name, checked, label, hintText, value) => {
        const input = el('input', { type, id, name: name ?? '', checked });
        if (value !== undefined) input.value = String(value);
        const row = el('div', { className: 'check' }, input, el('label', { htmlFor: id, textContent: label }));
        if (hintText) { input.setAttribute('aria-describedby', id + '-hint'); row.append(hint(id + '-hint', hintText)); }
        return row;
    };
    const control = option => {
        const web = option.web;
        if (web.kind === 'checkbox') return [check('checkbox', option.key, null, option.defaultValue === true, web.label, web.hint)];
        if (web.kind === 'choice') return web.choices.map(choice => check('radio', `${option.key}-${choice.value ? 'yes' : 'no'}`, option.key,
            choice.value === (option.defaultValue === true), choice.label, choice.hint, choice.value));
        if (web.kind === 'text') {
            const input = el('input', { type: 'text', id: option.key, autocomplete: 'off', spellcheck: false });
            input.setAttribute('aria-describedby', `${option.key}-hint ${option.key}-error`);
            return [el('div', { className: 'field' }, el('label', { htmlFor: option.key, textContent: web.label }), hint(option.key + '-hint', web.hint), input,
                el('p', { className: 'field-error', id: option.key + '-error' }))];
        }
        if (web.kind === 'list') {
            const set = el('fieldset', { id: option.key + '-items', className: 'nested' }, el('legend', { textContent: web.label }), hint(option.key + '-items-hint', web.hint));
            set.setAttribute('aria-describedby', option.key + '-items-hint');
            for (const item of web.items) set.append(check('checkbox', `${option.key}-${item.value}`, null, true, item.label, '', item.value));
            return [set];
        }
        return [];
    };
    for (const group of OPTION_GROUPS) {
        const members = OPTIONS.filter(option => !('omitted' in option.web) && option.web.group === group.id);
        if (!members.length) continue;
        const parts = members.flatMap(control);
        if (group.id === 'advanced') { container.append(el('details', {}, el('summary', { textContent: group.legend }), ...parts)); continue; }
        const set = el('fieldset', { id: 'group-' + group.id }, el('legend', { textContent: group.legend }));
        if (group.hint) { set.append(hint(`group-${group.id}-hint`, group.hint)); set.setAttribute('aria-describedby', `group-${group.id}-hint`); }
        if (group.id === 'narration') set.append(Object.assign(hint('no-narration', 'This book has no narration, so these don’t apply.'), { hidden: true }));
        set.append(...parts);
        container.append(set);
    }
}

// The chosen options, read from the form the same way it was built; the language is checked
function readOptions() {
    const result = {};
    for (const option of OPTIONS) {
        const web = option.web, control = document.getElementById(option.key);
        if ('omitted' in web) continue;
        if (web.kind === 'checkbox') result[option.key] = control.checked;
        else if (web.kind === 'choice') result[option.key] = document.querySelector(`input[name="${option.key}"]:checked`)?.value === 'true';
        else if (web.kind === 'text') { const value = control.value.trim(); if (value) result[option.key] = value; }
        else if (web.kind === 'list') result[option.key] = document.getElementById(web.parent).checked
            ? web.items.filter(item => document.getElementById(`${option.key}-${item.value}`).checked).map(item => item.value) : [];
    }
    if (result.language) result.language = Intl.getCanonicalLocales(result.language)[0];   // throws on a bad tag
    // Reader updates (user, 2026-11-17): the beta channel unless the person chooses the bundled reader
    if (result.remoteUi) result.uiBaseUrl = UI_CHANNEL;
    return result;
}

function initPage() {
    const $ = id => document.getElementById(id);
    buildOptionForm($('option-groups'));
    const fileInput = $('book'), info = $('book-info'), checkErrors = $('check-errors');
    const status = $('status'), errorBox = $('error');
    const progressSection = $('progress-section'), progress = $('progress'), progressDetail = $('progress-detail');
    const result = $('result'), download = $('download'), report = $('report');
    const cleanup = $('audioCleanup'), enhancements = $('audioEnhance-items');
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
    // About 4 s per narrated minute through this page in Chrome on the user's Mac (Kusamakura: 4 minutes
    // for 1 hour; direct runs were faster, 2.4 s, for reasons not yet found)
    const RATE = 4 / 60;
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
        const rows = [['Title', check.book.title], ['Language', check.book.language],
            ['Narration', check.book.narrationSeconds ? minutesText(check.book.narrationSeconds) : 'none'],
            ['Conversion time', `${estimateText(check.book.narrationSeconds)} on a recent computer`]];
        const dl = document.createElement('dl');
        for (const [term, value] of rows) { const dt = document.createElement('dt'), dd = document.createElement('dd'); dt.textContent = term; dd.textContent = value; dl.append(dt, dd); }
        info.append(dl);
        for (const message of check.warnings) { const p = document.createElement('p'); p.className = 'hint'; p.textContent = message; info.append(p); }
        info.hidden = false;
        const narrated = check.book.narrationSeconds > 0;
        $('no-narration').hidden = narrated;
        for (const element of $('group-narration').querySelectorAll('input')) element.disabled = !narrated || (element.closest('#audioEnhance-items') && !cleanup.checked);
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
        $('chapter-hint').textContent = chapters.length === 1 ? 'This book is a single content document, so the preview is the whole book.'
            : narrated ? 'The first narrated content document is chosen; pick any other.' : 'This book has no narration.';
    });

    const options = readOptions;

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
        if (!chapter) { fail('Choose a content document to preview.', chapterSelect); return; }
        // A preview of the book under its own ID would share the book's saved reading positions
        const identifier = `${chosen.identifier || book.check.book.identifier} (preview)`;
        // Partial narration (user, 2026-11-17): the first 5 minutes, unless the person asks for all of it
        const PREVIEW_NARRATION = 5 * 60;
        const short = $('preview-short').checked && chapter.seconds > PREVIEW_NARRATION;
        const share = short ? PREVIEW_NARRATION / chapter.seconds : 1;
        const converted = await run({ title: `“${chapter.title}”`, bytes: chapterEpub(book.bytes, book.check.book.opfPath, chapter.idref, short ? { narrationLimit: PREVIEW_NARRATION } : {}),
            options: { ...chosen, identifier }, narration: chapter.seconds * share, clips: Math.ceil(chapter.clips * share), pages: chapter.narrated ? 1 : 0 });
        if (!converted) return;
        const url = await showPreview(converted.files);
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
        const converted = await run({ title: book.check.book.title, bytes: book.bytes, options: chosen, narration: book.check.book.narrationSeconds,
            clips: book.check.book.narrationClips, pages: book.check.book.chapters.filter(chapter => chapter.narrated).length, whole: true });
        if (!converted) return;
        const out = converted.files;
        recordConfirmation(out);
        const zip = zipSync(out, { level: 0 });   // the audio is already compressed; storing is much faster
        if (download.href) URL.revokeObjectURL(download.href);
        download.href = URL.createObjectURL(new Blob([zip], { type: 'application/zip' }));
        download.download = book.file.name.replace(/\.epub$/i, '') + '-web.zip';
        showReport(converted.report);
        $('result-summary').textContent = `${Object.keys(out).length} files, ${(zip.byteLength / 1e6).toFixed(1)} MB.`;
        form.hidden = true; result.hidden = false;
        status.textContent = `Finished. ${$('result-summary').textContent}`;
        $('result-heading').focus();
    });

    // Converts with progress; returns { files, report }, or null after showing the error
    async function run({ title, bytes, options: chosen, narration, clips, pages, whole = false }) {
        form.hidden = true; result.hidden = true; progressSection.hidden = false;
        $('progress-what').textContent = whole ? `The whole book, ${title}.` : `A preview of ${title}.`;
        $('progress-heading').focus();
        status.textContent = `Converting ${whole ? 'the whole book' : `a preview of ${title}`}. ${narration ? `${estimateText(narration)[0].toUpperCase()}${estimateText(narration).slice(1)}.` : ''}`;
        const started = performance.now();
        // Progress follows the time estimate from the narration's length. Counting audio steps ran far
        // ahead: cutting and fading each clip is quick, and the slow work (cleaning up and encoding each
        // page's whole audio) comes last. Past the estimate it says so rather than counting down.
        const expected = estimateSeconds(narration);
        const tick = setInterval(() => {
            const elapsed = (performance.now() - started) / 1000;
            if (!narration) { progress.removeAttribute('value'); progressDetail.textContent = 'Converting the book…'; return; }
            const fraction = Math.min(0.99, elapsed / expected);
            progress.max = 100; progress.value = Math.round(fraction * 100);
            const left = expected - elapsed;
            progressDetail.textContent = left <= 0 ? 'Converting the narration: taking longer than expected, almost done.'
                : `Converting the narration: about ${Math.round(fraction * 100)}% done, ${left < 60 ? 'less than a minute' : `about ${minutesText(left)}`} left.`;
        }, 1000);
        // Screen readers hear the progress once a minute, not every second
        const announce = setInterval(() => { if (narration) status.textContent = progressDetail.textContent; }, 60000);
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
        if (out['conversion-report.md']) out['conversion-report.md'] = strToU8(strFromU8(out['conversion-report.md']).replace(/\n/, `\n\n${note}\n`));
    }

    function showReport(data) {
        report.replaceChildren();
        if (!data) return;
        const h = document.createElement('h3'); h.textContent = 'What to review'; report.append(h);
        const warnings = data.warnings ?? [];
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
