import chardet from 'chardet';
import fs from "fs-extra";

function sniffEncoding(filepath: string) {
    let encoding = chardet.detectFileSync(filepath).toString();
    return encoding;
}

function toHHMMSS(secs) {
    var sec_num = parseInt(secs, 10)
    var hours = Math.floor(sec_num / 3600)
    var minutes = Math.floor(sec_num / 60) % 60
    var seconds = secs % 60

    return [hours, minutes, seconds.toFixed(3)]
        .map(v => v < 10 ? "0" + v : v)
        .filter((v, i) => v !== "00" || i > 0)
        .join(":")
}

// parse the timestamp and return the value in seconds
// supports this syntax: http://idpf.org/epub/30/spec/epub30-mediaoverlays.html#app-clock-examples
function toSeconds(value: string) {        
    let hours = 0;
    let mins = 0;
    let secs = 0;
    let format = 's';
    
    if (value.indexOf("min") != -1) {
        mins = parseFloat(value.substr(0, value.indexOf("min")));
        format = 'min';
    }
    else if (value.indexOf("ms") != -1) {
        var ms = parseFloat(value.substr(0, value.indexOf("ms")));
        secs = ms/1000;
        format = 'ms';
    }
    else if (value.indexOf("s") != -1) {
        secs = parseFloat(value.substr(0, value.indexOf("s")));                
        format = 's';
    }
    else if (value.indexOf("h") != -1) {
        hours = parseFloat(value.substr(0, value.indexOf("h")));                
        format = 'h';
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
        format = 'hms';
    }
    var total = hours * 3600 + mins * 60 + secs;
    return {seconds: total, format};
}
async function ensureDirectory(dir: string) {
    if (!fs.existsSync(dir)) {
        await fs.mkdir(dir);
    }
}

// stolen from other project
// TODO fixme
// return {src, selector} for the src
function splitSrcSelector(src: string) {
    let idx = src.lastIndexOf("#");
    let selector = "";
    let src_ = src;
    // trim trailing hash
    if (idx == src.length - 1) {
        src_ = src.slice(0, idx);
    }
    else {
        // separate out the selector from the src
        if (idx != -1) {
            selector = src.slice(idx);
            src_ = src.slice(0, idx);
        }
    }
    return { src: src_, selector };
}


export { sniffEncoding, toHHMMSS, toSeconds, ensureDirectory, splitSrcSelector };
