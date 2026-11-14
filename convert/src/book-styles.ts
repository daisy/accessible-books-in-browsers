// The book's writing styles (plan 28). The converter drops a book's CSS, but some of it is meaning
// the book states on purpose, mostly for East Asian text: the writing mode, numbers set upright
// in a vertical line (tate-chū-yoko), emphasis marks, full-width letters, how text is spoken.
// EPUB 3 states these as -epub- properties, which browsers ignore. This reads the book's own
// cascade for just these properties and keeps the result as reader classes and <html> data
// attributes, in standard CSS terms. It never inlines the book's CSS and never changes text.
import path from 'path';
import css from 'css';
import * as fileio from './file-io.js';
import { isExternalHref } from './ids.js';
import type { ConversionReport } from './conversion-report.js';

export type BookStylesheet = {
    css: string;
    // The <link>'s class, for an alternate stylesheet (EPUB Alternate Style Tags: horizontal, vertical)
    alternateTags?: string[];
};

export type WritingStyles = {
    // The page's writing mode when it isn't horizontal
    writingMode?: 'vertical-rl' | 'vertical-lr';
    // The page's writing mode and those of the book's tagged alternate stylesheets, preferred first,
    // when there's more than one
    writingModes?: string[];
    lineBreak?: string;
    wordBreak?: string;
    // The source <html> or <body>'s dir
    dir?: string;
    // Classes for the source <html> and <body>'s own writing styles, which go on <main>
    mainClasses: string[];
};

type Property = 'writing-mode' | 'text-combine-upright' | 'text-orientation' | 'text-emphasis-style'
    | 'text-emphasis-position' | 'text-transform' | 'speak-as' | 'line-break' | 'word-break';

const PROPERTIES = new Set<Property>(['writing-mode', 'text-combine-upright', 'text-orientation',
    'text-emphasis-style', 'text-emphasis-position', 'text-transform', 'speak-as', 'line-break', 'word-break']);
// Only the page as a whole has these: they are a language's line-breaking rules
const PAGE_ONLY = new Set<Property>(['line-break', 'word-break']);

type Declaration = { property: Property; value: string; important: boolean; specificity: number; order: number };

// -epub-x, -webkit-x and x are one property
export function normalizeProperty(name: string): Property | null {
    let property = name.trim().toLowerCase().replace(/^-(epub|webkit)-/, '');
    if (property === 'text-combine' || property === 'text-combine-horizontal') property = 'text-combine-upright';
    if (property === 'text-emphasis') property = 'text-emphasis-style';
    return PROPERTIES.has(property as Property) ? property as Property : null;
}

// Selectors that depend on interaction or make boxes of their own say nothing about the text
const SKIPPED_SELECTOR = /::|:(before|after|first-line|first-letter|hover|focus|focus-within|focus-visible|active|visited|link|target|checked|selection|placeholder)\b/i;

export function specificity(selector: string): number {
    let rest = selector.replace(/"[^"]*"|'[^']*'/g, '');
    let a = 0, b = 0, c = 0;
    // :where() counts nothing; :not(), :is() and :has() count their argument
    rest = rest.replace(/:where\([^)]*\)/gi, '').replace(/:(not|is|has|matches)\(([^)]*)\)/gi, ' $2 ');
    rest = rest.replace(/\[[^\]]*\]/g, () => { b++; return ' '; });
    rest = rest.replace(/#[\w-]+/g, () => { a++; return ' '; });
    rest = rest.replace(/\.[\w-]+/g, () => { b++; return ' '; });
    rest = rest.replace(/:[\w-]+(\([^)]*\))?/g, () => { b++; return ' '; });
    (rest.match(/(^|[\s>+~(])([a-z][\w-]*|[\w-]+\|[\w-]+)/gi) ?? []).forEach(() => { c++; });
    return a * 10000 + b * 100 + c;
}

function mediaApplies(media: string, property: Property): boolean {
    const types = media.toLowerCase().split(',').map(query => query.trim().replace(/^only\s+/, '').split(/\s+/)[0]);
    return types.some(type => type === 'all' || type === 'screen' || type.startsWith('(')
        || (property === 'speak-as' && (type === 'speech' || type === 'aural')));
}

function splitImportant(value: string): { value: string; important: boolean } {
    const important = /!\s*important\s*$/i.test(value);
    return { value: value.replace(/!\s*important\s*$/i, '').trim(), important };
}

type Rule = { selectors?: string[]; declarations?: Array<{ type: string; property?: string; value?: string }>; type: string; media?: string; rules?: Rule[] };

// Every declaration of these properties, on the elements its rule selects
function collectDeclarations(doc: Document, sheets: BookStylesheet[], unreadable: (message: string) => void): Map<Element, Declaration[]> {
    const found = new Map<Element, Declaration[]>();
    let order = 0;
    const add = (elm: Element, declaration: Declaration) => {
        const list = found.get(elm) ?? [];
        list.push(declaration);
        found.set(elm, list);
    };
    const walk = (rules: Rule[], media: string | null) => {
        for (const rule of rules) {
            if (rule.type === 'media' && rule.rules) {
                walk(rule.rules, rule.media ?? '');
                continue;
            }
            if (rule.type !== 'rule' || !rule.selectors || !rule.declarations) continue;
            const declarations = rule.declarations.flatMap(declaration => {
                const property = declaration.type === 'declaration' && declaration.property ? normalizeProperty(declaration.property) : null;
                if (!property || declaration.value === undefined) return [];
                if (media !== null && !mediaApplies(media, property)) return [];
                return [{ property, ...splitImportant(declaration.value) }];
            });
            if (!declarations.length) continue;
            for (const selector of rule.selectors) {
                const ruleOrder = order++;
                if (SKIPPED_SELECTOR.test(selector)) continue;
                let elements: Element[];
                try {
                    elements = Array.from(doc.querySelectorAll(selector));
                } catch {
                    continue;
                }
                const weight = specificity(selector);
                for (const elm of elements) {
                    for (const declaration of declarations) add(elm, { ...declaration, specificity: weight, order: ruleOrder });
                }
            }
        }
    };
    for (const sheet of sheets.filter(sheet => !sheet.alternateTags)) {
        try {
            walk(css.parse(sheet.css, { silent: true }).stylesheet?.rules as Rule[] ?? [], null);
        } catch (error) {
            unreadable(String(error));
        }
    }
    // Inline styles: above every rule but an important one
    for (const elm of Array.from(doc.querySelectorAll('[style]'))) {
        try {
            const parsed = css.parse(`x{${elm.getAttribute('style')}}`, { silent: true });
            const rule = parsed.stylesheet?.rules[0] as Rule | undefined;
            for (const declaration of rule?.declarations ?? []) {
                const property = declaration.type === 'declaration' && declaration.property ? normalizeProperty(declaration.property) : null;
                if (!property || declaration.value === undefined) continue;
                add(elm, { property, ...splitImportant(declaration.value), specificity: 1_000_000, order: order++ });
            }
        } catch { /* an unreadable style attribute says nothing */ }
    }
    return found;
}

function winners(declarations: Declaration[] | undefined): Map<Property, string> {
    const result = new Map<Property, Declaration>();
    for (const declaration of declarations ?? []) {
        const current = result.get(declaration.property);
        const beats = !current
            || (declaration.important !== current.important ? declaration.important
                : declaration.specificity !== current.specificity ? declaration.specificity > current.specificity
                    : declaration.order > current.order);
        if (beats) result.set(declaration.property, declaration);
    }
    return new Map(Array.from(result, ([property, declaration]) => [property, declaration.value]));
}

// A value in the reader's terms: what it's called in a class, 'default' for the property's own
// default, or null when it says nothing (inherit, unset, an unknown value)
export function token(property: Property, rawValue: string): string | null {
    const value = rawValue.trim().toLowerCase();
    if (value === 'inherit' || value === 'unset' || value === 'revert' || value === '') return null;
    const words = value.split(/\s+/);
    switch (property) {
    case 'writing-mode':
        if (['vertical-rl', 'tb-rl', 'tb', 'sideways-rl'].includes(value)) return 'vertical-rl';
        if (['vertical-lr', 'tb-lr', 'sideways-lr'].includes(value)) return 'vertical-lr';
        if (['horizontal-tb', 'lr', 'lr-tb', 'rl', 'rl-tb', 'initial'].includes(value)) return 'horizontal';
        return null;
    case 'text-combine-upright':
        if (value === 'none' || value === 'initial') return 'default';
        if (value === 'all' || value === 'horizontal' || words[0] === 'digits' || words[0] === 'horizontal') return 'combine';
        return null;
    case 'text-orientation':
        if (value === 'upright') return 'upright';
        if (['sideways', 'sideways-right', 'rotate-right', 'rotate-normal'].includes(value)) return 'sideways';
        if (['mixed', 'vertical-right', 'initial'].includes(value)) return 'default';
        return null;
    case 'text-emphasis-style': {
        if (value === 'none' || value === 'initial') return 'none';
        if (/^["']/.test(value)) return 'string';
        const shape = words.find(word => ['dot', 'circle', 'double-circle', 'triangle', 'sesame'].includes(word));
        const open = words.includes('open');
        if (!shape && !open && !words.includes('filled')) return null;
        return shape ? `${shape}${open ? '-open' : ''}` : (open ? 'open' : 'filled');
    }
    case 'text-emphasis-position': {
        const under = words.includes('under');
        const left = words.includes('left');
        if (value === 'initial' || (!under && !left && (words.includes('over') || words.includes('right')))) return 'default';
        if (!under && !left) return null;
        return [under ? 'under' : '', left ? 'left' : ''].filter(Boolean).join('-');
    }
    case 'text-transform':
        return words.some(word => word === 'full-width' || word === '-epub-fullwidth' || word === 'fullwidth') ? 'fullwidth' : 'default';
    case 'speak-as': {
        if (value === 'normal' || value === 'initial' || value === 'auto') return 'default';
        const known = words.find(word => ['spell-out', 'digits', 'literal-punctuation', 'no-punctuation'].includes(word));
        return known ?? null;
    }
    case 'line-break':
        return ['strict', 'loose', 'anywhere', 'normal'].includes(value) ? value : null;
    case 'word-break':
        return ['keep-all', 'break-all', 'normal'].includes(value) ? value : null;
    }
    return null;
}

const DEFAULTS: Record<Property, string> = {
    'writing-mode': 'horizontal', 'text-combine-upright': 'default', 'text-orientation': 'default',
    'text-emphasis-style': 'none', 'text-emphasis-position': 'default', 'text-transform': 'default',
    'speak-as': 'default', 'line-break': 'normal', 'word-break': 'normal'
};

// The class for a value that differs from what the element inherits, if the reader has one
function classFor(property: Property, value: string, inherited: string): string | null {
    switch (property) {
    case 'writing-mode':
        return `webbook-style-${value}`;
    case 'text-combine-upright':
        return value === 'combine' ? 'webbook-style-combine' : 'webbook-style-combine-none';
    case 'text-orientation':
        return `webbook-style-glyphs-${value === 'default' ? 'mixed' : value}`;
    case 'text-emphasis-style':
        return value === 'string' ? null : `webbook-style-emphasis-${value}`;
    case 'text-emphasis-position':
        return value === 'default' ? (inherited === 'default' ? null : 'webbook-style-emphasis-over') : `webbook-style-emphasis-${value}`;
    case 'text-transform':
        return value === 'fullwidth' ? 'webbook-style-fullwidth' : null;
    case 'speak-as':
        return value === 'default' ? null : `webbook-speak-${value}`;
    }
    return null;
}

export type WritingStylesOptions = { report?: ConversionReport; page?: string };

// Reads the cascade, puts the classes on the book's elements and returns what goes on the page.
// The document is the source page, before markup cleanup.
export function applyWritingStyles(doc: Document, sheets: BookStylesheet[], options: WritingStylesOptions = {}): WritingStyles {
    const page = options.page ?? '';
    const found = collectDeclarations(doc, sheets,
        message => options.report?.warning('Book stylesheet', `A stylesheet couldn't be read for its writing styles: ${message}`, page));
    const valuesOf = (elm: Element) => {
        const result = new Map<Property, string>();
        for (const [property, raw] of winners(found.get(elm))) {
            const value = token(property, raw);
            if (value !== null) result.set(property, value);
        }
        return result;
    };

    // The page: <html>, then <body>
    const pageValues = new Map<Property, string>(Object.entries(DEFAULTS) as Array<[Property, string]>);
    for (const elm of [doc.documentElement, doc.body]) {
        if (!elm) continue;
        valuesOf(elm).forEach((value, property) => pageValues.set(property, value));
    }
    const result: WritingStyles = { mainClasses: [] };
    const writingMode = pageValues.get('writing-mode');
    if (writingMode === 'vertical-rl' || writingMode === 'vertical-lr') result.writingMode = writingMode;
    if (pageValues.get('line-break') !== 'normal') result.lineBreak = pageValues.get('line-break');
    if (pageValues.get('word-break') !== 'normal') result.wordBreak = pageValues.get('word-break');
    const dir = (doc.body?.getAttribute('dir') || doc.documentElement.getAttribute('dir') || '').trim().toLowerCase();
    if (dir === 'rtl' || dir === 'ltr') result.dir = dir;

    const kept = new Map<string, number>();
    const keep = (elm: Element | null, name: string) => {
        if (elm) elm.classList.add(name);
        kept.set(name, (kept.get(name) ?? 0) + 1);
    };
    let strings = 0;
    // What the page's own styles say goes on <main>, compared with nothing set
    for (const [property, value] of pageValues) {
        if (property === 'writing-mode' || PAGE_ONLY.has(property) || value === DEFAULTS[property]) continue;
        if (property === 'text-emphasis-style' && value === 'string') { strings++; continue; }
        const name = classFor(property, value, DEFAULTS[property]);
        if (name) { result.mainClasses.push(name); keep(null, name); }
    }

    // Every element of the text: a class where its value differs from what it inherits
    const visit = (parent: Element, inherited: Map<Property, string>) => {
        for (const elm of Array.from(parent.children)) {
            const own = valuesOf(elm);
            let values = inherited;
            if (own.size) {
                values = new Map(inherited);
                for (const [property, value] of own) {
                    if (PAGE_ONLY.has(property)) continue;
                    values.set(property, value);
                    const before = inherited.get(property) ?? DEFAULTS[property];
                    if (value === before) continue;
                    if (property === 'text-emphasis-style' && value === 'string') { strings++; continue; }
                    const name = classFor(property, value, before);
                    if (name) keep(elm, name);
                }
            }
            visit(elm, values);
        }
    };
    if (doc.body) visit(doc.body, pageValues);

    // Alternate stylesheets the book tags as horizontal or vertical: the reader can offer them
    const alternates = sheets.flatMap(sheet => {
        const tags = sheet.alternateTags ?? [];
        if (tags.includes('vertical')) return [/vertical-lr|tb-lr/i.test(sheet.css) ? 'vertical-lr' : 'vertical-rl'];
        if (tags.includes('horizontal')) return ['horizontal-tb'];
        return [];
    });
    const preferred = result.writingMode ?? 'horizontal-tb';
    const modes = [preferred, ...alternates.filter(mode => mode !== preferred)].filter((mode, index, all) => all.indexOf(mode) === index);
    if (modes.length > 1) result.writingModes = modes;

    if (options.report) {
        for (const [name, count] of kept) options.report.change(`Book writing styles kept (${name})`, page, count);
        if (result.writingMode) options.report.change(`Book writing styles kept (${result.writingMode} text)`, page);
        options.report.change('Book writing styles not kept (a text string as the emphasis mark)', page, strings);
    }
    return result;
}

// The stylesheets a page uses: linked ones (and alternate ones with Alternate Style Tags), then
// its <style> elements, in document order
export async function readPageStylesheets(doc: Document, sourcePath: string): Promise<BookStylesheet[]> {
    const sheets: BookStylesheet[] = [];
    for (const elm of Array.from(doc.querySelectorAll('link[rel~="stylesheet" i][href], style'))) {
        if (elm.tagName.toLowerCase() === 'style') {
            const media = elm.getAttribute('media');
            const text = elm.textContent ?? '';
            sheets.push({ css: media ? `@media ${media} {${text}}` : text });
            continue;
        }
        const rel = (elm.getAttribute('rel') ?? '').toLowerCase().split(/\s+/);
        const alternateTags = rel.includes('alternate')
            ? (elm.getAttribute('class') ?? '').toLowerCase().split(/\s+/).filter(tag => tag === 'horizontal' || tag === 'vertical')
            : undefined;
        if (alternateTags && !alternateTags.length) continue;
        const href = (elm.getAttribute('href') || '').split(/[?#]/)[0];
        if (!href || isExternalHref(href)) continue;
        try {
            const text = await fileio.readToString(path.resolve(path.dirname(sourcePath), decodeURIComponent(href)));
            const media = elm.getAttribute('media');
            sheets.push({ css: media && !alternateTags ? `@media ${media} {${text}}` : text, ...(alternateTags ? { alternateTags } : {}) });
        } catch {
            // A missing stylesheet is reported with the publication's other missing resources
        }
    }
    return sheets;
}
