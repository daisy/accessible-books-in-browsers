// UI contract version this converter generates. See contracts/v0.md.
const TEMPLATE_CONTRACT_VERSION = '0';

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

    const contract = doc.documentElement.getAttribute('data-webbook-contract');
    if (contract !== TEMPLATE_CONTRACT_VERSION) {
        throw new Error(`Template declares UI contract ${JSON.stringify(contract)}; this converter generates contract ${JSON.stringify(TEMPLATE_CONTRACT_VERSION)}`);
    }
}

export {
    REQUIRED_SELECTORS,
    TEMPLATE_CONTRACT_VERSION,
    validateTemplateContract
};
