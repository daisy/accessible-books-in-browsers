import fs from 'fs-extra';
import type { OutputPaths } from './output.js';
import { outputPath } from './output.js';

export type ReportWarning = {
    kind: string;
    page?: string;
    message: string;
};

export type ReportCheck = {
    name: 'Ace' | 'axe';
    status: 'not requested' | 'passed' | 'issues' | 'skipped';
    detail: string;
};

export type ConversionReportData = {
    version: 1;
    language: { declared: string; override?: string; effective: string };
    options: Record<string, string | boolean>;
    changes: Array<{ kind: string; count: number; pages: Record<string, number> }>;
    warnings: ReportWarning[];
    checks: ReportCheck[];
};

export class ConversionReport {
    private readonly changes = new Map<string, Map<string, number>>();
    readonly warnings: ReportWarning[] = [];
    readonly checks: ReportCheck[] = [];
    private images = 0;
    private emptyAltImages = 0;
    private missingAltImages = 0;
    private bookLetters = 0;
    private bookExpectedLetters = 0;

    constructor(
        readonly language: ConversionReportData['language'],
        readonly options: ConversionReportData['options']
    ) {}

    change(kind: string, page: string, count = 1): void {
        if (count <= 0) return;
        const pages = this.changes.get(kind) ?? new Map<string, number>();
        pages.set(page, (pages.get(page) ?? 0) + count);
        this.changes.set(kind, pages);
    }

    warning(kind: string, message: string, page?: string): void {
        this.warnings.push({ kind, ...(page ? { page } : {}), message });
    }

    addImages(total: number, emptyAlt: number, missingAlt: number): void {
        this.images += total;
        this.emptyAltImages += emptyAlt;
        this.missingAltImages += missingAlt;
    }

    addBookScript(letters: number, expectedLetters: number): void {
        this.bookLetters += letters;
        this.bookExpectedLetters += expectedLetters;
    }

    finishBookWarnings(): void {
        if (this.images >= 5 && this.emptyAltImages / this.images >= .9) {
            this.warning('Decorative images',
                `${this.emptyAltImages} of ${this.images} images (${Math.round(this.emptyAltImages / this.images * 100)}%) have empty alternative text; review whether they are all decorative.`);
        }
        if (this.missingAltImages) {
            this.warning('Images without alt', `${this.missingAltImages} image${this.missingAltImages === 1 ? '' : 's'} have no alt attribute.`);
        }
        if (this.bookLetters >= 10 && this.bookExpectedLetters / this.bookLetters < .5) {
            this.warning('Book language',
                `The dominant script of the book's text does not match ${this.language.effective}; review the metadata or use --language.`);
        }
    }

    data(): ConversionReportData {
        return {
            version: 1,
            language: this.language,
            options: this.options,
            changes: Array.from(this.changes, ([kind, pages]) => ({
                kind,
                count: Array.from(pages.values()).reduce((sum, count) => sum + count, 0),
                pages: Object.fromEntries(pages)
            })).sort((a, b) => a.kind.localeCompare(b.kind)),
            warnings: this.warnings,
            checks: this.checks
        };
    }
}

export async function writeConversionReport(report: ConversionReport, paths: OutputPaths): Promise<void> {
    const data = report.data();
    await fs.writeJson(outputPath(paths, 'conversion-report.json'), data, { spaces: 2 });
    await fs.writeFile(outputPath(paths, 'conversion-report.md'), reportMarkdown(data));
}

export function reportMarkdown(data: ConversionReportData): string {
    const changeCount = data.changes.reduce((sum, change) => sum + change.count, 0);
    const lines = [
        '# Conversion report', '',
        `Changes: ${changeCount}. Warnings for review: ${data.warnings.length}. Optional checks: ${checkSummary(data.checks)}.`, '',
        '## Options used', '',
        `- Declared language: ${data.language.declared || 'none'}`,
        `- Effective language: ${data.language.effective}`,
        ...(data.language.override ? [`- Language override: ${data.language.override}`] : []),
        ...Object.entries(data.options).map(([name, value]) => `- ${name}: ${String(value)}`), '',
        `## Changes (${changeCount})`, ''
    ];
    if (!data.changes.length) lines.push('No markup changes.', '');
    for (const change of data.changes) {
        lines.push(`### ${change.kind} (${change.count})`, '');
        for (const [page, count] of Object.entries(change.pages)) lines.push(`- ${page}: ${count}`);
        lines.push('');
    }
    lines.push(`## Warnings (${data.warnings.length})`, '');
    if (!data.warnings.length) lines.push('No warnings.', '');
    const byKind = new Map<string, ReportWarning[]>();
    for (const warning of data.warnings) byKind.set(warning.kind, [...(byKind.get(warning.kind) ?? []), warning]);
    for (const [kind, warnings] of byKind) {
        lines.push(`### ${kind} (${warnings.length})`, '');
        const byPage = new Map<string, ReportWarning[]>();
        for (const warning of warnings) {
            const page = warning.page ?? '';
            byPage.set(page, [...(byPage.get(page) ?? []), warning]);
        }
        for (const [page, pageWarnings] of byPage) {
            const examples = pageWarnings.slice(0, 3).map(warning => warning.message);
            const more = pageWarnings.length > examples.length ? `; and ${pageWarnings.length - examples.length} more` : '';
            lines.push(`- ${page ? `${page}: ` : ''}${pageWarnings.length} finding${pageWarnings.length === 1 ? '' : 's'} — ${examples.join('; ')}${more}`);
        }
        lines.push('');
    }
    lines.push('## Optional checks', '');
    for (const check of data.checks) lines.push(`- ${check.name}: ${check.status}. ${check.detail}`);
    lines.push('');
    return `${lines.join('\n')}\n`;
}

function checkSummary(checks: ReportCheck[]): string {
    if (!checks.length) return 'not requested';
    return checks.map(check => `${check.name} ${check.status}`).join(', ');
}
