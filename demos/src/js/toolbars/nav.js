import * as icons from '../icons.js';
import { setupPanel } from '../panels/panel.js';

async function createNavToolbar() {
    let toolbar = document.querySelector("#p4w-nav-toolbar");
    
    toolbar.innerHTML = 
    `<div id="p4w-nav" class="p4w-panel" aria-live="polite">
        <button 
            type="button" 
            class="p4w-lightup"
            aria-haspopup="true" 
            aria-expanded="false"
            data-desc="Navigation Sidebar">
            ${icons.hamburger}
            ${icons.close}
        </button>
        <div>
        </div>
    </div>`;
    
    let playbackToolbar = document.querySelector("#p4w-playback-toolbar");
    setupPanel(
        "p4w-nav", 
        false, 
        () => {
            document.querySelector("body").classList.add("p4w-dim-10");
            // otherwise the navigation sidebar overlaps with the playback toolbar
            if (playbackToolbar) playbackToolbar.style['visibility'] = 'hidden';
        },
        () => {
            document.querySelector("body").classList.remove("p4w-dim-10");
            if (playbackToolbar) playbackToolbar.style['visibility'] = 'visible';
        }
    );

    
}

export { createNavToolbar };