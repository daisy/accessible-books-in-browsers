let currentfrag = '';
let syncpoints = [];
let curridx = 0;
let track;
let audio;

async function load(filename) {
    console.log("player load", filename);
    
    let syncdataContents = await fetch(filename);
    let syncdata = await syncdataContents.text();
    syncdata = JSON.parse(syncdata);
    syncpoints = syncdata.syncpoints;

    // it has to be a video because audio elements don't take caption tracks
    // remove any previous #p4w-sync-audio element
    let oldSyncElm = document.querySelector("#p4w-sync-audio");
    if (oldSyncElm) oldSyncElm.remove();
    audio = document.createElement("video");
    audio.setAttribute("src", syncdata.assets.audio);
    audio.id = "p4w-sync-audio";
    audio.style['display'] = 'none';
    document.querySelector("#p4w-playback-toolbar").appendChild(audio); // stick it in the toolbar because why not

    audio = document.querySelector("#p4w-sync-audio");

    track = audio.addTextTrack("captions", "Document", "en");
    track.mode = "hidden";
    syncpoints.map(item => {
        let clipBegin = parseClockValue(item.audio.clipBegin);
        let clipEnd = parseClockValue(item.audio.clipEnd)
        track.addCue(new VTTCue(clipBegin, clipEnd, item.text));
    });
    console.log(track.cues);
    track.addEventListener("cuechange", onCueChange);

    audio.addEventListener("play", e => {
        document.querySelector("body").classList.add("is-playing");
        document.querySelector("#p4w-playpause").setAttribute("title", "Pause");
        document.querySelector("#p4w-playpause").setAttribute("aria-label", "Pause");
    });
    audio.addEventListener("pause", e => {
        document.querySelector("body").classList.remove("is-playing");
        document.querySelector("#p4w-playpause").setAttribute("title", "Play");
        document.querySelector("#p4w-playpause").setAttribute("aria-label", "Play");
    });
    
    let waitForAudioToLoad = new Promise((resolve, reject) => {
        audio.addEventListener("loadeddata", e => {
            // console.log("loaded");
            resolve();
        }); 
        audio.addEventListener("error", e => {
            reject();
        });
    });
    await waitForAudioToLoad;

    // hide the basic html audio player
    if (document.querySelector("#p4w-audio")) {
        document.querySelector("#p4w-audio").style['display'] = 'none';
    }
    
}

function onCueChange(e) {
    console.log("cue change", e);
    let cues = track.activeCues;
    if (cues.length > 0) {
        if (currentfrag != '') unhighlight(currentfrag);
        currentfrag = cues[cues.length - 1].text.split("#")[1];
        highlight(currentfrag);
        curridx = syncpoints.findIndex(item => item.text.includes(currentfrag));
    }
}
function highlight(frag) {
    let elm = document.querySelector(`#${frag}`);
    elm.classList.add("highlight");
    if (!isInViewport(elm, document)) {
        elm.scrollIntoView();
    }
}
function unhighlight(frag) {
    document.querySelector(`#${frag}`).classList.remove("highlight");
}

function goNext() {
    if (curridx <= syncpoints.length - 2) {
        curridx++;
        audio.currentTime = parseClockValue(syncpoints[curridx].audio.clipBegin);
    }
}
function goPrevious() {
    if (curridx > 0) {
        curridx--;
        audio.currentTime = parseClockValue(syncpoints[curridx].audio.clipBegin);
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