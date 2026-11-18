// Browser converter (plan 19): unzip an EPUB from the in-memory file system into a folder there
import { unzipSync } from 'fflate';
import { readFileSync, writeFileSync, mkdirSync } from './fs.js';
export default async function extractZip(file, { dir }) {
    const entries = unzipSync(new Uint8Array(readFileSync(file)));
    for (const [name, bytes] of Object.entries(entries)) {
        if (name.endsWith('/')) mkdirSync(`${dir}/${name}`);
        else writeFileSync(`${dir}/${name}`, bytes);
    }
}
