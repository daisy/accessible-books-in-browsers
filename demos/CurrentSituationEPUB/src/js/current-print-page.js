import { readingPositionTest } from './popovers.js';
import { registerAction, announceReaderAction } from './reader-actions.js';

let currentLabel = '';
let updateScheduled = false;
let button = null;
let labelElement = null;
let aboutLabelElement = null;
let icon = null;
let hasPrintPages = false;
let pageListArrowIndex = null;
let pageListArrowStarted = false;

export function initCurrentPrintPage() {
    hasPrintPages = Boolean(document.querySelector('datalist#pages'));
    button = document.querySelector('button[popovertarget="webbook-menu"]');
    if (button) {
        icon = button.querySelector('svg');
        labelElement = document.createElement('span');
        labelElement.id = 'webbook-current-print-page';
        labelElement.hidden = true;
        button.prepend(labelElement);
    }
    if (hasPrintPages) {
        const progress = document.querySelector('#webbook-progress');
        const progressBar = progress?.querySelector('#webbook-reading-progress');
        if (progress && progressBar) {
            aboutLabelElement = document.createElement('p');
            aboutLabelElement.id = 'webbook-about-print-page';
            aboutLabelElement.hidden = true;
            progressBar.before(aboutLabelElement);
        }
        const pageInput = document.querySelector('#goto-page');
        pageInput?.addEventListener('focus', resetPageListArrows);
        pageInput?.addEventListener('input', resetPageListArrows);
        pageInput?.addEventListener('keydown', handlePageListArrow);
    }

    registerAction({
        id: 'announce-print-page',
        label: 'Announce print page',
        group: 'Navigation',
        defaultKeys: [{ code: 'KeyQ', alt: true, shift: true }],
        run: () => announceReaderAction(currentLabel
            ? `Print page ${currentLabel}.`
            : hasPrintPages ? 'The current print page is not available.' : 'This book has no print page numbers.')
    });

    updateCurrentPrintPage();
    document.addEventListener('webbook:narrationpositionchange', updateCurrentPrintPage);
    document.addEventListener('webbook:pagechange', updateCurrentPrintPage);
    window.addEventListener('scroll', scheduleScrollUpdate, { passive: true });
}

function scheduleScrollUpdate() {
    const audio = document.querySelector('audio');
    if (audio && !audio.paused && !audio.ended) return;
    if (updateScheduled) return;
    updateScheduled = true;
    requestAnimationFrame(() => {
        updateScheduled = false;
        updateCurrentPrintPage();
    });
}

function updateCurrentPrintPage() {
    const main = document.querySelector('main');
    const pagebreaks = Array.from(main?.querySelectorAll('[role="doc-pagebreak"], .epubtype_pagebreak') ?? []);
    const isReached = readingPositionTest();
    let label = main?.dataset.webbookPrintPageBefore?.trim() ?? '';
    for (const pagebreak of pagebreaks) {
        if (isReached(pagebreak)) label = printPageLabel(pagebreak);
    }
    currentLabel = label;
    updateButton();
}

function printPageLabel(pagebreak) {
    const ariaLabel = pagebreak.getAttribute('aria-label')?.trim() ?? '';
    const text = pagebreak.textContent?.trim() ?? '';
    return (ariaLabel || text).replace(/^Page\s+/i, '');
}

function updateButton() {
    if (aboutLabelElement) {
        aboutLabelElement.textContent = currentLabel ? `Print page ${currentLabel}` : '';
        aboutLabelElement.hidden = !currentLabel;
    }
    if (!button || !labelElement) return;
    if (currentLabel) {
        labelElement.textContent = `Page ${currentLabel}`;
        labelElement.hidden = false;
        if (icon) icon.hidden = true;
        button.title = `Print page ${currentLabel}; go to page`;
        button.setAttribute('aria-label', `Print page ${currentLabel}, go to page`);
    } else {
        labelElement.textContent = '';
        labelElement.hidden = true;
        if (icon) icon.hidden = false;
        button.title = 'Go to page';
        button.setAttribute('aria-label', 'Go to page');
    }
}

function resetPageListArrows() {
    const datalist = document.querySelector('datalist#pages');
    pageListArrowIndex = Array.from(datalist?.options ?? [])
        .findIndex(option => option.value === currentLabel || option.label === currentLabel);
    pageListArrowStarted = false;
}

function handlePageListArrow(event) {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    const datalist = document.querySelector('datalist#pages');
    const options = Array.from(datalist?.options ?? []);
    if (!options.length || pageListArrowIndex === null || pageListArrowIndex < 0) return;
    event.preventDefault();
    if (pageListArrowStarted) {
        const delta = event.key === 'ArrowDown' ? 1 : -1;
        pageListArrowIndex = Math.max(0, Math.min(options.length - 1, pageListArrowIndex + delta));
    }
    pageListArrowStarted = true;
    event.currentTarget.value = options[pageListArrowIndex].value;
}

export { printPageLabel, updateCurrentPrintPage };
