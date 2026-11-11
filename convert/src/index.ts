import { Command } from 'commander';
import path from 'path';
import { convert } from './convert.js';
import { parseAudioEnhancements, type AudioEnhancement } from './audio-cleanup.js';

async function main() {
    let program = new Command();
    program
        .command("convert")
        .description("Convert an EPUB to a book for the web")
        .argument('input', "Input EPUB file or directory")
        .argument('output', "Output directory")
        .argument('template', "Directory containing template files")
        .option('--include-non-linear', 'Include OPF spine items marked linear="no" in the generated reading order')
        .option('--identifier <id>', "Book ID used to key saved reading positions; defaults to the EPUB's identifier")
        .option('--split-chapters', "Split a content document that holds several chapters into one page per chapter, at the table of contents' entries", true)
        .option('--no-split-chapters', 'Do not split content documents into chapter pages')
        .option('--audio-cache [dir]', "Reuse each page's merged narration audio from an earlier conversion when its clips haven't changed (development convenience). Keeps the latest audio per page in dir, or in the system temp folder if no dir is given")
        .option('--small-audio', 'Encode narration for smaller downloads: mono 24 kHz MP3 at 32 kb/s')
        .option('--audio-cleanup', 'Smooth joins, remove rumble, and normalize narration loudness', true)
        .option('--no-audio-cleanup', 'Do not smooth joins, remove rumble, or normalize narration loudness')
        .option('--audio-enhance <list>', 'Optional comma-separated narration filters: warm-eq, compression, noise, deess, declick')
        .option('--heading-titles', "On by default: when every page's <title> is the book title, title each page by its first other heading", true)
        .option('--no-heading-titles', 'Do not replace repeated book titles with heading titles')
        .option('--language <tag>', "Override the EPUB's declared BCP 47 language")
        .option('--markup-cleanup', 'Apply safe accessibility-preserving markup repairs', true)
        .option('--no-markup-cleanup', 'Leave publication markup unchanged')
        .option('--responsive-tables', 'Wrap publication tables for horizontal scrolling when needed', true)
        .option('--no-responsive-tables', 'Do not add responsive table wrappers')
        .option('--check', 'Run optional Ace and axe accessibility checks when their tools are available')
        .option('--keep-all-ids', 'Keep every id from the EPUB instead of retaining only structures and referenced ids')
        .action(async(input, output, template, options: { audioCache?: string | boolean, audioCleanup: boolean, audioEnhance?: string, check?: boolean, headingTitles: boolean, identifier?: string, includeNonLinear?: boolean, language?: string, markupCleanup: boolean, responsiveTables: boolean, smallAudio?: boolean, splitChapters: boolean, keepAllIds?: boolean }) => {
            const identifier = options.identifier?.trim();
            if (options.identifier !== undefined && !identifier) {
                throw new Error('--identifier must not be empty');
            }
            const language = options.language === undefined ? undefined : canonicalLanguage(options.language);
            const audioEnhance: AudioEnhancement[] = options.audioEnhance === undefined
                ? [] : parseAudioEnhancements(options.audioEnhance);
            if (!options.audioCleanup && audioEnhance.length) {
                throw new Error('--audio-enhance cannot be used with --no-audio-cleanup');
            }
            await convert(
                path.resolve(process.cwd(), input),
                path.resolve(process.cwd(), output),
                path.resolve(process.cwd(), template),
                {
                    audioCache: options.audioCache,
                    audioCleanup: options.audioCleanup,
                    audioEnhance,
                    headingTitles: options.headingTitles,
                    identifier,
                    includeNonLinear: options.includeNonLinear === true,
                    splitChapters: options.splitChapters,
                    keepAllIds: options.keepAllIds === true,
                    language,
                    markupCleanup: options.markupCleanup,
                    responsiveTables: options.responsiveTables,
                    smallAudio: options.smallAudio === true,
                    check: options.check === true
                }
            );
        });
    program.parse(process.argv);
}

function canonicalLanguage(value: string): string {
    const tag = value.trim();
    if (!tag) throw new Error('--language must not be empty');
    try { return Intl.getCanonicalLocales(tag)[0]; } catch { throw new Error(`Invalid BCP 47 language tag: ${value}`); }
}

(async () => await main())();
