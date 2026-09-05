import { parse, write } from './file-io.js';

// add self-linking anchors to each heading
async function selfAnchorHeadings(inputFilename: string, outputFilename: string) {
    let dom = await parse(inputFilename);
    // @ts-ignore
    let documentElement = dom.window.document.documentElement;
    let selectors = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
    let elms = selectors.map(selector => Array.from(documentElement.querySelectorAll(selector))).flat();
    // @ts-ignore
    let doc = dom.window.document;
    let i = 0;

    elms.map(elm => {
        // @ts-ignore
        let elmId;
        // @ts-ignore
        if (elm.hasAttribute("id")) {
            // @ts-ignore
            elmId = elm.getAttribute("id");
        }
        else {
            // @ts-ignore
            elmId = elm.hasAttribute("data-number") ? `h-${elm.getAttribute("data-number")}` : `h-${i}`;
            // @ts-ignore
            elm.setAttribute("id", elmId);
        }
        let anchor = doc.createElement("a");
        anchor.setAttribute("href", `#${elmId}`);
        //@ts-ignore
        anchor.setAttribute("title", `Link to heading ${elm.textContent.trim()}`)
        anchor.classList.add("abinb-selflink");
        anchor.innerHTML = 
        `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" 
            role="img" width="1em" height="1em" preserveAspectRatio="xMidYMid meet" viewBox="0 0 24 24" class="iconify">
            <g transform="rotate(135 12 12)">
                <g fill="none">
                    <path d="M9 7a1 1 0 0 1 .117 1.993L9 9H7a3 3 0 0 0-.176 5.995L7 15h2a1 1 0 0 1 .117 1.993L9 17H7a5 5 0 0 1-.217-9.995L7 7h2zm8 0a5 5 0 0 1 .217 9.995L17 17h-2a1 1 0 0 1-.117-1.993L15 15h2a3 3 0 0 0 .176-5.995L17 9h-2a1 1 0 0 1-.117-1.993L15 7h2zM7 11h10a1 1 0 0 1 .117 1.993L17 13H7a1 1 0 0 1-.117-1.993L7 11h10H7z" fill="currentColor"/>
                </g>
            </g>
        </svg>`;
        // @ts-ignore
        elm.appendChild(anchor);
    });

    await write(outputFilename, dom);
}

export { selfAnchorHeadings };