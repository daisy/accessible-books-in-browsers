import { Command } from 'commander';
import path from 'path';
import { convert } from './convert.js';
import { AUDIO_ENHANCEMENTS, parseAudioEnhancements, type AudioEnhancement } from './audio-cleanup.js';
import { CONVERTER_OPTIONS } from './options.js';

async function main() {
    let program = new Command();
    const command = program
        .command("convert")
        .description("Convert an EPUB to a book for the web")
        .argument('input', "Input EPUB file or directory")
        .argument('output', "Output directory")
        .argument('template', "Directory containing template files");
    // The options are listed once, in options.ts, which the browser converter's form also uses
    for (const option of CONVERTER_OPTIONS) {
        if (option.flag) command.option(option.flag, option.help ?? '', option.defaultValue as boolean | undefined);
        if (option.negation) command.option(option.negation.flag, option.negation.help);
    }
    command
        .addHelpText('after', '\nKeep the source EPUB. A new reader contract requires reconverting from it; there is no book upgrader.\n')
        .action(async(input, output, template, options: { remoteUi?: boolean, uiBaseUrl?: string, audioCache?: string | boolean, audioCleanup: boolean, audioEnhance?: string, check?: boolean, headingTitles: boolean, identifier?: string, includeNonLinear?: boolean, language?: string, publisherStyles: boolean, smallAudio?: boolean, splitChapters: boolean }) => {
            const identifier = options.identifier?.trim();
            if (options.identifier !== undefined && !identifier) {
                throw new Error('--identifier must not be empty');
            }
            const language = options.language === undefined ? undefined : canonicalLanguage(options.language);
            const audioEnhance: AudioEnhancement[] = options.audioEnhance === undefined
                ? (options.audioCleanup ? [...AUDIO_ENHANCEMENTS] : []) : parseAudioEnhancements(options.audioEnhance);
            if (!options.audioCleanup && audioEnhance.length) {
                throw new Error('--audio-enhance cannot be used with --no-audio-cleanup');
            }
            await convert(
                path.resolve(process.cwd(), input),
                path.resolve(process.cwd(), output),
                path.resolve(process.cwd(), template),
                {
                    audioCache: options.audioCache,
                    remoteUi: options.remoteUi,
                    uiBaseUrl: options.uiBaseUrl,
                    audioCleanup: options.audioCleanup,
                    audioEnhance,
                    headingTitles: options.headingTitles,
                    identifier,
                    includeNonLinear: options.includeNonLinear === true,
                    publisherStyles: options.publisherStyles,
                    language,
                    smallAudio: options.smallAudio === true,
                    splitChapters: options.splitChapters,
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
