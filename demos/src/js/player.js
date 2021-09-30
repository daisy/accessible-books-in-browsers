let isPlaying = false;

function load(filename) {
    console.log("player load", filename);

    if (document.querySelector("#p4w-audio")) {
        document.querySelector("#p4w-audio").style['display'] = 'none';
    }
}

function play() {
    isPlaying = true;
}

function pause() {
    isPlaying = false;
}

export { load, play, pause, isPlaying };