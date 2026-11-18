import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
const [from, to, version] = process.argv.slice(2);
if (!from || !to || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/.test(version || ''))
    throw new Error(
        'Usage: node scripts/install-ui-release.mjs <checked-channel> <retained-channel> <version>',
    );
const source = path.resolve(from, 'releases', version),
    target = path.resolve(to, 'releases', version);
const inventory = JSON.parse(await fs.readFile(path.join(source, 'ui-files.json'), 'utf8'));
for (const file of inventory.files) {
    if (!/^[A-Za-z0-9._-]+$/.test(file.href)) throw new Error('Invalid release path');
    const bytes = await fs.readFile(path.join(source, file.href));
    if (createHash('sha256').update(bytes).digest('hex') !== file.sha256)
        throw new Error('Release changed after checks');
}
let exists = true;
try {
    await fs.access(target);
} catch (error) {
    if (error.code !== 'ENOENT') throw error;
    exists = false;
}
if (exists) {
    for (const file of ['ui-files.json', ...inventory.files.map((file) => file.href)])
        if (!(await fs.readFile(path.join(source, file))).equals(await fs.readFile(path.join(target, file))))
            throw new Error('Refusing to replace an existing immutable release');
} else {
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.mkdir(target);
    await fs.cp(source, target, { recursive: true, force: false, errorOnExist: true });
}
for (const folder of ['checks', 'manifests']) {
    await fs.mkdir(path.resolve(to, folder), { recursive: true });
    await fs.copyFile(
        path.resolve(from, folder, version + '.json'),
        path.resolve(to, folder, version + '.json'),
    );
}
console.log(
    exists
        ? 'Retained identical immutable release.'
        : 'Installed new immutable release alongside existing releases.',
);
