import * as icons from '../icons.js';
import { createToolbar } from './toolbar.js';
import { setupPanel } from '../panels/panel.js';

// volume, prev phrase, play pause, next phrase
function createPlaybackToolbar(player) {
    let toolbar = createToolbar("p4w-playback-toolbar");
    toolbar.setAttribute("aria-label", "Playback toolbar");
    toolbar.setAttribute("role", "region");
    toolbar.innerHTML = 
    `<button 
        id="p4w-playpause"
        type="button" 
        class="p4w-lightup">
        ${icons.play}
        ${icons.pause}
    </button>
    `;


    toolbar.querySelector("#p4w-playpause").addEventListener("click", e => {
        if (player.isPlaying) {
            player.pause();
            setToPause();
        }
        else {
            player.play();
            setToPlay();
        }
    });

    
    document.querySelector("body").insertBefore(toolbar, document.querySelector("body script#p4w-initApp"));
    
    setToPause();

}

function setToPause() {
    document.querySelector("#p4w-playpause").classList.remove("playing");
}

function setToPlay() {
    document.querySelector("#p4w-playpause").classList.add("playing");
}

export { createPlaybackToolbar };