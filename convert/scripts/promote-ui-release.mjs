import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
const [directory, version] = process.argv.slice(2),
    channel = path.resolve(directory || '.');
if (!directory || !version)
    throw new Error('Usage: node scripts/promote-ui-release.mjs <channel-directory> <version|--local>');
let manifest;
if (version === '--local') manifest = { contract: 0, useLocal: true };
else {
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/.test(version)) throw new Error('Invalid version');
    const inventoryPath = path.join(channel, 'releases', version, 'ui-files.json'),
        bytes = await fs.readFile(inventoryPath),
        inventory = JSON.parse(bytes);
    const receipt = JSON.parse(await fs.readFile(path.join(channel, 'checks', version + '.json'), 'utf8'));
    const hash = (value) => createHash('sha256').update(value).digest('hex');
    if (
        receipt.version !== version ||
        receipt.inventorySha256 !== hash(bytes) ||
        !Array.isArray(receipt.passed) ||
        receipt.passed.length < 20
    )
        throw new Error('This release has no matching successful conformance result.');
    for (const file of inventory.files) {
        if (
            !/^[A-Za-z0-9._-]+$/.test(file.href) ||
            file.sha256 !== hash(await fs.readFile(path.join(channel, 'releases', version, file.href)))
        )
            throw new Error('Release files changed after verification.');
    }
    manifest = JSON.parse(await fs.readFile(path.join(channel, 'manifests', version + '.json'), 'utf8'));
    if (manifest.contract !== 0 || manifest.version !== version)
        throw new Error('Incompatible release manifest');
}
await fs.writeFile(path.join(channel, 'current.json.next'), JSON.stringify(manifest, null, 2) + '\n');
await fs.rename(path.join(channel, 'current.json.next'), path.join(channel, 'current.json'));
console.log(
    version === '--local' ? 'Channel now selects bundled local UI.' : `Channel now selects ${version}.`,
);
