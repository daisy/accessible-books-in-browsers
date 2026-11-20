import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const script = (name) => fileURLToPath(new URL('../scripts/' + name, import.meta.url));
test('immutable releases cannot be overwritten or promoted without matching verification; corruption preserves current and kill switch remains available', async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'webbook-release-test-'));
    const run = (name, ...args) =>
        execFileSync(process.execPath, [script(name), directory, ...args], { stdio: 'pipe' });
    try {
        run('build-ui-release.mjs', 'test');
        const candidate = await fs.readFile(path.join(directory, 'candidate.json'), 'utf8');
        assert.throws(() => run('build-ui-release.mjs', 'test'));
        assert.throws(() => run('promote-ui-release.mjs', 'test'));
        const bytes = await fs.readFile(path.join(directory, 'test/ui-files.json'));
        await fs.mkdir(path.join(directory, 'checks'));
        await fs.writeFile(
            path.join(directory, 'checks/test.json'),
            JSON.stringify({
                version: 'test',
                inventorySha256: createHash('sha256').update(bytes).digest('hex'),
                passed: Array(20).fill('unit fixture'),
            }),
        );
        run('promote-ui-release.mjs', 'test');
        assert.equal(await fs.readFile(path.join(directory, 'current.json'), 'utf8'), candidate);
        const retained = path.join(directory, 'retained');
        await fs.mkdir(path.join(retained, 'older'), { recursive: true });
        await fs.writeFile(path.join(retained, 'older/main.js'), 'older release');
        const install = () => execFileSync(process.execPath, [script('install-ui-release.mjs'), directory, retained, 'test'], { stdio: 'pipe' });
        install(); install();
        assert.equal(await fs.readFile(path.join(retained, 'older/main.js'), 'utf8'), 'older release');
        await fs.appendFile(path.join(directory, 'test/main.js'), '/* corruption */');
        assert.throws(install);
        assert.throws(() => run('promote-ui-release.mjs', 'test'));
        assert.equal(await fs.readFile(path.join(directory, 'current.json'), 'utf8'), candidate);
        run('promote-ui-release.mjs', '--local');
        assert.deepEqual(JSON.parse(await fs.readFile(path.join(directory, 'current.json'), 'utf8')), {
            contract: 0,
            useLocal: true,
        });
    } finally {
        await fs.rm(directory, { recursive: true, force: true });
    }
});
