import type { ConversionReport } from './conversion-report.js';
import { IDREF_ATTRIBUTES, decodeFragment, referencedIds, uniqueId } from './ids.js';
import type { NarrationSelector } from './structure-ids.js';
import { repairHeadingTitles, markNumberedEquations } from './conversion-rules.js';

export type MarkupCleanupOptions = {
    bookLanguage: string;
    cleanup: boolean;
    page: string;
    protectedIds: Iterable<string>;
    narratedTargetIds: string[];
    responsiveTables: boolean;
    report: ConversionReport;
};

// Ids are renamed separately, after the structure-id pass (renameCollidingIds), so only ids that
// stay in the book are renamed
export function cleanPublicationMarkup(doc: Document, options: MarkupCleanupOptions): void {
    if (options.cleanup) repairHeadingTitles(doc, options);
    analyzeWarnings(doc, options);
    const protectedIds = referencedIds(doc, [...options.protectedIds, ...options.narratedTargetIds]);

    if (options.cleanup) {
        repairLanguages(doc, options);
        markNumberedEquations(doc, options);
        unwrapEmptySpans(doc, options);
        removeEmptyParagraphs(doc, protectedIds, options);
        addHeaderScopes(doc, options);
        replacePublicationMains(doc, options);
        repairTabOrder(doc, options);
        repairMedia(doc, options);
        // MathML alttext stays as the book has it, empty or not: an empty one has no meaning in
        // MathML (unlike alt="" on an image), screen readers read the MathML itself, and copying
        // treats it as missing (user, 2026-11-10)
    }
    if (options.responsiveTables) wrapTables(doc, options);
}

function repairLanguages(doc: Document, options: MarkupCleanupOptions): void {
    const mismatches = new Map<string, { count: number; examples: string[] }>();
    for (const elm of Array.from(doc.querySelectorAll('*'))) {
        const tag = elm.getAttribute('xml:lang');
        if (!tag) continue;
        if (!elm.hasAttribute('lang')) {
            const agreement = languageAgreement(elm.textContent ?? '', tag);
            if (agreement === true || agreement === null) {
                elm.setAttribute('lang', tag);
                options.report.change('Language attributes copied from xml:lang', options.page);
            } else if (!elm.matches('html, body') && letterCount(elm.textContent ?? '') >= 10) {
                const group = mismatches.get(tag) ?? { count: 0, examples: [] };
                group.count++;
                if (group.examples.length < 3) group.examples.push(elementDescription(elm));
                mismatches.set(tag, group);
            }
        }
        elm.removeAttribute('xml:lang');
        options.report.change('Ineffective xml:lang attributes removed', options.page);
    }
    for (const [tag, group] of mismatches) {
        options.report.warning('Element language',
            `${group.count} element${group.count === 1 ? '' : 's'} marked ${tag} use a different dominant script; lang was not copied. Examples: ${group.examples.join('; ')}.`,
            options.page);
    }
}

function unwrapEmptySpans(doc: Document, options: MarkupCleanupOptions): void {
    const spans = Array.from(doc.querySelectorAll('span')).reverse();
    for (const span of spans) {
        if (span.attributes.length) continue;
        span.replaceWith(...Array.from(span.childNodes));
        options.report.change('Empty spans unwrapped', options.page);
    }
}

function removeEmptyParagraphs(doc: Document, protectedIds: Set<string>, options: MarkupCleanupOptions): void {
    for (const paragraph of Array.from(doc.querySelectorAll('p'))) {
        if ((paragraph.textContent ?? '').trim() || paragraph.children.length) continue;
        if (paragraph.id && protectedIds.has(paragraph.id)) continue;
        paragraph.remove();
        options.report.change('Empty paragraphs removed', options.page);
    }
}

function addHeaderScopes(doc: Document, options: MarkupCleanupOptions): void {
    for (const table of Array.from(doc.querySelectorAll('table'))) {
        const rows = Array.from(table.querySelectorAll('tr'));
        const firstRow = rows[0];
        for (const th of Array.from(table.querySelectorAll('th:not([scope])'))) {
            const row = th.closest('tr');
            let scope = '';
            if (th.closest('thead') || row === firstRow) scope = 'col';
            else if (row && Array.from(row.children).find(child => child.matches('th, td')) === th) scope = 'row';
            if (!scope) continue;
            th.setAttribute('scope', scope);
            options.report.change(`Header cells given ${scope} scope`, options.page);
        }
    }
}

function replacePublicationMains(doc: Document, options: MarkupCleanupOptions): void {
    for (const main of Array.from(doc.body.querySelectorAll('main'))) {
        const replacement = doc.createElement('div');
        for (const attribute of Array.from(main.attributes)) replacement.setAttribute(attribute.name, attribute.value);
        replacement.append(...Array.from(main.childNodes));
        main.replaceWith(replacement);
        options.report.change('Nested main landmarks changed to div', options.page);
    }
}

function repairTabOrder(doc: Document, options: MarkupCleanupOptions): void {
    for (const elm of Array.from(doc.querySelectorAll('[tabindex]'))) {
        const value = Number(elm.getAttribute('tabindex'));
        if (!Number.isFinite(value) || value <= 0) continue;
        elm.setAttribute('tabindex', '0');
        options.report.change('Positive tabindex values changed to 0', options.page);
    }
}

function repairMedia(doc: Document, options: MarkupCleanupOptions): void {
    for (const media of Array.from(doc.querySelectorAll('audio, video'))) {
        if (media.hasAttribute('autoplay')) {
            media.removeAttribute('autoplay');
            options.report.change('Publication media autoplay removed', options.page);
        }
        if (!media.hasAttribute('controls')) {
            media.setAttribute('controls', '');
            options.report.change('Controls added to publication media', options.page);
        }
    }
}

function wrapTables(doc: Document, options: MarkupCleanupOptions): void {
    const used = new Set(Array.from(doc.querySelectorAll('[id]'), elm => elm.id));
    Array.from(doc.querySelectorAll('table')).filter(table => !table.parentElement?.closest('table')).forEach((table, index) => {
        if (table.parentElement?.classList.contains('webbook-table-scroll')) return;
        const wrapper = doc.createElement('div');
        wrapper.className = 'webbook-table-scroll';
        wrapper.setAttribute('role', 'region');
        wrapper.setAttribute('tabindex', '0');
        const caption = Array.from(table.children).find(child => child.matches('caption')) ?? null;
        if (caption) {
            if (!caption.id) caption.id = uniqueId(`table-caption-${index + 1}`, used);
            wrapper.setAttribute('aria-labelledby', caption.id);
        } else {
            wrapper.setAttribute('aria-label', `Table ${index + 1}`);
        }
        table.before(wrapper);
        wrapper.append(table);
        options.report.change('Tables given responsive scrolling wrappers', options.page);
    });
}

// Ids the reader's own page uses, and repeated ids (left only by --keep-all-ids; the structure-id
// pass keeps an id on its first element), get "-content" added. References to them in the page,
// and narration selectors anchored on them, follow; the caller updates other pages' links.
export function renameCollidingIds(doc: Document, selectors: Map<string, NarrationSelector>,
    reserved: Set<string>, page: string, report: ConversionReport): Map<string, string> {
    const elements = Array.from(doc.querySelectorAll('[id]'));
    const used = new Set([...reserved, ...elements.map(elm => elm.id)]);
    const encountered = new Set<string>();
    const renames = new Map<string, string>();
    for (const elm of elements) {
        const old = elm.id;
        const collidesWithUi = isReservedReaderId(old, reserved);
        const duplicate = encountered.has(old);
        encountered.add(old);
        if (!collidesWithUi && !duplicate) continue;
        const renamed = uniqueId(`${old}-content`, used);
        elm.id = renamed;
        if (!duplicate) renames.set(old, renamed);
        report.change(collidesWithUi ? 'Ids colliding with reader UI renamed' : 'Duplicate ids renamed', page);
        report.warning('Renamed ids', `#${old} was renamed to #${renamed}.`, page);
    }
    updateReferences(doc, renames);
    for (const selector of selectors.values()) {
        if (selector.type === 'FragmentSelector') selector.value = renames.get(selector.value) ?? selector.value;
    }
    return renames;
}

function isReservedReaderId(id: string, reserved: Set<string>): boolean {
    return reserved.has(id) || id.startsWith('webbook-') || /^toc-\d+(?:-|$)/.test(id);
}

function updateReferences(doc: Document, renames: Map<string, string>): void {
    if (!renames.size) return;
    doc.querySelectorAll('[href]').forEach(elm => {
        const href = elm.getAttribute('href') ?? '';
        const hashAt = href.indexOf('#');
        if (hashAt < 0) return;
        const old = decodeFragment(href.slice(hashAt + 1));
        const renamed = renames.get(old);
        if (renamed) elm.setAttribute('href', `${href.slice(0, hashAt + 1)}${encodeURIComponent(renamed)}`);
    });
    for (const attribute of IDREF_ATTRIBUTES) {
        doc.querySelectorAll(`[${attribute}]`).forEach(elm => {
            const prefix = attribute === 'usemap' ? '#' : '';
            const ids = (elm.getAttribute(attribute) ?? '').replace(/^#/, '').split(/\s+/)
                .map(id => renames.get(id) ?? id).filter(Boolean);
            elm.setAttribute(attribute, `${prefix}${ids.join(' ')}`);
        });
    }
    doc.querySelectorAll('[style]').forEach(elm => {
        let style = elm.getAttribute('style') ?? '';
        for (const [old, renamed] of renames) style = style.split(`url(#${old})`).join(`url(#${renamed})`);
        elm.setAttribute('style', style);
    });
}

function analyzeWarnings(doc: Document, options: MarkupCleanupOptions): void {
    const images = Array.from(doc.querySelectorAll('img'));
    const emptyAlt = images.filter(image => image.hasAttribute('alt') && !(image.getAttribute('alt') ?? '').trim()).length;
    const missingAlt = images.filter(image => !image.hasAttribute('alt')).length;
    options.report.addImages(images.length, emptyAlt, missingAlt);

    const stats = scriptStats(doc.body.textContent ?? '', options.bookLanguage);
    options.report.addBookScript(stats.letters, stats.expectedLetters);
    if (!options.cleanup) {
        const mismatches = new Map<string, { count: number; examples: string[] }>();
        for (const elm of Array.from(doc.querySelectorAll('*:not(html):not(body)'))) {
            const tag = elm.getAttribute('xml:lang');
            if (tag && !elm.hasAttribute('lang') && languageAgreement(elm.textContent ?? '', tag) === false) {
                if (letterCount(elm.textContent ?? '') < 10) continue;
                const group = mismatches.get(tag) ?? { count: 0, examples: [] };
                group.count++;
                if (group.examples.length < 3) group.examples.push(elementDescription(elm));
                mismatches.set(tag, group);
            }
        }
        for (const [tag, group] of mismatches) options.report.warning('Element language',
            `${group.count} element${group.count === 1 ? '' : 's'} marked ${tag} use a different dominant script. Examples: ${group.examples.join('; ')}.`,
            options.page);
    }

    let previousLevel = 0;
    for (const heading of Array.from(doc.querySelectorAll('h1, h2, h3, h4, h5, h6, [role="heading"]'))) {
        const text = normalizedText(heading);
        if (!text) options.report.warning('Headings', heading.querySelector('img') ? 'Heading contains only an image.' : 'Empty heading.', options.page);
        const level = Number(heading.getAttribute('aria-level') || heading.tagName.slice(1));
        if (previousLevel && level > previousLevel + 1) {
            options.report.warning('Headings', `Heading level skips from ${previousLevel} to ${level}: ${text || '(empty)'}.`, options.page);
        }
        if (Number.isFinite(level)) previousLevel = level;
    }

    for (const paragraph of Array.from(doc.querySelectorAll('p'))) {
        const text = normalizedText(paragraph);
        if (!text) continue;
        const meaningful = Array.from(paragraph.childNodes).filter(node => node.nodeType !== 3 || Boolean(node.textContent?.trim()));
        if (text.length <= 100 && meaningful.length > 0 && meaningful.every(node =>
            node.nodeType === 1 && (node as Element).matches('b, strong'))) {
            options.report.warning('Paragraphs resembling headings', `“${excerpt(text)}” is short and entirely bold.`, options.page);
        }
        const inNote = Boolean(paragraph.closest('[role="doc-footnote"], [role="doc-endnote"], .epubtype_footnote, .epubtype_endnote, .epubtype_note'));
        if (!inNote && /^(?:[•·▪–]\s*|\d+[.)]\s+)/u.test(text)) {
            options.report.warning('Paragraphs resembling list items', `“${excerpt(text)}” starts like a list item.`, options.page);
        }
    }

    for (const link of Array.from(doc.querySelectorAll('a[href]'))) {
        const text = normalizedText(link);
        if (/^(?:https?:\/\/|www\.)\S+$/i.test(text) || /^(?:click here|here|more)$/i.test(text)) {
            options.report.warning('Link text', `“${excerpt(text)}” does not describe its destination.`, options.page);
        }
    }
    for (const svg of Array.from(doc.querySelectorAll('svg'))) {
        if (svg.getAttribute('aria-hidden') === 'true' || Array.from(svg.children).some(child => child.matches('title'))
            || svg.getAttribute('aria-label')?.trim() || svg.getAttribute('aria-labelledby')?.trim()) continue;
        options.report.warning('Inline SVG', 'Inline SVG has no title or accessible name.', options.page);
    }
    for (const table of Array.from(doc.querySelectorAll('table'))) {
        if (table.querySelector('th')) continue;
        const rows = Array.from(table.querySelectorAll('tr'));
        const columns = Math.max(0, ...rows.map(row => Array.from(row.children).filter(child => child.matches('td, th')).length));
        if (rows.length <= 1 || columns <= 1) options.report.warning('Tables resembling layout', 'Table has no headers and appears to be used for layout.', options.page);
        else options.report.warning('Data tables without headers', `Table has ${rows.length} rows and ${columns} columns but no header cells.`, options.page);
    }
}

export function languageAgreement(text: string, tag: string): boolean | null {
    const stats = scriptStats(text, tag);
    if (!stats.hasExpectedScript) return null;
    if (!stats.letters) return false;
    return stats.expectedLetters / stats.letters > .5;
}

function letterCount(text: string): number {
    return Array.from(text.matchAll(/\p{Letter}/gu)).length;
}

function scriptStats(text: string, tag: string): { letters: number; expectedLetters: number; hasExpectedScript: boolean } {
    const letters = letterCount(text);
    const patterns = expectedScriptPatterns(tag);
    if (!patterns.length) return { letters, expectedLetters: 0, hasExpectedScript: false };
    const expectedLetters = patterns.reduce((count, pattern) => count + Array.from(text.matchAll(pattern)).length, 0);
    return { letters, expectedLetters: Math.min(letters, expectedLetters), hasExpectedScript: true };
}

function expectedScriptPatterns(tag: string): RegExp[] {
    let script = '';
    try { script = new Intl.Locale(tag).maximize().script ?? ''; } catch { return []; }
    const scripts = script === 'Jpan' ? ['Han', 'Hiragana', 'Katakana']
        : script === 'Kore' ? ['Hangul', 'Han']
            : ['Hans', 'Hant'].includes(script) ? ['Han'] : [script];
    try { return scripts.filter(Boolean).map(value => new RegExp(`\\p{Script=${value}}`, 'gu')); } catch { return []; }
}

function normalizedText(elm: Element): string {
    return (elm.textContent ?? '').replace(/\s+/g, ' ').trim();
}

function excerpt(text: string): string {
    return text.length > 80 ? `${text.slice(0, 77)}…` : text;
}

function elementDescription(elm: Element): string {
    const text = normalizedText(elm);
    return `<${elm.tagName.toLowerCase()}${elm.id ? ` id="${elm.id}"` : ''}>${text ? ` (“${excerpt(text)}”)` : ''}`;
}

export function rewriteRenamedFragment(href: string, page: string, renamesByPage: Map<string, Map<string, string>>): string {
    const hashAt = href.indexOf('#');
    if (hashAt < 0) return href;
    const targetPage = href.slice(0, hashAt) || page;
    const old = decodeFragment(href.slice(hashAt + 1));
    const renamed = renamesByPage.get(targetPage)?.get(old);
    return renamed ? `${href.slice(0, hashAt + 1)}${encodeURIComponent(renamed)}` : href;
}
