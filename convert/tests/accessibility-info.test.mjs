import test from 'node:test';
import assert from 'node:assert/strict';
import { accessibilityInfoFromXml } from '../build/accessibility-info.js';

const opf = metadata => `<?xml version="1.0"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" xml:lang="en">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:language>en</dc:language>${metadata}</metadata>
</package>`;
const byHeading = sections => Object.fromEntries(sections.map(section => [section.heading, section.statements.map(statement => statement.text)]));

test('always shows ways of reading and conformance, with "no information" statements', () => {
    const info = byHeading(accessibilityInfoFromXml(opf('')));
    assert.deepEqual(Object.keys(info), ['Ways of reading', 'Conformance']);
    assert.deepEqual(info['Ways of reading'], [
        'No information about appearance modifiability is available',
        'No information about nonvisual reading is available'
    ]);
    assert.deepEqual(info.Conformance, ['No information is available']);
});

test('reads a fully described narrated book in the guide order', () => {
    const info = byHeading(accessibilityInfoFromXml(opf(`
        <meta property="schema:accessMode">textual</meta>
        <meta property="schema:accessMode">auditory</meta>
        <meta property="schema:accessModeSufficient">textual</meta>
        <meta property="schema:accessibilityFeature">displayTransformability</meta>
        <meta property="schema:accessibilityFeature">synchronizedAudioText</meta>
        <meta property="schema:accessibilityFeature">tableOfContents</meta>
        <meta property="schema:accessibilityFeature">pageNavigation</meta>
        <meta property="schema:accessibilityFeature">pageBreakMarkers</meta>
        <meta property="schema:accessibilityHazard">none</meta>
        <meta property="schema:accessibilitySummary">A summary.</meta>
        <meta property="dcterms:conformsTo">EPUB Accessibility 1.1 - WCAG 2.1 Level AA</meta>
        <meta property="a11y:certifiedBy" id="cert">DAISY Ace</meta>
        <meta property="dcterms:date" refines="#cert">2026-01-02</meta>`)));
    assert.deepEqual(Object.keys(info), ['Ways of reading', 'Conformance', 'Navigation', 'Hazards', 'Accessibility summary', 'Additional accessibility information']);
    assert.equal(info['Ways of reading'][1], 'All content can be read as read aloud speech or dynamic braille');
    assert.equal(info['Ways of reading'][2], 'All the content is available as prerecorded audio synchronized with text');
    assert.deepEqual(info.Conformance, [
        'The publication contains a conformance statement that it meets the EPUB Accessibility and WCAG 2 Level AA standard',
        'This publication claims to meet EPUB Accessibility 1.1 Web Content Accessibility Guidelines (WCAG) 2.1 Level AA',
        'The publication was certified by DAISY Ace',
        'The publication was certified on 2026-01-02'
    ]);
    assert.deepEqual(info.Navigation, [
        'Page list to go to pages from the print source version',
        'Table of contents to all chapters of the text via links'
    ]);
    assert.deepEqual(info.Hazards, ['The publication contains no hazards']);
});

test('reads EPUB Accessibility 1.0 conformance links', () => {
    const info = byHeading(accessibilityInfoFromXml(opf(
        '<link rel="dcterms:conformsTo" href="http://www.idpf.org/epub/a11y/accessibility-20170105.html#wcag-a"/>')));
    assert.equal(info.Conformance[1], 'This publication claims to meet EPUB Accessibility 1.0 Web Content Accessibility Guidelines (WCAG) 2.0 Level A');
});
