// Browser converter (plan 19): an in-memory file system standing in for fs, fs-extra and fs/promises, so the
// converter's own source runs unchanged in a browser. Paths are POSIX. Only what the converter
// (and the libraries it bundles, such as chardet and iconv-lite) call is here.
import path from 'path-browserify';
import { Buffer } from 'buffer';

const files = new Map();   // path -> Uint8Array
const dirs = new Set(['/']);

const norm = p => path.resolve('/', String(p));
const enc = new TextEncoder();

function addDirs(p) {
    for (let d = path.dirname(p); !dirs.has(d); d = path.dirname(d)) dirs.add(d);
}
function toBytes(data, encoding) {
    if (typeof data === 'string') return encoding === 'base64' ? Buffer.from(data, 'base64') : enc.encode(data);
    if (data instanceof Uint8Array) return data;
    if (data instanceof ArrayBuffer) return new Uint8Array(data);
    return enc.encode(String(data));
}
function notFound(p) {
    const error = new Error(`ENOENT: no such file or directory, '${p}'`);
    error.code = 'ENOENT';
    return error;
}
function encodingOf(options) {
    return typeof options === 'string' ? options : options?.encoding;
}

// --- sync ---
export function writeFileSync(p, data, options) {
    p = norm(p); addDirs(p); dirs.add(path.dirname(p));
    files.set(p, toBytes(data, encodingOf(options)));
}
export function readFileSync(p, options) {
    p = norm(p);
    const bytes = files.get(p);
    if (!bytes) throw notFound(p);
    const encoding = encodingOf(options);
    const buffer = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return encoding ? buffer.toString(encoding === 'utf-8' ? 'utf8' : encoding) : buffer;
}
export function existsSync(p) { p = norm(p); return files.has(p) || dirs.has(p); }
export function statSync(p) {
    p = norm(p);
    if (files.has(p)) { const size = files.get(p).byteLength; return { size, isFile: () => true, isDirectory: () => false, mtimeMs: 0, mtime: new Date(0) }; }
    if (dirs.has(p)) return { size: 0, isFile: () => false, isDirectory: () => true, mtimeMs: 0, mtime: new Date(0) };
    throw notFound(p);
}
export function mkdirSync(p) { p = norm(p); addDirs(p + '/x'); dirs.add(p); }
export function readdirSync(p) {
    p = norm(p);
    if (!dirs.has(p)) throw notFound(p);
    const names = new Set();
    const prefix = p === '/' ? '/' : p + '/';
    for (const key of [...files.keys(), ...dirs]) if (key.startsWith(prefix) && key !== p) names.add(key.slice(prefix.length).split('/')[0]);
    return [...names].sort();
}
export function removeSync(p) {
    p = norm(p);
    files.delete(p); dirs.delete(p);
    for (const key of [...files.keys()]) if (key.startsWith(p + '/')) files.delete(key);
    for (const key of [...dirs]) if (key.startsWith(p + '/')) dirs.delete(key);
}
export function copySync(from, to) {
    from = norm(from); to = norm(to);
    if (files.has(from)) { writeFileSync(to, files.get(from).slice()); return; }
    if (!dirs.has(from)) throw notFound(from);
    mkdirSync(to);
    for (const key of [...dirs]) if (key.startsWith(from + '/')) mkdirSync(to + key.slice(from.length));
    for (const [key, value] of [...files]) if (key.startsWith(from + '/')) writeFileSync(to + key.slice(from.length), value.slice());
}
export function truncateSync(p, length) { p = norm(p); files.set(p, (files.get(p) ?? new Uint8Array()).slice(0, length)); }
export function readJsonSync(p) { return JSON.parse(readFileSync(p, 'utf8')); }
export function openSync() { throw new Error('openSync is not available in the browser converter'); }
let tempCount = 0;
export function mkdtempSync(prefix) { const p = norm(`${prefix}${(++tempCount).toString(36)}${Date.now().toString(36)}`); mkdirSync(p); return p; }

// --- async (fs-extra style, promise-returning) ---
const later = fn => (...args) => new Promise((resolve, reject) => { try { resolve(fn(...args)); } catch (error) { reject(error); } });
export const writeFile = later(writeFileSync);
export const readFile = later(readFileSync);
export const stat = later(statSync);
export const lstat = stat;
export const readdir = later(readdirSync);
export const remove = later(removeSync);
export const rm = later(removeSync);
export const copy = later(copySync);
export const mkdtemp = later(mkdtempSync);
export const pathExists = later(existsSync);
export const ensureDir = later(mkdirSync);
export const mkdirp = ensureDir;
export const mkdir = later(mkdirSync);
export const readJson = later(readJsonSync);
export const writeJson = later((p, value, options) => writeFileSync(p, JSON.stringify(value, null, options?.spaces ?? 0) + '\n')); // fs-extra ends with EOL
export const outputFile = writeFile;
export const move = later((from, to) => { copySync(from, to); removeSync(from); });
export const access = later(p => { if (!existsSync(p)) throw notFound(p); });
export const promises = { readFile, writeFile, stat, readdir, mkdir, rm, access, lstat };
export const constants = { F_OK: 0, R_OK: 4 };

// For the spike page: read the whole tree out, and put files in
export const vfs = { files, dirs, writeFileSync, readFileSync, removeSync, readdirSync };

export default {
    writeFileSync, readFileSync, existsSync, statSync, mkdirSync, readdirSync, removeSync, copySync, truncateSync,
    readJsonSync, openSync, mkdtempSync, writeFile, readFile, stat, lstat, readdir, remove, rm, copy, mkdtemp,
    pathExists, ensureDir, mkdirp, mkdir, readJson, writeJson, outputFile, move, access, promises, constants
};
