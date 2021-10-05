import * as icons from '../icons.js';

// volume, prev phrase, play pause, next phrase
function createPlaybackToolbar(player) {
    let toolbar = document.querySelector("#p4w-playback-toolbar");
    toolbar.innerHTML = 
    `<button id="p4w-previous-phrase"
        type="button"
        class="p4w-lightup"
        aria-label="Previous phrase"
        title="Previous phrase">
        ${icons.prevPhrase}
    </button>
    <button id="p4w-playpause"
        type="button" 
        class="p4w-lightup"
        aria-label="Play"
        title="Play">
        ${icons.play}
        ${icons.pause}
    </button>
    <button id="p4w-next-phrase"
        type="button"
        class="p4w-lightup"
        aria-label="Next phrase"
        title="Next phrase">
        ${icons.nextPhrase}
    </button>
    <input id="p4w-volume"
        aria-label="Volume" 
        title="volume"
        class="p4w-lightup"
        type="range"  
        min="0" 
        max="100" 
        value="90" 
        step="5">
    </input>`;

    toolbar.querySelector("#p4w-playpause").addEventListener("click", e => {
        if (!player.audio.paused) {
            player.audio.pause();
            document.querySelector("#p4w-playpause").classList.remove("playing");
        }
        else {
            player.audio.play();
            document.querySelector("#p4w-playpause").classList.add("playing");
        }
    });

    toolbar.querySelector("#p4w-previous-phrase").addEventListener("click", e => {
        player.goPrevious();
    });

    toolbar.querySelector("#p4w-next-phrase").addEventListener("click", e => {
        player.goNext();
    });

    let volumeRange = document.querySelector("#p4w-volume");
    let setVolume = (volume, player) => {
        localStorage.setItem("p4w-volume", volume);
        player.audio.volume = volume/100;
        volumeRange.value = volume;
    };

    let volume = localStorage.getItem("p4w-volume");
    setVolume(volume, player);
    volumeRange.addEventListener("change", e => {
        setVolume(e.target.value, player);
    });
}


export { createPlaybackToolbar };