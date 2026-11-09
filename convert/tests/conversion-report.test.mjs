import assert from 'node:assert/strict';
import { test } from 'node:test';
import { reportMarkdown } from '../build/conversion-report.js';

test('Markdown groups every warning kind into one line per page with limited examples', () => {
    const markdown = reportMarkdown({
        version: 1,
        language: { declared: 'en', effective: 'en' },
        options: {}, changes: [], checks: [],
        warnings: [1, 2, 3, 4].map(number => ({
            kind: 'Paragraphs resembling list items', page: 'chapter.html', message: `Example ${number}`
        }))
    });
    const lines = markdown.split('\n').filter(line => line.startsWith('- chapter.html:'));
    assert.equal(lines.length, 1);
    assert.match(lines[0], /4 findings/);
    assert.match(lines[0], /Example 1; Example 2; Example 3; and 1 more/);
});
