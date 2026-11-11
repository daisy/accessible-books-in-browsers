import type { MarkupCleanupOptions } from './markup-cleanup.js';

const HEADING = 'h1, h2, h3, h4, h5, h6, [role="heading"]';
const text = (element: Element) => (element.textContent ?? '').replace(/\s+/g, ' ').trim();
const hasSemantics = (element: Element) => Array.from(element.attributes).some(attribute =>
    attribute.name === 'role' || attribute.name.startsWith('aria-') || attribute.name === 'epub:type')
    || Array.from(element.classList).some(name => name.startsWith('epubtype_'));

export function repairHeadingTitles(doc: Document, options: MarkupCleanupOptions): void {
    for (const heading of Array.from(doc.querySelectorAll(HEADING))) {
        const title = heading.getAttribute('title');
        if (!title?.trim()) continue;
        const label = title.replace(/\s+/g, ' ').trim();
        if (!text(heading) && !heading.querySelector('img, svg, math, a[href], input, button, audio, video')) {
            const duplicate = [heading.previousElementSibling, heading.nextElementSibling]
                .some(neighbor => neighbor?.matches(HEADING) && text(neighbor) === label);
            if (duplicate && !heading.children.length && !hasSemantics(heading) && !options.narratedTargetIds.includes(heading.id)) {
                // Preserve a possible link target until the id-retention pass decides whether
                // anyone needs it. The duplicate heading itself must not remain in the outline.
                const anchor = doc.createElement('a');
                for (const attribute of Array.from(heading.attributes)) {
                    if (attribute.name !== 'title') anchor.setAttribute(attribute.name, attribute.value);
                }
                heading.replaceWith(anchor);
                options.report.change('Duplicate title-only headings removed', options.page);
            } else {
                heading.append(doc.createTextNode(title));
                heading.removeAttribute('title');
                options.report.change('Heading titles made visible', options.page);
            }
        } else if (text(heading) === label) {
            heading.removeAttribute('title');
            options.report.change('Redundant heading titles removed', options.page);
        }
    }
}

// A block containing only a MathML expression and one short equation number is
// unambiguous without relying on the classes used by a particular publisher.
export function markNumberedEquations(doc: Document, options: MarkupCleanupOptions): void {
    for (const block of Array.from(doc.querySelectorAll('div, p, figure'))) {
        if (block.closest('math') || block.classList.contains('webbook-equation')) continue;
        const children = Array.from(block.children);
        if (children.length !== 2 || block.querySelectorAll('math').length !== 1
            || Array.from(block.childNodes).some(node => node.nodeType === 3 && node.textContent?.trim())) continue;
        const math = block.querySelector('math');
        const expression = children.find(child => child === math || (math && child.contains(math)));
        const number = children.find(child => child !== expression);
        if (!math || !number || number.matches('math, a[href], input, button')
            || number.querySelector('math, img, svg, a[href], input, button')) continue;
        if (!expression) continue;
        if (expression !== math) {
            const remainder = expression.cloneNode(true) as Element;
            remainder.querySelector('math')?.remove();
            if (text(remainder) || remainder.querySelector('img, svg, video, audio, input, button')) continue;
        }
        const label = text(number);
        if (label.length > 24 || !/^(?:\((?:\p{Nd}+|\p{L})(?:\.\p{Nd}+)*\)|\[(?:\p{Nd}+|\p{L})(?:\.\p{Nd}+)*\]|(?:\p{Nd}+|\p{L})(?:\.\p{Nd}+)+)$/u.test(label)) continue;
        block.classList.add('webbook-equation');
        number.classList.add('webbook-equation-number');
        const scroll = doc.createElement('span');
        scroll.className = 'webbook-equation-scroll';
        scroll.setAttribute('role', 'region');
        scroll.setAttribute('aria-label', `Equation ${label}`);
        scroll.setAttribute('tabindex', '0');
        expression.before(scroll);
        scroll.append(expression);
        options.report.change('Numbered equations given responsive layout', options.page);
    }
}

// Run after id retention, before narration paths and search passages are finalized.
export function cleanLeftoverAnchors(doc: Document, options: MarkupCleanupOptions, narratedTargets: ReadonlySet<Element>): void {
    for (const anchor of Array.from(doc.querySelectorAll('a:not([href]), span, div')).reverse()) {
        if (anchor.id || hasSemantics(anchor) || narratedTargets.has(anchor) || anchor.closest('svg, math')) continue;
        // Names, focus behavior and hidden content can carry meaning independently of text.
        if (Array.from(anchor.attributes).some(attribute => !['class', 'title', 'style'].includes(attribute.name))) continue;
        const content = anchor.textContent?.trim() || anchor.children.length;
        if (anchor.tagName !== 'A' && content) continue;
        if (content) anchor.replaceWith(...Array.from(anchor.childNodes));
        else {
            // Removing an indented empty element should not leave a whitespace-only
            // line in generated HTML. Preformatted/code whitespace stays byte-for-byte.
            const before = anchor.previousSibling;
            const after = anchor.nextSibling;
            if (!anchor.closest('pre, code') && before?.nodeType === 3 && after?.nodeType === 3
                && /^[\t ]*\r?\n/.test(after.textContent ?? '')) {
                before.textContent = (before.textContent ?? '').replace(/(^|\n)[\t ]+$/, '$1');
            }
            anchor.remove();
        }
        const kind = anchor.tagName !== 'A' ? 'Empty nonsemantic wrappers removed'
            : content ? 'Unlinked anchors unwrapped' : 'Empty unlinked anchors removed';
        options.report.change(kind, options.page);
    }
}
