import xpath from 'xpath';
import { DOMParser } from 'xmldom';
import * as fileio from './file-io.js';

// The publication's own accessibility claims, as the W3C Accessibility Metadata Display Guide for
// Digital Publications 2.0 says to present them (Final Community Group Report, 22 April 2025:
// https://w3c.github.io/cg-reports/publishingcg/CG-FINAL-a11y-display-guidelines-20250422/ and
// its EPUB techniques). Statements use the guide's descriptive wording and its section order.
// They describe the source EPUB, so the About panel says they're the publisher's.

export type AccessibilitySection = {
    heading: string;
    statements: Array<{ text: string; href?: string; lang?: string }>;
};

const select = xpath.useNamespaces({ opf: 'http://www.idpf.org/2007/opf' });

type A11yMetadata = {
    features: Set<string>;
    accessModes: string[];
    accessModesSufficient: string[];
    hazards: Set<string>;
    summary: string;
    summaryLang: string;
    prePaginated: boolean;
    conformsTo: string[];
    certifiedBy: string;
    certifierCredential: string;
    certificationDate: string;
    certifierReport: string;
    exemptions: string[];
};

async function readAccessibilityInfo(packageFilename: string): Promise<AccessibilitySection[]> {
    const doc = await fileio.parse(packageFilename);
    return accessibilitySections(readMetadata(doc));
}

function accessibilityInfoFromXml(packageXml: string): AccessibilitySection[] {
    return accessibilitySections(readMetadata(new DOMParser().parseFromString(packageXml) as unknown as Document));
}

function readMetadata(doc: Document): A11yMetadata {
    const metas = select('//opf:metadata/opf:meta', doc) as unknown as Element[];
    const links = select('//opf:metadata/opf:link', doc) as unknown as Element[];
    // EPUB 3 <meta property> text, and EPUB 2 <meta name content>
    const values = (property: string) => metas.flatMap(meta => {
        if (meta.getAttribute('property') === property) return [(meta.textContent ?? '').trim()];
        if (meta.getAttribute('name') === property) return [(meta.getAttribute('content') ?? '').trim()];
        return [];
    }).filter(Boolean);
    const list = (property: string) => values(property).flatMap(value => value.split(',').map(item => item.trim())).filter(Boolean);
    const linkHrefs = (rel: string) => links
        .filter(link => (link.getAttribute('rel') ?? '').split(/\s+/).includes(rel))
        .map(link => link.getAttribute('href') ?? '').filter(Boolean);

    const summaryMeta = metas.find(meta => meta.getAttribute('property') === 'schema:accessibilitySummary'
        || meta.getAttribute('name') === 'schema:accessibilitySummary');
    const packageElm = doc.documentElement;
    const metadataElm = select('//opf:metadata', doc)[0] as Element | undefined;
    const langOf = (elm: Element | null | undefined) => elm?.getAttribute('xml:lang') || elm?.getAttribute('lang') || '';
    const firstLanguage = ((select('//opf:metadata/*[local-name()="language"]', doc) as unknown as Element[])[0]?.textContent ?? '').trim();

    const certifier = metas.find(meta => meta.getAttribute('property') === 'a11y:certifiedBy');
    const certifierId = certifier?.getAttribute('id');
    const certificationDate = certifierId
        ? (metas.find(meta => meta.getAttribute('property') === 'dcterms:date' && meta.getAttribute('refines') === `#${certifierId}`)?.textContent ?? '').trim()
        : '';

    return {
        features: new Set(list('schema:accessibilityFeature')),
        accessModes: list('schema:accessMode'),
        accessModesSufficient: values('schema:accessModeSufficient'),
        hazards: new Set(list('schema:accessibilityHazard')),
        summary: summaryMeta ? (summaryMeta.textContent || summaryMeta.getAttribute('content') || '').trim() : '',
        summaryLang: langOf(summaryMeta) || langOf(metadataElm) || langOf(packageElm) || firstLanguage,
        prePaginated: values('rendition:layout').includes('pre-paginated'),
        conformsTo: [...values('dcterms:conformsTo'), ...linkHrefs('dcterms:conformsTo')],
        certifiedBy: (certifier?.textContent ?? '').trim(),
        certifierCredential: values('a11y:certifierCredential')[0] ?? '',
        certificationDate,
        certifierReport: linkHrefs('a11y:certifierReport')[0] ?? '',
        exemptions: list('a11y:exemption')
    };
}

function accessibilitySections(m: A11yMetadata): AccessibilitySection[] {
    const sections: AccessibilitySection[] = [];
    const add = (heading: string, texts: string[]) => {
        if (texts.length) sections.push({ heading, statements: texts.map(text => ({ text })) });
    };

    add('Ways of reading', waysOfReading(m));
    sections.push(conformance(m));
    add('Navigation', navigation(m));
    add('Rich content', richContent(m));
    add('Hazards', hazards(m));
    if (m.summary) {
        sections.push({ heading: 'Accessibility summary', statements: [{ text: m.summary, lang: m.summaryLang }] });
    }
    if (m.exemptions.some(value => ['eaa-disproportionate-burden', 'eaa-fundamental-alteration', 'eaa-microenterprise'].includes(value))) {
        add('Legal considerations', ['This publication claims an accessibility exemption in some jurisdictions']);
    }
    add('Additional accessibility information', additionalInformation(m));
    return sections;
}

// Always shown, even with no metadata (guide 3.1)
function waysOfReading(m: A11yMetadata): string[] {
    const out: string[] = [];
    const has = (feature: string) => m.features.has(feature);

    if (has('displayTransformability')) {
        out.push('Appearance of the text and page layout can be modified according to the capabilities of the reading system (font family and font size, spaces between paragraphs, sentences, words, and letters, as well as color of background and text)');
    } else if (m.prePaginated) {
        out.push('Text and page layout cannot be modified as the reading experience is close to a print version, but reading systems can still provide zooming options');
    } else {
        out.push('No information about appearance modifiability is available');
    }

    const onlyMode = (mode: string) => m.accessModes.length > 0 && m.accessModes.every(value => value === mode);
    const sufficientIsTextual = m.accessModesSufficient.some(value => value.split(',').map(item => item.trim()).join(',') === 'textual');
    const allTextual = onlyMode('textual') || sufficientIsTextual;
    const someText = m.accessModes.includes('textual')
        || m.accessModesSufficient.some(value => value.split(',').map(item => item.trim()).includes('textual'));
    const textualAlternatives = ['longDescription', 'alternativeText', 'describedMath', 'transcript'].some(has);
    if (allTextual) out.push('All content can be read as read aloud speech or dynamic braille');
    else if (someText || textualAlternatives) out.push('Not all of the content will be readable as read aloud speech or dynamic braille');
    else if (onlyMode('auditory') || (onlyMode('visual') && !someText)) out.push('The content is not readable as read aloud speech or dynamic braille');
    else out.push('No information about nonvisual reading is available');
    if (textualAlternatives) out.push('Has alternative text descriptions for images');

    if (has('synchronizedAudioText')) out.push('All the content is available as prerecorded audio synchronized with text');
    else if (m.accessModesSufficient.some(value => value.trim() === 'auditory')) out.push('Audiobook with no text alternative');
    else if (m.accessModes.includes('auditory')) out.push('Prerecorded audio clips are embedded in the content');
    return out;
}

// Always shown (guide 3.2)
function conformance(m: A11yMetadata): AccessibilitySection {
    let epub = '';
    let wcag = '';
    let level = '';
    for (const claim of m.conformsTo) {
        const v11 = claim.match(/EPUB Accessibility 1\.1 - WCAG (2\.[0-2]) Level (A+)/);
        if (v11) {
            [epub, wcag, level] = ['1.1', v11[1], v11[2]];
            break;
        }
        const v10 = claim.match(/idpf\.org\/epub\/a11y\/accessibility-20170105\.html#wcag-(a+)\b/i);
        if (v10) {
            [epub, wcag, level] = ['1.0', '2.0', v10[1].toUpperCase()];
            break;
        }
    }
    const statements: AccessibilitySection['statements'] = [];
    if (!epub) {
        statements.push({ text: 'No information is available' });
    } else {
        statements.push({ text: {
            AAA: 'The publication contains a conformance statement that it meets the EPUB Accessibility and WCAG 2 Level AAA standard',
            AA: 'The publication contains a conformance statement that it meets the EPUB Accessibility and WCAG 2 Level AA standard',
            A: 'The publication contains a conformance statement that it meets the EPUB Accessibility and WCAG 2 Level A standard'
        }[level] ?? 'Conformance to accepted standards for accessibility of this publication cannot be determined' });
        statements.push({ text: `This publication claims to meet EPUB Accessibility ${epub} Web Content Accessibility Guidelines (WCAG) ${wcag} Level ${level}` });
    }
    if (m.certifiedBy) statements.push({ text: `The publication was certified by ${m.certifiedBy}` });
    if (m.certifierCredential) {
        statements.push(/^https?:/.test(m.certifierCredential)
            ? { text: `The certifier's credential is ${m.certifierCredential}`, href: m.certifierCredential }
            : { text: `The certifier's credential is ${m.certifierCredential}` });
    }
    if (m.certificationDate) statements.push({ text: `The publication was certified on ${m.certificationDate}` });
    if (m.certifierReport) statements.push({ text: "For more information refer to the certifier's report", href: m.certifierReport });
    return { heading: 'Conformance', statements };
}

function navigation(m: A11yMetadata): string[] {
    return [
        ['pageNavigation', 'Page list to go to pages from the print source version'],
        ['structuralNavigation', 'Elements such as headings, tables, etc for structured navigation'],
        ['index', 'Index with links to referenced entries'],
        ['tableOfContents', 'Table of contents to all chapters of the text via links']
    ].filter(([feature]) => m.features.has(feature)).map(([, text]) => text);
}

function richContent(m: A11yMetadata): string[] {
    return [
        ['longDescriptions', 'Information-rich images are described by extended descriptions'],
        ['latex-chemistry', 'Chemical formulas in accessible format (LaTeX)'],
        ['MathML-chemistry', 'Chemical formulas in accessible format (MathML)'],
        ['describedMath', 'Text descriptions of math are provided'],
        ['latex', 'Math formulas in accessible format (LaTeX)'],
        ['MathML', 'Math formulas in accessible format (MathML)'],
        ['closedCaptions', 'Videos included in publications have closed captions'],
        ['openCaptions', 'Videos included in publications have open captions'],
        ['transcript', 'Transcript(s) provided']
    ].filter(([feature]) => m.features.has(feature)).map(([, text]) => text);
}

function hazards(m: A11yMetadata): string[] {
    const has = (hazard: string) => m.hazards.has(hazard);
    if (has('none') || (has('noFlashingHazard') && has('noMotionSimulationHazard') && has('noSoundHazard'))) {
        return ['The publication contains no hazards'];
    }
    if (has('unknown') || (has('unknownFlashingHazard') && has('unknownMotionSimulationHazard') && has('unknownSoundHazard'))) {
        return ['The presence of hazards is unknown'];
    }
    return [
        ['flashing', 'The publication contains flashing content that can cause photosensitive seizures'],
        ['motionSimulation', 'The publication contains motion simulations that can cause motion sickness'],
        ['sound', 'The publication contains sounds that can cause sensitivity issues'],
        ['unknownFlashingHazard', 'The presence of flashing content that can cause photosensitive seizures could not be determined'],
        ['unknownMotionSimulationHazard', 'The presence of motion simulations that can cause motion sickness could not be determined'],
        ['unknownSoundHazard', 'The presence of sounds that can cause sensitivity issues could not be determined'],
        ['noFlashingHazard', 'The publication does not contain flashing content that can cause photosensitive seizures'],
        ['noMotionSimulationHazard', 'The publication does not contain motion simulations that can cause motion sickness'],
        ['noSoundHazard', 'The publication does not contain sounds that can cause sensitivity issues']
    ].filter(([hazard]) => has(hazard)).map(([, text]) => text);
}

function additionalInformation(m: A11yMetadata): string[] {
    return [
        ['pageBreakMarkers', 'Page breaks included from the original print source'],
        ['aria', 'Content is enhanced with ARIA roles to optimize organization and facilitate navigation'],
        ['audioDescription', 'Audio descriptions'],
        ['braille', 'Braille'],
        ['fullRubyAnnotations', 'Full ruby annotations'],
        ['highContrastAudio', 'High contrast between foreground and background audio'],
        ['highContrastDisplay', 'High contrast between foreground text and background'],
        ['largePrint', 'Large print'],
        ['rubyAnnotations', 'Some Ruby annotations'],
        ['signLanguage', 'Sign language'],
        ['tactileGraphic', 'Tactile graphics have been integrated to facilitate access to visual elements for blind people'],
        ['tactileObject', 'Tactile 3D objects'],
        ['ttsMarkup', 'Text-to-speech hinting provided']
    ].filter(([feature]) => m.features.has(feature)).map(([, text]) => text);
}

export { accessibilityInfoFromXml, readAccessibilityInfo };
