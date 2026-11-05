import fs from 'fs-extra';
import { JSDOM } from 'jsdom';
import type { PageAudioAssets } from './audio.js';
import type { OutputPaths } from './output.js';
import { outputPath } from './output.js';
import type { SiteModel } from './model.js';
import * as utils from './utils.js';

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
    for (const entry of site.toc) {
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

function cueOffsetForFragment(
    bodyHtml: string,
    fragment: string,
    cues: Array<{ id: string; start: number }>
): number {
    const doc = new JSDOM(`<body>${bodyHtml}</body>`).window.document;
    const target = doc.getElementById(fragment);
    if (!target) return 0;
    for (const cue of cues) {
        const cueTarget = doc.getElementById(cue.id);
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
