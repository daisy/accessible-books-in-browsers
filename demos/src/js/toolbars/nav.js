import * as icons from '../icons.js';
import { createToolbar } from './toolbar.js';
import { setupPanel } from '../panels/panel.js';

async function createNavToolbar() {
    let toolbar = createToolbar("p4w-nav-toolbar");
    toolbar.setAttribute("aria-label", "Navigation toolbar");
    
    toolbar.innerHTML = 
    `<div id="p4w-nav" class="p4w-panel" aria-live="polite">
        <button 
            type="button" 
            class="p4w-lightup"
            aria-haspopup="true" 
            aria-expanded="false"
            data-desc="Navigation sidebar">
            ${icons.hamburger}
            ${icons.close}
        </button>
        <div>
        </div>
    </div>`;
    
    document.querySelector("body").insertBefore(toolbar, document.querySelector("body script#p4w-initApp"));
    
    setupPanel(
        "p4w-nav", 
        false, 
        () => {
            document.querySelector("body").classList.add("p4w-dim-10");
        },
        () => {
            document.querySelector("body").classList.remove("p4w-dim-10");
        }
    );

    
}

export { createNavToolbar };