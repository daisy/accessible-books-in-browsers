import { JSDOM } from 'jsdom';
import path from 'path';
import type { PageAudioAssets } from './audio.js';
import type { SiteModel, SitePage } from './model.js';
import type { TransformedContent } from './content-transform.js';
import * as fileio from './file-io.js';
import { validateTemplateContract } from './template-contract.js';

export type RenderOptions = {
    coverHref: string;
};

class TemplateRenderer {
    private readonly templateDocument: Document;

    private constructor(templateDocument: Document) {
        this.templateDocument = templateDocument;
    }

    static async load(template: string): Promise<TemplateRenderer> {
        const templateFilename = path.join(template, 'index.html');
        const templateHtml = await fileio.readToString(templateFilename);
        const dom = new JSDOM(templateHtml);
        validateTemplateContract(dom.window.document);
        return new TemplateRenderer(dom.window.document);
    }

    renderPage(
        site: SiteModel,
        page: SitePage,
        content: TransformedContent,
        audio: PageAudioAssets | null,
        options: RenderOptions
    ): string {
        const doc = this.cloneTemplateDocument();
        doc.documentElement.setAttribute('lang', site.metadata.language);
        setText(doc.querySelector('title'), page.title || content.title || site.metadata.title);
        doc.querySelector('meta[name="webbook-book-id"]')?.setAttribute('content', site.bookId);

        const main = requireElement(doc, 'main');
        main.innerHTML = content.bodyHtml;

        renderToc(doc, site, page);
        renderSpineNav(doc, site, page);
        renderAudio(doc, audio);
        renderPageList(doc, site);
        renderInfo(doc, site, options.coverHref);

        return serializeDocument(doc);
    }

    private cloneTemplateDocument(): Document {
        return this.templateDocument.cloneNode(true) as Document;
    }
}

function renderToc(doc: Document, site: SiteModel, currentPage: SitePage): void {
    const nav = requireElement(doc, '#webbook-toc-nav');
    renderCoverLink(doc, site, currentPage);

    let ol = nav.querySelector('ol');
    if (!ol) {
        ol = doc.createElement('ol');
        nav.appendChild(ol);
    }
    const tocList = ol;

    clearElement(tocList);
    const coverHref = site.pages[0]?.outputFilename;
    renderTocEntries(doc, tocList, site.toc, currentPage, coverHref, []);
}

function renderTocEntries(
    doc: Document,
    list: Element,
    entries: SiteModel['toc'],
    currentPage: SitePage,
    coverHref: string | undefined,
    position: number[]
): void {
    entries.forEach((entry, index) => {
        const itemPosition = [...position, index + 1];
        if (entry.href === coverHref) {
            renderTocEntries(doc, list, entry.children, currentPage, coverHref, itemPosition);
            return;
        }

        const li = doc.createElement('li');
        li.id = `toc-${itemPosition.join('-')}`;

        if (entry.href) {
            const link = doc.createElement('a');
            link.href = entry.href;
            link.textContent = entry.title;
            if (entry.href === currentPage.outputFilename) {
                link.setAttribute('aria-current', 'page');
            }
            li.appendChild(link);
        }
        else {
            const span = doc.createElement('span');
            span.textContent = entry.title;
            li.appendChild(span);
        }

        if (entry.children.length > 0) {
            const childList = doc.createElement('ol');
            renderTocEntries(doc, childList, entry.children, currentPage, coverHref, itemPosition);
            li.appendChild(childList);
        }

        list.appendChild(li);
    });
}

function renderCoverLink(doc: Document, site: SiteModel, currentPage: SitePage): void {
    const coverLink = requireElement(doc, '#webbook-cover-link');
    const coverPage = site.pages[0];
    if (!coverPage) {
        coverLink.remove();
        return;
    }

    coverLink.setAttribute('href', coverPage.outputFilename);
    coverLink.textContent = 'Cover';
    if (coverPage.outputFilename === currentPage.outputFilename) {
        coverLink.setAttribute('aria-current', 'page');
    }
    else {
        coverLink.removeAttribute('aria-current');
    }
}

function renderSpineNav(doc: Document, site: SiteModel, currentPage: SitePage): void {
    const previous = site.pages[currentPage.index - 1];
    const next = site.pages[currentPage.index + 1];

    renderSpineLink(doc, '#webbook-previous-document', previous, 'Previous');
    renderSpineLink(doc, '#webbook-next-document', next, 'Next');
}

function renderSpineLink(doc: Document, selector: string, target: SitePage | undefined, label: string): void {
    const link = doc.querySelector(selector);
    if (!link) return;

    if (!target) {
        link.remove();
        return;
    }

    link.removeAttribute('hidden');
    link.setAttribute('href', target.outputFilename);
    link.setAttribute('rel', label === 'Previous' ? 'prev' : 'next');
    link.setAttribute('title', `${label}: ${target.title}`);
    link.setAttribute('aria-label', `${label}: ${target.title}`);
}

function renderAudio(doc: Document, audioAssets: PageAudioAssets | null): void {
    const audio = doc.querySelector('audio');
    const controls = doc.querySelector('#webbook-audio-controls');
    if (!audioAssets) {
        audio?.remove();
        controls?.remove();
        return;
    }

    if (!audio) return;
    audio.setAttribute('src', audioAssets.audioHref);
    let track = audio.querySelector('track');
    if (!track) {
        track = doc.createElement('track');
        audio.appendChild(track);
    }

    track.setAttribute('default', '');
    track.setAttribute('kind', 'metadata');
    track.setAttribute('src', audioAssets.vttHref);
}

function renderPageList(doc: Document, site: SiteModel): void {
    const menu = doc.querySelector('#webbook-menu');
    const menuButton = doc.querySelector('button[popovertarget="webbook-menu"]');
    if (site.pageList.length === 0) {
        menu?.remove();
        menuButton?.remove();
        return;
    }

    const input = doc.querySelector('#goto-page');
    if (pageLabelsAreNumeric(site.pageList)) {
        input?.setAttribute('inputmode', 'numeric');
    }
    else {
        input?.removeAttribute('inputmode');
    }

    const datalist = requireElement(doc, 'datalist#pages');
    clearElement(datalist);

    site.pageList.forEach(entry => {
        const option = doc.createElement('option');
        option.value = entry.label;
        option.label = entry.label;
        option.dataset.href = entry.href;
        datalist.appendChild(option);
    });
}

function pageLabelsAreNumeric(pageList: SiteModel['pageList']): boolean {
    return pageList.every(entry => /^\d+$/.test(entry.label.trim()));
}

function renderInfo(doc: Document, site: SiteModel, coverHref: string): void {
    const cover = doc.querySelector('img#webbook-cover') as HTMLImageElement | null;
    if (coverHref) {
        cover?.setAttribute('src', coverHref);
        cover?.setAttribute('alt', `Cover for ${site.metadata.title}`);
        cover?.removeAttribute('aria-hidden');
        cover?.removeAttribute('hidden');
    }
    else {
        cover?.removeAttribute('src');
        cover?.setAttribute('alt', '');
        cover?.setAttribute('aria-hidden', 'true');
        cover?.setAttribute('hidden', '');
    }

    const dl = requireElement(doc, '#webbook-info dl');
    clearElement(dl);
    addMetadataRow(doc, dl, 'Title', site.metadata.title);
    addMetadataRow(doc, dl, 'Author', site.metadata.author);
    addMetadataRow(doc, dl, 'Date', site.metadata.date);
}

function addMetadataRow(doc: Document, dl: Element, label: string, value: string): void {
    if (!value) return;

    const dt = doc.createElement('dt');
    dt.textContent = label;
    const dd = doc.createElement('dd');
    dd.textContent = value;
    dl.append(dt, dd);
}

function requireElement(doc: Document, selector: string): Element {
    const elm = doc.querySelector(selector);
    if (!elm) throw new Error(`Template is missing ${selector}`);
    return elm;
}

function clearElement(elm: Element): void {
    while (elm.firstChild) {
        elm.removeChild(elm.firstChild);
    }
}

function setText(elm: Element | null, text: string): void {
    if (elm) elm.textContent = text;
}

function serializeDocument(doc: Document): string {
    return `<!DOCTYPE html>\n${doc.documentElement.outerHTML}`;
}

export { TemplateRenderer };
