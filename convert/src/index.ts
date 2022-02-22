import { Command } from 'commander';
import path from 'path';
import { shiftClipTimes } from './shift-smil.js';
import { addIds } from './add-ids.js';
import { selfAnchorHeadings } from './self-anchor-headings.js';
import fs from 'fs-extra';
import { applyTemplate } from './apply-template.js';
import * as utils from './utils.js';
import { makeAboutPage } from './make-about-page.js';
import { generateSearchIndex } from './create-search-index.js';
import { convert } from './convert.js';
import { singleToMultiPage } from './single-to-multi-page.js';

async function main() {

    let program = new Command();
    program
        .command("shift-clips")
        .description("Shift SMIL clip values by the given amount")
        .argument('input', "SMIL file")
        .argument('output', "SMIL file")
        .option('-a, --amount <number>', "Time in seconds to shift the clip begin and end values by, e.g 5 or -1.3")
        .action(async (input, output, options) => {
            let inputFilename = path.resolve(process.cwd(), input);
            let outputFilename = path.resolve(process.cwd(), output);
            await shiftClipTimes(inputFilename, outputFilename, parseFloat(options.amount));
        });
    
    program
        .command("add-ids")
        .description("Add IDs to HTML elements")
        .argument('input', "HTML file")
        .argument('output', "HTML file")
        .option('-s, --selectors <selectors...>', "CSS selectors to choose the elements that get IDs")
        .option('-p, --prefix', "ID prefix")
        .action(async (input, output, options) => {
            let inputFilename = path.resolve(process.cwd(), input);
            let outputFilename = path.resolve(process.cwd(), output);
            await addIds(inputFilename, outputFilename, options.selectors, options.prefix);
        });

    program
        .command("self-anchor-headings")
        .description("Make headings link to themselves")
        .argument('inputDir', "Input directory")
        .argument("outputDir", "Output directory")
        .action(async(inputDir, outputDir, packagedoc, navdoc, options) => {

            let inputDirname = path.resolve(process.cwd(), inputDir);
            let inputFilenames = fs.readdirSync(inputDirname)
                .filter(file => path.extname(file) == ".xhtml" || path.extname(file) == ".html")
                .map(file => path.join(inputDirname, file));
            let outputDirname = path.resolve(process.cwd(), outputDir);
            utils.ensureDirectory(outputDirname);
            for (let inputFilename of inputFilenames) {
                let outputFilename = path.resolve(outputDirname, path.basename(inputFilename));
                await selfAnchorHeadings(inputFilename, outputFilename);
            }
        });

    

        program
        .command("make-about-page")
        .description("make an HTML page with relevant publication metadata")
        .argument('inputFilename', "Input OPF")
        .argument("outputFilename", "Output filename")
        .action(async(inputFilename, outputFilename, options) => {
            await makeAboutPage(
                path.resolve(process.cwd(), inputFilename), 
                path.resolve(process.cwd(), outputFilename)
                );
        });

        program
        .command("convert")
        .description("convert an epub to a folder of html pages")
        .argument('input', "Input EPUB file or directory")
        .argument('outputDir', "Output directory")
        .argument('clientCodeDir', "Shared client code folder")
        .option('-s, --splitContentDoc', "Try to make one large content doc into smaller ones (experimental)", false)
        // .option('-x, --skipAudio', 'Skip merging audio')
        .action(async(input, outputDir, clientCodeDir, options) => {
            await utils.ensureDirectory(outputDir);
            await convert(
                path.resolve(process.cwd(), input),
                path.resolve(process.cwd(), outputDir),
                clientCodeDir,
                options.splitContentDoc
                // ,
                // options.skipAudio
            );
        });
    program.parse(process.argv);
}

(async () => await main())();