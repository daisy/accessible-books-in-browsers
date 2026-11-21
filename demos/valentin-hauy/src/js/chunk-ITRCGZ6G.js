import {
  cacheCueElements,
  cueAtTime,
  cueForElement,
  cueNeedsTime,
  elmForCue
} from "./chunk-JJPBXBH7.js";

// template/src/js/reading-axis.js
var root = () => document.documentElement;
function textWritingMode() {
  const r = root();
  if (!r.classList.contains("webbook-vertical")) return "horizontal-tb";
  return r.getAttribute("data-webbook-writing-mode") === "vertical-lr" ? "vertical-lr" : "vertical-rl";
}
function isVerticalText() {
  return textWritingMode() !== "horizontal-tb";
}
function readingScroll() {
  const mode = textWritingMode();
  if (mode === "vertical-rl") return Math.max(0, -window.scrollX);
  if (mode === "vertical-lr") return Math.max(0, window.scrollX);
  return window.scrollY;
}
function scrollToReading(position, behavior = "auto") {
  const mode = textWritingMode();
  const value = Math.max(0, position);
  if (mode === "vertical-rl") window.scrollTo({ left: -value, top: 0, behavior });
  else if (mode === "vertical-lr") window.scrollTo({ left: value, top: 0, behavior });
  else window.scrollTo({ top: value, left: 0, behavior });
}
function scrollAlongText(amount, behavior = "auto") {
  scrollToReading(readingScroll() + amount, behavior);
}
function viewportLength() {
  return isVerticalText() ? window.innerWidth : window.innerHeight;
}
function readingStart(rect) {
  const mode = textWritingMode();
  if (mode === "vertical-rl") return window.innerWidth - rect.right;
  if (mode === "vertical-lr") return rect.left;
  return rect.top;
}
function readingEnd(rect) {
  const mode = textWritingMode();
  if (mode === "vertical-rl") return window.innerWidth - rect.left;
  if (mode === "vertical-lr") return rect.right;
  return rect.bottom;
}
function readingLength(rect) {
  return isVerticalText() ? rect.width : rect.height;
}

// template/src/js/reader-shell.js
var preparation;
var navigation = /* @__PURE__ */ new Map();
function loadNavigation(name) {
  if (!navigation.has(name))
    navigation.set(
      name,
      fetch(new URL(name, location.href), { signal: AbortSignal.timeout(3e3) }).then((response) => {
        if (!response.ok) throw new Error(`Could not load ${name}`);
        return response.text();
      }).then((text) => new DOMParser().parseFromString(text, "text/html"))
    );
  return navigation.get(name);
}
async function prepareReaderShell() {
  if (document.querySelector("#webbook-top-toolbar") || !document.documentElement.hasAttribute("data-webbook-shell"))
    return;
  return preparation ??= (async () => {
    const text = true ? `
    
    <!-- Basic navigation for reading without JavaScript; hidden when the reader's script runs -->
    
    <section id="webbook-top-toolbar" class="webbook" aria-label="Top toolbar">
        <button type="button" popovertarget="webbook-search" title="Search" aria-label="Search">
            <svg role="img" aria-hidden="true" width="24" height="24" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M10 2.5a7.5 7.5 0 0 1 5.964 12.048l4.743 4.745a1 1 0 0 1-1.32 1.497l-.094-.083-4.745-4.743A7.5 7.5 0 1 1 10 2.5Zm0 2a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11Z" fill="currentColor"></path></svg>
        </button>
        <button type="button" popovertarget="webbook-menu" title="Go to page" aria-label="Go to page">
            <svg role="img" aria-hidden="true" width="24" height="24" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="m11.256 13 .238-1.5h1.481l-.237 1.5h-1.482Z" fill="currentColor"></path><path d="M17.75 2.001a2.25 2.25 0 0 1 2.245 2.096L20 4.25v15.498a2.25 2.25 0 0 1-2.096 2.245l-.154.005H6.25a2.25 2.25 0 0 1-2.245-2.096L4 19.75V4.251a2.25 2.25 0 0 1 2.096-2.245l.154-.005h11.5Zm-5.355 13.16a.75.75 0 1 0 1.482.234l.142-.895h.731a.75.75 0 0 0 0-1.5h-.494l.238-1.5h.756a.75.75 0 0 0 0-1.5h-.519l.162-1.025a.75.75 0 1 0-1.481-.234l-.2 1.259h-1.48l.161-1.025a.75.75 0 1 0-1.481-.234l-.2 1.259H9.25a.75.75 0 1 0 0 1.5h.725L9.738 13H8.75a.75.75 0 1 0 0 1.5h.75l-.105.66a.75.75 0 0 0 1.482.235l.142-.895H12.5l-.105.66Z" fill="currentColor"></path></svg>
        </button>
    </section>

    

    <nav id="webbook-spine-nav" aria-label="Spine navigation">
        <a id="webbook-previous-document" hidden="">
            <svg role="img" aria-hidden="true" width="36" height="36" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M15.707 4.293a1 1 0 0 1 0 1.414L9.414 12l6.293 6.293a1 1 0 0 1-1.414 1.414l-7-7a1 1 0 0 1 0-1.414l7-7a1 1 0 0 1 1.414 0Z" fill="currentColor"></path></svg>
        </a>
        <a id="webbook-next-document" href="chapter-1.html" title="Next: Chapter 1. Flimble Sprout" aria-label="Next: Chapter 1. Flimble Sprout" class="webbook-lightup" rel="next">
            <svg role="img" aria-hidden="true" width="36" height="36" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M8.293 4.293a1 1 0 0 0 0 1.414L14.586 12l-6.293 6.293a1 1 0 1 0 1.414 1.414l7-7a1 1 0 0 0 0-1.414l-7-7a1 1 0 0 0-1.414 0Z" fill="currentColor"></path></svg>
        </a>
    </nav>

    <nav popover="" id="webbook-toc-nav" class="webbook" aria-labelledby="webbook-toc-nav-hd">
        <div id="webbook-toc-header">
            <h2 id="webbook-toc-nav-hd">Table of Contents</h2>
            <button type="button" class="webbook-basic-close" popovertarget="webbook-toc-nav" popovertargetaction="hide">Close</button>
            <a id="webbook-cover-link" href="index.html" aria-current="page">Cover</a>
        </div>
        <ol></ol>
    </nav>

    <div id="webbook-escape-container">
        
        <button type="button" id="webbook-escape-btn" hidden="" disabled="">
            Leave <span id="webbook-escape-label"></span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M5.293 5.293a1 1 0 0 1 1.414 0L12 10.586l5.293-5.293a1 1 0 1 1 1.414 1.414L13.414 12l5.293 5.293a1 1 0 0 1-1.414 1.414L12 13.414l-5.293 5.293a1 1 0 0 1-1.414-1.414L10.586 12 5.293 6.707a1 1 0 0 1 0-1.414Z"></path></svg>
        </button>
    </div>

    

    <section id="webbook-toolbar" class="webbook" aria-label="Toolbar">
        <div id="webbook-narration-position" role="group" aria-label="Narration position">
            <span id="webbook-time" aria-hidden="true">0:00</span>
            <input type="range" id="webbook-seek" min="0" max="0" step="any" value="0" aria-label="Seek">
        </div>
        <button type="button" popovertarget="webbook-toc-nav" title="Table of contents" aria-label="Table of contents">
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" aria-hidden="true" role="img" xmlns="http://www.w3.org/2000/svg"><path d="M3 17h18a1 1 0 0 1 .117 1.993L21 19H3a1 1 0 0 1-.117-1.993L3 17h18H3Zm0-6 18-.002a1 1 0 0 1 .117 1.993l-.117.007L3 13a1 1 0 0 1-.117-1.993L3 11l18-.002L3 11Zm0-6h18a1 1 0 0 1 .117 1.993L21 7H3a1 1 0 0 1-.117-1.993L3 5h18H3Z" fill="currentColor"></path></svg>
        </button>
        
        <div id="webbook-audio-controls" role="group" aria-label="Audio playback">
            <button type="button" id="webbook-previous-phrase" title="Previous phrase" aria-label="Previous phrase" disabled="">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M10.78 6.47a.75.75 0 0 1 0 1.06L7.06 11.25H19a.75.75 0 0 1 0 1.5H7.06l3.72 3.72a.75.75 0 1 1-1.06 1.06l-5-5a.75.75 0 0 1 0-1.06l5-5a.75.75 0 0 1 1.06 0Z"></path></svg>
            </button>
            <button type="button" id="webbook-audio-playpause" title="Play" aria-label="Play"></button>
            <button type="button" id="webbook-next-phrase" title="Next phrase" aria-label="Next phrase" disabled="">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13.22 6.47a.75.75 0 0 1 1.06 0l5 5a.75.75 0 0 1 0 1.06l-5 5a.75.75 0 1 1-1.06-1.06l3.72-3.72H5a.75.75 0 0 1 0-1.5h11.94l-3.72-3.72a.75.75 0 0 1 0-1.06Z"></path></svg>
            </button>
        </div>
        <button type="button" popovertarget="webbook-info" title="About this publication" aria-label="About this publication">
            <svg role="img" aria-hidden="true" width="24" height="24" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H18a2.5 2.5 0 0 1 2.5 2.5v14.25a.75.75 0 0 1-.75.75H5.5a1 1 0 0 0 1 1h13.25a.75.75 0 0 1 0 1.5H6.5A2.5 2.5 0 0 1 4 19.5v-15ZM12.25 8a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm-.75 1.75v5a.75.75 0 0 0 1.5 0v-5a.75.75 0 0 0-1.5 0Z" fill="currentColor"></path></svg>
        </button>
        <button type="button" popovertarget="webbook-settings" title="Settings" aria-label="Settings">
            <svg role="img" aria-hidden="true" width="24" height="24" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12.012 2.25c.734.008 1.465.093 2.182.253a.75.75 0 0 1 .582.649l.17 1.527a1.384 1.384 0 0 0 1.927 1.116l1.401-.615a.75.75 0 0 1 .85.174 9.792 9.792 0 0 1 2.204 3.792.75.75 0 0 1-.271.825l-1.242.916a1.381 1.381 0 0 0 0 2.226l1.243.915a.75.75 0 0 1 .272.826 9.797 9.797 0 0 1-2.204 3.792.75.75 0 0 1-.848.175l-1.407-.617a1.38 1.38 0 0 0-1.926 1.114l-.169 1.526a.75.75 0 0 1-.572.647 9.518 9.518 0 0 1-4.406 0 .75.75 0 0 1-.572-.647l-.168-1.524a1.382 1.382 0 0 0-1.926-1.11l-1.406.616a.75.75 0 0 1-.849-.175 9.798 9.798 0 0 1-2.204-3.796.75.75 0 0 1 .272-.826l1.243-.916a1.38 1.38 0 0 0 0-2.226l-1.243-.914a.75.75 0 0 1-.271-.826 9.793 9.793 0 0 1 2.204-3.792.75.75 0 0 1 .85-.174l1.4.615a1.387 1.387 0 0 0 1.93-1.118l.17-1.526a.75.75 0 0 1 .583-.65c.717-.159 1.45-.243 2.201-.252ZM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" fill="currentColor"></path></svg>
        </button>
    </section>

    <section popover="" id="webbook-menu" class="webbook" aria-label="Go to page">
        <label for="goto-page">Go to page</label>
        <input type="text" list="pages" id="goto-page" inputmode="numeric">
        <button type="button" id="webbook-goto-page-go" title="Go" aria-label="Go">
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2.001c5.524 0 10 4.477 10 10s-4.476 10-10 10c-5.522 0-10-4.477-10-10s4.478-10 10-10Zm.781 5.469-.084-.073a.75.75 0 0 0-.883-.007l-.094.08-.072.084a.75.75 0 0 0-.007.883l.08.094 2.719 2.72H7.75l-.102.006a.75.75 0 0 0-.641.642L7 12l.007.102a.75.75 0 0 0 .641.641l.102.007h6.69l-2.72 2.72-.073.085a.75.75 0 0 0 1.05 1.05l.083-.073 4.002-4 .072-.085a.75.75 0 0 0 .008-.882l-.08-.094-4-4.001-.085-.073.084.073Z" fill="currentColor"></path></svg>
        </button>
        <datalist id="pages"></datalist>
    </section>

    <section popover="" id="webbook-search" class="webbook" aria-labelledby="webbook-search-hd">
        <h2 id="webbook-search-hd">Search</h2>
        <form id="webbook-search-form" role="search">
            <input type="search" id="webbook-search-input" placeholder="Search..." aria-label="Search book">
            <button type="submit" title="Search" aria-label="Search">
                <svg role="img" aria-hidden="true" width="20" height="20" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M10 2.5a7.5 7.5 0 0 1 5.964 12.048l4.743 4.745a1 1 0 0 1-1.32 1.497l-.094-.083-4.745-4.743A7.5 7.5 0 1 1 10 2.5Zm0 2a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11Z" fill="currentColor"></path></svg>
            </button>
        </form>
        <ol id="webbook-search-results" aria-live="polite" aria-label="Search results"></ol>
    </section>

    <section id="webbook-info" aria-labelledby="webbook-info-hd" popover="" class="webbook">
        <img id="webbook-cover" alt="Abstract paper collage cover for Gibberish Field Notes">
        <div class="webbook-info-body">
            <h2 id="webbook-info-hd">About</h2>
            
            <section id="webbook-progress" aria-label="Reading progress">
                <h3>Progress</h3>
                <p id="webbook-current-page-label"></p>
                <progress id="webbook-reading-progress" max="100" value="0" aria-label="Reading progress">0%</progress>
                <p id="webbook-progress-count">0%</p>
            </section>
        </div>
    </section>

    <section popover="" id="webbook-settings" class="webbook" aria-labelledby="webbook-settings-hd">
        <h2 id="webbook-settings-hd">Settings</h2>
        <div id="webbook-color">
            <label for="webbook-highlight-auto-toggle">Auto highlight color</label>
            <input type="checkbox" id="webbook-highlight-auto-toggle" checked="">
            <label for="webbook-color-picker">Custom color</label>
            <input type="color" id="webbook-color-picker" disabled="">
        </div>
        <div id="webbook-font-size">
            <label for="webbook-font-size-range">Font size</label>
            <input type="range" id="webbook-font-size-range" min="50" max="200" value="100" step="5">
            <p id="webbook-font-size-value">100%</p>
            <button type="button" id="webbook-reset-font-size">Reset</button>
        </div>
        <div id="webbook-font-family">
            <label for="webbook-font-family-options">Font</label>
            <select id="webbook-font-family-options">
                <option value="system-ui">System UI</option>
                <option value="sans-serif">Sans-serif</option>
                <option value="serif">Serif</option>
            </select>
        </div>
        <div id="webbook-appearance">
            <label for="webbook-appearance-options">Appearance</label>
            <select id="webbook-appearance-options">
                <option value="auto">Auto (system)</option>
                <option value="dark">Dark</option>
                <option value="light">Light</option>
            </select>
        </div>
        <div>
            <label for="webbook-dialog-blur-toggle">Blur background behind dialogs</label>
            <input type="checkbox" id="webbook-dialog-blur-toggle" checked="">
        </div>
        <div>
            <label for="webbook-caption-mode-toggle">Caption mode</label>
            <input type="checkbox" id="webbook-caption-mode-toggle">
        </div>
        <div id="webbook-rate">
            <label for="webbook-rate-range">Playback rate</label>
            <input type="range" id="webbook-rate-range" min="50" max="200" value="100" step="5">
            <p id="webbook-rate-value">100%</p>
            <button type="button" id="webbook-reset-rate">Reset</button>
        </div>
        <div>
            <label for="webbook-skip-pagebreak-toggle">Page numbers</label>
            <input type="checkbox" id="webbook-skip-pagebreak-toggle">
        </div>
        <div>
            <label for="webbook-skip-footnote-toggle">Notes</label>
            <input type="checkbox" id="webbook-skip-footnote-toggle">
        </div>
        <div>
            <label for="webbook-skip-sidebar-toggle">Sidebars</label>
            <input type="checkbox" id="webbook-skip-sidebar-toggle">
        </div>
        <div>
            <label for="webbook-resume-toggle">Resume last position on open</label>
            <input type="checkbox" id="webbook-resume-toggle" checked="">
        </div>
    </section>

    



` : await fetch(new URL("src/reader-shell.html", location.href), {
      signal: AbortSignal.timeout(5e3)
    }).then((response) => {
      if (!response.ok) throw new Error("Reader controls unavailable");
      return response.text();
    });
    const [toc, about, pages] = await Promise.all([
      loadNavigation("toc.html").catch(() => null),
      loadNavigation("about.html").catch(() => null),
      document.querySelector('#webbook-basic-nav a[href="pages.html"]') ? loadNavigation("pages.html").catch(() => null) : null
    ]);
    preparation = { text, toc, about, pages };
    enhanceDocument(document, preparation);
  })();
}
var shellData;
function enhanceDocument(doc, data = shellData) {
  if (!data || !doc.documentElement.hasAttribute("data-webbook-shell") || doc.querySelector("#webbook-top-toolbar"))
    return;
  shellData = data;
  const fragment = doc.createElement("template");
  fragment.innerHTML = data.text;
  const spine = doc.querySelector("#webbook-spine-nav");
  const arrows = fragment.content.querySelector("#webbook-spine-nav");
  for (const [id, rel] of [
    ["webbook-previous-document", "prev"],
    ["webbook-next-document", "next"]
  ]) {
    const target = arrows?.querySelector("#" + id), source = spine?.querySelector(`a[rel="${rel}"][href]`);
    if (!target) continue;
    target.removeAttribute("href");
    target.removeAttribute("rel");
    target.hidden = !source;
    if (source) {
      target.href = source.getAttribute("href");
      target.rel = rel;
      target.setAttribute("aria-label", rel === "prev" ? "Previous page" : "Next page");
    }
  }
  spine?.remove();
  const audio2 = doc.querySelector("#webbook-toolbar audio"), toolbar = doc.querySelector("#webbook-toolbar");
  const escape = doc.querySelector("#webbook-escape-status"), resume = doc.querySelector("#webbook-resume-banner");
  toolbar?.remove();
  doc.body.append(fragment.content);
  const top = doc.querySelector("#webbook-top-toolbar");
  if (top) doc.body.insertBefore(top, doc.querySelector("main"));
  if (audio2) {
    audio2.removeAttribute("controls");
    doc.querySelector("#webbook-toolbar")?.append(audio2);
  }
  if (escape) doc.querySelector("#webbook-escape-container")?.prepend(escape);
  if (resume) doc.body.append(resume);
  if (data.toc) {
    const ol = data.toc.querySelector("main > ol");
    if (ol) doc.querySelector("#webbook-toc-nav ol")?.replaceWith(doc.importNode(ol, true));
    const cover = data.toc.querySelector("#webbook-cover-link");
    if (cover) doc.querySelector("#webbook-cover-link")?.replaceWith(doc.importNode(cover, true));
    for (const a of doc.querySelectorAll("#webbook-toc-nav a[href]")) {
      a.removeAttribute("aria-current");
      if (a.getAttribute("href")?.split("#")[0] === (doc.querySelector('meta[name="webbook-page-file"]')?.content || location.pathname.split("/").pop() || "index.html"))
        a.setAttribute("aria-current", "page");
    }
  }
  if (data.about) {
    const body = doc.querySelector("#webbook-info .webbook-info-body");
    for (const child of data.about.querySelectorAll("main > :not(h1):not(#webbook-cover)"))
      body?.append(doc.importNode(child, true));
    const cover = data.about.querySelector("#webbook-cover");
    if (cover)
      doc.querySelector("#webbook-info #webbook-cover")?.replaceWith(doc.importNode(cover, true));
    else doc.querySelector("#webbook-info #webbook-cover")?.setAttribute("hidden", "");
  }
  if (data.pages)
    for (const a of data.pages.querySelectorAll("#webbook-page-list a")) {
      const option = doc.createElement("option");
      option.value = a.textContent;
      option.textContent = a.textContent;
      option.dataset.href = a.getAttribute("href");
      doc.querySelector("#pages")?.append(option);
    }
  for (const [name, file] of [
    ["webbook-toc-nav", "toc.html"],
    ["webbook-info", "about.html"],
    ["webbook-menu", "pages.html"]
  ]) {
    if (name === "webbook-toc-nav" && data.toc || name === "webbook-info" && data.about || name === "webbook-menu" && data.pages)
      continue;
    for (const button of doc.querySelectorAll(`[popovertarget="${name}"]`)) {
      if (button.getAttribute("popovertargetaction") === "hide") continue;
      if (name === "webbook-menu" && !doc.querySelector('#webbook-basic-nav a[href="pages.html"]')) {
        button.hidden = true;
        continue;
      }
      const a = doc.createElement("a");
      a.className = "webbook-ui-nav-fallback";
      a.href = file;
      a.textContent = button.getAttribute("aria-label") || file;
      button.replaceWith(a);
    }
  }
  const progress = doc.querySelector("#webbook-progress");
  if (progress) {
    const number = Number(doc.querySelector('meta[name="webbook-page-number"]')?.content), count = Number(doc.querySelector('meta[name="webbook-page-count"]')?.content);
    progress.dataset.webbookPageNumber = number;
    progress.dataset.webbookPageCount = count;
    progress.querySelector("#webbook-current-page-label").textContent = doc.querySelector('meta[name="webbook-page-label"]')?.content || "";
    const percent = count ? Math.round(number / count * 100) : 0;
    const bar = progress.querySelector("progress");
    if (bar) {
      bar.value = percent;
      bar.setAttribute("aria-valuetext", percent + "%");
    }
    progress.querySelector("#webbook-progress-count").textContent = percent + "%";
  }
}

// template/src/js/stored-settings.js
function readSetting(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function writeSetting(key, value) {
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch {
  }
}
function optionElement(value, text) {
  const element = document.createElement("option");
  element.value = value;
  element.textContent = text;
  return element;
}

// template/src/js/settings-sections.js
var SECTIONS = [
  // Only in books with publisher styles (appearance.js); the section hides itself otherwise
  ["appearance", "Appearance option", ["#webbook-publisher-appearance"]],
  ["colors", "Colors", ["#webbook-colors", "#webbook-colors-custom", "#webbook-appearance", "#webbook-color", "#webbook-highlight-style"]],
  ["text", "Text", ["#webbook-font-family", "#webbook-font-size", "#webbook-writing-mode", "#webbook-text-spacing", "#webbook-copy-math", "#webbook-dialog-blur-toggle", "#webbook-toolbar-auto-hide"]],
  ["narration", "Narration", ["#webbook-rate", "#webbook-caption-mode-toggle", "#webbook-skip-settings", "#webbook-structure-sounds"]],
  ["notes", "Notes", ["#webbook-note-references-options", "#webbook-note-wait-sound-toggle", "#webbook-note-auto-return-toggle"]],
  ["position", "Reading position", ["#webbook-resume-toggle"]],
  ["keyboard", "Keyboard", ["#webbook-keyboard-shortcuts-toggle", ".webbook-keyboard-shortcuts-row"]],
  ["all", "All settings", [".webbook-agent-tools-row", "#webbook-settings-transfer"]]
];
function initSettingsSections() {
  const panel = document.getElementById("webbook-settings");
  if (!panel || panel.querySelector(".webbook-settings-section")) return;
  const description = document.createElement("p");
  description.className = "webbook-settings-scope";
  description.textContent = "These settings apply to every book on this website, except as noted.";
  const jump = document.createElement("nav");
  jump.className = "webbook-settings-jump";
  jump.setAttribute("aria-label", "Jump to settings sections");
  const label = document.createElement("p");
  label.id = "webbook-settings-jump-label";
  label.tabIndex = -1;
  label.textContent = "Jump to";
  const links = document.createElement("ul");
  jump.append(label, links);
  panel.append(description, jump);
  for (const [name, title] of SECTIONS) {
    const section = document.createElement("div");
    section.className = "webbook-settings-section";
    section.dataset.settingsSection = name;
    const heading = document.createElement("h3");
    heading.id = `webbook-settings-${name}-hd`;
    heading.tabIndex = -1;
    heading.textContent = title;
    const rows = document.createElement("div");
    rows.className = "webbook-settings-rows";
    const back = document.createElement("a");
    back.className = "webbook-settings-top";
    back.href = `#${label.id}`;
    back.textContent = "Back to top";
    back.addEventListener("click", (event) => {
      event.preventDefault();
      label.focus({ preventScroll: true });
      label.scrollIntoView({ block: "start" });
    });
    section.append(heading, rows, back);
    panel.append(section);
    const item = document.createElement("li");
    item.dataset.settingsLink = name;
    const link = document.createElement("a");
    link.href = `#${heading.id}`;
    link.textContent = title;
    link.addEventListener("click", (event) => {
      event.preventDefault();
      heading.focus({ preventScroll: true });
      heading.scrollIntoView({ block: "start" });
    });
    item.append(link);
    links.append(item);
  }
  let skip = panel.querySelector("#webbook-skip-settings");
  if (!skip && panel.querySelector("#webbook-skip-pagebreak-toggle")) {
    skip = document.createElement("fieldset");
    skip.id = "webbook-skip-settings";
    const legend = document.createElement("legend");
    legend.textContent = "Exclude from narration";
    skip.append(legend);
    for (const kind of ["pagebreak", "footnote", "sidebar"]) {
      const row = panel.querySelector(`#webbook-skip-${kind}-toggle`)?.closest("div");
      if (row) skip.append(row);
    }
    panel.append(skip);
  }
  const skipLegend = skip?.querySelector("legend");
  if (skipLegend) skipLegend.textContent = "Exclude from narration";
  for (const [name, , selectors] of SECTIONS) {
    for (const selector of selectors) {
      for (const element of panel.querySelectorAll(selector)) {
        const row = element.matches("input, select") ? element.closest("div") : element;
        appendSetting(name, row);
      }
    }
  }
  for (const group of panel.querySelectorAll(":scope > fieldset")) {
    if (!group.querySelector("input, select, button")) group.remove();
  }
  updateSettingsSections();
  const observer = new window.MutationObserver(updateSettingsSections);
  observer.observe(panel, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden"] });
}
function settingsSection(name) {
  initSettingsSections();
  return document.querySelector(`#webbook-settings [data-settings-section="${name}"] > .webbook-settings-rows`);
}
function appendSetting(name, row) {
  const rows = settingsSection(name);
  if (!rows || !row) return;
  const selectors = SECTIONS.find((section) => section[0] === name)[2];
  const rank = (element) => {
    const index = selectors.findIndex((selector) => element.matches(selector) || element.querySelector(selector));
    return index < 0 ? selectors.length : index;
  };
  const next = Array.from(rows.children).find((other) => other !== row && rank(other) > rank(row));
  rows.insertBefore(row, next ?? null);
}
function updateSettingsSections() {
  const panel = document.getElementById("webbook-settings");
  if (!panel) return;
  for (const [name] of SECTIONS) {
    const section = panel.querySelector(`[data-settings-section="${name}"]`);
    if (!section) continue;
    const visible = Array.from(section.querySelectorAll("input, select, button")).some((control) => {
      for (let node = control; node && node !== section; node = node.parentElement) {
        if (node.hidden || node.classList.contains("webbook-appearance-hidden")) return false;
      }
      return true;
    });
    if (section.hidden === visible) section.hidden = !visible;
    const item = panel.querySelector(`[data-settings-link="${name}"]`);
    if (item && item.hidden === visible) item.hidden = !visible;
  }
}

// template/src/js/settings-filter.js
var INPUT_ID = "webbook-settings-filter";
var STATUS_ID = "webbook-settings-filter-status";
var FILTERED = "webbook-settings-filtered";
var KEYWORDS = {
  "#webbook-publisher-appearance": "colors colour font size spacing line length writing direction publisher original",
  "#webbook-colors": "theme dark light mode contrast background appearance",
  "#webbook-colors-custom": "theme colour color background text",
  "#webbook-color": "highlight narration colour color",
  "#webbook-highlight-style": "highlight underline narration",
  "#webbook-font-family": "typeface font serif",
  "#webbook-font-size": "text size zoom bigger larger smaller",
  "#webbook-writing-mode": "vertical horizontal japanese chinese columns direction",
  "#webbook-text-spacing": "line height spacing length width column",
  "#webbook-rate": "speed playback faster slower narration",
  "#webbook-caption-mode-toggle": "captions subtitles phrase large",
  "#webbook-skip-settings": "skip exclude narration page numbers notes sidebars",
  "#webbook-structure-sounds": "sounds earcons tones audio cues",
  "#webbook-toolbar-auto-hide": "toolbar hide show",
  "#webbook-resume-toggle": "resume bookmark position remember",
  "#webbook-keyboard-shortcuts-toggle": "keys keyboard shortcuts hotkeys",
  ".webbook-keyboard-shortcuts-row": "keys keyboard shortcuts hotkeys edit",
  "#webbook-settings-transfer": "export import reset backup file"
};
var normalize = (text) => (text || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
function keywordsFor(element) {
  return Object.entries(KEYWORDS).filter(([selector]) => element.matches(selector) || element.querySelector(selector)).map(([, words]) => words).join(" ");
}
function searchText(element) {
  const names = Array.from(element.querySelectorAll("[aria-label], [title]"), (node) => `${node.getAttribute("aria-label") || ""} ${node.getAttribute("title") || ""}`);
  return normalize(`${element.textContent} ${names.join(" ")} ${keywordsFor(element)}`);
}
function matches(text, words) {
  return words.every((word) => text.includes(word));
}
function filterRow(row, words, sectionText) {
  const groupRows = row.matches("fieldset") ? Array.from(row.querySelectorAll(":scope > div")) : [];
  if (matches(`${sectionText} ${searchText(row)}`, words) && !groupRows.length) return show(row, true);
  if (!groupRows.length) return show(row, false);
  const legend = normalize(`${row.querySelector(":scope > legend")?.textContent || ""} ${keywordsFor(row)}`);
  if (words.every((word) => `${sectionText} ${legend}`.includes(word))) {
    groupRows.forEach((groupRow) => show(groupRow, true));
    return show(row, true);
  }
  let any = false;
  for (const groupRow of groupRows) {
    const found = matches(`${sectionText} ${legend} ${searchText(groupRow)}`, words);
    show(groupRow, found);
    any ||= found && !groupRow.closest("[hidden], .webbook-appearance-hidden");
  }
  return show(row, any);
}
function show(element, visible) {
  element.classList.toggle(FILTERED, !visible);
  return visible && !element.closest("[hidden], .webbook-appearance-hidden");
}
var announceTimer;
function applySettingsFilter(query) {
  const panel = document.getElementById("webbook-settings");
  if (!panel) return 0;
  const words = normalize(query).split(" ").filter(Boolean);
  const filtering = words.length > 0;
  panel.classList.toggle("webbook-settings-filtering", filtering);
  let count = 0;
  for (const section of panel.querySelectorAll(".webbook-settings-section")) {
    const title = normalize(section.querySelector("h3")?.textContent);
    let found = 0;
    for (const row of section.querySelectorAll(":scope > .webbook-settings-rows > *")) {
      if (!filtering) {
        row.classList.remove(FILTERED);
        row.querySelectorAll(`.${FILTERED}`).forEach((node) => node.classList.remove(FILTERED));
        continue;
      }
      if (row.id === "webbook-publisher-appearance") {
        if (show(row, matches(`${title} ${searchText(row)}`, words))) found++;
        continue;
      }
      if (filterRow(row, words, title)) found += row.matches("fieldset") ? Array.from(row.querySelectorAll(`:scope > div:not(.${FILTERED})`)).filter((node) => !node.closest("[hidden], .webbook-appearance-hidden")).length : 1;
    }
    section.classList.toggle(FILTERED, filtering && found === 0);
    if (!section.hidden) count += found;
  }
  const status2 = document.getElementById(STATUS_ID);
  if (status2) {
    clearTimeout(announceTimer);
    const message = !filtering ? "" : count === 0 ? "No settings match." : count === 1 ? "1 setting found." : `${count} settings found.`;
    announceTimer = setTimeout(() => {
      status2.textContent = message;
    }, filtering ? 500 : 0);
  }
  return count;
}
function initSettingsFilter() {
  const panel = document.getElementById("webbook-settings");
  if (!panel || document.getElementById(INPUT_ID)) return;
  const wrapper = document.createElement("div");
  wrapper.className = "webbook-settings-filter";
  wrapper.setAttribute("role", "search");
  const label = document.createElement("label");
  label.htmlFor = INPUT_ID;
  label.textContent = "Find a setting";
  const input = document.createElement("input");
  input.type = "search";
  input.id = INPUT_ID;
  input.autocomplete = "off";
  input.spellcheck = false;
  input.setAttribute("aria-describedby", STATUS_ID);
  const status2 = document.createElement("p");
  status2.id = STATUS_ID;
  status2.setAttribute("role", "status");
  wrapper.append(label, input, status2);
  const anchor = panel.querySelector(".webbook-settings-jump") || panel.querySelector(".webbook-settings-section");
  if (anchor) anchor.before(wrapper);
  else panel.append(wrapper);
  input.addEventListener("input", () => applySettingsFilter(input.value));
  input.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !input.value) return;
    event.preventDefault();
    event.stopPropagation();
    input.value = "";
    applySettingsFilter("");
  });
  panel.addEventListener("toggle", (event) => {
    if (event.newState !== "closed" || !input.value) return;
    input.value = "";
    applySettingsFilter("");
  });
}

// template/src/js/reader-actions.js
var actions = /* @__PURE__ */ new Map();
function registerAction(action) {
  const defaultKeys = (action.defaultKeys ?? []).map((key) => ({ shift: false, alt: false, ctrl: false, meta: false, ...key }));
  const same = (a, b) => a.code === b.code && ["shift", "alt", "ctrl", "meta"].every((name) => a[name] === b[name]);
  for (const other of actions.values()) {
    if (other.id !== action.id && other.defaultKeys.some((key) => defaultKeys.some((mine) => same(key, mine)))) {
      console.warn(`Reader actions ${other.id} and ${action.id} share a default key`);
    }
  }
  actions.set(action.id, { isAvailable: () => true, ...action, defaultKeys });
}
function getActions() {
  return Array.from(actions.values());
}
function runAction(id) {
  const action = actions.get(id);
  if (!action?.isAvailable()) return false;
  action.run();
  return true;
}
function initReaderActionStatus() {
  if (document.getElementById("webbook-action-status")) return;
  const status2 = document.createElement("div");
  status2.id = "webbook-action-status";
  status2.className = "sr-only";
  status2.setAttribute("role", "status");
  status2.setAttribute("aria-atomic", "true");
  document.body.append(status2);
}
var announcementTimer;
var noticeTimer;
var noticeReturnFocus;
var NOTICE_SECONDS = 5;
function announceReaderAction(message, { show: show2 = true, action } = {}) {
  const status2 = document.getElementById("webbook-action-status");
  if (!status2) return;
  clearTimeout(announcementTimer);
  status2.textContent = "";
  announcementTimer = setTimeout(() => {
    status2.textContent = message;
  }, 30);
  if (show2) showNotice(message, action);
}
function showNotice(message, action) {
  let notice = document.getElementById("webbook-action-notice");
  if (!notice) {
    notice = document.createElement("div");
    notice.id = "webbook-action-notice";
    notice.className = "webbook";
    notice.setAttribute("aria-hidden", "true");
    notice.setAttribute("popover", "manual");
    document.body.append(notice);
  }
  if (action && !notice.contains(document.activeElement)) noticeReturnFocus = document.activeElement;
  notice.textContent = message;
  if (action && message.includes(action.label)) {
    const index = message.indexOf(action.label), button = document.createElement("button");
    button.type = "button";
    button.textContent = action.label;
    button.addEventListener("click", () => {
      hideNotice();
      action.run();
    });
    notice.replaceChildren(document.createTextNode(message.slice(0, index)), button, document.createTextNode(message.slice(index + action.label.length)));
    notice.removeAttribute("aria-hidden");
  } else notice.setAttribute("aria-hidden", "true");
  notice.hidden = false;
  showOnTop(notice);
  clearTimeout(noticeTimer);
  if (!action) noticeTimer = setTimeout(() => {
    notice.hidden = true;
    hidePopover(notice);
  }, NOTICE_SECONDS * 1e3);
}
function showOnTop(notice) {
  if (typeof notice.showPopover !== "function") return;
  hidePopover(notice);
  try {
    notice.showPopover();
  } catch {
  }
}
function hidePopover(notice) {
  try {
    if (notice.matches(":popover-open")) notice.hidePopover();
  } catch {
  }
}
function hideNotice() {
  const notice = document.getElementById("webbook-action-notice");
  if (!notice || notice.hidden) return false;
  clearTimeout(noticeTimer);
  notice.hidden = true;
  hidePopover(notice);
  if (notice.contains(document.activeElement) && noticeReturnFocus?.isConnected) noticeReturnFocus.focus({ preventScroll: true });
  return true;
}
function initReaderActionNotice() {
  window.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (!hideNotice()) return;
    e.preventDefault();
    e.stopImmediatePropagation();
  }, { capture: true });
  window.addEventListener("pointerdown", (event) => {
    if (event.target.closest?.("#webbook-action-notice button")) return;
    hideNotice();
  }, { capture: true });
}

// template/src/js/appearance-state.js
function publishedAppearanceActive() {
  return document.documentElement.getAttribute("data-webbook-appearance") === "published";
}

// template/src/js/writing-mode.js
var KEY = "webbook-writing-mode";
var ROW_ID = "webbook-writing-mode-row";
var SELECT_ID = "webbook-writing-mode";
function bookWritingMode() {
  const mode = document.documentElement.getAttribute("data-webbook-writing-mode");
  return mode === "vertical-rl" || mode === "vertical-lr" ? mode : null;
}
function applyWritingMode() {
  const root2 = document.documentElement;
  const book = bookWritingMode();
  const vertical = Boolean(book) && (publishedAppearanceActive() || readSetting(KEY) !== "horizontal");
  const changed = vertical !== root2.classList.contains("webbook-vertical");
  root2.classList.toggle("webbook-vertical", vertical);
  root2.classList.toggle("webbook-vertical-lr", vertical && book === "vertical-lr");
  const row = document.getElementById(ROW_ID);
  if (row) row.hidden = !book;
  const select = document.getElementById(SELECT_ID);
  if (select) select.value = readSetting(KEY) === "horizontal" ? "horizontal" : "vertical";
  if (changed) document.dispatchEvent(new CustomEvent("webbook:layoutchange"));
}
function buildSetting() {
  if (document.getElementById(ROW_ID) || !settingsSection("text")) return;
  const row = document.createElement("div");
  row.id = ROW_ID;
  const label = document.createElement("label");
  label.htmlFor = SELECT_ID;
  label.textContent = "Writing direction";
  const select = document.createElement("select");
  select.id = SELECT_ID;
  select.append(optionElement("vertical", "Vertical"), optionElement("horizontal", "Horizontal"));
  row.append(label, select);
  appendSetting("text", row);
  select.addEventListener("change", () => {
    writeSetting(KEY, select.value === "horizontal" ? "horizontal" : "");
    applyWritingMode();
    if (!publishedAppearanceActive()) scrollToReading(0);
  });
}
function wheelBelongsElsewhere(target) {
  if (!(target instanceof Element)) return false;
  if (!target.closest("main")) return true;
  for (let elm = target; elm && elm.tagName !== "MAIN"; elm = elm.parentElement) {
    const style = getComputedStyle(elm);
    if (/(auto|scroll)/.test(style.overflowY) && elm.scrollHeight > elm.clientHeight) return true;
  }
  return false;
}
function onWheel(event) {
  if (!isVerticalText() || event.ctrlKey || event.defaultPrevented) return;
  if (Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
  if (wheelBelongsElsewhere(event.target)) return;
  const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewportLength() : 1;
  event.preventDefault();
  scrollAlongText(event.deltaY * unit);
}
function isTextEntry(target) {
  return target instanceof Element && Boolean(target.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]'));
}
function onKeyDown(event) {
  if (!isVerticalText() || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
  if (isTextEntry(event.target) || document.querySelector("[popover]:popover-open")) return;
  const target = event.target instanceof Element ? event.target : null;
  if (target && !target.closest("main") && target !== document.body && target !== document.documentElement) return;
  const page = viewportLength() * 0.85;
  const step = 48;
  const moves = {
    PageDown: page,
    PageUp: -page,
    " ": event.shiftKey ? -page : page,
    ArrowDown: step,
    ArrowUp: -step
  };
  if (event.key === "Home" || event.key === "End") {
    event.preventDefault();
    scrollToReading(event.key === "Home" ? 0 : Number.MAX_SAFE_INTEGER / 4);
    return;
  }
  if (!(event.key in moves)) return;
  if (event.key === " " && target?.closest('a[href], button, summary, [role="button"]')) return;
  event.preventDefault();
  scrollAlongText(moves[event.key], event.repeat ? "auto" : "smooth");
}
function initWritingMode() {
  buildSetting();
  applyWritingMode();
  window.addEventListener("wheel", onWheel, { passive: false });
  window.addEventListener("keydown", onKeyDown);
}

// template/src/js/dom-utils.js
function isTextEntryTarget(target) {
  if (!(target instanceof Element)) return false;
  if (target.closest('textarea, select, [contenteditable="true"], [contenteditable=""]')) return true;
  const input = target.closest("input");
  return Boolean(input && !["checkbox", "radio", "range", "button", "submit", "reset", "color"].includes(input.type));
}
function isAnyPopoverOpen() {
  try {
    return Boolean(document.querySelector(".webbook[popover]:popover-open"));
  } catch {
    return false;
  }
}
function pageAudio() {
  return document.querySelector("#webbook-toolbar audio");
}

// template/src/js/narration-position.js
var NARRATION_HIGHLIGHT_NAME = "narration";
var currentNarrationHighlight = null;
var lastNarratedElm = null;
var pendingReadingLineElement = null;
function lastNarratedElement() {
  return lastNarratedElm?.isConnected ? lastNarratedElm : null;
}
function highlightElm(elm, placement = "nearest") {
  const changed = lastNarratedElm !== elm;
  lastNarratedElm = elm;
  if (changed) document.dispatchEvent(new CustomEvent("webbook:narrationpositionchange", { detail: { element: elm } }));
  const highlights = customHighlightRegistry();
  if (highlights) {
    const range = document.createRange();
    range.selectNodeContents(elm);
    if (!currentNarrationHighlight || highlights.get(NARRATION_HIGHLIGHT_NAME) !== currentNarrationHighlight) {
      currentNarrationHighlight = new Highlight();
      highlights.set(NARRATION_HIGHLIGHT_NAME, currentNarrationHighlight);
    }
    const previous = currentNarrationHighlight.size ? lastHighlightedElm : null;
    currentNarrationHighlight.clear();
    currentNarrationHighlight.add(range);
    if (previous && previous !== elm) repaintAround(previous);
    lastHighlightedElm = elm;
  }
  const rect = elm.getBoundingClientRect();
  const viewport = readingViewport();
  if (placement === "reading-line") {
    scrollToReadingLine(elm);
  } else if (placement !== "none" && (readingStart(rect) < viewport.top || readingEnd(rect) > viewport.bottom)) {
    scrollIntoReadingViewport(elm, viewport);
  }
}
var lastHighlightedElm = null;
function repaintAround(elm) {
  if (!elm.isConnected) return;
  const block = elm.closest("p, li, dd, dt, td, th, figcaption, caption, blockquote, h1, h2, h3, h4, h5, h6, aside, section, main") ?? elm;
  if (block.style.outline || block === document.activeElement) return;
  block.style.outline = "4px solid transparent";
  requestAnimationFrame(() => requestAnimationFrame(() => block.style.removeProperty("outline")));
}
function keepHighlightInView() {
  document.addEventListener("webbook:layoutchange", () => {
    requestAnimationFrame(() => {
      const elm = highlightedElement();
      if (!elm) return;
      const rect = elm.getBoundingClientRect(), viewport = readingViewport();
      if (readingStart(rect) < viewport.top || readingEnd(rect) > viewport.bottom) scrollIntoReadingViewport(elm, viewport);
    });
  });
}
function highlightedElement() {
  return lastHighlightedElm?.isConnected ? lastHighlightedElm : null;
}
function clearNarrationHighlight() {
  if (lastHighlightedElm && currentNarrationHighlight?.size) repaintAround(lastHighlightedElm);
  lastHighlightedElm = null;
  currentNarrationHighlight?.clear();
  const highlights = customHighlightRegistry();
  const registeredHighlight = highlights?.get?.(NARRATION_HIGHLIGHT_NAME);
  if (registeredHighlight && registeredHighlight !== currentNarrationHighlight) registeredHighlight.clear?.();
}
function customHighlightRegistry() {
  if (typeof CSS === "undefined" || !CSS.highlights || typeof Highlight === "undefined") return null;
  return CSS.highlights;
}
function readingViewport() {
  if (isVerticalText()) {
    const gutter = sideGutter();
    return { top: gutter, bottom: Math.max(gutter, viewportLength() - gutter) };
  }
  const top = visibleOverlayHeight("#webbook-top-toolbar");
  const bottomToolbarHeight = visibleOverlayHeight("#webbook-toolbar");
  const bottom = window.innerHeight - bottomToolbarHeight;
  return {
    top,
    bottom: Math.max(top, bottom)
  };
}
function visibleOverlayHeight(selector) {
  const overlay = document.querySelector(selector);
  if (!overlay) return 0;
  const style = window.getComputedStyle?.(overlay);
  if (style?.display === "none" || style?.visibility === "hidden") return 0;
  const opacity = style ? parseFloat(style.opacity) : 1;
  const isVisible = overlay.classList.contains("visible") || overlay.contains(document.activeElement) || Number.isFinite(opacity) && opacity > 0.01;
  if (!isVisible) return 0;
  return overlay.getBoundingClientRect().height || overlay.offsetHeight || 0;
}
function sideGutter() {
  return 16;
}
function scrollIntoReadingViewport(elm, viewport) {
  const rect = elm.getBoundingClientRect();
  const elementCenter = readingScroll() + readingStart(rect) + readingLength(rect) / 2;
  const viewportCenter = viewport.top + (viewport.bottom - viewport.top) / 2;
  scrollToReading(elementCenter - viewportCenter);
}
function readingLine() {
  if (isVerticalText()) return sideGutter() + 24;
  const bottom = document.querySelector("#webbook-top-toolbar")?.getBoundingClientRect().bottom || 0;
  return Math.max(0, bottom) + 48;
}
function scrollToReadingLine(elm) {
  const rect = elm.getBoundingClientRect();
  scrollToReading(readingScroll() + readingStart(rect) - readingLine());
}
function settlePositionUrlPlacement() {
  const elm = pendingReadingLineElement;
  pendingReadingLineElement = null;
  if (!elm || !new URL(window.location.href).searchParams.has("t")) return;
  if (typeof window.requestAnimationFrame !== "function") {
    if (elm.isConnected) scrollToReadingLine(elm);
    return;
  }
  window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
    if (elm.isConnected) scrollToReadingLine(elm);
  }));
}
function positionAnchor(elm) {
  const main = document.querySelector("main");
  if (!elm || !main?.contains(elm)) return null;
  const own = elm.closest("[id]");
  if (own && main.contains(own)) return own;
  const positionAnchors = [
    "h1[id]",
    "h2[id]",
    "h3[id]",
    "h4[id]",
    "h5[id]",
    "h6[id]",
    '[role="heading"][id]',
    "section[id]",
    "article[id]",
    '[role="doc-chapter"][id]',
    '[role="doc-part"][id]',
    '[role="doc-preface"][id]',
    '[role="doc-appendix"][id]',
    '[epub\\:type~="chapter"][id]',
    '[epub\\:type~="part"][id]',
    '[epub\\:type~="preface"][id]',
    '[epub\\:type~="appendix"][id]'
  ].join(",");
  let previous = null;
  for (const candidate of main.querySelectorAll(positionAnchors)) {
    if (candidate === elm || candidate.contains(elm) || candidate.compareDocumentPosition(elm) & Node.DOCUMENT_POSITION_FOLLOWING) previous = candidate;
    else break;
  }
  return previous;
}
function positionUrlForElement(elm, time) {
  const anchor = positionAnchor(elm);
  const hasTime = typeof time === "number" && Number.isFinite(time);
  if (!anchor?.id && !hasTime) return null;
  const url = new URL(window.location.href);
  if (hasTime) url.searchParams.set("t", String(Math.round(time * 1e3) / 1e3));
  else url.searchParams.delete("t");
  url.hash = anchor?.id ? encodeURIComponent(anchor.id) : "";
  return url;
}
function syncPositionUrl(elm, time) {
  const url = positionUrlForElement(elm, time);
  if (!url || url.href === window.location.href) return false;
  history.replaceState(history.state, "", url.href);
  return true;
}
function positionFromUrl(url = new URL(window.location.href)) {
  const raw = url.searchParams.get("t");
  const time = raw === null ? null : Number(raw);
  const id = url.hash ? decodeURIComponent(url.hash.slice(1)) : "";
  return { anchor: id ? document.getElementById(id) : null, time: Number.isFinite(time) ? time : null };
}
function readingPositionTime(audio2) {
  const cues = Array.from(audio2?.textTracks?.[0]?.cues || []);
  const { anchor, time } = positionFromUrl();
  const target = time ?? (anchor ? cueForTarget(anchor, cues)?.startTime : void 0);
  if (typeof target !== "number") return audio2.currentTime;
  const narrating = cueAtTime(cues, audio2.currentTime);
  return narrating && narrating === cueAtTime(cues, target) ? audio2.currentTime : target;
}
function seekToHashTarget(audio2, track, hash = window.location.hash, { place = true } = {}) {
  const id = decodeURIComponent((hash || "").replace(/^#/, ""));
  const position = positionFromUrl();
  const target = id ? document.getElementById(id) : null;
  if (id && !target) return false;
  if (position.time !== null) {
    const cue2 = cueAtTime(Array.from(track.cues || []), position.time);
    const elm = cue2 ? elmForCue(cue2) : null;
    if (elm && (!target || target === elm || target.contains(elm) || positionAnchor(elm) === target)) {
      audio2.currentTime = position.time;
      highlightElm(elm, place ? "reading-line" : "none");
      pendingReadingLineElement = place ? elm : null;
      return true;
    }
  }
  if (!target) return false;
  const cue = cueForTarget(target, Array.from(track.cues || []));
  if (!cue) return false;
  audio2.currentTime = cue.startTime;
  return true;
}
function cueForTarget(target, cues) {
  const cueElms = cues.map((cue) => ({ cue, elm: elmForCue(cue) })).filter(({ elm }) => elm);
  const match = cueElms.find(({ elm }) => elm === target) || cueElms.find(({ elm }) => target.contains(elm)) || cueElms.find(({ elm }) => elm.contains(target)) || cueElms.find(({ elm }) => target.compareDocumentPosition(elm) & Node.DOCUMENT_POSITION_FOLLOWING);
  return match?.cue ?? null;
}

// template/src/js/appearance.js
var KEY_PREFIX = "webbook-appearance:";
var bookKey = () => KEY_PREFIX + (document.querySelector('meta[name="webbook-book-id"]')?.content?.trim() || "");
var generation = 0;
var REPLACED_ROWS = "#webbook-colors, #webbook-colors-custom, #webbook-font-family, #webbook-font-size, #webbook-writing-mode-row, #webbook-text-spacing";
function areaStart() {
  return textWritingMode() === "horizontal-tb" ? Math.max(0, document.getElementById("webbook-top-toolbar")?.getBoundingClientRect().bottom || 0) + 8 : 16;
}
function capturePosition() {
  if (document.documentElement.classList.contains("webbook-caption-mode")) return null;
  const main = document.querySelector("main");
  if (!main) return null;
  const audio2 = pageAudio();
  let element = audio2 && !audio2.paused ? lastNarratedElement() : null;
  let range = null;
  if (!element) {
    const start = areaStart();
    element = Array.from(main.querySelectorAll("p, li, h1, h2, h3, h4, h5, h6, td, th, pre, blockquote, figcaption")).find((elm) => elm.textContent.trim() && elm.getClientRects().length && readingEnd(elm.getBoundingClientRect()) > start);
    if (element) {
      const rect2 = element.getBoundingClientRect(), vertical = textWritingMode() !== "horizontal-tb";
      const x = vertical ? textWritingMode() === "vertical-rl" ? window.innerWidth - start : start : Math.max(rect2.left + 4, 4);
      const y = vertical ? Math.max(rect2.top + 4, 4) : start;
      if (document.caretRangeFromPoint) range = document.caretRangeFromPoint(x, y);
      else if (document.caretPositionFromPoint) {
        const caret = document.caretPositionFromPoint(x, y);
        if (caret) {
          range = document.createRange();
          range.setStart(caret.offsetNode, caret.offset);
          range.collapse(true);
        }
      }
      if (range && !main.contains(range.startContainer)) range = null;
      if (range?.collapsed && range.startContainer.nodeType === 3) {
        const node = range.startContainer, offset = range.startOffset;
        if (offset < node.length) range.setEnd(node, offset + 1);
        else if (offset) range.setStart(node, offset - 1);
      }
      const box = range?.getBoundingClientRect?.();
      if (range && box && !box.width && !box.height) range = null;
    }
  }
  if (!element) return null;
  const rect = range?.getBoundingClientRect?.() ?? element.getBoundingClientRect();
  return { element, range, offset: readingStart(rect), mode: textWritingMode(), area: areaStart() };
}
function restorePosition(position) {
  if (!position?.element.isConnected) return;
  const rect = position.range?.getBoundingClientRect?.() ?? position.element.getBoundingClientRect();
  const desired = position.mode === textWritingMode() ? position.offset : areaStart() + Math.min(Math.max(0, position.offset - position.area), Math.max(0, viewportLength() - areaStart() - 40));
  scrollToReading(readingScroll() + readingStart(rect) - desired);
}
function updateAppearanceControls() {
  const active = publishedAppearanceActive();
  for (const row of document.querySelectorAll(REPLACED_ROWS)) row.classList.toggle("webbook-appearance-hidden", active);
  const note = document.getElementById("webbook-publisher-appearance-note");
  if (note) note.hidden = !active;
  updateSettingsSections();
  const filter = document.getElementById("webbook-settings-filter");
  if (filter) applySettingsFilter(filter.value);
}
function applyAppearance({ preservePosition = false, announce = false, persist } = {}) {
  const position = preservePosition ? capturePosition() : null;
  const root2 = document.documentElement;
  const enabled2 = root2.hasAttribute("data-webbook-has-published") && (persist ?? readSetting(bookKey()) === "published");
  if (persist !== void 0) writeSetting(bookKey(), persist ? "published" : "settings");
  if (enabled2) root2.setAttribute("data-webbook-appearance", "published");
  else root2.removeAttribute("data-webbook-appearance");
  const group = document.getElementById("webbook-publisher-appearance");
  if (group) group.hidden = !root2.hasAttribute("data-webbook-has-published");
  for (const radio of group?.querySelectorAll("input") ?? []) radio.checked = radio.value === (enabled2 ? "published" : "settings");
  applyWritingMode();
  updateAppearanceControls();
  document.dispatchEvent(new window.CustomEvent("webbook:appearancechange"));
  document.dispatchEvent(new window.CustomEvent("webbook:layoutchange"));
  const token = ++generation;
  if (position) {
    restorePosition(position);
    window.requestAnimationFrame?.(() => {
      if (generation === token) restorePosition(position);
    });
    document.fonts?.ready?.then(() => {
      if (generation === token) restorePosition(position);
    });
  }
  if (announce) announceReaderAction(enabled2 ? "As published" : "My settings");
}
function initAppearance() {
  initSettingsSections();
  const panel = document.getElementById("webbook-settings");
  if (!panel || document.getElementById("webbook-publisher-appearance")) return;
  if (!document.documentElement.hasAttribute("data-webbook-has-published")) {
    applyAppearance();
    return;
  }
  const group = document.createElement("fieldset");
  group.id = "webbook-publisher-appearance";
  group.setAttribute("aria-labelledby", "webbook-settings-appearance-hd");
  const scope = document.createElement("p");
  scope.id = "webbook-publisher-appearance-scope";
  scope.textContent = "Remembered for this book.";
  group.setAttribute("aria-describedby", scope.id);
  group.append(scope);
  for (const [value, text] of [["settings", "My settings"], ["published", "As published"]]) {
    const row = document.createElement("div");
    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "webbook-publisher-appearance";
    radio.value = value;
    radio.id = `webbook-appearance-${value}`;
    const label = document.createElement("label");
    label.htmlFor = radio.id;
    label.textContent = text;
    radio.addEventListener("change", () => {
      if (radio.checked) applyAppearance({ persist: value === "published", preservePosition: true });
    });
    row.append(radio, label);
    group.append(row);
  }
  const note = document.createElement("p");
  note.id = "webbook-publisher-appearance-note";
  note.textContent = "Colors, font, text size, spacing and writing direction are as published. Choose My settings to change them.";
  group.append(note);
  appendSetting("appearance", group);
  registerAction({
    id: "switch-appearance",
    label: "Switch between As published and My settings",
    group: "Reading",
    inPanels: true,
    defaultKeys: [{ code: "KeyD", alt: true, shift: true }],
    isAvailable: () => document.documentElement.hasAttribute("data-webbook-has-published"),
    run: () => applyAppearance({ persist: !publishedAppearanceActive(), preservePosition: true, announce: true })
  });
  applyAppearance();
  document.addEventListener("webbook:pagechange", () => applyAppearance());
  for (const event of ["wheel", "touchmove", "pointerdown", "keydown"]) document.addEventListener(event, (e) => {
    if (e.target?.closest?.("main") || e.target === document.body) generation++;
  }, { passive: true });
  document.addEventListener("webbook:pageplacing", () => {
    generation++;
  });
}

// template/src/js/resume-position.js
var RESUME_ENABLED_KEY = "webbook-resume-enabled";
var RESUME_BANNER_PENDING_KEY = "webbook-resume-banner-pending";
var RESUME_SESSION_CHECKED_KEY = "webbook-resume-checked";
var RESUME_BANNER_TEXT = "Loaded last position.";
function getBookId() {
  return document.querySelector('meta[name="webbook-book-id"]')?.content?.trim() || "";
}
function resumeStorageKey(bookId) {
  return `webbook-resume:${bookId}`;
}
function currentPageFilename() {
  return location.pathname.split("/").pop() || "index.html";
}
function isEntryPage() {
  return !document.querySelector("#webbook-previous-document[href]");
}
function readResumePosition(bookId) {
  try {
    const raw = localStorage.getItem(resumeStorageKey(bookId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function writeResumePosition(bookId, fields) {
  if (!bookId) return;
  const existing = readResumePosition(bookId) || {};
  localStorage.setItem(resumeStorageKey(bookId), JSON.stringify({ ...existing, ...fields, ts: Date.now() }));
}
function initResumeSetting() {
  const toggle = document.querySelector("#webbook-resume-toggle");
  if (!toggle) return;
  toggle.checked = localStorage.getItem(RESUME_ENABLED_KEY) !== "false";
  toggle.addEventListener("change", () => {
    localStorage.setItem(RESUME_ENABLED_KEY, toggle.checked);
  });
}
function showResumeBanner() {
  const el = document.querySelector("#webbook-resume-banner");
  if (!el) return;
  el.hidden = false;
  el.textContent = RESUME_BANNER_TEXT;
  clearTimeout(showResumeBanner._timer);
  showResumeBanner._timer = setTimeout(() => {
    el.hidden = true;
  }, 4e3);
}
function initResumePosition() {
  const bookId = getBookId();
  if (localStorage.getItem(RESUME_BANNER_PENDING_KEY) === "true") {
    localStorage.removeItem(RESUME_BANNER_PENDING_KEY);
    showResumeBanner();
  }
  if (!bookId) return false;
  const alreadyCheckedThisSession = sessionStorage.getItem(RESUME_SESSION_CHECKED_KEY) === "true";
  sessionStorage.setItem(RESUME_SESSION_CHECKED_KEY, "true");
  const resumeEnabled = localStorage.getItem(RESUME_ENABLED_KEY) !== "false";
  const hasExplicitPosition = Boolean(window.location.hash || new URL(window.location.href).searchParams.has("t"));
  if (resumeEnabled && !hasExplicitPosition && !alreadyCheckedThisSession && isEntryPage()) {
    const saved = readResumePosition(bookId);
    if (saved?.page && saved.page !== currentPageFilename()) {
      localStorage.setItem(RESUME_BANNER_PENDING_KEY, "true");
      const anchorId = saved.anchorId || saved.elementId;
      window.location.href = anchorId ? `${saved.page}?t=${saved.audioTime ?? 0}#${anchorId}` : saved.page;
      return true;
    }
  }
  recordPageVisit();
  return false;
}
function recordPageVisit() {
  writeResumePosition(getBookId(), {
    page: currentPageFilename(),
    anchorId: void 0,
    elementId: void 0,
    audioTime: void 0
  });
}
function recordResumePosition(elm, audio2) {
  const bookId = getBookId();
  const anchor = positionAnchor(elm);
  if (!bookId || !anchor?.id) return;
  writeResumePosition(bookId, {
    page: currentPageFilename(),
    anchorId: anchor.id,
    elementId: void 0,
    audioTime: audio2?.currentTime ?? 0
  });
}
function applyResumeAudioTimeIfMatching(audio2) {
  const bookId = getBookId();
  if (!bookId) return;
  const saved = readResumePosition(bookId);
  const hashId = decodeURIComponent((window.location.hash || "").replace(/^#/, ""));
  const anchorId = saved?.anchorId || saved?.elementId;
  if (saved?.page === currentPageFilename() && anchorId && anchorId === hashId && typeof saved.audioTime === "number") {
    audio2.currentTime = saved.audioTime;
  }
}

// template/src/js/structure-sounds.js
var NOTE_SELECTOR = '.epubtype_footnote, .epubtype_endnote, .epubtype_note, [role="doc-footnote"], [role="doc-endnote"]';
var NOTES_SECTION_SELECTOR = '.epubtype_endnotes, [role="doc-endnotes"]';
var HEADING_SELECTOR = 'h1, h2, h3, h4, h5, h6, [role="heading"]';
var LIST_OR_TABLE_SELECTOR = 'ul, ol, dl, table, [role="list"], [role="table"], [role="grid"]';
var RATE = 44100;
var VOLUME = 0.35;
var PAUSE_SECONDS = 0.3;
var PAUSE_SECONDS_PER_EXTRA_SOUND = 0.25;
var SOUNDS = {
  "heading-1": [[392, 0, 0.35, "piano"], [523.25, 0.09, 0.4, "piano"]],
  "heading-2": [[440, 0, 0.3, "piano"], [587.33, 0.08, 0.35, "piano"]],
  "heading-3": [[523.25, 0, 0.25, "piano"], [659.25, 0.07, 0.3, "piano"]],
  note: [[1760, 0, 0.45, "bell"]],
  enter: [[520, 0, 0.07, "wood"], [700, 0.11, 0.07, "wood"]],
  exit: [[700, 0, 0.07, "wood"], [520, 0.11, 0.07, "wood"]],
  tick: [[1100, 0, 0.035, "wood"]]
};
var SETTINGS = [
  { key: "webbook-sound-headings", id: "webbook-sound-headings-toggle", label: "Tone before headings", sample: "heading-1" },
  { key: "webbook-sound-notes", id: "webbook-sound-notes-toggle", label: "Bell before footnotes and endnotes", sample: "note" },
  { key: "webbook-sound-lists-tables", id: "webbook-sound-lists-tables-toggle", label: "Knocks entering and leaving lists and tables", sample: "enter" }
];
var [HEADINGS, NOTES, LISTS_AND_TABLES] = SETTINGS;
var context = null;
var buffers = {};
var lastElm = null;
var soundPause = null;
var nextSound = null;
var expectedSeek = null;
function enabled({ key }) {
  try {
    return localStorage.getItem(key) === "true";
  } catch {
    return false;
  }
}
function usesAudioCues() {
  return SETTINGS.some(enabled) || readSetting("webbook-note-references") === "pause" && readSetting("webbook-note-wait-sound") === "true";
}
function renderNote(data, [frequency, start, length, timbre]) {
  const from = Math.round(start * RATE);
  const count = Math.round(length * RATE);
  for (let i = 0; i < count && from + i < data.length; i++) {
    const t = i / RATE;
    const attack = Math.min(1, i / (RATE * 4e-3));
    let sample;
    if (timbre === "bell") {
      sample = Math.exp(-t * 7) * (Math.sin(2 * Math.PI * frequency * t) + 0.5 * Math.sin(2 * Math.PI * frequency * 2.76 * t) * Math.exp(-t * 14));
    } else if (timbre === "wood") {
      sample = Math.exp(-t * 60) * (Math.sin(2 * Math.PI * frequency * t) + 0.6 * Math.sin(2 * Math.PI * frequency * 1.58 * t));
    } else {
      sample = Math.exp(-t * 9) * (Math.sin(2 * Math.PI * frequency * t) + 0.4 * Math.sin(4 * Math.PI * frequency * t) + 0.15 * Math.sin(6 * Math.PI * frequency * t));
    }
    data[from + i] += attack * sample;
  }
}
function buffer(ctx, name) {
  if (!buffers[name]) {
    const notes = SOUNDS[name];
    const length = Math.max(...notes.map(([, start, len]) => start + len)) + 0.02;
    const data = new Float32Array(Math.ceil(length * RATE));
    notes.forEach((note) => renderNote(data, note));
    const peak = data.reduce((max, sample) => Math.max(max, Math.abs(sample)), 0) || 1;
    for (let i = 0; i < data.length; i++) data[i] /= peak;
    buffers[name] = ctx.createBuffer(1, data.length, RATE);
    buffers[name].copyToChannel(data, 0);
  }
  return buffers[name];
}
function audioContext() {
  if (!context) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    context = new AudioContextClass();
  }
  return context;
}
function play(names) {
  const ctx = audioContext();
  if (!ctx || !names.length) return false;
  if (ctx.state !== "running") ctx.resume().catch(() => {
  });
  let when = ctx.currentTime;
  for (const name of names) {
    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    gain.gain.value = VOLUME;
    source.buffer = buffer(ctx, name);
    source.connect(gain).connect(ctx.destination);
    source.start(when);
    when += source.buffer.duration + 0.05;
  }
  return true;
}
function playNoteWaitSound(seconds) {
  const sources = [];
  const audio2 = pageAudio();
  let gain = null;
  const level = () => {
    if (gain) gain.gain.value = 0.08 * (audio2?.muted ? 0 : audio2?.volume ?? 1);
  };
  const stop = () => {
    audio2?.removeEventListener("volumechange", level);
    for (const source of sources.splice(0)) {
      try {
        source.stop();
      } catch {
      }
      source.disconnect();
    }
    gain?.disconnect();
    gain = null;
  };
  if (!Number.isFinite(seconds) || seconds <= 0) return stop;
  try {
    const ctx = audioContext();
    if (!ctx) return stop;
    playEvenOnSilent();
    if (ctx.state !== "running") ctx.resume().catch(() => {
    });
    gain = ctx.createGain();
    level();
    gain.connect(ctx.destination);
    audio2?.addEventListener("volumechange", level);
    const start = ctx.currentTime;
    for (let offset = 0; offset < seconds; offset += 0.5) {
      const source = ctx.createBufferSource();
      source.buffer = buffer(ctx, "tick");
      source.connect(gain);
      sources.push(source);
      source.start(start + offset);
    }
  } catch {
    stop();
  }
  return stop;
}
function pausedForSound() {
  return Boolean(soundPause);
}
function cancelSoundPause() {
  if (!soundPause) return;
  clearTimeout(soundPause);
  soundPause = null;
}
function keepSoundsForSeek() {
  expectedSeek = "keep";
}
function cuesOf(audio2) {
  return Array.from(audio2.querySelector("track")?.track?.cues || []);
}
function cueAt(audio2, time) {
  return cueAtTime(cuesOf(audio2), time);
}
function headingLevel(heading) {
  const level = Number(heading.getAttribute("aria-level") || heading.tagName.slice(1));
  return Number.isFinite(level) && level > 0 ? level : 2;
}
function listsAndTablesAround(elm) {
  const found = [];
  for (let node = elm?.closest(LIST_OR_TABLE_SELECTOR); node; node = node.parentElement?.closest(LIST_OR_TABLE_SELECTOR)) {
    if (!node.closest(`${NOTE_SELECTOR}, ${NOTES_SECTION_SELECTOR}`) && !node.querySelector(NOTE_SELECTOR)) found.push(node);
  }
  return found;
}
function soundsFor(from, to) {
  const sounds = [];
  if (enabled(LISTS_AND_TABLES)) {
    const before = listsAndTablesAround(from);
    const now = listsAndTablesAround(to);
    if (before.some((structure) => !now.includes(structure))) sounds.push("exit");
    if (now.some((structure) => !before.includes(structure))) sounds.push("enter");
  }
  const heading = to.closest(HEADING_SELECTOR);
  const note = to.closest(NOTE_SELECTOR);
  if (heading && heading !== from?.closest(HEADING_SELECTOR) && enabled(HEADINGS)) sounds.push(`heading-${Math.min(3, headingLevel(heading))}`);
  else if (note && note !== from?.closest(NOTE_SELECTOR) && enabled(NOTES)) sounds.push("note");
  return sounds;
}
function soundBefore(audio2, elm, resumeAt) {
  const sounds = soundsFor(lastElm, elm);
  lastElm = elm;
  if (!play(sounds)) return false;
  clearTimeout(nextSound);
  cancelSoundPause();
  soundPause = setTimeout(() => {
    soundPause = null;
    if (!audio2.paused) return;
    expectedSeek = "own";
    audio2.currentTime = resumeAt;
    audio2.play().catch(() => {
    });
  }, (PAUSE_SECONDS + PAUSE_SECONDS_PER_EXTRA_SOUND * (sounds.length - 1)) * 1e3);
  audio2.pause();
  return true;
}
function scheduleNextSound(audio2) {
  clearTimeout(nextSound);
  if (!SETTINGS.some(enabled) || audio2.paused || soundPause) return;
  const next = cuesOf(audio2).find((cue) => cue.startTime > audio2.currentTime + 0.01);
  const elm = next && elmForCue(next);
  if (!elm || !canPlay(elm) || !soundsFor(lastElm, elm).length) return;
  nextSound = setTimeout(() => {
    if (audio2.paused || soundPause) return;
    if (audio2.currentTime < next.startTime - 0.3 || audio2.currentTime > next.startTime + 0.15) return scheduleNextSound(audio2);
    soundBefore(audio2, elm, next.startTime);
  }, Math.max(0, ((next.startTime - audio2.currentTime) / (audio2.playbackRate || 1) - 0.03) * 1e3));
}
function soundForNarratedPhrase(elm) {
  const audio2 = pageAudio();
  if (!audio2 || audio2.paused) return;
  if (elm !== lastElm) {
    const cue = cueAt(audio2, audio2.currentTime);
    if (soundBefore(audio2, elm, cue && elmForCue(cue) === elm ? cue.startTime : audio2.currentTime)) return;
  }
  scheduleNextSound(audio2);
}
function handlePlay(audio2) {
  cancelSoundPause();
  const cue = cueAt(audio2, audio2.currentTime);
  const elm = cue && elmForCue(cue);
  if (elm && elm !== lastElm && canPlay(elm) && soundBefore(audio2, elm, audio2.currentTime - cue.startTime < 0.35 ? cue.startTime : audio2.currentTime)) return;
  scheduleNextSound(audio2);
}
function handleSeeking(audio2) {
  clearTimeout(nextSound);
  const kind = expectedSeek;
  expectedSeek = null;
  if (audio2.paused) return;
  if (kind === "own") return scheduleNextSound(audio2);
  const cue = cueAt(audio2, audio2.currentTime);
  const elm = cue && elmForCue(cue);
  if (kind === "keep") {
    if (elm && canPlay(elm) && audio2.currentTime - cue.startTime < 0.05 && soundBefore(audio2, elm, cue.startTime)) return;
  } else {
    const landed = elm || elmForCue(cuesOf(audio2).find((cue2) => cue2.startTime > audio2.currentTime) || {});
    if (landed) lastElm = landed;
  }
  scheduleNextSound(audio2);
}
var UNLOCK_EVENTS = ["pointerup", "touchend", "click", "keydown"];
function unlockOnPress() {
  const unlock = () => {
    if (!usesAudioCues()) return;
    const ctx = audioContext();
    if (!ctx) return;
    if (ctx.state !== "running") {
      ctx.resume().catch(() => {
      });
      const source = ctx.createBufferSource();
      source.buffer = ctx.createBuffer(1, 1, RATE);
      source.connect(ctx.destination);
      source.start();
      return;
    }
    UNLOCK_EVENTS.forEach((type) => document.removeEventListener(type, unlock, true));
  };
  UNLOCK_EVENTS.forEach((type) => document.addEventListener(type, unlock, true));
}
function playEvenOnSilent() {
  try {
    if (navigator.audioSession && usesAudioCues()) navigator.audioSession.type = "playback";
  } catch {
  }
}
function buildSettings() {
  const fieldset = settingsSection("narration");
  if (!fieldset) return;
  const group = document.createElement("fieldset");
  group.id = "webbook-structure-sounds";
  const legend = document.createElement("legend");
  legend.textContent = "Structure sounds";
  group.append(legend);
  for (const setting of SETTINGS) {
    if (document.getElementById(setting.id)) continue;
    const row = document.createElement("div");
    const label = document.createElement("label");
    label.htmlFor = setting.id;
    label.textContent = setting.label;
    const toggle = document.createElement("input");
    toggle.type = "checkbox";
    toggle.id = setting.id;
    toggle.checked = enabled(setting);
    toggle.addEventListener("change", () => {
      try {
        localStorage.setItem(setting.key, String(toggle.checked));
      } catch {
      }
      if (toggle.checked) {
        playEvenOnSilent();
        play([setting.sample]);
      }
    });
    row.append(label, toggle);
    group.append(row);
  }
  appendSetting("narration", group);
}
function initStructureSounds() {
  buildSettings();
  playEvenOnSilent();
  unlockOnPress();
  const on = (type, handler) => document.addEventListener(type, (e) => {
    if (e.target === pageAudio()) handler(e.target);
  }, { capture: true });
  on("play", (audio2) => {
    if (!audio2.paused) handlePlay(audio2);
  });
  on("pause", () => clearTimeout(nextSound));
  on("seeking", handleSeeking);
  on("ratechange", (audio2) => scheduleNextSound(audio2));
}

// template/src/js/color-contrast.js
var HIGHLIGHT_PALETTE = ["#ffdd00", "#a14d00", "#7fdbff", "#5b3cc4", "#fff59d", "#1a237e"];
var LINE_BELOW_PALETTE = ["#000000", "#ffffff", ...HIGHLIGHT_PALETTE];
var MIN_HIGHLIGHT_CONTRAST = 3;
var LIGHT_PAGE_PALETTE = ["#ffe066", "#9fd3ff", "#7cc3ff"];
var MIN_LIGHT_PAGE_DIFFERENCE = 1.2;
var MIN_TEXT_CONTRAST = 4.5;
var BLACK = { r: 0, g: 0, b: 0, a: 1 };
var WHITE = { r: 255, g: 255, b: 255, a: 1 };
function parseColor(value) {
  const text = String(value ?? "").trim().toLowerCase();
  if (text === "transparent") return { r: 0, g: 0, b: 0, a: 0 };
  const hex = text.match(/^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/);
  if (hex) {
    const digits = hex[1].length <= 4 ? [...hex[1]].map((digit) => digit + digit).join("") : hex[1];
    const [r, g, b, a = 255] = digits.match(/../g).map((pair) => parseInt(pair, 16));
    return { r, g, b, a: a / 255 };
  }
  const rgb = text.match(/^rgba?\(([^)]*)\)$/);
  if (rgb) {
    const parts = rgb[1].split(/[\s,/]+/).filter(Boolean);
    if (parts.length < 3) return null;
    const [r, g, b] = parts.slice(0, 3).map((part) => part.endsWith("%") ? parseFloat(part) * 2.55 : parseFloat(part));
    return finite({ r, g, b, a: alpha(parts[3]) });
  }
  const srgb = text.match(/^color\(srgb\s+([^)]*)\)$/);
  if (srgb) {
    const parts = srgb[1].split(/[\s/]+/).filter(Boolean);
    if (parts.length < 3) return null;
    const [r, g, b] = parts.slice(0, 3).map((part) => (part.endsWith("%") ? parseFloat(part) / 100 : parseFloat(part)) * 255);
    return finite({ r, g, b, a: alpha(parts[3]) });
  }
  return null;
}
function alpha(part) {
  if (part === void 0) return 1;
  return part.endsWith("%") ? parseFloat(part) / 100 : parseFloat(part);
}
function finite(color) {
  return Object.values(color).every(Number.isFinite) ? color : null;
}
function toHex({ r, g, b }) {
  return `#${[r, g, b].map((channel) => Math.round(Math.max(0, Math.min(255, channel))).toString(16).padStart(2, "0")).join("")}`;
}
function composite(top, bottom) {
  const mix = (channel) => top[channel] * top.a + bottom[channel] * (1 - top.a);
  return { r: mix("r"), g: mix("g"), b: mix("b"), a: 1 };
}
function relativeLuminance({ r, g, b }) {
  const [red, green, blue] = [r, g, b].map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}
function contrastRatio(first, second) {
  const [lighter, darker] = [relativeLuminance(first), relativeLuminance(second)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
}
function readableTextOn(background) {
  return contrastRatio(background, BLACK) >= contrastRatio(background, WHITE) ? BLACK : WHITE;
}
function pickHighlight(backgrounds, palette = HIGHLIGHT_PALETTE) {
  const colors = palette.map(parseColor);
  const worst = (color) => Math.min(...backgrounds.map((background) => contrastRatio(color, background)));
  const passing = colors.find((color) => worst(color) >= MIN_HIGHLIGHT_CONTRAST);
  return passing || colors.reduce((best, color) => worst(color) > worst(best) ? color : best);
}
function automaticHighlight(backgrounds) {
  const light = backgrounds.length && backgrounds.every((background) => readableTextOn(background) === BLACK);
  if (light) {
    const colors = LIGHT_PAGE_PALETTE.map(parseColor);
    const found = colors.find((color) => backgrounds.every((background) => contrastRatio(color, background) >= MIN_LIGHT_PAGE_DIFFERENCE));
    if (found) return found;
  }
  return pickHighlight(backgrounds);
}
function highlightColors(backgrounds, customColor2 = null, style = "background") {
  const custom = customColor2 ? parseColor(customColor2) : null;
  const background = custom?.a === 1 ? custom : automaticHighlight(backgrounds);
  const line = style === "both" ? pickHighlight(backgrounds, LINE_BELOW_PALETTE) : pickHighlight(backgrounds, [toHex(background), ...LINE_BELOW_PALETTE]);
  return { background, text: readableTextOn(background), line };
}
var FOCUS_PALETTE = ["#005fcc", "#8ec5ff"];
var SEARCH_PALETTE = ["#005fcc", "#d65db1", ...HIGHLIGHT_PALETTE];
function pageColorTokens(text, background) {
  const narration = toHex(automaticHighlight([background]));
  const search = pickHighlight([background], SEARCH_PALETTE.filter((color) => color !== narration));
  return {
    focus: pickHighlight([background], [...FOCUS_PALETTE, toHex(text), "#000000", "#ffffff"]),
    searchBackground: search,
    searchText: readableTextOn(search),
    muted: text,
    scheme: relativeLuminance(background) < 0.18 ? "dark" : "light"
  };
}

// template/src/js/highlight-settings.js
var AUTO_KEY = "webbook-highlight-auto";
var COLOR_KEY = "webbook-highlight-color";
var STYLE_KEY = "webbook-highlight-style";
var STYLES = [
  ["background", "Background"],
  ["underline", "Underline"],
  ["both", "Background and underline"]
];
var WHITE2 = parseColor("#ffffff");
var BLACK2 = parseColor("#000000");
var customColor = null;
var highlightStyle = "background";
var lastBasis = null;
function themeBackground() {
  return parseColor(window.getComputedStyle(document.body).backgroundColor);
}
function backgroundBehind(elm) {
  const layers = [];
  for (let node = elm; node?.nodeType === window.Node.ELEMENT_NODE; node = node.parentElement) {
    const style = window.getComputedStyle(node);
    if (style.backgroundImage !== "none" || style.filter !== "none" || style.mixBlendMode !== "normal" || Number(style.opacity) < 1) return null;
    const color = parseColor(style.backgroundColor);
    if (!color) return null;
    if (color.a > 0) layers.push(color);
    if (color.a >= 1) break;
  }
  if (!layers.length || layers.at(-1).a < 1) {
    const theme = themeBackground();
    if (!theme || theme.a < 1) return null;
    layers.push(theme);
  }
  return layers.slice(0, -1).reduceRight((below, layer) => composite(layer, below), layers.at(-1));
}
function updateHighlightColors(elm = lastNarratedElement()) {
  const known = elm ? backgroundBehind(elm) : themeBackground();
  const backgrounds = known?.a === 1 ? [known] : [themeBackground(), WHITE2, BLACK2].filter((color) => color?.a === 1);
  const basis = `${customColor}|${highlightStyle}|${backgrounds.map(toHex).join()}`;
  if (basis === lastBasis) return;
  lastBasis = basis;
  const colors = highlightColors(backgrounds, customColor, highlightStyle);
  const style = document.body.style;
  style.setProperty("--webbook-highlight-bg", toHex(colors.background));
  style.setProperty("--webbook-highlight-fg", toHex(colors.text));
  style.setProperty("--webbook-highlight-line", toHex(colors.line));
}
function applyHighlightStyle(value) {
  highlightStyle = value;
  if (value === "background") document.documentElement.removeAttribute("data-webbook-highlight-style");
  else document.documentElement.setAttribute("data-webbook-highlight-style", value);
  updateHighlightColors();
}
function buildStyleSetting() {
  let select = document.getElementById("webbook-highlight-style-options");
  if (select) return select;
  const colorRow2 = document.getElementById("webbook-color");
  if (!colorRow2) return null;
  const row = document.createElement("div");
  row.id = "webbook-highlight-style";
  const label = document.createElement("label");
  label.htmlFor = "webbook-highlight-style-options";
  label.textContent = "Highlight style";
  select = document.createElement("select");
  select.id = "webbook-highlight-style-options";
  for (const [value, text] of STYLES) select.append(optionElement(value, text));
  row.append(label, select);
  appendSetting("colors", row);
  return select;
}
function initHighlightSettings() {
  const autoToggle = document.querySelector("#webbook-highlight-auto-toggle");
  const colorPicker = document.querySelector("#webbook-color-picker");
  if (autoToggle && colorPicker) {
    const isAuto = readSetting(AUTO_KEY) !== "false";
    colorPicker.value = readSetting(COLOR_KEY) || "#ffdd00";
    autoToggle.checked = isAuto;
    colorPicker.disabled = isAuto;
    customColor = isAuto ? null : colorPicker.value;
    autoToggle.addEventListener("change", () => {
      writeSetting(AUTO_KEY, String(autoToggle.checked));
      colorPicker.disabled = autoToggle.checked;
      customColor = autoToggle.checked ? null : colorPicker.value;
      updateHighlightColors();
    });
    colorPicker.addEventListener("input", () => {
      writeSetting(COLOR_KEY, colorPicker.value);
      customColor = colorPicker.value;
      updateHighlightColors();
    });
  }
  const select = buildStyleSetting();
  const savedStyle = readSetting(STYLE_KEY);
  const styleValue = STYLES.some(([value]) => value === savedStyle) ? savedStyle : "background";
  if (select) {
    select.value = styleValue;
    select.addEventListener("change", () => {
      writeSetting(STYLE_KEY, select.value);
      applyHighlightStyle(select.value);
    });
  }
  applyHighlightStyle(styleValue);
  document.addEventListener("webbook:narrationpositionchange", (e) => updateHighlightColors(e.detail?.element));
  const observer = new window.MutationObserver(() => {
    lastBasis = null;
    updateHighlightColors();
  });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
}

// template/src/js/text-spacing.js
var SETTINGS2 = [
  {
    key: "webbook-line-height",
    id: "webbook-line-height-options",
    label: "Line spacing",
    property: "--webbook-line-height",
    flag: "data-webbook-line-height",
    // No 1.5: tighter than the reader's own 1.6
    steps: [["", "1.6"], ["1.8", "1.8"], ["2", "2"]]
  },
  {
    key: "webbook-letter-spacing",
    id: "webbook-letter-spacing-options",
    label: "Letter spacing",
    property: "--webbook-letter-spacing",
    flag: "data-webbook-letter-spacing",
    steps: [["", "No extra"], ["wider", "Wider", "0.05em"], ["widest", "Widest", "0.12em"]]
  },
  {
    key: "webbook-word-spacing",
    id: "webbook-word-spacing-options",
    label: "Word spacing",
    property: "--webbook-word-spacing",
    flag: "data-webbook-word-spacing",
    steps: [["", "No extra"], ["wider", "Wider", "0.16em"], ["widest", "Widest", "0.3em"]]
  },
  // A comfortable number of characters a line, kept apart at large text sizes by fractions of the
  // width the text has (the window, less the page arrows beside it). See lineLength().
  // Medium when nothing's saved (no separate fixed width)
  {
    key: "webbook-line-length",
    id: "webbook-line-length-options",
    label: "Line length",
    property: "--webbook-line-length",
    initial: "medium",
    steps: [
      ["narrow", "Narrow", lineLength("narrow")],
      ["medium", "Medium", lineLength("medium")],
      ["wide", "Wide", lineLength("wide")]
    ]
  }
];
function lineLength(step) {
  const floor = "min(100%, 20rem)";
  const narrow = `max(min(50ch, 50%), ${floor})`;
  if (step === "narrow") return narrow;
  if (step === "wide") return "100%";
  return `max(min(65ch, 75%), ${narrow})`;
}
function stepFor(setting, value) {
  const find = (wanted) => setting.steps.find(([stepValue]) => stepValue === wanted);
  return find(value) || find(setting.initial ?? "") || setting.steps[0];
}
function apply(setting, value) {
  const [stepValue, , css = stepValue] = stepFor(setting, value);
  const root2 = document.documentElement;
  if (setting.key === "webbook-line-length") root2.setAttribute("data-webbook-line-length", stepValue);
  if (stepValue) {
    root2.style.setProperty(setting.property, css || ({ "webbook-line-height": "1.6", "webbook-letter-spacing": "0em", "webbook-word-spacing": "0em" }[setting.key] ?? css));
    if (setting.flag) root2.setAttribute(setting.flag, "");
  } else {
    root2.style.removeProperty(setting.property);
    if (setting.flag) root2.removeAttribute(setting.flag);
  }
  document.dispatchEvent(new document.defaultView.CustomEvent("webbook:layoutchange"));
}
function buildSettings2() {
  if (document.getElementById("webbook-text-spacing")) return;
  const fieldset = settingsSection("text");
  if (!fieldset) return;
  const group = document.createElement("fieldset");
  group.id = "webbook-text-spacing";
  const legend = document.createElement("legend");
  legend.textContent = "Text spacing";
  group.append(legend);
  for (const setting of SETTINGS2) {
    const row = document.createElement("div");
    const label = document.createElement("label");
    label.htmlFor = setting.id;
    label.textContent = setting.label;
    const select = document.createElement("select");
    select.id = setting.id;
    for (const [value, text] of setting.steps) select.append(optionElement(value, text));
    row.append(label, select);
    group.append(row);
  }
  appendSetting("text", group);
}
function initTextSpacing() {
  buildSettings2();
  for (const setting of SETTINGS2) {
    const stored = readSetting(setting.key);
    const value = stepFor(setting, stored || "")[0];
    apply(setting, value);
    const select = document.getElementById(setting.id);
    if (!select) continue;
    select.value = value;
    select.addEventListener("change", () => {
      const value2 = select.value;
      writeSetting(setting.key, value2);
      apply(setting, value2);
    });
  }
}

// template/src/js/published-colors.js
var WHITE3 = { r: 255, g: 255, b: 255, a: 1 };
var PROPERTIES = [
  "--webbook-published-fg",
  "--webbook-published-bg",
  "--webbook-published-focus",
  "--webbook-published-muted",
  "--webbook-published-search-bg",
  "--webbook-published-search-fg",
  "--webbook-published-scheme"
];
var ATTRIBUTE = "data-webbook-published-colors";
function bookColors() {
  const main = document.querySelector("main");
  if (!main) return null;
  const style = window.getComputedStyle(main);
  let background = parseColor(style.backgroundColor);
  background = !background || background.a === 0 ? WHITE3 : background.a < 1 ? composite(background, WHITE3) : background;
  let text = parseColor(style.color) ?? readableTextOn(background);
  if (text.a < 1) text = composite(text, background);
  if (contrastRatio(text, background) < MIN_TEXT_CONTRAST) text = readableTextOn(background);
  return [text, background];
}
function clear(root2) {
  root2.removeAttribute(ATTRIBUTE);
  for (const property of PROPERTIES) root2.style.removeProperty(property);
}
function applyPublishedColors() {
  const root2 = document.documentElement;
  if (!publishedAppearanceActive()) {
    clear(root2);
    return null;
  }
  clear(root2);
  const pair = bookColors();
  if (!pair) return null;
  const [text, background] = pair;
  const tokens = pageColorTokens(text, background);
  const values = [
    toHex(text),
    toHex(background),
    toHex(tokens.focus),
    toHex(tokens.muted),
    toHex(tokens.searchBackground),
    toHex(tokens.searchText),
    tokens.scheme
  ];
  PROPERTIES.forEach((property, i) => root2.style.setProperty(property, values[i]));
  root2.setAttribute(ATTRIBUTE, "");
  for (const element of [root2, document.body]) {
    element.classList.toggle("webbook-dark", tokens.scheme === "dark");
    element.classList.toggle("webbook-light", tokens.scheme !== "dark");
  }
  updateHighlightColors();
  return tokens.scheme;
}
function watchPublishedStyles(update) {
  for (const link of document.querySelectorAll("link[data-webbook-publisher-style]")) {
    if (link.dataset.webbookColorsWatched) continue;
    link.dataset.webbookColorsWatched = "true";
    link.addEventListener("load", update);
  }
}

// template/src/js/page-colors.js
var COLORS_KEY = "webbook-colors";
var TEXT_KEY = "webbook-colors-text";
var TEXT_AUTO_KEY = "webbook-colors-text-auto";
var BACKGROUND_KEY = "webbook-colors-background";
var PRESETS = [
  ["cream", "Black on cream", "#000000", "#faf4e1"],
  // A real tan, not a second cream: the two looked nearly the same (user, 2026-11-10)
  ["sepia", "Dark brown on sepia", "#3b2a1a", "#e9d8b4"],
  ["gray", "Light gray on dark gray", "#e6e6e6", "#1f1f1f"],
  ["blue", "Yellow on dark blue", "#ffeb3b", "#0b1f4b"]
];
var STANDARD = [
  ["light", "Light"],
  ["dark", "Dark"]
];
var MIN_CONTRAST = 4.5;
var APPEARANCE_KEY = "webbook-appearance";
var MIGRATED_KEY = "webbook-appearance-migrated";
var systemDark = () => window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
function colorRow(id, text) {
  const label = document.createElement("label");
  label.htmlFor = id;
  label.textContent = text;
  const input = document.createElement("input");
  input.type = "color";
  input.id = id;
  input.setAttribute("aria-describedby", "webbook-colors-contrast");
  return [label, input];
}
function buildSettings3() {
  if (document.getElementById("webbook-colors")) return;
  const appearance = document.getElementById("webbook-appearance");
  if (!appearance) return;
  const row = document.createElement("div");
  row.id = "webbook-colors";
  const label = document.createElement("label");
  label.htmlFor = "webbook-colors-options";
  label.textContent = "Page colors";
  const select = document.createElement("select");
  select.id = "webbook-colors-options";
  select.append(optionElement("", "Automatic (system light or dark)"));
  for (const [value, text] of STANDARD) select.append(optionElement(value, text));
  for (const [value, text] of PRESETS) select.append(optionElement(value, text));
  select.append(optionElement("custom", "Custom"));
  row.append(label, select);
  const custom = document.createElement("div");
  custom.id = "webbook-colors-custom";
  custom.hidden = true;
  const contrast = document.createElement("p");
  contrast.id = "webbook-colors-contrast";
  const autoLabel = document.createElement("label");
  autoLabel.htmlFor = "webbook-colors-text-auto-toggle";
  autoLabel.textContent = "Automatic text color";
  const autoToggle = document.createElement("input");
  autoToggle.type = "checkbox";
  autoToggle.id = "webbook-colors-text-auto-toggle";
  custom.append(
    ...colorRow("webbook-colors-background-picker", "Background color"),
    autoLabel,
    autoToggle,
    ...colorRow("webbook-colors-text-picker", "Text color"),
    contrast
  );
  appearance.remove();
  appendSetting("colors", row);
  appendSetting("colors", custom);
}
function schemeFor(choice, background) {
  if (!choice) return "auto";
  return background ? pageColorTokens(readableTextOn(background), background).scheme : "auto";
}
function applyScheme(scheme) {
  writeSetting(APPEARANCE_KEY, scheme);
  const dark = scheme === "dark" || scheme === "auto" && systemDark();
  for (const element of [document.documentElement, document.body]) {
    element.classList.toggle("webbook-dark", dark);
    element.classList.toggle("webbook-light", !dark);
  }
}
function contrastMessage(text, background) {
  const ratio = Math.floor(contrastRatio(text, background) * 10) / 10;
  return ratio < MIN_CONTRAST ? `Contrast ${ratio}:1. This text may be hard to read.` : `Contrast ${ratio}:1.`;
}
function apply2(text, background) {
  const root2 = document.documentElement;
  const properties = [
    "--webbook-page-fg",
    "--webbook-page-bg",
    "--webbook-page-focus",
    "--webbook-page-muted",
    "--webbook-page-search-bg",
    "--webbook-page-search-fg",
    "--webbook-page-scheme"
  ];
  if (!text || !background) {
    root2.removeAttribute("data-webbook-colors");
    for (const property of properties) root2.style.removeProperty(property);
  } else {
    const tokens = pageColorTokens(text, background);
    const values = [
      toHex(text),
      toHex(background),
      toHex(tokens.focus),
      toHex(tokens.muted),
      toHex(tokens.searchBackground),
      toHex(tokens.searchText),
      tokens.scheme
    ];
    properties.forEach((property, i) => root2.style.setProperty(property, values[i]));
    root2.setAttribute("data-webbook-colors", "");
  }
  updateHighlightColors();
}
function presetColors(value) {
  if (value === "light") return [parseColor("#111111"), parseColor("#fafafa")];
  if (value === "dark") return [parseColor("#ffffff"), parseColor("#000000")];
  const preset = PRESETS.find(([presetValue]) => presetValue === value);
  return preset ? [parseColor(preset[2]), parseColor(preset[3])] : [null, null];
}
function initPageColors() {
  buildSettings3();
  const select = document.getElementById("webbook-colors-options");
  const custom = document.getElementById("webbook-colors-custom");
  const textPicker = document.getElementById("webbook-colors-text-picker");
  const autoToggle = document.getElementById("webbook-colors-text-auto-toggle");
  const backgroundPicker = document.getElementById("webbook-colors-background-picker");
  const contrast = document.getElementById("webbook-colors-contrast");
  if (readSetting(MIGRATED_KEY) === null) {
    const legacy = readSetting(APPEARANCE_KEY);
    if (readSetting(COLORS_KEY) === null && (legacy === "light" || legacy === "dark")) writeSetting(COLORS_KEY, legacy);
    writeSetting(MIGRATED_KEY, "true");
  }
  const saved = readSetting(COLORS_KEY);
  const savedValue = saved === "original" ? "" : saved ?? "";
  const migratedValue = savedValue === "white" ? "light" : savedValue === "black" ? "dark" : savedValue;
  const value = migratedValue === "custom" || STANDARD.some(([choice]) => choice === migratedValue) || PRESETS.some(([presetValue]) => presetValue === migratedValue) ? migratedValue : "";
  const savedText = parseColor(readSetting(TEXT_KEY));
  const savedBackground = parseColor(readSetting(BACKGROUND_KEY));
  const themeText = parseColor(window.getComputedStyle(document.body).color) || parseColor("#111111");
  const themeBackground2 = parseColor(window.getComputedStyle(document.body).backgroundColor) || parseColor("#fafafa");
  if (textPicker) textPicker.value = toHex(savedText?.a === 1 ? savedText : themeText);
  if (backgroundPicker) backgroundPicker.value = toHex(savedBackground?.a === 1 ? savedBackground : themeBackground2);
  if (autoToggle) autoToggle.checked = readSetting(TEXT_AUTO_KEY) !== "false";
  const followBackground = (persist = true) => {
    const auto = autoToggle?.checked ?? false;
    if (textPicker) textPicker.disabled = auto;
    const background = parseColor(backgroundPicker?.value);
    if (!auto || !background || !textPicker) return;
    textPicker.value = toHex(readableTextOn(background));
    if (persist) writeSetting(TEXT_KEY, textPicker.value);
  };
  followBackground(false);
  const current = (choice) => choice === "custom" ? [parseColor(textPicker?.value), parseColor(backgroundPicker?.value)] : presetColors(choice);
  const showChoice = (choice) => {
    if (custom) custom.hidden = choice !== "custom";
    const [text, background] = current(choice);
    apply2(...publishedAppearanceActive() ? [null, null] : [text, background]);
    if (!applyPublishedColors()) applyScheme(schemeFor(choice, background));
    if (contrast && choice === "custom" && text && background) contrast.textContent = contrastMessage(text, background);
  };
  showChoice(value);
  const refresh = () => {
    watchPublishedStyles(refresh);
    showChoice(select?.value ?? value);
  };
  watchPublishedStyles(refresh);
  document.addEventListener("webbook:appearancechange", refresh);
  const systemScheme = window.matchMedia?.("(prefers-color-scheme: dark)");
  systemScheme?.addEventListener("change", () => {
    const choice = select?.value ?? value;
    if (!choice) showChoice(choice);
  });
  if (!select) return;
  select.value = value;
  select.addEventListener("change", () => {
    writeSetting(COLORS_KEY, select.value || "auto");
    if (select.value === "custom") {
      writeSetting(TEXT_KEY, textPicker?.value || "");
      writeSetting(BACKGROUND_KEY, backgroundPicker?.value || "");
      writeSetting(TEXT_AUTO_KEY, String(autoToggle?.checked ?? true));
    }
    showChoice(select.value);
  });
  for (const [picker, key] of [[textPicker, TEXT_KEY], [backgroundPicker, BACKGROUND_KEY]]) {
    picker?.addEventListener("input", () => {
      if (picker === backgroundPicker) followBackground();
      writeSetting(key, picker.value);
      showChoice("custom");
    });
    picker?.addEventListener("change", () => {
      if (contrast) announceReaderAction(contrast.textContent, { show: false });
    });
  }
  autoToggle?.addEventListener("change", () => {
    writeSetting(TEXT_AUTO_KEY, String(autoToggle.checked));
    followBackground();
    showChoice("custom");
    if (contrast) announceReaderAction(contrast.textContent, { show: false });
  });
}

// template/src/js/settings.js
var KEYBOARD_SHORTCUTS_STORAGE_KEY = "webbook-keyboard-shortcuts";
var shortcutsEnabled = true;
var shortcutsStorageUnavailable = false;
function keyboardShortcutsEnabled() {
  if (!shortcutsStorageUnavailable) {
    try {
      shortcutsEnabled = localStorage.getItem(KEYBOARD_SHORTCUTS_STORAGE_KEY) !== "false";
    } catch {
      shortcutsStorageUnavailable = true;
    }
  }
  return shortcutsEnabled;
}
function initKeyboardShortcuts() {
  const fieldset = settingsSection("keyboard");
  if (!fieldset) return;
  let toggle = document.querySelector("#webbook-keyboard-shortcuts-toggle");
  if (!toggle) {
    const row = document.createElement("div");
    const label = document.createElement("label");
    label.htmlFor = "webbook-keyboard-shortcuts-toggle";
    label.textContent = "Keyboard shortcuts";
    toggle = document.createElement("input");
    toggle.type = "checkbox";
    toggle.id = "webbook-keyboard-shortcuts-toggle";
    row.append(label, toggle);
    appendSetting("keyboard", row);
  }
  toggle.checked = keyboardShortcutsEnabled();
  toggle.addEventListener("change", () => {
    shortcutsEnabled = toggle.checked;
    try {
      localStorage.setItem(KEYBOARD_SHORTCUTS_STORAGE_KEY, String(toggle.checked));
      shortcutsStorageUnavailable = false;
    } catch {
      shortcutsStorageUnavailable = true;
    }
  });
}
function initPageNavigation() {
  const input = document.querySelector("#goto-page");
  const button = document.querySelector("#webbook-goto-page-go");
  const datalist = document.querySelector("#pages");
  if (!input || !button || !datalist) return;
  const goToPage = () => {
    const option = findPageOption(input.value, datalist);
    const href = option?.dataset.href;
    if (!href) {
      input.setAttribute("aria-invalid", "true");
      return;
    }
    input.removeAttribute("aria-invalid");
    navigateTo(href);
  };
  button.addEventListener("click", goToPage);
  input.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    goToPage();
  });
  input.addEventListener("input", (e) => {
    input.removeAttribute("aria-invalid");
    const picked = e.inputType === "insertReplacementText" || e.inputType === void 0;
    if (picked && findPageOption(input.value, datalist)) goToPage();
  });
}
function findPageOption(value, datalist) {
  const normalizedValue = value.trim().toLowerCase();
  if (!normalizedValue) return null;
  return Array.from(datalist.options).find((option) => {
    const optionValue = option.value.trim().toLowerCase();
    const optionLabel = option.label.trim().toLowerCase();
    return optionValue === normalizedValue || optionLabel === normalizedValue;
  }) ?? null;
}
function initFontSize() {
  const range = document.querySelector("#webbook-font-size-range");
  const reset = document.querySelector("#webbook-reset-font-size");
  if (!range) return;
  const saved = readSetting("webbook-font-size");
  const size = saved && saved !== "original" ? saved : "100";
  range.value = size;
  applyFontSize(size, false);
  range.addEventListener("input", () => applyFontSize(range.value));
  reset?.addEventListener("click", () => {
    range.value = "100";
    applyFontSize("100");
  });
}
function applyFontSize(size, persist = true) {
  const numericSize = parseInt(size, 10);
  const normalizedSize = Number.isFinite(numericSize) ? numericSize : 100;
  if (persist) writeSetting("webbook-font-size", String(normalizedSize));
  document.documentElement.toggleAttribute("data-webbook-font-size", true);
  document.documentElement.style.setProperty("--webbook-main-font-size", `${normalizedSize}%`);
  document.documentElement.style.setProperty("--webbook-font-scale", String(normalizedSize / 100));
  const range = document.querySelector("#webbook-font-size-range");
  if (range) range.setAttribute("aria-valuetext", `${normalizedSize}%`);
  const main = document.querySelector("main");
  if (main) main.style.removeProperty("font-size");
  const display = document.querySelector("#webbook-font-size-value");
  if (display) display.textContent = `${normalizedSize}%`;
  document.dispatchEvent(new document.defaultView.CustomEvent("webbook:layoutchange"));
}
function initFontFamily() {
  const select = document.querySelector("#webbook-font-family-options");
  if (!select) return;
  const savedFont = readSetting("webbook-font-family");
  const font = ["system-ui", "sans-serif", "serif"].includes(savedFont) ? savedFont : "system-ui";
  select.value = font;
  applyFontFamily(font);
  select.addEventListener("change", () => {
    writeSetting("webbook-font-family", select.value);
    applyFontFamily(select.value);
  });
}
function applyFontFamily(font) {
  document.documentElement.toggleAttribute("data-webbook-font-family", true);
  document.documentElement.style.setProperty("--webbook-main-font-family", font);
  const main = document.querySelector("main");
  if (main) main.style.removeProperty("font-family");
  document.dispatchEvent(new document.defaultView.CustomEvent("webbook:layoutchange"));
}
function initDialogBackdropBlur() {
  const toggle = document.querySelector("#webbook-dialog-blur-toggle");
  const enabled2 = localStorage.getItem("webbook-dialog-backdrop-blur") !== "false";
  if (toggle) {
    toggle.checked = enabled2;
    toggle.addEventListener("change", () => {
      localStorage.setItem("webbook-dialog-backdrop-blur", toggle.checked);
      applyDialogBackdropBlur(toggle.checked);
    });
  }
  applyDialogBackdropBlur(enabled2);
}
function applyDialogBackdropBlur(enabled2) {
  document.body.classList.toggle("webbook-dialog-backdrop-blur", enabled2);
}
function initRate() {
  const rateRange = document.querySelector("#webbook-rate-range");
  if (!rateRange) return;
  const rate = localStorage.getItem("webbook-rate") || "100";
  rateRange.value = rate;
  applyRate(rate);
  rateRange.addEventListener("input", () => applyRate(rateRange.value));
  document.querySelector("#webbook-reset-rate")?.addEventListener("click", () => {
    rateRange.value = "100";
    applyRate("100");
  });
}
function applyRate(rate) {
  localStorage.setItem("webbook-rate", rate);
  const display = document.querySelector("#webbook-rate-value");
  if (display) display.textContent = `${rate}%`;
  const range = document.querySelector("#webbook-rate-range");
  if (range) range.setAttribute("aria-valuetext", `${rate}%`);
  const audio2 = pageAudio();
  if (audio2) audio2.playbackRate = parseInt(rate, 10) / 100;
}
function initSettingActions() {
  for (const [id, label, selector, delta, announcement, code] of [
    ["rate-down", "Slower", "#webbook-rate-range", -10, "Narration speed", "Comma"],
    ["rate-up", "Faster", "#webbook-rate-range", 10, "Narration speed", "Period"],
    ["font-smaller", "Smaller text", "#webbook-font-size-range", -10, "Text size", "Minus"],
    ["font-larger", "Larger text", "#webbook-font-size-range", 10, "Text size", "Equal"]
  ]) {
    const nextValue = (range) => Math.max(Number(range.min || 50), Math.min(Number(range.max || 200), Number(range.value) + delta));
    registerAction({
      id,
      label,
      group: id.startsWith("rate-") ? "Narration" : "Reading",
      defaultKeys: [{ code, alt: true, shift: true }],
      isAvailable: () => {
        const range = document.querySelector(selector);
        return Boolean(range && !range.disabled && nextValue(range) !== Number(range.value));
      },
      run: () => {
        const range = document.querySelector(selector);
        range.value = String(nextValue(range));
        range.dispatchEvent(new Event("input", { bubbles: true }));
        announceReaderAction(`${announcement} ${range.value} percent.`);
      }
    });
  }
}
function initSettings() {
  settingsSection("colors");
  initPageNavigation();
  initPageColors();
  initDialogBackdropBlur();
  initHighlightSettings();
  initFontSize();
  initFontFamily();
  initTextSpacing();
  initRate();
  initKeyboardShortcuts();
  initSettingActions();
}

// template/src/js/keyboard-shortcuts.js
var STORAGE_KEY = "webbook-keyboard-shortcut-map";
var MODIFIERS = ["shift", "alt", "ctrl", "meta"];
var REPEAT_ACTIONS = /* @__PURE__ */ new Set(["rate-down", "rate-up", "font-smaller", "font-larger"]);
var KEY_NAMES = {
  BracketLeft: ["[", "Left bracket"],
  BracketRight: ["]", "Right bracket"],
  Backslash: ["\\", "Backslash"],
  IntlBackslash: ["\\", "Backslash"],
  Comma: [",", "Comma"],
  Period: [".", "Period"],
  Slash: ["/", "Slash"],
  Semicolon: [";", "Semicolon"],
  Quote: ["'", "Apostrophe"],
  Minus: ["-", "Minus"],
  Equal: ["=", "Equals"],
  Backquote: ["`", "Backquote"],
  Escape: ["Escape", "Escape"],
  Backspace: ["Backspace", "Backspace"],
  Delete: ["Delete", "Delete"],
  Insert: ["Insert", "Insert"],
  Home: ["Home", "Home"],
  End: ["End", "End"],
  PageUp: ["Page Up", "Page up"],
  PageDown: ["Page Down", "Page down"],
  ArrowUp: ["\u2191", "Up arrow"],
  ArrowDown: ["\u2193", "Down arrow"],
  ArrowLeft: ["\u2190", "Left arrow"],
  ArrowRight: ["\u2192", "Right arrow"],
  NumpadAdd: ["Numpad +", "Numpad plus"],
  NumpadSubtract: ["Numpad \u2212", "Numpad minus"],
  NumpadMultiply: ["Numpad *", "Numpad multiply"],
  NumpadDivide: ["Numpad /", "Numpad divide"],
  NumpadDecimal: ["Numpad .", "Numpad decimal"],
  NumpadEqual: ["Numpad =", "Numpad equals"],
  IntlRo: ["IntlRo", "International Ro key"],
  IntlYen: ["\xA5", "Yen"]
};
var MAC_KEY_NAMES = {
  Backspace: ["\u232B", "Delete"],
  Delete: ["\u2326", "Forward delete"]
};
var SPOKEN_CHARACTERS = Object.fromEntries(Object.values(KEY_NAMES).map(([key, name]) => [key, name]));
var changes = {};
var capturing = false;
var initialized = false;
var layoutMap = null;
function keySpecForEvent(event) {
  return { code: event.code, shift: event.shiftKey, alt: event.altKey, ctrl: event.ctrlKey, meta: event.metaKey };
}
function normalizeKeySpec(spec) {
  if (!spec || typeof spec !== "object" || typeof spec.code !== "string") return null;
  if (!Object.hasOwn(KEY_NAMES, spec.code) && !/^(Key[A-Z]|Digit[0-9]|Numpad[0-9]|F([1-9]|1[0-9]|2[0-4]))$/.test(spec.code)) return null;
  if (MODIFIERS.some((name) => spec[name] !== void 0 && typeof spec[name] !== "boolean")) return null;
  return { code: spec.code, ...Object.fromEntries(MODIFIERS.map((name) => [name, spec[name] === true])) };
}
function sameKey(first, second) {
  return first.code === second.code && MODIFIERS.every((name) => Boolean(first[name]) === Boolean(second[name]));
}
function shortcutRejection(spec, actionId) {
  if (["Tab", "Enter", "NumpadEnter", "Space"].includes(spec.code)) {
    return "Tab, Enter and Space are reserved for moving between and activating controls.";
  }
  if (spec.code === "Escape" && actionId !== "skip-past") return "Escape is reserved for Skip past.";
  if (!normalizeKeySpec(spec)) return "This key cannot be used as a shortcut. Choose another key.";
  return "";
}
function isBrowseModeKey(spec) {
  if (spec.shift && !spec.alt && !spec.ctrl && !spec.meta && ["Comma", "Period"].includes(spec.code)) return true;
  return !MODIFIERS.some((name) => spec[name]) && (/^Key[A-Z]$/.test(spec.code) || ["Comma", "Minus", "Semicolon", "Slash", "Quote"].includes(spec.code));
}
function isBrowserKey(spec) {
  return spec.alt && spec.shift && !spec.ctrl && !spec.meta && ["KeyA", "KeyB", "KeyI", "KeyN", "KeyT"].includes(spec.code);
}
function shortcutWarning(spec) {
  if (isBrowseModeKey(spec)) return "Warning: this key is a screen reader command in browse mode.";
  if (isBrowserKey(spec)) return "Warning: Chrome and Edge use this key for their own commands.";
  return "";
}
function readChanges() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved?.version !== 1 || !saved.bindings || typeof saved.bindings !== "object") return {};
    const result = {};
    for (const action of getActions()) {
      if (!Object.hasOwn(saved.bindings, action.id)) continue;
      const specs = saved.bindings[action.id];
      if (!Array.isArray(specs)) continue;
      const valid = specs.map(normalizeKeySpec).filter((spec) => spec && !shortcutRejection(spec, action.id));
      if (specs.length && !valid.length) continue;
      result[action.id] = valid.filter((spec, index) => valid.findIndex((other) => sameKey(spec, other)) === index);
    }
    return result;
  } catch {
    return {};
  }
}
function saveChanges() {
  try {
    if (Object.keys(changes).length) localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, bindings: changes }));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
  }
}
function getActionKeys(id) {
  const action = getActions().find((action2) => action2.id === id);
  return changes[id] ?? action?.defaultKeys ?? [];
}
function setActionKeys(action, keys) {
  if (keys.length === action.defaultKeys.length && keys.every((key, index) => sameKey(key, action.defaultKeys[index]))) {
    delete changes[action.id];
  } else {
    changes[action.id] = keys;
  }
}
function assignShortcut(id, spec) {
  const key = normalizeKeySpec(spec);
  const action = getActions().find((action2) => action2.id === id);
  if (!action || !key || shortcutRejection(key, id)) return [];
  const moved = [];
  for (const other of getActions()) {
    if (other.id === id) continue;
    const keys = getActionKeys(other.id);
    if (!keys.some((current) => sameKey(current, key))) continue;
    setActionKeys(other, keys.filter((current) => !sameKey(current, key)));
    moved.push(other);
  }
  setActionKeys(action, [key]);
  saveChanges();
  return moved;
}
function shortcutConflicts(id, keys) {
  return getActions().filter((action) => action.id !== id && getActionKeys(action.id).some((current) => keys.some((key) => sameKey(current, key))));
}
function restoreActionDefaults(id) {
  const action = getActions().find((action2) => action2.id === id);
  if (!action) return [];
  const moved = shortcutConflicts(id, action.defaultKeys);
  for (const other of moved) {
    const keys = getActionKeys(other.id);
    setActionKeys(other, keys.filter((current) => !action.defaultKeys.some((key) => sameKey(current, key))));
  }
  setActionKeys(action, action.defaultKeys);
  saveChanges();
  return moved;
}
function removeShortcut(id) {
  const action = getActions().find((action2) => action2.id === id);
  if (!action) return;
  setActionKeys(action, []);
  saveChanges();
}
function resetShortcuts() {
  changes = {};
  saveChanges();
}
function setShortcutCapture(active) {
  capturing = active;
}
function showShortcutHint(button, actionId) {
  button.querySelector(".webbook-shortcut-hint")?.remove();
  button.removeAttribute("aria-keyshortcuts");
  const [spec] = keyboardShortcutsEnabled() ? getActionKeys(actionId) : [];
  if (!spec) return;
  const modifiers = [["ctrl", "Control"], ["alt", "Alt"], ["shift", "Shift"], ["meta", "Meta"]].filter(([flag]) => spec[flag]).map(([, name]) => name);
  button.setAttribute("aria-keyshortcuts", [...modifiers, spec.code.replace(/^(Key|Digit)/, "")].join("+"));
  const hint = document.createElement("kbd");
  hint.className = "webbook-shortcut-hint";
  hint.setAttribute("aria-hidden", "true");
  hint.textContent = shortcutName(spec).text;
  button.append(hint);
}
function shortcutName(spec) {
  const mac = /Mac|iPhone|iPad/.test(navigator.platform);
  const fallback = mac && MAC_KEY_NAMES[spec.code] || KEY_NAMES[spec.code] || [spec.code.replace(/^(Key|Digit)/, "").replace(/^Numpad/, "Numpad "), spec.code.replace(/^(Key|Digit)/, "").replace(/^Numpad/, "Numpad ")];
  const layoutKey = layoutMap?.get(spec.code);
  const key = layoutKey ? /^[a-z]$/i.test(layoutKey) ? layoutKey.toUpperCase() : layoutKey : fallback[0];
  const spoken = layoutKey ? SPOKEN_CHARACTERS[key] ?? key : fallback[1];
  const names = [["ctrl", "Ctrl", "Control", "\u2303"], ["alt", "Alt", mac ? "Option" : "Alt", "\u2325"], ["shift", "Shift", "Shift", "\u21E7"], ["meta", mac ? "Cmd" : "Meta", mac ? "Command" : "Meta", "\u2318"]];
  const modifiers = names.filter(([flag]) => spec[flag]);
  return {
    text: mac ? modifiers.map(([, , , symbol]) => symbol).join("") + key : [...modifiers.map(([, label]) => label), key].join("+"),
    ariaLabel: [...modifiers.map(([, , label]) => label), spoken].join(" plus ")
  };
}
async function loadKeyboardLayout() {
  try {
    layoutMap = await navigator.keyboard?.getLayoutMap();
  } catch {
  }
}
function initKeyboardShortcutEditorButton() {
  const toggle = document.getElementById("webbook-keyboard-shortcuts-toggle");
  if (!toggle || document.querySelector(".webbook-keyboard-shortcuts-row")) return;
  const openRow = document.createElement("div");
  openRow.className = "webbook-keyboard-shortcuts-row";
  const openButton = document.createElement("button");
  openButton.type = "button";
  openButton.textContent = "Change keyboard shortcuts";
  openRow.append(openButton);
  appendSetting("keyboard", openRow);
  openButton.addEventListener("click", async () => {
    const { openKeyboardShortcutEditor } = await import("./chunk-7EWI2T7L.js");
    openKeyboardShortcutEditor(openButton);
  });
}
function initKeyboardShortcuts2() {
  if (initialized) return;
  initialized = true;
  changes = readChanges();
  initReaderActionStatus();
  document.addEventListener("keydown", (event) => {
    if (capturing || event.defaultPrevented || event.isComposing || !keyboardShortcutsEnabled()) return;
    if (isTextEntryTarget(event.target)) return;
    const key = keySpecForEvent(event);
    const action = getActions().find((action2) => getActionKeys(action2.id).some((spec) => sameKey(spec, key)));
    if (isAnyPopoverOpen() && !(action?.inPanels && (key.alt || key.ctrl || key.meta))) return;
    if (!action || event.repeat && !REPEAT_ACTIONS.has(action.id) || !action.isAvailable()) return;
    event.preventDefault();
    runAction(action.id);
  });
}

// template/src/js/notes-in-place.js
var NOTE_SELECTOR2 = '.epubtype_footnote, .epubtype_endnote, .epubtype_note, [role="doc-footnote"], [role="doc-endnote"]';
var NOTES_SECTION_SELECTOR2 = '.epubtype_endnotes, [role="doc-endnotes"]';
var BACKLINK_SELECTOR = '[role="doc-backlink"], .epubtype_backlink';
var REFERENCES_KEY = "webbook-note-references";
var REFERENCE_MODES = ["button", "pause", "follow"];
var AUTO_RETURN_KEY = "webbook-note-auto-return";
var WAIT_SOUND_KEY = "webbook-note-wait-sound";
var NOTE_PAUSE_SECONDS = 2;
var phraseButton;
var phraseMenu;
var status;
var phraseReferences = [];
var lastNoteReturn = null;
var phraseRequest = 0;
var autoReturn = null;
var noteEndTimer = 0;
var phraseEnd = null;
var phraseEndTimer = 0;
var notePause = null;
var followQueue = [];
var pausingForNote = false;
function storedSetting(key, fallback) {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}
function referenceMode() {
  const mode = storedSetting(REFERENCES_KEY, "button");
  return REFERENCE_MODES.includes(mode) ? mode : "button";
}
function autoReturnEnabled() {
  return storedSetting(AUTO_RETURN_KEY, "true") !== "false";
}
function referenceLabel(reference) {
  return reference.textContent.trim().replace(/^\[|\]$/g, "") || "Note";
}
function referenceContext(reference) {
  const passage = reference.closest("p, li, blockquote, figcaption, dd, dt") || reference.parentElement;
  if (!passage) return "";
  const clone = passage.cloneNode(true);
  const index = Array.from(passage.querySelectorAll("a[href]")).indexOf(reference);
  const clonedReference = clone.querySelectorAll("a[href]")[index];
  if (!clonedReference) return "";
  clonedReference.replaceWith(" WEBBOOKNOTE ");
  clone.querySelectorAll("a[href]").forEach((link) => link.remove());
  const before = clone.textContent.replace(/\s+/g, " ").split("WEBBOOKNOTE")[0] ?? "";
  const words = before.trim().split(/\s+/).filter(Boolean);
  return words.length ? `${words.length > 4 ? "\u2026" : ""}${words.slice(-4).join(" ")}` : "";
}
function noteUrl(reference) {
  try {
    return new URL(reference.href, window.location.href);
  } catch {
    return null;
  }
}
function noteFromDocument(doc, url) {
  const id = url?.hash ? decodeURIComponent(url.hash.slice(1)) : "";
  const target = id ? doc.getElementById(id) : null;
  return target?.matches(NOTE_SELECTOR2) ? target : target?.closest(NOTE_SELECTOR2);
}
async function resolveNote(reference) {
  const url = noteUrl(reference);
  if (!url) return null;
  const here = new URL(window.location.href);
  if (url.origin === here.origin && url.pathname === here.pathname) {
    const note = noteFromDocument(document, url);
    return note ? { note, url, samePage: true } : null;
  }
  try {
    const doc = await fetchPage(url);
    const note = noteFromDocument(doc, url);
    return note ? { note, url, samePage: false } : null;
  } catch {
    return null;
  }
}
function noteCueRange(note) {
  const track = pageAudio()?.querySelector("track")?.track;
  const cues = Array.from(track?.cues || []).filter((cue) => {
    const elm = elmForCue(cue);
    return elm && (note === elm || note.contains(elm));
  });
  return cues.length ? { start: cues[0].startTime, end: cues[cues.length - 1].endTime } : null;
}
function returnRecord(reference) {
  const audio2 = pageAudio();
  const playing = Boolean(audio2 && (!audio2.paused || notePause));
  return {
    href: window.location.href.split("#")[0] + (reference.id ? `#${encodeURIComponent(reference.id)}` : ""),
    scrollY: readingScroll(),
    audioTime: notePause ? notePause.resumeAt : playing ? audio2?.currentTime : referenceTime(reference, audio2),
    autoplay: playing
  };
}
function referenceTime(reference, audio2) {
  const cues = Array.from(audio2?.querySelector("track")?.track?.cues || []);
  return cueForElement(cues, reference)?.startTime ?? audio2?.currentTime;
}
function goToNote(reference, overrides = {}) {
  const url = noteUrl(reference);
  if (!url) return;
  openNote(url, { ...returnRecord(reference), ...overrides });
}
function openNote(url, origin) {
  hidePhraseNotes();
  origin.noteId = decodeURIComponent(url.hash.slice(1));
  lastNoteReturn = origin;
  allowPlaybackOf(origin.noteId);
  const audio2 = pageAudio();
  const samePage = url.pathname === new URL(window.location.href).pathname;
  if (samePage) {
    navigateTo(url.href, { state: { webbookNoteReturn: origin }, autoplay: false });
    if (origin.autoplay) readNoteThenReturn();
  } else {
    navigateTo(url.href, { state: { webbookNoteReturn: origin }, autoplay: origin.autoplay, moveFocus: true });
    if (origin.autoplay) document.addEventListener("webbook:pagechange", () => readNoteThenReturn(), { once: true });
  }
  if (!origin.autoplay) audio2?.pause();
  setTimeout(showBackToText, 0);
}
function readNoteThenReturn() {
  const note = noteOfReturn();
  const audio2 = pageAudio();
  const trackEl2 = audio2?.querySelector("track");
  if (note && trackEl2 && trackEl2.readyState < 2) {
    trackEl2.addEventListener("load", () => readNoteThenReturn(), { once: true });
    return;
  }
  const range = note && noteCueRange(note);
  if (!audio2 || !range) {
    audio2?.pause();
    return;
  }
  autoReturn = { note, end: range.end, stop: !autoReturnEnabled() };
  cancelSkipPreroll(audio2);
  keepSoundsForSeek();
  audio2.currentTime = range.start;
  audio2.play().catch(() => {
  });
  scheduleNoteEnd();
}
function delayUntil(audio2, time) {
  return Math.max(0, ((time - audio2.currentTime) / (audio2.playbackRate || 1) - 0.08) * 1e3);
}
function scheduleNoteEnd() {
  clearTimeout(noteEndTimer);
  const audio2 = pageAudio();
  if (!autoReturn || !audio2 || audio2.paused) return;
  noteEndTimer = setTimeout(handleTimeUpdate, delayUntil(audio2, autoReturn.end));
}
function handleTimeUpdate() {
  const audio2 = pageAudio();
  if (!autoReturn || !audio2 || audio2.paused) return;
  if (audio2.currentTime < autoReturn.end - 0.25) {
    if (!noteEndTimer) scheduleNoteEnd();
    return;
  }
  const { stop } = autoReturn;
  autoReturn = null;
  clearTimeout(noteEndTimer);
  noteEndTimer = 0;
  if (!stop) {
    backToText({ continueNotes: true });
    return;
  }
  pausingForNote = true;
  audio2.pause();
}
function cueEndOf(elm) {
  const audio2 = pageAudio();
  const track = audio2?.querySelector("track")?.track;
  const cues = Array.from(track?.activeCues || []).concat(Array.from(track?.cues || []));
  const cue = cues.find((cue2) => elmForCue(cue2) === elm && cue2.endTime > audio2.currentTime) || cues.find((cue2) => elmForCue(cue2) === elm);
  return cue ? cue.endTime : null;
}
function schedulePhraseEnd() {
  clearTimeout(phraseEndTimer);
  const audio2 = pageAudio();
  if (!phraseEnd || phraseEnd.done || !audio2 || audio2.paused || referenceMode() === "button") return;
  phraseEndTimer = setTimeout(handlePhraseEnd, delayUntil(audio2, phraseEnd.end));
}
function handlePhraseEnd() {
  const audio2 = pageAudio();
  if (!phraseEnd || phraseEnd.done || !audio2 || audio2.paused || !phraseReferences.length) return;
  if (currentReturn()) return;
  if (audio2.currentTime < phraseEnd.end - 0.25) return schedulePhraseEnd();
  phraseEnd.done = true;
  const cues = Array.from(audio2.querySelector("track")?.track?.cues || []);
  const next = cues.find((cue) => {
    if (cue.startTime < phraseEnd.end - 1e-3) return false;
    const elm = elmForCue(cue);
    return !elm || canPlay(elm);
  });
  const resumeAt = next?.startTime ?? Math.max(phraseEnd.end, cues.at(-1)?.endTime ?? 0);
  const mode = referenceMode();
  if (mode === "follow") {
    const links = Array.from(document.querySelectorAll("main a[href]"));
    followQueue = phraseReferences.slice(1).map((reference) => links.indexOf(reference)).filter((index) => index >= 0);
    goToNote(phraseReferences[0], { audioTime: resumeAt, autoplay: true });
  } else if (mode === "pause") {
    pausingForNote = true;
    audio2.pause();
    const waiting = { resumeAt, stopSound: storedSetting(WAIT_SOUND_KEY, "false") === "true" ? playNoteWaitSound(NOTE_PAUSE_SECONDS) : () => {
    } };
    notePause = waiting;
    waiting.timer = setTimeout(() => {
      if (notePause !== waiting) return;
      endNotePause();
      if (pageAudio() === audio2) {
        cancelSkipPreroll(audio2);
        audio2.currentTime = resumeAt;
        audio2.play().catch(() => {
        });
      }
    }, NOTE_PAUSE_SECONDS * 1e3);
  }
}
function endNotePause() {
  if (!notePause) return;
  clearTimeout(notePause.timer);
  notePause.stopSound();
  notePause = null;
}
function handlePlay2(e) {
  if (e.target !== pageAudio()) return;
  endNotePause();
  scheduleNoteEnd();
  schedulePhraseEnd();
}
function handlePause(e) {
  if (e.target !== pageAudio()) return;
  clearTimeout(noteEndTimer);
  noteEndTimer = 0;
  clearTimeout(phraseEndTimer);
  if (pausingForNote) {
    pausingForNote = false;
    return;
  }
  endNotePause();
  if (pausedForSound()) return;
  if (autoReturn) autoReturn.stop = true;
}
function noteOfReturn() {
  const origin = currentReturn();
  if (!origin) return null;
  return origin.noteId && document.getElementById(origin.noteId) || noteFromDocument(document, new URL(window.location.href));
}
function currentReturn() {
  return history.state?.webbookNoteReturn || null;
}
function showBackToText() {
  const button = document.getElementById("webbook-back-to-text");
  if (button) button.hidden = !currentReturn();
  if (button && !button.hidden) showShortcutHint(button, "back-to-text");
  document.documentElement.classList.toggle("webbook-note-return", Boolean(currentReturn()));
  refreshCurrentEscape();
}
function dismissReturn() {
  autoReturn = null;
  followQueue = [];
  clearPlaybackException();
  if (!currentReturn()) return;
  history.replaceState({ ...history.state, webbookNoteReturn: void 0 }, "");
  showBackToText();
  lastNoteReturn = null;
}
async function backToText({ keepPlaying = false, continueNotes = false } = {}) {
  const stored = currentReturn();
  if (!stored) return false;
  const origin = keepPlaying ? { ...stored, autoplay: true } : stored;
  autoReturn = null;
  clearPlaybackException();
  if (continueNotes && followQueue.length && origin.autoplay) {
    const doc = new URL(origin.href).pathname === location.pathname ? document : await fetchPage(new URL(origin.href)).catch(() => null);
    const reference = doc?.querySelectorAll("main a[href]")[followQueue.shift()];
    const url = reference && new URL(reference.getAttribute("href"), origin.href);
    if (url) {
      openNote(url, { ...origin });
      return true;
    }
  }
  followQueue = [];
  await navigateTo(origin.href, {
    push: false,
    replace: true,
    moveFocus: true,
    scrollY: origin.scrollY,
    audioTime: origin.audioTime,
    autoplay: origin.autoplay,
    state: null
  });
  lastNoteReturn = null;
  showBackToText();
  return true;
}
function canReturnFromNote(structure) {
  const note = noteOfReturn();
  return Boolean(note && structure && (structure === note || structure.contains(note)));
}
function referencesInPhrase(elm) {
  return Array.from(elm.querySelectorAll("a[href]"));
}
function openPhraseNotes() {
  if (phraseReferences.length === 1) {
    goToNote(phraseReferences[0]);
    return true;
  }
  const heading = document.createElement("h2");
  heading.id = "webbook-note-menu-heading";
  heading.textContent = "Notes in this phrase";
  const list = document.createElement("ul");
  phraseMenu.replaceChildren(heading, list);
  phraseReferences.forEach((reference, index) => {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    const label = document.createElement("span");
    label.className = "webbook-note-menu-label";
    label.textContent = `Note ${referenceLabel(reference)}`;
    const context2 = document.createElement("span");
    context2.className = "webbook-note-menu-context";
    context2.textContent = referenceContext(reference);
    button.append(label, context2);
    button.addEventListener("click", () => {
      phraseMenu.hidePopover();
      goToNote(reference);
    });
    item.append(button);
    list.append(item);
    if (!index) setTimeout(() => button.focus(), 0);
  });
  phraseMenu.showPopover();
  return true;
}
async function handleNarratedPhrase(elm) {
  soundForNarratedPhrase(elm);
  if (currentReturn() && !autoReturn && !elm.closest(`${NOTE_SELECTOR2}, ${NOTES_SECTION_SELECTOR2}`)) dismissReturn();
  const request = ++phraseRequest;
  phraseEnd = null;
  clearTimeout(phraseEndTimer);
  const candidates = referencesInPhrase(elm);
  const resolved = await Promise.all(candidates.map((reference) => resolveNote(reference)));
  if (request !== phraseRequest) return;
  const references = candidates.filter((reference, index) => resolved[index]);
  const changed = references.length !== phraseReferences.length || references.some((ref, i) => ref !== phraseReferences[i]);
  phraseReferences = references;
  if (!references.length) return hidePhraseNotes();
  const end = cueEndOf(elm);
  if (end !== null) {
    phraseEnd = { elm, end };
    schedulePhraseEnd();
  }
  phraseButton.hidden = false;
  phraseButton.disabled = false;
  phraseButton.textContent = references.length === 1 ? `Note ${referenceLabel(references[0])}` : `Notes (${references.length})`;
  if (changed) status.textContent = `${phraseButton.textContent} available.`;
  showShortcutHint(phraseButton, "go-to-phrase-note");
}
function hidePhraseNotes() {
  endNotePause();
  phraseRequest++;
  phraseReferences = [];
  phraseEnd = null;
  clearTimeout(phraseEndTimer);
  if (phraseButton) {
    phraseButton.hidden = true;
    phraseButton.disabled = true;
  }
  if (status) status.textContent = "";
}
function buildUi() {
  const escapeContainer = document.getElementById("webbook-escape-container");
  phraseButton = document.createElement("button");
  phraseButton.id = "webbook-note-phrase-btn";
  phraseButton.type = "button";
  phraseButton.hidden = true;
  phraseButton.disabled = true;
  phraseButton.addEventListener("click", openPhraseNotes);
  status = document.createElement("span");
  status.id = "webbook-note-status";
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  phraseMenu = document.createElement("div");
  phraseMenu.id = "webbook-note-menu";
  phraseMenu.className = "webbook";
  phraseMenu.setAttribute("popover", "auto");
  phraseMenu.setAttribute("aria-labelledby", "webbook-note-menu-heading");
  phraseMenu.addEventListener("toggle", (event) => {
    if (event.newState === "closed" && (!document.activeElement || document.activeElement === document.body || phraseMenu.contains(document.activeElement))) {
      phraseButton.focus({ preventScroll: true });
    }
  });
  escapeContainer?.append(status, phraseButton);
  const back = document.createElement("button");
  back.id = "webbook-back-to-text";
  back.type = "button";
  back.textContent = "Back to text";
  back.hidden = true;
  back.addEventListener("click", backToText);
  document.body.append(phraseMenu);
  escapeContainer.append(back);
}
function buildSettings4() {
  const fieldset = settingsSection("notes");
  if (!fieldset || document.getElementById("webbook-note-references-options")) return;
  const referencesRow = document.createElement("div");
  const referencesLabel = document.createElement("label");
  referencesLabel.htmlFor = "webbook-note-references-options";
  referencesLabel.textContent = "At a phrase with notes";
  const select = document.createElement("select");
  select.id = "webbook-note-references-options";
  for (const [value, text] of [["button", "Keep reading"], ["pause", "Pause briefly"], ["follow", "Go to the notes"]]) {
    select.append(new Option(text, value));
  }
  select.value = referenceMode();
  select.addEventListener("change", () => {
    try {
      localStorage.setItem(REFERENCES_KEY, select.value);
    } catch {
    }
    waitSoundToggle.disabled = select.value !== "pause";
    if (notePause) {
      endNotePause();
      pageAudio()?.play().catch(() => {
      });
    }
    schedulePhraseEnd();
  });
  referencesRow.append(referencesLabel, select);
  const waitSoundRow = document.createElement("div");
  const waitSoundLabel = document.createElement("label");
  waitSoundLabel.htmlFor = "webbook-note-wait-sound-toggle";
  waitSoundLabel.textContent = "Play ticking sound while paused";
  const waitSoundToggle = document.createElement("input");
  waitSoundToggle.type = "checkbox";
  waitSoundToggle.id = "webbook-note-wait-sound-toggle";
  waitSoundToggle.checked = storedSetting(WAIT_SOUND_KEY, "false") === "true";
  waitSoundToggle.disabled = select.value !== "pause";
  waitSoundToggle.addEventListener("change", () => {
    try {
      localStorage.setItem(WAIT_SOUND_KEY, String(waitSoundToggle.checked));
    } catch {
    }
    if (!waitSoundToggle.checked) notePause?.stopSound();
  });
  waitSoundRow.append(waitSoundLabel, waitSoundToggle);
  const returnRow = document.createElement("div");
  const returnLabel = document.createElement("label");
  returnLabel.htmlFor = "webbook-note-auto-return-toggle";
  returnLabel.textContent = "Go back to the text after a note";
  const toggle = document.createElement("input");
  toggle.type = "checkbox";
  toggle.id = "webbook-note-auto-return-toggle";
  toggle.checked = autoReturnEnabled();
  toggle.addEventListener("change", () => {
    try {
      localStorage.setItem(AUTO_RETURN_KEY, String(toggle.checked));
    } catch {
    }
    if (autoReturn) autoReturn.stop = !toggle.checked;
  });
  returnRow.append(returnLabel, toggle);
  appendSetting("notes", referencesRow);
  appendSetting("notes", waitSoundRow);
  appendSetting("notes", returnRow);
}
async function handleNoteClick(e, capturing2) {
  if (e.defaultPrevented) return;
  const link = e.target instanceof Element ? e.target.closest("a[href]") : null;
  if (!link || link.closest("#webbook-note-menu")) return;
  if (link.matches(BACKLINK_SELECTOR) && currentReturn()) {
    if (!capturing2) return;
    e.preventDefault();
    backToText();
    return;
  }
  if (!link.closest("main")) {
    if (capturing2 && currentReturn()) dismissReturn();
    return;
  }
  const semantic = link.matches('.epubtype_noteref, [role="doc-noteref"]');
  const local = noteUrl(link);
  const here = new URL(location.href);
  const sameBookHash = local && local.origin === here.origin && local.hash && local.pathname.slice(0, local.pathname.lastIndexOf("/")) === here.pathname.slice(0, here.pathname.lastIndexOf("/"));
  const localNote = sameBookHash && local.pathname === here.pathname && noteFromDocument(document, local);
  const clearlyNote = semantic || Boolean(localNote);
  if (capturing2 !== clearlyNote) return;
  if (!sameBookHash) {
    if (currentReturn()) dismissReturn();
    return;
  }
  if (clearlyNote) {
    e.preventDefault();
    if (currentReturn()) dismissReturn();
    goToNote(link);
    return;
  }
  e.preventDefault();
  if (currentReturn()) dismissReturn();
  if (await resolveNote(link)) goToNote(link);
  else navigateTo(link.href);
}
function initNotesInPlace() {
  buildUi();
  buildSettings4();
  initStructureSounds();
  document.addEventListener("click", (e) => handleNoteClick(e, true), { capture: true });
  document.addEventListener("click", (e) => handleNoteClick(e, false));
  document.addEventListener("timeupdate", handleTimeUpdate, { capture: true });
  document.addEventListener("play", handlePlay2, { capture: true });
  document.addEventListener("pause", handlePause, { capture: true });
  for (const type of ["seeking", "ended", "emptied", "error"]) {
    document.addEventListener(type, (event) => {
      if (event.target === pageAudio()) endNotePause();
    }, { capture: true });
  }
  document.addEventListener("webbook:pageplacing", endNotePause);
  window.addEventListener("pagehide", endNotePause);
  for (const type of ["ratechange", "seeked"]) {
    document.addEventListener(type, (e) => {
      if (e.target !== pageAudio()) return;
      scheduleNoteEnd();
      schedulePhraseEnd();
    }, { capture: true });
  }
  window.addEventListener("popstate", (e) => {
    endNotePause();
    autoReturn = null;
    followQueue = [];
    showBackToText();
    if (e.state?.webbookNoteReturn || !lastNoteReturn) return;
    const origin = lastNoteReturn;
    if (new URL(origin.href).pathname !== location.pathname) return;
    setTimeout(() => {
      scrollToReading(origin.scrollY);
      const reference = new URL(origin.href).hash ? document.getElementById(decodeURIComponent(new URL(origin.href).hash.slice(1))) : null;
      reference?.focus({ preventScroll: true });
      const audio2 = pageAudio();
      if (audio2 && typeof origin.audioTime === "number") audio2.currentTime = origin.audioTime;
      if (audio2 && origin.autoplay) audio2.play().catch(() => {
      });
      lastNoteReturn = null;
    }, 0);
  });
  document.addEventListener("webbook:pagechange", showBackToText);
  document.addEventListener("webbook:skippast", (e) => {
    const structure = e.detail?.structure;
    if (!canReturnFromNote(structure)) return;
    e.preventDefault();
    backToText({ keepPlaying: true });
  });
  window.addEventListener("scroll", () => {
    if (!currentReturn() || autoReturn) return;
    const note = noteOfReturn();
    if (!note) return;
    const rect = (note.closest(NOTES_SECTION_SELECTOR2) || note).getBoundingClientRect();
    if (readingEnd(rect) < -viewportLength() || readingStart(rect) > viewportLength() * 2) dismissReturn();
  }, { passive: true });
  registerAction({
    id: "go-to-phrase-note",
    label: "Go to note in this phrase",
    group: "Narration",
    defaultKeys: [{ code: "KeyE", alt: true, shift: true }],
    run: openPhraseNotes,
    isAvailable: () => phraseReferences.length > 0
  });
  registerAction({
    id: "back-to-text",
    label: "Back to text",
    group: "Navigation",
    defaultKeys: [{ code: "Backspace", alt: true, shift: true }],
    run: backToText,
    isAvailable: () => Boolean(currentReturn())
  });
  showBackToText();
}

// template/src/js/escapability.js
var ESCAPABLE_STRUCTURE_RULES = [
  // An equation narration reads on its own (user, 2026-11-11). MathML keeps its tag name lowercase
  // in an HTML page. webbook-equation: a numbered display equation (plan 24).
  { classes: ["webbook-equation"], tags: ["math"], label: "equation" },
  { classes: ["epubtype_table"], tags: ["TABLE"], label: "table" },
  { classes: ["epubtype_list"], tags: ["OL", "UL"], label: "list" },
  { classes: ["epubtype_figure"], tags: ["FIGURE"], label: "figure" },
  { classes: ["epubtype_sidebar"], tags: [], label: "sidebar" },
  { classes: ["epubtype_footnote"], tags: [], roles: ["doc-footnote"], label: "note" },
  { classes: ["epubtype_endnote"], tags: [], roles: ["doc-endnote"], label: "note" },
  { classes: ["epubtype_note"], tags: [], label: "note" }
];
var NOTES_SECTION_SELECTOR3 = '.epubtype_endnotes, [role="doc-endnotes"]';
function findEscapableStructure(elm) {
  const main = document.querySelector("main");
  let node = elm;
  while (node && node !== main) {
    if (node.matches(NOTES_SECTION_SELECTOR3)) return { elm: node, label: "notes" };
    const section = node.closest(NOTES_SECTION_SELECTOR3);
    const rule = ESCAPABLE_STRUCTURE_RULES.find((rule2) => matchesStructureRule(node, rule2));
    if (rule) {
      const noteAncestor = node.parentElement?.closest('li, .epubtype_endnote, .epubtype_footnote, .epubtype_note, [role="doc-endnote"], [role="doc-footnote"]');
      const organizingList = section && rule.label === "list" && (!noteAncestor || !section.contains(noteAncestor));
      if (!(section && rule.label === "note") && !organizingList) return { elm: node, label: rule.label };
    }
    node = node.parentElement;
  }
  return null;
}
function matchesStructureRule(elm, rule) {
  return rule.tags.includes(elm.tagName) || rule.classes.some((c) => elm.classList.contains(c)) || rule.roles?.some((role) => (elm.getAttribute("role") || "").split(/\s+/).includes(role));
}
function getEscapeTarget(ancestor, track, fromIdx) {
  const cues = Array.from(track.cues);
  for (let i = fromIdx + 1; i < cues.length; i++) {
    const elm = elmForCue(cues[i]);
    if (elm && !ancestor.contains(elm) && canPlay(elm)) return { cue: cues[i], elm, track };
  }
  const nextPage = document.querySelector("#webbook-spine-nav a[rel=next][href]");
  if (nextPage) return { nextPage };
  return cues.length ? { endTime: cues[cues.length - 1].endTime } : null;
}
var escapeBtn;
var escapeStatus;
var escapeLabelEl;
var currentEscapableStructure = null;
var escapeTarget = null;
function showEscape(structure, escapeTime, announce) {
  const label = structure.label;
  if (escapeLabelEl) escapeLabelEl.textContent = label;
  if (escapeBtn) {
    escapeBtn.hidden = Boolean(escapeTarget?.noteReturn);
    escapeBtn.disabled = escapeBtn.hidden;
    escapeBtn.dataset.escapeTime = escapeTime;
    showShortcutHint(escapeBtn, "skip-past");
  }
  if (escapeStatus) {
    if (escapeTarget?.noteReturn) escapeStatus.textContent = "";
    else if (announce) escapeStatus.textContent = `Inside ${label}. Leave ${label} button available.`;
  }
}
function hideEscape() {
  if (escapeBtn) {
    escapeBtn.hidden = true;
    escapeBtn.disabled = true;
    delete escapeBtn.dataset.escapeTime;
  }
  if (escapeLabelEl) escapeLabelEl.textContent = "";
  if (escapeStatus) escapeStatus.textContent = "";
  currentEscapableStructure = null;
  escapeTarget = null;
}
function activateEscape() {
  const target = escapeTarget;
  const structure = currentEscapableStructure;
  const audio2 = pageAudio();
  if (!target || !audio2) {
    hideEscape();
    return;
  }
  const skipping2 = new CustomEvent("webbook:skippast", { cancelable: true, detail: { structure } });
  if (!document.dispatchEvent(skipping2)) {
    hideEscape();
    return;
  }
  if (target.noteReturn) {
    hideEscape();
    return;
  }
  if (typeof target.endTime === "number") {
    cancelSkipPreroll(audio2);
    audio2.pause();
    audio2.currentTime = Math.min(target.endTime, audio2.duration || target.endTime);
    hideEscape();
    clearNarrationHighlight();
    clearCaption();
    announceReaderAction("End of book.");
    return;
  }
  if (target.nextPage) {
    cancelSkipPreroll(audio2);
    hideEscape();
    target.nextPage.click();
    return;
  }
  const active = document.activeElement;
  const moveFocus = !active || active === document.body || escapeBtn.contains(active) || Boolean(structure?.contains(active)) || Boolean(document.querySelector("main")?.contains(active));
  cancelSkipPreroll(audio2);
  keepSoundsForSeek();
  audio2.currentTime = target.cue.startTime;
  hideEscape();
  highlightElm(target.elm);
  showCaptionForCue(target.cue, target.track);
  if (moveFocus) {
    if (!target.elm.hasAttribute("tabindex")) target.elm.setAttribute("tabindex", "-1");
    target.elm.focus({ preventScroll: true });
  }
}
function canActivateCurrentEscape() {
  return Boolean(currentEscapableStructure && escapeTarget && pageAudio());
}
function activateCurrentEscape() {
  if (!canActivateCurrentEscape()) return false;
  activateEscape();
  return true;
}
function handleEscapableStructure(elm, track, activeCueIdx) {
  const escapableStructure = findEscapableStructure(elm);
  if (!escapableStructure) {
    hideEscape();
    return;
  }
  const target = canReturnFromNote(escapableStructure.elm) ? { noteReturn: true } : getEscapeTarget(escapableStructure.elm, track, activeCueIdx);
  if (!target) {
    hideEscape();
    return;
  }
  const isNew = escapableStructure.elm !== currentEscapableStructure;
  currentEscapableStructure = escapableStructure.elm;
  escapeTarget = target;
  showEscape(escapableStructure, target.cue ? target.cue.startTime : target.noteReturn ? "note-return" : typeof target.endTime === "number" ? target.endTime : "next-page", isNew);
}
function refreshCurrentEscape() {
  const audio2 = pageAudio();
  const track = audio2?.querySelector("track")?.track;
  const cues = Array.from(track?.cues || []);
  const index = cues.findIndex((cue) => cue.startTime <= audio2.currentTime && audio2.currentTime < cue.endTime);
  const elm = index >= 0 ? elmForCue(cues[index]) : null;
  if (elm) handleEscapableStructure(elm, track, index);
  else hideEscape();
}
function initEscapability() {
  escapeBtn = document.querySelector("#webbook-escape-btn");
  escapeStatus = document.querySelector("#webbook-escape-status");
  escapeLabelEl = document.querySelector("#webbook-escape-label");
  if (escapeBtn) {
    const prefix = Array.from(escapeBtn.childNodes).find((node) => node.nodeType === 3 && node.textContent.trim());
    if (prefix) prefix.textContent = "Leave ";
    escapeBtn.addEventListener("click", activateEscape);
  }
  registerAction({
    id: "skip-past",
    label: "Leave current table, list, note or other structure",
    group: "Narration",
    defaultKeys: [{ code: "Escape" }],
    run: activateCurrentEscape,
    isAvailable: canActivateCurrentEscape
  });
}

// template/src/js/skippability.js
var SKIP_SEEK_PREROLL_SECONDS = 0.2;
var SKIP_UNMUTE_BEFORE_TARGET_SECONDS = 0.05;
var SKIPPABLE_STRUCTURE_RULES = [
  { classes: ["epubtype_pagebreak"], key: "webbook-skip-pagebreak", id: "webbook-skip-pagebreak-toggle" },
  // All notes in one setting (user, 2026-11-10): the generic note type (epub:type="note") is
  // rare (one note in 52 EPUBs surveyed) and reads to a reader as the same thing
  { classes: ["epubtype_footnote", "epubtype_endnote", "epubtype_endnotes", "epubtype_note"], key: "webbook-skip-footnote", id: "webbook-skip-footnote-toggle", skipByDefault: true },
  { classes: ["epubtype_sidebar"], key: "webbook-skip-sidebar", id: "webbook-skip-sidebar-toggle" }
];
var skipSeekIgnoreUntil = 0;
var skipMuteUntil = 0;
var playableExceptionId = "";
function skipping({ key, skipByDefault }) {
  let stored = null;
  try {
    stored = localStorage.getItem(key);
  } catch {
  }
  return stored === null ? Boolean(skipByDefault) : stored === "true";
}
function canPlay(elm) {
  if (elm.closest("[hidden], .webbook-style-hidden")) return false;
  if (elm.closest(".webbook-style-invisible, .webbook-style-visible")?.classList.contains("webbook-style-invisible")) return false;
  if (playableExceptionId && elm.closest(`[id="${CSS.escape(playableExceptionId)}"]`)) return true;
  for (const rule of SKIPPABLE_STRUCTURE_RULES) {
    if (findClosestWithAnyClass(elm, rule.classes)) return !skipping(rule);
  }
  return true;
}
function allowPlaybackOf(id) {
  playableExceptionId = id || "";
}
function clearPlaybackException() {
  playableExceptionId = "";
}
function allNarrationSkipped(track) {
  const cues = Array.from(track?.cues || []);
  return cues.length > 0 && cues.every((cue) => {
    const elm = elmForCue(cue);
    return elm && !canPlay(elm);
  });
}
function findNextPlayableCue(cues, fromIdx) {
  for (let i = fromIdx + 1; i < cues.length; i++) {
    const elm = elmForCue(cues[i]);
    if (!elm || canPlay(elm)) return cues[i];
  }
  return null;
}
function skipCue(audio2, track, fromIdx, cue) {
  const nextCue = findNextPlayableCue(Array.from(track.cues), fromIdx);
  if (nextCue) {
    skipSeekIgnoreUntil = nextCue.startTime + SKIP_UNMUTE_BEFORE_TARGET_SECONDS;
    skipMuteUntil = Math.max(0, nextCue.startTime - SKIP_UNMUTE_BEFORE_TARGET_SECONDS);
    if (!audio2.muted) {
      audio2.dataset.webbookMutedForSkip = "true";
      audio2.muted = true;
    }
    keepSoundsForSeek();
    audio2.currentTime = Math.max(0, nextCue.startTime - SKIP_SEEK_PREROLL_SECONDS);
    audio2.addEventListener("seeked", () => scheduleUnmute(audio2), { once: true });
  } else {
    skipSeekIgnoreUntil = 0;
    skipMuteUntil = 0;
    if (allNarrationSkipped(track)) {
      cancelSkipPreroll(audio2);
      audio2.pause();
      hideEscape();
      return;
    }
    keepSoundsForSeek();
    audio2.currentTime = Math.min(cue.endTime, audio2.duration || cue.endTime);
  }
  hideEscape();
}
function restoreSkipMute(audio2) {
  if (!skipMuteUntil || audio2.currentTime < skipMuteUntil) return;
  clearSkipMute(audio2);
}
function cancelSkipPreroll(audio2) {
  skipSeekIgnoreUntil = 0;
  skipMuteUntil = 0;
  clearSkipMute(audio2);
}
var unmuteTimer = 0;
function scheduleUnmute(audio2) {
  clearTimeout(unmuteTimer);
  if (!skipMuteUntil) return;
  const left = (skipMuteUntil + SKIP_UNMUTE_BEFORE_TARGET_SECONDS - 0.01 - audio2.currentTime) / (audio2.playbackRate || 1);
  unmuteTimer = setTimeout(() => clearSkipMute(audio2), Math.max(0, left * 1e3));
}
function clearSkipMute(audio2) {
  clearTimeout(unmuteTimer);
  skipMuteUntil = 0;
  if (audio2.dataset.webbookMutedForSkip === "true") {
    audio2.muted = false;
    delete audio2.dataset.webbookMutedForSkip;
  }
}
function findClosestWithAnyClass(elm, classes) {
  const main = document.querySelector("main");
  let node = elm;
  while (node && node !== main) {
    if (classes.some((c) => node.classList.contains(c))) return node;
    node = node.parentElement;
  }
  return null;
}
function handleCuePlayability(elm, audio2, track, activeCueIdx, cue) {
  clearTimeout(skipAheadTimer);
  if (!canPlay(elm)) {
    if (audio2.currentTime >= skipSeekIgnoreUntil) skipCue(audio2, track, activeCueIdx, cue);
    return false;
  }
  skipSeekIgnoreUntil = 0;
  scheduleSkipAhead(audio2, track, activeCueIdx, cue);
  return true;
}
var skipAheadTimer = 0;
var SKIP_AHEAD_MARGIN_SECONDS = 0.03;
function scheduleSkipAhead(audio2, track, activeCueIdx, cue) {
  const cues = track.cues;
  const next = cues?.[activeCueIdx + 1];
  const nextElm = next ? elmForCue(next) : null;
  if (!nextElm || canPlay(nextElm)) return;
  const check = () => {
    if (audio2.paused || track !== (audio2.querySelector("track")?.track ?? track)) return;
    const time = audio2.currentTime;
    if (time < cue.startTime - 0.05 || time > cue.endTime + 0.25) return;
    const left2 = (cue.endTime - time) / (audio2.playbackRate || 1);
    if (left2 > SKIP_AHEAD_MARGIN_SECONDS + 0.01) {
      skipAheadTimer = setTimeout(check, Math.max(10, (left2 - SKIP_AHEAD_MARGIN_SECONDS) * 1e3));
      return;
    }
    skipCue(audio2, track, activeCueIdx, cue);
  };
  const left = (cue.endTime - audio2.currentTime) / (audio2.playbackRate || 1);
  skipAheadTimer = setTimeout(check, Math.max(0, (left - SKIP_AHEAD_MARGIN_SECONDS) * 1e3));
}
function initSkippability() {
  for (const { key, id } of SKIPPABLE_STRUCTURE_RULES) {
    const toggle = document.querySelector(`#${id}`);
    if (!toggle) continue;
    const label = document.querySelector(`label[for="${id}"]`);
    if (label) label.textContent = id.includes("pagebreak") ? "Page numbers" : id.includes("footnote") ? "Notes" : "Sidebars";
    toggle.checked = skipping(SKIPPABLE_STRUCTURE_RULES.find((rule) => rule.key === key));
    toggle.addEventListener("change", () => {
      localStorage.setItem(key, toggle.checked);
      if (captionModeEnabled) showCaptionForCurrentState();
    });
  }
}

// template/src/js/autoplay.js
var AUTOPLAY_STORAGE_KEY = "webbook-autoplay";
var AUTOPLAY_TARGET_STORAGE_KEY = "webbook-autoplay-target";
function normalizeAutoplayUrl(href) {
  try {
    const url = new URL(href, window.location.href);
    url.hash = "";
    url.search = "";
    return url.href;
  } catch {
    return "";
  }
}
function clearAutoplayRequest() {
  localStorage.removeItem(AUTOPLAY_STORAGE_KEY);
  localStorage.removeItem(AUTOPLAY_TARGET_STORAGE_KEY);
}
function requestAutoplayForForwardSpineLink(link) {
  if (!link?.matches?.("#webbook-spine-nav a[rel=next][href]")) return;
  requestAutoplayForLink(link);
}
function requestAutoplayForLink(link) {
  const target = normalizeAutoplayUrl(link?.href);
  if (!target) return;
  localStorage.setItem(AUTOPLAY_STORAGE_KEY, "true");
  localStorage.setItem(AUTOPLAY_TARGET_STORAGE_KEY, target);
}
function consumeAutoplayRequest() {
  const requested = localStorage.getItem(AUTOPLAY_STORAGE_KEY) === "true";
  const target = localStorage.getItem(AUTOPLAY_TARGET_STORAGE_KEY);
  clearAutoplayRequest();
  return requested && Boolean(target) && target === normalizeAutoplayUrl(window.location.href);
}

// template/src/js/page-entry.js
var PAGE_ENTRY_STORAGE_KEY = "webbook-caption-entry";
var pageEntry;
function consumePageEntry() {
  if (pageEntry === void 0) {
    const entry = localStorage.getItem(PAGE_ENTRY_STORAGE_KEY);
    localStorage.removeItem(PAGE_ENTRY_STORAGE_KEY);
    pageEntry = entry === "first" || entry === "last" ? entry : null;
  }
  return pageEntry;
}
function resetPageEntry() {
  pageEntry = void 0;
}
function adjacentPageLink(delta) {
  return document.querySelector(`#webbook-spine-nav a[rel=${delta > 0 ? "next" : "prev"}][href]`);
}
function initPageActions() {
  for (const [id, label, delta, code] of [
    ["previous-page", "Previous page", -1, "BracketLeft"],
    ["next-page", "Next page", 1, "BracketRight"]
  ]) {
    registerAction({
      id,
      label,
      group: "Navigation",
      defaultKeys: [{ code, shift: true }],
      run: () => adjacentPageLink(delta)?.click(),
      isAvailable: () => Boolean(adjacentPageLink(delta))
    });
  }
}
function stepAcrossPageBoundary(delta) {
  const link = adjacentPageLink(delta);
  if (!link) return false;
  localStorage.setItem(PAGE_ENTRY_STORAGE_KEY, delta > 0 ? "first" : "last");
  const audio2 = pageAudio();
  if (audio2 && !audio2.paused && !audio2.ended) {
    requestAutoplayForLink(link);
  } else {
    clearAutoplayRequest();
  }
  link.click();
  return true;
}

// template/src/js/caption-mode.js
var CAPTION_STORAGE_KEY = "webbook-caption-mode";
var CAPTION_CANDIDATE_SELECTOR = "h1, h2, h3, h4, h5, h6, p, li, blockquote, figcaption, caption, th, td, .epubtype_pagebreak";
var captionModeEnabled = false;
var captionBoundaryEntry = null;
var captionItems = [];
var captionIndex = -1;
var captionView = null;
var captionText = null;
function initCaptionMode() {
  ensureCaptionView();
  const toggle = document.querySelector("#webbook-caption-mode-toggle");
  captionModeEnabled = localStorage.getItem(CAPTION_STORAGE_KEY) === "true";
  captionBoundaryEntry = consumePageEntry();
  if (toggle) {
    toggle.checked = captionModeEnabled;
    toggle.addEventListener("change", () => setCaptionMode(toggle.checked));
  }
  setCaptionMode(captionModeEnabled, { persist: false });
  document.addEventListener("keydown", handleCaptionKeydown);
  registerAction({
    id: "toggle-caption-mode",
    label: "Caption mode on or off",
    group: "Reading",
    defaultKeys: [{ code: "Backslash", shift: true }],
    isAvailable: () => Boolean(toggle && !toggle.disabled),
    run: () => {
      toggle.click();
      announceReaderAction(`Caption mode ${toggle.checked ? "on" : "off"}.`);
    }
  });
}
function startCaptionModeForPage() {
  captionItems = [];
  captionIndex = -1;
  captionBoundaryEntry = consumePageEntry();
  if (!captionModeEnabled) return;
  refreshCaptionItems();
  showCaptionForCurrentState();
}
function ensureCaptionView() {
  if (captionView) return;
  captionView = document.createElement("section");
  captionView.id = "webbook-caption-view";
  captionView.className = "webbook";
  captionView.setAttribute("aria-label", "Caption mode");
  captionView.hidden = true;
  captionText = document.createElement("p");
  captionText.id = "webbook-caption-text";
  captionText.setAttribute("role", "status");
  captionText.setAttribute("aria-live", "polite");
  captionView.append(captionText);
  document.body.append(captionView);
}
function setCaptionMode(enabled2, options = {}) {
  captionModeEnabled = enabled2;
  if (options.persist !== false) {
    localStorage.setItem(CAPTION_STORAGE_KEY, String(enabled2));
  }
  document.documentElement.classList.toggle("webbook-caption-mode", enabled2);
  document.body.classList.toggle("webbook-caption-mode", enabled2);
  const main = document.querySelector("main");
  if (main) {
    if (enabled2) main.setAttribute("aria-hidden", "true");
    else main.removeAttribute("aria-hidden");
  }
  if (captionView) captionView.hidden = !enabled2;
  if (enabled2) {
    refreshCaptionItems();
    showCaptionForCurrentState();
  } else {
    captionBoundaryEntry = null;
    clearCaption();
  }
}
function clearCaption() {
  if (captionText) captionText.textContent = "";
}
function getReaderAudio() {
  return pageAudio();
}
function hasUsableAudio(audio2) {
  return Boolean(audio2 && (audio2.getAttribute("src") || audio2.currentSrc || audio2.querySelector("source[src]")));
}
function getReaderTextTrack(audio2 = getReaderAudio()) {
  return audio2?.textTracks?.[0] || audio2?.querySelector("track")?.track || null;
}
function refreshCaptionItems() {
  const trackItems = captionItemsForTrack(getReaderTextTrack());
  captionItems = trackItems.length ? trackItems : collectManualCaptionItems();
  if (captionIndex >= captionItems.length) captionIndex = captionItems.length - 1;
}
function refreshCaptionItemsFromTrack(track) {
  const trackItems = captionItemsForTrack(track);
  if (!trackItems.length) return;
  captionItems = trackItems;
  if (captionIndex >= captionItems.length) captionIndex = captionItems.length - 1;
  if (captionModeEnabled) showCaptionForCurrentState();
}
function captionItemsForTrack(track) {
  if (!track?.cues?.length) return [];
  return Array.from(track.cues).map((cue) => {
    const elm = elmForCue(cue);
    return elm ? { elm, cue } : null;
  }).filter(Boolean);
}
function collectManualCaptionItems() {
  const main = document.querySelector("main");
  if (!main) return [];
  return Array.from(main.querySelectorAll(CAPTION_CANDIDATE_SELECTOR)).filter((elm) => !elm.closest("[hidden]") && Boolean(captionTextForElement(elm))).map((elm) => ({ elm }));
}
var NOTE_REFERENCE_SELECTOR = '.epubtype_noteref, [role~="doc-noteref"], a[href]';
var NOTE_TARGET_SELECTOR = '.epubtype_footnote, .epubtype_endnote, .epubtype_note, [role="doc-footnote"], [role="doc-endnote"]';
function isNoteReference(reference) {
  if (reference.matches('.epubtype_noteref, [role~="doc-noteref"]')) return true;
  try {
    const url = new URL(reference.getAttribute("href"), window.location.href);
    const here = new URL(window.location.href);
    if (!url.hash || url.origin !== here.origin || url.pathname !== here.pathname) return false;
    return Boolean(document.getElementById(decodeURIComponent(url.hash.slice(1)))?.closest(NOTE_TARGET_SELECTOR));
  } catch {
    return false;
  }
}
function captionContentForElement(elm) {
  const content = document.createDocumentFragment();
  function append(source, target, superscript = false) {
    if (source.nodeType === 3) {
      target.append(document.createTextNode(source.textContent.replace(/\s+/g, " ")));
      return;
    }
    if (source.nodeType !== 1 || source.matches("script, style, template")) return;
    const reference = source.matches(NOTE_REFERENCE_SELECTOR) && isNoteReference(source);
    if (!superscript && (source.tagName === "SUP" || reference)) {
      const sup = document.createElement("sup");
      target.append(sup);
      for (const child of source.childNodes) append(child, sup, true);
    } else {
      for (const child of source.childNodes) append(child, target, superscript);
    }
  }
  const enclosing = elm.closest(NOTE_REFERENCE_SELECTOR);
  if (enclosing && isNoteReference(enclosing) && elm.tagName !== "SUP") {
    const sup = document.createElement("sup");
    content.append(sup);
    append(elm, sup, true);
  } else append(elm, content);
  if (!content.textContent.trim() || elm.classList.contains("epubtype_pagebreak")) {
    content.replaceChildren(document.createTextNode(captionTextForElement(elm)));
  }
  return content;
}
function captionTextForElement(elm) {
  if (elm.classList.contains("epubtype_pagebreak")) {
    const label = elm.getAttribute("aria-label");
    if (label) return label.trim();
  }
  const text = (elm.textContent || "").replace(/\s+/g, " ").trim();
  if (text) return text;
  const images = elm.tagName === "IMG" ? [elm] : Array.from(elm.querySelectorAll("img"));
  return images.map((img) => (img.getAttribute("alt") || "").trim()).filter(Boolean).join(" ");
}
function playableCaptionItems() {
  return captionItems.filter((item) => item.elm && canPlay(item.elm) && Boolean(captionTextForElement(item.elm)));
}
function showCaptionForCurrentState() {
  if (!captionModeEnabled) return;
  if (!captionItems.length) refreshCaptionItems();
  if (showCaptionForBoundaryEntry()) return;
  const currentCueItem = findCaptionItemAtCurrentTime();
  if (currentCueItem) {
    showCaptionItem(currentCueItem);
    return;
  }
  const currentItem = captionItems[captionIndex];
  if (currentItem && canPlay(currentItem.elm)) {
    showCaptionItem(currentItem);
    return;
  }
  const nextIndex = captionIndex >= 0 ? findNextCaptionIndex(captionIndex, 1) : -1;
  if (nextIndex >= 0) {
    showCaptionItem(captionItems[nextIndex]);
    return;
  }
  showCaptionItem(playableCaptionItems()[0] || null);
}
function showCaptionForBoundaryEntry() {
  if (!captionBoundaryEntry) return false;
  const visibleItems = playableCaptionItems();
  const item = captionBoundaryEntry === "last" ? visibleItems[visibleItems.length - 1] : visibleItems[0];
  if (!item) return false;
  showCaptionItem(item);
  syncAudioToCaptionItem(item);
  if (item.cue || !hasPendingCaptionTrack()) captionBoundaryEntry = null;
  return true;
}
function hasPendingCaptionTrack() {
  const audio2 = getReaderAudio();
  const trackEl2 = audio2?.querySelector("track");
  const readyState = typeof trackEl2?.readyState === "number" ? trackEl2.readyState : 0;
  return hasUsableAudio(audio2) && Boolean(trackEl2) && !captionItems.some((item) => item.cue) && readyState < 2;
}
function findCaptionItemAtCurrentTime() {
  const audio2 = getReaderAudio();
  if (!hasUsableAudio(audio2)) return null;
  const activeItem = captionItems.find(
    (item) => item.cue && canPlay(item.elm) && item.cue.startTime <= audio2.currentTime && item.cue.endTime > audio2.currentTime
  );
  if (activeItem) return activeItem;
  return captionItems.find(
    (item) => item.cue && canPlay(item.elm) && item.cue.startTime > audio2.currentTime
  ) || null;
}
function showCaptionForCue(cue, track) {
  if (!captionModeEnabled) return;
  if (!captionItems.some((item2) => item2.cue === cue)) refreshCaptionItemsFromTrack(track);
  const item = captionItems.find((item2) => item2.cue === cue);
  if (item && canPlay(item.elm)) showCaptionItem(item);
}
function showCaptionItem(item) {
  if (!captionModeEnabled || !captionText) return;
  if (!item) {
    clearCaption();
    return;
  }
  captionIndex = captionItems.indexOf(item);
  captionText.replaceChildren(captionContentForElement(item.elm));
}
function handleCaptionKeydown(e) {
  if (!captionModeEnabled || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
  if (!["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"].includes(e.key)) return;
  if (e.target.closest?.('input, select, textarea, [contenteditable="true"], [contenteditable=""]') || isAnyPopoverOpen()) return;
  e.preventDefault();
  const delta = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1;
  stepPhrase(delta);
}
function canStepCaption(delta) {
  if (!captionModeEnabled) return false;
  if (!captionItems.length) refreshCaptionItems();
  return findNextCaptionIndex(captionIndex, delta) >= 0 || Boolean(adjacentPageLink(delta));
}
function stepCaption(delta) {
  if (!captionModeEnabled) return false;
  if (!captionItems.length) refreshCaptionItems();
  const nextIndex = findNextCaptionIndex(captionIndex, delta);
  if (nextIndex < 0) {
    return stepAcrossPageBoundary(delta);
  }
  const item = captionItems[nextIndex];
  syncAudioToCaptionItem(item);
  highlightElm(item.elm);
  showCaptionItem(item);
  return true;
}
function syncAudioToCaptionItem(item) {
  const audio2 = getReaderAudio();
  if (item?.cue && hasUsableAudio(audio2)) {
    cancelSkipPreroll(audio2);
    audio2.currentTime = item.cue.startTime;
  }
}
function findNextCaptionIndex(fromIndex, delta) {
  let index = fromIndex < 0 ? delta > 0 ? -1 : 0 : fromIndex;
  while (true) {
    index += delta;
    if (index < 0 || index >= captionItems.length) return -1;
    if (canPlay(captionItems[index].elm)) return index;
  }
}
function currentCaptionElement() {
  if (!captionModeEnabled) return null;
  const elm = captionItems[captionIndex]?.elm;
  return elm?.isConnected ? elm : null;
}

// template/src/js/continue-playing.js
var continueButton = null;
function playOrOfferToContinue(audio2) {
  audio2.play().catch((error) => {
    if (error?.name === "NotAllowedError") showContinueButton(audio2);
  });
}
function showContinueButton(audio2) {
  if (continueButton) return;
  continueButton = document.createElement("button");
  continueButton.type = "button";
  continueButton.id = "webbook-continue-playing";
  continueButton.className = "webbook";
  continueButton.textContent = "Continue playing";
  continueButton.addEventListener("click", () => {
    audio2.play().catch(() => {
    });
  });
  document.body.append(continueButton);
  const remove = () => {
    continueButton?.remove();
    continueButton = null;
    audio2.removeEventListener("play", remove);
    document.removeEventListener("keydown", dismissOnEscape);
  };
  const dismissOnEscape = (e) => {
    if (e.key === "Escape") remove();
  };
  audio2.addEventListener("play", remove);
  document.addEventListener("keydown", dismissOnEscape);
  continueButton.focus({ preventScroll: true });
}

// template/src/js/book-timeline.js
var TIME_DISPLAY_STORAGE_KEY = "webbook-time-display";
var TIME_DISPLAY_MODES = ["elapsed", "chapter", "book"];
var ASSISTIVE_STEP = 30;
var bookAudioMap = null;
var lastSpokenBookSecond = -1;
var ui = {};
var player = { getAudio: () => null, updatePhraseButtons: () => {
}, onReady: () => {
} };
function initBookTimeline(context2) {
  ui = context2.ui;
  player = context2;
  requestBookAudioMap();
  document.addEventListener("webbook:pagechange", requestBookAudioMap);
}
var audioMapRequested = false;
function requestBookAudioMap() {
  const audio2 = document.querySelector("#webbook-toolbar audio");
  const narrated = Boolean(audio2 && (audio2.getAttribute("src") || audio2.querySelector("source[src]")));
  if (audioMapRequested || !narrated) return;
  audioMapRequested = true;
  loadBookAudioMap();
}
function hasBookTimeline() {
  return Boolean(bookAudioMap);
}
function resetBookTimeline() {
  if (!ui.seekRange || !bookAudioMap) return;
  ui.seekRange.max = bookAudioMap.duration;
  ui.seekRange.step = "any";
  updateBookTimeline(true);
}
function canAnnounceTimeLeft() {
  return Boolean(bookAudioMap && currentAudioMapPage() && player.getAudio());
}
function formatTime(secs) {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}
function formatBookTime(secs) {
  const total = Math.max(0, Math.floor(secs));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor(total % 3600 / 60);
  const seconds = String(total % 60).padStart(2, "0");
  return bookAudioMap?.duration >= 3600 ? `${hours}:${String(minutes).padStart(2, "0")}:${seconds}` : `${Math.floor(total / 60)}:${seconds}`;
}
async function loadBookAudioMap() {
  try {
    const response = await fetch(new URL("audio-map.json", window.location.href), { credentials: "same-origin" });
    if (!response.ok) return;
    const data = await response.json();
    if (data?.version !== 1 || !(data.duration > 0) || !Array.isArray(data.pages) || !Array.isArray(data.chapters)) return;
    bookAudioMap = data;
    player.onReady();
  } catch {
  }
}
function enhanceBookTimeline() {
  if (!ui.seekRange || ui.timelineWrapper) return;
  initTimeDisplayToggle();
  const wrapper = document.createElement("div");
  wrapper.id = "webbook-book-timeline";
  ui.seekRange.before(wrapper);
  wrapper.append(ui.seekRange);
  const label = document.createElement("span");
  label.id = "webbook-timeline-label";
  label.hidden = true;
  wrapper.append(label);
  ui.timelineWrapper = wrapper;
  ui.timelineLabel = label;
  wrapper.addEventListener("pointermove", (event) => {
    if (event.pointerType === "touch") return;
    ui.timelineHovered = true;
    const rect = ui.seekRange.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    showTimelineLabel(ratio * bookAudioMap.duration, ratio * 100);
  });
  wrapper.addEventListener("pointerleave", () => {
    ui.timelineHovered = false;
    if (!timelineLabelWanted()) hideTimelineLabel();
  });
  ui.seekRange.addEventListener("pointerup", (event) => {
    if (event.pointerType === "touch") setTimeout(() => {
      if (!ui.seeking) hideTimelineLabel();
    }, 0);
  });
  ui.seekRange.addEventListener("focus", () => showTimelineValue(Number(ui.seekRange.value)));
  ui.seekRange.addEventListener("blur", () => {
    setTimeout(() => {
      if (!wrapper.matches(":hover") && !ui.seeking) hideTimelineLabel();
    }, 0);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !label.hidden) hideTimelineLabel();
  });
}
function updateBookTimeline(forceSpoken = false) {
  const audio2 = player.getAudio();
  if (!ui.seekRange || !player.getAudio() || !bookAudioMap) return;
  const page = currentAudioMapPage();
  const time = Math.max(0, Math.min(bookAudioMap.duration, (page?.start ?? 0) + player.getAudio().currentTime));
  ui.seekRange.value = time;
  updateTimeDisplay(time);
  const second = Math.floor(time);
  if (forceSpoken || second !== lastSpokenBookSecond) {
    setBookSeekValueText(time);
    lastSpokenBookSecond = second;
  }
  if (document.activeElement === ui.seekRange && ui.timelineLabel && !ui.timelineLabel.hidden) showTimelineValue(time);
}
function timelineLabelWanted() {
  return Boolean(ui.seeking || ui.timelineHovered || ui.seekRange?.matches(":focus-visible"));
}
function currentAudioMapPage() {
  const filename = window.location.pathname.split("/").pop() || "index.html";
  return bookAudioMap?.pages.find((page) => page.href === filename);
}
function bookTimelineStatus() {
  const audio2 = player.getAudio();
  const page = currentAudioMapPage();
  if (!bookAudioMap || !audio2 || !page) return null;
  const time = Math.max(0, Math.min(bookAudioMap.duration, page.start + audio2.currentTime));
  const left = timeLeftAt(time);
  return { time, duration: bookAudioMap.duration, timeLeft: left.book };
}
function pageForBookTime(time) {
  const narrated = bookAudioMap.pages.filter((page) => page.duration > 0);
  return narrated.find((page) => time < page.start + page.duration) || narrated.at(-1) || null;
}
function chapterForBookTime(time) {
  let chapter = null;
  for (const candidate of bookAudioMap.chapters) {
    if (candidate.time > time) break;
    chapter = candidate;
  }
  return chapter;
}
function bookTimeDestination(time) {
  if (!bookAudioMap) return null;
  const target = Math.max(0, Math.min(bookAudioMap.duration, Number(time) || 0));
  const page = pageForBookTime(target);
  const chapter = chapterForBookTime(target);
  return page ? { href: page.href, title: chapter?.title || page.title, samePage: currentAudioMapPage()?.href === page.href } : null;
}
function setBookSeekValueText(time) {
  if (!ui.seekRange) return;
  const chapter = chapterForBookTime(time);
  const page = pageForBookTime(time);
  const title = chapter?.title || page?.title || "Book";
  const chapterTime = Math.max(0, time - (chapter?.time ?? page?.start ?? 0));
  ui.seekRange.setAttribute(
    "aria-valuetext",
    `${title}, ${formatTime(chapterTime)}. ${formatBookTime(time)} of ${formatBookTime(bookAudioMap.duration)}`
  );
}
function showTimelineValue(time) {
  if (timelineLabelWanted()) showTimelineLabel(time, time / bookAudioMap.duration * 100);
  setBookSeekValueText(time);
  updateTimeDisplay(time);
}
function initTimeDisplayToggle() {
  if (!ui.timeDisplay || ui.timeToggle) return;
  let mode = "elapsed";
  try {
    const stored = localStorage.getItem(TIME_DISPLAY_STORAGE_KEY);
    if (TIME_DISPLAY_MODES.includes(stored)) mode = stored;
  } catch {
  }
  ui.timeDisplayMode = mode;
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.id = "webbook-time-mode";
  ui.timeDisplay.replaceWith(toggle);
  toggle.append(ui.timeDisplay);
  ui.timeDisplay.removeAttribute("aria-hidden");
  toggle.addEventListener("click", () => {
    const index = TIME_DISPLAY_MODES.indexOf(ui.timeDisplayMode);
    ui.timeDisplayMode = TIME_DISPLAY_MODES[(index + 1) % TIME_DISPLAY_MODES.length];
    try {
      localStorage.setItem(TIME_DISPLAY_STORAGE_KEY, ui.timeDisplayMode);
    } catch {
    }
    updateBookTimeline(true);
  });
  const hint = "Switches between elapsed time, time left in the chapter and time left in the book";
  toggle.setAttribute("aria-description", hint);
  toggle.title = hint;
  ui.timeToggle = toggle;
}
function timeLeftAt(bookTime) {
  const page = pageForBookTime(bookTime);
  const pageTime = Math.max(0, bookTime - (page?.start ?? 0));
  const rate = player.getAudio()?.playbackRate > 0 ? player.getAudio().playbackRate : 1;
  const chapter = Math.max(0, (page?.duration ?? 0) - pageTime) / rate;
  const book = Math.max(0, bookAudioMap.duration - bookTime) / rate;
  const pageIndex = bookAudioMap.pages.indexOf(page);
  const hasUnnarratedPagesAfter = bookAudioMap.pages.slice(pageIndex + 1).some((candidate) => candidate.duration === 0);
  return { chapter, book, hasUnnarratedPagesAfter };
}
function formatRemainingTime(seconds) {
  return formatBookTime(Math.ceil(Math.max(0, seconds)));
}
function spokenTimeLeft(seconds) {
  const total = Math.max(0, Math.ceil(seconds));
  if (total < 60) return `${total} ${total === 1 ? "second" : "seconds"}`;
  const minutes = Math.ceil(total / 60);
  if (minutes < 60) return `${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return `${hours} ${hours === 1 ? "hour" : "hours"}${remainder ? ` ${remainder} ${remainder === 1 ? "minute" : "minutes"}` : ""}`;
}
function updateTimeDisplay(bookTime) {
  if (!ui.timeDisplay || !bookAudioMap) return;
  const left = timeLeftAt(bookTime);
  if (ui.timeDisplayMode === "chapter") {
    ui.timeDisplay.textContent = `Remaining in chapter: ${formatRemainingTime(left.chapter)}`;
  } else if (ui.timeDisplayMode === "book") {
    ui.timeDisplay.textContent = `${left.hasUnnarratedPagesAfter ? "Left in book audio" : "Left in book"}: ${formatRemainingTime(left.book)}`;
  } else {
    ui.timeDisplay.textContent = `Elapsed: ${formatBookTime(bookTime)}`;
  }
}
function announceTimeLeft() {
  if (!bookAudioMap || !player.getAudio()) return;
  const page = currentAudioMapPage();
  const left = timeLeftAt((page?.start ?? 0) + player.getAudio().currentTime);
  const bookKind = left.hasUnnarratedPagesAfter ? " of narrated time" : "";
  announceReaderAction(`${spokenTimeLeft(left.chapter)} left in this chapter, ${spokenTimeLeft(left.book)}${bookKind} left in the book.`);
}
function showTimelineLabel(time, position) {
  if (!ui.timelineLabel) return;
  const chapter = chapterForBookTime(time);
  const page = pageForBookTime(time);
  ui.timelineLabel.textContent = `${chapter?.title || page?.title || "Book"} \u2014 ${formatBookTime(time)}`;
  ui.timelineLabel.hidden = false;
  const wrapperWidth = ui.timelineWrapper.clientWidth;
  const halfLabel = ui.timelineLabel.offsetWidth / 2;
  const trackStart = ui.seekRange.offsetLeft;
  const desired = trackStart + ui.seekRange.offsetWidth * Math.max(0, Math.min(100, position)) / 100;
  ui.timelineLabel.style.insetInlineStart = `${Math.max(halfLabel, Math.min(wrapperWidth - halfLabel, desired))}px`;
}
function hideTimelineLabel() {
  if (ui.timelineLabel) ui.timelineLabel.hidden = true;
}
function handleBookTimelineKeydown(event) {
  if (!bookAudioMap || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  const current = currentAudioMapPage();
  const position = (current?.start ?? 0) + (player.getAudio()?.currentTime ?? 0);
  let target;
  if (event.key === "ArrowLeft") target = position - 10;
  else if (event.key === "ArrowRight") target = position + 10;
  else if (event.key === "ArrowDown") target = position - ASSISTIVE_STEP;
  else if (event.key === "ArrowUp") target = position + ASSISTIVE_STEP;
  else if (event.key === "Home") target = 0;
  else if (event.key === "End") target = bookAudioMap.duration;
  else if (event.key === "PageUp") {
    target = [...bookAudioMap.chapters].reverse().find((chapter) => chapter.time < position - 0.01)?.time ?? 0;
  } else if (event.key === "PageDown") {
    target = bookAudioMap.chapters.find((chapter) => chapter.time > position + 0.01)?.time ?? bookAudioMap.duration;
  } else return;
  event.preventDefault();
  seekBookTime(target, Boolean(player.getAudio() && !player.getAudio().paused && !player.getAudio().ended));
}
function stepFromAssistiveTechnology() {
  const current = currentAudioMapPage();
  const position = (current?.start ?? 0) + (player.getAudio()?.currentTime ?? 0);
  const requested = Number(ui.seekRange.value);
  if (requested === position) return;
  const target = position + Math.sign(requested - position) * ASSISTIVE_STEP;
  seekBookTime(target, Boolean(player.getAudio() && !player.getAudio().paused && !player.getAudio().ended));
}
function seekBookTime(time, autoplay) {
  if (!bookAudioMap) return;
  const target = Math.max(0, Math.min(bookAudioMap.duration, time));
  const page = pageForBookTime(target);
  if (!page) return;
  const pageTime = Math.max(0, Math.min(page.duration, target - page.start));
  showTimelineValue(target);
  const current = currentAudioMapPage();
  if (current?.href === page.href) {
    cancelSkipPreroll(player.getAudio());
    player.getAudio().currentTime = pageTime;
    player.updatePhraseButtons();
    return Promise.resolve();
  }
  return import("./chunk-ZU37W27J.js").then(({ navigateTo: navigateTo2 }) => {
    return navigateTo2(page.href, { audioTime: pageTime, autoplay, moveFocus: false });
  });
}

// template/src/js/player.js
var PLAY_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20" aria-hidden="true"><polygon points="5,3 19,12 5,21"/></svg>`;
var PAUSE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20" aria-hidden="true"><rect x="5" y="3" width="4" height="18"/><rect x="15" y="3" width="4" height="18"/></svg>`;
var audio = null;
var metadataTrack = null;
var trackEl = null;
var shouldAutoplayThisPage = false;
var startsPartway = false;
var returnToTime = null;
var controlsReady = false;
var ui2 = {};
function initPlayer() {
  keepHighlightInView();
  registerAction({
    id: "play-pause",
    label: "Play or pause",
    group: "Narration",
    defaultKeys: [{ code: "Backslash" }],
    run: togglePlayback,
    isAvailable: () => Boolean(metadataTrack)
  });
  for (const [id, label, code, delta] of [
    ["previous-phrase", "Previous phrase", "BracketLeft", -1],
    ["next-phrase", "Next phrase", "BracketRight", 1]
  ]) {
    registerAction({
      id,
      label,
      group: "Narration",
      defaultKeys: [{ code }],
      run: () => stepPhrase(delta),
      isAvailable: () => {
        const cues = pageCues();
        if (!cues.length) return canStepCaption(delta);
        return Boolean(cues.length && (playableCueIndex(cues, cueIndexAtOrBefore(audio.currentTime, cues), delta) >= 0 || adjacentPageLink(delta)));
      }
    });
  }
  registerAction({
    id: "go-to-narration",
    label: "Go to narration position",
    group: "Narration",
    defaultKeys: [{ code: "KeyP", alt: true, shift: true }],
    run: goToNarrationPosition,
    isAvailable: () => Boolean(narrationPositionElement()) && document.querySelector("main")?.getAttribute("aria-hidden") !== "true"
  });
  registerAction({
    id: "play-from-here",
    label: "Play from here",
    group: "Narration",
    defaultKeys: [{ code: "KeyR", alt: true, shift: true }],
    run: playFromHere,
    isAvailable: () => pageCues().length > 0
  });
  registerAction({
    id: "announce-time-left",
    label: "Announce time left",
    group: "Narration",
    defaultKeys: [{ code: "KeyL", alt: true, shift: true }],
    run: announceTimeLeft,
    isAvailable: canAnnounceTimeLeft
  });
  initDocumentListeners();
  startPlayerForPage();
  initBookTimeline({
    ui: ui2,
    getAudio: () => audio,
    updatePhraseButtons,
    onReady: () => {
      if (!ui2.seekRange) return;
      enhanceBookTimeline();
      resetTimeline();
    }
  });
}
function startPlayerForPage({ audioTime } = {}) {
  returnToTime = typeof audioTime === "number" ? audioTime : null;
  shouldAutoplayThisPage = consumeAutoplayRequest();
  startsPartway = Boolean(window.location.hash) || consumePageEntry() !== null;
  phraseStepper = null;
  metadataTrack = null;
  trackEl = null;
  const thisPageAudio = pageAudio();
  if (thisPageAudio && thisPageAudio !== audio) {
    audio = thisPageAudio;
    initAudioElement();
  }
  if (!audio) return;
  applyStoredPlaybackRate();
  if (!controlsReady) initControls();
  resetTimeline();
  const controls = document.querySelectorAll("#webbook-narration-position, #webbook-audio-controls");
  const hasAudioSource = Boolean(audio.getAttribute("src") || audio.querySelector("source[src]"));
  if (!hasAudioSource) {
    controls.forEach((group) => group.setAttribute("hidden", ""));
    return;
  }
  controls.forEach((group) => group.removeAttribute("hidden"));
  trackEl = audio.querySelector("track");
  if (!trackEl) return;
  metadataTrack = trackEl.track || audio.textTracks?.[0];
  if (!metadataTrack) return;
  if (metadataTrack.mode === "disabled") metadataTrack.mode = "hidden";
  metadataTrack.addEventListener("cuechange", handleCueChange);
  phraseStepper = stepPhraseOnPage;
  if (trackEl.readyState >= 2) {
    handleTrackReady();
  } else {
    const pageTrackEl = trackEl;
    pageTrackEl.addEventListener("load", () => {
      if (pageTrackEl === trackEl) handleTrackReady();
    }, { once: true });
  }
  if (shouldAutoplayThisPage && !startsPartway) playOrOfferToContinue(audio);
  updatePhraseButtons();
}
function initAudioElement() {
  audio.addEventListener("play", updatePlayPause);
  audio.addEventListener("play", explainExcludedPage);
  audio.addEventListener("pause", updatePlayPause);
  audio.addEventListener("playing", catchUpHighlight);
  audio.addEventListener("loadedmetadata", setSeekMax);
  audio.addEventListener("ratechange", () => updateTimelineFromAudio(true));
  audio.addEventListener("timeupdate", () => {
    restoreSkipMute(audio);
    if (ui2.seekRange && !ui2.seeking) {
      updateTimelineFromAudio();
    }
  });
  audio.addEventListener("seeked", updatePhraseButtons);
  audio.addEventListener("seeked", () => {
    const cues = pageCues();
    const index = cues.findIndex((cue2) => cue2.startTime <= audio.currentTime && audio.currentTime < cue2.endTime);
    const cue = cues[index];
    const elm = cue && elmForCue(cue);
    if (elm) handleCuePlayability(elm, audio, metadataTrack, index, cue);
  });
  audio.addEventListener("play", () => {
    focusedWhilePaused = null;
  });
  audio.addEventListener("seeking", () => {
    focusedWhilePaused = null;
  });
  audio.addEventListener("ended", () => {
    cancelSkipPreroll(audio);
    clearNarrationHighlight();
    updatePlayPause();
    const next = document.querySelector("#webbook-spine-nav a[rel=next][href]");
    if (next) {
      requestAutoplayForForwardSpineLink(next);
      next.click();
    }
  });
}
function applyStoredPlaybackRate() {
  let percent = 100;
  try {
    percent = Number(localStorage.getItem("webbook-rate")) || 100;
  } catch {
  }
  audio.playbackRate = Math.max(50, Math.min(200, percent)) / 100;
}
function initControls() {
  controlsReady = true;
  ui2.previousPhraseBtn = document.querySelector("#webbook-previous-phrase");
  ui2.playPauseBtn = document.querySelector("#webbook-audio-playpause");
  ui2.nextPhraseBtn = document.querySelector("#webbook-next-phrase");
  ui2.seekRange = document.querySelector("#webbook-seek");
  ui2.timeDisplay = document.querySelector("#webbook-time");
  ui2.seeking = false;
  ui2.playPauseBtn?.addEventListener("click", togglePlayback);
  if (ui2.seekRange) {
    ui2.seekRange.addEventListener("pointerdown", () => {
      ui2.seeking = true;
    });
    ui2.seekRange.addEventListener("pointerup", () => setTimeout(() => {
      if (!ui2.seeking) return;
      ui2.seeking = false;
      updateTimelineFromAudio();
    }, 0));
    ui2.seekRange.addEventListener("pointercancel", () => {
      ui2.seeking = false;
      updateTimelineFromAudio();
    });
    ui2.seekRange.addEventListener("input", () => {
      if (hasBookTimeline()) {
        if (ui2.seeking) showTimelineValue(Number(ui2.seekRange.value));
        else stepFromAssistiveTechnology();
        return;
      }
      cancelSkipPreroll(audio);
      audio.currentTime = ui2.seekRange.value;
      setSeekValueText(ui2.seekRange.value);
      updatePhraseButtons();
    });
    ui2.seekRange.addEventListener("change", () => {
      if (!hasBookTimeline() || !ui2.seeking) return;
      const wasPlaying = Boolean(audio && !audio.paused && !audio.ended);
      ui2.seeking = false;
      seekBookTime(Number(ui2.seekRange.value), wasPlaying);
    });
    ui2.seekRange.addEventListener("keydown", handleBookTimelineKeydown);
  }
  ui2.previousPhraseBtn?.addEventListener("click", () => stepPhrase(-1));
  ui2.nextPhraseBtn?.addEventListener("click", () => stepPhrase(1));
  if (hasBookTimeline()) enhanceBookTimeline();
}
function initDocumentListeners() {
  trackReaderFocus();
  document.addEventListener("click", (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    const link = e.target instanceof Element ? e.target.closest("a[href]") : null;
    if (!link || link.target && link.target !== "_self") return;
    let url;
    try {
      url = new URL(link.href, window.location.href);
    } catch {
      return;
    }
    if (url.origin !== window.location.origin || !audio) return;
    const playing = !audio.paused && !audio.ended;
    if (normalizeAutoplayUrl(url.href) === normalizeAutoplayUrl(window.location.href)) {
      if (url.hash) seekToHash(url.hash);
    } else if (link.matches("#webbook-spine-nav a[rel=next]")) {
      if (playing) {
        requestAutoplayForForwardSpineLink(link);
      } else if (!audio.ended) {
        clearAutoplayRequest();
      }
    } else if (link.matches("#webbook-spine-nav a")) {
    } else if (playing) {
      requestAutoplayForLink(link);
    }
  });
  window.addEventListener("hashchange", () => seekToHash(window.location.hash));
}
function resetTimeline() {
  if (ui2.seekRange) {
    if (hasBookTimeline()) {
      resetBookTimeline();
    } else {
      ui2.seekRange.value = 0;
      ui2.seekRange.max = isFinite(audio.duration) ? audio.duration : 0;
      setSeekValueText(0);
    }
  }
  if (ui2.timeDisplay && !hasBookTimeline()) ui2.timeDisplay.textContent = formatTime(0);
  updatePlayPause();
}
function setSeekValueText(time) {
  if (!ui2.seekRange) return;
  const numericTime = typeof time === "number" ? time : parseFloat(String(time));
  ui2.seekRange.setAttribute("aria-valuetext", formatTime(Number.isFinite(numericTime) ? numericTime : 0));
}
function updateTimelineFromAudio(forceSpoken = false) {
  if (!ui2.seekRange || !audio) return;
  if (hasBookTimeline()) {
    updateBookTimeline(forceSpoken);
    return;
  }
  ui2.seekRange.value = audio.currentTime;
  setSeekValueText(audio.currentTime);
  if (ui2.timeDisplay) ui2.timeDisplay.textContent = formatTime(audio.currentTime);
}
function setSeekMax() {
  if (ui2.seekRange && !hasBookTimeline() && isFinite(audio.duration)) ui2.seekRange.max = audio.duration;
}
function updatePlayPause() {
  if (!ui2.playPauseBtn || !audio) return;
  const paused = audio.paused || audio.ended;
  ui2.playPauseBtn.innerHTML = paused ? PLAY_SVG : PAUSE_SVG;
  ui2.playPauseBtn.title = paused ? "Play" : "Pause";
  ui2.playPauseBtn.setAttribute("aria-label", paused ? "Play" : "Pause");
}
function togglePlayback() {
  if (!metadataTrack) return;
  if (audio.paused || audio.ended) {
    if (explainExcludedPage()) return;
    startFromReaderFocus();
    playOrOfferToContinue(audio);
  } else audio.pause();
}
function explainExcludedPage() {
  if (!allNarrationSkipped(metadataTrack)) return false;
  cancelSkipPreroll(audio);
  audio.pause();
  announceReaderAction("All narrated content on this page is being skipped. Check the skip settings in Narration.");
  return true;
}
var focusedWhilePaused = null;
var lastUserInput = 0;
var USER_FOCUS_WINDOW = 1e3;
function trackReaderFocus() {
  for (const type of ["keydown", "pointerdown"]) {
    document.addEventListener(type, () => {
      lastUserInput = Date.now();
    }, { capture: true });
  }
  document.addEventListener("focusin", (e) => {
    if (!audio || !(audio.paused || audio.ended) || !(e.target instanceof Element)) return;
    if (!document.querySelector("main")?.contains(e.target)) return;
    const userMoved = Date.now() - lastUserInput < USER_FOCUS_WINDOW || pageCues().some((cue) => elmForCue(cue) === e.target);
    if (userMoved) focusedWhilePaused = e.target;
  });
}
function startFromReaderFocus() {
  const target = focusedWhilePaused;
  focusedWhilePaused = null;
  if (!target?.isConnected) return;
  const cues = pageCues();
  const cue = cueForReaderElement(cues, target);
  const current = cues[cueIndexAtOrBefore(audio.currentTime, cues)];
  if (cue && cue !== current) seekToCue(cue);
}
function cueForReaderElement(cues, target) {
  const block = target.closest('h1, h2, h3, h4, h5, h6, [role="heading"], p, li, td, th, dt, dd, figcaption, caption') ?? target;
  return cueForElement(cues, target) ?? cueForElement(cues, block) ?? cues.find((cue) => {
    const elm = elmForCue(cue);
    return elm && Boolean(target.compareDocumentPosition(elm) & Node.DOCUMENT_POSITION_FOLLOWING);
  }) ?? null;
}
function pageCues() {
  return Array.from(metadataTrack?.cues || []);
}
function updatePhraseButtons() {
  if (!metadataTrack) return;
  const cues = pageCues();
  const currentIdx = cueIndexAtOrBefore(audio.currentTime, cues);
  if (ui2.previousPhraseBtn) {
    ui2.previousPhraseBtn.disabled = playableCueIndex(cues, currentIdx, -1) < 0 && !adjacentPageLink(-1);
  }
  if (ui2.nextPhraseBtn) {
    ui2.nextPhraseBtn.disabled = playableCueIndex(cues, currentIdx, 1) < 0 && !adjacentPageLink(1);
  }
}
function playableCueIndex(cues, fromIdx, delta) {
  for (let i = fromIdx + delta; i >= 0 && i < cues.length; i += delta) {
    const elm = elmForCue(cues[i]);
    if (!elm || canPlay(elm)) return i;
  }
  return -1;
}
function stepPhraseOnPage(delta) {
  const cues = pageCues();
  if (!cues.length) return false;
  const idx = playableCueIndex(cues, cueIndexAtOrBefore(audio.currentTime, cues), delta);
  if (idx < 0) return stepAcrossPageBoundary(delta);
  seekToCue(cues[idx]);
  return true;
}
function seekToCue(cue) {
  cancelSkipPreroll(audio);
  audio.currentTime = cue.startTime;
  updatePhraseButtons();
  const elm = elmForCue(cue);
  if (elm) highlightElm(elm);
  showCaptionForCue(cue, metadataTrack);
}
function narrationPositionElement() {
  const cues = pageCues();
  const idx = cues.length ? Math.max(0, cueIndexAtOrBefore(audio.currentTime, cues)) : -1;
  return lastNarratedElement() ?? (idx >= 0 ? elmForCue(cues[idx]) : null);
}
function goToNarrationPosition() {
  const elm = narrationPositionElement();
  if (!elm) return;
  highlightElm(elm);
  if (!elm.matches("a[href], button, input, select, textarea, [tabindex]")) elm.setAttribute("tabindex", "-1");
  elm.focus({ preventScroll: true });
}
function cueAtReader(cues) {
  const focused = document.activeElement;
  if (focused && focused !== document.body && document.querySelector("main")?.contains(focused)) {
    const match = cueForReaderElement(cues, focused);
    if (match) return match;
  }
  const located = cues.map((cue) => ({ cue, elm: elmForCue(cue) })).filter(({ elm }) => elm);
  const selection = window.getSelection?.();
  if (selection && selection.rangeCount && !selection.isCollapsed) {
    const node = selection.getRangeAt(0).startContainer;
    const match = located.find(({ elm }) => elm.contains(node)) ?? located.find(({ elm }) => node.compareDocumentPosition(elm) & Node.DOCUMENT_POSITION_FOLLOWING);
    if (match) return match.cue;
  }
  return null;
}
function playFromHere() {
  const cue = cueAtReader(pageCues());
  if (cue) seekToCue(cue);
  playOrOfferToContinue(audio);
}
function makePhrasesFocusable() {
  for (const cue of pageCues()) {
    const elm = elmForCue(cue);
    if (elm && !elm.matches("a[href], button, input, select, textarea, [tabindex]")) elm.setAttribute("tabindex", "-1");
  }
}
function cueIndexAtOrBefore(time, cues) {
  for (let i = 0; i < cues.length; i++) {
    if (cues[i].startTime <= time && cues[i].endTime > time) return i;
    if (cues[i].startTime > time) return i - 1;
  }
  return cues.length - 1;
}
function handleTrackReady() {
  cacheCueElements(metadataTrack);
  refreshCaptionItemsFromTrack(metadataTrack);
  makePhrasesFocusable();
  seekToHashTarget(audio, metadataTrack, window.location.hash, { place: returnToTime === null });
  applyResumeAudioTimeIfMatching(audio);
  seekToPageEntry();
  if (returnToTime !== null) {
    audio.currentTime = returnToTime;
    returnToTime = null;
  } else {
    settlePositionUrlPlacement();
  }
  updatePhraseButtons();
  if ((shouldAutoplayThisPage || !audio.paused) && explainExcludedPage()) {
    document.dispatchEvent(new CustomEvent("webbook:playerready"));
    return;
  }
  if (shouldAutoplayThisPage && startsPartway) playOrOfferToContinue(audio);
  catchUpHighlight();
  document.dispatchEvent(new CustomEvent("webbook:playerready"));
}
function catchUpHighlight() {
  if (!audio || audio.paused || !metadataTrack) return;
  const cue = Array.from(metadataTrack.activeCues || []).pop();
  const elm = cue ? elmForCue(cue) : null;
  if (elm && elm !== highlightedElement()) handleCueChange({ target: metadataTrack });
}
function seekToPageEntry() {
  const entry = consumePageEntry();
  if (!entry) return;
  const cues = pageCues();
  const idx = entry === "last" ? playableCueIndex(cues, cues.length, -1) : playableCueIndex(cues, -1, 1);
  if (idx >= 0) seekToCue(cues[idx]);
}
function seekToHash(hash) {
  if (!metadataTrack) return;
  cancelSkipPreroll(audio);
  if (seekToHashTarget(audio, metadataTrack, hash)) updatePhraseButtons();
}
function handleCueChange(e) {
  const track = e.target;
  if (track !== metadataTrack) return;
  restoreSkipMute(audio);
  const activeCues = Array.from(track.activeCues || []);
  if (activeCues.length > 0) {
    const cue = activeCues[activeCues.length - 1];
    const activeCueIdx = Array.from(track.cues || []).indexOf(cue);
    updatePhraseButtons();
    const elm = elmForCue(cue);
    if (!elm) return;
    if (!handleCuePlayability(elm, audio, track, activeCueIdx, cue)) return;
    highlightElm(elm);
    syncPositionUrl(elm, cueNeedsTime(cue, elm) ? cue.startTime : void 0);
    recordResumePosition(elm, audio);
    showCaptionForCue(cue, track);
    handleEscapableStructure(elm, track, activeCueIdx);
    handleNarratedPhrase(elm);
  } else {
    clearNarrationHighlight();
    hideEscape();
    hidePhraseNotes();
    updatePhraseButtons();
  }
}
var phraseStepper = null;
function stepPhrase(delta) {
  return phraseStepper ? phraseStepper(delta) : stepCaption(delta);
}

// template/src/js/in-place-navigation.js
var PREFETCH_LIMIT = 4;
var pageCache = /* @__PURE__ */ new Map();
var currentPage = "";
var navigationCount = 0;
function initInPlaceNavigation() {
  if (!window.fetch || !window.DOMParser || !history.pushState) return;
  currentPage = pagePath(window.location.href);
  document.addEventListener("click", handleLinkClick);
  window.addEventListener("popstate", (e) => {
    if (pagePath(window.location.href) !== currentPage) {
      loadInPlace(new URL(window.location.href), {
        push: false,
        moveFocus: true,
        scrollY: e.state?.webbookScrollY,
        audioTime: e.state?.webbookAudioTime,
        autoplay: e.state?.webbookWasPlaying === true
      });
    }
  });
  prefetchNextPage();
}
function navigateTo(href, {
  push = true,
  moveFocus = true,
  audioTime,
  autoplay = false,
  scrollY,
  state = null,
  replace = false
} = {}) {
  let url;
  try {
    url = new URL(href, window.location.href);
  } catch {
    return;
  }
  if (currentPage && pagePath(url.href) === currentPage) {
    const audio2 = document.querySelector("#webbook-toolbar audio");
    if (audio2 && typeof audioTime === "number") audio2.currentTime = audioTime;
    if (push) history.pushState(state, "", url.href);
    else history.replaceState(state, "", url.href);
    const target = url.hash ? document.getElementById(decodeURIComponent(url.hash.slice(1))) : null;
    if (typeof scrollY === "number") scrollToReading(scrollY);
    else target?.scrollIntoView();
    if (moveFocus && target) {
      if (!target.matches("a[href], button, input, select, textarea, [tabindex]")) target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
    }
    if (autoplay && audio2?.paused) audio2.play().catch(() => {
    });
    return;
  }
  if (autoplay) requestAutoplayForLink({ href: url.href });
  if (!currentPage || !isOtherPageOfBook(url)) {
    window.location.href = url.href;
    return;
  }
  return loadInPlace(url, { push, moveFocus, audioTime, scrollY, state, replace, autoplay });
}
function handleLinkClick(e) {
  if (e.defaultPrevented || e.button !== 0 || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
  const link = e.target instanceof Element ? e.target.closest("a[href]") : null;
  if (!link || link.target && link.target !== "_self" || link.hasAttribute("download")) return;
  let url;
  try {
    url = new URL(link.href, window.location.href);
  } catch {
    return;
  }
  if (!isOtherPageOfBook(url)) return;
  e.preventDefault();
  loadInPlace(url, { push: true, moveFocus: e.isTrusted });
}
function isOtherPageOfBook(url) {
  if (url.origin !== window.location.origin) return false;
  const here = new URL(window.location.href);
  const directory = (path) => path.slice(0, path.lastIndexOf("/") + 1);
  if (directory(url.pathname) !== directory(here.pathname)) return false;
  if (!/(\.html?|\/)$/i.test(url.pathname)) return false;
  return pagePath(url.href) !== currentPage;
}
function pagePath(href) {
  try {
    return new URL(href, window.location.href).pathname.replace(/\/index\.html$/, "/");
  } catch {
    return "";
  }
}
async function loadInPlace(url, { push, moveFocus, scrollY, audioTime, state = null, replace = false, autoplay = false }) {
  const navigation2 = ++navigationCount;
  let doc;
  try {
    doc = await fetchPage(url);
  } catch {
    doc = null;
  }
  if (navigation2 !== navigationCount) return;
  if (!doc || !canSwapIn(doc)) {
    if (push) window.location.href = url.href;
    else window.location.reload();
    return;
  }
  await prepareDesignStyles(doc);
  if (navigation2 !== navigationCount) return;
  document.dispatchEvent(new CustomEvent("webbook:pageplacing"));
  const focusWasInContent = !document.activeElement || document.activeElement === document.body || Boolean(document.activeElement.closest("main"));
  if (push) {
    const audio2 = document.querySelector("#webbook-toolbar audio");
    const narrated = audio2?.getAttribute("src") || audio2?.querySelector("source[src]");
    const playing = narrated ? !audio2.paused : false;
    history.replaceState({
      ...history.state,
      webbookScrollY: readingScroll(),
      webbookAudioTime: narrated ? playing ? audio2.currentTime : readingPositionTime(audio2) : void 0,
      webbookWasPlaying: playing
    }, "");
  }
  if (autoplay) requestAutoplayForLink({ href: url.href });
  swapIn(doc);
  if (push) history.pushState(state, "", url.href);
  else if (replace) history.replaceState(state, "", url.href);
  currentPage = pagePath(url.href);
  startPage({ audioTime });
  placeReader(url.hash, moveFocus || focusWasInContent, scrollY);
  document.dispatchEvent(new CustomEvent("webbook:pagechange", { detail: { url: url.href } }));
  prefetchNextPage();
}
function fetchPage(url) {
  const key = pagePath(url.href);
  if (!pageCache.has(key)) {
    const page = fetch(url.href, { credentials: "same-origin" }).then((response) => {
      if (!response.ok) throw new Error(`${response.status} ${url.href}`);
      return response.text();
    }).then((html) => {
      const doc = new DOMParser().parseFromString(html, "text/html");
      enhanceDocument(doc);
      return doc;
    });
    page.catch(() => pageCache.delete(key));
    pageCache.set(key, page);
    while (pageCache.size > PREFETCH_LIMIT) pageCache.delete(pageCache.keys().next().value);
  }
  return pageCache.get(key);
}
function prefetchNextPage() {
  const next = document.querySelector("#webbook-spine-nav a[rel=next][href]");
  if (next) fetchPage(new URL(next.href, window.location.href)).catch(() => {
  });
}
function canSwapIn(doc) {
  const root2 = doc.documentElement;
  if (root2.dataset.webbookContract !== document.documentElement.dataset.webbookContract) return false;
  const bookId = (d) => d.querySelector('meta[name="webbook-book-id"]')?.content?.trim() || "";
  if (bookId(doc) !== bookId(document)) return false;
  const stylesheets = (d) => Array.from(d.querySelectorAll('link[rel~="stylesheet"]:not([data-webbook-publisher-style]):not([data-webbook-ui-style])'), (link) => link.getAttribute("href")).join("\n");
  if (stylesheets(doc) !== stylesheets(document)) return false;
  return Boolean(doc.querySelector("main") && doc.querySelector("#webbook-toolbar") && document.querySelector("main"));
}
async function prepareDesignStyles(doc) {
  const incoming = Array.from(doc.querySelectorAll("link[data-webbook-publisher-style]"));
  const hrefs = new Set(incoming.map((link) => link.getAttribute("href")));
  const current = Array.from(document.querySelectorAll("link[data-webbook-publisher-style]"));
  await Promise.all(incoming.filter((link) => !current.some((old) => old.getAttribute("href") === link.getAttribute("href"))).map((link) => new Promise((resolve) => {
    const added = document.importNode(link, true);
    const timer = setTimeout(resolve, 3e3);
    added.addEventListener("load", () => {
      clearTimeout(timer);
      resolve();
    }, { once: true });
    added.addEventListener("error", () => {
      clearTimeout(timer);
      resolve();
    }, { once: true });
    document.head.append(added);
  })));
  current.filter((link) => !hrefs.has(link.getAttribute("href"))).forEach((link) => link.remove());
}
function swapIn(doc) {
  document.querySelectorAll("[popover]").forEach((popover) => {
    if (popover.matches(":popover-open")) popover.hidePopover();
  });
  hideEscape();
  clearNarrationHighlight();
  document.title = doc.title;
  const lang = doc.documentElement.getAttribute("lang");
  if (lang) document.documentElement.setAttribute("lang", lang);
  for (const name of [
    "data-webbook-writing-mode",
    "data-webbook-line-break",
    "data-webbook-word-break",
    "data-webbook-page-progression",
    "data-webbook-has-published"
  ]) {
    const value = doc.documentElement.getAttribute(name);
    if (doc.documentElement.hasAttribute(name)) document.documentElement.setAttribute(name, value ?? "");
    else document.documentElement.removeAttribute(name);
  }
  applyAppearance();
  const main = document.querySelector("main");
  const newMain = doc.querySelector("main");
  for (const { name } of Array.from(main.attributes)) {
    if (name !== "aria-hidden") main.removeAttribute(name);
  }
  for (const { name, value } of Array.from(newMain.attributes)) {
    if (name !== "aria-hidden") main.setAttribute(name, value);
  }
  main.replaceChildren(...Array.from(newMain.childNodes, (node) => document.importNode(node, true)));
  const spineNav = document.querySelector("#webbook-spine-nav");
  const newSpineNav = doc.querySelector("#webbook-spine-nav");
  if (spineNav && newSpineNav) {
    spineNav.replaceChildren(...Array.from(newSpineNav.childNodes, (node) => document.importNode(node, true)));
  }
  const tocLinks = document.querySelectorAll("#webbook-toc-nav ol a");
  const newTocLinks = doc.querySelectorAll("#webbook-toc-nav ol a");
  if (tocLinks.length === newTocLinks.length) {
    tocLinks.forEach((link, i) => {
      const current = newTocLinks[i].getAttribute("aria-current");
      if (current) link.setAttribute("aria-current", current);
      else link.removeAttribute("aria-current");
    });
  }
  const progress = document.querySelector("#webbook-progress");
  const newProgress = doc.querySelector("#webbook-progress");
  if (progress && newProgress) {
    progress.dataset.webbookPageNumber = newProgress.dataset.webbookPageNumber || "";
    progress.dataset.webbookPageCount = newProgress.dataset.webbookPageCount || "";
    const label = progress.querySelector("#webbook-current-page-label");
    const newLabel = newProgress.querySelector("#webbook-current-page-label");
    if (label && newLabel) label.textContent = newLabel.textContent;
  }
  swapNarration(doc);
}
function swapNarration(doc) {
  const toolbar = document.querySelector("#webbook-toolbar");
  const newAudio = doc.querySelector("#webbook-toolbar audio");
  let audio2 = document.querySelector("#webbook-toolbar audio");
  if (!newAudio) {
    if (audio2) {
      audio2.pause();
      audio2.removeAttribute("src");
      audio2.replaceChildren();
      audio2.load();
    }
    document.querySelectorAll("#webbook-narration-position, #webbook-audio-controls").forEach((group) => group.setAttribute("hidden", ""));
    return;
  }
  if (!audio2 && toolbar) {
    const tocButton = toolbar.querySelector('button[popovertarget="webbook-toc-nav"]');
    audio2 = document.importNode(newAudio, true);
    audio2.replaceChildren();
    audio2.removeAttribute("src");
    const newPosition = doc.querySelector("#webbook-narration-position");
    const newControls = doc.querySelector("#webbook-audio-controls");
    const after = tocButton ? tocButton.nextSibling : toolbar.firstChild;
    toolbar.insertBefore(audio2, after);
    if (newPosition) toolbar.insertBefore(document.importNode(newPosition, true), toolbar.firstChild);
    if (newControls) toolbar.insertBefore(document.importNode(newControls, true), audio2.nextSibling);
  }
  if (!audio2) return;
  audio2.replaceChildren(...Array.from(newAudio.childNodes, (node) => document.importNode(node, true)));
  const src = newAudio.getAttribute("src");
  if (src) audio2.setAttribute("src", src);
  else audio2.removeAttribute("src");
  audio2.load();
}
function startPage({ audioTime }) {
  resetPageEntry();
  recordPageVisit();
  startPlayerForPage({ audioTime });
  startCaptionModeForPage();
}
var imageScrollAbort = null;
function keepScrollWhileImagesLoad(scrollY) {
  imageScrollAbort?.abort();
  const pending = Array.from(document.querySelectorAll("main img")).filter((img) => !img.complete);
  if (!pending.length) return;
  const abort = imageScrollAbort = new AbortController();
  const stop = () => abort.abort();
  for (const type of ["wheel", "touchstart", "keydown", "pointerdown"]) {
    window.addEventListener(type, stop, { once: true, passive: true, signal: abort.signal });
  }
  setTimeout(stop, 5e3);
  let left = pending.length;
  for (const img of pending) {
    const settle = () => {
      if (abort.signal.aborted) return;
      scrollToReading(scrollY);
      if (--left === 0) stop();
    };
    img.addEventListener("load", settle, { once: true, signal: abort.signal });
    img.addEventListener("error", settle, { once: true, signal: abort.signal });
  }
}
function placeReader(hash, moveFocus, scrollY) {
  const id = hash ? decodeURIComponent(hash.slice(1)) : "";
  const target = id ? document.getElementById(id) : null;
  if (typeof scrollY === "number") {
    scrollToReading(scrollY);
    keepScrollWhileImagesLoad(scrollY);
  } else if (target) {
    target.scrollIntoView();
  } else {
    scrollToReading(0);
  }
  const main = document.querySelector("main");
  if (!moveFocus || main?.getAttribute("aria-hidden") === "true") return;
  const focusTarget = target || main?.querySelector("h1, h2, h3, h4, h5, h6") || main;
  if (!focusTarget) return;
  if (!focusTarget.matches("a[href], button, input, select, textarea, [tabindex]")) {
    focusTarget.setAttribute("tabindex", "-1");
  }
  focusTarget.focus({ preventScroll: true });
}

export {
  settingsSection,
  appendSetting,
  registerAction,
  getActions,
  runAction,
  announceReaderAction,
  initReaderActionNotice,
  readingScroll,
  scrollToReading,
  viewportLength,
  readingStart,
  readingEnd,
  prepareReaderShell,
  readSetting,
  writeSetting,
  optionElement,
  initSettingsFilter,
  initWritingMode,
  pageAudio,
  lastNarratedElement,
  readingLine,
  positionAnchor,
  syncPositionUrl,
  initAppearance,
  initResumeSetting,
  initResumePosition,
  pausedForSound,
  cancelSoundPause,
  endNotePause,
  initNotesInPlace,
  initEscapability,
  initSkippability,
  clearAutoplayRequest,
  requestAutoplayForForwardSpineLink,
  adjacentPageLink,
  initPageActions,
  initCaptionMode,
  currentCaptionElement,
  playOrOfferToContinue,
  bookTimelineStatus,
  bookTimeDestination,
  seekBookTime,
  initPlayer,
  initInPlaceNavigation,
  navigateTo,
  fetchPage,
  initSettings,
  keySpecForEvent,
  normalizeKeySpec,
  shortcutRejection,
  shortcutWarning,
  getActionKeys,
  assignShortcut,
  shortcutConflicts,
  restoreActionDefaults,
  removeShortcut,
  resetShortcuts,
  setShortcutCapture,
  shortcutName,
  loadKeyboardLayout,
  initKeyboardShortcutEditorButton,
  initKeyboardShortcuts2 as initKeyboardShortcuts
};
