// Browser converter (plan 19): the converter's own convert(), unchanged, with the in-memory file system
import { convert } from '../convert/build/convert.js';
import { CONVERTER_OPTIONS, WEB_GROUPS } from '../convert/build/options.js';
import { setSourceRangeDecoding } from '../convert/build/audio.js';
import { vfs } from './shims/fs.js';
import { log } from './shims/winston.js';
import { releaseAll } from './shims/ffmpeg-wasm-runner.js';
// The runner cuts clips from each source decoded once in the browser (shims/ffmpeg-wasm-runner.js)
setSourceRangeDecoding(false);
globalThis.spike = { ...globalThis.spike, convert, vfs, log, releaseAll, options: CONVERTER_OPTIONS, optionGroups: WEB_GROUPS };
