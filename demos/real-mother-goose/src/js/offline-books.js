var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
};

// template/src/js/reader-actions.js
var init_reader_actions = __esm({
  "template/src/js/reader-actions.js"() {
    "use strict";
  }
});

// template/src/js/settings-sections.js
var init_settings_sections = __esm({
  "template/src/js/settings-sections.js"() {
    "use strict";
  }
});

// template/src/js/reading-axis.js
var init_reading_axis = __esm({
  "template/src/js/reading-axis.js"() {
    "use strict";
  }
});

// template/src/js/reader-shell.js
var init_reader_shell = __esm({
  "template/src/js/reader-shell.js"() {
    "use strict";
  }
});

// template/src/js/stored-settings.js
var init_stored_settings = __esm({
  "template/src/js/stored-settings.js"() {
    "use strict";
  }
});

// template/src/js/settings-filter.js
var init_settings_filter = __esm({
  "template/src/js/settings-filter.js"() {
    "use strict";
  }
});

// template/src/js/appearance-state.js
var init_appearance_state = __esm({
  "template/src/js/appearance-state.js"() {
    "use strict";
  }
});

// template/src/js/writing-mode.js
var init_writing_mode = __esm({
  "template/src/js/writing-mode.js"() {
    "use strict";
    init_appearance_state();
    init_settings_sections();
    init_stored_settings();
    init_reading_axis();
  }
});

// template/src/js/dom-utils.js
var init_dom_utils = __esm({
  "template/src/js/dom-utils.js"() {
    "use strict";
  }
});

// template/src/js/cue-selector.js
var init_cue_selector = __esm({
  "template/src/js/cue-selector.js"() {
    "use strict";
  }
});

// template/src/js/narration-position.js
var init_narration_position = __esm({
  "template/src/js/narration-position.js"() {
    "use strict";
    init_cue_selector();
    init_reading_axis();
  }
});

// template/src/js/appearance.js
var init_appearance = __esm({
  "template/src/js/appearance.js"() {
    "use strict";
    init_stored_settings();
    init_settings_sections();
    init_settings_filter();
    init_reader_actions();
    init_appearance_state();
    init_writing_mode();
    init_dom_utils();
    init_narration_position();
    init_reading_axis();
  }
});

// template/src/js/resume-position.js
var init_resume_position = __esm({
  "template/src/js/resume-position.js"() {
    "use strict";
    init_narration_position();
  }
});

// template/src/js/structure-sounds.js
var SETTINGS, HEADINGS, NOTES, LISTS_AND_TABLES;
var init_structure_sounds = __esm({
  "template/src/js/structure-sounds.js"() {
    "use strict";
    init_settings_sections();
    init_cue_selector();
    init_dom_utils();
    init_skippability();
    init_stored_settings();
    SETTINGS = [
      { key: "webbook-sound-headings", id: "webbook-sound-headings-toggle", label: "Tone before headings", sample: "heading-1" },
      { key: "webbook-sound-notes", id: "webbook-sound-notes-toggle", label: "Bell before footnotes and endnotes", sample: "note" },
      { key: "webbook-sound-lists-tables", id: "webbook-sound-lists-tables-toggle", label: "Knocks entering and leaving lists and tables", sample: "enter" }
    ];
    [HEADINGS, NOTES, LISTS_AND_TABLES] = SETTINGS;
  }
});

// template/src/js/notes-in-place.js
var init_notes_in_place = __esm({
  "template/src/js/notes-in-place.js"() {
    "use strict";
    init_reading_axis();
    init_settings_sections();
    init_in_place_navigation();
    init_cue_selector();
    init_reader_actions();
    init_skippability();
    init_dom_utils();
    init_structure_sounds();
    init_keyboard_shortcuts();
    init_escapability();
  }
});

// template/src/js/escapability.js
var init_escapability = __esm({
  "template/src/js/escapability.js"() {
    "use strict";
    init_cue_selector();
    init_reader_actions();
    init_narration_position();
    init_caption_mode();
    init_skippability();
    init_dom_utils();
    init_structure_sounds();
    init_keyboard_shortcuts();
    init_notes_in_place();
  }
});

// template/src/js/skippability.js
var init_skippability = __esm({
  "template/src/js/skippability.js"() {
    "use strict";
    init_cue_selector();
    init_escapability();
    init_caption_mode();
    init_structure_sounds();
  }
});

// template/src/js/autoplay.js
var init_autoplay = __esm({
  "template/src/js/autoplay.js"() {
    "use strict";
  }
});

// template/src/js/page-entry.js
var init_page_entry = __esm({
  "template/src/js/page-entry.js"() {
    "use strict";
    init_autoplay();
    init_reader_actions();
    init_dom_utils();
  }
});

// template/src/js/caption-mode.js
var init_caption_mode = __esm({
  "template/src/js/caption-mode.js"() {
    "use strict";
    init_cue_selector();
    init_skippability();
    init_narration_position();
    init_page_entry();
    init_player();
    init_dom_utils();
    init_reader_actions();
  }
});

// template/src/js/continue-playing.js
var init_continue_playing = __esm({
  "template/src/js/continue-playing.js"() {
    "use strict";
  }
});

// template/src/js/book-timeline.js
var init_book_timeline = __esm({
  "template/src/js/book-timeline.js"() {
    "use strict";
    init_skippability();
    init_reader_actions();
  }
});

// template/src/js/player.js
var init_player = __esm({
  "template/src/js/player.js"() {
    "use strict";
    init_cue_selector();
    init_narration_position();
    init_resume_position();
    init_caption_mode();
    init_escapability();
    init_skippability();
    init_continue_playing();
    init_autoplay();
    init_page_entry();
    init_reader_actions();
    init_notes_in_place();
    init_book_timeline();
    init_dom_utils();
  }
});

// template/src/js/in-place-navigation.js
var init_in_place_navigation = __esm({
  "template/src/js/in-place-navigation.js"() {
    "use strict";
    init_reading_axis();
    init_reader_shell();
    init_appearance();
    init_writing_mode();
    init_player();
    init_caption_mode();
    init_escapability();
    init_narration_position();
    init_resume_position();
    init_page_entry();
    init_autoplay();
  }
});

// template/src/js/color-contrast.js
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
function finite(color2) {
  return Object.values(color2).every(Number.isFinite) ? color2 : null;
}
var HIGHLIGHT_PALETTE, LINE_BELOW_PALETTE, SEARCH_PALETTE;
var init_color_contrast = __esm({
  "template/src/js/color-contrast.js"() {
    "use strict";
    HIGHLIGHT_PALETTE = ["#ffdd00", "#a14d00", "#7fdbff", "#5b3cc4", "#fff59d", "#1a237e"];
    LINE_BELOW_PALETTE = ["#000000", "#ffffff", ...HIGHLIGHT_PALETTE];
    SEARCH_PALETTE = ["#005fcc", "#d65db1", ...HIGHLIGHT_PALETTE];
  }
});

// template/src/js/highlight-settings.js
var WHITE, BLACK;
var init_highlight_settings = __esm({
  "template/src/js/highlight-settings.js"() {
    "use strict";
    init_settings_sections();
    init_color_contrast();
    init_narration_position();
    init_stored_settings();
    WHITE = parseColor("#ffffff");
    BLACK = parseColor("#000000");
  }
});

// template/src/js/text-spacing.js
function lineLength(step) {
  const floor = "min(100%, 20rem)";
  const narrow = `max(min(50ch, 50%), ${floor})`;
  if (step === "narrow") return narrow;
  if (step === "wide") return "100%";
  return `max(min(65ch, 75%), ${narrow})`;
}
var SETTINGS2;
var init_text_spacing = __esm({
  "template/src/js/text-spacing.js"() {
    "use strict";
    init_settings_sections();
    init_stored_settings();
    SETTINGS2 = [
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
  }
});

// template/src/js/published-colors.js
var init_published_colors = __esm({
  "template/src/js/published-colors.js"() {
    "use strict";
    init_color_contrast();
    init_appearance_state();
    init_highlight_settings();
  }
});

// template/src/js/page-colors.js
var init_page_colors = __esm({
  "template/src/js/page-colors.js"() {
    "use strict";
    init_appearance_state();
    init_settings_sections();
    init_color_contrast();
    init_highlight_settings();
    init_published_colors();
    init_reader_actions();
    init_stored_settings();
  }
});

// template/src/js/settings.js
var init_settings = __esm({
  "template/src/js/settings.js"() {
    "use strict";
    init_settings_sections();
    init_in_place_navigation();
    init_reader_actions();
    init_dom_utils();
    init_highlight_settings();
    init_text_spacing();
    init_stored_settings();
    init_page_colors();
  }
});

// template/src/js/keyboard-shortcuts.js
function normalizeKeySpec(spec) {
  if (!spec || typeof spec !== "object" || typeof spec.code !== "string") return null;
  if (!Object.hasOwn(KEY_NAMES, spec.code) && !/^(Key[A-Z]|Digit[0-9]|Numpad[0-9]|F([1-9]|1[0-9]|2[0-4]))$/.test(spec.code)) return null;
  if (MODIFIERS.some((name) => spec[name] !== void 0 && typeof spec[name] !== "boolean")) return null;
  return { code: spec.code, ...Object.fromEntries(MODIFIERS.map((name) => [name, spec[name] === true])) };
}
function shortcutRejection(spec, actionId) {
  if (["Tab", "Enter", "NumpadEnter", "Space"].includes(spec.code)) {
    return "Tab, Enter and Space are reserved for moving between and activating controls.";
  }
  if (spec.code === "Escape" && actionId !== "skip-past") return "Escape is reserved for Skip past.";
  if (!normalizeKeySpec(spec)) return "This key cannot be used as a shortcut. Choose another key.";
  return "";
}
var MODIFIERS, KEY_NAMES, SPOKEN_CHARACTERS;
var init_keyboard_shortcuts = __esm({
  "template/src/js/keyboard-shortcuts.js"() {
    "use strict";
    init_settings_sections();
    init_reader_actions();
    init_settings();
    init_dom_utils();
    MODIFIERS = ["shift", "alt", "ctrl", "meta"];
    KEY_NAMES = {
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
    SPOKEN_CHARACTERS = Object.fromEntries(Object.values(KEY_NAMES).map(([key, name]) => [key, name]));
  }
});

// template/src/js/offline-resources.js
var OFFLINE_PROTOCOL = 1;
var LIMITS = { files: 2e4, bytes: 10 * 1024 ** 3, discoveryBytes: 128 * 1024 ** 2 };
function resourceURL(href, base, root, { link = false } = {}) {
  if (!href || href.startsWith("#") || /^(?:data|blob|mailto|tel|javascript):/i.test(href)) return null;
  const url = new URL(href, base), scope = new URL(root);
  if (!/^https?:$/.test(url.protocol) || url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname) || /(?:^|\/)\.\.(?:\/|$)|[\\\u0000]/.test(decodeURIComponent(url.pathname))) {
    if (link) return null;
    throw new Error("An essential resource is outside this book: " + url.href);
  }
  url.hash = "";
  if (url.pathname.endsWith("/")) url.pathname += "index.html";
  if (/\.html?$/i.test(url.pathname)) url.search = "";
  return url.href;
}
var unescapeCSS = (value) => value.replace(
  /\\(?:([\da-f]{1,6})\s?|\r\n|[\n\r\f]|(.))/gi,
  (_, hex, char) => hex ? String.fromCodePoint(Math.min(parseInt(hex, 16) || 65533, 1114111)) : char || ""
);
function cssReferences(text, onImport = () => {
}) {
  const urls = [];
  let i = 0, importing = false;
  const space = () => {
    while (i < text.length) {
      if (/\s/.test(text[i])) i++;
      else if (text.slice(i, i + 2) === "/*") {
        const end = text.indexOf("*/", i + 2);
        i = end < 0 ? text.length : end + 2;
      } else break;
    }
  };
  const quoted = () => {
    const quote = text[i++];
    let value = "";
    while (i < text.length) {
      const c = text[i++];
      if (c === quote) break;
      value += c;
      if (c === "\\" && i < text.length) value += text[i++];
    }
    return unescapeCSS(value);
  };
  while (i < text.length) {
    space();
    if (text[i] === '"' || text[i] === "'") {
      quoted();
      continue;
    }
    if (text.slice(i, i + 7).toLowerCase() === "@import" && !/[\w-]/.test(text[i + 7] || "")) {
      i += 7;
      importing = true;
      space();
      if (text[i] === '"' || text[i] === "'") {
        const value = quoted();
        urls.push(value);
        onImport(value);
        importing = false;
        continue;
      }
    }
    const imageSet = text.slice(i).match(/^(?:-webkit-)?image-set\s*\(/i);
    if (imageSet && !/[\w-]/.test(text[i - 1] || "")) {
      i += imageSet[0].length;
      const start = i;
      let depth = 1, candidate = true;
      while (i < text.length && depth) {
        space();
        if (text[i] === '"' || text[i] === "'") {
          const value = quoted();
          if (depth === 1 && candidate) {
            urls.push(value);
            candidate = false;
          }
          continue;
        }
        const c = text[i++];
        if (c === "(") depth++;
        else if (c === ")") depth--;
        else if (c === "," && depth === 1) candidate = true;
      }
      urls.push(...cssReferences(text.slice(start, i - 1)));
      continue;
    }
    if (text.slice(i, i + 3).toLowerCase() === "url" && !/[\w-]/.test(text[i - 1] || "")) {
      const start = i;
      i += 3;
      space();
      if (text[i] !== "(") {
        i = start + 1;
        continue;
      }
      i++;
      space();
      let value = "";
      if (text[i] === '"' || text[i] === "'") value = quoted();
      else {
        while (i < text.length && text[i] !== ")") {
          const c = text[i++];
          value += c;
          if (c === "\\" && i < text.length) value += text[i++];
        }
        value = unescapeCSS(value.trim());
      }
      urls.push(value);
      if (importing) {
        onImport(value);
        importing = false;
      }
      while (i < text.length && text[i] !== ")") i++;
      i++;
      continue;
    }
    i++;
  }
  return urls;
}
function srcsetReferences(text) {
  const urls = [];
  let i = 0;
  while (i < text.length) {
    while (/[\s,]/.test(text[i] || "") && i < text.length) i++;
    let url = "";
    while (i < text.length && !/\s/.test(text[i])) url += text[i++];
    if (!url) break;
    if (url.endsWith(",")) {
      urls.push(url.replace(/,+$/, ""));
      continue;
    }
    urls.push(url);
    let depth = 0;
    while (i < text.length) {
      const c = text[i++];
      if (c === "(") depth++;
      if (c === ")") depth--;
      if (c === "," && !depth) break;
    }
  }
  return urls;
}
function kindFor(url) {
  const name = new URL(url).pathname.toLowerCase();
  if (/\.html?$/.test(name)) return "html";
  if (/\.css$/.test(name)) return "css";
  if (/\.json$/.test(name)) return "json";
  if (/\.(?:m?js)$/.test(name)) return "script";
  if (/\.vtt$/.test(name)) return "track";
  return "asset";
}
function validators(headers) {
  const length = headers.get("content-length");
  return { etag: headers.get("etag") || "", modified: headers.get("last-modified") || "", size: length !== null && /^\d+$/.test(length) ? Number(length) : null, type: headers.get("content-type") || "" };
}
async function sha256(bytes) {
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), (b) => b.toString(16).padStart(2, "0")).join("");
}
function workerScriptURL(root, remote) {
  const script = new URL("sw.js", root);
  if (remote) {
    const channel = new URL(remote.channel), worker = new URL(remote.worker, channel);
    if (!(channel.protocol === "https:" || channel.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(channel.hostname)) || /(?:^|\/)\.\.(?:\/|$)|[\\\u0000]/.test(decodeURIComponent(worker.pathname)) || !channel.pathname.endsWith("/") || worker.origin !== channel.origin || !worker.pathname.startsWith(channel.pathname) || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,99}\/offline-worker\.js$/.test(worker.pathname.slice(channel.pathname.length)) || worker.search || worker.hash) throw new Error("Invalid offline worker release.");
    script.searchParams.set("webbook-channel", channel.href);
    script.searchParams.set("webbook-worker", worker.href);
  }
  return script.href;
}

// template/src/js/offline-discovery.js
async function discoverBook(root, { signal, onProgress = () => {
}, current = location.href } = {}) {
  const entries = /* @__PURE__ */ new Map();
  let discoveryBytes = 0;
  const add = (href, base = root, options = {}) => {
    const url = resourceURL(href, base, root, options);
    if (!url) return null;
    if (!entries.has(url)) {
      if (entries.size >= LIMITS.files) throw new Error("This book has too many files to save.");
      entries.set(url, { url, kind: options.kind || kindFor(url), optional: Boolean(options.optional), size: null, etag: "", modified: "" });
    } else if (!options.optional) entries.get(url).optional = false;
    return entries.get(url);
  };
  add("index.html");
  add(current);
  add("search-data.json", root, { optional: true });
  add("audio-map.json", root, { optional: true });
  const inventoryEntry = add("src/ui-files.json");
  add("sw.js", root, { kind: "script" });
  const addCSS = (text, base) => {
    const imports = /* @__PURE__ */ new Set(), resources = cssReferences(text, (href) => imports.add(href));
    for (const href of resources) add(href, base, { kind: imports.has(href) ? "css" : void 0 });
  };
  const get = async (entry, method = "GET") => {
    const timer = AbortSignal.timeout(3e4), combined = AbortSignal.any([signal, timer].filter(Boolean));
    const response = await fetch(entry.url, { method, signal: combined, cache: "no-store", credentials: "same-origin", redirect: "error", headers: { "X-Webbook-Offline-Network": "1" } });
    if (response.status === 404 && entry.optional) {
      entries.delete(entry.url);
      return null;
    }
    if (response.status !== 200 || response.type === "opaque") throw new Error(`Couldn't read ${new URL(entry.url).pathname} (${response.status}).`);
    return response;
  };
  const read2 = async (entry) => {
    const response = await get(entry);
    if (!response) return null;
    Object.assign(entry, validators(response.headers));
    entry.body = await response.blob();
    entry.size = entry.body.size;
    discoveryBytes += entry.size;
    if (discoveryBytes > LIMITS.discoveryBytes) throw new Error("This book is too large to inspect safely.");
    entry.digest = await sha256(await entry.body.arrayBuffer());
    return entry.body.text();
  };
  const inventoryText = await read2(inventoryEntry), inventory = JSON.parse(inventoryText);
  const contract = Number(document.documentElement.dataset.webbookContract);
  if (inventory.version !== 1 || inventory.contract !== contract || !Array.isArray(inventory.files) || !/^[a-f0-9]{64}$/.test(inventory.revision || "")) throw new Error("The reader file list is missing or incompatible. Update the complete reader package.");
  for (const file of inventory.files) {
    if (typeof file.href !== "string" || !file.href.startsWith("src/") || !/^[a-f0-9]{64}$/.test(file.sha256) || !Number.isSafeInteger(file.bytes) || file.bytes < 0) throw new Error("The reader file list is invalid.");
    const entry = add(file.href);
    Object.assign(entry, { sha256: file.sha256, size: file.bytes });
  }
  for (; ; ) {
    const entry = Array.from(entries.values()).find((item) => !item.scanned && ["html", "css", "json"].includes(item.kind) && item.url !== new URL("src/reader-shell.html", root).href);
    if (!entry) break;
    entry.scanned = true;
    onProgress(entries.size);
    const text = entry.body ? await entry.body.text() : await read2(entry);
    if (text === null) continue;
    if (entry.kind === "html") {
      const doc = new DOMParser().parseFromString(text, "text/html");
      const base = doc.querySelector("base[href]")?.getAttribute("href");
      const baseURL = base ? resourceURL(base, entry.url, root) : entry.url;
      for (const node of doc.querySelectorAll("a[href]")) {
        const href = node.getAttribute("href"), candidate = resourceURL(href, baseURL, root, { link: true });
        if (candidate && kindFor(candidate) === "html") add(candidate);
      }
      for (const node of doc.querySelectorAll('link[rel~="stylesheet"][href], link[rel~="icon"][href], link[rel~="preload"][href], script[src], img[src], source[src], audio[src], video[src], track[src], input[type=image][src], object[data], embed[src], iframe[src], image, use')) {
        const href = node.getAttribute("src") || node.getAttribute("href") || node.getAttribute("xlink:href") || node.getAttribute("data");
        add(href, baseURL, { kind: node.localName === "link" && node.relList.contains("stylesheet") ? "css" : node.localName === "script" ? "script" : void 0 });
      }
      for (const node of doc.querySelectorAll("[poster]")) add(node.getAttribute("poster"), baseURL);
      for (const node of doc.querySelectorAll("[srcset]")) for (const href of srcsetReferences(node.getAttribute("srcset"))) add(href, baseURL);
      for (const node of doc.querySelectorAll("style, [style]")) addCSS(node.localName === "style" ? node.textContent : node.getAttribute("style") || "", baseURL);
    } else if (entry.kind === "css") {
      addCSS(text, entry.url);
    } else if (entry !== inventoryEntry) {
      const data = JSON.parse(text);
      for (const page of Array.isArray(data?.pages) ? data.pages : []) {
        if (page?.href) add(page.href);
        if (page?.audio) add(page.audio);
      }
    }
  }
  const remaining = Array.from(entries.values()).filter((entry) => !entry.body);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(4, remaining.length) }, async () => {
    while (next < remaining.length) {
      const entry = remaining[next++];
      try {
        const response = await get(entry, "HEAD");
        if (response) Object.assign(entry, validators(response.headers));
      } catch (error) {
        if (signal?.aborted) throw error;
        entry.size = entry.size ?? null;
      }
      onProgress(entries.size);
    }
  }));
  const files = Array.from(entries.values()).sort((a, b) => a.url.localeCompare(b.url));
  const bytes = files.reduce((sum, file) => sum + (file.size || 0), 0);
  if (bytes > LIMITS.bytes) throw new Error("This book exceeds the offline storage limit.");
  return {
    files,
    bytes,
    sizeKnown: files.every((file) => file.size !== null && file.size !== void 0),
    ui: { contract, localRevision: inventory.revision, protocol: 1 }
  };
}
function includeRemoteRelease(list2, root, remote) {
  if (!remote || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/.test(remote.version)) throw new Error("Invalid UI release.");
  const base = new URL(remote.version + "/", remote.channel);
  workerScriptURL(root, { channel: remote.channel, worker: new URL("offline-worker.js", base).href });
  if (remote.inventory?.version !== 1 || remote.inventory.contract !== list2.ui.contract || !Array.isArray(remote.inventory.files)) throw new Error("Incompatible remote UI inventory.");
  const entries = remote.inventory.files.map((file) => {
    const url = new URL(file.href, base);
    if (!url.href.startsWith(base.href) || /(?:^|\/)\.\.(?:\/|$)|[\\\u0000]/.test(decodeURIComponent(url.pathname)) || url.search || url.hash || !/^[a-f0-9]{64}$/.test(file.sha256) || !Number.isSafeInteger(file.bytes) || file.bytes < 0) throw new Error("Invalid remote UI inventory.");
    return { url: url.href, kind: kindFor(url.href), size: file.bytes, sha256: file.sha256 };
  });
  for (const required of ["main.js", "style.css", "offline-worker.js"]) if (!entries.some((file) => file.url === new URL(required, base).href)) throw new Error("The remote UI release is incomplete.");
  const unique = new Map(list2.files.map((file) => [file.url, file]));
  for (const file of entries) unique.set(file.url, file);
  if (unique.size > LIMITS.files || list2.bytes + entries.reduce((sum, file) => sum + file.size, 0) > LIMITS.bytes) throw new Error("The offline release is too large.");
  return {
    ...list2,
    files: Array.from(unique.values()),
    bytes: list2.bytes + entries.reduce((sum, file) => sum + file.size, 0),
    ui: { ...list2.ui, remote: { channel: new URL(remote.channel).href, version: remote.version, files: entries } }
  };
}

// template/src/js/offline.js
init_reader_actions();

// template/src/js/settings-transfer.js
init_settings_sections();

// template/src/js/settings-file.js
init_keyboard_shortcuts();
var oneOf = (...values) => (value) => values.includes(value);
var boolean = oneOf("true", "false");
var color = (value) => typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
var percent = (value) => typeof value === "string" && /^(?:[5-9][0-9]|1[0-9]{2}|200)$/.test(value) && Number(value) % 5 === 0;
function shortcutMap(value) {
  if (typeof value !== "string") return false;
  try {
    const map = JSON.parse(value);
    if (!isObject(map) || map.version !== 1 || !isObject(map.bindings)) return false;
    return Object.entries(map.bindings).every(([id, keys]) => /^[a-z][a-z0-9-]*$/.test(id) && Array.isArray(keys) && keys.every((key) => normalizeKeySpec(key) && !shortcutRejection(key, id)));
  } catch {
    return false;
  }
}
var SETTINGS_DEFINITIONS = Object.freeze({
  "webbook-colors": oneOf("", "auto", "light", "dark", "white", "black", "cream", "sepia", "gray", "blue", "custom"),
  "webbook-colors-text": color,
  "webbook-colors-background": color,
  "webbook-colors-text-auto": boolean,
  "webbook-highlight-auto": boolean,
  "webbook-highlight-color": color,
  "webbook-highlight-style": oneOf("background", "underline", "both"),
  "webbook-font-family": oneOf("system-ui", "sans-serif", "serif"),
  "webbook-font-size": percent,
  "webbook-line-height": oneOf("", "1.8", "2"),
  "webbook-letter-spacing": oneOf("", "wider", "widest"),
  "webbook-word-spacing": oneOf("", "wider", "widest"),
  "webbook-line-length": oneOf("narrow", "medium", "wide"),
  "webbook-writing-mode": oneOf("horizontal"),
  "webbook-copy-math-format": oneOf("latex", "mathml"),
  "webbook-dialog-backdrop-blur": boolean,
  "webbook-toolbar-auto-hide": boolean,
  "webbook-rate": percent,
  "webbook-caption-mode": boolean,
  "webbook-skip-pagebreak": boolean,
  "webbook-skip-footnote": boolean,
  "webbook-skip-sidebar": boolean,
  "webbook-sound-headings": boolean,
  "webbook-sound-notes": boolean,
  "webbook-sound-lists-tables": boolean,
  "webbook-note-references": oneOf("button", "pause", "follow"),
  "webbook-note-auto-return": boolean,
  "webbook-note-wait-sound": boolean,
  "webbook-resume-enabled": boolean,
  "webbook-keyboard-shortcuts": boolean,
  "webbook-keyboard-shortcut-map": shortcutMap,
  "webbook-agent-tools": boolean,
  "webbook-time-display": oneOf("elapsed", "chapter", "book"),
  "webbook-toc-depth": oneOf("1", "2", "3", "all"),
  // Compatibility with the first-paint script and the former Appearance control.
  "webbook-appearance": oneOf("auto", "light", "dark"),
  "webbook-appearance-migrated": oneOf("true")
});
function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

// template/src/js/settings-transfer.js
init_reader_actions();
init_dom_utils();
init_continue_playing();
init_narration_position();
init_reading_axis();

// template/src/js/bootstrap-policy.js
var validVersion = (value) => typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/.test(value);
function validateManifest(data, { contract, channel, local }) {
  if (!data || data.contract !== contract) throw new Error("Wrong UI contract");
  if (data.useLocal === true) return local;
  if (data.protocol !== void 0 && data.protocol !== 1) throw new Error("Incompatible offline protocol");
  if (!validVersion(data.version) || data.minBootstrap !== 1) throw new Error("Incompatible release");
  const base = new URL(data.version + "/", channel);
  const file = (value, fallback) => {
    if (typeof (value || fallback) !== "string") throw new Error("Missing release file");
    const url = new URL(value || fallback, channel);
    if (url.origin !== base.origin || !url.href.startsWith(base.href) || /[\\\u0000]|(?:^|\/)\.\.(?:\/|$)/.test(decodeURIComponent(url.pathname)) || url.search || url.hash) throw new Error("Invalid release path");
    return url.href;
  };
  return { contract, channel: new URL(channel).href, version: data.version, script: file(data.script), stylesheet: file(data.stylesheet), inventory: file(data.inventory, `${data.version}/ui-files.json`), worker: data.worker ? file(data.worker) : null, protocol: 1, integrity: data.integrity };
}
function releaseSelection(version, options) {
  return validateManifest({ contract: options.contract, minBootstrap: 1, version, script: `${version}/main.js`, stylesheet: `${version}/style.css`, worker: `${version}/offline-worker.js` }, options);
}
var sri = (hex) => "sha256-" + btoa(String.fromCharCode(...hex.match(/../g).map((byte) => parseInt(byte, 16))));
function verifyInventory(selection, inventory) {
  if (inventory?.version !== 1 || inventory.contract !== selection.contract || !Array.isArray(inventory.files)) throw new Error("Missing compatible release inventory");
  const base = new URL(selection.version + "/", selection.channel), files = /* @__PURE__ */ new Map();
  for (const file of inventory.files) {
    const url = new URL(file.href || file.url, base);
    if (url.origin !== base.origin || !url.href.startsWith(base.href) || url.search || url.hash || /[\\\u0000]|(?:^|\/)\.\.(?:\/|$)/.test(decodeURIComponent(url.pathname)) || !/^[a-f0-9]{64}$/.test(file.sha256 || "") || files.has(url.href)) throw new Error("Invalid release integrity inventory");
    files.set(url.href, file.sha256);
  }
  const integrity = {};
  for (const name of ["script", "stylesheet"]) {
    const hash = files.get(selection[name]);
    if (!hash) throw new Error("Release integrity is missing for " + name);
    integrity[name] = sri(hash);
    if (selection.integrity?.[name] && selection.integrity[name] !== integrity[name]) throw new Error("Conflicting release integrity");
  }
  if (selection.worker && !files.has(selection.worker)) throw new Error("Worker integrity is missing");
  return { ...selection, integrity };
}

// template/src/js/remote-ui.js
async function includeSelectedUI(root, list2, { initial = false, signal } = {}) {
  if (initial && window.webbookUI?.local) return { ...list2, ui: { ...list2.ui, localOnly: true } };
  let selected = initial ? window.webbookUI : null;
  let explicitLocal = false;
  try {
    explicitLocal = localStorage.getItem("webbook-ui:" + root + ":override") === "local";
  } catch {
  }
  const index = list2.files.find((file) => file.url === new URL("index.html", root).href);
  const html = index?.body && await index.body.text();
  const channelValue = html && new DOMParser().parseFromString(html, "text/html").querySelector('meta[name="webbook-ui-channel"]')?.content;
  if (explicitLocal || !channelValue) return { ...list2, ui: { ...list2.ui, localOnly: true } };
  const channel = new URL(channelValue);
  const read2 = async (url) => {
    const response = await fetch(url, {
      mode: "cors",
      credentials: "omit",
      cache: "no-store",
      referrerPolicy: "no-referrer",
      signal: AbortSignal.any([AbortSignal.timeout(5e3), signal].filter(Boolean))
    });
    if (!response.ok || response.type === "opaque")
      throw new Error("The UI channel could not be checked. Your saved copy is kept.");
    return response.json();
  };
  if (!selected || selected.channel !== channel.href) {
    const manifest = await read2(new URL("current.json", channel));
    if (manifest.protocol !== void 0 && manifest.protocol !== 1)
      throw new Error("The UI channel uses an incompatible offline protocol.");
    if (manifest.contract !== list2.ui.contract)
      throw new Error("The UI channel requires a different book contract.");
    if (manifest.useLocal) return { ...list2, ui: { ...list2.ui, localOnly: true } };
    if (manifest.minBootstrap !== 1 || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/.test(manifest.version || ""))
      throw new Error("The UI channel is incompatible.");
    selected = validateManifest(manifest, { contract: list2.ui.contract, channel: channel.href, local: { local: true } });
  }
  const base = new URL(selected.version + "/", channel);
  workerScriptURL(root, { channel: channel.href, worker: new URL("offline-worker.js", base).href });
  const inventoryURL = new URL(selected.inventory || "ui-files.json", base);
  if (inventoryURL.origin !== base.origin || !inventoryURL.href.startsWith(base.href) || inventoryURL.search || inventoryURL.hash)
    throw new Error("Invalid remote inventory.");
  const inventory = await read2(inventoryURL);
  verifyInventory(selected.script ? selected : releaseSelection(selected.version, { contract: list2.ui.contract, channel: channel.href }), inventory);
  const complete = includeRemoteRelease(list2, root, { channel: channel.href, version: selected.version, inventory });
  return { ...complete, ui: { ...complete.ui, localOnly: true } };
}

// template/src/js/offline.js
function offlineCommand(worker, command, data = {}, onProgress = () => {
}, signal) {
  return command === "save" ? foregroundDownload(worker, data, onProgress, signal) : workerCommand(worker, command, data, onProgress);
}
function workerCommand(worker, command, data = {}, onProgress = () => {
}) {
  return new Promise((resolve, reject) => {
    const channel = new MessageChannel();
    let timer;
    const timeout = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        channel.port1.close();
        reject(new Error("Offline storage did not respond. Keep this tab open and try again."));
      }, command === "save" ? 9e4 : 2e4);
    };
    timeout();
    channel.port1.onmessage = (event) => {
      timeout();
      if (event.data.progress) {
        onProgress(event.data.progress);
        return;
      }
      clearTimeout(timer);
      channel.port1.close();
      if (event.data.error) reject(new Error(event.data.error));
      else resolve(event.data.result);
    };
    worker.postMessage({ webbookOffline: 1, protocol: OFFLINE_PROTOCOL, command, ...data }, [channel.port2]);
  });
}
async function foregroundDownload(worker, data, onProgress, signal) {
  signal?.throwIfAborted();
  const lease = await workerCommand(worker, "begin-save", data);
  let runner, rejectReady, running = false, canceled = false;
  const abort = () => {
    canceled = true;
    if (running) workerCommand(runner, "cancel").catch(() => {
    });
    else rejectReady?.(new DOMException("Download canceled.", "AbortError"));
  };
  const cancel = (event) => {
    if (event.data?.cancelDownload === lease.cache) abort();
  };
  signal?.addEventListener("abort", abort, { once: true });
  navigator.serviceWorker.addEventListener("message", cancel);
  try {
    signal?.throwIfAborted();
    runner = new Worker(new URL("src/js/offline-download-worker.js", lease.scope));
    await new Promise((resolve, reject) => {
      rejectReady = (error) => {
        clearTimeout(timer);
        reject(error);
      };
      const timer = setTimeout(() => reject(new Error("The download worker did not start.")), 2e4);
      runner.addEventListener("error", () => {
        clearTimeout(timer);
        reject(new Error("The download worker could not start. Check this site\u2019s worker policy."));
      }, { once: true });
      runner.addEventListener("message", (event) => {
        if (event.data.ready) {
          clearTimeout(timer);
          resolve();
        } else if (event.data.error) {
          clearTimeout(timer);
          reject(new Error(event.data.error));
        } else if (event.data.webbookOffline === 1) workerCommand(worker, "notify", event.data.progress ? { progress: event.data.progress } : {}).catch(() => {
        });
      });
      runner.postMessage({ webbookDownload: 1, ...lease });
    });
    if (canceled) throw new DOMException("Download canceled.", "AbortError");
    running = true;
    return await workerCommand(runner, "save", data, onProgress);
  } finally {
    runner?.terminate();
    signal?.removeEventListener("abort", abort);
    navigator.serviceWorker.removeEventListener("message", cancel);
    await workerCommand(worker, "end-save", { cache: lease.cache }).catch(() => {
    });
    await workerCommand(worker, "notify").catch(() => {
    });
  }
}

// template/src/js/offline-books.js
var list = document.getElementById("offline-books");
var status = document.getElementById("library-status");
var database;
var sizeText = (bytes) => new Intl.NumberFormat(void 0, { maximumFractionDigits: 1 }).format(bytes / 1024 ** 2) + " MB";
function read(store, key) {
  return new Promise((resolve, reject) => {
    const request = database.transaction(store).objectStore(store)[key === void 0 ? "getAllKeys" : "get"](key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
function button(parent, text, action) {
  const node = document.createElement("button");
  node.type = "button";
  node.textContent = text;
  node.addEventListener("click", () => action().catch((error) => {
    status.textContent = error.message || "The operation failed. Your saved copy is kept.";
  }));
  parent.append(node);
  return node;
}
async function showBook(root, row) {
  if (!row) return;
  const url = new URL(root);
  if (url.origin !== location.origin || !url.pathname.endsWith("/") || !row.active && !row.pending) return;
  const snapshot = await read("snapshots", row.active || row.pending);
  const item = document.createElement("li"), heading = document.createElement("h2"), open = document.createElement("a");
  open.href = new URL("index.html", root);
  open.textContent = url.pathname;
  if (snapshot && await caches.has(snapshot.cache)) {
    const response = await (await caches.open(snapshot.cache)).match(open.href);
    if (response) {
      const doc = new DOMParser().parseFromString(await response.text(), "text/html");
      open.textContent = doc.querySelector("title")?.textContent?.trim() || url.pathname;
    }
  }
  heading.append(open);
  item.append(heading);
  const address = document.createElement("p");
  address.textContent = root;
  item.append(address);
  const detail = document.createElement("p");
  detail.textContent = snapshot ? `${sizeText(snapshot.bytes)} \xB7 Saved ${new Date(snapshot.savedAt).toLocaleString()}` : "Saved copy unavailable.";
  item.append(detail);
  const message = document.createElement("p");
  message.setAttribute("role", "status");
  message.setAttribute("aria-atomic", "true");
  item.append(message);
  const progress = document.createElement("progress");
  progress.hidden = true;
  progress.setAttribute("aria-label", `Refreshing ${open.textContent}`);
  item.append(progress);
  const actions = document.createElement("div");
  actions.className = "actions";
  item.append(actions);
  const registration = await navigator.serviceWorker.getRegistration(root);
  const worker = registration?.scope === root ? registration.active : null;
  const command = (name, data, update, signal) => {
    if (!worker) throw new Error("Open this book online to restore its offline controls.");
    return offlineCommand(worker, name, data, update, signal);
  };
  let busy = false, controller;
  const render = () => {
    refresh.disabled = remove.disabled = use.disabled = busy || !worker;
    cancel.hidden = !busy;
    progress.hidden = !busy;
  };
  const refresh = button(actions, "Refresh saved copy", async () => {
    if (busy) return;
    busy = true;
    controller = new AbortController();
    render();
    cancel.focus();
    message.textContent = "Finding book files\u2026 Keep this page open.";
    progress.removeAttribute("value");
    try {
      const local = await discoverBook(root, { current: new URL("index.html", root).href, signal: controller.signal });
      const files = await includeSelectedUI(root, local, { signal: controller.signal });
      message.textContent = "Downloading a fresh copy\u2026 Keep this page open.";
      await command("save", files, (value) => {
        progress.max = value.total;
        progress.value = value.done;
      }, controller.signal);
      const state = await command("status");
      use.hidden = !state.pending;
      message.textContent = state.pending ? "Update ready. Choose Use update when you are ready." : "Saved for offline reading.";
    } catch (error) {
      message.textContent = controller.signal.aborted ? "Refresh canceled. Your saved copy is kept." : `${error.message} Your saved copy is kept.`;
    } finally {
      busy = false;
      render();
      (use.hidden ? refresh : use).focus();
    }
  });
  const cancel = button(actions, "Cancel refresh", async () => {
    controller?.abort();
    await command("cancel");
  });
  const use = button(actions, "Use update", async () => {
    await command("activate");
    const state = await command("status");
    if (state.saved) detail.textContent = `${sizeText(state.saved.bytes)} \xB7 Saved ${new Date(state.saved.savedAt).toLocaleString()}`;
    use.hidden = true;
    message.textContent = "Updated. Open the book to read the new copy.";
    refresh.focus();
  });
  use.hidden = !row.pending;
  const remove = button(actions, "Remove", async () => {
    confirmation.hidden = false;
    no.focus();
  });
  const confirmation = document.createElement("div");
  confirmation.className = "confirmation";
  confirmation.hidden = true;
  const question = document.createElement("p");
  question.textContent = "Remove this saved book? Settings and reading positions will be kept.";
  confirmation.append(question);
  const no = button(confirmation, "Cancel", async () => {
    confirmation.hidden = true;
    remove.focus();
  });
  button(confirmation, "Yes, remove saved book", async () => {
    await command("remove");
    item.remove();
    status.textContent = list.children.length ? "Saved book removed." : "No books saved on this site.";
    const next = list.querySelector("a");
    if (next) next.focus();
    else {
      status.tabIndex = -1;
      status.focus();
    }
  });
  item.append(confirmation);
  render();
  list.append(item);
}
async function load() {
  try {
    if (!navigator.serviceWorker || !window.indexedDB || !window.caches) throw new Error("Offline storage is unavailable in this browser.");
    database = await new Promise((resolve, reject) => {
      const request = indexedDB.open("webbook-offline-1", 1);
      request.onupgradeneeded = () => {
        for (const name of ["books", "snapshots", "pins"]) request.result.createObjectStore(name);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const root = new URL("../", location.href).href, own = await read("books", root);
    const snapshot = own?.active && await read("snapshots", own.active);
    if (snapshot && await caches.has(snapshot.cache)) {
      const source = await caches.open(snapshot.cache), shell = await caches.open("webbook-offline-library-" + root);
      for (const file of snapshot.files.filter((file2) => file2.url.startsWith(root + "src/"))) {
        const response = await source.match(file.url);
        if (response) await shell.put(file.url, response);
      }
    }
    for (const root2 of (await read("books")).sort()) await showBook(root2, await read("books", root2));
    status.textContent = list.children.length ? `${list.children.length} saved ${list.children.length === 1 ? "book" : "books"}.` : "No books saved on this site.";
  } catch (error) {
    status.textContent = error.message || "Saved books could not be loaded.";
  }
}
load();
