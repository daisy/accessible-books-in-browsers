import {
  discoverBook,
  includeSelectedUI,
  offlineCommand
} from "./chunk-SW2AIXYA.js";
import "./chunk-2PIDKBOH.js";
import "./chunk-JJPBXBH7.js";

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
