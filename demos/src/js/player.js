let currentfrag = '';
let activeCue;
let audio;
let activeCueIdx = -1; 

async function load() {
    audio = document.querySelector("#p4w-audio audio");
    let track = document.querySelector("#p4w-audio track");
    track.track.addEventListener("cuechange", onCueChange);
    
    audio.addEventListener("play", e => {
        document.querySelector("body").classList.add("p4w-playing");
        document.querySelector("#p4w-playpause").setAttribute("title", "Pause");
        document.querySelector("#p4w-playpause").setAttribute("aria-label", "Pause");
    });
    audio.addEventListener("pause", e => {
        document.querySelector("body").classList.remove("p4w-playing");
        document.querySelector("#p4w-playpause").setAttribute("title", "Play");
        document.querySelector("#p4w-playpause").setAttribute("aria-label", "Play");
    });
    audio.addEventListener("ended", e => {
        localStorage.setItem("p4w-autoplay", true);
        let nextSection = document.querySelector("#p4w-next-section");
        if (nextSection) nextSection.click();
    });
    
    // let waitForAudioToLoad = new Promise((resolve, reject) => {
    //     audio.addEventListener("loadeddata", e => {
    //         resolve();
    //     }); 
    //     audio.addEventListener("error", e => {
    //         reject();
    //     });
    // });
    // try {
    //     await waitForAudioToLoad;
    // }
    // catch(err) {
    //     console.error(err);
    // }
    
    // hide the basic html audio player
    if (document.querySelector("#p4w-audio")) {
        document.querySelector("#p4w-audio").style['display'] = 'none';
    }
    
}

function onCueChange(e) {
    let track = audio.textTracks[0];
    console.debug("cue change", e);
    let activeCues = Array.from(e.target.activeCues);
    if (activeCues.length > 0) {
        let activeCue = activeCues[activeCues.length - 1];
        activeCueIdx = Array.from(track.cues).findIndex(cue => cue.id == activeCue.id);
        if (currentfrag != '') unhighlight(currentfrag);
        currentfrag = activeCue.text.split("#")[1];
        highlight(currentfrag);
    }
}
function highlight(frag) {
    let elm = document.querySelector(`#${frag}`);
    elm.classList.add("highlight");
    if (!isInViewport(elm, document)) {
        elm.scrollIntoView();
    }
}
function unhighlight() {
    document.querySelector(`.highlight`).classList.remove("highlight");
}
function goNext() {
    let track = audio.textTracks[0];
    if (activeCueIdx != -1) {
        if (activeCueIdx < track.cues.length - 1) {
            audio.currentTime = track.cues[activeCueIdx + 1].startTime;
        }
    }
}
function goPrevious() {
    let track = audio.textTracks[0];
    if (activeCueIdx != -1) {
        if (activeCueIdx > 0) {
            audio.currentTime = track.cues[activeCueIdx - 1].startTime;
        }
    }
}

function canGoNext() {
    return curridx <= syncpoints.length - 2;
}
function canGoPrevious() {
    return curridx > 0;
}
function isInViewport(elm, doc) {
    let bounding = elm.getBoundingClientRect();
    return (
        bounding.top >= 0 &&
        bounding.left >= 0 &&
        bounding.bottom <= (doc.defaultView.innerHeight || doc.documentElement.clientHeight) &&
        bounding.right <= (doc.defaultView.innerWidth || doc.documentElement.clientWidth)
    );
}
// parse the timestamp and return the value in seconds
// supports this syntax: https://www.w3.org/publishing/epub/epub-mediaoverlays.html#app-clock-examples
function parseClockValue(value) { 
    if (!value) {
        return null;
    }
    let hours = 0;
    let mins = 0;
    let secs = 0;
    
    if (value.indexOf("min") != -1) {
        mins = parseFloat(value.substr(0, value.indexOf("min")));
    }
    else if (value.indexOf("ms") != -1) {
        var ms = parseFloat(value.substr(0, value.indexOf("ms")));
        secs = ms/1000;
    }
    else if (value.indexOf("s") != -1) {
        secs = parseFloat(value.substr(0, value.indexOf("s")));                
    }
    else if (value.indexOf("h") != -1) {
        hours = parseFloat(value.substr(0, value.indexOf("h")));                
    }
    else {
        // parse as hh:mm:ss.fraction
        // this also works for seconds-only, e.g. 12.345
        let arr = value.split(":");
        secs = parseFloat(arr.pop());
        if (arr.length > 0) {
            mins = parseFloat(arr.pop());
            if (arr.length > 0) {
                hours = parseFloat(arr.pop());
            }
        }
    }
    let total = hours * 3600 + mins * 60 + secs;
    return total;
}

export { load, audio, goNext, goPrevious, canGoNext, canGoPrevious };