import fs from 'fs-extra';
import { JSDOM } from 'jsdom';
import type { PageAudioAssets } from './audio.js';
import type { OutputPaths } from './output.js';
import { outputPath } from './output.js';
import type { SiteModel } from './model.js';
import * as utils from './utils.js';
import { resolveNarrationSelector } from './structure-ids.js';

export type AudioMapPage = {
    href: string;
    title: string;
    start: number;
    duration: number;
    // The page's narration file, when it has narration
    audio?: string;
};

export type AudioMapChapter = {
    title: string;
    href: string;
    time: number;
};

// Where a TOC entry's heading is spoken, in book time, so the TOC can play just the heading
export type AudioMapTocEntry = {
    href: string;
    time: number;
    end: number;
};

export type AudioMap = {
    version: 1;
    duration: number;
    pages: AudioMapPage[];
    chapters: AudioMapChapter[];
    toc: AudioMapTocEntry[];
};

type MapCue = { id: string; selector?: import('./structure-ids.js').NarrationSelector; start: number };

export type PageAudioMapSource = {
    audio: PageAudioAssets | null;
    bodyHtml: string;
};

function createAudioMap(site: SiteModel, sources: Map<string, PageAudioMapSource>): AudioMap | null {
    let elapsed = 0;
    const pages = site.pages.map(page => {
        const audio = sources.get(page.outputFilename)?.audio;
        const duration = audio?.duration ?? 0;
        const mapped: AudioMapPage = { href: page.outputFilename, title: page.title, start: elapsed, duration };
        if (audio && duration > 0) mapped.audio = audio.audioHref;
        elapsed += duration;
        return mapped;
    });
    if (elapsed <= 0) return null;

    const pageByHref = new Map(pages.map(page => [page.href, page]));
    const chapters: AudioMapChapter[] = [];
    const included = new Set<string>();
    let lastTime = -Infinity;
    for (const entry of chapterLevel(site.toc, pageByHref)) {
        if (!entry.href || included.has(entry.href)) continue;
        const pageHref = utils.getWithoutFrag(entry.href);
        const page = pageByHref.get(pageHref);
        // Only chapters with narration: a silent one has no place on the timeline of its own
        if (!page || page.duration <= 0) continue;
        const fragment = utils.getFrag(entry.href);
        const source = sources.get(pageHref);
        const offset = fragment && source?.audio
            ? cueOffsetForFragment(source.bodyHtml, fragment, source.audio.cues)
            : 0;
        const time = page.start + offset;
        included.add(entry.href);
        if (time <= lastTime) continue;
        chapters.push({ title: entry.title, href: entry.href, time });
        lastTime = time;
    }

    return { version: 1, duration: elapsed, pages, chapters, toc: tocNarration(site.toc, pageByHref, sources) };
}

// Every TOC entry, at every level, whose heading has narration
function tocNarration(
    toc: SiteModel['toc'],
    pageByHref: Map<string, AudioMapPage>,
    sources: Map<string, PageAudioMapSource>
): AudioMapTocEntry[] {
    const parsed = new Map<string, { doc: Document; cueElements: Array<Element | null> }>();
    const entries: AudioMapTocEntry[] = [];
    const visit = (entry: SiteModel['toc'][number]) => {
        const pageHref = entry.href ? utils.getWithoutFrag(entry.href) : '';
        const page = pageByHref.get(pageHref);
        const audio = sources.get(pageHref)?.audio;
        if (entry.href && page && page.duration > 0 && audio?.cues.length) {
            let pageDoc = parsed.get(pageHref);
            if (!pageDoc) {
                const doc = new JSDOM(`<body>${sources.get(pageHref)!.bodyHtml}</body>`).window.document;
                pageDoc = { doc, cueElements: audio.cues.map(cue => cueElement(doc, cue)) };
                parsed.set(pageHref, pageDoc);
            }
            const span = headingNarration(pageDoc.doc, utils.getFrag(entry.href), audio.cues, pageDoc.cueElements, page.duration);
            if (span) entries.push({ href: entry.href, time: page.start + span.start, end: page.start + span.end });
        }
        entry.children.forEach(visit);
    };
    toc.forEach(visit);
    return entries;
}

function cueElement(doc: Document, cue: MapCue): Element | null {
    return cue.selector ? resolveNarrationSelector(doc, cue.selector) : doc.getElementById(cue.id);
}

// The cues that speak the heading at a TOC target (the target itself, or the first heading in it),
// as page times from the first one's start to the next cue's. Without narration in a heading, the
// first phrase at or after the target.
function headingNarration(
    doc: Document,
    fragment: string,
    cues: MapCue[],
    cueElements: Array<Element | null>,
    pageDuration: number
): { start: number; end: number } | null {
    const target = fragment ? doc.getElementById(fragment) : doc.body;
    if (!target) return null;
    const headings = 'h1, h2, h3, h4, h5, h6, [role="heading"]';
    const heading = target.matches(headings) ? target : target.querySelector(headings);
    const endOf = (index: number) => cues[index + 1]?.start ?? pageDuration;
    if (heading) {
        const inHeading = cueElements.flatMap((elm, index) =>
            elm && (heading.contains(elm) || elm.contains(heading)) ? [index] : []);
        if (inHeading.length) return { start: cues[inHeading[0]].start, end: endOf(inHeading[inHeading.length - 1]) };
    }
    const first = cueElements.findIndex(elm => elm && (elm === target || target.contains(elm)
        || Boolean(target.compareDocumentPosition(elm) & target.DOCUMENT_POSITION_FOLLOWING)));
    return first >= 0 ? { start: cues[first].start, end: endOf(first) } : null;
}

// The chapters are the TOC's top level, unless it holds fewer than two narrated entries (a book whose
// TOC is one entry, the book itself, with its chapters inside): then the level below, and so on, as
// chapter splitting does
function chapterLevel(toc: SiteModel['toc'], pageByHref: Map<string, { duration: number }>): SiteModel['toc'] {
    const narrated = (entry: SiteModel['toc'][number]) =>
        Boolean(entry.href && (pageByHref.get(utils.getWithoutFrag(entry.href))?.duration ?? 0) > 0);
    let level = toc;
    while (level.filter(narrated).length < 2) {
        const below = level.flatMap(entry => entry.children);
        if (!below.length) break;
        level = below;
    }
    return level;
}

function cueOffsetForFragment(
    bodyHtml: string,
    fragment: string,
    cues: Array<{ id: string; selector?: import('./structure-ids.js').NarrationSelector; start: number }>
): number {
    const doc = new JSDOM(`<body>${bodyHtml}</body>`).window.document;
    const target = doc.getElementById(fragment);
    if (!target) return 0;
    for (const cue of cues) {
        // The fallback keeps programmatic callers and pre-structure-id data working.
        const cueTarget = cue.selector
            ? resolveNarrationSelector(doc, cue.selector)
            : doc.getElementById(cue.id);
        if (cueTarget && (cueTarget === target || target.contains(cueTarget)
            || Boolean(target.compareDocumentPosition(cueTarget) & target.DOCUMENT_POSITION_FOLLOWING))) {
            return cue.start;
        }
    }
    return 0;
}

async function generateAudioMap(
    site: SiteModel,
    sources: Map<string, PageAudioMapSource>,
    outputPaths: OutputPaths
): Promise<void> {
    const audioMap = createAudioMap(site, sources);
    if (audioMap) await fs.writeJson(outputPath(outputPaths, 'audio-map.json'), audioMap, { spaces: 2 });
}

export { createAudioMap, cueOffsetForFragment, generateAudioMap };
