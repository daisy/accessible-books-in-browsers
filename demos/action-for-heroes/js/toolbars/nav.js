import * as icons from '../icons.js';
import { createToolbar } from './toolbar.js';
import { setupPanel } from '../panels/panel.js';

async function createNavToolbar() {
    let toolbar = createToolbar("nav-toolbar");
    toolbar.setAttribute("aria-label", "Navigation toolbar");
    
    toolbar.innerHTML = 
    `<div id="nav" class="panel" aria-live="polite">
        <button 
            type="button" 
            class="lightup"
            aria-haspopup="true" 
            aria-expanded="false"
            data-desc="Navigation sidebar">
            ${icons.toc}
            ${icons.close}
        </button>
        <div>
        </div>
    </div>`;
    
    document.querySelector("body").appendChild(toolbar);
    
    setupPanel(
        "nav", 
        false, 
        () => {
            document.querySelector("body").classList.add("dim-10");
        },
        () => {
            document.querySelector("body").classList.remove("dim-10");
        }
    );

    
}

export { createNavToolbar };