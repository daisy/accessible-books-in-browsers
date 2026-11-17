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
    sourcePath?: string;
    // The <link>'s class, for an alternate stylesheet (EPUB Alternate Style Tags: horizontal, vertical)
};

export type WritingStyles = {
    // The page's writing mode when it isn't horizontal
    writingMode?: 'vertical-rl' | 'vertical-lr';
    lineBreak?: string;
    wordBreak?: string;
    // The source <html> or <body>'s dir
    dir?: string;
    // Classes for the source <html> and <body>'s own writing styles, which go on <main>
    mainClasses: string[];
};

type WritingProperty = 'writing-mode' | 'text-combine-upright' | 'text-orientation' | 'text-emphasis-style'
    | 'text-emphasis-position' | 'text-transform' | 'speak-as' | 'line-break' | 'word-break';

type Property = WritingProperty | string;
const MEANINGFUL = new Set(['display', 'visibility', 'font-style', 'font-weight', 'font-variant', 'font-variant-caps', 'text-decoration', 'text-decoration-line', 'vertical-align', 'text-align', 'text-indent', 'margin-left', 'margin-inline-start', 'padding-left', 'padding-inline-start', 'white-space', 'list-style-type', 'background', 'background-color', 'font', 'margin', 'padding', 'list-style', 'border', 'border-style', 'border-width', 'border-color', ...['top', 'right', 'bottom', 'left'].flatMap(side => [`border-${side}`, `border-${side}-style`, `border-${side}-width`, `border-${side}-color`])]);
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
    return (PROPERTIES.has(property) || MEANINGFUL.has(property)) ? property : null;
}

// Selectors that depend on interaction or make boxes of their own say nothing about the text
const SKIPPED_SELECTOR = /::|:(before|after|first-line|first-letter|hover|focus|focus-within|focus-visible|active|visited|link|target|checked|selection|placeholder)\b/i;

export function specificity(selector: string): number {
    let rest = selector.replace(/"[^"\n]*"|'[^'\n]*'/g, '');
    let functions = 0;
    // Functional selectors contribute the most specific argument, not their sum.
    let output = '';
    for (let i = 0; i < rest.length;) {
        const match = rest.slice(i).match(/^:(where|is|not|has|matches)\(/i);
        if (!match) { output += rest[i++]; continue; }
        let end = i + match[0].length, depth = 1;
        const begin = end;
        for (; end < rest.length && depth; end++) {
            if (rest[end] === '(') depth++;
            if (rest[end] === ')') depth--;
        }
        if (match[1].toLowerCase() !== 'where') {
            const args = rest.slice(begin, end - 1);
            let nesting = 0, start = 0;
            const weights: number[] = [];
            for (let j = 0; j <= args.length; j++) {
                if (args[j] === '(' || args[j] === '[') nesting++;
                if (args[j] === ')' || args[j] === ']') nesting--;
                if (j === args.length || (args[j] === ',' && nesting === 0)) { weights.push(specificity(args.slice(start, j))); start = j + 1; }
            }
            functions += Math.max(0, ...weights);
        }
        output += ' ';
        i = end;
    }
    rest = output;
    let a = 0, b = 0, c = 0;
    rest = rest.replace(/\[[^\]]*\]/g, () => { b++; return ' '; });
    rest = rest.replace(/#[\w-]+/g, () => { a++; return ' '; });
    rest = rest.replace(/\.[\w-]+/g, () => { b++; return ' '; });
    rest = rest.replace(/:[\w-]+(\([^)]*\))?/g, () => { b++; return ' '; });
    (rest.match(/(^|[\s>+~(])([a-z][\w-]*|[\w-]+\|[\w-]+)/gi) ?? []).forEach(() => { c++; });
    return functions + a * 10000 + b * 100 + c;
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
function collectDeclarations(doc: Document, sheets: BookStylesheet[], unreadable: (message: string) => void, repaired: boolean): Map<Element, Declaration[]> {
    const found = new Map<Element, Declaration[]>();
    let order = 0;
    const add = (elm: Element, declaration: Declaration) => {
        const list = found.get(elm) ?? [];
        list.push(declaration);
        found.set(elm, list);
    };
    const expand = (property: Property, raw: string) => {
        const parsed = splitImportant(raw);
        let properties = [property];
        if (property === 'font') properties = ['font-style', 'font-weight', 'font-variant'];
        if (property === 'margin') properties = ['margin-left'];
        if (property === 'padding') properties = ['padding-left'];
        if (property === 'list-style') properties = ['list-style-type'];
        if (property === 'background') properties = ['background-color'];
        if (property === 'border') properties = ['top', 'right', 'bottom', 'left'].flatMap(side => ['style', 'width', 'color'].map(part => `border-${side}-${part}`));
        if (property === 'border-style' || property === 'border-width' || property === 'border-color') properties = ['top', 'right', 'bottom', 'left'].map(side => `border-${side}-${property.slice(7)}`);
        if (/^border-(top|right|bottom|left)$/.test(property)) properties = ['style', 'width', 'color'].map(part => `${property}-${part}`);
        if (property === 'text-decoration') return [{ property: 'text-decoration-line', ...parsed }];
        if (properties.length === 1 && properties[0] === property) return [{ property, ...parsed }];
        const style = doc.createElement('span').style;
        style.setProperty(property, parsed.value);
        return properties.map(p => ({ property: p, value: p === property ? parsed.value : style.getPropertyValue(p) || (p.startsWith('font-') ? 'normal' : ''), important: parsed.important })).filter(d => d.value);
    };
    const walk = (rules: Rule[], media: string | null) => {
        for (const rule of rules) {
            if (rule.type === 'media' && rule.rules) {
                if (media === null || mediaApplies(media, 'writing-mode')) walk(rule.rules, rule.media ?? '');
                continue;
            }
            if (rule.type !== 'rule' || !rule.selectors || !rule.declarations) continue;
            const declarations = rule.declarations.flatMap(declaration => {
                const property = declaration.type === 'declaration' && declaration.property ? normalizeProperty(declaration.property) : null;
                if (!property || (!repaired && !PROPERTIES.has(property)) || declaration.value === undefined) return [];
                if (media !== null && !mediaApplies(media, property)) return [];
                return expand(property, declaration.value);
            });
            if (!declarations.length) continue;
            for (const selector of rule.selectors) {
                const ruleOrder = order++;
                if (SKIPPED_SELECTOR.test(selector)) continue;
                let elements: Element[];
                try {
                    elements = Array.from(doc.querySelectorAll(selector.replace(/\[\s*epub\|type\b/g, '[epub\\:type')));
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
    for (const sheet of sheets) {
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
                if (!property || (!repaired && !PROPERTIES.has(property)) || declaration.value === undefined) continue;
                for (const expanded of expand(property, declaration.value)) add(elm, { ...expanded, specificity: 1_000_000, order: order++ });
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

const DEFAULTS: Record<string, string> = {
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

export type WritingStylesOptions = { report?: ConversionReport; page?: string; repaired?: boolean };

// Reads the cascade, puts the classes on the book's elements and returns what goes on the page.
// The document is the source page, before markup cleanup.
export function applyWritingStyles(doc: Document, sheets: BookStylesheet[], options: WritingStylesOptions = {}): WritingStyles {
    const page = options.page ?? '';
    const found = collectDeclarations(doc, sheets,
        message => options.report?.warning('Book stylesheet', `A stylesheet couldn't be read for its writing styles: ${message}`, page), options.repaired === true);
    if (options.repaired) applyMeaningfulStyles(doc, found, options);
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
    const result: WritingStyles = { mainClasses: options.repaired ? Array.from(doc.documentElement.classList).filter(name => name.startsWith('webbook-style-') || name === 'webbook-box') : [] };
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


    if (options.report) {
        for (const [name, count] of kept) options.report.change(`Book writing styles kept (${name})`, page, count);
        if (result.writingMode) options.report.change(`Book writing styles kept (${result.writingMode} text)`, page);
        options.report.change('Book writing styles not kept (a text string as the emphasis mark)', page, strings);
    }
    return result;
}

// Preferred linked/embedded styles, in document order. Expand imports before applying link
// media, so imported rules retain both conditions and their own asset base directory.
export async function readPageStylesheets(doc: Document, sourcePath: string, unreadable: (message: string) => void = () => {}): Promise<BookStylesheet[]> {
    type PendingSheet = BookStylesheet & { conditions: string[] };
    const sheets: PendingSheet[] = [];
    for (const elm of Array.from(doc.querySelectorAll('link[rel~="stylesheet" i][href], style'))) {
        if (elm.closest('svg, math')) continue;
        const conditions = elm.getAttribute('media') ? [elm.getAttribute('media')!] : [];
        if (elm.tagName.toLowerCase() === 'style') { sheets.push({ css: elm.textContent ?? '', sourcePath, conditions }); continue; }
        if ((elm.getAttribute('rel') ?? '').toLowerCase().split(/\s+/).includes('alternate')) continue;
        const href = (elm.getAttribute('href') || '').split(/[?#]/)[0];
        if (!href) continue;
        if (isExternalHref(href)) { unreadable(`External stylesheet not included: ${href}`); continue; }
        try {
            const file = path.resolve(path.dirname(sourcePath), decodeURIComponent(href));
            sheets.push({ sourcePath: file, css: await fileio.readToString(file), conditions });
        } catch { unreadable(`Stylesheet could not be read: ${path.basename(href)}`); }
    }
    const wrap = (sheet: PendingSheet, text: string): BookStylesheet => ({ sourcePath: sheet.sourcePath,
        css: sheet.conditions.reduceRight((content, condition) => `@media ${condition} {${content}}`, text) });
    const expand = async (sheet: PendingSheet, seen: Set<string>): Promise<BookStylesheet[]> => {
        const output: BookStylesheet[] = []; let rest = sheet.css;
        const pattern = /@import\s+(?:url\(\s*)?["']?([^"'\s);]+)["']?\s*\)?\s*([^;]*);/i;
        for (let match = pattern.exec(rest); match; match = pattern.exec(rest)) {
            if (match.index) output.push(wrap(sheet, rest.slice(0, match.index)));
            try {
                if (isExternalHref(match[1])) unreadable(`External stylesheet import not included: ${match[1]}`);
                else {
                    const imported = path.resolve(path.dirname(sheet.sourcePath ?? sourcePath), decodeURIComponent(match[1]));
                    if (!seen.has(imported)) output.push(...await expand({ sourcePath: imported, css: await fileio.readToString(imported),
                        conditions: [...sheet.conditions, ...match[2] ? [match[2]] : []] }, new Set([...seen, imported])));
                }
            } catch { unreadable(`Stylesheet import could not be read: ${match[1]}`); }
            rest = rest.slice(match.index + match[0].length);
        }
        if (rest) output.push(wrap(sheet, rest));
        return output;
    };
    const expanded: BookStylesheet[] = [];
    for (const sheet of sheets) expanded.push(...await expand(sheet, new Set([sheet.sourcePath ?? sourcePath])));
    return expanded;
}

// Repaired mode uses the same matched declarations as writing styles. Classes express only
// meaning, never the publisher's colours, font sizes or layout dimensions.
function applyMeaningfulStyles(doc: Document, found: Map<Element, Declaration[]>, options: WritingStylesOptions): void {
    const block = 'div, section, article, aside, blockquote, address, header, footer, main';
    const add = (elm: Element, property: string, ...names: string[]) => {
        if (!names.length) return;
        elm.classList.add(...names.map(name => `webbook-${name}`));
        options.report?.change(`Book styles kept as reader classes (${property})`, options.page ?? '');
    };
    for (const [elm, declarations] of found) {
        const values = winners(declarations);
        const value = (p: string) => (values.get(p) ?? '').trim().toLowerCase();
        for (const [property, raw] of values) {
            const v = raw.toLowerCase();
            let name = '';
            if (property === 'display' && v === 'none') name = 'hidden';
            if (property === 'visibility' && ['hidden', 'collapse', 'visible'].includes(v)) name = v === 'visible' ? 'visible' : 'invisible';
            if (elm.closest('svg, math') && !['display', 'visibility'].includes(property)) continue;
            if (property === 'font-style') name = /^(italic|oblique)\b/.test(v) ? 'italic' : /^(normal|initial)$/.test(v) ? 'not-italic' : '';
            if (property === 'font-weight') name = v === 'bold' || (+v >= 600 && +v <= 900) ? 'bold' : /^(normal|400|initial)$/.test(v) ? 'unbold' : '';
            if (property === 'font-variant' || property === 'font-variant-caps') name = /\bsmall-caps\b/.test(v) ? 'small-caps' : v === 'normal' ? 'no-small-caps' : '';
            if (property === 'vertical-align' && ['super', 'sub'].includes(v)) name = v;
            if (property === 'white-space' && ['pre', 'pre-wrap'].includes(v)) name = 'pre';
            if (property === 'text-align' && ['center', 'right', 'left', 'start', 'end'].includes(v)) name = v;
            if (property === 'text-transform') {
                const names = [];
                if (/\buppercase\b/.test(v)) names.push('style-uppercase');
                if (/full-?width/.test(v)) names.push('style-fullwidth');
                if (v === 'none') names.push('style-no-transform');
                add(elm, property, ...names);
            }
            if (property === 'list-style-type' && ['upper-roman', 'lower-roman', 'upper-alpha', 'lower-alpha', 'none', 'decimal', 'disc', 'circle', 'square', 'lower-latin', 'upper-latin'].includes(v)) name = `list-${v.replace('latin', 'alpha')}`;
            if (name) add(elm, property, `style-${name}`);
        }
        const decoration = value('text-decoration-line') || value('text-decoration');
        if (/\bunderline\b/.test(decoration)) add(elm, 'text-decoration', 'style-underline');
        if (/\bline-through\b/.test(decoration)) add(elm, 'text-decoration', 'style-strike');
        if (elm.matches('p, div, section, article, aside, blockquote, address, li, dd, dt, h1, h2, h3, h4, h5, h6, pre')) {
            for (const property of ['text-indent', 'margin-inline-start', 'margin-left', 'padding-inline-start', 'padding-left']) {
                const length = value(property).match(/^(-?[\d.]+)(em|rem|px|pt|%)$/);
                if (!length) continue;
                const n = +length[1] / (length[2] === 'px' ? 16 : length[2] === 'pt' ? 12 : length[2] === '%' ? 5 : 1);
                if (n < 0 && property === 'text-indent') add(elm, property, 'style-hang');
                else if (n > 0) {
                    const kind = property === 'text-indent' ? 'text-indent' : property === 'margin-left' ? 'margin-left' : property === 'padding-left' ? 'padding-left' : property.startsWith('padding') ? 'padding' : 'indent';
                    add(elm, property, `style-${kind}-${Math.min(4, Math.max(1, Math.round(n)))}`);
                } else if (property === 'text-indent') add(elm, property, 'style-no-text-indent');
            }
        }
        if (!elm.matches(block) || !(elm.querySelector('h1,h2,h3,h4,h5,h6') || Array.from(elm.children).filter(child => child.matches('p,div,section,article,aside,blockquote,ul,ol,dl,table,pre')).length > 1)) continue;
        const visible = (v: string) => Boolean(v && !/^rgba\([^)]*,\s*0(?:\.0*)?\)$/.test(v) && !/^(none|0(?:[a-z]+)?|transparent|inherit|initial)$/.test(v) && !/\bnone\b/.test(v));
        const sides = ['top','right','bottom','left'].filter(side => {
            const border = value(`border-${side}`) || value('border');
            const style = value(`border-${side}-style`) || value('border-style') || border;
            const width = value(`border-${side}-width`) || value('border-width') || border;
            return /\b(solid|dashed|dotted|double|groove|ridge|inset|outset)\b/.test(style) && !/^0(?:[a-z]+)?$/.test(width);
        });
        const background = value('background-color') || value('background');
        const pageBackground = winners(found.get(doc.body)).get('background-color') || winners(found.get(doc.documentElement)).get('background-color') || 'white';
        if (sides.length >= 2 || (visible(background) && background !== pageBackground)) add(elm, 'box', 'box');
    }
}
