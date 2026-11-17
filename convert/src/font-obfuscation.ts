import { createHash } from 'crypto';
import path from 'path';
import fs from 'fs-extra';
import { JSDOM } from 'jsdom';
export const IDPF_FONT = 'http://www.idpf.org/2008/embedding';
export const ADOBE_FONT = 'http://ns.adobe.com/pdf/enc#RC';
export function fontKey(identifier: string, algorithm: string): Buffer {
    if (algorithm === IDPF_FONT) return createHash('sha1').update(identifier.replace(/[\u0009\u000a\u000d\u0020]/g, ''), 'utf8').digest();
    if (algorithm === ADOBE_FONT) {
        const uuid = identifier.trim().replace(/^urn:uuid:/i, '').replace(/-/g, '');
        if (!/^[0-9a-f]{32}$/i.test(uuid)) throw new Error('Adobe font obfuscation requires a UUID identifier');
        return Buffer.from(uuid, 'hex');
    }
    throw new Error(`Unsupported font encryption: ${algorithm}`);
}
export function deobfuscateFont(input: Buffer, key: Buffer, algorithm: string): Buffer {
    const output = Buffer.from(input), length = algorithm === IDPF_FONT ? 1040 : algorithm === ADOBE_FONT ? 1024 : 0;
    if (!length || !key.length) throw new Error('Unsupported font obfuscation');
    for (let i = 0; i < Math.min(length, output.length); i++) output[i] ^= key[i % key.length];
    return output;
}
export type FontEncryption = { algorithm: string; key?: Buffer; reason?: string };
export async function readFontEncryption(root: string, packageFilename: string): Promise<Map<string, FontEncryption>> {
    const result = new Map<string, FontEncryption>(), filename = path.join(root, 'META-INF', 'encryption.xml');
    if (!await fs.pathExists(filename)) return result;
    const opf = new JSDOM(await fs.readFile(packageFilename, 'utf8'), { contentType: 'application/xml' }).window.document;
    const unique = opf.documentElement.getAttribute('unique-identifier');
    const identifiers = Array.from(opf.getElementsByTagNameNS('*', 'identifier'));
    const identifier = identifiers.find(elm => elm.id === unique)?.textContent ?? '';
    const adobe = identifiers.map(elm => elm.textContent ?? '').find(value => /^urn:uuid:/i.test(value.trim())) ?? identifier;
    const xml = new JSDOM(await fs.readFile(filename, 'utf8'), { contentType: 'application/xml' }).window.document;
    for (const encrypted of Array.from(xml.getElementsByTagNameNS('*', 'EncryptedData'))) {
        const algorithm = encrypted.getElementsByTagNameNS('*', 'EncryptionMethod')[0]?.getAttribute('Algorithm') ?? '';
        const uri = encrypted.getElementsByTagNameNS('*', 'CipherReference')[0]?.getAttribute('URI');
        if (!uri) continue;
        const source = path.resolve(root, decodeURIComponent(uri));
        try { result.set(source, { algorithm, key: fontKey(algorithm === ADOBE_FONT ? adobe : identifier, algorithm) }); }
        catch (error) { result.set(source, { algorithm, reason: String(error) }); }
    }
    return result;
}
