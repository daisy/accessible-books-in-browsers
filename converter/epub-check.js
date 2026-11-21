// Basic EPUB checks the browser can run before converting (plan 19, step 5). EPUBCheck can't run
// here, so the page also asks the user to confirm the book passes it; these checks only catch
// books the converter can't read at all, and give the page the book's title, language and the
// length of its narration (for the time estimate).
import { unzipSync, strFromU8 } from './vendor/fflate.js';
import { unsafeZipName } from './zip-names.js';

const OPF_NS = 'http://www.idpf.org/2007/opf';
const DC_NS = 'http://purl.org/dc/elements/1.1/';

// A SMIL clock value in seconds: "1:02:03.5", "02:03.5", "3.5s", "350ms", "2min", "1h", "3.5"
export function clockSeconds(value) {
    if (!value) return 0;
    const v = value.trim().replace(/^npt=/, '');
    let m = v.match(/^(?:(\d+):)?(\d+):(\d+(?:\.\d+)?)$/);
    if (m) return Number(m[1] ?? 0) * 3600 + Number(m[2]) * 60 + Number(m[3]);
    m = v.match(/^(\d+(?:\.\d+)?)(h|min|s|ms)?$/);
    if (!m) return 0;
    return Number(m[1]) * ({ h: 3600, min: 60, s: 1, ms: 0.001 }[m[2] ?? 's']);
}

function resolve(base, href) {
    const url = new URL(href, 'https://book.invalid/' + base);
    return decodeURIComponent(url.pathname.slice(1));
}

// Returns { errors: [], warnings: [], book: { title, language, identifier, version, pages, narrationSeconds } }
export function checkEpub(bytes) {
    const errors = [], warnings = [], book = {};
    let files;
    try { files = unzipSync(bytes); } catch { return { errors: ["This file isn't a zip archive, so it isn't an EPUB."], warnings, book }; }
    // A name that leads out of the book's folder (../, a leading /, a drive or a backslash) could
    // overwrite other files while unzipping; a valid EPUB never has one
    const unsafe = Object.keys(files).filter(unsafeZipName);
    if (unsafe.length) return { errors: [`This EPUB has file names that lead outside the book (${unsafe.slice(0, 3).join(', ')}), so it isn't valid and can't be converted.`], warnings, book };
    const text = name => (files[name] ? strFromU8(files[name]) : null);
    const xml = (name, source) => {
        const doc = new DOMParser().parseFromString(source, 'application/xml');
        if (doc.querySelector('parsererror')) { errors.push(`${name} isn't well-formed XML.`); return null; }
        return doc;
    };

    if (text('mimetype')?.trim() !== 'application/epub+zip') warnings.push('The mimetype file is missing or wrong. EPUBCheck would report this.');
    const containerSource = text('META-INF/container.xml');
    if (!containerSource) { errors.push('META-INF/container.xml is missing, so the book’s package can’t be found.'); return { errors, warnings, book }; }
    const container = xml('META-INF/container.xml', containerSource);
    const opfPath = container?.querySelector('rootfile')?.getAttribute('full-path');
    if (!opfPath) { errors.push('META-INF/container.xml doesn’t name the package file.'); return { errors, warnings, book }; }
    const opfSource = text(opfPath);
    if (!opfSource) { errors.push(`The package file ${opfPath} is missing.`); return { errors, warnings, book }; }
    const opf = xml(opfPath, opfSource);
    if (!opf) return { errors, warnings, book };

    const pkg = opf.documentElement;
    book.version = pkg.getAttribute('version') ?? '';
    const dc = name => [...opf.getElementsByTagNameNS(DC_NS, name)].map(e => e.textContent.trim()).filter(Boolean);
    const uid = pkg.getAttribute('unique-identifier');
    book.identifier = uid ? [...opf.getElementsByTagNameNS(DC_NS, 'identifier')].find(e => e.getAttribute('id') === uid)?.textContent.trim() : undefined;
    book.title = dc('title')[0];
    book.language = dc('language')[0];
    if (!book.identifier) errors.push('The package has no unique identifier. It is the book’s ID, which keeps reading positions.');
    if (!book.title) errors.push('The package has no title.');
    if (!book.language) errors.push('The package has no language.');

    const manifest = new Map();
    for (const item of opf.getElementsByTagNameNS(OPF_NS, 'item')) {
        const href = item.getAttribute('href');
        if (!href) continue;
        const full = resolve(opfPath, href);
        manifest.set(item.getAttribute('id'), { href: full, type: item.getAttribute('media-type'), properties: item.getAttribute('properties') ?? '', overlay: item.getAttribute('media-overlay') });
        if (!/^[a-z]+:/i.test(href) && !files[full]) errors.push(`A file listed in the package is missing: ${full}`);
    }
    const spine = [...opf.getElementsByTagNameNS(OPF_NS, 'itemref')].map(ref => ref.getAttribute('idref'));
    if (!spine.length) errors.push('The package’s spine is empty: there are no pages to read.');
    for (const idref of spine) if (!manifest.has(idref)) errors.push(`The spine names an item that isn’t in the manifest: ${idref}`);
    book.pages = spine.length;
    // The chapters, in reading order, for choosing one to preview: titled from the table of
    // contents where it points at the file, and marked when they have narration
    const navItem = [...manifest.values()].find(item => /\bnav\b/.test(item.properties));
    const titles = new Map();
    if (navItem && files[navItem.href]) {
        const nav = new DOMParser().parseFromString(strFromU8(files[navItem.href]), 'application/xhtml+xml');
        const toc = [...nav.getElementsByTagName('nav')].find(n => (n.getAttributeNS('http://www.idpf.org/2007/ops', 'type') ?? n.getAttribute('epub:type') ?? '').includes('toc')) ?? nav;
        for (const a of toc.getElementsByTagName('a')) {
            const target = resolve(navItem.href, (a.getAttribute('href') ?? '').split('#')[0] || navItem.href.split('/').pop());
            if (!titles.has(target)) titles.set(target, a.textContent.replace(/\s+/g, ' ').trim());
        }
    }
    book.chapters = [...opf.getElementsByTagNameNS(OPF_NS, 'itemref')].map((ref, index) => {
        const item = manifest.get(ref.getAttribute('idref'));
        return item && { index, idref: ref.getAttribute('idref'), href: item.href, linear: ref.getAttribute('linear') !== 'no',
            narrated: Boolean(item.overlay), title: titles.get(item.href) || item.href.split('/').pop() };
    }).filter(Boolean);
    book.opfPath = opfPath;
    const hasNav = [...manifest.values()].some(item => /\bnav\b/.test(item.properties));
    const hasNcx = [...manifest.values()].some(item => item.type === 'application/x-dtbncx+xml');
    if (!hasNav && !hasNcx) errors.push('The book has no table of contents (no navigation document).');
    else if (!hasNav) warnings.push('The book has an EPUB 2 table of contents only.');

    // Narration: the length of every clip in the media overlays, for the time estimate
    let seconds = 0, clips = 0;
    const overlaySeconds = new Map();
    for (const [id, item] of manifest) {
        if (item.type !== 'application/smil+xml' || !files[item.href]) continue;
        const smil = new DOMParser().parseFromString(strFromU8(files[item.href]), 'application/xml');
        let own = 0, ownClips = 0;
        for (const audio of smil.getElementsByTagName('audio')) {
            const begin = clockSeconds(audio.getAttribute('clipBegin')), end = clockSeconds(audio.getAttribute('clipEnd'));
            if (end > begin) { own += end - begin; ownClips++; }
        }
        overlaySeconds.set(id, { seconds: own, clips: ownClips });
        seconds += own; clips += ownClips;
    }
    for (const chapter of book.chapters ?? []) Object.assign(chapter, overlaySeconds.get(manifest.get(chapter.idref)?.overlay) ?? { seconds: 0, clips: 0 });
    book.narrationSeconds = seconds; book.narrationClips = clips;
    return { errors, warnings, book };
}
