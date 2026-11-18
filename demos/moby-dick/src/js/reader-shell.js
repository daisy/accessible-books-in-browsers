let preparation;
const navigation = new Map();
function loadNavigation(name) {
    if (!navigation.has(name))
        navigation.set(
            name,
            fetch(new URL(name, location.href), { signal: AbortSignal.timeout(3000) })
                .then((response) => {
                    if (!response.ok) throw new Error(`Could not load ${name}`);
                    return response.text();
                })
                .then((text) => new DOMParser().parseFromString(text, 'text/html')),
        );
    return navigation.get(name);
}
export async function prepareReaderShell() {
    if (
        document.querySelector('#webbook-top-toolbar') ||
        !document.documentElement.hasAttribute('data-webbook-shell')
    )
        return;
    return (preparation ??= (async () => {
        const text =
            typeof __WEBBOOK_SHELL__ !== 'undefined'
                ? __WEBBOOK_SHELL__
                : await fetch(new URL('src/reader-shell.html', location.href), {
                      signal: AbortSignal.timeout(5000),
                  }).then((response) => {
                      if (!response.ok) throw new Error('Reader controls unavailable');
                      return response.text();
                  });
        const [toc, about, pages] = await Promise.all([
            loadNavigation('toc.html').catch(() => null),
            loadNavigation('about.html').catch(() => null),
            document.querySelector('#webbook-basic-nav a[href="pages.html"]')
                ? loadNavigation('pages.html').catch(() => null)
                : null,
        ]);
        preparation = { text, toc, about, pages };
        enhanceDocument(document, preparation);
    })());
}
let shellData;
export function enhanceDocument(doc, data = shellData) {
    if (
        !data ||
        !doc.documentElement.hasAttribute('data-webbook-shell') ||
        doc.querySelector('#webbook-top-toolbar')
    )
        return;
    shellData = data;
    const fragment = doc.createElement('template');
    fragment.innerHTML = data.text;
    const spine = doc.querySelector('#webbook-spine-nav');
    const arrows = fragment.content.querySelector('#webbook-spine-nav');
    for (const [id, rel] of [
        ['webbook-previous-document', 'prev'],
        ['webbook-next-document', 'next'],
    ]) {
        const target = arrows?.querySelector('#' + id),
            source = spine?.querySelector(`a[rel="${rel}"][href]`);
        if (!target) continue;
        target.removeAttribute('href');
        target.removeAttribute('rel');
        target.hidden = !source;
        if (source) {
            target.href = source.getAttribute('href');
            target.rel = rel;
            target.setAttribute('aria-label', rel === 'prev' ? 'Previous page' : 'Next page');
        }
    }
    spine?.remove();
    const audio = doc.querySelector('#webbook-toolbar audio'),
        toolbar = doc.querySelector('#webbook-toolbar');
    const escape = doc.querySelector('#webbook-escape-status'),
        resume = doc.querySelector('#webbook-resume-banner');
    toolbar?.remove();
    doc.body.append(fragment.content);
    const top = doc.querySelector('#webbook-top-toolbar');
    if (top) doc.body.insertBefore(top, doc.querySelector('main'));
    if (audio) {
        audio.removeAttribute('controls');
        doc.querySelector('#webbook-toolbar')?.append(audio);
    }
    if (escape) doc.querySelector('#webbook-escape-container')?.prepend(escape);
    if (resume) doc.body.append(resume);
    if (data.toc) {
        const ol = data.toc.querySelector('main > ol');
        if (ol) doc.querySelector('#webbook-toc-nav ol')?.replaceWith(doc.importNode(ol, true));
        const cover = data.toc.querySelector('#webbook-cover-link');
        if (cover) doc.querySelector('#webbook-cover-link')?.replaceWith(doc.importNode(cover, true));
        for (const a of doc.querySelectorAll('#webbook-toc-nav a[href]')) {
            a.removeAttribute('aria-current');
            if (
                a.getAttribute('href')?.split('#')[0] ===
                (doc.querySelector('meta[name="webbook-page-file"]')?.content ||
                    location.pathname.split('/').pop() ||
                    'index.html')
            )
                a.setAttribute('aria-current', 'page');
        }
    }
    if (data.about) {
        const body = doc.querySelector('#webbook-info .webbook-info-body');
        for (const child of data.about.querySelectorAll('main > :not(h1):not(#webbook-cover)'))
            body?.append(doc.importNode(child, true));
        const cover = data.about.querySelector('#webbook-cover');
        if (cover)
            doc.querySelector('#webbook-info #webbook-cover')?.replaceWith(doc.importNode(cover, true));
        else doc.querySelector('#webbook-info #webbook-cover')?.setAttribute('hidden', '');
    }
    if (data.pages)
        for (const a of data.pages.querySelectorAll('#webbook-page-list a')) {
            const option = doc.createElement('option');
            option.value = a.textContent;
            option.textContent = a.textContent;
            option.dataset.href = a.getAttribute('href');
            doc.querySelector('#pages')?.append(option);
        }
    for (const [name, file] of [
        ['webbook-toc-nav', 'toc.html'],
        ['webbook-info', 'about.html'],
        ['webbook-menu', 'pages.html'],
    ]) {
        if (
            (name === 'webbook-toc-nav' && data.toc) ||
            (name === 'webbook-info' && data.about) ||
            (name === 'webbook-menu' && data.pages)
        )
            continue;
        for (const button of doc.querySelectorAll(`[popovertarget="${name}"]`)) {
            if (button.getAttribute('popovertargetaction') === 'hide') continue;
            if (name === 'webbook-menu' && !doc.querySelector('#webbook-basic-nav a[href="pages.html"]')) {
                button.hidden = true;
                continue;
            }
            const a = doc.createElement('a');
            a.className = 'webbook-ui-nav-fallback';
            a.href = file;
            a.textContent = button.getAttribute('aria-label') || file;
            button.replaceWith(a);
        }
    }
    const progress = doc.querySelector('#webbook-progress');
    if (progress) {
        const number = Number(doc.querySelector('meta[name="webbook-page-number"]')?.content),
            count = Number(doc.querySelector('meta[name="webbook-page-count"]')?.content);
        progress.dataset.webbookPageNumber = number;
        progress.dataset.webbookPageCount = count;
        progress.querySelector('#webbook-current-page-label').textContent =
            doc.querySelector('meta[name="webbook-page-label"]')?.content || '';
        const percent = count ? Math.round((number / count) * 100) : 0;
        const bar = progress.querySelector('progress');
        if (bar) {
            bar.value = percent;
            bar.setAttribute('aria-valuetext', percent + '%');
        }
        progress.querySelector('#webbook-progress-count').textContent = percent + '%';
    }
}
