import { spawn } from 'node:child_process';
import fs from 'fs-extra';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ConversionReport, ReportCheck } from './conversion-report.js';
import type { OutputPaths } from './output.js';

const require = createRequire(import.meta.url);

export async function runOptionalChecks(input: string, paths: OutputPaths, report: ConversionReport): Promise<void> {
    report.checks.push(await runAce(input));
    report.checks.push(await runAxe(paths.stagingDir));
}

async function runAce(input: string): Promise<ReportCheck> {
    const command = aceCommand();
    if (!command) return { name: 'Ace', status: 'skipped', detail: '@daisy/ace is not installed or available on PATH.' };
    const out = await fs.mkdtemp(path.join(os.tmpdir(), 'webbook-ace-'));
    try {
        const result = await run(command, [input, '--outdir', out]);
        if (result.missing) return { name: 'Ace', status: 'skipped', detail: '@daisy/ace is not available on PATH.' };
        const reportFile = path.join(out, 'report.json');
        if (!await fs.pathExists(reportFile)) {
            return { name: 'Ace', status: 'skipped', detail: 'Ace did not produce report.json.' };
        }
        try {
            return summarizeAceReport(await fs.readJson(reportFile));
        } catch (error) {
            return { name: 'Ace', status: 'skipped', detail: `Ace report.json could not be read: ${(error as Error).message}` };
        }
    } finally {
        await fs.remove(out);
    }
}

type AceAssertion = {
    result?: { outcome?: unknown; 'earl:outcome'?: unknown };
    'earl:result'?: { outcome?: unknown; 'earl:outcome'?: unknown };
    test?: { id?: unknown; title?: unknown; 'dc:title'?: unknown; 'dct:title'?: unknown } | string;
    'earl:test'?: { id?: unknown; title?: unknown; 'dc:title'?: unknown; 'dct:title'?: unknown } | string;
};

export function summarizeAceReport(value: unknown): ReportCheck {
    const root = value && typeof value === 'object' ? value as Record<string, unknown> : {};
    const assertions = (Array.isArray(root.assertions) ? root.assertions
        : Array.isArray(root['earl:assertions']) ? root['earl:assertions'] : []) as AceAssertion[];
    const failures = assertions.filter(assertion => {
        const result = assertion.result ?? assertion['earl:result'];
        const outcome = result?.outcome ?? result?.['earl:outcome'];
        return typeof outcome === 'string' && /(?:^|:)(?:fail|failed)$/i.test(outcome);
    });
    if (!failures.length) {
        return { name: 'Ace', status: 'passed', detail: `${assertions.length} assertion${assertions.length === 1 ? '' : 's'} checked; no violations.` };
    }
    const rules = new Map<string, number>();
    for (const assertion of failures) {
        const test = assertion.test ?? assertion['earl:test'];
        const name = typeof test === 'string' ? test : String(test?.title ?? test?.['dct:title'] ?? test?.['dc:title'] ?? test?.id ?? 'Unknown rule');
        rules.set(name, (rules.get(name) ?? 0) + 1);
    }
    const top = Array.from(rules, ([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).slice(0, 3)
        .map(rule => `${rule.name} (${rule.count})`).join(', ');
    return {
        name: 'Ace', status: 'issues',
        detail: `${failures.length} violation${failures.length === 1 ? '' : 's'} across ${rules.size} rule${rules.size === 1 ? '' : 's'}. Top: ${top}.`
    };
}

function aceCommand(): string | null {
    try {
        const packageFile = require.resolve('@daisy/ace/package.json');
        const pkg = fs.readJsonSync(packageFile) as { bin?: string | Record<string, string> };
        const relative = typeof pkg.bin === 'string' ? pkg.bin : pkg.bin?.ace;
        if (relative) return path.resolve(path.dirname(packageFile), relative);
    } catch { /* Fall back to an ace command on PATH. */ }
    return 'ace';
}

async function runAxe(output: string): Promise<ReportCheck> {
    try { require.resolve('axe-core/axe.min.js'); } catch {
        return { name: 'axe', status: 'skipped', detail: 'axe-core is not installed.' };
    }
    const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'webbook-axe-report-'));
    const reportFile = path.join(temp, 'report.json');
    const convertRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
    try {
        const result = await run(process.execPath,
            [path.join(convertRoot, 'scripts', 'check-accessibility.mjs'), output, '--report', reportFile]);
        if (await fs.pathExists(reportFile)) {
            const axe = await fs.readJson(reportFile) as { checked?: number; rules?: unknown[] };
            const rules = axe.rules?.length ?? 0;
            return {
                name: 'axe', status: rules ? 'issues' : 'passed',
                detail: `${axe.checked ?? 0} page states checked; ${rules} rule${rules === 1 ? '' : 's'} with violations.`
            };
        }
        const unavailable = /Chrome not found|Cannot find module|No converted books/i.test(result.output);
        return { name: 'axe', status: unavailable || result.missing ? 'skipped' : 'issues',
            detail: concise(result.output) || `axe check exited with status ${result.code}.` };
    } finally {
        await fs.remove(temp);
    }
}

function run(command: string, args: string[]): Promise<{ code: number; output: string; missing: boolean }> {
    return new Promise(resolve => {
        const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
        let output = '';
        child.stdout.on('data', chunk => { output += String(chunk); });
        child.stderr.on('data', chunk => { output += String(chunk); });
        child.on('error', error => resolve({ code: -1, output: error.message, missing: (error as NodeJS.ErrnoException).code === 'ENOENT' }));
        child.on('close', code => resolve({ code: code ?? -1, output, missing: false }));
    });
}

function concise(output: string): string {
    return output.replace(/\x1b\[[0-9;]*m/g, '').split(/\r?\n/).map(line => line.trim()).filter(Boolean).slice(-3).join(' ');
}
