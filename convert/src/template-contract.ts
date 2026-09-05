const REQUIRED_SELECTORS = [
    'html',
    'head title',
    'meta[name="webbook-book-id"]',
    'main',
    '#webbook-toc-nav',
    '#webbook-cover-link',
    '#webbook-spine-nav',
    '#webbook-previous-document',
    '#webbook-next-document',
    'audio',
    '#webbook-audio-controls',
    'datalist#pages',
    '#webbook-info',
    '#webbook-info dl',
    'img#webbook-cover'
] as const;

function validateTemplateContract(doc: Document): void {
    const missing = REQUIRED_SELECTORS.filter(selector => !doc.querySelector(selector));
    if (missing.length > 0) {
        throw new Error(`Template is missing required converter hook(s): ${missing.join(', ')}`);
    }
}

export {
    REQUIRED_SELECTORS,
    validateTemplateContract
};
