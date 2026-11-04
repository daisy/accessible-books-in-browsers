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
        .option('--heading-titles', "If there is more than one content document and every one's <title> is the book title, title each page by its first heading that isn't the book title")
        .action(async(input, output, template, options: { headingTitles?: boolean, identifier?: string, includeNonLinear?: boolean }) => {
            const identifier = options.identifier?.trim();
            if (options.identifier !== undefined && !identifier) {
                throw new Error('--identifier must not be empty');
            }
            await convert(
                path.resolve(process.cwd(), input),
                path.resolve(process.cwd(), output),
                path.resolve(process.cwd(), template),
                {
                    headingTitles: options.headingTitles === true,
                    identifier,
                    includeNonLinear: options.includeNonLinear === true
                }
            );
        });
    program.parse(process.argv);
}

(async () => await main())();
