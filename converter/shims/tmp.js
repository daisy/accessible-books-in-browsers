// Browser converter (plan 19): temporary files and folders inside the in-memory file system. The converter deletes
// each page's temporary audio folder itself once the page is encoded (audio.ts).
import { mkdtempSync, mkdirSync } from './fs.js';
let count = 0;
const name = prefix => `/tmp/${prefix}-${(++count).toString(36)}`;
export default {
    dirSync: (options) => { const dir = mkdtempSync(`/tmp/${options?.prefix ?? 'dir-'}`); return { name: dir, removeCallback() {} }; },
    fileSync: () => { mkdirSync('/tmp'); return { name: name('file'), removeCallback() {} }; },
    tmpNameSync: () => name('name'),
    setGracefulCleanup() {}
};
