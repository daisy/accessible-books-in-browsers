// What structure an element of the book is in, for Where am I? (plan 26): a footnote, a table, a
// list, an equation, the endnotes section, and the heading it comes under. Descriptive only. It
// knows nothing of skipping, Skip past or narration exclusion, and it changes nothing in the page.
// Meaning comes from HTML, ARIA roles and the converter's epubtype_ classes, never from a
// publisher's own class names or styling.

const NAME_LIMIT = 80;
const HEADING_SELECTOR = 'h1, h2, h3, h4, h5, h6, [role="heading"]';

function roles(elm) {
    return (elm.getAttribute('role') || '').split(/\s+/).filter(Boolean);
}

function hasClass(elm, ...names) {
    return names.some(name => elm.classList.contains(name));
}

function isPresentation(elm) {
    return roles(elm).some(role => role === 'presentation' || role === 'none');
}

// Plain text of an element without the reader's own controls inside it (heading permalinks, note
// backlinks, Copy buttons), whitespace normalized and capped
export function plainName(elm, limit = NAME_LIMIT) {
    if (!elm) return '';
    const copy = elm.cloneNode(true);
    copy.querySelectorAll('.webbook, [aria-hidden="true"], math, svg, img').forEach(node => node.remove());
    return capText(copy.textContent || '', limit);
}

export function capText(text, limit = NAME_LIMIT) {
    const normalized = text.replace(/\s+/g, ' ').trim();
    if (normalized.length <= limit) return normalized;
    const cut = normalized.slice(0, limit);
    const space = cut.lastIndexOf(' ');
    return `${(space > limit / 2 ? cut.slice(0, space) : cut).replace(/[\s,;:.]+$/, '')}…`;
}

function labelledName(elm) {
    const ids = (elm.getAttribute('aria-labelledby') || '').split(/\s+/).filter(Boolean);
    const byIds = ids.map(id => plainName(document.getElementById(id))).filter(Boolean).join(' ');
    if (byIds) return capText(byIds);
    return capText(elm.getAttribute('aria-label') || '');
}

function isNotesSection(elm) {
    return hasClass(elm, 'epubtype_endnotes', 'epubtype_rearnotes') || roles(elm).includes('doc-endnotes');
}

// A top-level item of an endnotes section's list: a note even when not marked as one; a nested
// list inside a note keeps being a list
function endnotesSectionItem(elm) {
    if (elm.tagName !== 'LI' || !elm.parentElement?.matches('ol, ul')) return false;
    const section = elm.closest('.epubtype_endnotes, .epubtype_rearnotes, [role~="doc-endnotes"]');
    if (!section) return false;
    const outerItem = elm.parentElement.parentElement?.closest('li');
    return !outerItem || !section.contains(outerItem);
}

// An item's number in an ordered list, when the list says it: its own value, or its place counted
// from the list's start. Only the list's own items count.
function orderedNumber(item) {
    const list = item.parentElement;
    if (!list || list.tagName !== 'OL') return null;
    const value = Number.parseInt(item.getAttribute('value') ?? '', 10);
    if (Number.isFinite(value)) return value;
    const items = Array.from(list.children).filter(child => child.tagName === 'LI');
    const start = Number.parseInt(list.getAttribute('start') ?? '', 10);
    const index = items.indexOf(item);
    if (list.hasAttribute('reversed')) return (Number.isFinite(start) ? start : items.length) - index;
    return (Number.isFinite(start) ? start : 1) + index;
}

function equationNumber(math) {
    const block = math.closest('.webbook-equation');
    const number = block?.querySelector('.webbook-equation-number');
    return number ? capText((number.textContent || '').replace(/^\s*\(\s*|\s*\)\s*$/g, ''), 20) : '';
}

// The one structure an element is, if any. The more specific meaning wins: a footnote written as
// an aside is a footnote, not also a sidebar.
function classify(elm) {
    const elmRoles = roles(elm);
    if (hasClass(elm, 'epubtype_footnote') || elmRoles.includes('doc-footnote')) return { type: 'footnote' };
    if (hasClass(elm, 'epubtype_endnote', 'epubtype_rearnote') || elmRoles.includes('doc-endnote') || endnotesSectionItem(elm)) {
        return { type: 'endnote', number: elm.tagName === 'LI' ? orderedNumber(elm) : null };
    }
    if (hasClass(elm, 'epubtype_note')) return { type: 'note' };
    if (isNotesSection(elm)) return { type: 'endnotes section' };
    if (hasClass(elm, 'epubtype_toc') || elmRoles.includes('doc-toc')) return { type: 'contents' };
    if (hasClass(elm, 'epubtype_sidebar') || elmRoles.includes('complementary')) {
        return { type: 'sidebar', name: labelledName(elm) === 'sidebar' ? '' : labelledName(elm) };
    }
    if (elm.localName === 'math') return { type: 'equation', number: equationNumber(elm) || null };
    if (hasClass(elm, 'webbook-equation')) return null; // its <math> is the equation
    if (isPresentation(elm)) return null;
    if (elm.tagName === 'TABLE' || elmRoles.some(role => role === 'table' || role === 'grid')) {
        const caption = elm.tagName === 'TABLE' ? elm.querySelector(':scope > caption') : null;
        return { type: 'table', name: labelledName(elm) || plainName(caption) };
    }
    if (elm.tagName === 'FIGURE' || elmRoles.includes('figure') || hasClass(elm, 'epubtype_figure')) {
        const caption = elm.querySelector(':scope > figcaption');
        return { type: 'figure', name: labelledName(elm) || plainName(caption) };
    }
    if (elm.tagName === 'BLOCKQUOTE') return { type: 'block quotation' };
    if (['OL', 'UL', 'DL'].includes(elm.tagName) || elmRoles.includes('list')) return { type: 'list' };
    return null;
}

// The heading the element comes under: itself, or the last heading before it in the book's text
function headingFor(target, main) {
    const own = target.closest(HEADING_SELECTOR);
    if (own && main.contains(own)) return own;
    let found = null;
    for (const heading of main.querySelectorAll(HEADING_SELECTOR)) {
        if (heading.closest('.webbook')) continue;
        if (heading.compareDocumentPosition(target) & Node.DOCUMENT_POSITION_FOLLOWING) found = heading;
        else break;
    }
    return found;
}

function headingLevel(heading) {
    const level = /^H([1-6])$/.exec(heading.tagName)?.[1] ?? heading.getAttribute('aria-level');
    return level ? Number(level) : null;
}

// Structures from the innermost out, and the heading. Null when the element isn't in the book's text.
export function describeStructure(target) {
    const main = document.querySelector('main');
    if (!(target instanceof Element) || !main || !main.contains(target)) return null;
    // A reader control inside the text (a permalink, a Copy button) stands for what holds it
    let elm = target;
    while (elm !== main && elm.closest('.webbook') && main.contains(elm.closest('.webbook'))) elm = elm.parentElement;
    const structures = [];
    let item = null;
    for (let node = elm; node && node !== main; node = node.parentElement) {
        // A list item of an ordinary list: where in the list the element is
        if (node.tagName === 'LI' && !endnotesSectionItem(node) && !item) item = node;
        const kind = classify(node);
        if (!kind) continue;
        // The list that holds an endnotes section's notes is how the section is organized, not
        // a list the reader is in
        if (kind.type === 'list' && structures.at(-1)?.type === 'endnote' && structures.at(-1).element.parentElement === node) continue;
        if (kind.type === 'list' && item?.parentElement === node) {
            const items = Array.from(node.children).filter(child => child.tagName === 'LI');
            kind.item = items.indexOf(item) + 1;
            kind.items = items.length;
            item = null;
        }
        structures.push({ ...kind, element: node });
    }
    const heading = headingFor(elm, main);
    return {
        target: elm,
        structures,
        heading: heading ? { element: heading, name: plainName(heading), level: headingLevel(heading), isTarget: heading === elm || heading.contains(elm) } : null,
    };
}

const NOUNS = {
    'footnote': 'Footnote',
    'endnote': 'Endnote',
    'note': 'Note',
    'endnotes section': 'Endnotes section',
    'contents': "The book's table of contents",
    'sidebar': 'Sidebar',
    'equation': 'Equation',
    'table': 'Table',
    'figure': 'Figure',
    'block quotation': 'Block quotation',
    'list': 'List',
};

const ENCLOSING = {
    'footnote': 'a footnote',
    'endnote': 'an endnote',
    'note': 'a note',
    'endnotes section': 'the endnotes section',
    'contents': "the book's table of contents",
    'sidebar': 'a sidebar',
    'equation': 'an equation',
    'table': 'a table',
    'figure': 'a figure',
    'block quotation': 'a block quotation',
    'list': 'a list',
};

function innermostPhrase(structure) {
    let phrase = NOUNS[structure.type];
    if (structure.number != null && structure.number !== '') phrase += ` ${structure.number}`;
    if (structure.name) phrase += ` ‘${structure.name}’`;
    if (structure.item) phrase += `, item ${structure.item} of ${structure.items}`;
    return phrase;
}

function enclosingPhrase(structure) {
    if (structure.type === 'list' && structure.item) return `in list item ${structure.item} of ${structure.items}`;
    if (structure.type === 'endnote' && structure.number != null) return `in endnote ${structure.number}`;
    return `in ${ENCLOSING[structure.type]}`;
}

// A short answer, innermost first: "Endnote 4, in the endnotes section." "Table ‘Measurements’,
// in a sidebar. Under ‘Results’." "Main text. Under ‘The storm’."
export function formatStructure(description) {
    if (!description) return 'Reading position is not available.';
    const { structures, heading } = description;
    if (heading?.isTarget && !structures.length) {
        return `Heading${heading.level ? ` level ${heading.level}` : ''}, ‘${heading.name}’.`;
    }
    const parts = structures.length
        ? [innermostPhrase(structures[0]), ...structures.slice(1).map(enclosingPhrase)]
        : ['Main text'];
    let answer = `${parts.join(', ')}.`;
    if (heading?.name) answer += heading.isTarget ? ` Heading ‘${heading.name}’.` : ` Under ‘${heading.name}’.`;
    return answer;
}
