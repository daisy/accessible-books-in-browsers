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
};

export type AudioMapChapter = {
    title: string;
    href: string;
    time: number;
};

export type AudioMap = {
    version: 1;
    duration: number;
    pages: AudioMapPage[];
    chapters: AudioMapChapter[];
};

export type PageAudioMapSource = {
    audio: PageAudioAssets | null;
    bodyHtml: string;
};

function createAudioMap(site: SiteModel, sources: Map<string, PageAudioMapSource>): AudioMap | null {
    let elapsed = 0;
    const pages = site.pages.map(page => {
        const duration = sources.get(page.outputFilename)?.audio?.duration ?? 0;
        const mapped = { href: page.outputFilename, title: page.title, start: elapsed, duration };
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

    return { version: 1, duration: elapsed, pages, chapters };
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
