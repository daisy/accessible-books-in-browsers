import { announceReaderAction, registerAction } from './reader-actions.js';
import { lastNarratedElement } from './narration-position.js';
import { cacheCueElements } from './cue-selector.js';
import { pageAudio } from './dom-utils.js';
import { appendSetting } from './settings-sections.js';
import { optionElement, writeSetting } from './stored-settings.js';
import { COPY_MATH_FORMAT_KEY, copyMathFormat, mathAtNode, mathMLSource, mathPlainText,
    mathSelectionFragment, readySelectionPayload, selectionHTML, selectionPayload, cleanCopyMarkup } from './copy-math.js';

const initialized = new WeakSet();

export function clipboardAvailable() {
    return Boolean(window.isSecureContext && (navigator.clipboard?.writeText || navigator.clipboard?.write));
}

function selectedRange() {
    const selection = window.getSelection();
    if (!selection?.rangeCount) return null;
    const range = selection.getRangeAt(0);
    const main = document.querySelector('main');
    return main?.contains(range.startContainer) && main.contains(range.endContainer) ? range.cloneRange() : null;
}

function codeHere(range = selectedRange(), focus = document.activeElement) {
    const start = range?.startContainer;
    const element = start?.nodeType === 1 ? start : start?.parentElement;
    return element?.closest('pre') ?? focus?.closest('pre') ?? null;
}

export function equationHere(range = selectedRange(), focus = document.activeElement, narrated = lastNarratedElement()) {
    const start = range?.startContainer;
    const atStart = mathAtNode(start) || (start?.nodeType === 1 ? mathAtNode(start.childNodes[range.startOffset]) : null);
    if (atStart && document.querySelector('main')?.contains(atStart)) return { math: atStart, count: 1 };
    const focused = mathAtNode(focus);
    if (focused && document.querySelector('main')?.contains(focused)) return { math: focused, count: 1 };
    const equations = narrated?.matches('math') ? [narrated] : Array.from(narrated?.querySelectorAll('math') ?? []);
    return { math: equations[0] ?? null, count: equations.length };
}

// Start the write in the user gesture, even when the first copy still needs to fetch its converter.
// Safari accepts promised Blob contents, but doesn't keep that gesture across an awaited import.
function writeRichClipboard(html, plain) {
    const Item = window.ClipboardItem;
    if (Item && navigator.clipboard?.write) {
        return navigator.clipboard.write([new Item({
            'text/html': new Blob([html], { type: 'text/html' }),
            'text/plain': Promise.resolve(plain).then(text => new Blob([text], { type: 'text/plain' }))
        })]);
    }
    return Promise.resolve(plain).then(text => navigator.clipboard.writeText(text));
}

export async function copyEquation(target = equationHere()) {
    if (!target.math) { announceReaderAction('No equation here.'); return; }
    const math = target.math.cloneNode(true);
    const plain = mathPlainText(math);
    try {
        await writeRichClipboard(mathMLSource(math), plain.then(result => result.text));
        const result = await plain;
        const first = target.count > 1 ? `. Copied the first of ${target.count} equations in the narrated phrase` : '';
        announceReaderAction(`Equation copied as ${result.format}${first}`);
    } catch { announceReaderAction('Could not copy the equation. Check clipboard permission and try again.'); }
}

export async function copyCode(pre) {
    if (!pre) { announceReaderAction('No code block here.'); return; }
    try {
        const text = pre.textContent;
        if (navigator.clipboard.writeText) await navigator.clipboard.writeText(text);
        else await navigator.clipboard.write([new window.ClipboardItem({ 'text/plain': new Blob([text], { type: 'text/plain' }) })]);
        announceReaderAction('Code copied');
    } catch { announceReaderAction('Could not copy the code. Check clipboard permission and try again.'); }
}

async function copySelection(range = selectedRange()) {
    if (!range || range.collapsed) { announceReaderAction('No selection.'); return; }
    const fragment = mathSelectionFragment(range);
    const payload = fragment ? selectionPayload(fragment) : Promise.resolve({
        html: selectionHTML(cleanCopyMarkup(range.cloneContents())), plain: range.toString()
    });
    try {
        const html = fragment ? selectionHTML(fragment) : selectionHTML(cleanCopyMarkup(range.cloneContents()));
        await writeRichClipboard(html, payload.then(result => result.plain));
        const result = await payload;
        announceReaderAction(result.fallback ? 'Selection copied. Some equations were copied as MathML.' : 'Selection copied');
    } catch { announceReaderAction('Could not copy the selection. Check clipboard permission and try again.'); }
}

export function handleMathCopy(event) {
    if (event.defaultPrevented || !clipboardAvailable() || event.target?.closest?.('input, textarea, [contenteditable="true"]')) return;
    const fragment = mathSelectionFragment(selectedRange());
    if (!fragment) return; // Ordinary text and code retain the browser's Copy behavior.
    event.preventDefault();
    const ready = readySelectionPayload(fragment);
    if (ready && event.clipboardData) {
        event.clipboardData.setData('text/html', ready.html);
        event.clipboardData.setData('text/plain', ready.plain);
        announceReaderAction(ready.fallback ? 'Selection copied. Some equations were copied as MathML.' : 'Selection copied');
        return;
    }
    // clipboardData must be filled synchronously. Keep complete MathML as a fallback if the
    // first asynchronous LaTeX copy is refused, then replace it with the resolved rich payload.
    const fallback = readySelectionPayload(fragment, 'mathml');
    if (event.clipboardData) {
        event.clipboardData.setData('text/html', fallback.html);
        event.clipboardData.setData('text/plain', fallback.plain);
    }
    const payload = selectionPayload(fragment);
    writeRichClipboard(fallback.html, payload.then(result => result.plain)).then(async () => {
        const result = await payload;
        announceReaderAction(result.fallback ? 'Selection copied. Some equations were copied as MathML.' : 'Selection copied');
    }).catch(() => announceReaderAction(event.clipboardData
        ? 'Selection copied as MathML. Clipboard permission is needed to copy it as LaTeX.'
        : 'Could not copy the selection. Check clipboard permission and try again.'));
}

export function equationButtonName(math) {
    const host = math.closest('.disp-formula, figure, .equation');
    const label = host?.querySelector('.label, .eqno, .equation-number, figcaption')?.textContent.trim();
    return label && label.length < 80 ? `Copy equation ${label.replace(/^\((.*)\)$/, '$1')}` : 'Copy equation';
}

export function isDisplayEquation(math) {
    if (math.getAttribute('display') === 'block' || math.closest('.disp-formula')) return true;
    const block = math.closest('p, div, figure, li, td, main');
    if (!block || block.querySelectorAll('math').length !== 1) return false;
    const clone = block.cloneNode(true);
    clone.querySelectorAll('math, [data-webbook-copy-control]').forEach(element => element.remove());
    return !clone.textContent.trim() && !clone.querySelector('img, svg, video, audio, pre');
}

function buildSetting() {
    if (document.getElementById('webbook-copy-math-options')) return;
    const row = document.createElement('div');
    row.id = 'webbook-copy-math';
    const label = document.createElement('label');
    label.htmlFor = 'webbook-copy-math-options';
    label.textContent = 'Copy equations as';
    const select = document.createElement('select');
    select.id = label.htmlFor;
    select.append(optionElement('latex', 'LaTeX'), optionElement('mathml', 'MathML'));
    select.value = copyMathFormat();
    select.addEventListener('change', () => writeSetting(COPY_MATH_FORMAT_KEY, select.value));
    row.append(label, select);
    appendSetting('text', row);
}

function copyButton(label, run) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'webbook-copy-button webbook';
    button.dataset.webbookCopyControl = '';
    // The visible word comes from CSS so a narrated paragraph's textContent (captions, reading
    // tools) keeps only the publication's words. The button has its own accessible name.
    button.setAttribute('aria-label', label);
    button.addEventListener('click', run);
    return button;
}

function updateCopyScroll() {
    for (const source of document.querySelectorAll('main .webbook-copy-source, main .webbook-copy-code pre')) {
        if (!source.clientWidth) continue;
        const scrolls = source.scrollWidth > source.clientWidth + 1;
        if (scrolls && source.tabIndex < 0) {
            source.dataset.webbookCopyScroll = source.getAttribute('tabindex') ?? '';
            source.tabIndex = 0;
        } else if (!scrolls && source.hasAttribute('data-webbook-copy-scroll')) {
            const previous = source.dataset.webbookCopyScroll;
            if (previous) source.setAttribute('tabindex', previous);
            else source.removeAttribute('tabindex');
            delete source.dataset.webbookCopyScroll;
        }
    }
}

export function enhanceCopyContent() {
    const main = document.querySelector('main');
    if (!main || !clipboardAvailable()) return;
    const audio = pageAudio();
    const track = audio?.querySelector('track');
    const hasSource = audio && (audio.getAttribute('src') || audio.querySelector('source[src]'));
    // Wrapping changes child paths. Resolve narration cues before any changes inside main.
    if (hasSource && track && track.readyState < 2) return;
    cacheCueElements(track?.track ?? audio?.textTracks?.[0]);
    for (const math of main.querySelectorAll('math')) {
        if (!math.hasAttribute('tabindex')) {
            math.setAttribute('tabindex', '-1'); // Screen reader focus, without extra Tab stops.
            math.setAttribute('data-webbook-copy-focus', '');
        }
        if (!isDisplayEquation(math) || math.closest('[data-webbook-copy-unit]')) continue;
        const label = equationButtonName(math);
        const unit = document.createElement('span');
        unit.className = 'webbook-copy-unit';
        unit.dataset.webbookCopyUnit = '';
        const source = document.createElement('span');
        source.className = 'webbook-copy-source';
        math.before(unit);
        source.append(math);
        unit.append(source, copyButton(label, () => copyEquation({ math, count: 1 })));
    }
    for (const pre of main.querySelectorAll('pre')) {
        if (pre.closest('[data-webbook-copy-unit]')) continue;
        const unit = document.createElement('div');
        unit.className = 'webbook-copy-unit webbook-copy-code';
        unit.dataset.webbookCopyUnit = '';
        pre.before(unit);
        unit.append(pre, copyButton('Copy code', () => copyCode(pre)));
    }
    updateCopyScroll();
}

export function initCopyContent() {
    if (initialized.has(document)) return;
    initialized.add(document);
    buildSetting();
    let context = null;
    let contentFocus = null;
    document.addEventListener('focusin', event => {
        if (document.querySelector('main')?.contains(event.target)) contentFocus = event.target;
    });
    const button = document.createElement('button');
    button.id = 'webbook-copy-open';
    button.type = 'button';
    button.textContent = 'Copy';
    button.setAttribute('aria-haspopup', 'dialog');
    button.setAttribute('aria-controls', 'webbook-copy');
    const panel = document.createElement('section');
    panel.id = 'webbook-copy';
    panel.className = 'webbook';
    panel.setAttribute('popover', 'auto');
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-labelledby', 'webbook-copy-heading');
    const heading = document.createElement('h2');
    heading.id = 'webbook-copy-heading';
    heading.textContent = 'Copy';
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'webbook-popover-close';
    close.setAttribute('aria-label', 'Close copy');
    close.textContent = '×';
    const dismiss = () => { panel.hidePopover?.(); button.focus({ preventScroll: true }); };
    close.addEventListener('click', dismiss);
    panel.append(heading, close);
    const remember = () => {
        const range = selectedRange();
        const focus = document.querySelector('main')?.contains(document.activeElement) ? document.activeElement : contentFocus;
        context = { range, equation: equationHere(range, focus), pre: codeHere(range, focus) };
    };
    button.addEventListener('pointerdown', remember);
    const open = () => {
        if (!context) remember();
        panel.showPopover?.();
        panel.querySelector('button:not(.webbook-popover-close)')?.focus();
    };
    button.addEventListener('click', open);
    panel.addEventListener('toggle', event => { if (event.newState === 'closed') context = null; });
    const commands = [
        ['copy-equation', 'Copy equation', () => copyEquation(context?.equation ?? equationHere())],
        ['copy-selection', 'Copy selection', () => copySelection(context?.range ?? selectedRange())],
        ['copy-code', 'Copy code', () => copyCode(context?.pre ?? codeHere())]
    ];
    for (const [id, label, run] of commands) {
        const control = document.createElement('button');
        control.type = 'button';
        control.textContent = label;
        control.addEventListener('click', () => { run(); dismiss(); });
        panel.append(control);
        registerAction({ id, label, group: 'Reading', isAvailable: clipboardAvailable, run });
    }
    registerAction({ id: 'open-copy-menu', label: 'Copy menu', group: 'Panels', isAvailable: () => !button.hidden,
        run: () => { remember(); open(); } });
    document.getElementById('webbook-top-toolbar')?.append(button);
    document.body.append(panel);
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(updateCopyScroll) : null;
    const refresh = () => {
        context = null;
        contentFocus = null;
        enhanceCopyContent();
        observer?.disconnect();
        document.querySelectorAll('main .webbook-copy-source, main .webbook-copy-code pre').forEach(source => observer?.observe(source));
        button.hidden = !clipboardAvailable() || !document.querySelector('main math, main pre');
    };
    refresh();
    document.addEventListener('webbook:pagechange', refresh);
    document.addEventListener('webbook:playerready', refresh);
    document.addEventListener('copy', handleMathCopy);
    window.addEventListener('resize', updateCopyScroll);
    document.addEventListener('webbook:layoutchange', updateCopyScroll);
}
