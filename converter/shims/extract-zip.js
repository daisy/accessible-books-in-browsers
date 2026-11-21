// Browser converter (plan 19): unzip an EPUB from the in-memory file system into a folder there
import { unzipSync } from 'fflate';
import { readFileSync, writeFileSync, mkdirSync } from './fs.js';
import { unsafeZipName } from '../zip-names.js';
export default async function extractZip(file, { dir }) {
    const entries = unzipSync(new Uint8Array(readFileSync(file)));
    // As extract-zip does: an entry that leads out of the folder stops the unzip (the page's checks say so first)
    const unsafe = Object.keys(entries).find(unsafeZipName);
    if (unsafe) throw new Error(`Out of bound path "${unsafe}" found while processing file ${file}`);
    for (const [name, bytes] of Object.entries(entries)) {
        if (name.endsWith('/')) mkdirSync(`${dir}/${name}`);
        else writeFileSync(`${dir}/${name}`, bytes);
    }
}
