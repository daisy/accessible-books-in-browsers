import * as icons from '../icons.js';
import { setupPanel } from '../panels/panel.js';

function createApplicationToolbar(helpUrl) {
    let toolbar = document.querySelector("#abotw-app-toolbar");
    toolbar.innerHTML = 
    `<div id="abotw-settings" class="abotw-panel" aria-live="polite">
        <button 
            type="button" 
            class="abotw-lightup"
            aria-haspopup="true" 
            aria-expanded="false"
            data-desc="Settings">
            ${icons.settings}
            ${icons.close}
        </button>
        <div>
        </div>
    </div>
    <div id="abotw-help" class="abotw-lightup">
        <a href="${helpUrl}"  title="View help" target="_blank">
            ${icons.help}
        </a>
    </div>`;

    setupPanel(
        "abotw-settings", 
        false, 
        () => {
            document.querySelector("body").classList.add("abotw-dim-70");
        },
        () => {
            document.querySelector("body").classList.remove("abotw-dim-70");
        }
    );
}



export { createApplicationToolbar };