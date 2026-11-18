// Keep equation numbers beside short expressions and below ones that need the full line.
// Only an overflowing expression needs a named, keyboard-focusable scrolling region.
function updateEquation(equation) {
    const scroll = equation.querySelector(':scope > .webbook-equation-scroll');
    const number = equation.querySelector(':scope > .webbook-equation-number');
    const math = scroll?.querySelector('math');
    if (!scroll || !number || !math || !equation.clientWidth) return;
    scroll.dataset.webbookEquationLabel ??= scroll.getAttribute('aria-label') || `Equation ${number.textContent.trim()}`;
    const gap = parseFloat(getComputedStyle(equation).columnGap) || 0;
    const copy = scroll.querySelector('.webbook-copy-button');
    const needed = math.getBoundingClientRect().width + (copy?.getBoundingClientRect().width || 0) + gap * 2;
    equation.toggleAttribute('data-webbook-equation-stacked', needed + number.getBoundingClientRect().width > equation.clientWidth);
    const overflows = scroll.scrollWidth > scroll.clientWidth + 1;
    if (overflows) {
        scroll.setAttribute('role', 'region');
        scroll.setAttribute('aria-label', scroll.dataset.webbookEquationLabel);
        scroll.setAttribute('tabindex', '0');
    } else {
        scroll.removeAttribute('role');
        scroll.removeAttribute('aria-label');
        scroll.removeAttribute('tabindex');
    }
}

export function updateResponsiveEquations() {
    document.querySelectorAll('.webbook-equation').forEach(updateEquation);
    // Inline MathML wider than its line scrolls on its own (equations.css), keeping its native math
    // semantics, with a Tab stop only while it's that wide. Display equations scroll in their wrapper.
    document.querySelectorAll('main math').forEach(math => {
        if (!math.clientWidth || math.closest('table, .webbook-equation-scroll, .webbook-copy-source')) return;
        const attribute = 'data-webbook-math-tabindex';
        const wide = math.scrollWidth > math.clientWidth + 1;
        math.toggleAttribute('data-webbook-math-wide', wide);
        if (wide && math.tabIndex < 0) {
            if (!math.hasAttribute(attribute)) math.setAttribute(attribute, math.getAttribute('tabindex') ?? '');
            math.setAttribute('tabindex', '0');
        } else if (!wide && math.hasAttribute(attribute)) {
            const previous = math.getAttribute(attribute);
            if (previous) math.setAttribute('tabindex', previous);
            else math.removeAttribute('tabindex');
            math.removeAttribute(attribute);
        }
    });
}

let observer;
function refresh() {
    observer?.disconnect();
    if (typeof ResizeObserver === 'function') {
        observer = new ResizeObserver(updateResponsiveEquations);
        document.querySelectorAll('.webbook-equation, main math').forEach(element => observer.observe(element));
    }
    updateResponsiveEquations();
}

export function initResponsiveEquations() {
    refresh();
    window.addEventListener('resize', updateResponsiveEquations);
    document.addEventListener('webbook:layoutchange', updateResponsiveEquations);
    document.addEventListener('webbook:pagechange', refresh);
    document.addEventListener('webbook:playerready', refresh);
}
