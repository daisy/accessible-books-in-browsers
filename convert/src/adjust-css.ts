import * as css from 'css';
import * as fileio from './file-io.js';
import fs from 'fs-extra';

// make the css selectors more specific so they don't interfere with the UI
async function adjustSelectors(inputFilename, outputFilename) {
    let fileContents = await fileio.readToString(inputFilename);
    let cssObj = css.parse(fileContents);
    console.log(cssObj);

    // just add 'main' to the selector
    // unless it's already there or unless the selector is html or body - in which case, leave it alone
    // this overall approach needs more testing and planning; this is just an experiment
    cssObj.stylesheet.rules
        .filter(rule => rule.type == "rule")    
        .map(rule => {
            let newSelectors = rule.selectors.map(selector => {            
                if (selector.indexOf("html") == -1 && selector.indexOf("body") == -1 && selector.indexOf("main") == -1) {
                    return selector = "main " + selector;
                }
                else return selector;
            });
            rule.selectors = newSelectors;
        });

    let newFileContents = css.stringify(cssObj);
    await fs.writeFile(outputFilename, newFileContents);
}

export { adjustSelectors };