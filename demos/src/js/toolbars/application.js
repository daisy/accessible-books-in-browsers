import * as icons from '../icons.js';
import { setupPanel } from '../panels/panel.js';

function createApplicationToolbar(helpUrl) {
    let toolbar = document.querySelector("#abinb-app-toolbar");
    toolbar.innerHTML = 
    `<div id="abinb-settings" class="abinb-panel" aria-live="polite">
        <button 
            type="button" 
            class="abinb-lightup"
            aria-haspopup="true" 
            aria-expanded="false"
            data-desc="Settings">
            ${icons.settings}
            ${icons.close}
        </button>
        <div>
        </div>
    </div>
    <div id="abinb-help" class="abinb-lightup">
        <a href="${helpUrl}"  title="View help" target="_blank">
            ${icons.help}
        </a>
    </div>`;

    setupPanel(
        "abinb-settings", 
        false, 
        () => {
            document.querySelector("body").classList.add("abinb-dim-70");
        },
        () => {
            document.querySelector("body").classList.remove("abinb-dim-70");
        }
    );
}



export { createApplicationToolbar };