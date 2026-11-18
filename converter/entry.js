// Browser converter (plan 19): the converter's own convert(), unchanged, with the in-memory file system
import { convert } from '../convert/build/convert.js';
import { vfs } from './shims/fs.js';
import { log } from './shims/winston.js';
globalThis.spike = { ...globalThis.spike, convert, vfs, log };
