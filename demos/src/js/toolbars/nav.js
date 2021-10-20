import * as icons from '../icons.js';
import { setupPanel } from '../panels/panel.js';

async function createNavToolbar() {
    let toolbar = document.querySelector("#abotw-nav-toolbar");
    
    toolbar.innerHTML = 
    `<div id="abotw-nav" class="abotw-panel" aria-live="polite">
        <button 
            type="button" 
            class="abotw-lightup"
            aria-haspopup="true" 
            aria-expanded="false"
            data-desc="Navigation Sidebar">
            ${icons.hamburger}
            ${icons.close}
        </button>
        <div>
        </div>
    </div>`;
    
    let playbackToolbar = document.querySelector("#abotw-playback-toolbar");
    setupPanel(
        "abotw-nav", 
        false, 
        () => {
            document.querySelector("body").classList.add("abotw-dim-10");
            // otherwise the navigation sidebar overlaps with the playback toolbar
            if (playbackToolbar) playbackToolbar.style['visibility'] = 'hidden';
        },
        () => {
            document.querySelector("body").classList.remove("abotw-dim-10");
            if (playbackToolbar) playbackToolbar.style['visibility'] = 'visible';
        }
    );

    
}

export { createNavToolbar };