import * as icons from '../icons.js';
import { setupPanel } from '../panels/panel.js';

async function createNavToolbar() {
    let toolbar = document.querySelector("#abinb-nav-toolbar");
    
    toolbar.innerHTML = 
    `<div id="abinb-nav" class="abinb-panel" aria-live="polite">
        <button 
            type="button" 
            class="abinb-lightup"
            aria-haspopup="true" 
            aria-expanded="false"
            data-desc="Navigation Sidebar">
            ${icons.hamburger}
            ${icons.close}
        </button>
        <div>
        </div>
    </div>`;
    
    let playbackToolbar = document.querySelector("#abinb-playback-toolbar");
    let applicationToolbar = document.querySelector("#abinb-app-toolbar");
    let navPanel = document.querySelector("#abinb-nav");

    setupPanel(
        "abinb-nav", 
        false, 
        () => {
            document.querySelector("body").classList.add("abinb-dim-10");
            // otherwise the navigation sidebar overlaps with the playback toolbar
            if (playbackToolbar) playbackToolbar.style['visibility'] = 'hidden';
            // on smaller screens, the nav panel overlaps with the application toolbar
            if (navPanel.getBoundingClientRect().x + navPanel.getBoundingClientRect().width >= applicationToolbar.getBoundingClientRect().x) {
                applicationToolbar.style['visibility'] = 'hidden';
            }

        },
        () => {
            document.querySelector("body").classList.remove("abinb-dim-10");
            if (playbackToolbar) playbackToolbar.style['visibility'] = 'visible';
            applicationToolbar.style['visibility'] = 'visible';
        }
    );

    
}

export { createNavToolbar };