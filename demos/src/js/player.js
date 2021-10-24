let audio;
let activeCueIdx = -1; 
let activeCueMetadata;
let goingBackwards = false;

async function load() {
    audio = document.querySelector("#abotw-audio");
    let track = document.querySelector("#abotw-audio track");
    track.track.addEventListener("cuechange", onCueChange);
    
    audio.addEventListener("play", e => {
        document.querySelector("body").classList.add("abotw-playing");
        document.querySelector("#abotw-playpause").setAttribute("title", "Pause");
        document.querySelector("#abotw-playpause").setAttribute("aria-label", "Pause");
    });
    audio.addEventListener("pause", e => {
        document.querySelector("body").classList.remove("abotw-playing");
        document.querySelector("#abotw-playpause").setAttribute("title", "Play");
        document.querySelector("#abotw-playpause").setAttribute("aria-label", "Play");
    });
    audio.addEventListener("ended", e => {
        localStorage.setItem("abotw-autoplay", true);
        let nextSection = document.querySelector("#abotw-next-section");
        if (nextSection) nextSection.click();
    });
    
    // hide the basic html audio player
    if (document.querySelector("#abotw-audio")) {
        document.querySelector("#abotw-audio").style['display'] = 'none';
    }
}

function onCueChange(e) {
    let track = audio.textTracks[0];
    console.debug("cue change", e);
    let activeCues = Array.from(e.target.activeCues);
    if (activeCues.length > 0) {
        let activeCue = activeCues[activeCues.length - 1];
        activeCueIdx = Array.from(track.cues).findIndex(cue => cue.id == activeCue.id);
        endCueAction(); // this event also marks the end of the previous cue
        let cueMetadata = JSON.parse(activeCue.text);
        startCueAction(cueMetadata);
    }
}
function startCueAction(cueMetadata) {
    activeCueMetadata = cueMetadata;
    if (cueMetadata.action.name == "addCssClass") {
        let elm = select(cueMetadata.selector);
        if (elm) {
            if (canPlay(elm)) {
                elm.classList.add(cueMetadata.action.data);
                if (!isInViewport(elm, document)) {
                    elm.scrollIntoView();
                }
            }
            else {
                if (goingBackwards) {
                    goingBackwards = false;
                    goPrevious();
                }
                else {
                    goNext();
                }
            }
        }
        else {
            console.debug(`Element not found ${cueMetadata.selector}`);
        }
    }
}
function endCueAction() {
    if (!activeCueMetadata) return;
    let elm = select(activeCueMetadata.selector);
    // undo add css class
    if (elm && activeCueMetadata.action.name == "addCssClass") {
        document.querySelector(`.${activeCueMetadata.action.data}`)?.classList.remove(activeCueMetadata.action.data);
    }
}
function select(selector) {
    if (selector.type == "FragmentSelector") {
        return document.querySelector(`#${selector.value}`);
    }
    else if (selector.type == "CssSelector") {
        return document.querySelector(selector.value);
    }
    else return null;
}
function goNext() {
    goingBackwards = false;
    let track = audio.textTracks[0];
    if (activeCueIdx != -1) {
        if (activeCueIdx < track.cues.length - 1) {
            audio.currentTime = track.cues[activeCueIdx + 1].startTime;
        }
    }
}
function goPrevious() {
    goingBackwards = true;
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
function isInViewport(elm) {
    let bounding = elm.getBoundingClientRect();
    let doc = elm.ownerDocument;
    return (
        bounding.top >= 0 &&
        bounding.left >= 0 &&
        bounding.bottom <= (doc.defaultView.innerHeight || doc.documentElement.clientHeight) &&
        bounding.right <= (doc.defaultView.innerWidth || doc.documentElement.clientWidth)
    );
}
function canPlay(elm) {
    // true unless this is a pagebreak
    if (elm.classList.contains("epubtype_pagebreak")) {
        return localStorage.getItem("abotw-announce-pagenumbers") == "true";
    }
    return true;
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