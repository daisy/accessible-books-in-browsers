import {
  normalizeSearchText
} from "./chunk-CQENM7MV.js";
import {
  adjacentPageLink,
  announceReaderAction,
  appendSetting,
  bookTimeDestination,
  bookTimelineStatus,
  currentCaptionElement,
  getActions,
  initAppearance,
  initCaptionMode,
  initEscapability,
  initInPlaceNavigation,
  initKeyboardShortcutEditorButton,
  initKeyboardShortcuts,
  initNotesInPlace,
  initPageActions,
  initPlayer,
  initReaderActionNotice,
  initResumePosition,
  initResumeSetting,
  initSettings,
  initSettingsFilter,
  initSkippability,
  initWritingMode,
  lastNarratedElement,
  navigateTo,
  normalizeKeySpec,
  optionElement,
  pageAudio,
  pausedForSound,
  playOrOfferToContinue,
  positionAnchor,
  prepareReaderShell,
  readSetting,
  readingEnd,
  readingLine,
  readingScroll,
  readingStart,
  registerAction,
  runAction,
  scrollToReading,
  seekBookTime,
  settingsSection,
  shortcutRejection,
  syncPositionUrl,
  viewportLength,
  writeSetting
} from "./chunk-2PIDKBOH.js";
import {
  cacheCueElements,
  cueForElement,
  cueNeedsTime,
  elmForCue
} from "./chunk-JJPBXBH7.js";

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
  const button2 = (id, label, run) => {
    const element = document.createElement("button");
    element.id = id;
    element.type = "button";
    element.textContent = label;
    element.addEventListener("click", run);
    return element;
  };
  const exportButton = button2("webbook-settings-export", "Export settings", () => {
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
    } catch (error2) {
      report(`Settings not exported. ${error2.message}`);
    }
  });
  const picker = document.createElement("input");
  picker.type = "file";
  picker.accept = "application/json,.json";
  picker.hidden = true;
  picker.id = "webbook-settings-file";
  const importButton = button2("webbook-settings-import", "Import settings", () => {
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
    } catch (error2) {
      clearReturnState();
      report(`Settings not imported. ${error2.message}`);
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
  const resetButton = button2("webbook-settings-reset", "Reset all settings", () => {
    document.getElementById("webbook-settings").showPopover?.();
    confirmation.hidden = false;
    resetButton.setAttribute("aria-expanded", "true");
    cancel.focus();
    announceReaderAction(question.textContent, { show: false });
  });
  resetButton.setAttribute("aria-controls", confirmation.id);
  resetButton.setAttribute("aria-expanded", "false");
  const confirm = button2("webbook-settings-reset-confirm", "Yes, reset all settings", () => {
    try {
      const reload = prepareReload("All settings reset", resetButton.id);
      resetSettings();
      reload();
    } catch (error2) {
      clearReturnState();
      report(`Settings not reset. ${error2.message}`);
    }
  });
  const cancel = button2("webbook-settings-reset-cancel", "Cancel", () => {
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

// template/src/js/reader-updates.js
function runningReader() {
  const status = window.webbookUIStatus;
  if (status?.version) return `Reader updates are on. This page uses reader release ${status.version}.`;
  if (status?.reason) return `Reader updates are on, but this page uses the book's own reader, because ${status.reason}.`;
  return "Reader updates are on.";
}
function initReaderUpdates() {
  const panel = document.querySelector("#webbook-info .webbook-info-body");
  if (!panel || document.getElementById("webbook-reader-updates")) return;
  const key = uiKey(new URL("./", location.href).href);
  let override;
  const read = (name) => {
    try {
      return window[name].getItem(key + ":override");
    } catch {
      return null;
    }
  };
  override = read("sessionStorage") || read("localStorage");
  const section = document.createElement("section");
  section.id = "webbook-reader-updates";
  const heading = document.createElement("h3");
  heading.textContent = "Reader updates";
  const status = document.createElement("p");
  const channel = document.querySelector('meta[name="webbook-ui-channel"]')?.content;
  status.textContent = !channel ? "This book uses its fixed bundled reader." : override === "local" ? "Updates are paused for this book: you chose the bundled reader." : override?.startsWith("release:") ? `This tab is pinned to reader release ${override.slice(8)}.` : override === "remote" ? "This tab checks the reader channel on every page load." : runningReader();
  const restore = document.createElement("button");
  restore.type = "button";
  restore.id = "webbook-reader-updates-auto";
  restore.textContent = "Return to automatic updates";
  restore.hidden = !override || !channel;
  restore.addEventListener("click", () => {
    try {
      const reload = prepareReload("Automatic reader updates restored", heading.id, "webbook-info");
      const url = new URL(location.href);
      url.searchParams.set("webbook-ui", "auto");
      history.replaceState(history.state, "", url);
      reload();
    } catch {
      clearReturnState();
      announceReaderAction("Reader updates could not be changed. Try adding ?webbook-ui=auto to this book\u2019s address.");
    }
  });
  heading.id = "webbook-reader-updates-heading";
  heading.tabIndex = -1;
  section.setAttribute("aria-labelledby", heading.id);
  section.append(heading, status, restore);
  const offline = panel.querySelector("#webbook-offline");
  if (offline) offline.after(section);
  else panel.append(section);
  registerAction({ id: "automatic-reader-updates", label: "Return to automatic reader updates", group: "Reader updates", isAvailable: () => !restore.hidden, run: () => restore.click() });
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
      let depth2 = 1, candidate = true;
      while (i < text.length && depth2) {
        space();
        if (text[i] === '"' || text[i] === "'") {
          const value = quoted();
          if (depth2 === 1 && candidate) {
            urls.push(value);
            candidate = false;
          }
          continue;
        }
        const c = text[i++];
        if (c === "(") depth2++;
        else if (c === ")") depth2--;
        else if (c === "," && depth2 === 1) candidate = true;
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
    let depth2 = 0;
    while (i < text.length) {
      const c = text[i++];
      if (c === "(") depth2++;
      if (c === ")") depth2--;
      if (c === "," && !depth2) break;
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
      } catch (error2) {
        if (signal?.aborted) throw error2;
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

// template/src/js/offline-connectivity.js
async function bookServerReachable(url, fetcher = fetch) {
  const controller2 = new AbortController();
  const timer = setTimeout(() => controller2.abort(), 5e3);
  const options = { cache: "no-store", headers: { "X-Webbook-Offline-Network": "1" }, signal: controller2.signal };
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
  const inventory = await read(inventoryURL);
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
      rejectReady = (error2) => {
        clearTimeout(timer);
        reject(error2);
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
  let registration, snapshot2 = null, savedRecord = false, pending = false, busy = false, remoteBusy = false, controller2, prepared = null, persistent = null, operationVersion = 0;
  let serverReachable = null, probing = false;
  const available = window.isSecureContext && Boolean(typeof window.Worker === "function" && navigator.serviceWorker && window.caches && window.indexedDB && window.crypto?.subtle);
  const button2 = (id, label, run) => {
    const node = document.createElement("button");
    node.type = "button";
    node.id = "webbook-offline-" + id;
    node.textContent = label;
    node.addEventListener("click", () => Promise.resolve().then(run).catch(fail));
    controls.append(node);
    return node;
  };
  const save = button2("save", "Save for offline reading", download);
  const inspect = button2("size", "Find download size", findSize);
  const cancel = button2("cancel", "Cancel download", async () => {
    controller2?.abort();
    if (registration?.active) await offlineCommand(registration.active, "cancel");
  });
  const check = button2("check", "Check for updates", checkUpdates);
  const update = button2("update", "Refresh saved copy", download);
  const use = button2("use", "Use update and reload", async () => {
    const reload = prepareReload("Saved book updated", "webbook-offline-heading", "webbook-info");
    try {
      await command("activate");
      document.querySelector("audio")?.pause();
      reload();
    } catch (error2) {
      clearReturnState();
      await refresh3().catch(() => {
      });
      (pending ? use : snapshot2 ? update : save).focus();
      throw error2;
    }
  });
  const remove = button2("remove", "Remove saved book", () => {
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
      await refresh3();
      report("Saved book removed. Settings and reading positions kept.");
    } catch (error2) {
      fail(error2);
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
  function fail(error2) {
    if (error2.name === "AbortError") report("Download canceled.");
    else report(error2.message || "Offline reading is unavailable.");
  }
  function render() {
    const operating = busy || remoteBusy, focused = document.activeElement;
    indicator.hidden = serverReachable !== false;
    indicator.setAttribute("aria-label", `Book server unavailable. ${snapshot2 ? "Reading the saved copy." : "This book isn't saved."} Open offline reading.`);
    save.hidden = Boolean(snapshot2) || pending;
    inspect.hidden = Boolean(snapshot2) || pending;
    check.hidden = update.hidden = !snapshot2 || pending;
    use.hidden = !pending;
    remove.hidden = !savedRecord && !pending;
    cancel.hidden = !operating;
    for (const control of [save, inspect, check, update, use, remove]) control.disabled = operating || !available;
    progress.hidden = progressLabel.hidden = count.hidden = !operating;
    yes.disabled = operating;
    if (operating && [save, inspect, check, update, use, remove].includes(focused)) cancel.focus({ preventScroll: true });
    else if (!operating && focused === cancel) (snapshot2 ? check : save).focus({ preventScroll: true });
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
  async function refresh3() {
    if (!available) {
      report("Offline reading is unavailable here. Use HTTPS or localhost with browser storage enabled.");
      render();
      return;
    }
    const version = operationVersion;
    const result2 = await command("status");
    if (version !== operationVersion) return;
    savedRecord = Boolean(result2.saved);
    snapshot2 = result2.complete && !result2.recovering ? result2.saved : null;
    pending = Boolean(result2.pending);
    remoteBusy = result2.busy && !busy;
    if (busy) {
      render();
      return;
    }
    if (result2.recovering) report("This is an online recovery copy. Save the book again, then use the update and reload to restore offline reading.");
    else if (result2.saved && !result2.complete) report("This saved copy is incomplete. Reconnect and save it again.");
    else if (busy || remoteBusy) report("A book download is in progress in this tab or another tab.");
    else if (result2.pendingIncomplete) report("The downloaded update is incomplete. Refresh the saved copy to download it again; your working copy is kept.");
    else if (pending) report("Update ready. Use the update and reload when you are ready.");
    else if (serverReachable === false) report(`Book server unavailable. ${snapshot2 ? "You are reading the saved copy." : "This book isn't saved for offline reading."}`);
    else report(snapshot2 ? `Saved for offline reading, ${bytesText(snapshot2.bytes)}.` : "This book is not saved for offline reading.");
    render();
  }
  async function estimate() {
    try {
      const result2 = await navigator.storage?.estimate?.();
      storage.textContent = result2 && Number.isFinite(result2.quota) && Number.isFinite(result2.usage) ? `This website uses about ${bytesText(result2.usage || 0)}; up to ${bytesText(Math.max(0, result2.quota - result2.usage))} may be available.` : "";
      if (persistent === false) storage.textContent += " Your browser may remove saved books to free storage.";
    } catch {
      storage.textContent = "Available storage is unknown.";
    }
  }
  async function discover() {
    controller2 = new AbortController();
    report("Finding book files\u2026 Keep this tab open.");
    progress.removeAttribute("value");
    const list2 = await discoverBook(root, { signal: controller2.signal, onProgress: (total) => {
      count.textContent = `${total} files found.`;
    } });
    return includeSelectedUI(root, list2, { initial: !snapshot2, signal: controller2.signal });
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
      const list2 = prepared || await discover();
      prepared = null;
      report("Saving book\u2026 Keep this tab open.");
      count.textContent = "";
      progress.max = list2.files.length;
      progress.value = 0;
      const result2 = await command("save", list2, downloadProgress, controller2?.signal);
      await refresh3();
      report(pending ? "Update ready. Your current saved copy is unchanged until you choose Use update and reload." : snapshot2 ? result2.ready ? "The downloaded update is unavailable. Your previous saved copy is kept; refresh to retry." : `Saved for offline reading, ${bytesText(snapshot2.bytes)}.` : "The saved copy is unavailable. Save the book again.");
      await estimate();
    } catch (error2) {
      await refresh3().catch(() => {
      });
      fail(error2);
    } finally {
      busy = false;
      controller2 = null;
      render();
      (pending ? use : snapshot2 ? check : save).focus();
    }
  }
  async function checkUpdates() {
    operationVersion++;
    busy = true;
    render();
    try {
      const fresh = await discover();
      const comparison = compareInventory(snapshot2, fresh);
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
    if (event.newState === "open" && !busy) refresh3().then(estimate).catch(fail);
  });
  navigator.serviceWorker?.addEventListener("message", (event) => {
    if (event.data?.webbookOffline !== 1) return;
    if (event.data.changed && !busy) refresh3().catch(fail);
    if (event.data.incomplete) {
      snapshot2 = null;
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
        if (!busy) await refresh3().catch(() => {
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
  if (available && navigator.serviceWorker.controller) refresh3().catch(fail);
}

// template/src/js/toc-tree.js
var DEPTH_KEY = "webbook-toc-depth";
var DEPTHS = ["1", "2", "3", "all"];
var FIND_DELAY = 150;
var FIND_STATUS_DELAY = 600;
var toc;
var list;
var links = [];
var depth = "all";
var findInput = null;
var findStatus = null;
var findTimer;
var findStatusTimer;
function initTocActions() {
  for (const [value, code] of [["1", "Digit1"], ["2", "Digit2"], ["3", "Digit3"], ["all", "Digit0"]]) {
    registerAction({
      id: `toc-levels-${value}`,
      label: value === "all" ? "Table of contents: show all levels" : `Table of contents: show ${value} ${value === "1" ? "level" : "levels"}`,
      group: "Panels",
      inPanels: true,
      defaultKeys: [{ code, alt: true, shift: true }],
      isAvailable: () => Boolean(toc?.matches(":popover-open") && depthValues().includes(value)),
      run: () => {
        clearFind();
        writeDepth(value);
        applyDepth(value);
        announceReaderAction(levelsMessage(value));
      }
    });
  }
}
function levelsMessage(value) {
  return value === "all" ? "Showing all levels." : value === "1" ? "Showing the top level." : `Showing ${value} levels.`;
}
function tocFindAvailable() {
  return Boolean(toc?.matches(":popover-open") && findInput);
}
function focusTocFind() {
  if (!tocFindAvailable()) return false;
  findInput.focus();
  findInput.select();
  announceReaderAction("Find a section.");
  return true;
}
function initTocTree() {
  toc = document.querySelector("#webbook-toc-nav");
  moveCoverLinkToAbout();
  list = directChild(toc, "ol");
  if (!toc || !list) return;
  list.setAttribute("aria-labelledby", "webbook-toc-nav-hd");
  links = Array.from(list.querySelectorAll("li > a"));
  if (!links.length) return;
  addFindField();
  addDepthControl();
  applyDepth(readDepth());
  toc.addEventListener("toggle", (event) => {
    if (event.newState !== "open") {
      clearFind();
      return;
    }
    refreshTocTree({ moveFocus: true });
  });
  document.addEventListener("webbook:pagechange", () => refreshTocTree());
  document.addEventListener("webbook:narrationpositionchange", () => {
    if (toc.matches(":popover-open")) renderCurrentMarker();
  });
}
function moveCoverLinkToAbout() {
  const coverLink = document.querySelector("#webbook-cover-link");
  const infoBody = document.querySelector("#webbook-info .webbook-info-body");
  const progress = infoBody?.querySelector("#webbook-progress");
  if (!coverLink || !infoBody) return;
  coverLink.textContent = "Go to cover";
  coverLink.classList.add("webbook-cover-page-link");
  if (progress) infoBody.insertBefore(coverLink, progress);
  else infoBody.append(coverLink);
}
function refreshTocTree({ moveFocus = false } = {}) {
  if (!list) return;
  const marked = renderCurrentMarker();
  if (!moveFocus) return;
  const target = marked || visibleLinks()[0];
  if (!target) return;
  target.focus({ preventScroll: true });
  target.scrollIntoView({ block: "nearest" });
}
function renderCurrentMarker() {
  const current = currentTocEntry().current;
  const actual = current && links.includes(current) ? current : null;
  const marked = actual ? nearestVisibleLink(actual) : null;
  links.forEach((link) => link.removeAttribute("aria-current"));
  marked?.setAttribute("aria-current", "page");
  return marked;
}
function addFindField() {
  const header = toc.querySelector("#webbook-toc-header");
  if (!header || header.querySelector("#webbook-toc-find")) return;
  const wrapper = document.createElement("div");
  wrapper.id = "webbook-toc-find";
  const label = document.createElement("label");
  label.htmlFor = "webbook-toc-find-input";
  label.textContent = "Find a section";
  findInput = document.createElement("input");
  findInput.type = "search";
  findInput.id = "webbook-toc-find-input";
  findInput.autocomplete = "off";
  findInput.setAttribute("aria-describedby", "webbook-toc-find-status");
  findStatus = document.createElement("p");
  findStatus.id = "webbook-toc-find-status";
  findStatus.setAttribute("role", "status");
  findStatus.setAttribute("aria-atomic", "true");
  wrapper.append(label, findInput, findStatus);
  header.append(wrapper);
  findInput.addEventListener("input", () => {
    clearTimeout(findTimer);
    findTimer = setTimeout(() => applyFind(findInput.value), FIND_DELAY);
  });
  findInput.addEventListener("keydown", handleFindKeydown);
}
function handleFindKeydown(event) {
  if (event.altKey || event.ctrlKey || event.metaKey) return;
  if (event.key === "Escape" && findInput.value) {
    event.preventDefault();
    event.stopPropagation();
    clearFind();
    return;
  }
  if (event.key !== "Enter" || !findInput.value) return;
  clearTimeout(findTimer);
  applyFind(findInput.value);
  const first = links.find((link) => link.dataset.webbookTocMatch === "true");
  if (!first) return;
  event.preventDefault();
  first.click();
}
function applyFind(query) {
  const lang = document.documentElement.lang || "";
  const wanted = normalizeSearchText(query.trim().replace(/\s+/g, " "), lang);
  if (!wanted) {
    clearFind({ keepText: true });
    return;
  }
  const shown = /* @__PURE__ */ new Set();
  let matches = 0;
  for (const link of links) {
    const match = normalizeSearchText(linkText(link), lang).includes(wanted);
    link.dataset.webbookTocMatch = String(match);
    if (!match) continue;
    matches += 1;
    shown.add(link);
    sublistFor(link)?.querySelectorAll("li > a").forEach((inner) => shown.add(inner));
    for (let parent = parentLink(link); parent; parent = parentLink(parent)) shown.add(parent);
  }
  for (const link of links) link.parentElement.hidden = !shown.has(link);
  nestedLists().forEach((nested) => {
    nested.hidden = false;
  });
  renderCurrentMarker();
  announceFind(matches);
}
function clearFind({ keepText = false } = {}) {
  clearTimeout(findTimer);
  clearTimeout(findStatusTimer);
  if (findInput && !keepText) findInput.value = "";
  if (findStatus) findStatus.textContent = "";
  if (!links.some((link) => "webbookTocMatch" in link.dataset)) return;
  for (const link of links) {
    link.parentElement.hidden = false;
    delete link.dataset.webbookTocMatch;
  }
  applyDepth(depth);
}
function announceFind(matches) {
  clearTimeout(findStatusTimer);
  findStatusTimer = setTimeout(() => {
    findStatus.textContent = matches === 0 ? "No sections match" : `${matches} ${matches === 1 ? "section matches" : "sections match"}`;
  }, FIND_STATUS_DELAY);
}
function addDepthControl() {
  const header = toc.querySelector("#webbook-toc-header");
  if (!header || header.querySelector("#webbook-toc-depth")) return;
  const maxDepth = Math.max(...links.map(linkDepth));
  if (maxDepth <= 1) return;
  const wrapper = document.createElement("div");
  wrapper.id = "webbook-toc-depth-control";
  const label = document.createElement("label");
  label.htmlFor = "webbook-toc-depth";
  label.textContent = "Show levels";
  const select = document.createElement("select");
  select.id = "webbook-toc-depth";
  for (const value of [...DEPTHS.slice(0, Math.min(3, maxDepth - 1)), "all"]) {
    select.add(new Option(value === "all" ? "All" : value, value));
  }
  select.addEventListener("change", () => {
    clearFind();
    writeDepth(select.value);
    applyDepth(select.value);
    announceReaderAction(levelsMessage(select.value), { show: false });
  });
  wrapper.append(label, select);
  header.append(wrapper);
}
function depthSelect() {
  return toc?.querySelector("#webbook-toc-depth") || null;
}
function depthValues() {
  return Array.from(depthSelect()?.options || [], (option) => option.value);
}
function readDepth() {
  try {
    const value = localStorage.getItem(DEPTH_KEY);
    return DEPTHS.includes(value) ? value : "all";
  } catch {
    return "all";
  }
}
function writeDepth(value) {
  try {
    localStorage.setItem(DEPTH_KEY, value);
  } catch {
  }
}
function applyDepth(value) {
  depth = depthValues().includes(value) ? value : "all";
  const select = depthSelect();
  if (select) select.value = depth;
  const shownLevels = depth === "all" ? Infinity : Number(depth);
  nestedLists().forEach((nested) => {
    nested.hidden = listLevel(nested) > shownLevels;
  });
  renderCurrentMarker();
  const focused = document.activeElement;
  if (focused && links.includes(focused) && !isVisible(focused)) nearestVisibleLink(focused)?.focus({ preventScroll: true });
}
function linkText(link) {
  const clone = link.cloneNode(true);
  clone.querySelectorAll(".sr-only, .webbook-narrated-mark").forEach((node) => node.remove());
  return clone.textContent.trim().replace(/\s+/g, " ");
}
function nearestVisibleLink(link) {
  let candidate = link;
  while (candidate && !isVisible(candidate)) candidate = parentLink(candidate);
  return candidate;
}
function visibleLinks() {
  return links.filter(isVisible);
}
function isVisible(link) {
  return !link.closest("ol[hidden], li[hidden]");
}
function nestedLists() {
  return Array.from(list.querySelectorAll("ol"));
}
function listLevel(ol) {
  let level = 1;
  for (let parent = ol.parentElement?.closest("ol"); parent && list.contains(parent); parent = parent.parentElement?.closest("ol")) level += 1;
  return level;
}
function linkDepth(link) {
  return listLevel(link.closest("ol"));
}
function sublistFor(link) {
  return directChild(link.parentElement, "ol");
}
function parentLink(link) {
  const parentList = link.parentElement?.parentElement;
  if (!parentList || parentList === list) return null;
  return directChild(parentList.parentElement, "a");
}
function directChild(parent, localName) {
  if (!parent) return null;
  return Array.from(parent.children).find((child) => child.localName === localName) || null;
}

// template/src/js/popovers.js
var WEBBOOK_POPOVER_IDS = ["webbook-toc-nav", "webbook-menu", "webbook-settings", "webbook-info", "webbook-search"];
var POPOVER_CLOSE_LABELS = {
  "webbook-toc-nav": "Close table of contents",
  "webbook-menu": "Close go to page",
  "webbook-settings": "Close settings",
  "webbook-info": "Close about",
  "webbook-search": "Close search"
};
var CLOSE_SVG = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M5.293 5.293a1 1 0 0 1 1.414 0L12 10.586l5.293-5.293a1 1 0 1 1 1.414 1.414L13.414 12l5.293 5.293a1 1 0 0 1-1.414 1.414L12 13.414l-5.293 5.293a1 1 0 0 1-1.414-1.414L10.586 12 5.293 6.707a1 1 0 0 1 0-1.414Z"/></svg>';
function initPopoverActions() {
  for (const [id, label, popoverId, code] of [
    ["open-toc", "Table of contents", "webbook-toc-nav", "KeyC"],
    ["open-settings", "Settings", "webbook-settings", "KeyS"],
    ["open-goto-page", "Go to page", "webbook-menu", "KeyG"],
    ["open-search", "Search", "webbook-search", "KeyF"],
    ["open-about", "About this publication", "webbook-info", "KeyO"]
  ]) {
    const findsInContents = id === "open-search";
    registerAction({
      id,
      label: findsInContents ? "Search (in the table of contents: Find a section)" : label,
      group: "Panels",
      defaultKeys: [{ code, alt: true, shift: true }],
      ...findsInContents ? { inPanels: true } : {},
      isAvailable: () => typeof document.getElementById(popoverId)?.showPopover === "function" && (!findsInContents || tocFindAvailable() || !document.querySelector(".webbook:popover-open")),
      run: () => {
        if (findsInContents && focusTocFind()) return;
        const popover = document.getElementById(popoverId);
        openedByPointer.delete(popoverId);
        document.querySelector(`button[popovertarget="${popoverId}"]:not(.webbook-popover-close)`)?.focus({ preventScroll: true });
        popover.showPopover();
        if (popoverId !== "webbook-toc-nav") focusInitialPopoverControl(popover, popoverId);
      }
    });
  }
}
function initPopoverCloseButtons() {
  WEBBOOK_POPOVER_IDS.forEach((id) => {
    const popover = document.querySelector(`#${id}`);
    if (!popover || popover.querySelector(".webbook-popover-close")) return;
    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "webbook-popover-close";
    closeButton.title = "Close";
    closeButton.setAttribute("aria-label", POPOVER_CLOSE_LABELS[id] || "Close");
    closeButton.setAttribute("popovertarget", id);
    closeButton.setAttribute("popovertargetaction", "hide");
    closeButton.innerHTML = CLOSE_SVG;
    closeButton.addEventListener("click", () => popover.hidePopover?.());
    popover.prepend(closeButton);
  });
}
function focusInitialPopoverControl(popover, id) {
  const preferredSelectors = {
    "webbook-menu": "#goto-page",
    "webbook-search": "#webbook-search-input"
  };
  const preferredSelector = preferredSelectors[id];
  const preferred = preferredSelector ? popover.querySelector(preferredSelector) : null;
  const firstFocusable = preferred || popover.querySelector('a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
  if (firstFocusable) firstFocusable.focus();
}
function initTocInPageLinks() {
  const toc2 = document.querySelector("#webbook-toc-nav");
  if (!toc2) return;
  toc2.addEventListener("click", (e) => {
    const link = e.target instanceof Element ? e.target.closest("a[href]") : null;
    if (!link || link.closest(".webbook-popover-close")) return;
    let url;
    try {
      url = new URL(link.href, window.location.href);
    } catch {
      return;
    }
    const here = new URL(window.location.href);
    if (url.origin !== here.origin || url.pathname !== here.pathname) return;
    toc2.hidePopover?.();
    const target = url.hash ? document.getElementById(decodeURIComponent(url.hash.slice(1))) : null;
    if (!target) return;
    if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });
  });
}
function markCurrentTocEntry() {
  const { links: links2, current } = currentTocEntry();
  if (!current) return null;
  if (links2.find((link) => link.getAttribute("aria-current") === "page") !== current) {
    links2.forEach((link) => link.removeAttribute("aria-current"));
    current.setAttribute("aria-current", "page");
  }
  return current;
}
function currentTocEntry() {
  const links2 = Array.from(document.querySelectorAll("#webbook-cover-link, #webbook-toc-nav ol a[href]"));
  const here = pagePath(window.location.href);
  const pageLinks = links2.filter((link) => pagePath(link.href) === here);
  if (!pageLinks.length) return { links: links2, current: null };
  const isReached = readingPositionTest();
  let current = pageLinks.find((link) => !new URL(link.href).hash) ?? pageLinks[0];
  for (const link of pageLinks) {
    const id = decodeURIComponent(new URL(link.href).hash.slice(1));
    const target = id ? document.getElementById(id) : null;
    if (target && isReached(target)) current = link;
  }
  return { links: links2, current };
}
function pagePath(href) {
  try {
    return new URL(href, window.location.href).pathname.replace(/\/index\.html$/, "/");
  } catch {
    return "";
  }
}
function readingPositionTest() {
  const audio = pageAudio();
  const narrated = lastNarratedElement();
  if (narrated && (audio && !audio.paused || isOnScreen(narrated))) {
    return (target) => target === narrated || target.contains(narrated) || Boolean(target.compareDocumentPosition(narrated) & Node.DOCUMENT_POSITION_FOLLOWING);
  }
  const line = readingLine();
  return (target) => readingStart(target.getBoundingClientRect()) <= line;
}
function isOnScreen(elm) {
  const rect = elm.getBoundingClientRect();
  return readingEnd(rect) > 0 && readingStart(rect) < viewportLength();
}
var openedByPointer = /* @__PURE__ */ new Set();
function initPopoverToggleTracking() {
  document.addEventListener("pointerdown", (e) => {
    const button2 = e.target instanceof Element ? e.target.closest("button[popovertarget]:not(.webbook-popover-close)") : null;
    if (button2) openedByPointer.add(button2.getAttribute("popovertarget"));
  }, { capture: true });
  document.addEventListener("keydown", (e) => {
    const button2 = e.target instanceof Element ? e.target.closest("button[popovertarget]:not(.webbook-popover-close)") : null;
    if (button2 && (e.key === "Enter" || e.key === " ")) openedByPointer.delete(button2.getAttribute("popovertarget"));
  }, { capture: true });
  WEBBOOK_POPOVER_IDS.forEach((id) => {
    const popover = document.querySelector(`#${id}`);
    if (!popover) return;
    if (id === "webbook-toc-nav" || id === "webbook-info") {
      popover.addEventListener("beforetoggle", (e) => {
        if (e.newState === "open") markCurrentTocEntry();
      });
    }
    popover.addEventListener("toggle", (e) => {
      const btn = document.querySelector(`button[popovertarget="${id}"]:not(.webbook-popover-close)`);
      if (!btn) return;
      if (e.newState === "open") {
        btn.classList.add("open");
        if (id === "webbook-info") {
          const progressSection = document.querySelector("#webbook-progress");
          const current = Number(progressSection?.dataset.webbookPageNumber || 0);
          const total = Number(progressSection?.dataset.webbookPageCount || 0);
          const percentage = total > 0 ? Math.round(current / total * 100) : 0;
          const pageLabel = document.querySelector("#webbook-current-page-label");
          const progressBar = document.querySelector("#webbook-reading-progress");
          const countLabel = document.querySelector("#webbook-progress-count");
          if (pageLabel) {
            const title = pageLabel.textContent.trim() || document.title.split(" \u2013 ")[0];
            if (!title.startsWith("Section: ")) pageLabel.textContent = `Section: ${title}`;
          }
          if (progressBar) {
            progressBar.value = percentage;
            progressBar.textContent = `${percentage}%`;
            progressBar.setAttribute("aria-valuetext", `${percentage}%`);
          }
          if (countLabel) countLabel.textContent = `${percentage}%`;
          focusInitialPopoverControl(popover, id);
        } else {
          focusInitialPopoverControl(popover, id);
        }
      } else {
        btn.classList.remove("open");
        if (openedByPointer.delete(id) && document.activeElement === btn) btn.blur();
      }
    });
  });
}

// template/src/js/toolbar.js
var AUTO_HIDE_KEY = "webbook-toolbar-auto-hide";
function initToolbarAutoHide() {
  document.documentElement.classList.add("webbook-js");
  const toolbar = document.querySelector("#webbook-toolbar");
  const topToolbar = document.querySelector("#webbook-top-toolbar");
  const spineNav = document.querySelector("#webbook-spine-nav");
  let hideTimer;
  let autoHide = readSetting(AUTO_HIDE_KEY) !== "false";
  function showToolbar() {
    toolbar.classList.add("visible");
    topToolbar.classList.add("visible");
    spineNav.classList.add("visible");
    clearTimeout(hideTimer);
    if (!autoHide) return;
    hideTimer = setTimeout(() => {
      toolbar.classList.remove("visible");
      topToolbar.classList.remove("visible");
      spineNav.classList.remove("visible");
    }, 3e3);
  }
  if (typeof ResizeObserver === "function") {
    const observer3 = new ResizeObserver(() => {
      document.documentElement.style.setProperty("--webbook-toolbar-height", `${toolbar.offsetHeight}px`);
      document.documentElement.style.setProperty("--webbook-top-toolbar-height", `${topToolbar.offsetHeight}px`);
    });
    observer3.observe(toolbar);
    observer3.observe(topToolbar);
  }
  const toggle = buildAutoHideSetting();
  const setAutoHide = (enabled2) => {
    autoHide = enabled2;
    writeSetting(AUTO_HIDE_KEY, enabled2 ? "" : "false");
    if (toggle) toggle.checked = enabled2;
    showToolbar();
  };
  toggle?.addEventListener("change", () => setAutoHide(toggle.checked));
  if (toggle) toggle.checked = autoHide;
  registerAction({
    id: "toggle-toolbar-auto-hide",
    label: "Hide toolbars automatically, on or off",
    group: "Reading",
    run: () => {
      setAutoHide(!autoHide);
      announceReaderAction(`Hide toolbars automatically ${autoHide ? "on" : "off"}.`);
    }
  });
  showToolbar();
  ["mousemove", "touchstart", "keydown"].forEach((evt) => {
    document.addEventListener(evt, showToolbar, { passive: true });
  });
}
function buildAutoHideSetting() {
  const existing = document.getElementById("webbook-toolbar-auto-hide-toggle");
  if (existing) return existing;
  const fieldset = settingsSection("text");
  if (!fieldset) return null;
  const row = document.createElement("div");
  row.id = "webbook-toolbar-auto-hide";
  const label = document.createElement("label");
  label.htmlFor = "webbook-toolbar-auto-hide-toggle";
  label.textContent = "Hide toolbars automatically";
  const toggle = document.createElement("input");
  toggle.type = "checkbox";
  toggle.id = "webbook-toolbar-auto-hide-toggle";
  row.append(label, toggle);
  appendSetting("text", row);
  return toggle;
}

// template/src/js/current-print-page.js
var currentLabel = "";
var updateScheduled = false;
var button = null;
var labelElement = null;
var aboutLabelElement = null;
var icon = null;
var hasPrintPages = false;
function initCurrentPrintPage() {
  hasPrintPages = Boolean(document.querySelector("datalist#pages"));
  button = document.querySelector('button[popovertarget="webbook-menu"]');
  if (button) {
    icon = button.querySelector("svg");
    labelElement = document.createElement("span");
    labelElement.id = "webbook-current-print-page";
    labelElement.hidden = true;
    button.prepend(labelElement);
    button.addEventListener("click", clearPageInput);
  }
  if (hasPrintPages) {
    const progress = document.querySelector("#webbook-progress");
    const progressBar = progress?.querySelector("#webbook-reading-progress");
    if (progress && progressBar) {
      aboutLabelElement = document.createElement("p");
      aboutLabelElement.id = "webbook-about-print-page";
      aboutLabelElement.hidden = true;
      progressBar.before(aboutLabelElement);
    }
  }
  registerAction({
    id: "announce-print-page",
    label: "Announce print page",
    group: "Navigation",
    defaultKeys: [{ code: "KeyQ", alt: true, shift: true }],
    run: () => announceReaderAction(currentLabel ? `Print page ${currentLabel}.` : hasPrintPages ? "The current print page is not available." : "This book has no print page numbers.")
  });
  updateCurrentPrintPage();
  document.addEventListener("webbook:narrationpositionchange", updateCurrentPrintPage);
  document.addEventListener("webbook:pagechange", updateCurrentPrintPage);
  window.addEventListener("scroll", scheduleScrollUpdate, { passive: true });
}
function scheduleScrollUpdate() {
  const audio = pageAudio();
  if (audio && !audio.paused && !audio.ended) return;
  if (updateScheduled) return;
  updateScheduled = true;
  requestAnimationFrame(() => {
    updateScheduled = false;
    updateCurrentPrintPage();
  });
}
function updateCurrentPrintPage() {
  const main = document.querySelector("main");
  const pagebreaks = Array.from(main?.querySelectorAll('[role="doc-pagebreak"], .epubtype_pagebreak') ?? []);
  const isReached = readingPositionTest();
  let label = main?.dataset.webbookPrintPageBefore?.trim() ?? "";
  for (const pagebreak of pagebreaks) {
    if (isReached(pagebreak)) label = printPageLabel(pagebreak);
  }
  currentLabel = label;
  updateButton();
}
function printPageLabel(pagebreak) {
  const ariaLabel = pagebreak.getAttribute("aria-label")?.trim() ?? "";
  const text = pagebreak.textContent?.trim() ?? "";
  return (ariaLabel || text).replace(/^Page\s+/i, "");
}
function updateButton() {
  if (aboutLabelElement) {
    aboutLabelElement.textContent = currentLabel ? `Print page ${currentLabel}` : "";
    aboutLabelElement.hidden = !currentLabel;
  }
  if (!button || !labelElement) return;
  if (currentLabel) {
    labelElement.textContent = `Page ${currentLabel}`;
    labelElement.hidden = false;
    if (icon) icon.hidden = true;
    button.title = `Print page ${currentLabel}; go to page`;
    button.setAttribute("aria-label", `Print page ${currentLabel}, go to page`);
  } else {
    labelElement.textContent = "";
    labelElement.hidden = true;
    if (icon) icon.hidden = false;
    button.title = "Go to page";
    button.setAttribute("aria-label", "Go to page");
  }
}
function clearPageInput() {
  const input = document.querySelector("#goto-page");
  if (input) input.value = "";
}
function currentPrintPageLabel() {
  return currentLabel;
}

// template/src/js/agent-tools.js
var STORAGE_KEY = "webbook-agent-tools";
var controller = null;
var settingToggle = null;
var objectSchema = (properties) => ({ type: "object", properties, additionalProperties: false });
var enumSchema = (values) => ({ type: "string", enum: values });
var result = (message, fields = {}) => ({ message, ...fields });
var error = (message) => ({ error: true, message });
function modelContext() {
  return document.modelContext || navigator.modelContext || null;
}
function enabled() {
  try {
    return localStorage.getItem(STORAGE_KEY) !== "false";
  } catch {
    return true;
  }
}
function pageTitle() {
  return document.querySelector("main h1, main h2, main h3")?.textContent?.trim() || document.title.split(" \u2013 ")[0].trim();
}
function chapterTitle() {
  return currentTocEntry().current?.textContent?.trim() || pageTitle();
}
function settingState() {
  const value = (selector) => document.querySelector(selector)?.value;
  const checked = (selector) => Boolean(document.querySelector(selector)?.checked);
  return {
    speed: Number(value("#webbook-rate-range") || 100),
    textSize: Number(value("#webbook-font-size-range") || 100),
    captionMode: checked("#webbook-caption-mode-toggle"),
    skipPageNumbers: checked("#webbook-skip-pagebreak-toggle"),
    skipFootnotes: checked("#webbook-skip-footnote-toggle"),
    skipSidebars: checked("#webbook-skip-sidebar-toggle")
  };
}
function readerStatus() {
  const audio = pageAudio();
  const timeline = bookTimelineStatus();
  const options = settingState();
  const title = document.title.split(" \u2013 ").at(-1)?.trim() || document.title;
  const status = {
    bookTitle: title,
    page: pageTitle(),
    chapter: chapterTitle(),
    printPage: currentPrintPageLabel() || null,
    narration: audio ? audio.paused || audio.ended ? "paused" : "playing" : "unavailable",
    pageTime: audio ? audio.currentTime : null,
    bookTime: timeline?.time ?? null,
    bookTimeLeft: timeline?.timeLeft ?? null,
    ...options
  };
  return result(`${status.narration === "playing" ? "Narration playing" : status.narration === "paused" ? "Narration paused" : "No narration"} at ${status.chapter}.`, status);
}
function tocItems() {
  const walk = (list2) => Array.from(list2?.children || []).filter((item) => item.matches("li")).map((item) => {
    const link = item.querySelector(":scope > a[href]");
    const nested = item.querySelector(":scope > ol");
    return link ? { id: link.getAttribute("href"), title: link.textContent.trim(), children: walk(nested) } : null;
  }).filter(Boolean);
  return walk(document.querySelector("#webbook-toc-nav > ol"));
}
function flatToc(items = tocItems()) {
  const flatten = (items2) => items2.flatMap((item) => [item, ...flatten(item.children || [])]);
  return flatten(items);
}
function actionState() {
  const audio = pageAudio();
  return {
    page: pageTitle(),
    chapter: chapterTitle(),
    narration: audio ? audio.paused || audio.ended ? "paused" : "playing" : "unavailable",
    speed: Number(document.querySelector("#webbook-rate-range")?.value || 100),
    textSize: Number(document.querySelector("#webbook-font-size-range")?.value || 100)
  };
}
async function focusDestination(href, title) {
  await navigateTo(href, { moveFocus: true });
  const message = `Moved to ${title}.`;
  announceReaderAction(message);
  return result(message, { target: href, title, state: actionState() });
}
function chapterTocItems() {
  const top = tocItems();
  return top.length >= 2 ? top : top[0]?.children?.length ? top[0].children : top;
}
function itemContainsHref(item, href) {
  const absolute = (value) => new URL(value, window.location.href).href;
  return absolute(item.id) === href || item.children?.some((child) => itemContainsHref(child, href));
}
async function goTo(input) {
  if (input.section) {
    const wanted = String(input.section).trim().toLocaleLowerCase();
    const item = flatToc().find((item2) => item2.id === input.section || item2.title.toLocaleLowerCase() === wanted) || flatToc().find((item2) => item2.title.toLocaleLowerCase().includes(wanted));
    if (item) {
      return focusDestination(item.id, item.title);
    }
    const rawTarget = String(input.section);
    let target;
    try {
      target = new URL(rawTarget, window.location.href);
    } catch {
    }
    const here = new URL(window.location.href);
    if ((rawTarget.includes("#") || /(?:\.html?|\/$)/i.test(target?.pathname || "")) && target?.origin === here.origin && target.pathname.slice(0, target.pathname.lastIndexOf("/")) === here.pathname.slice(0, here.pathname.lastIndexOf("/"))) {
      return focusDestination(target.href, "the search result");
    }
    return error(`No section matched \u201C${input.section}\u201D.`);
  }
  if (input.print_page !== void 0) {
    const wanted = String(input.print_page).trim().toLocaleLowerCase();
    const option = Array.from(document.querySelectorAll("#pages option")).find((option2) => option2.value.trim().toLocaleLowerCase() === wanted || option2.label.trim().toLocaleLowerCase() === wanted);
    if (!option?.dataset.href) return error(`Print page ${input.print_page} is not available.`);
    const label = `print page ${input.print_page}`;
    const moved = await focusDestination(option.dataset.href, label);
    return { ...moved, printPage: String(input.print_page) };
  }
  if (input.book_time !== void 0) {
    if (!bookTimelineStatus()) return error("Book time is not available for this book.");
    const destination = bookTimeDestination(Number(input.book_time));
    await seekBookTime(Number(input.book_time), false);
    if (!runAction("go-to-narration")) {
      await new Promise((resolve) => document.addEventListener("webbook:playerready", resolve, { once: true }));
      runAction("go-to-narration");
    }
    const message = `Moved to ${destination?.title || `${Math.round(Number(input.book_time))} seconds in the book`}.`;
    announceReaderAction(message);
    return result(message, { bookTime: Number(input.book_time), state: actionState() });
  }
  const actions = { next_page: "next-page", previous_page: "previous-page" };
  if (actions[input.direction]) {
    const link = adjacentPageLink(input.direction === "next_page" ? 1 : -1);
    if (!link) return error(`There is no ${input.direction === "next_page" ? "next" : "previous"} page.`);
    const title = link.textContent.trim() || `${input.direction === "next_page" ? "next" : "previous"} page`;
    return focusDestination(link.href, title);
  }
  if (input.direction === "next_chapter" || input.direction === "previous_chapter") {
    const items = chapterTocItems();
    const current = currentTocEntry().current;
    const index = items.findIndex((item) => current && itemContainsHref(item, current.href));
    const target = items[index + (input.direction === "next_chapter" ? 1 : -1)];
    if (!target) return error(`There is no ${input.direction === "next_chapter" ? "next" : "previous"} chapter.`);
    return focusDestination(target.id, target.title);
  }
  return error("Choose a section, print page, book time, or direction.");
}
function runReaderAction(id) {
  const action = getActions().find((candidate) => candidate.id === id);
  if (!action?.isAvailable()) return error(`${action?.label || id} is not available here.`);
  runAction(id);
  announceReaderAction(`${action.label}.`);
  return result(`${action.label}.`, { action: id, state: actionState() });
}
function narration(input) {
  const audio = pageAudio();
  if (input.action === "play" || input.action === "pause") {
    if (!audio) return error("Narration is not available on this page.");
    const shouldPlay = input.action === "play";
    if (shouldPlay === !audio.paused) return result(`Narration is already ${shouldPlay ? "playing" : "paused"}.`);
    const action = getActions().find((candidate) => candidate.id === "play-pause");
    if (!action?.isAvailable()) return error("Narration is not available on this page.");
    runAction("play-pause");
    const message = shouldPlay ? "Playing." : "Paused.";
    announceReaderAction(message);
    return result(message, { action: input.action, state: actionState() });
  }
  return runReaderAction({
    play_from_here: "play-from-here",
    next_phrase: "next-phrase",
    previous_phrase: "previous-phrase",
    skip_past: "skip-past"
  }[input.action]);
}
var OPTION_CONTROLS = {
  speed: ["#webbook-rate-range", "input", 50, 200],
  text_size: ["#webbook-font-size-range", "input", 50, 200],
  caption_mode: ["#webbook-caption-mode-toggle", "change"],
  skip_page_numbers: ["#webbook-skip-pagebreak-toggle", "change"],
  skip_footnotes: ["#webbook-skip-footnote-toggle", "change"],
  // One setting for all notes; both names reach it
  skip_notes: ["#webbook-skip-footnote-toggle", "change"],
  skip_sidebars: ["#webbook-skip-sidebar-toggle", "change"]
};
function setReadingOption(input) {
  const config = OPTION_CONTROLS[input.option];
  const control = config && document.querySelector(config[0]);
  if (!control) return error(`${input.option} is not available.`);
  if (control.type === "checkbox") control.checked = Boolean(input.value);
  else {
    const value = Number(input.value);
    if (!Number.isFinite(value) || value < config[2] || value > config[3]) return error(`${input.option} must be between ${config[2]} and ${config[3]}.`);
    control.value = String(value);
  }
  control.dispatchEvent(new Event(config[1], { bubbles: true }));
  const shown = control.type === "checkbox" ? control.checked ? "on" : "off" : `${control.value} percent`;
  const label = document.querySelector(`label[for="${control.id}"]`)?.textContent?.trim() || input.option;
  announceReaderAction(`${label} ${shown}.`);
  return result(`${label} ${shown}.`, { option: input.option, value: control.type === "checkbox" ? control.checked : Number(control.value), state: actionState() });
}
async function search(input) {
  const { searchBook, describeSearchResult } = await import("./chunk-VKFVGLPJ.js");
  const matches = await searchBook(String(input.query || ""));
  if (matches === null) return error("Search isn't available for this book.");
  const results = matches.slice(0, 5).map(describeSearchResult).filter(Boolean);
  return result(`${results.length} results for \u201C${input.query}\u201D.`, { results });
}
function visibleText(root) {
  if (!root) return "";
  const clone = root.cloneNode(true);
  clone.querySelectorAll?.("address, article, aside, blockquote, br, caption, dd, div, dl, dt, figcaption, figure, footer, h1, h2, h3, h4, h5, h6, header, hr, li, main, nav, ol, p, pre, section, table, td, th, tr, ul").forEach((element) => element.after(" "));
  return clone.textContent?.replace(/\s+/g, " ").trim() || "";
}
function textForCurrentSection() {
  const main = document.querySelector("main");
  const current = currentTocEntry().current;
  const currentUrl = current ? new URL(current.href, window.location.href) : null;
  const id = currentUrl?.hash ? decodeURIComponent(currentUrl.hash.slice(1)) : "";
  const target = id && document.getElementById(id) || main;
  if (!target) return "";
  if (target === main) return visibleText(main);
  if (target.matches("section, article")) return visibleText(target);
  const entries = flatToc();
  const currentIndex = entries.findIndex((item) => current && new URL(item.id, window.location.href).href === current.href);
  const nextTarget = entries.slice(currentIndex + 1).map((item) => {
    const url = new URL(item.id, window.location.href);
    if (url.pathname !== window.location.pathname || !url.hash) return null;
    return document.getElementById(decodeURIComponent(url.hash.slice(1)));
  }).find((candidate) => candidate && target.compareDocumentPosition(candidate) & Node.DOCUMENT_POSITION_FOLLOWING);
  const range = document.createRange();
  range.setStartBefore(target);
  if (nextTarget) range.setEndBefore(nextTarget);
  else range.setEndAfter(main.lastChild || target);
  return visibleText(range.cloneContents());
}
function readText(input) {
  let root;
  if (input.scope === "current_phrase") root = lastNarratedElement();
  else if (input.scope !== "current_section") root = document.querySelector("main");
  const maximum = Math.max(100, Math.min(2e4, Number(input.max_characters) || 2e3));
  const full = input.scope === "current_section" ? textForCurrentSection() : visibleText(root);
  if (!full) return error(`${input.scope.replace("_", " ")} is not available.`);
  const text = full.length > maximum ? `${full.slice(0, maximum)}\u2026` : full;
  return result(`Read ${text.length} characters from the ${input.scope.replace("_", " ")}.`, { text, truncated: full.length > maximum });
}
function definitions() {
  return [
    { name: "reader_status", title: "Reader status", description: "Use only when the reader asks where they are or asks for playback or setting status. Do not call this before another action.", inputSchema: objectSchema({}), annotations: { readOnlyHint: true, untrustedContentHint: true }, execute: readerStatus },
    { name: "list_contents", title: "List contents", description: "Use when the reader asks what chapters or sections exist, or before go_to when their destination is unclear. Do not call for a named chapter that go_to can match directly.", inputSchema: objectSchema({}), annotations: { readOnlyHint: true, untrustedContentHint: true }, execute: () => result("Table of contents.", { contents: tocItems() }) },
    { name: "go_to", title: "Go to a place", description: "Call directly for requests to go, move, or jump somewhere. Accepts a section title or id, search_book target, print page, book seconds, or next/previous page or chapter. Do not call reader_status first.", inputSchema: { ...objectSchema({ section: { type: "string" }, print_page: { type: ["string", "number"] }, book_time: { type: "number", minimum: 0 }, direction: enumSchema(["next_page", "previous_page", "next_chapter", "previous_chapter"]) }), oneOf: [{ required: ["section"] }, { required: ["print_page"] }, { required: ["book_time"] }, { required: ["direction"] }] }, execute: goTo },
    { name: "narration", title: "Control narration", description: "Call directly for play, pause, play from here, next or previous phrase, or skip past. For \u201Cpause,\u201D use action pause immediately; do not inspect status first.", inputSchema: { ...objectSchema({ action: enumSchema(["play", "pause", "play_from_here", "next_phrase", "previous_phrase", "skip_past"]) }), required: ["action"] }, execute: narration },
    { name: "set_reading_option", title: "Set a reading option", description: "Call directly to change speed, text size, caption mode, or skipped content. Do not inspect status first; the result includes the new value and state.", inputSchema: { ...objectSchema({ option: enumSchema(Object.keys(OPTION_CONTROLS)), value: { type: ["boolean", "number"] } }), required: ["option", "value"] }, execute: setReadingOption },
    { name: "search_book", title: "Search book", description: "Use to find where the book discusses a word, phrase, or topic. Returns up to five concise results whose target can be passed to go_to.", inputSchema: { ...objectSchema({ query: { type: "string", minLength: 1 } }), required: ["query"] }, annotations: { readOnlyHint: true, untrustedContentHint: true }, execute: search },
    { name: "read_text", title: "Read book text", description: "Use when answering a question about the current phrase, section, or page. Prefer the smallest sufficient scope; defaults to at most 2,000 characters.", inputSchema: { ...objectSchema({ scope: enumSchema(["current_phrase", "current_section", "current_page"]), max_characters: { type: "number", minimum: 100, maximum: 2e4 } }), required: ["scope"] }, annotations: { readOnlyHint: true, untrustedContentHint: true }, execute: readText }
  ].map((definition) => ({ outputSchema: { type: "object" }, ...definition }));
}
async function registerTools() {
  const context = modelContext();
  if (!context?.registerTool || !enabled() || controller) return;
  controller = new AbortController();
  try {
    await Promise.all(definitions().map((tool) => context.registerTool(tool, { signal: controller.signal })));
  } catch {
    controller.abort();
    controller = null;
  }
}
function unregisterTools() {
  controller?.abort();
  controller = null;
}
function createSetting() {
  if (!modelContext()?.registerTool) return;
  const fieldset = settingsSection("all");
  if (!fieldset || document.getElementById("webbook-agent-tools-toggle")) return;
  const row = document.createElement("div");
  row.className = "webbook-agent-tools-row";
  const label = document.createElement("label");
  label.htmlFor = "webbook-agent-tools-toggle";
  label.textContent = "Let AI assistants in this browser control the reader";
  settingToggle = document.createElement("input");
  settingToggle.type = "checkbox";
  settingToggle.id = "webbook-agent-tools-toggle";
  settingToggle.checked = enabled();
  settingToggle.addEventListener("change", () => {
    try {
      localStorage.setItem(STORAGE_KEY, String(settingToggle.checked));
    } catch {
    }
    if (settingToggle.checked) registerTools();
    else unregisterTools();
  });
  row.append(label, settingToggle);
  appendSetting("all", row);
}
function initAgentTools() {
  if (!modelContext()?.registerTool) return;
  createSetting();
  registerTools();
}

// template/src/js/browser-bookmarks.js
var SCROLL_DELAY = 300;
var PLACEMENT_SETTLE_DELAY = 350;
var TRACK_FALLBACK_DELAY = 5e3;
var scrollTimer = null;
var placementTimer = null;
var placingReader = true;
var playerReadyDuringPlacement = false;
function pageCues() {
  const audio = pageAudio();
  const track = audio?.textTracks?.[0] || audio?.querySelector("track")?.track;
  return Array.from(track?.cues || []);
}
function cueAtReadingLine() {
  const line = readingLine();
  let reached = null;
  for (const cue of pageCues()) {
    const elm = elmForCue(cue);
    if (!elm) continue;
    const rect = elm.getBoundingClientRect();
    if (readingStart(rect) <= line) reached = { cue, elm };
    if (readingStart(rect) <= line && readingEnd(rect) > line) return { cue, elm };
    if (readingStart(rect) > line) break;
  }
  return reached;
}
function hasLayoutBox(elm) {
  return typeof elm.getClientRects !== "function" || elm.getClientRects().length > 0;
}
function isReaderUiId(elm) {
  return elm.id.startsWith("webbook-") || elm.matches(".webbook[id]");
}
function structureAtReadingLine() {
  const main = document.querySelector("main");
  if (!main) return null;
  const line = readingLine();
  let reached = null;
  for (const elm of main.querySelectorAll("[id]")) {
    if (elm.closest('[hidden], [aria-hidden="true"]') || isReaderUiId(elm) || !hasLayoutBox(elm)) continue;
    if (readingStart(elm.getBoundingClientRect()) <= line) reached = elm;
    else break;
  }
  return reached;
}
function updateFromReadingLine() {
  if (placingReader) return false;
  const audio = pageAudio();
  if (audio && (!audio.paused && !audio.ended || pausedForSound())) return false;
  const narrated = cueAtReadingLine();
  if (narrated) return syncPositionUrl(
    narrated.elm,
    cueNeedsTime(narrated.cue, narrated.elm) ? narrated.cue.startTime : void 0
  );
  const structure = structureAtReadingLine();
  return structure ? syncPositionUrl(structure) : false;
}
function updateFromFocus(target) {
  if (placingReader || !(target instanceof Element) || !document.querySelector("main")?.contains(target)) return false;
  const cue = cueForElement(pageCues(), target);
  const narrated = cue && { cue, elm: elmForCue(cue) };
  if (narrated) return syncPositionUrl(
    narrated.elm,
    cueNeedsTime(narrated.cue, narrated.elm) ? narrated.cue.startTime : void 0
  );
  else {
    if (pageHasNarration() && !pageCues().length) return false;
    const anchor = positionAnchor(target);
    return anchor ? syncPositionUrl(anchor) : false;
  }
}
function pageHasNarration() {
  const audio = pageAudio();
  return Boolean(audio?.querySelector("track") && (audio.getAttribute("src") || audio.querySelector("source[src]")));
}
function releasePlacementAfter(delay) {
  clearTimeout(placementTimer);
  placementTimer = setTimeout(() => {
    placingReader = false;
    placementTimer = null;
  }, delay);
}
function holdPlacement() {
  placingReader = true;
  playerReadyDuringPlacement = false;
  clearTimeout(placementTimer);
  placementTimer = null;
  clearTimeout(scrollTimer);
}
function finishPlacementForPage() {
  if (playerReadyDuringPlacement || pageCues().length) releasePlacementAfter(PLACEMENT_SETTLE_DELAY);
  else if (pageHasNarration()) releasePlacementAfter(TRACK_FALLBACK_DELAY);
  else releasePlacementAfter(PLACEMENT_SETTLE_DELAY);
}
async function copyPositionLink() {
  const active = document.activeElement;
  if (active && active !== document.body && document.querySelector("main")?.contains(active)) updateFromFocus(active);
  else updateFromReadingLine();
  try {
    await navigator.clipboard.writeText(window.location.href);
    announceReaderAction("Link copied");
  } catch {
    announceReaderAction("Could not copy the link");
  }
}
function initBrowserBookmarks() {
  window.addEventListener("scroll", () => {
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(updateFromReadingLine, SCROLL_DELAY);
  }, { passive: true });
  document.addEventListener("focusin", (event) => updateFromFocus(event.target));
  document.addEventListener("webbook:pageplacing", holdPlacement);
  document.addEventListener("webbook:playerready", () => {
    playerReadyDuringPlacement = true;
    if (placingReader) releasePlacementAfter(PLACEMENT_SETTLE_DELAY);
  });
  document.addEventListener("webbook:pagechange", finishPlacementForPage);
  finishPlacementForPage();
  registerAction({
    id: "copy-position-link",
    label: "Copy link to this place",
    group: "Navigation",
    defaultKeys: [],
    run: copyPositionLink,
    isAvailable: () => Boolean(navigator.clipboard?.writeText)
  });
}

// template/src/js/responsive-tables.js
function updateWrapper(wrapper) {
  if (!wrapper.isConnected || wrapper.clientWidth === 0) return;
  const scrolls = wrapper.scrollWidth > wrapper.clientWidth + 1;
  if (wrapper.hasAttribute("aria-label")) {
    wrapper.dataset.webbookLabel ??= wrapper.getAttribute("aria-label");
  }
  if (wrapper.hasAttribute("aria-labelledby")) {
    wrapper.dataset.webbookLabelledby ??= wrapper.getAttribute("aria-labelledby");
  }
  if (scrolls) {
    wrapper.setAttribute("role", "region");
    wrapper.setAttribute("tabindex", "0");
    if (wrapper.dataset.webbookLabel) wrapper.setAttribute("aria-label", wrapper.dataset.webbookLabel);
    if (wrapper.dataset.webbookLabelledby) wrapper.setAttribute("aria-labelledby", wrapper.dataset.webbookLabelledby);
  } else {
    wrapper.removeAttribute("role");
    wrapper.removeAttribute("tabindex");
    wrapper.removeAttribute("aria-label");
    wrapper.removeAttribute("aria-labelledby");
  }
}
function updateResponsiveTables() {
  document.querySelectorAll(".webbook-table-scroll").forEach(updateWrapper);
}
var observer = null;
function observeTables() {
  observer?.disconnect();
  if (typeof ResizeObserver !== "function") return;
  observer = new ResizeObserver((entries) => {
    const wrappers = new Set(entries.map((entry) => entry.target.matches(".webbook-table-scroll") ? entry.target : entry.target.closest(".webbook-table-scroll")));
    wrappers.forEach((wrapper) => {
      if (wrapper) updateWrapper(wrapper);
    });
  });
  document.querySelectorAll(".webbook-table-scroll, .webbook-table-scroll > table").forEach((elm) => observer.observe(elm));
}
function refresh() {
  observeTables();
  window.requestAnimationFrame?.(updateResponsiveTables) ?? updateResponsiveTables();
}
function initResponsiveTables() {
  refresh();
  window.addEventListener("resize", updateResponsiveTables);
  document.addEventListener("webbook:layoutchange", updateResponsiveTables);
  document.addEventListener("webbook:pagechange", refresh);
}

// template/src/js/skip-link.js
function initSkipLink() {
  const link = document.getElementById("webbook-skip-link");
  if (!link) return;
  link.addEventListener("click", (e) => {
    const main = document.querySelector("main");
    if (!main) return;
    e.preventDefault();
    const audio = pageAudio();
    const playing = audio && !audio.paused && !audio.ended;
    const target = playing && lastNarratedElement() || cueAtReadingLine()?.elm || structureAtReadingLine() || main;
    if (!target.matches("a[href], button, input, select, textarea, [tabindex]")) target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });
  });
}

// template/src/js/copy-math.js
var COPY_MATH_FORMAT_KEY = "webbook-copy-math-format";
var converter = null;
var loading = null;
function copyMathFormat() {
  return readSetting(COPY_MATH_FORMAT_KEY) === "latex" ? "latex" : "mathml";
}
function loadMathConverter() {
  return loading ??= import("./chunk-F443KPQR.js").then((module) => {
    converter = (mathml) => module.MathMLToLaTeX.convert(mathml);
    return converter;
  }).catch((error2) => {
    loading = null;
    throw error2;
  });
}
function mathAtNode(node) {
  const element = node?.nodeType === 1 ? node : node?.parentElement;
  return element?.closest("math") ?? null;
}
function cleanCopyMarkup(root) {
  root.querySelectorAll("[data-webbook-copy-control]").forEach((element) => element.remove());
  const elements = root.nodeType === 1 ? [root, ...root.querySelectorAll("*")] : root.querySelectorAll("*");
  for (const element of elements) {
    for (const attribute of Array.from(element.attributes)) {
      if (attribute.name === "tabindex" || attribute.name.startsWith("data-webbook-")) element.removeAttribute(attribute.name);
    }
    const classes = Array.from(element.classList).filter((name) => !name.startsWith("webbook-"));
    if (classes.length) element.setAttribute("class", classes.join(" "));
    else element.removeAttribute("class");
    if (element.localName === "math" && !element.getAttribute("alttext")?.trim()) element.removeAttribute("alttext");
  }
  return root;
}
function mathMLSource(math) {
  const clone = cleanCopyMarkup(math.cloneNode(true));
  const Serializer = math.ownerDocument.defaultView.XMLSerializer;
  return new Serializer().serializeToString(clone);
}
function mathMLForConversion(math) {
  const clone = math.cloneNode(true);
  for (const fence of clone.querySelectorAll("mfenced")) {
    for (const side of ["open", "close"]) {
      if (fence.hasAttribute(side) && fence.getAttribute(side) === "") fence.setAttribute(side, ".");
    }
  }
  return mathMLSource(clone);
}
function readyMathText(math, format = copyMathFormat(), convert = converter) {
  const source = () => ({ text: mathMLSource(math), format: "MathML" });
  if (format === "mathml") return source();
  const annotation = Array.from(math.querySelectorAll("annotation")).find((element) => element.getAttribute("encoding")?.toLowerCase() === "application/x-tex" && element.textContent.trim());
  const supplied = annotation?.textContent.trim() || math.getAttribute("alttext")?.trim();
  if (supplied) return { text: supplied, format: "LaTeX" };
  if (!convert) return null;
  try {
    const text = convert(mathMLForConversion(math));
    if (typeof text === "string" && text.trim()) return { text: text.trim(), format: "LaTeX" };
  } catch {
  }
  return source();
}
async function mathPlainText(math, format = copyMathFormat(), convert) {
  const ready = readyMathText(math, format, convert);
  if (ready) return ready;
  try {
    return readyMathText(math, format, await loadMathConverter());
  } catch {
    return { text: mathMLSource(math), format: "MathML" };
  }
}
function mathSelectionFragment(range) {
  if (!range || range.collapsed) return null;
  const expanded = range.cloneRange();
  const start = mathAtNode(expanded.startContainer);
  const end = mathAtNode(expanded.endContainer);
  if (start) expanded.setStartBefore(start);
  if (end) expanded.setEndAfter(end);
  const fragment = cleanCopyMarkup(expanded.cloneContents());
  return fragment.querySelector("math") ? fragment : null;
}
function selectionHTML(fragment) {
  const container = fragment.ownerDocument.createElement("div");
  container.append(fragment.cloneNode(true));
  for (const math of container.querySelectorAll("math")) math.setAttribute("xmlns", "http://www.w3.org/1998/Math/MathML");
  return container.innerHTML;
}
function selectionText(fragment, results) {
  const plain = fragment.cloneNode(true);
  Array.from(plain.querySelectorAll("math")).forEach((math, index) => {
    const result2 = results[index];
    const text2 = result2.format === "LaTeX" ? `$${result2.text.replace(/^\$\$?([\s\S]*?)\$\$?$/, "$1")}$` : result2.text;
    math.replaceWith(plain.ownerDocument.createTextNode(text2));
  });
  const text = (node) => {
    if (node.nodeType === 3) return node.textContent;
    if (node.nodeName === "BR") return "\n";
    const content = Array.from(node.childNodes, text).join("");
    return /^(P|DIV|PRE|LI|H[1-6]|TR)$/.test(node.nodeName) ? content + "\n" : content;
  };
  return text(plain).replace(/\n$/, "");
}
function readySelectionPayload(fragment, format = copyMathFormat()) {
  const results = Array.from(fragment.querySelectorAll("math"), (math) => readyMathText(math, format));
  if (results.some((result2) => !result2)) return null;
  return {
    html: selectionHTML(fragment),
    plain: selectionText(fragment, results),
    fallback: results.some((result2) => result2.format === "MathML") && format !== "mathml"
  };
}
async function selectionPayload(fragment, format = copyMathFormat()) {
  const results = await Promise.all(Array.from(fragment.querySelectorAll("math"), (math) => mathPlainText(math, format)));
  return {
    html: selectionHTML(fragment),
    plain: selectionText(fragment, results),
    fallback: results.some((result2) => result2.format === "MathML") && format !== "mathml"
  };
}

// template/src/js/copy-content.js
var initialized = /* @__PURE__ */ new WeakSet();
function clipboardAvailable() {
  return Boolean(window.isSecureContext && (navigator.clipboard?.writeText || navigator.clipboard?.write));
}
function selectedRange() {
  const selection = window.getSelection();
  if (!selection?.rangeCount) return null;
  const range = selection.getRangeAt(0);
  const main = document.querySelector("main");
  return main?.contains(range.startContainer) && main.contains(range.endContainer) ? range.cloneRange() : null;
}
function codeHere(range = selectedRange(), focus = document.activeElement) {
  const start = range?.startContainer;
  const element = start?.nodeType === 1 ? start : start?.parentElement;
  return element?.closest("pre") ?? focus?.closest("pre") ?? null;
}
function equationHere(range = selectedRange(), focus = document.activeElement, narrated = lastNarratedElement()) {
  const start = range?.startContainer;
  const atStart = mathAtNode(start) || (start?.nodeType === 1 ? mathAtNode(start.childNodes[range.startOffset]) : null);
  if (atStart && document.querySelector("main")?.contains(atStart)) return { math: atStart, count: 1 };
  const focused = mathAtNode(focus);
  if (focused && document.querySelector("main")?.contains(focused)) return { math: focused, count: 1 };
  const equations = narrated?.matches("math") ? [narrated] : Array.from(narrated?.querySelectorAll("math") ?? []);
  return { math: equations[0] ?? null, count: equations.length };
}
function writeRichClipboard(html, plain) {
  const Item = window.ClipboardItem;
  if (Item && navigator.clipboard?.write) {
    return navigator.clipboard.write([new Item({
      "text/html": new Blob([html], { type: "text/html" }),
      "text/plain": Promise.resolve(plain).then((text) => new Blob([text], { type: "text/plain" }))
    })]);
  }
  return Promise.resolve(plain).then((text) => navigator.clipboard.writeText(text));
}
async function copyEquation(target = equationHere()) {
  if (!target.math) {
    announceReaderAction("No equation here.");
    return;
  }
  const math = target.math.cloneNode(true);
  const plain = mathPlainText(math);
  try {
    await writeRichClipboard(mathMLSource(math), plain.then((result3) => result3.text));
    const result2 = await plain;
    const first = target.count > 1 ? `. Copied the first of ${target.count} equations in the narrated phrase` : "";
    announceReaderAction(`Equation copied as ${result2.format}${first}`);
  } catch {
    announceReaderAction("Could not copy the equation. Check clipboard permission and try again.");
  }
}
async function copyCode(pre) {
  if (!pre) {
    announceReaderAction("No code block here.");
    return;
  }
  try {
    const text = pre.textContent;
    if (navigator.clipboard.writeText) await navigator.clipboard.writeText(text);
    else await navigator.clipboard.write([new window.ClipboardItem({ "text/plain": new Blob([text], { type: "text/plain" }) })]);
    announceReaderAction("Code copied");
  } catch {
    announceReaderAction("Could not copy the code. Check clipboard permission and try again.");
  }
}
async function copySelection(range = selectedRange()) {
  if (!range || range.collapsed) {
    announceReaderAction("No selection.");
    return;
  }
  const fragment = mathSelectionFragment(range);
  const payload = fragment ? selectionPayload(fragment) : Promise.resolve({
    html: selectionHTML(cleanCopyMarkup(range.cloneContents())),
    plain: range.toString()
  });
  try {
    const html = fragment ? selectionHTML(fragment) : selectionHTML(cleanCopyMarkup(range.cloneContents()));
    await writeRichClipboard(html, payload.then((result3) => result3.plain));
    const result2 = await payload;
    announceReaderAction(result2.fallback ? "Selection copied. Some equations were copied as MathML." : "Selection copied");
  } catch {
    announceReaderAction("Could not copy the selection. Check clipboard permission and try again.");
  }
}
function handleMathCopy(event) {
  if (event.defaultPrevented || !clipboardAvailable() || event.target?.closest?.('input, textarea, [contenteditable="true"]')) return;
  const fragment = mathSelectionFragment(selectedRange());
  if (!fragment) return;
  event.preventDefault();
  const ready = readySelectionPayload(fragment);
  if (ready && event.clipboardData) {
    event.clipboardData.setData("text/html", ready.html);
    event.clipboardData.setData("text/plain", ready.plain);
    announceReaderAction(ready.fallback ? "Selection copied. Some equations were copied as MathML." : "Selection copied");
    return;
  }
  const fallback = readySelectionPayload(fragment, "mathml");
  if (event.clipboardData) {
    event.clipboardData.setData("text/html", fallback.html);
    event.clipboardData.setData("text/plain", fallback.plain);
  }
  const payload = selectionPayload(fragment);
  writeRichClipboard(fallback.html, payload.then((result2) => result2.plain)).then(async () => {
    const result2 = await payload;
    announceReaderAction(result2.fallback ? "Selection copied. Some equations were copied as MathML." : "Selection copied");
  }).catch(() => announceReaderAction(event.clipboardData ? "Selection copied as MathML. Clipboard permission is needed to copy it as LaTeX." : "Could not copy the selection. Check clipboard permission and try again."));
}
function equationButtonName(math) {
  const host = math.closest(".webbook-equation, .disp-formula, figure, .equation");
  const label = host?.querySelector(".webbook-equation-number, .label, .eqno, .equation-number, figcaption")?.textContent.trim();
  return label && label.length < 80 ? `Copy equation ${label.replace(/^\((.*)\)$/, "$1")}` : "Copy equation";
}
function isDisplayEquation(math) {
  if (math.getAttribute("display") === "block" || math.closest(".webbook-equation, .disp-formula")) return true;
  const block = math.closest("p, div, figure, li, td, main");
  if (!block || block.querySelectorAll("math").length !== 1) return false;
  const clone = block.cloneNode(true);
  clone.querySelectorAll("math, [data-webbook-copy-control]").forEach((element) => element.remove());
  return !clone.textContent.trim() && !clone.querySelector("img, svg, video, audio, pre");
}
function buildSetting() {
  if (document.getElementById("webbook-copy-math-options")) return;
  const row = document.createElement("div");
  row.id = "webbook-copy-math";
  const label = document.createElement("label");
  label.htmlFor = "webbook-copy-math-options";
  label.textContent = "Copy equations as";
  const select = document.createElement("select");
  select.id = label.htmlFor;
  select.append(optionElement("mathml", "MathML"), optionElement("latex", "LaTeX"));
  select.value = copyMathFormat();
  select.addEventListener("change", () => writeSetting(COPY_MATH_FORMAT_KEY, select.value));
  row.append(label, select);
  appendSetting("text", row);
}
function copyButton(label, run) {
  const button2 = document.createElement("button");
  button2.type = "button";
  button2.className = "webbook-copy-button webbook";
  button2.dataset.webbookCopyControl = "";
  button2.setAttribute("aria-label", label);
  button2.title = label;
  button2.addEventListener("click", run);
  return button2;
}
function updateCopyScroll() {
  for (const source of document.querySelectorAll("main .webbook-copy-source, main .webbook-copy-code pre")) {
    if (!source.clientWidth) continue;
    const scrolls = source.scrollWidth > source.clientWidth + 1;
    if (scrolls && source.tabIndex < 0) {
      source.dataset.webbookCopyScroll = source.getAttribute("tabindex") ?? "";
      source.tabIndex = 0;
    } else if (!scrolls && source.hasAttribute("data-webbook-copy-scroll")) {
      const previous = source.dataset.webbookCopyScroll;
      if (previous) source.setAttribute("tabindex", previous);
      else source.removeAttribute("tabindex");
      delete source.dataset.webbookCopyScroll;
    }
  }
}
function enhanceCopyContent() {
  const main = document.querySelector("main");
  if (!main || !clipboardAvailable()) return;
  const audio = pageAudio();
  const track = audio?.querySelector("track");
  const hasSource = audio && (audio.getAttribute("src") || audio.querySelector("source[src]"));
  if (hasSource && track && track.readyState < 2) return;
  cacheCueElements(track?.track ?? audio?.textTracks?.[0]);
  for (const math of main.querySelectorAll("math")) {
    if (!math.hasAttribute("tabindex")) {
      math.setAttribute("tabindex", "-1");
      math.setAttribute("data-webbook-copy-focus", "");
    }
    if (!isDisplayEquation(math) || math.closest("[data-webbook-copy-unit]")) continue;
    const label = equationButtonName(math);
    const unit = document.createElement("span");
    unit.className = "webbook-copy-unit";
    unit.setAttribute("data-webbook-reader", "");
    unit.dataset.webbookCopyUnit = "";
    const source = document.createElement("span");
    source.className = "webbook-copy-source";
    source.setAttribute("data-webbook-reader", "");
    math.before(unit);
    source.append(math);
    unit.append(source, copyButton(label, () => copyEquation({ math, count: 1 })));
  }
  for (const pre of main.querySelectorAll("pre")) {
    if (pre.closest("[data-webbook-copy-unit]")) continue;
    const unit = document.createElement("div");
    unit.className = "webbook-copy-unit webbook-copy-code";
    unit.setAttribute("data-webbook-reader", "");
    unit.dataset.webbookCopyUnit = "";
    pre.before(unit);
    unit.append(pre, copyButton("Copy code", () => copyCode(pre)));
  }
  updateCopyScroll();
}
function initCopyContent() {
  if (initialized.has(document)) return;
  initialized.add(document);
  buildSetting();
  for (const [id, label, run] of [
    ["copy-equation", "Copy equation", () => copyEquation(equationHere())],
    ["copy-selection", "Copy selection", () => copySelection(selectedRange())],
    ["copy-code", "Copy code", () => copyCode(codeHere())]
  ]) {
    registerAction({ id, label, group: "Reading", isAvailable: clipboardAvailable, run });
  }
  const observer3 = typeof ResizeObserver === "function" ? new ResizeObserver(updateCopyScroll) : null;
  const refresh3 = () => {
    enhanceCopyContent();
    observer3?.disconnect();
    document.querySelectorAll("main .webbook-copy-source, main .webbook-copy-code pre").forEach((source) => observer3?.observe(source));
  };
  refresh3();
  document.addEventListener("webbook:pagechange", refresh3);
  document.addEventListener("webbook:playerready", refresh3);
  document.addEventListener("copy", handleMathCopy);
  window.addEventListener("resize", updateCopyScroll);
  document.addEventListener("webbook:layoutchange", updateCopyScroll);
}

// template/src/js/responsive-equations.js
function updateEquation(equation) {
  const scroll = equation.querySelector(":scope > .webbook-equation-scroll");
  const number = equation.querySelector(":scope > .webbook-equation-number");
  const math = scroll?.querySelector("math");
  if (!scroll || !number || !math || !equation.clientWidth) return;
  scroll.dataset.webbookEquationLabel ??= scroll.getAttribute("aria-label") || `Equation ${number.textContent.trim()}`;
  const gap = parseFloat(getComputedStyle(equation).columnGap) || 0;
  const copy = scroll.querySelector(".webbook-copy-button");
  const needed = math.getBoundingClientRect().width + (copy?.getBoundingClientRect().width || 0) + gap * 2;
  equation.toggleAttribute("data-webbook-equation-stacked", needed + number.getBoundingClientRect().width > equation.clientWidth);
  const overflows = scroll.scrollWidth > scroll.clientWidth + 1;
  if (overflows) {
    scroll.setAttribute("role", "region");
    scroll.setAttribute("aria-label", scroll.dataset.webbookEquationLabel);
    scroll.setAttribute("tabindex", "0");
  } else {
    scroll.removeAttribute("role");
    scroll.removeAttribute("aria-label");
    scroll.removeAttribute("tabindex");
  }
}
function updateResponsiveEquations() {
  document.querySelectorAll(".webbook-equation").forEach(updateEquation);
  document.querySelectorAll("main math").forEach((math) => {
    if (!math.clientWidth || math.closest("table, .webbook-equation-scroll, .webbook-copy-source")) return;
    const attribute = "data-webbook-math-tabindex";
    const wide = math.scrollWidth > math.clientWidth + 1;
    math.toggleAttribute("data-webbook-math-wide", wide);
    if (wide && math.tabIndex < 0) {
      if (!math.hasAttribute(attribute)) math.setAttribute(attribute, math.getAttribute("tabindex") ?? "");
      math.setAttribute("tabindex", "0");
    } else if (!wide && math.hasAttribute(attribute)) {
      const previous = math.getAttribute(attribute);
      if (previous) math.setAttribute("tabindex", previous);
      else math.removeAttribute("tabindex");
      math.removeAttribute(attribute);
    }
  });
}
var observer2;
function refresh2() {
  observer2?.disconnect();
  if (typeof ResizeObserver === "function") {
    observer2 = new ResizeObserver(updateResponsiveEquations);
    document.querySelectorAll(".webbook-equation, main math").forEach((element) => observer2.observe(element));
  }
  updateResponsiveEquations();
}
function initResponsiveEquations() {
  refresh2();
  window.addEventListener("resize", updateResponsiveEquations);
  document.addEventListener("webbook:layoutchange", updateResponsiveEquations);
  document.addEventListener("webbook:pagechange", refresh2);
  document.addEventListener("webbook:playerready", refresh2);
}

// template/src/js/structure-context.js
var NAME_LIMIT = 80;
var HEADING_SELECTOR = 'h1, h2, h3, h4, h5, h6, [role="heading"]';
function roles(elm) {
  return (elm.getAttribute("role") || "").split(/\s+/).filter(Boolean);
}
function hasClass(elm, ...names) {
  return names.some((name) => elm.classList.contains(name));
}
function isPresentation(elm) {
  return roles(elm).some((role) => role === "presentation" || role === "none");
}
function plainName(elm, limit = NAME_LIMIT) {
  if (!elm) return "";
  const copy = elm.cloneNode(true);
  copy.querySelectorAll('.webbook, [aria-hidden="true"], math, svg, img').forEach((node) => node.remove());
  return capText(copy.textContent || "", limit);
}
function capText(text, limit = NAME_LIMIT) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= limit) return normalized;
  const cut = normalized.slice(0, limit);
  const space = cut.lastIndexOf(" ");
  return `${(space > limit / 2 ? cut.slice(0, space) : cut).replace(/[\s,;:.]+$/, "")}\u2026`;
}
function labelledName(elm) {
  const ids = (elm.getAttribute("aria-labelledby") || "").split(/\s+/).filter(Boolean);
  const byIds = ids.map((id) => plainName(document.getElementById(id))).filter(Boolean).join(" ");
  if (byIds) return capText(byIds);
  return capText(elm.getAttribute("aria-label") || "");
}
function isNotesSection(elm) {
  return hasClass(elm, "epubtype_endnotes", "epubtype_rearnotes") || roles(elm).includes("doc-endnotes");
}
function endnotesSectionItem(elm) {
  if (elm.tagName !== "LI" || !elm.parentElement?.matches("ol, ul")) return false;
  const section = elm.closest('.epubtype_endnotes, .epubtype_rearnotes, [role~="doc-endnotes"]');
  if (!section) return false;
  const outerItem = elm.parentElement.parentElement?.closest("li");
  return !outerItem || !section.contains(outerItem);
}
function orderedNumber(item) {
  const list2 = item.parentElement;
  if (!list2 || list2.tagName !== "OL") return null;
  const value = Number.parseInt(item.getAttribute("value") ?? "", 10);
  if (Number.isFinite(value)) return value;
  const items = Array.from(list2.children).filter((child) => child.tagName === "LI");
  const start = Number.parseInt(list2.getAttribute("start") ?? "", 10);
  const index = items.indexOf(item);
  if (list2.hasAttribute("reversed")) return (Number.isFinite(start) ? start : items.length) - index;
  return (Number.isFinite(start) ? start : 1) + index;
}
function equationNumber(math) {
  const block = math.closest(".webbook-equation");
  const number = block?.querySelector(".webbook-equation-number");
  return number ? capText((number.textContent || "").replace(/^\s*\(\s*|\s*\)\s*$/g, ""), 20) : "";
}
function classify(elm) {
  const elmRoles = roles(elm);
  if (hasClass(elm, "epubtype_footnote") || elmRoles.includes("doc-footnote")) return { type: "footnote" };
  if (hasClass(elm, "epubtype_endnote", "epubtype_rearnote") || elmRoles.includes("doc-endnote") || endnotesSectionItem(elm)) {
    return { type: "endnote", number: elm.tagName === "LI" ? orderedNumber(elm) : null };
  }
  if (hasClass(elm, "epubtype_note")) return { type: "note" };
  if (isNotesSection(elm)) return { type: "endnotes section" };
  if (hasClass(elm, "epubtype_toc") || elmRoles.includes("doc-toc")) return { type: "contents" };
  if (hasClass(elm, "epubtype_sidebar") || elmRoles.includes("complementary")) {
    return { type: "sidebar", name: labelledName(elm) === "sidebar" ? "" : labelledName(elm) };
  }
  if (elm.localName === "math") return { type: "equation", number: equationNumber(elm) || null };
  if (hasClass(elm, "webbook-equation")) return null;
  if (isPresentation(elm)) return null;
  if (elm.tagName === "TABLE" || elmRoles.some((role) => role === "table" || role === "grid")) {
    const caption = elm.tagName === "TABLE" ? elm.querySelector(":scope > caption") : null;
    return { type: "table", name: labelledName(elm) || plainName(caption) };
  }
  if (elm.tagName === "FIGURE" || elmRoles.includes("figure") || hasClass(elm, "epubtype_figure")) {
    const caption = elm.querySelector(":scope > figcaption");
    return { type: "figure", name: labelledName(elm) || plainName(caption) };
  }
  if (elm.tagName === "BLOCKQUOTE") return { type: "block quotation" };
  if (["OL", "UL", "DL"].includes(elm.tagName) || elmRoles.includes("list")) return { type: "list" };
  return null;
}
function headingFor(target, main) {
  const own = target.closest(HEADING_SELECTOR);
  if (own && main.contains(own)) return own;
  let found = null;
  for (const heading of main.querySelectorAll(HEADING_SELECTOR)) {
    if (heading.closest(".webbook")) continue;
    if (heading.compareDocumentPosition(target) & Node.DOCUMENT_POSITION_FOLLOWING) found = heading;
    else break;
  }
  return found;
}
function headingLevel(heading) {
  const level = /^H([1-6])$/.exec(heading.tagName)?.[1] ?? heading.getAttribute("aria-level");
  return level ? Number(level) : null;
}
function describeStructure(target) {
  const main = document.querySelector("main");
  if (!(target instanceof Element) || !main || !main.contains(target)) return null;
  let elm = target;
  while (elm !== main && elm.closest(".webbook") && main.contains(elm.closest(".webbook"))) elm = elm.parentElement;
  const structures = [];
  let item = null;
  for (let node = elm; node && node !== main; node = node.parentElement) {
    if (node.tagName === "LI" && !endnotesSectionItem(node) && !item) item = node;
    const kind = classify(node);
    if (!kind) continue;
    if (kind.type === "list" && structures.at(-1)?.type === "endnote" && structures.at(-1).element.parentElement === node) continue;
    if (kind.type === "list" && item?.parentElement === node) {
      const items = Array.from(node.children).filter((child) => child.tagName === "LI");
      kind.item = items.indexOf(item) + 1;
      kind.items = items.length;
      item = null;
    }
    structures.push({ ...kind, element: node });
  }
  const heading = headingFor(elm, main);
  return {
    target: elm,
    structures,
    heading: heading ? { element: heading, name: plainName(heading), level: headingLevel(heading), isTarget: heading === elm || heading.contains(elm) } : null
  };
}
var NOUNS = {
  "footnote": "Footnote",
  "endnote": "Endnote",
  "note": "Note",
  "endnotes section": "Endnotes section",
  "contents": "The book's table of contents",
  "sidebar": "Sidebar",
  "equation": "Equation",
  "table": "Table",
  "figure": "Figure",
  "block quotation": "Block quotation",
  "list": "List"
};
var ENCLOSING = {
  "footnote": "a footnote",
  "endnote": "an endnote",
  "note": "a note",
  "endnotes section": "the endnotes section",
  "contents": "the book's table of contents",
  "sidebar": "a sidebar",
  "equation": "an equation",
  "table": "a table",
  "figure": "a figure",
  "block quotation": "a block quotation",
  "list": "a list"
};
function innermostPhrase(structure) {
  let phrase = NOUNS[structure.type];
  if (structure.number != null && structure.number !== "") phrase += ` ${structure.number}`;
  if (structure.name) phrase += ` \u2018${structure.name}\u2019`;
  if (structure.item) phrase += `, item ${structure.item} of ${structure.items}`;
  return phrase;
}
function enclosingPhrase(structure) {
  if (structure.type === "list" && structure.item) return `in list item ${structure.item} of ${structure.items}`;
  if (structure.type === "endnote" && structure.number != null) return `in endnote ${structure.number}`;
  return `in ${ENCLOSING[structure.type]}`;
}
function formatStructure(description) {
  if (!description) return "Reading position is not available.";
  const { structures, heading } = description;
  if (heading?.isTarget && !structures.length) {
    return `Heading${heading.level ? ` level ${heading.level}` : ""}, \u2018${heading.name}\u2019.`;
  }
  const parts = structures.length ? [innermostPhrase(structures[0]), ...structures.slice(1).map(enclosingPhrase)] : ["Main text"];
  let answer = `${parts.join(", ")}.`;
  if (heading?.name) answer += heading.isTarget ? ` Heading \u2018${heading.name}\u2019.` : ` Under \u2018${heading.name}\u2019.`;
  return answer;
}

// template/src/js/where-am-i.js
var BUTTON_ID = "webbook-where-am-i";
var SNAPSHOT_MS = 2e3;
var snapshot = null;
var PANEL_NAMES = {
  "webbook-toc-nav": "Table of contents",
  "webbook-search": "Search",
  "webbook-settings": "Settings",
  "webbook-info": "About this publication",
  "webbook-menu": "Go to page"
};
var COMPASS_SVG = '<svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/><path d="M15.5 8.5 13.4 13.4 8.5 15.5 10.6 10.6Z" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>';
function initWhereAmI() {
  registerAction({
    id: "where-am-i",
    label: "Where am I?",
    group: "Navigation",
    // Its answer for an open panel is the panel, so it runs there, on a modified key
    inPanels: true,
    run: () => announceReaderAction(whereAmI())
  });
  createButton();
  document.addEventListener("webbook:pagechange", () => {
    snapshot = null;
  });
}
function createButton() {
  const toolbar = document.getElementById("webbook-top-toolbar");
  if (!toolbar || document.getElementById(BUTTON_ID)) return;
  const button2 = document.createElement("button");
  button2.type = "button";
  button2.id = BUTTON_ID;
  button2.title = "Where am I?";
  button2.setAttribute("aria-label", "Where am I?");
  button2.innerHTML = COMPASS_SVG;
  button2.addEventListener("pointerdown", () => {
    snapshot = takeSnapshot();
  });
  button2.addEventListener("click", () => {
    const recent = snapshot && performance.now() - snapshot.time < SNAPSHOT_MS ? snapshot : null;
    snapshot = null;
    announceReaderAction(whereAmI(recent ?? void 0));
  });
  const search2 = toolbar.querySelector('button[popovertarget="webbook-search"]');
  if (search2) search2.before(button2);
  else toolbar.append(button2);
}
function takeSnapshot() {
  const selection = window.getSelection?.();
  const range = selection && selection.rangeCount && !selection.isCollapsed ? selection.getRangeAt(0).cloneRange() : null;
  return { time: performance.now(), active: document.activeElement, range };
}
function whereAmI(context = takeSnapshot()) {
  const panel = panelAnswer(context.active);
  if (panel) return panel;
  return formatStructure(describeStructure(readingPosition(context)));
}
function isUsable(elm) {
  const main = document.querySelector("main");
  return elm instanceof Element && elm.isConnected && Boolean(main?.contains(elm));
}
function narrationIsPlaying() {
  const audio = pageAudio();
  return Boolean(audio && (!audio.paused && !audio.ended || pausedForSound()));
}
function selectionStart(range) {
  if (!range) return null;
  const node = range.startContainer;
  const elm = node.nodeType === Node.ELEMENT_NODE ? node.childNodes[range.startOffset] ?? node : node.parentElement;
  return elm instanceof Element ? elm : elm?.parentElement ?? null;
}
function readingPosition({ active, range } = {}) {
  const main = document.querySelector("main");
  const caption = currentCaptionElement();
  if (isUsable(caption)) return caption;
  const narrated = lastNarratedElement();
  if (narrationIsPlaying() && isUsable(narrated)) return narrated;
  const selected = selectionStart(range);
  if (isUsable(selected)) return selected;
  if (isUsable(active) && active !== main) return active;
  if (isUsable(narrated) && isOnScreen2(narrated)) return narrated;
  const atLine = elementAtReadingLine(main);
  if (isUsable(atLine)) return atLine;
  return isUsable(narrated) ? narrated : null;
}
function isOnScreen2(elm) {
  if (typeof elm.getBoundingClientRect !== "function") return false;
  const rect = elm.getBoundingClientRect();
  return readingEnd(rect) > 0 && readingStart(rect) < viewportLength();
}
var TEXT_BLOCKS = "h1, h2, h3, h4, h5, h6, p, li, dt, dd, th, td, caption, figcaption, blockquote, pre, math, img";
function elementAtReadingLine(main) {
  if (!main) return null;
  const line = readingLine();
  for (const elm of main.querySelectorAll(TEXT_BLOCKS)) {
    if (elm.closest('.webbook, [hidden], [aria-hidden="true"]') || !elm.getClientRects().length) continue;
    if (readingEnd(elm.getBoundingClientRect()) > line) return elm;
  }
  return null;
}
function panelAnswer(active) {
  if (!(active instanceof Element) || !active.isConnected) return null;
  const panel = active.closest("[popover]");
  if (!panel || !isOpen(panel)) return null;
  const name = PANEL_NAMES[panel.id] || accessibleName(panel);
  if (!name) return null;
  const detail = panelDetail(panel, active);
  return detail ? `${name}. ${detail}` : `${name}.`;
}
function isOpen(panel) {
  try {
    return panel.matches(":popover-open");
  } catch {
    return !panel.hidden;
  }
}
function accessibleName(elm) {
  const labelledBy = (elm.getAttribute("aria-labelledby") || "").split(/\s+/).filter(Boolean).map((id) => plainName(document.getElementById(id))).filter(Boolean).join(" ");
  return capText(labelledBy || elm.getAttribute("aria-label") || "");
}
function panelDetail(panel, active) {
  if (panel.id === "webbook-toc-nav") {
    const item = active.closest("li > a");
    if (!item || !panel.contains(item)) return "";
    let level = 0;
    for (let nested = item.closest("ol, ul"); nested && panel.contains(nested); nested = nested.parentElement?.closest("ol, ul")) level++;
    return `\u2018${plainName(item)}\u2019, level ${level}.`;
  }
  if (panel.id === "webbook-settings") {
    const section = active.closest(".webbook-settings-section");
    const heading = section?.querySelector("h3");
    return heading ? `${plainName(heading)} section.` : "";
  }
  if (panel.id === "webbook-search") {
    const result2 = active.closest("#webbook-search-results > li");
    if (!result2) return "";
    const results = Array.from(result2.parentElement.children);
    return `Result ${results.indexOf(result2) + 1} of ${results.length}.`;
  }
  return "";
}

// template/src/js/main.js
async function init() {
  if (document.documentElement.dataset.webbookContract !== "0")
    throw new Error("Incompatible book contract.");
  await prepareReaderShell();
  initEscapability();
  initResumePosition();
  initPopoverCloseButtons();
  initPopoverToggleTracking();
  initTocInPageLinks();
  initSettings();
  initWritingMode();
  initAppearance();
  initSettingsFilter();
  initSkippability();
  initResumeSetting();
  initCaptionMode();
  initPlayer();
  initToolbarAutoHide();
  initPageActions();
  initPopoverActions();
  initTocActions();
  initCurrentPrintPage();
  initNotesInPlace();
  initCopyContent();
  initResponsiveEquations();
  initSettingsTransfer();
  initOfflineReading();
  initReaderUpdates();
  initWhereAmI();
  initKeyboardShortcuts();
  initKeyboardShortcutEditorButton();
  initSearchOnDemand();
  initTocTree();
  initAgentTools();
  initBrowserBookmarks();
  initResponsiveTables();
  initSkipLink();
  initReaderActionNotice();
  initInPlaceNavigation();
  import("./chunk-WI63YOJX.js").then(({ initMediaSessionControls }) => initMediaSessionControls()).catch((error2) => console.warn("Media Session controls unavailable.", error2));
}
function initSearchOnDemand() {
  const panel = document.getElementById("webbook-search");
  if (!panel) return;
  let loading2 = null;
  const load = () => loading2 ??= import("./chunk-VKFVGLPJ.js").then(({ initSearch }) => initSearch()).catch((error2) => console.warn("Search unavailable.", error2));
  panel.addEventListener("beforetoggle", (event) => {
    if (event.newState === "open") load();
  });
  try {
    if (sessionStorage.getItem("webbook-search-highlight")) load();
  } catch {
  }
}
if (typeof __WEBBOOK_RELEASE__ === "undefined" && !window.webbookBootstrapStarted && !document.documentElement.hasAttribute("data-webbook-shell") && document.querySelector('script[type="module"][src$="src/js/main.js"]')) {
  if (new URL(location.href).searchParams.get("webbook-baseline") === "1") {
    document.documentElement.classList.remove("webbook-js", "webbook-dark", "webbook-light", "webbook-caption-mode");
  } else {
    window.webbookUI = { local: true };
    document.documentElement.dataset.webbookUi = "local";
    init().catch(() => {
      const url = new URL(location.href);
      url.searchParams.set("webbook-baseline", "1");
      location.replace(url);
    });
  }
}
export {
  init
};
