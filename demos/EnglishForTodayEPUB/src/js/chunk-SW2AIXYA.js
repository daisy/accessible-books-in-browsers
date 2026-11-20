import {
  announceReaderAction,
  appendSetting,
  normalizeKeySpec,
  pageAudio,
  playOrOfferToContinue,
  readingEnd,
  readingLine,
  readingScroll,
  readingStart,
  registerAction,
  scrollToReading,
  settingsSection,
  shortcutRejection
} from "./chunk-2PIDKBOH.js";

// template/src/js/settings-file.js
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
function validateSettingsFile(file) {
  if (!isObject(file) || file.format !== "webbook-settings") throw new Error("This is not a reader settings file.");
  if (typeof file.version === "number" && file.version > 1) throw new Error("This settings file needs a newer reader (version " + file.version + ").");
  if (file.version !== 1) throw new Error("This settings file version is not supported.");
  if (!isObject(file.settings)) throw new Error("The settings file must contain a settings object.");
  const settings = {};
  for (const [key, value] of Object.entries(file.settings)) {
    if (!Object.hasOwn(SETTINGS_DEFINITIONS, key)) continue;
    if (value !== null && !SETTINGS_DEFINITIONS[key](value)) throw new Error(`Invalid value for ${key}.`);
    settings[key] = value;
  }
  return settings;
}
function exportSettings(storage = localStorage, now = /* @__PURE__ */ new Date()) {
  const settings = Object.fromEntries(Object.entries(SETTINGS_DEFINITIONS).map(([key, valid]) => {
    const value = storage.getItem(key);
    return [key, value !== null && valid(value) ? value : null];
  }));
  const file = { format: "webbook-settings", version: 1, exported: now.toISOString(), settings };
  validateSettingsFile(file);
  return file;
}
function writeSettings(settings, storage) {
  const previous = Object.fromEntries(Object.keys(settings).map((key) => [key, storage.getItem(key)]));
  const write = (key, value) => value === null ? storage.removeItem(key) : storage.setItem(key, value);
  try {
    for (const [key, value] of Object.entries(settings)) write(key, value);
  } catch {
    for (const [key, value] of Object.entries(previous)) {
      try {
        write(key, value);
      } catch {
      }
    }
    throw new Error("Browser storage is unavailable. Settings could not be saved.");
  }
}
function importSettings(file, storage = localStorage) {
  const settings = validateSettingsFile(file);
  writeSettings(settings, storage);
}
function resetSettings(storage = localStorage) {
  const appearance = [];
  for (let i = 0; i < storage.length; i++) if (storage.key(i)?.startsWith("webbook-appearance:")) appearance.push(storage.key(i));
  writeSettings(Object.fromEntries([...Object.keys(SETTINGS_DEFINITIONS), ...appearance].map((key) => [key, null])), storage);
}

// template/src/js/settings-transfer.js
var RETURN_KEY = "webbook-settings-return";
var READING_BLOCKS = "h1, h2, h3, h4, h5, h6, p, li, blockquote, td, th, figcaption, dt, dd";
function readingBlocks() {
  return Array.from(document.querySelector("main")?.querySelectorAll(READING_BLOCKS) ?? []);
}
function initSettingsTransfer() {
  if (!settingsSection("all") || document.getElementById("webbook-settings-transfer")) return;
  const group = document.createElement("div");
  group.id = "webbook-settings-transfer";
  const status = document.createElement("p");
  status.id = "webbook-settings-result";
  const report = (message) => {
    status.textContent = message;
    announceReaderAction(message, { show: !status.getClientRects().length });
  };
  const button = (id, label, run) => {
    const element = document.createElement("button");
    element.id = id;
    element.type = "button";
    element.textContent = label;
    element.addEventListener("click", run);
    return element;
  };
  const exportButton = button("webbook-settings-export", "Export settings", () => {
    try {
      const blob = new Blob([JSON.stringify(exportSettings(), null, 2) + "\n"], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "webbook-settings.json";
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1e3);
      report("Settings exported");
    } catch (error) {
      report(`Settings not exported. ${error.message}`);
    }
  });
  const picker = document.createElement("input");
  picker.type = "file";
  picker.accept = "application/json,.json";
  picker.hidden = true;
  picker.id = "webbook-settings-file";
  const importButton = button("webbook-settings-import", "Import settings", () => {
    picker.value = "";
    picker.click();
  });
  picker.addEventListener("change", async () => {
    const file = picker.files?.[0];
    if (!file) return;
    try {
      if (file.size > 1024 * 1024) throw new Error("Choose a settings file smaller than 1 MB.");
      let data;
      try {
        data = JSON.parse(await file.text());
      } catch {
        throw new Error("The file is not valid JSON.");
      }
      validateSettingsFile(data);
      const reload = prepareReload("Settings imported", importButton.id);
      importSettings(data);
      reload();
    } catch (error) {
      clearReturnState();
      report(`Settings not imported. ${error.message}`);
    }
  });
  const confirmation = document.createElement("div");
  confirmation.id = "webbook-settings-reset-confirmation";
  confirmation.className = "webbook-confirmation";
  confirmation.hidden = true;
  confirmation.setAttribute("role", "group");
  confirmation.setAttribute("aria-labelledby", "webbook-settings-reset-question");
  const question = document.createElement("p");
  question.id = "webbook-settings-reset-question";
  question.textContent = "Reset all settings? Your reading positions will be kept.";
  const resetButton = button("webbook-settings-reset", "Reset all settings", () => {
    document.getElementById("webbook-settings").showPopover?.();
    confirmation.hidden = false;
    resetButton.setAttribute("aria-expanded", "true");
    cancel.focus();
    announceReaderAction(question.textContent, { show: false });
  });
  resetButton.setAttribute("aria-controls", confirmation.id);
  resetButton.setAttribute("aria-expanded", "false");
  const confirm = button("webbook-settings-reset-confirm", "Yes, reset all settings", () => {
    try {
      const reload = prepareReload("All settings reset", resetButton.id);
      resetSettings();
      reload();
    } catch (error) {
      clearReturnState();
      report(`Settings not reset. ${error.message}`);
    }
  });
  const cancel = button("webbook-settings-reset-cancel", "Cancel", () => {
    confirmation.hidden = true;
    resetButton.setAttribute("aria-expanded", "false");
    resetButton.focus();
  });
  confirmation.append(question, cancel, confirm);
  group.append(exportButton, importButton, picker, resetButton, confirmation, status);
  appendSetting("all", group);
  for (const [id, label, control] of [
    ["export-settings", "Export settings", exportButton],
    ["import-settings", "Import settings", importButton],
    ["reset-settings", "Reset all settings", resetButton]
  ]) {
    registerAction({ id, label, group: "Settings", run: () => control.click() });
  }
  restoreAfterReload(report);
}
function prepareReload(message, focusId, panelId = "webbook-settings") {
  const audio = pageAudio();
  const panel = document.getElementById(panelId);
  const blocks = readingBlocks();
  const blockIndex = blocks.findIndex((element) => element.getClientRects().length && readingEnd(element.getBoundingClientRect()) > readingLine());
  const block = blocks[blockIndex]?.getBoundingClientRect();
  const state = {
    url: location.href,
    scrollY: readingScroll(),
    audioTime: audio?.currentTime ?? 0,
    blockIndex,
    blockOffset: block ? readingStart(block) - readingLine() : 0,
    playing: Boolean(audio && !audio.paused),
    panelId,
    panelScroll: panel.scrollTop,
    message,
    focusId
  };
  sessionStorage.setItem(RETURN_KEY, JSON.stringify(state));
  return () => location.reload();
}
function clearReturnState() {
  try {
    sessionStorage.removeItem(RETURN_KEY);
  } catch {
  }
}
function restoreAfterReload(report) {
  let state;
  try {
    state = JSON.parse(sessionStorage.getItem(RETURN_KEY));
    sessionStorage.removeItem(RETURN_KEY);
  } catch {
    return;
  }
  if (!state || state.url !== location.href) return;
  const restore = () => {
    const audio = pageAudio();
    const seek = () => {
      if (audio) audio.currentTime = state.audioTime;
      if (audio && state.playing) playOrOfferToContinue(audio);
    };
    if (audio && audio.readyState < 1) audio.addEventListener("loadedmetadata", seek, { once: true });
    else seek();
    const block = readingBlocks()[state.blockIndex];
    const top = block?.getClientRects().length ? readingScroll() + readingStart(block.getBoundingClientRect()) - readingLine() - state.blockOffset : state.scrollY;
    scrollToReading(top);
    const panel = document.getElementById(state.panelId || "webbook-settings");
    const refocus = () => {
      document.getElementById(state.focusId)?.focus({ preventScroll: true });
      panel.scrollTop = state.panelScroll;
    };
    panel.addEventListener("toggle", () => setTimeout(refocus), { once: true });
    panel.showPopover?.();
    refocus();
    report(state.message);
  };
  const afterPlayer = () => {
    const audio = pageAudio();
    const track = audio?.querySelector("track");
    const hasSource = audio && (audio.getAttribute("src") || audio.querySelector("source[src]"));
    const settled = () => window.requestAnimationFrame(() => window.requestAnimationFrame(restore));
    if (hasSource && track && track.readyState < 2) {
      const ready = () => {
        document.removeEventListener("webbook:playerready", ready);
        track.removeEventListener("error", ready);
        settled();
      };
      document.addEventListener("webbook:playerready", ready, { once: true });
      track.addEventListener("error", ready, { once: true });
    } else settled();
  };
  if (document.readyState === "complete") afterPlayer();
  else window.addEventListener("load", afterPlayer, { once: true });
}

// template/src/js/offline-resources.js
var OFFLINE_PROTOCOL = 1;
var LIMITS = { files: 2e4, bytes: 10 * 1024 ** 3, discoveryBytes: 128 * 1024 ** 2 };
function bookRoot(href = location.href) {
  return new URL("./", href).href;
}
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
  const read = async (entry) => {
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
  const inventoryText = await read(inventoryEntry), inventory = JSON.parse(inventoryText);
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
    const text = entry.body ? await entry.body.text() : await read(entry);
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
function compareInventory(saved, fresh) {
  const old = new Map(saved.files.map((file) => [file.url, file]));
  let changed = old.size !== fresh.files.length, reliable = true;
  for (const file of fresh.files) {
    const previous = old.get(file.url);
    if (!previous) {
      changed = true;
      continue;
    }
    const digest = file.digest || file.sha256, oldDigest = previous.digest || previous.sha256;
    if (digest && oldDigest) {
      if (digest !== oldDigest) changed = true;
    } else if (file.etag && previous.etag && !file.etag.startsWith("W/") && !previous.etag.startsWith("W/")) {
      if (file.etag !== previous.etag) changed = true;
    } else {
      reliable = false;
      if (file.modified && previous.modified && file.modified !== previous.modified || file.size !== null && file.size !== void 0 && previous.size !== null && previous.size !== void 0 && file.size !== previous.size) changed = true;
    }
  }
  return { changed, reliable };
}
function includeRemoteRelease(list, root, remote) {
  if (!remote || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/.test(remote.version)) throw new Error("Invalid UI release.");
  const base = new URL(remote.version + "/", remote.channel);
  workerScriptURL(root, { channel: remote.channel, worker: new URL("offline-worker.js", base).href });
  if (remote.inventory?.version !== 1 || remote.inventory.contract !== list.ui.contract || !Array.isArray(remote.inventory.files)) throw new Error("Incompatible remote UI inventory.");
  const entries = remote.inventory.files.map((file) => {
    const url = new URL(file.href, base);
    if (!url.href.startsWith(base.href) || /(?:^|\/)\.\.(?:\/|$)|[\\\u0000]/.test(decodeURIComponent(url.pathname)) || url.search || url.hash || !/^[a-f0-9]{64}$/.test(file.sha256) || !Number.isSafeInteger(file.bytes) || file.bytes < 0) throw new Error("Invalid remote UI inventory.");
    return { url: url.href, kind: kindFor(url.href), size: file.bytes, sha256: file.sha256 };
  });
  for (const required of ["main.js", "style.css", "offline-worker.js"]) if (!entries.some((file) => file.url === new URL(required, base).href)) throw new Error("The remote UI release is incomplete.");
  const unique = new Map(list.files.map((file) => [file.url, file]));
  for (const file of entries) unique.set(file.url, file);
  if (unique.size > LIMITS.files || list.bytes + entries.reduce((sum, file) => sum + file.size, 0) > LIMITS.bytes) throw new Error("The offline release is too large.");
  return {
    ...list,
    files: Array.from(unique.values()),
    bytes: list.bytes + entries.reduce((sum, file) => sum + file.size, 0),
    ui: { ...list.ui, remote: { channel: new URL(remote.channel).href, version: remote.version, files: entries } }
  };
}

// template/src/js/bootstrap-policy.js
var uiKey = (root) => "webbook-ui:" + root;
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
async function includeSelectedUI(root, list, { initial = false, signal } = {}) {
  if (initial && window.webbookUI?.local) return { ...list, ui: { ...list.ui, localOnly: true } };
  let selected = initial ? window.webbookUI : null;
  let explicitLocal = false;
  try {
    explicitLocal = localStorage.getItem("webbook-ui:" + root + ":override") === "local";
  } catch {
  }
  const index = list.files.find((file) => file.url === new URL("index.html", root).href);
  const html = index?.body && await index.body.text();
  const channelValue = html && new DOMParser().parseFromString(html, "text/html").querySelector('meta[name="webbook-ui-channel"]')?.content;
  if (explicitLocal || !channelValue) return { ...list, ui: { ...list.ui, localOnly: true } };
  const channel = new URL(channelValue);
  const read = async (url) => {
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
    const manifest = await read(new URL("current.json", channel));
    if (manifest.protocol !== void 0 && manifest.protocol !== 1)
      throw new Error("The UI channel uses an incompatible offline protocol.");
    if (manifest.contract !== list.ui.contract)
      throw new Error("The UI channel requires a different book contract.");
    if (manifest.useLocal) return { ...list, ui: { ...list.ui, localOnly: true } };
    if (manifest.minBootstrap !== 1 || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/.test(manifest.version || ""))
      throw new Error("The UI channel is incompatible.");
    selected = validateManifest(manifest, { contract: list.ui.contract, channel: channel.href, local: { local: true } });
  }
  const base = new URL(selected.version + "/", channel);
  workerScriptURL(root, { channel: channel.href, worker: new URL("offline-worker.js", base).href });
  const inventoryURL = new URL(selected.inventory || "ui-files.json", base);
  if (inventoryURL.origin !== base.origin || !inventoryURL.href.startsWith(base.href) || inventoryURL.search || inventoryURL.hash)
    throw new Error("Invalid remote inventory.");
  const inventory = await read(inventoryURL);
  verifyInventory(selected.script ? selected : releaseSelection(selected.version, { contract: list.ui.contract, channel: channel.href }), inventory);
  const complete = includeRemoteRelease(list, root, { channel: channel.href, version: selected.version, inventory });
  return { ...complete, ui: { ...complete.ui, localOnly: true } };
}

// template/src/js/offline-connectivity.js
async function bookServerReachable(url, fetcher = fetch) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5e3);
  const options = { cache: "no-store", headers: { "X-Webbook-Offline-Network": "1" }, signal: controller.signal };
  try {
    let response = await fetcher(url, { ...options, method: "HEAD" });
    if ([405, 501].includes(response.status)) {
      response = await fetcher(url, { ...options, method: "GET" });
      await response.body?.cancel();
    }
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
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
async function registerOfflineWorker(root = bookRoot(), remote) {
  const registration = await navigator.serviceWorker.register(workerScriptURL(root, remote), { scope: root, updateViaCache: "none" });
  const worker = registration.active || registration.installing || registration.waiting;
  if (!worker) throw new Error("The offline worker is unavailable.");
  if (!registration.active) await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("The offline worker did not start.")), 2e4);
    const check = () => {
      if (worker.state === "activated") {
        clearTimeout(timer);
        resolve();
      } else if (worker.state === "redundant") {
        clearTimeout(timer);
        reject(new Error("The offline worker could not be installed."));
      }
    };
    worker.addEventListener("statechange", check);
    check();
  });
  return registration;
}
var bytesText = (value) => new Intl.NumberFormat(void 0, { maximumFractionDigits: 1 }).format(value / 1024 ** 2) + " MB";
function initOfflineReading() {
  const panel = document.querySelector("#webbook-info .webbook-info-body");
  if (!panel || document.getElementById("webbook-offline")) return;
  try {
    const url = new URL(location.href);
    if (url.searchParams.has("webbook-offline-recover")) {
      url.searchParams.delete("webbook-offline-recover");
      history.replaceState(history.state, "", url);
    }
  } catch {
  }
  const root = bookRoot(), section = document.createElement("section");
  section.id = "webbook-offline";
  const library = document.createElement("a");
  library.href = new URL("src/offline-books.html", root);
  library.textContent = "Offline books";
  const heading = document.createElement("h3");
  heading.id = "webbook-offline-heading";
  heading.tabIndex = -1;
  heading.textContent = "Offline reading";
  section.setAttribute("aria-labelledby", heading.id);
  const status = document.createElement("p");
  status.id = "webbook-offline-status";
  status.setAttribute("role", "status");
  status.setAttribute("aria-atomic", "true");
  const storage = document.createElement("p");
  storage.id = "webbook-offline-storage";
  const progressLabel = document.createElement("label");
  progressLabel.htmlFor = "webbook-offline-progress";
  progressLabel.textContent = "Book download";
  progressLabel.hidden = true;
  const progress = document.createElement("progress");
  progress.id = progressLabel.htmlFor;
  progress.hidden = true;
  const count = document.createElement("p");
  count.id = "webbook-offline-count";
  const controls = document.createElement("div");
  controls.className = "webbook-offline-controls";
  const confirmation = document.createElement("div");
  confirmation.className = "webbook-confirmation";
  confirmation.hidden = true;
  confirmation.id = "webbook-offline-confirmation";
  confirmation.setAttribute("role", "group");
  confirmation.setAttribute("aria-labelledby", "webbook-offline-question");
  const question = document.createElement("p");
  question.id = "webbook-offline-question";
  question.textContent = "Remove this saved book? Further offline reading will need another download. Your settings and reading position will be kept.";
  const indicator = document.createElement("button");
  indicator.type = "button";
  indicator.id = "webbook-offline-indicator";
  indicator.textContent = "Offline";
  indicator.hidden = true;
  indicator.addEventListener("click", open);
  document.getElementById("webbook-top-toolbar")?.prepend(indicator);
  section.append(heading, library, status, storage, progressLabel, progress, count, controls, confirmation);
  const title = panel.querySelector("h2");
  if (title) title.after(section);
  else panel.prepend(section);
  let registration, snapshot = null, savedRecord = false, pending = false, busy = false, remoteBusy = false, controller, prepared = null, persistent = null, operationVersion = 0;
  let serverReachable = null, probing = false;
  const available = window.isSecureContext && Boolean(typeof window.Worker === "function" && navigator.serviceWorker && window.caches && window.indexedDB && window.crypto?.subtle);
  const button = (id, label, run) => {
    const node = document.createElement("button");
    node.type = "button";
    node.id = "webbook-offline-" + id;
    node.textContent = label;
    node.addEventListener("click", () => Promise.resolve().then(run).catch(fail));
    controls.append(node);
    return node;
  };
  const save = button("save", "Save for offline reading", download);
  const inspect = button("size", "Find download size", findSize);
  const cancel = button("cancel", "Cancel download", async () => {
    controller?.abort();
    if (registration?.active) await offlineCommand(registration.active, "cancel");
  });
  const check = button("check", "Check for updates", checkUpdates);
  const update = button("update", "Refresh saved copy", download);
  const use = button("use", "Use update and reload", async () => {
    const reload = prepareReload("Saved book updated", "webbook-offline-heading", "webbook-info");
    try {
      await command("activate");
      document.querySelector("audio")?.pause();
      reload();
    } catch (error) {
      clearReturnState();
      await refresh().catch(() => {
      });
      (pending ? use : snapshot ? update : save).focus();
      throw error;
    }
  });
  const remove = button("remove", "Remove saved book", () => {
    confirmation.hidden = false;
    no.focus();
  });
  const no = document.createElement("button");
  no.type = "button";
  no.textContent = "Cancel";
  no.addEventListener("click", () => {
    confirmation.hidden = true;
    remove.focus();
  });
  const yes = document.createElement("button");
  yes.type = "button";
  yes.id = "webbook-offline-remove-confirm";
  yes.textContent = "Yes, remove saved book";
  yes.addEventListener("click", async () => {
    operationVersion++;
    busy = true;
    render();
    try {
      await command("remove");
      confirmation.hidden = true;
      prepared = null;
      await refresh();
      report("Saved book removed. Settings and reading positions kept.");
    } catch (error) {
      fail(error);
    } finally {
      busy = false;
      render();
      (savedRecord ? remove : save).focus();
    }
  });
  confirmation.append(question, no, yes);
  function open() {
    document.getElementById("webbook-info")?.showPopover?.();
    heading.focus({ preventScroll: true });
    heading.scrollIntoView({ block: "start" });
  }
  function report(message) {
    if (status.textContent !== message) status.textContent = message;
  }
  function fail(error) {
    if (error.name === "AbortError") report("Download canceled.");
    else report(error.message || "Offline reading is unavailable.");
  }
  function render() {
    const operating = busy || remoteBusy, focused = document.activeElement;
    indicator.hidden = serverReachable !== false;
    indicator.setAttribute("aria-label", `Book server unavailable. ${snapshot ? "Reading the saved copy." : "This book isn't saved."} Open offline reading.`);
    save.hidden = Boolean(snapshot) || pending;
    inspect.hidden = Boolean(snapshot) || pending;
    check.hidden = update.hidden = !snapshot || pending;
    use.hidden = !pending;
    remove.hidden = !savedRecord && !pending;
    cancel.hidden = !operating;
    for (const control of [save, inspect, check, update, use, remove]) control.disabled = operating || !available;
    progress.hidden = progressLabel.hidden = count.hidden = !operating;
    yes.disabled = operating;
    if (operating && [save, inspect, check, update, use, remove].includes(focused)) cancel.focus({ preventScroll: true });
    else if (!operating && focused === cancel) (snapshot ? check : save).focus({ preventScroll: true });
  }
  async function ensure() {
    if (!registration) {
      const existing = await navigator.serviceWorker.getRegistration(root);
      const expected = workerScriptURL(root);
      registration = existing?.scope === root && existing.active && existing.active.scriptURL === expected ? existing : await registerOfflineWorker(root);
    }
    return registration;
  }
  async function command(name, data, onProgress, signal) {
    await ensure();
    return offlineCommand(registration.active, name, data, onProgress, signal);
  }
  async function refresh() {
    if (!available) {
      report("Offline reading is unavailable here. Use HTTPS or localhost with browser storage enabled.");
      render();
      return;
    }
    const version = operationVersion;
    const result = await command("status");
    if (version !== operationVersion) return;
    savedRecord = Boolean(result.saved);
    snapshot = result.complete && !result.recovering ? result.saved : null;
    pending = Boolean(result.pending);
    remoteBusy = result.busy && !busy;
    if (busy) {
      render();
      return;
    }
    if (result.recovering) report("This is an online recovery copy. Save the book again, then use the update and reload to restore offline reading.");
    else if (result.saved && !result.complete) report("This saved copy is incomplete. Reconnect and save it again.");
    else if (busy || remoteBusy) report("A book download is in progress in this tab or another tab.");
    else if (result.pendingIncomplete) report("The downloaded update is incomplete. Refresh the saved copy to download it again; your working copy is kept.");
    else if (pending) report("Update ready. Use the update and reload when you are ready.");
    else if (serverReachable === false) report(`Book server unavailable. ${snapshot ? "You are reading the saved copy." : "This book isn't saved for offline reading."}`);
    else report(snapshot ? `Saved for offline reading, ${bytesText(snapshot.bytes)}.` : "This book is not saved for offline reading.");
    render();
  }
  async function estimate() {
    try {
      const result = await navigator.storage?.estimate?.();
      storage.textContent = result && Number.isFinite(result.quota) && Number.isFinite(result.usage) ? `This website uses about ${bytesText(result.usage || 0)}; up to ${bytesText(Math.max(0, result.quota - result.usage))} may be available.` : "";
      if (persistent === false) storage.textContent += " Your browser may remove saved books to free storage.";
    } catch {
      storage.textContent = "Available storage is unknown.";
    }
  }
  async function discover() {
    controller = new AbortController();
    report("Finding book files\u2026 Keep this tab open.");
    progress.removeAttribute("value");
    const list = await discoverBook(root, { signal: controller.signal, onProgress: (total) => {
      count.textContent = `${total} files found.`;
    } });
    return includeSelectedUI(root, list, { initial: !snapshot, signal: controller.signal });
  }
  async function findSize() {
    operationVersion++;
    busy = true;
    render();
    try {
      prepared = await discover();
      report(`${prepared.sizeKnown ? "Download size: " : "Download size: at least "}${bytesText(prepared.bytes)}${prepared.sizeKnown ? "." : "; some file sizes are unknown."} Choose Save for offline reading to download the book.`);
      await estimate();
    } finally {
      busy = false;
      render();
      save.focus();
    }
  }
  function downloadProgress(detail) {
    progress.max = detail.total;
    progress.value = detail.done;
    count.textContent = detail.phase === "verifying" ? "Checking downloaded files\u2026" : `${Math.floor(detail.done / detail.total * 100)}% \u2014 ${detail.done} of ${detail.total} files; ${bytesText(detail.bytes)} downloaded.`;
  }
  async function download() {
    if (busy || remoteBusy) return;
    operationVersion++;
    busy = true;
    render();
    report("Preparing the download\u2026");
    try {
      await ensure();
      try {
        persistent = Boolean(await navigator.storage?.persisted?.() || await navigator.storage?.persist?.());
      } catch {
        persistent = false;
      }
      const list = prepared || await discover();
      prepared = null;
      report("Saving book\u2026 Keep this tab open.");
      count.textContent = "";
      progress.max = list.files.length;
      progress.value = 0;
      const result = await command("save", list, downloadProgress, controller?.signal);
      await refresh();
      report(pending ? "Update ready. Your current saved copy is unchanged until you choose Use update and reload." : snapshot ? result.ready ? "The downloaded update is unavailable. Your previous saved copy is kept; refresh to retry." : `Saved for offline reading, ${bytesText(snapshot.bytes)}.` : "The saved copy is unavailable. Save the book again.");
      await estimate();
    } catch (error) {
      await refresh().catch(() => {
      });
      fail(error);
    } finally {
      busy = false;
      controller = null;
      render();
      (pending ? use : snapshot ? check : save).focus();
    }
  }
  async function checkUpdates() {
    operationVersion++;
    busy = true;
    render();
    try {
      const fresh = await discover();
      const comparison = compareInventory(snapshot, fresh);
      prepared = fresh;
      report(comparison.changed ? "An update is available. Choose Update saved book to download it." : comparison.reliable ? "No changes detected." : "No changes detected, but this host cannot provide a reliable version check. You can refresh the saved copy.");
      update.textContent = comparison.changed ? "Update saved book" : "Refresh saved copy";
    } finally {
      busy = false;
      render();
      check.focus();
    }
  }
  for (const [id, label, control] of [["save-offline", "Save book for offline reading", save], ["cancel-offline", "Cancel offline download", cancel], ["check-offline", "Check saved book for updates", check], ["update-offline", "Update saved book", update], ["use-offline-update", "Use saved book update and reload", use], ["remove-offline", "Remove saved book", remove]]) {
    registerAction({ id, label, group: "Offline reading", isAvailable: () => !control.hidden && !control.disabled, run: () => {
      open();
      control.click();
    } });
  }
  registerAction({ id: "open-offline", label: "Offline reading", group: "Panels", isAvailable: () => typeof document.getElementById("webbook-info")?.showPopover === "function", run: open });
  document.getElementById("webbook-info")?.addEventListener("beforetoggle", (event) => {
    if (event.newState === "open" && !busy) refresh().then(estimate).catch(fail);
  });
  navigator.serviceWorker?.addEventListener("message", (event) => {
    if (event.data?.webbookOffline !== 1) return;
    if (event.data.changed && !busy) refresh().catch(fail);
    if (event.data.incomplete) {
      snapshot = null;
      report("This saved copy is incomplete. Reconnect and save it again.");
      render();
    }
    if (event.data.progress && !busy) {
      remoteBusy = true;
      downloadProgress(event.data.progress);
      report("A book download is in progress in another tab.");
      render();
    }
  });
  async function checkServer() {
    if (probing || document.visibilityState === "hidden") return;
    probing = true;
    try {
      const reachable = await bookServerReachable(new URL("index.html", root));
      const previous = serverReachable;
      serverReachable = reachable;
      render();
      if (previous !== reachable) {
        if (!busy) await refresh().catch(() => {
        });
        if (!status.getClientRects().length && (previous !== null || !reachable)) announceReaderAction(reachable ? "Book server available." : "Book server unavailable. Open About for saved-book status.", reachable ? {} : { action: { label: "About", run: open } });
      }
    } finally {
      probing = false;
    }
  }
  for (const name of ["online", "offline", "focus"]) window.addEventListener(name, checkServer);
  document.addEventListener("visibilitychange", checkServer);
  report(available ? "Save this book to read and listen without a connection." : "Offline reading is unavailable here. Use HTTPS or localhost with browser storage enabled.");
  render();
  if (available) {
    checkServer();
    window.setInterval(checkServer, 3e4);
  }
  if (available && navigator.serviceWorker.controller) refresh().catch(fail);
}

export {
  uiKey,
  initSettingsTransfer,
  prepareReload,
  clearReturnState,
  discoverBook,
  includeSelectedUI,
  offlineCommand,
  initOfflineReading
};
