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
        .action(async(input, output, template, options: { identifier?: string, includeNonLinear?: boolean }) => {
            const identifier = options.identifier?.trim();
            if (options.identifier !== undefined && !identifier) {
                throw new Error('--identifier must not be empty');
            }
            await convert(
                path.resolve(process.cwd(), input),
                path.resolve(process.cwd(), output),
                path.resolve(process.cwd(), template),
                {
                    identifier,
                    includeNonLinear: options.includeNonLinear === true
                }
            );
        });
    program.parse(process.argv);
}

(async () => await main())();
