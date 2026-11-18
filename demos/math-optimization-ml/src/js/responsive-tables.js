// Converted publication tables scroll horizontally inside these wrappers. A wrapper belongs in the
// tab order only when it actually overflows; otherwise the table remains ordinary reading content.

function updateWrapper(wrapper) {
    if (!wrapper.isConnected || wrapper.clientWidth === 0) return;
    const scrolls = wrapper.scrollWidth > wrapper.clientWidth + 1;
    if (wrapper.hasAttribute('aria-label')) {
        wrapper.dataset.webbookLabel ??= wrapper.getAttribute('aria-label');
    }
    if (wrapper.hasAttribute('aria-labelledby')) {
        wrapper.dataset.webbookLabelledby ??= wrapper.getAttribute('aria-labelledby');
    }
    if (scrolls) {
        wrapper.setAttribute('role', 'region');
        wrapper.setAttribute('tabindex', '0');
        if (wrapper.dataset.webbookLabel) wrapper.setAttribute('aria-label', wrapper.dataset.webbookLabel);
        if (wrapper.dataset.webbookLabelledby) wrapper.setAttribute('aria-labelledby', wrapper.dataset.webbookLabelledby);
    } else {
        wrapper.removeAttribute('role');
        wrapper.removeAttribute('tabindex');
        wrapper.removeAttribute('aria-label');
        wrapper.removeAttribute('aria-labelledby');
    }
}

export function updateResponsiveTables() {
    document.querySelectorAll('.webbook-table-scroll').forEach(updateWrapper);
}

let observer = null;
function observeTables() {
    observer?.disconnect();
    if (typeof ResizeObserver !== 'function') return;
    observer = new ResizeObserver(entries => {
        const wrappers = new Set(entries.map(entry =>
            entry.target.matches('.webbook-table-scroll') ? entry.target : entry.target.closest('.webbook-table-scroll')));
        wrappers.forEach(wrapper => { if (wrapper) updateWrapper(wrapper); });
    });
    document.querySelectorAll('.webbook-table-scroll, .webbook-table-scroll > table').forEach(elm => observer.observe(elm));
}

function refresh() {
    observeTables();
    window.requestAnimationFrame?.(updateResponsiveTables) ?? updateResponsiveTables();
}

export function initResponsiveTables() {
    refresh();
    window.addEventListener('resize', updateResponsiveTables);
    document.addEventListener('webbook:layoutchange', updateResponsiveTables);
    document.addEventListener('webbook:pagechange', refresh);
}
