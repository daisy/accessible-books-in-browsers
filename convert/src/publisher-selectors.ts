// Source-selector identities survive chapter cloning; no temporary identity reaches the book.
import css from 'css';
import type { BookStylesheet } from './book-styles.js';
export const SOURCE_ID = 'data-webbook-publisher-source';
export type Specificity = [number, number, number];
export type PublisherStage = 'splitting' | 'table wrapper' | 'permalink' | 'cleanup';
const DYNAMIC = /^(?:hover|active|focus|focus-visible|focus-within|visited|link|any-link|target|checked|disabled|enabled|indeterminate|valid|invalid|user-valid|user-invalid|placeholder-shown|open)$/i;
const DYNAMIC_IN = /:(?:hover|active|focus(?:-visible|-within)?|visited|link|any-link|target|checked|disabled|enabled|indeterminate|valid|invalid|user-valid|user-invalid|placeholder-shown|open)\b/i;
function endGroup(text: string, start: number, open = '(', close = ')'): number {
    let depth = 1, quote = '';
    for (let i = start + 1; i < text.length; i++) {
        const c = text[i];
        if (c === '\\') { i++; continue; }
        if (quote) { if (c === quote) quote = ''; continue; }
        if (c === '"' || c === "'") { quote = c; continue; }
        if (c === open) depth++;
        if (c === close && --depth === 0) return i;
    }
    return text.length - 1;
}
export function selectorParts(text: string, separator = ','): string[] {
    const result: string[] = []; let start = 0;
    for (let i = 0; i < text.length; i++) {
        if (text[i] === '\\') { i++; continue; }
        if (text[i] === '(' || text[i] === '[') { i = endGroup(text, i, text[i], text[i] === '(' ? ')' : ']'); continue; }
        if (text[i] === separator) { result.push(text.slice(start, i).trim()); start = i + 1; }
    }
    result.push(text.slice(start).trim()); return result;
}
const add = (a: Specificity, b: Specificity): Specificity => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const compare = (a: Specificity, b: Specificity) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
export function selectorSpecificity(selector: string): Specificity {
    let result: Specificity = [0, 0, 0], typePossible = true;
    for (let i = 0; i < selector.length;) {
        const c = selector[i];
        if (/\s|[>+~,]/.test(c)) { typePossible = true; i++; continue; }
        if (c === '[') { result[1]++; i = endGroup(selector, i, '[', ']') + 1; typePossible = false; continue; }
        if (c === '#' || c === '.') { result[c === '#' ? 0 : 1]++; i++; }
        else if (c === ':') {
            const pseudo = selector.slice(i).match(/^(:{1,2})([\w-]+)/);
            if (!pseudo) { i++; continue; }
            const name = pseudo[2].toLowerCase(), element = pseudo[1] === '::' || /^(before|after|first-letter|first-line)$/.test(name);
            i += pseudo[0].length;
            if (selector[i] === '(') {
                const end = endGroup(selector, i), arg = selector.slice(i + 1, end);
                if (['is', 'not', 'has', 'matches'].includes(name)) {
                    const weights = selectorParts(arg).map(selectorSpecificity).sort(compare);
                    result = add(result, weights[weights.length - 1] ?? [0, 0, 0]);
                } else if (name !== 'where') {
                    result[element ? 2 : 1]++;
                    if (/^nth-(?:last-)?child$/.test(name) && /\s+of\s+/i.test(arg)) {
                        const weights = selectorParts(arg.split(/\s+of\s+/i).slice(1).join(' of ')).map(selectorSpecificity).sort(compare);
                        result = add(result, weights[weights.length - 1] ?? [0, 0, 0]);
                    }
                }
                i = end + 1;
            } else result[element ? 2 : 1]++;
            typePossible = false; continue;
        } else if (c === '*') { i++; typePossible = false; continue; }
        else if (typePossible) result[2]++;
        const begin = i;
        while (i < selector.length && !/[\s.#:[\]>+~,()]/.test(selector[i])) {
            if (selector[i] === '\\') i++;
            i++;
        }
        if (i === begin) i++;
        typePossible = false;
    }
    return result;
}
// A zero-specificity match plus an exact original tuple. :is(*,...) always matches,
// so padding never depends on the author's ids/classes/tag names.
export function specificityPadding(weight: Specificity): string {
    return ':is(*,#webbook-publisher-specificity)'.repeat(weight[0])
        + ':is(*,.webbook-publisher-specificity)'.repeat(weight[1])
        + ':is(*,webbook-publisher-specificity)'.repeat(weight[2]);
}
export function pseudoElement(selector: string): { base: string; pseudo: string } {
    for (let i = 0; i < selector.length; i++) {
        if (selector[i] === '[' || selector[i] === '(') { i = endGroup(selector, i, selector[i], selector[i] === '[' ? ']' : ')'); continue; }
        if (selector[i] === ':' && /^(?:::|:(?:before|after|first-letter|first-line)\b)/i.test(selector.slice(i))) return { base: selector.slice(0, i), pseudo: selector.slice(i) };
    }
    return { base: selector, pseudo: '' };
}
function states(selector: string): { static: string; dynamic: string } {
    let plain = '', dynamic = '';
    for (let i = 0; i < selector.length;) {
        if (selector[i] === '[') { const end = endGroup(selector, i, '[', ']'); plain += selector.slice(i, end + 1); i = end + 1; continue; }
        const token = selector.slice(i).match(/^:([\w-]+)/);
        if (!token) { plain += selector[i++]; continue; }
        let end = i + token[0].length;
        if (selector[end] === '(') end = endGroup(selector, end) + 1;
        const whole = selector.slice(i, end);
        if (DYNAMIC.test(token[1]) || DYNAMIC_IN.test(whole)) dynamic += whole;
        else plain += whole;
        i = end;
    }
    return { static: plain.trim() || '*', dynamic };
}
function compounds(selector: string): Array<{ text: string; prefix: string }> {
    const result: Array<{ text: string; prefix: string }> = []; let start = 0;
    for (let i = 0; i <= selector.length; i++) {
        if (selector[i] === '[' || selector[i] === '(') { i = endGroup(selector, i, selector[i], selector[i] === '[' ? ']' : ')'); continue; }
        if (i === selector.length || /\s|[>+~]/.test(selector[i])) {
            if (selector.slice(start, i).trim()) result.push({ text: selector.slice(start, i).trim(), prefix: selector.slice(0, i).trim() });
            start = i + 1;
        }
    }
    return result;
}
export function structuralSelector(selector: string): string {
    const { base } = pseudoElement(selector);
    // Remove dynamic conditions without touching combinators or structural pseudos.
    return compounds(base).reduce((text, part) => text.replace(part.text, states(part.text).static), base)
        .replace(/\[\s*epub\|type\b/g, '[epub\\:type');
}
type StateMatch = { ids: string[]; dynamic: string; self: boolean; name: string };
type RuleMatch = { source: string; query: string; ids: string[]; name: string; pseudo: string; state: StateMatch[]; cause?: PublisherStage; frozen: boolean; removed: number; occurrences: number; root: boolean };
export type PublisherCounts = { kept: number; frozen: number; unapplied: number; causes: Partial<Record<PublisherStage, number>>; examples: string[] };
export class PublisherSelectors {
    private records = new Map<string, RuleMatch>();
    private styled = new Set<string>();
    private splitIds?: Set<string>;
    private serial = 0;
    constructor(private doc: Document, sheets: BookStylesheet[], private warn: (message: string) => void = () => {}) {
        const ids = new Map<Element, string>(); let count = 0;
        const id = (elm: Element) => { if (!ids.has(elm)) ids.set(elm, String(++count)); return ids.get(elm)!; };
        const walk = (rules: any[], sheet: number) => {
            for (const rule of rules) {
                if (rule.rules) walk(rule.rules, sheet);
                if (rule.type !== 'rule') continue;
                for (const selector of rule.selectors ?? []) {
                    const key = `${sheet}:${selector}`;
                    if (this.records.has(key)) { this.records.get(key)!.occurrences++; continue; }
                    const query = structuralSelector(selector);
                    let matches: Element[];
                    try { matches = Array.from(doc.querySelectorAll(query)); }
                    catch { warn(`Publisher selector could not be matched: ${selector}`); continue; }
                    matches = matches.filter(elm => elm === doc.documentElement || elm === doc.body || doc.body.contains(elm));
                    const sourceIds = matches.map(id); sourceIds.forEach(value => this.styled.add(value));
                    const parts = compounds(pseudoElement(selector).base), state: StateMatch[] = [];
                    for (const [index, part] of parts.entries()) {
                        const dynamic = states(part.text).dynamic;
                        if (!dynamic) continue;
                        try { state.push({ ids: Array.from(doc.querySelectorAll(structuralSelector(part.prefix))).map(id), dynamic, self: index === parts.length - 1, name: `webbook-publisher-s${++this.serial}` }); } catch { /* source selector warning above */ }
                    }
                    this.records.set(key, { source: selector, query, ids: sourceIds, name: `webbook-publisher-r${++this.serial}`, pseudo: pseudoElement(selector).pseudo, state, frozen: false, removed: 0, occurrences: 1, root: matches.length > 0 && matches.every(elm => elm === doc.body || elm === doc.documentElement) });
                }
            }
        };
        sheets.forEach((sheet, index) => walk(css.parse(sheet.css, { silent: true }).stylesheet?.rules ?? [], index));
        // Identify every source element, including those no source selector matched.
        [doc.documentElement, doc.body, ...Array.from(doc.body.querySelectorAll('*'))].forEach(id);
        ids.forEach((value, elm) => elm.setAttribute(SOURCE_ID, value));
    }
    styledElement = (elm: Element): boolean => this.styled.has(elm.getAttribute(SOURCE_ID) ?? '');
    private elements(): Map<string, Element> { return new Map(Array.from(this.doc.querySelectorAll(`[${SOURCE_ID}]`), elm => [elm.getAttribute(SOURCE_ID)!, elm])); }
    checkpoint(stage: PublisherStage): void {
        const elements = this.elements();
        if (stage === 'splitting') this.splitIds = new Set(elements.keys());
        for (const record of this.records.values()) {
            if (!record.ids.length || record.cause) continue;
            let now: Element[]; try { now = Array.from(this.doc.querySelectorAll(record.query)).filter(elm => elm.hasAttribute(SOURCE_ID)); } catch { now = []; }
            const expected = record.ids.filter(value => elements.has(value)), expectedSet = new Set(expected);
            if (now.length !== expected.length || now.some(elm => !expectedSet.has(elm.getAttribute(SOURCE_ID) ?? ''))) record.cause = stage;
        }
    }
    finish(): PublisherCounts {
        const elements = this.elements(), counts: PublisherCounts = { kept: 0, frozen: 0, unapplied: 0, causes: {}, examples: [] };
        for (const record of this.records.values()) {
            if (!record.ids.length) { counts.kept += record.occurrences; continue; }
            const expected = record.ids.filter(value => elements.has(value)), expectedSet = new Set(expected);
            let now: Element[]; try { now = Array.from(this.doc.querySelectorAll(record.query)).filter(elm => elm.hasAttribute(SOURCE_ID)); } catch { now = []; }
            record.removed = record.ids.filter(value => (this.splitIds?.has(value) ?? true) && !elements.has(value)).length;
            record.frozen = record.removed > 0 || now.length !== expected.length || now.some(elm => !expectedSet.has(elm.getAttribute(SOURCE_ID) ?? ''));
            if (record.frozen) {
                expected.forEach(value => elements.get(value)!.classList.add(record.name));
                for (const state of record.state) state.ids.forEach(value => elements.get(value)?.classList.add(state.name));
                if (expected.length || !record.removed) {
                    counts.frozen += record.occurrences;
                    const cause = record.cause ?? 'cleanup'; counts.causes[cause] = (counts.causes[cause] ?? 0) + record.occurrences;
                }
            } else counts.kept += record.occurrences;
            if (record.removed) { counts.unapplied += record.occurrences; if (counts.examples.length < 10) counts.examples.push(`${record.source}: ${record.removed} source element(s) removed`); }
        }
        // Converter wrappers are reader-owned; their publication descendants remain styleable.
        this.doc.body.querySelectorAll('*').forEach(elm => { if (!elm.hasAttribute(SOURCE_ID)) elm.setAttribute('data-webbook-reader', ''); });
        this.doc.querySelectorAll(`[${SOURCE_ID}]`).forEach(elm => elm.removeAttribute(SOURCE_ID));
        return counts;
    }
    selector(sheet: number, source: string): { selector: string; root: boolean } | null {
        const record = this.records.get(`${sheet}:${source}`);
        if (!record) return null;
        if (!record.frozen) return { selector: source, root: record.root };
        const ancestors = record.state.filter(state => !state.self).map(state => `.${state.name}${state.dynamic}`).join(' ');
        const self = record.state.filter(state => state.self).map(state => state.dynamic).join('');
        return { selector: `${ancestors ? ancestors + ' ' : ''}.${record.name}${self}${record.pseudo}`, root: record.root };
    }
}
