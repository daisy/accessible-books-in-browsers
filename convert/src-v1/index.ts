import { Command } from 'commander';
import path from 'path';
import * as utils from './utils.js';
import { convert } from './convert.js';

async function main() {
    let program = new Command();
    program
        .command("convert")
        .description("convert an epub to a folder of html pages")
        .argument('input', "Input EPUB file or directory")
        .argument('outputDir', "Output directory")
        .argument('clientCodeDir', "Shared client code folder")
        .action(async(input, outputDir, clientCodeDir, options) => {
            await utils.ensureDirectory(outputDir);
            await convert(
                path.resolve(process.cwd(), input),
                path.resolve(process.cwd(), outputDir),
                clientCodeDir
            );
        });
    program.parse(process.argv);
}

(async () => await main())();