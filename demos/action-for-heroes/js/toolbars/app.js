import * as icons from '../icons.js';
import { createToolbar } from './toolbar.js';
import { setupPanel } from '../panels/panel.js';

function createAppToolbar() {
    let toolbar = createToolbar("app-toolbar");
    toolbar.setAttribute("aria-label", "Application toolbar");
    toolbar.setAttribute("role", "region");
    toolbar.innerHTML = 
    `<div id="settings" class="panel" aria-live="polite">
        <button 
            type="button" 
            class="lightup"
            aria-haspopup="true" 
            aria-expanded="false"
            data-desc="Settings">
            ${icons.settings}
            ${icons.close}
        </button>
        <div>
        </div>
    </div>
    <div id="help" class="lightup">
        <a href="../help.html"  title="View help" target="_blank">
            ${icons.help}
        </a>
    </div>`;

    document.querySelector("body").insertBefore(toolbar, document.querySelector("body script#initApp"));
    setupPanel(
        "settings", 
        false, 
        () => {
            document.querySelector("body").classList.add("dim-70");
        },
        () => {
            document.querySelector("body").classList.remove("dim-70");
        }
    );
}



export { createAppToolbar };