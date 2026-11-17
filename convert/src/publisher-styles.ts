import { pseudoElement, selectorSpecificity, specificityPadding, type PublisherSelectors } from './publisher-selectors.js';
// Publisher CSS lives below reader settings and can select publication content only.
import path from 'path';
import css from 'css';
import { readFile } from 'fs/promises';
import type { BookStylesheet } from './book-styles.js';
import type { ImageAssetRegistry } from './assets.js';
import { isExternalHref } from './ids.js';

// Root compounds retain classes/attributes (body.chapter -> #webbook-main.chapter).
// :is/:where root alternatives are scoped too; an outer prefix contains every selector.
function rewriteSelectorIds(selector: string, ids: ReadonlyMap<string, string>): string {
    return selector.replace(/#([\w-]+)/g, (match, id) => ids.has(id) ? `#${ids.get(id)}` : match);
}

export function scopeSelector(selector: string, rootIds: Iterable<string> = []): string {
    selector = rewriteSelectorIds(selector, new Map(Array.from(rootIds, id => [id, 'webbook-main'])));
    selector = selector.replace(/\[\s*epub(?:\||\\:)type\b/g, '[data-webbook-epub-type');
    let scoped = selector.replace(/(^|[\s>+~,(])(?:html|body|:root)(?=[\s.#:[>+~),]|$)/gi, '$1#webbook-main');
    scoped = scoped.replace(/#webbook-main([^\s>+~(),]*)\s*>?\s*#webbook-main/g, '#webbook-main$1');
    // Constrain the subject too: body + footer must never reach a reader control.
    const pseudo = scoped.search(/::[\w-]+|:(?:before|after|first-line|first-letter)\b/);
    const guard = ':where(#webbook-main, #webbook-main *):not(:where([data-webbook-reader], .webbook, .webbook *))';
    return pseudo < 0 ? scoped + guard : scoped.slice(0, pseudo) + guard + scoped.slice(pseudo);
}

export function normalizeBookDeclaration(property: string, value: string): { property: string; value: string } {
    const writing = new Set(['writing-mode', 'text-combine', 'text-combine-horizontal', 'text-combine-upright',
        'text-orientation', 'text-emphasis', 'text-emphasis-style', 'text-emphasis-position',
        'text-emphasis-color', 'text-transform', 'speak-as', 'line-break', 'word-break']);
    const standard = property.replace(/^-(epub|webkit)-/, '');
    let p = writing.has(standard) ? standard : property;
    let v = value.replace(/!\s*important\s*$/i, '').trim();
    if (p === 'text-combine' || p === 'text-combine-horizontal') { p = 'text-combine-upright'; if (/^horizontal/.test(v)) v = 'all'; }
    if (p === 'writing-mode') v = ({ 'tb-rl':'vertical-rl', 'tb':'vertical-rl', 'tb-lr':'vertical-lr', 'lr-tb':'horizontal-tb', 'lr':'horizontal-tb' } as Record<string,string>)[v] ?? v;
    if (p === 'text-orientation') v = ({ 'vertical-right':'mixed', 'rotate-right':'sideways', 'sideways-right':'sideways', 'rotate-normal':'sideways' } as Record<string,string>)[v] ?? v;
    if (p === 'text-transform') v = v.replace(/-epub-fullwidth|\bfullwidth\b/g, 'full-width');
    return { property: p, value: v };
}
const ROOT_FRAME = /^(?:writing-mode|(?:min-|max-)?(?:width|height|inline-size|block-size)|margin(?:-.+)?|padding(?:-.+)?|position|inset(?:-.+)?|top|right|bottom|left)$/;

type Rule = { type: string; selectors?: string[]; declarations?: any[]; rules?: Rule[]; import?: string; media?: string; name?: string };

export type InlineStyle = { marker: string; style: string; root: boolean };
export function captureInlineStyles(doc: Document): InlineStyle[] {
    const styles: InlineStyle[] = [];
    for (const elm of Array.from(doc.querySelectorAll('[style]'))) {
        if (elm.closest('svg, math')) continue;
        const marker = String(styles.length + 1);
        styles.push({ marker, style: elm.getAttribute('style') ?? '', root: elm === doc.body || elm === doc.documentElement });
        elm.setAttribute('data-webbook-inline-style', marker);
        elm.removeAttribute('style');
    }
    return styles;
}

export async function publisherStyles(doc: Document, sheets: BookStylesheet[], registry: ImageAssetRegistry, warn: (message:string)=>void, documentPath = '', options: { rootIds?: Iterable<string>; renamedIds?: ReadonlyMap<string, string>; selectors?: PublisherSelectors; page?: string; inlineStyles?: InlineStyle[] } = {}): Promise<string> {
    const rootIds = new Set([...options.rootIds ?? [], ...[doc.documentElement.id, doc.body.id].filter(Boolean)]);
    const renamedIds = options.renamedIds ?? new Map<string, string>();
    for (const id of Array.from(rootIds)) if (renamedIds.has(id)) rootIds.add(renamedIds.get(id)!);
    const rewriteUrls = (text: string, sourcePath: string, font = false) => text.replace(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)/gi, (match, double, single, bare) => {
        const href = (double ?? single ?? bare ?? '').trim();
        if (!href || href.startsWith('#') || isExternalHref(href) || href.startsWith('data:')) return match;
        const parts = href.match(/^([^?#]+)(.*)$/);
        if (!parts) return match;
        try { const asset = registry.registerPublisherAsset(path.resolve(path.dirname(sourcePath), decodeURIComponent(parts[1])), options.page ?? '', font); return asset ? `url("../${asset.href}${parts[2]}")` : 'url("")'; } catch { return match; }
    });
    const fontNames = new Map<string,string>();
    const keyframes = new Map<string,string>();
    const parse = async (text: string, sourcePath: string, ancestry: Set<string>): Promise<Rule[]> => {
        const tree = css.parse(text, { silent:true });
        for (const error of tree.stylesheet?.parsingErrors ?? []) warn(`Publisher CSS: ${error.reason}`);
        const result: Rule[] = [];
        for (const rule of tree.stylesheet?.rules as Rule[] ?? []) {
            if (rule.type === 'import') {
                const match = (rule.import ?? '').match(/^(?:url\(\s*)?["']?([^"'\s)]+)["']?\s*\)?\s*(.*)$/);
                if (!match || isExternalHref(match[1])) { warn('A remote stylesheet import could not be scoped and was omitted.'); continue; }
                const imported = path.resolve(path.dirname(sourcePath), decodeURIComponent(match[1]));
                if (ancestry.has(imported)) continue;
                try {
                    const rules = await parse(await readFile(imported,'utf8'), imported, new Set([...ancestry, imported]));
                    if (match[2]) result.push({type:'media',media:match[2],rules}); else result.push(...rules);
                } catch { warn(`Stylesheet import could not be read: ${path.basename(imported)}`); }
                continue;
            }
            if (rule.rules) rule.rules = await expandNested(rule.rules, sourcePath);
            if (rule.declarations) for (const declaration of rule.declarations) {
                if (declaration.type !== 'declaration') continue;
                declaration.bookImportant = /!\s*important\s*$/i.test(declaration.value);
                Object.assign(declaration, normalizeBookDeclaration(declaration.property, rewriteUrls(declaration.value, sourcePath, rule.type === 'font-face')));
                if (rule.type === 'font-face' && declaration.property === 'font-family') {
                    const name=declaration.value.replace(/^["']|["']$/g,'');
                    if (!fontNames.has(name)) fontNames.set(name,`webbook-publisher-font-${fontNames.size+1}`);
                }
            }
            if (rule.type === 'keyframes' && rule.name && !keyframes.has(rule.name)) keyframes.set(rule.name,`webbook-publisher-animation-${keyframes.size+1}`);
            result.push(rule);
        }
        return result;
    };
    const expandNested = async (rules: Rule[], sourcePath:string):Promise<Rule[]> => {
        // Parsing nested rules again also expands imports and rewrites their relative URLs.
        return parse(css.stringify({ type:'stylesheet',stylesheet:{rules} } as any), sourcePath, new Set([sourcePath]));
    };
    const groups: {rules:Rule[]; sheet:number}[]=[];
    for(const [index, sheet] of sheets.entries()) groups.push({ rules:await parse(sheet.css,sheet.sourcePath ?? '',new Set([sheet.sourcePath ?? ''])),sheet:index });
    // Inline declarations join the book layer, so even an inline !important cannot defeat
    // reader settings. Keep selector identity on the source element, before id rewriting.
    const inline: Rule[] = [];
    for (const style of options.inlineStyles ?? captureInlineStyles(doc)) {
        const rules = await parse(`x {${style.style}}`, documentPath, new Set());
        const declarations = rules[0]?.declarations;
        if (declarations?.length) inline.push({ type: 'rule', selectors: [style.root ? '#webbook-main' : `[data-webbook-inline-style="${style.marker}"]`], declarations });
    }
    groups.push({rules:inline,sheet:-1});
    const transform = (rules: Rule[], sheet: number, important: boolean): Rule[] => rules.flatMap(rule => {
        if (['charset', 'namespace', 'page', 'import'].includes(rule.type)) return [];
        const copy = { ...rule };
        if (rule.rules) {
            copy.rules = transform(rule.rules, sheet, important);
            return copy.rules.length ? [copy] : [];
        }
        if (rule.type !== 'rule' && important) return [];
        if (rule.type === 'keyframes' && rule.name) copy.name = keyframes.get(rule.name) ?? rule.name;
        if (rule.declarations) {
            copy.declarations = rule.declarations.filter(d => d.type === 'declaration' && Boolean(d.bookImportant) === important).map(d => {
                const declaration = { ...d };
                for (const [name, replacement] of [...fontNames, ...keyframes]) {
                    if (['font', 'font-family', 'animation', 'animation-name'].includes(declaration.property)) {
                        const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        declaration.value = declaration.value.replace(new RegExp(`(["']?)${escaped}\\1(?=\\s|,|$)`, 'g'), replacement);
                    }
                }
                return declaration;
            });
            if (!copy.declarations.length) return [];
        }
        if (rule.type !== 'rule' || !rule.selectors) return [copy];
        return rule.selectors.flatMap(sourceSelector => {
            // Resolve publication ids before adding the reader's scope. Otherwise root ids
            // create impossible '#webbook-main #webbook-main' descendant selectors.
            const frozen = options.selectors?.selector(sheet, sourceSelector);
            let selector = frozen?.selector ?? rewriteSelectorIds(sourceSelector, renamedIds);
            selector = rewriteSelectorIds(selector, new Map(Array.from(rootIds, id => [id, 'webbook-main'])));
            const root = frozen?.root || /^(?:html|body|:root|#webbook-main)(?:[.#][\w-]+|\[[^\]]*\])*(?:\s*>?\s*(?:html|body|:root|#webbook-main)(?:[.#][\w-]+|\[[^\]]*\])*)*$/.test(selector.trim());
            const declarations = (copy.declarations ?? []).filter(d => !root || !ROOT_FRAME.test(d.property));
            const { base, pseudo } = pseudoElement(selector);
            const weight = selectorSpecificity(sourceSelector);
            const pseudoWeight = selectorSpecificity(pseudo);
            const padding = specificityPadding([weight[0] - pseudoWeight[0], weight[1] - pseudoWeight[1], weight[2] - pseudoWeight[2]]);
            // Both scoping and the condition have zero weight. Author specificity is exact,
            // including selectors frozen to generated classes and root aliases.
            const scoped = `:where(:root[data-webbook-appearance="published"]) :where(${scopeSelector(base)})${padding}${pseudo}`;
            return declarations.length ? [{ ...copy, selectors: [scoped], declarations }] : [];
        });
    });
    const hasRules = (rules: Rule[]): boolean => rules.some(rule => rule.type === 'rule' || rule.type === 'font-face' || (rule.rules && hasRules(rule.rules)));
    if (!groups.some(group => hasRules(group.rules))) return '';
    const text=groups.map(({rules,sheet})=>{
        return [false, true].map(important => {
            const text = css.stringify({ type: 'stylesheet', stylesheet: { rules: transform(rules, sheet, important) } } as any);
            const layer = (rules === inline ? 'inline' : 'source') + (important ? '-important' : '');
            return `@layer ${layer} {${text}}`;
        }).join('\n');
    }).join('\n');
    return `@layer publisher { @layer source, inline, source-important, inline-important;\n${text}\n}`;
}
