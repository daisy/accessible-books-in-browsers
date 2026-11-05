import { Command } from 'commander';
import path from 'path';
import { convert } from './convert.js';

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
        .option('--heading-titles', "On by default: when every page's <title> is the book title, title each page by its first other heading", true)
        .option('--no-heading-titles', 'Do not replace repeated book titles with heading titles')
        .action(async(input, output, template, options: { headingTitles: boolean, identifier?: string, includeNonLinear?: boolean, splitChapters: boolean }) => {
            const identifier = options.identifier?.trim();
            if (options.identifier !== undefined && !identifier) {
                throw new Error('--identifier must not be empty');
            }
            await convert(
                path.resolve(process.cwd(), input),
                path.resolve(process.cwd(), output),
                path.resolve(process.cwd(), template),
                {
                    headingTitles: options.headingTitles,
                    identifier,
                    includeNonLinear: options.includeNonLinear === true,
                    splitChapters: options.splitChapters
                }
            );
        });
    program.parse(process.argv);
}

(async () => await main())();
