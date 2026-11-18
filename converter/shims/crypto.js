// Browser converter (plan 19): createHash for sha1 and sha256, synchronously, as the converter uses it
import { sha1 } from '@noble/hashes/sha1';
import { sha256 } from '@noble/hashes/sha256';
import { Buffer } from 'buffer';
const algorithms = { sha1, sha256 };
export function createHash(name) {
    const hash = algorithms[name].create();
    const api = {
        update(data, encoding) { hash.update(typeof data === 'string' ? new TextEncoder().encode(data) : data); return api; },
        digest(encoding) { const bytes = Buffer.from(hash.digest()); return encoding ? bytes.toString(encoding) : bytes; }
    };
    return api;
}
export default { createHash };
