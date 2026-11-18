// Browser converter (plan 19): chardet reads files through this; point it at the in-memory file system
import fs from './fs.js';
export default () => fs;
