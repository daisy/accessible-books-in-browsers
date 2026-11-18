import { JSDOM } from 'jsdom';

export type BookDelivery = {
    channel?: string;
    source: string;
    identifier: string;
    converter: string;
    bootstrap: string;
    page: string;
    metadataXml?: string;
    navigation?: boolean;
};
const baseline = `html:not(.webbook-js) body{display:block}html:not(.webbook-js) #webbook-basic-nav{display:flex!important;flex-wrap:wrap;gap:1rem;padding:1rem}html:not(.webbook-js) #webbook-spine-nav{display:none}html:not(.webbook-js) #webbook-toolbar{position:static;display:block!important;padding:1rem;background:transparent}html:not(.webbook-js) #webbook-toolbar audio{display:block!important;width:min(100%,40rem)}html:not(.webbook-js) main{padding:1rem;max-width:65ch;margin:auto}html:not(.webbook-js) #webbook-escape-container{display:none}html:not(.webbook-js) #webbook-skip-link{position:static}html:not(.webbook-js) :target{outline:2px solid currentColor;outline-offset:3px}@media(prefers-color-scheme:dark){html:not(.webbook-js):not(.webbook-light){--theme-bg:#111;--theme-fg:#fff;color-scheme:dark}}`;

export function shapeBookPage(
    html: string,
    delivery: BookDelivery,
): { html: string; navigation: Record<string, string> } {
    const doc = new JSDOM(html).window.document;
    const navigation: Record<string, string> = {};
    const main = doc.querySelector('main')!;
    const hasPages = Boolean(doc.querySelector('datalist#pages option'));
    const tocTarget = doc.querySelector('#webbook-toc-nav [aria-current="page"]')?.closest('li')?.id;
    const basic = doc.querySelector('#webbook-basic-nav')!;
    basic.replaceChildren();
    const link = (label: string, href: string) => {
        const a = doc.createElement('a');
        a.textContent = label;
        a.href = href;
        basic.append(a);
        return a;
    };
    link('Contents', 'toc.html' + (tocTarget ? '#' + tocTarget : ''));
    if (hasPages) link('Go to page', 'pages.html');
    link('About', 'about.html');
    for (const relation of ['prev', 'next']) {
        const old = doc.querySelector(`#webbook-spine-nav a[rel="${relation}"][href]`);
        if (old) {
            const a = link(relation === 'prev' ? 'Previous' : 'Next', old.getAttribute('href')!);
            a.rel = relation;
            a.id = relation === 'prev' ? 'webbook-basic-previous' : 'webbook-basic-next';
        }
    }
    const source = doc.createElement('meta');
    source.name = 'webbook-source';
    source.content = JSON.stringify({
        file: delivery.source,
        identifier: delivery.identifier,
        converter: delivery.converter,
    });
    doc.head.append(source);
    if (delivery.channel) {
        const channel = doc.createElement('meta');
        channel.name = 'webbook-ui-channel';
        channel.content = delivery.channel;
        doc.head.append(channel);
        const preconnect = doc.createElement('link');
        preconnect.rel = 'preconnect';
        preconnect.href = new URL(delivery.channel).origin;
        preconnect.crossOrigin = 'anonymous';
        doc.head.append(preconnect);
        const referrer = doc.createElement('meta');
        referrer.name = 'referrer';
        referrer.content = 'no-referrer';
        doc.head.append(referrer);
    }
    const localStyle = doc.querySelector('link[rel="stylesheet"]:not([data-webbook-publisher-style])');
    localStyle?.setAttribute('data-webbook-local-style', '');
    const style = doc.createElement('style');
    style.setAttribute('data-webbook-baseline', '');
    style.textContent = baseline;
    doc.head.append(style);
    // Navigation documents are plain standalone pages, never popovers or script containers.
    const makeNav = (filename: string, title: string, content: Element[]) => {
        const navdoc = doc.cloneNode(true) as Document;
        navdoc
            .querySelectorAll('script, link[data-webbook-publisher-style]')
            .forEach((node) => node.remove());
        navdoc.documentElement.className = '';
        navdoc.documentElement.setAttribute('data-webbook-navigation', '');
        const navmain = navdoc.createElement('main');
        navmain.id = 'webbook-main';
        const heading = navdoc.createElement('h1');
        heading.textContent = title;
        navmain.append(heading);
        for (const node of content) if (node) navmain.append(navdoc.importNode(node, true));
        navmain.querySelectorAll('[aria-current]').forEach((node) => node.removeAttribute('aria-current'));
        navmain.querySelectorAll('button, script, [popover]').forEach((node) => node.remove());
        const home = navdoc.createElement('a');
        home.href = 'index.html';
        home.textContent = 'Back to book';
        const nav = navdoc.createElement('nav');
        nav.setAttribute('aria-label', 'Book');
        nav.append(home);
        navdoc.body.replaceChildren(nav, navmain);
        navdoc.querySelector('title')!.textContent = title + ' — ' + doc.querySelector('title')!.textContent;
        navigation[filename] = '<!DOCTYPE html>\n' + navdoc.documentElement.outerHTML;
    };
    if (delivery.navigation !== false) {
    makeNav('toc.html', 'Contents', [
        doc.querySelector('#webbook-cover-link')!,
        ...[...doc.querySelectorAll('#webbook-toc-nav ol:first-of-type')].slice(0, 1),
    ]);
    makeNav('about.html', 'About', [
        ...doc.querySelectorAll(
            '#webbook-info #webbook-cover, #webbook-info .webbook-info-body > :not(h2):not(#webbook-progress)',
        ),
    ]);
    if (delivery.metadataXml) {
        const about = new JSDOM(navigation['about.html']).window.document;
        const section = about.createElement('section');
        section.id = 'webbook-source-metadata';
        const heading = about.createElement('h2');
        heading.textContent = 'Source EPUB';
        section.append(heading);
        const provenance = about.createElement('p');
        provenance.textContent = `${delivery.source}; identifier: ${delivery.identifier}; converter ${delivery.converter}. Keep the source EPUB for future reconversion. The metadata below describes that EPUB.`;
        section.append(provenance);
        const metadata = new JSDOM(delivery.metadataXml, { contentType: 'application/xml' }).window.document
            .documentElement;
        const dl = about.createElement('dl');
        for (const field of Array.from(metadata.children).filter((node) => node.localName !== 'meta')) {
            const term = about.createElement('dt'),
                value = about.createElement('dd');
            const role =
                field.getAttribute('opf:role') ||
                Array.from(metadata.children).find(
                    (node) =>
                        node.getAttribute('refines') === '#' + field.id &&
                        node.getAttribute('property') === 'role',
                )?.textContent;
            term.textContent = field.localName + (role ? ` (${role})` : '');
            value.textContent = field.textContent;
            dl.append(term, value);
        }
        section.append(dl);
        const details = about.createElement('details'),
            summary = about.createElement('summary'),
            pre = about.createElement('pre');
        summary.textContent = 'Original EPUB metadata';
        pre.textContent = delivery.metadataXml;
        details.append(summary, pre);
        section.append(details);
        about.querySelector('main')!.append(section);
        navigation['about.html'] = '<!DOCTYPE html>\n' + about.documentElement.outerHTML;
    }
    if (hasPages) {
        const pages = doc.createElement('ol');
        pages.id = 'webbook-page-list';
        for (const option of doc.querySelectorAll('datalist#pages option')) {
            const li = doc.createElement('li'),
                a = doc.createElement('a');
            a.href = option.getAttribute('data-href')!;
            // The template's options carry the print page's label in value and label, not as text
            a.textContent = option.textContent?.trim() || option.getAttribute('label') || option.getAttribute('value') || '';
            li.append(a);
            pages.append(li);
        }
        makeNav('pages.html', 'Print pages', [pages]);
    }
    }
    const progress = doc.querySelector('#webbook-progress');
    const pageFile = doc.createElement('meta');
    pageFile.name = 'webbook-page-file';
    pageFile.content = delivery.page;
    doc.head.append(pageFile);
    for (const [name, value] of Object.entries({
        number: progress?.getAttribute('data-webbook-page-number'),
        count: progress?.getAttribute('data-webbook-page-count'),
        label: doc.querySelector('#webbook-current-page-label')?.textContent,
    })) {
        const meta = doc.createElement('meta');
        meta.name = 'webbook-page-' + name;
        meta.content = value || '';
        doc.head.append(meta);
    }
    const audio = doc.querySelector('#webbook-toolbar audio');
    const toolbar = doc.createElement('div');
    toolbar.id = 'webbook-toolbar';
    if (audio) {
        audio.setAttribute('controls', '');
        toolbar.append(audio);
    }
    const spine = doc.querySelector('#webbook-spine-nav')!;
    for (const a of spine.querySelectorAll('a'))
        a.textContent = a.getAttribute('rel') === 'prev' ? 'Previous' : 'Next';
    const escape = doc.querySelector('#webbook-escape-status')!,
        resume = doc.querySelector('#webbook-resume-banner')!,
        skip = doc.querySelector('#webbook-skip-link')!;
    doc.body.replaceChildren(skip, basic, main, spine, toolbar, escape, resume);
    doc.querySelectorAll('script[src]').forEach((node) => node.remove());
    doc.documentElement.setAttribute('data-webbook-shell', '1');
    // The bootstrap is kept inline so a broken local module cannot break fallback.
    const script = doc.createElement('script');
    script.textContent = delivery.bootstrap.replace(/<\/script/gi, '<\\/script');
    doc.body.append(script);
    const externalBootstrap = doc.createElement('script');
    externalBootstrap.src = 'src/js/bootstrap.js';
    externalBootstrap.defer = true;
    externalBootstrap.setAttribute('data-webbook-bootstrap', '');
    doc.head.append(externalBootstrap);
    return { html: '<!DOCTYPE html>\n' + doc.documentElement.outerHTML, navigation };
}
