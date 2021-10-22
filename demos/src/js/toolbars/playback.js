import * as icons from '../icons.js';
import * as player from '../player.js';

// volume, prev phrase, play pause, next phrase
function createPlaybackToolbar() {
    let toolbar = document.querySelector("#abotw-playback-toolbar");
    toolbar.innerHTML = toolbar.innerHTML + 
    `<button id="abotw-previous-phrase"
        type="button"
        class="abotw-lightup"
        aria-label="Previous phrase"
        title="Previous phrase">
        ${icons.prevPhrase}
    </button>
    <button id="abotw-playpause"
        type="button" 
        class="abotw-lightup"
        aria-label="Play"
        title="Play">
        ${icons.play}
        ${icons.pause}
    </button>
    <button id="abotw-next-phrase"
        type="button"
        class="abotw-lightup"
        aria-label="Next phrase"
        title="Next phrase">
        ${icons.nextPhrase}
    </button>
    <input id="abotw-volume"
        aria-label="Volume" 
        title="volume"
        class="abotw-lightup"
        type="range"  
        min="0" 
        max="100" 
        value="90" 
        step="5">
    </input>`;

    toolbar.querySelector("#abotw-playpause").addEventListener("click", async e => {
        if (!player.audio.paused) {
            player.audio.pause();
        }
        else {
            try {
                await player.audio.play();
            }
            catch(err) {
                console.error("Play() failed");
            }
        }
    });

    toolbar.querySelector("#abotw-previous-phrase").addEventListener("click", e => {
        player.goPrevious();
    });

    toolbar.querySelector("#abotw-next-phrase").addEventListener("click", e => {
        player.goNext();
    });

    let volumeRange = document.querySelector("#abotw-volume");
    let setVolume = (volume, player) => {
        localStorage.setItem("abotw-volume", volume);
        player.audio.volume = volume/100;
        volumeRange.value = volume;
    };

    let volume = localStorage.getItem("abotw-volume");
    setVolume(volume, player);
    volumeRange.addEventListener("input", e => {
        setVolume(e.target.value, player);
    });
}


export { createPlaybackToolbar };