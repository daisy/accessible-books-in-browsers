const WEBBOOK_POPOVER_IDS = ['webbook-toc-nav', 'webbook-menu', 'webbook-settings', 'webbook-info', 'webbook-search'];
const POPOVER_CLOSE_LABELS = {
    'webbook-toc-nav': 'Close table of contents',
    'webbook-menu': 'Close go to page',
    'webbook-settings': 'Close settings',
    'webbook-info': 'Close about',
    'webbook-search': 'Close search'
};
const CLOSE_SVG = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M5.293 5.293a1 1 0 0 1 1.414 0L12 10.586l5.293-5.293a1 1 0 1 1 1.414 1.414L13.414 12l5.293 5.293a1 1 0 0 1-1.414 1.414L12 13.414l-5.293 5.293a1 1 0 0 1-1.414-1.414L10.586 12 5.293 6.707a1 1 0 0 1 0-1.414Z"/></svg>';

export function initPopoverCloseButtons() {
    WEBBOOK_POPOVER_IDS.forEach(id => {
        const popover = document.querySelector(`#${id}`);
        if (!popover || popover.querySelector('.webbook-popover-close')) return;

        const closeButton = document.createElement('button');
        closeButton.type = 'button';
        closeButton.className = 'webbook-popover-close';
        closeButton.title = 'Close';
        closeButton.setAttribute('aria-label', POPOVER_CLOSE_LABELS[id] || 'Close');
        closeButton.setAttribute('popovertarget', id);
        closeButton.setAttribute('popovertargetaction', 'hide');
        closeButton.innerHTML = CLOSE_SVG;
        closeButton.addEventListener('click', () => popover.hidePopover?.());
        popover.prepend(closeButton);
    });
}

function focusInitialPopoverControl(popover, id) {
    const preferredSelectors = {
        'webbook-menu': '#goto-page',
        'webbook-search': '#webbook-search-input'
    };
    const preferredSelector = preferredSelectors[id];
    const preferred = preferredSelector ? popover.querySelector(preferredSelector) : null;
    const firstFocusable = preferred || popover.querySelector('a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (firstFocusable) firstFocusable.focus();
}

// Track open state on toolbar buttons when their popovers toggle
export function initPopoverToggleTracking() {
    WEBBOOK_POPOVER_IDS.forEach(id => {
        const popover = document.querySelector(`#${id}`);
        if (!popover) return;
        popover.addEventListener('toggle', e => {
            const btn = document.querySelector(`button[popovertarget="${id}"]:not(.webbook-popover-close)`);
            if (!btn) return;
            if (e.newState === 'open') {
                btn.classList.add('open');
                if (id === 'webbook-toc-nav') {
                    const current = popover.querySelector('a[aria-current="page"]');
                    if (current) { current.scrollIntoView(); current.focus(); }
                } else if (id === 'webbook-info') {
                    const tocLinks = Array.from(document.querySelectorAll('#webbook-cover-link, #webbook-toc-nav ol a'));
                    const currentIdx = tocLinks.findIndex(a => a.getAttribute('aria-current') === 'page');
                    const total = tocLinks.length;
                    const pageLabel = document.querySelector('#webbook-current-page-label');
                    const progressBar = document.querySelector('#webbook-reading-progress');
                    const countLabel = document.querySelector('#webbook-progress-count');
                    if (pageLabel) pageLabel.textContent = currentIdx >= 0 ? tocLinks[currentIdx].textContent.trim() : '';
                    if (progressBar && total > 0) progressBar.value = currentIdx >= 0 ? Math.round((currentIdx + 1) / total * 100) : 0;
                    if (countLabel && total > 0) countLabel.textContent = currentIdx >= 0 ? `${currentIdx + 1} of ${total}` : '';
                    focusInitialPopoverControl(popover, id);
                } else {
                    focusInitialPopoverControl(popover, id);
                }
            } else {
                btn.classList.remove('open');
            }
        });
    });
}
