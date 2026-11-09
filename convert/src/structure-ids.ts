import { referencedIds } from './ids.js';

export type FragmentSelector = {
    type: 'FragmentSelector';
    value: string;
    refinedBy?: CssSelector;
};

export type CssSelector = {
    type: 'CssSelector';
    value: string;
};

export type NarrationSelector = FragmentSelector | CssSelector;

const STRUCTURE_SELECTOR = [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', '[role="heading"]',
    'section', 'article', 'aside', 'figure', 'table', 'ul', 'ol', 'dl', 'blockquote',
    '[role^="doc-"]',
    '[role="doc-footnote"]', '[role="doc-endnotes"]', '[role="doc-noteref"]', '[role="doc-pagebreak"]',
    '[role="figure"]', '[role="table"]', '[role="list"]', '[role="region"]',
    '.epubtype_chapter', '.epubtype_part', '.epubtype_prologue', '.epubtype_epilogue',
    '.epubtype_preface', '.epubtype_introduction', '.epubtype_conclusion', '.epubtype_appendix',
    '.epubtype_bodymatter', '.epubtype_frontmatter', '.epubtype_backmatter',
    '.epubtype_sidebar', '.epubtype_figure', '.epubtype_table', '.epubtype_list',
    '.epubtype_footnote', '.epubtype_endnote', '.epubtype_endnotes', '.epubtype_note',
    '.epubtype_noteref', '.epubtype_pagebreak'
].join(', ');

// A repeated id: links and cues only ever reach its first element, so the others lose it (a
// structure among them gets a generated id next). Not inside SVG or MathML, which are kept whole.
function removeRepeatedIds(doc: Document): void {
    const seen = new Set<string>();
    doc.querySelectorAll('[id]').forEach(elm => {
        if (elm.closest('svg, math')) return;
        if (seen.has(elm.id)) elm.removeAttribute('id');
        else seen.add(elm.id);
    });
}

function addGeneratedStructureIds(doc: Document): void {
    const used = new Set(Array.from(doc.querySelectorAll('[id]'), elm => elm.id));
    const counts = new Map<string, number>();
    doc.querySelectorAll(STRUCTURE_SELECTOR).forEach(elm => {
        if (elm.id || elm.classList.contains('webbook-table-scroll')) return;
        const base = structureName(elm);
        let number = (counts.get(base) ?? 0) + 1;
        let id = `${base}-${number}`;
        while (used.has(id)) id = `${base}-${++number}`;
        counts.set(base, number);
        used.add(id);
        elm.id = id;
    });
}

function structureName(elm: Element): string {
    if (elm.matches('h1, h2, h3, h4, h5, h6, [role="heading"]')) return 'heading';
    if (elm.matches('ul, ol, dl, [role="list"], .epubtype_list')) return 'list';
    if (elm.matches('table, [role="table"], .epubtype_table')) return 'table';
    if (elm.matches('figure, [role="figure"], .epubtype_figure')) return 'figure';
    if (elm.matches('aside, .epubtype_sidebar')) return 'sidebar';
    if (elm.matches('blockquote')) return 'quote';
    if (elm.matches('[role="doc-noteref"], .epubtype_noteref')) return 'note-reference';
    if (elm.matches('[role="doc-footnote"], .epubtype_footnote, .epubtype_endnote, .epubtype_note')) return 'note';
    if (elm.matches('[role="doc-pagebreak"], .epubtype_pagebreak')) return 'page';
    return 'section';
}

function cssPath(anchor: Element, target: Element): string {
    if (anchor === target) return ':scope';
    const parts: string[] = [];
    let current: Element | null = target;
    while (current && current !== anchor) {
        const tag = current.tagName.toLowerCase();
        const siblings = current.parentElement
            ? Array.from(current.parentElement.children).filter(sibling => sibling.tagName === current!.tagName)
            : [current];
        parts.unshift(`${tag}:nth-of-type(${siblings.indexOf(current) + 1})`);
        current = current.parentElement;
    }
    return `:scope > ${parts.join(' > ')}`;
}

function selectorFor(target: Element, kept: Set<string>, main: Element): NarrationSelector {
    if (target.id && kept.has(target.id)) return { type: 'FragmentSelector', value: target.id };
    let anchor: Element | null = target.parentElement;
    while (anchor && anchor !== main && !(anchor.id && kept.has(anchor.id))) anchor = anchor.parentElement;
    if (anchor?.id && kept.has(anchor.id)) {
        return { type: 'FragmentSelector', value: anchor.id,
            refinedBy: { type: 'CssSelector', value: cssPath(anchor, target) } };
    }
    return { type: 'CssSelector', value: cssPath(main, target) };
}

export function resolveNarrationSelector(doc: Document, selector: NarrationSelector): Element | null {
    if (selector.type === 'FragmentSelector') {
        const anchor = doc.getElementById(selector.value);
        return selector.refinedBy ? anchor?.querySelector(selector.refinedBy.value) ?? null : anchor;
    }
    const main = doc.querySelector('main') || doc.body;
    if (selector.value === ':scope') return main;
    return selector.value.startsWith(':scope') ? main.querySelector(selector.value) : doc.querySelector(selector.value);
}

export function applyStructureIds(
    doc: Document,
    narrationTargetIds: string[],
    navigationIds: Iterable<string> = [],
    keepAllIds = false
): Map<string, NarrationSelector> {
    const targets = new Map(narrationTargetIds.map(id => [id, doc.getElementById(id)]));
    for (const [id, target] of targets) {
        if (!target) throw new Error(`Narration target #${id} was not found in the transformed page`);
    }
    if (keepAllIds) return new Map(narrationTargetIds.map(id => [id, { type: 'FragmentSelector', value: id }]));

    removeRepeatedIds(doc);
    addGeneratedStructureIds(doc);
    const referenced = referencedIds(doc, navigationIds);
    const kept = new Set<string>();
    doc.querySelectorAll('[id]').forEach(elm => {
        if (elm.matches(STRUCTURE_SELECTOR) || referenced.has(elm.id) || elm.closest('svg, math')) kept.add(elm.id);
    });
    const main = doc.querySelector('main') || doc.body;
    const selectors = new Map<string, NarrationSelector>();
    for (const [id, target] of targets as Map<string, Element>) selectors.set(id, selectorFor(target, kept, main));
    doc.querySelectorAll('[id]').forEach(elm => { if (!kept.has(elm.id)) elm.removeAttribute('id'); });
    for (const [id, selector] of selectors) {
        if (resolveNarrationSelector(doc, selector) !== targets.get(id)) {
            throw new Error(`Narration selector for #${id} did not resolve to its original element`);
        }
    }
    return selectors;
}
