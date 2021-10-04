import * as icons from '../icons.js';
import { createToolbar } from './toolbar.js';
import { setupPanel } from '../panels/panel.js';

// volume, prev phrase, play pause, next phrase
function createPlaybackToolbar(player) {
    // let toolbar = createToolbar("p4w-playback-toolbar");
    // toolbar.setAttribute("aria-label", "Playback toolbar");
    // toolbar.setAttribute("role", "region");
    let toolbar = document.querySelector("#p4w-playback-toolbar");
    toolbar.innerHTML = 
    `<button id="p4w-previous-phrase"
        type="button"
        class="p4w-lightup">
        ${icons.prevPhrase}
    </button>
    <button 
        id="p4w-playpause"
        type="button" 
        class="p4w-lightup">
        ${icons.play}
        ${icons.pause}
    </button>
    <button id="p4w-next-phrase"
        type="button"
        class="p4w-lightup">
        ${icons.nextPhrase}
    </button>
    `;


    toolbar.querySelector("#p4w-playpause").addEventListener("click", e => {
        if (player.isPlaying()) {
            player.pause();
            document.querySelector("#p4w-playpause").classList.remove("playing");
        }
        else {
            player.play();
            document.querySelector("#p4w-playpause").classList.add("playing");
        }
    });

    toolbar.querySelector("#p4w-previous-phrase").addEventListener("click", e => {
        player.goPrevious();
    });

    toolbar.querySelector("#p4w-next-phrase").addEventListener("click", e => {
        player.goNext();
    });

    
    document.querySelector("body").insertBefore(toolbar, document.querySelector("body script#p4w-initApp"));
    
}


export { createPlaybackToolbar };