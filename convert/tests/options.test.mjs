import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CONVERTER_OPTIONS, WEB_GROUPS, AUDIO_ENHANCEMENT_LABELS } from '../build/options.js';
import { AUDIO_ENHANCEMENTS } from '../build/audio-cleanup.js';

test('the options list is complete and consistent for the command line and the browser converter', () => {
    const keys = CONVERTER_OPTIONS.map(option => option.key);
    assert.equal(new Set(keys).size, keys.length, 'each option once');
    const groups = new Set(WEB_GROUPS.map(group => group.id));
    for (const option of CONVERTER_OPTIONS) {
        assert(option.flag || option.negation, `${option.key} has a flag`);
        if (option.negation) assert.match(option.negation.flag, /^--no-/);
        if ('omitted' in option.web) { assert(option.web.omitted.trim(), `${option.key} says why it isn't on the page`); continue; }
        assert(groups.has(option.web.group), `${option.key}'s group exists`);
        assert(option.web.label.trim(), `${option.key} has a label`);
        if (option.web.kind === 'list') {
            const parent = CONVERTER_OPTIONS.find(other => other.key === option.web.parent);
            assert.equal(parent?.web.kind, 'checkbox', `${option.key}'s parent is a checkbox`);
        }
        if (option.web.kind === 'choice') assert.deepEqual(option.web.choices.map(choice => choice.value).sort(), [false, true]);
    }
    assert.deepEqual(AUDIO_ENHANCEMENT_LABELS.map(item => item.value), [...AUDIO_ENHANCEMENTS], 'the page offers exactly the converter\'s enhancements');
});
