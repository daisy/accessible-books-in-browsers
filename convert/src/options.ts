// The converter's options, listed once (user, 2026-11-18). The command line (index.ts) registers
// its options from this list, and the browser converter (converter/page.js) builds its form from
// it, so a new option or a changed default appears in both. Each option says how it appears on the
// web page, or why it doesn't. No Node imports: the browser converter bundles this file.

// The reader update channel the converter uses: one channel per reader contract (v0 for contract 0)
export const UI_CHANNEL_VERSION = 'v0';

export type WebGroup = 'reader' | 'narration' | 'pages' | 'advanced';

export type WebControl =
    // A checkbox for a boolean option
    | { kind: 'checkbox'; group: WebGroup; label: string; hint: string }
    // A text field; empty means the option isn't given
    | { kind: 'text'; group: WebGroup; label: string; hint: string }
    // Radio buttons for a boolean option with two named answers
    | { kind: 'choice'; group: WebGroup; label: string; hint: string;
        choices: Array<{ value: boolean; label: string; hint: string }> }
    // Checkboxes for a list option. The form disables them when the parent option is off.
    | { kind: 'list'; group: WebGroup; label: string; hint: string; parent: string;
        items: Array<{ value: string; label: string }> };

export type ConverterOption = {
    // The option's name in the parsed command line and in ConvertOptions
    key: string;
    // Its flag, with any argument ('--language <tag>'); absent when only the negation exists
    flag?: string;
    help?: string;
    defaultValue?: boolean;
    // The --no-… form of a boolean that is on by default
    negation?: { flag: string; help: string };
    // How the option appears on the converter page, or why it doesn't
    web: WebControl | { omitted: string };
};

export const AUDIO_ENHANCEMENT_LABELS: Array<{ value: string; label: string }> = [
    { value: 'warm-eq', label: 'Warm tone (gentle equalizer)' },
    { value: 'compression', label: 'Compression (steadier volume)' },
    { value: 'noise', label: 'Noise reduction' },
    { value: 'deess', label: 'De-essing (softer “s” sounds)' },
    { value: 'declick', label: 'Click removal' }
];

// The web page's groups, in order
export const WEB_GROUPS: Array<{ id: WebGroup; legend: string; hint?: string }> = [
    { id: 'reader', legend: 'Reader updates', hint: 'How the book gets the reader: the toolbars, settings, narration controls and so on. The book’s text never changes.' },
    { id: 'narration', legend: 'Narration' },
    { id: 'pages', legend: 'Appearance and pages' },
    { id: 'advanced', legend: 'Advanced' }
];

// In the command line's order
export const CONVERTER_OPTIONS: ConverterOption[] = [
    {
        key: 'includeNonLinear', flag: '--include-non-linear',
        help: 'Include OPF spine items marked linear="no" in the generated reading order',
        web: { kind: 'checkbox', group: 'advanced', label: 'Include non-linear pages in the reading order', hint: 'Pages the EPUB marks as outside the main reading order, such as answer keys or pop-ups.' }
    },
    {
        key: 'identifier', flag: '--identifier <id>',
        help: "Book ID used to key saved reading positions; defaults to the EPUB's identifier",
        web: { kind: 'text', group: 'advanced', label: 'Book ID', hint: 'Leave empty to use the EPUB’s identifier. Reading positions and bookmarks are kept per book ID, so keep it the same when you convert the book again.' }
    },
    {
        key: 'audioCache', flag: '--audio-cache [dir]',
        help: "Reuse each page's merged narration audio from an earlier conversion when its clips haven't changed (development convenience). Keeps the latest audio per page in dir, or in the system temp folder if no dir is given",
        web: { omitted: 'A development convenience that needs a folder on disk.' }
    },
    // Small audio and every enhancement are the defaults (user, 2026-11-11): what the demos use
    {
        key: 'smallAudio', flag: '--small-audio', defaultValue: true,
        help: 'Encode narration for smaller downloads: mono 24 kHz MP3 at 32 kb/s',
        negation: { flag: '--no-small-audio', help: "Keep narration's source encoding settings (channels, sample rate, bitrate)" },
        web: { kind: 'checkbox', group: 'narration', label: 'Smaller audio files', hint: 'Mono MP3 at 24 kHz and 32 kb/s: quicker to download and save offline. Turn off to keep the narration’s own quality.' }
    },
    {
        key: 'audioCleanup', flag: '--audio-cleanup', defaultValue: true,
        help: 'Smooth joins, remove rumble, and normalize narration loudness',
        negation: { flag: '--no-audio-cleanup', help: 'Do not smooth joins, remove rumble, or normalize narration loudness' },
        web: { kind: 'checkbox', group: 'narration', label: 'Clean up the narration', hint: 'Smooths the joins between clips, removes low rumble, softens “p” and “b” pops and evens out loudness. Untick to keep the narration as recorded.' }
    },
    {
        key: 'audioEnhance', flag: '--audio-enhance <list>',
        help: 'Comma-separated narration filters: warm-eq, compression, noise, deess, declick (default: all), or none',
        web: { kind: 'list', group: 'narration', parent: 'audioCleanup', label: 'Extra enhancements', hint: 'Optional, on top of the cleanup, and only with it. Untick them all to clean up without changing the voice’s tone.', items: AUDIO_ENHANCEMENT_LABELS }
    },
    {
        key: 'headingTitles', flag: '--heading-titles', defaultValue: true,
        help: "On by default: when every page's <title> is the book title, title each page by its first other heading",
        negation: { flag: '--no-heading-titles', help: 'Do not replace repeated book titles with heading titles' },
        web: { kind: 'checkbox', group: 'pages', label: 'Title pages by their headings', hint: 'When every page has the book title as its own title, change the page title to be the first heading on that page.' }
    },
    {
        key: 'splitChapters', flag: '--split-chapters', defaultValue: true,
        help: 'On by default: split a content document into a page per chapter where the table of contents points into it',
        negation: { flag: '--no-split-chapters', help: 'Keep each content document as one page, even when the table of contents points to places inside it' },
        web: { kind: 'checkbox', group: 'pages', label: 'Split long documents into chapters', hint: 'Where the table of contents points to places inside one document, make a page for each. Untick to keep each document as one page.' }
    },
    {
        key: 'language', flag: '--language <tag>',
        help: "Override the EPUB's declared BCP 47 language",
        web: { kind: 'text', group: 'advanced', label: 'Language', hint: 'Leave empty to use the book’s own. A language tag such as en, fr-CA or bn.' }
    },
    {
        key: 'publisherStyles', defaultValue: true,
        negation: { flag: '--no-publisher-styles', help: 'Omit publisher stylesheets and the Appearance group' },
        web: { kind: 'checkbox', group: 'pages', label: 'Include the publisher’s styles', hint: 'Readers can switch each book between their own settings and the book as published.' }
    },
    {
        key: 'check', flag: '--check',
        help: 'Run optional Ace and axe accessibility checks when their tools are available',
        web: { omitted: 'Ace and axe are command-line tools; the browser can’t run them.' }
    },
    // Reader updates from the beta channel by default, never silently (user, 2026-11-17)
    {
        key: 'remoteUi', flag: '--remote-ui', defaultValue: true,
        help: `Get reader updates from the ${UI_CHANNEL_VERSION} update channel (default); keep the source EPUB`,
        negation: { flag: '--no-remote-ui', help: 'Choose a fixed bundled reader instead of receiving channel updates' },
        web: { kind: 'choice', group: 'reader', label: 'Reader updates', hint: '', choices: [
            { value: true, label: 'Keep the reader up to date (recommended)', hint: `The book loads the latest reader from the ${UI_CHANNEL_VERSION} update channel when it’s online, and uses its own copy when it isn’t, or if the channel is unavailable. The channel’s address may change during the beta.` },
            { value: false, label: 'Always use the reader included in the book', hint: 'The book never loads anything from elsewhere. It keeps today’s reader; newer features need converting again.' }
        ] }
    },
    {
        key: 'uiBaseUrl', flag: '--ui-base-url <url>',
        help: 'Get reader updates from this update channel (a directory URL) instead',
        web: { omitted: `The page always uses the ${UI_CHANNEL_VERSION} update channel.` }
    }
];
