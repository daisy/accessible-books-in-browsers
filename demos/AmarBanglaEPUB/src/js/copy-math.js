// Math is copied as MathML HTML and either LaTeX or MathML text. Conversion is reader-side and
// lazy: no TeX or new text alternatives are written into the publication.
import { readSetting } from './stored-settings.js';

// Saved preferences must also be listed in settings-file.js (export, import and reset).
export const COPY_MATH_FORMAT_KEY = 'webbook-copy-math-format';
let converter = null;
let loading = null;

export function copyMathFormat() {
    return readSetting(COPY_MATH_FORMAT_KEY) === 'mathml' ? 'mathml' : 'latex';
}

export function loadMathConverter() {
    return loading ??= import('./vendor/mathml-to-latex.js').then(module => {
        converter = mathml => module.MathMLToLaTeX.convert(mathml);
        return converter;
    }).catch(error => {
        loading = null; // A later copy can retry after a failed fetch.
        throw error;
    });
}

export function mathAtNode(node) {
    const element = node?.nodeType === 1 ? node : node?.parentElement;
    return element?.closest('math') ?? null;
}

// Used for both standalone equations and selections. Keep publication semantics and ids while
// stripping the reader's focus hooks, classes and controls from the clipboard representation.
export function cleanCopyMarkup(root) {
    root.querySelectorAll('[data-webbook-copy-control]').forEach(element => element.remove());
    const elements = root.nodeType === 1 ? [root, ...root.querySelectorAll('*')] : root.querySelectorAll('*');
    for (const element of elements) {
        for (const attribute of Array.from(element.attributes)) {
            if (attribute.name === 'tabindex' || attribute.name.startsWith('data-webbook-')) element.removeAttribute(attribute.name);
        }
        const classes = Array.from(element.classList).filter(name => !name.startsWith('webbook-'));
        if (classes.length) element.setAttribute('class', classes.join(' '));
        else element.removeAttribute('class');
        if (element.localName === 'math' && !element.getAttribute('alttext')?.trim()) element.removeAttribute('alttext');
    }
    return root;
}

export function mathMLSource(math) {
    const clone = cleanCopyMarkup(math.cloneNode(true));
    const Serializer = math.ownerDocument.defaultView.XMLSerializer;
    return new Serializer().serializeToString(clone);
}

function mathMLForConversion(math) {
    const clone = math.cloneNode(true);
    // MathML's empty fence is invisible. TeX needs a dot for that delimiter; otherwise the
    // converter emits a bare \right/\left followed by the next command (e.g. \end{matrix}).
    for (const fence of clone.querySelectorAll('mfenced')) {
        for (const side of ['open', 'close']) {
            if (fence.hasAttribute(side) && fence.getAttribute(side) === '') fence.setAttribute(side, '.');
        }
    }
    return mathMLSource(clone);
}

// A ready result lets the native copy event set clipboardData synchronously after the first
// conversion. Annotation and alttext copies don't need the converter at all.
export function readyMathText(math, format = copyMathFormat(), convert = converter) {
    const source = () => ({ text: mathMLSource(math), format: 'MathML' });
    if (format === 'mathml') return source();
    const annotation = Array.from(math.querySelectorAll('annotation')).find(element =>
        element.getAttribute('encoding')?.toLowerCase() === 'application/x-tex' && element.textContent.trim());
    const supplied = annotation?.textContent.trim() || math.getAttribute('alttext')?.trim();
    if (supplied) return { text: supplied, format: 'LaTeX' };
    if (!convert) return null;
    try {
        const text = convert(mathMLForConversion(math));
        if (typeof text === 'string' && text.trim()) return { text: text.trim(), format: 'LaTeX' };
    } catch { /* Preserve the complete expression when conversion doesn't support it. */ }
    return source();
}

export async function mathPlainText(math, format = copyMathFormat(), convert) {
    const ready = readyMathText(math, format, convert);
    if (ready) return ready;
    try { return readyMathText(math, format, await loadMathConverter()); }
    catch { return { text: mathMLSource(math), format: 'MathML' }; }
}

// Partial selections within an equation expand only the cloned range, leaving the reader's
// actual selection alone. Its MathML must stay whole, even when a selection ends in a fraction.
export function mathSelectionFragment(range) {
    if (!range || range.collapsed) return null;
    const expanded = range.cloneRange();
    const start = mathAtNode(expanded.startContainer);
    const end = mathAtNode(expanded.endContainer);
    if (start) expanded.setStartBefore(start);
    if (end) expanded.setEndAfter(end);
    const fragment = cleanCopyMarkup(expanded.cloneContents());
    return fragment.querySelector('math') ? fragment : null;
}

export function selectionHTML(fragment) {
    const container = fragment.ownerDocument.createElement('div');
    container.append(fragment.cloneNode(true));
    for (const math of container.querySelectorAll('math')) math.setAttribute('xmlns', 'http://www.w3.org/1998/Math/MathML');
    return container.innerHTML;
}

function selectionText(fragment, results) {
    const plain = fragment.cloneNode(true);
    Array.from(plain.querySelectorAll('math')).forEach((math, index) => {
        const result = results[index];
        const text = result.format === 'LaTeX' ? `$${result.text.replace(/^\$\$?([\s\S]*?)\$\$?$/, '$1')}$` : result.text;
        math.replaceWith(plain.ownerDocument.createTextNode(text));
    });
    // Preserve ordinary block boundaries as well as explicit breaks and preformatted whitespace.
    const text = node => {
        if (node.nodeType === 3) return node.textContent;
        if (node.nodeName === 'BR') return '\n';
        const content = Array.from(node.childNodes, text).join('');
        return /^(P|DIV|PRE|LI|H[1-6]|TR)$/.test(node.nodeName) ? content + '\n' : content;
    };
    return text(plain).replace(/\n$/, '');
}

export function readySelectionPayload(fragment, format = copyMathFormat()) {
    const results = Array.from(fragment.querySelectorAll('math'), math => readyMathText(math, format));
    if (results.some(result => !result)) return null;
    return { html: selectionHTML(fragment), plain: selectionText(fragment, results),
        fallback: results.some(result => result.format === 'MathML') && format !== 'mathml' };
}

export async function selectionPayload(fragment, format = copyMathFormat()) {
    const results = await Promise.all(Array.from(fragment.querySelectorAll('math'), math => mathPlainText(math, format)));
    return { html: selectionHTML(fragment), plain: selectionText(fragment, results),
        fallback: results.some(result => result.format === 'MathML') && format !== 'mathml' };
}
