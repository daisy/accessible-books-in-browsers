// Ids in publication content: what refers to them, and making new ones. Shared by the markup
// cleanup (renaming ids that collide) and the structure-id pass (which ids to keep).

// Attributes whose value is one or more ids (usemap's starts with '#')
export const IDREF_ATTRIBUTES = ['aria-describedby', 'aria-labelledby', 'aria-controls', 'aria-details',
    'aria-activedescendant', 'aria-errormessage', 'aria-flowto',
    'for', 'headers', 'list', 'form', 'usemap'];

// A URL with a scheme (https:, mailto:, data:…) or protocol-relative: not a file of the book
export function isExternalHref(href: string): boolean {
    return /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(href);
}

export function decodeFragment(value: string): string {
    try { return decodeURIComponent(value); } catch { return value; }
}

// Ids a stylesheet selects (#name). Also matches hex colors (#fff), which only keeps an id that
// happens to have that name.
export function cssReferencedIds(css: string): string[] {
    return Array.from(css.matchAll(/#([A-Za-z_][\w-]*)/g), match => match[1]);
}

// The ids something in the page refers to: links, idref attributes, <style> blocks, and ids
// inside SVG and MathML (which refer to each other in ways not worth parsing). Plus the given
// ones, such as table of contents targets and links from other pages.
export function referencedIds(doc: Document, extra: Iterable<string> = []): Set<string> {
    const ids = new Set(extra);
    doc.querySelectorAll('a[href], area[href]').forEach(link => {
        const href = link.getAttribute('href') || '';
        const hash = href.includes('#') ? href.slice(href.indexOf('#') + 1) : '';
        if (hash) ids.add(decodeFragment(hash));
    });
    for (const attribute of IDREF_ATTRIBUTES) {
        doc.querySelectorAll(`[${attribute}]`).forEach(elm => {
            const value = elm.getAttribute(attribute) || '';
            value.replace(/^#/, '').split(/\s+/).filter(Boolean).forEach(id => ids.add(id));
        });
    }
    doc.querySelectorAll('style').forEach(style => cssReferencedIds(style.textContent || '').forEach(id => ids.add(id)));
    doc.querySelectorAll('svg [id], math [id]').forEach(elm => ids.add(elm.id));
    return ids;
}

// base, or base-2, base-3… if that's taken; the result is added to used
export function uniqueId(base: string, used: Set<string>): string {
    let candidate = base;
    let number = 2;
    while (used.has(candidate)) candidate = `${base}-${number++}`;
    used.add(candidate);
    return candidate;
}
