import * as player from '../player.js';

async function createSettingsPanelContents(includeAudioControls = false) {
    let settingsPanelContents = document.querySelector("#abinb-settings > div");
    settingsPanelContents.innerHTML = 
    `<h2>Settings</h2>
    <fieldset>
        <div id="abinb-dark-mode" title="Dark mode">
            <label for="abinb-dark-mode-toggle">Dark mode</label>
            <input type="checkbox" id="abinb-dark-mode-toggle">
        </div>
        <div id="abinb-size" title="Size">
            <label for="abinb-size-range">Size</label>
            <input type="range" id="abinb-size-range" min="80" max="200" value="100" step="5">
            <p id="abinb-size-value">100%</p>
            <button id="abinb-reset-size">Reset size</button>
        </div>
        ${includeAudioControls ? 
            `<div id="abinb-rate" title="Playback Rate">
                <label for="abinb-rate-range">Playback Rate</label>
                <input type="range" id="abinb-rate-range" min="50" max="200" value="100" step="5">
                <p id="abinb-rate-value">100%</p>
                <button id="abinb-reset-rate">Reset rate</button>
            </div>
            <div id="abinb-announce-pagenumbers" title="Announce page numbers">
                <label for="abinb-announce-pagenumbers-toggle">Announce page numbers</label>
                <input type="checkbox" id="abinb-announce-pagenumbers-toggle" checked>
            </div>` 
            : ``}
    </fieldset>`;

    let darkModeToggle = document.querySelector("#abinb-dark-mode input");
    darkModeToggle.addEventListener("change", e => {
        if (darkModeToggle.checked) {
            darkModeOn();
        }
        else {
            darkModeOff();
        }
    });

    let announcePageNumbersToggle = document.querySelector("#abinb-announce-pagenumbers-toggle");
    if (announcePageNumbersToggle) {
        announcePageNumbersToggle.addEventListener("change", e => {
            if (announcePageNumbersToggle.checked) {
                announcePageNumbersOn();
            }
            else {
                announcePageNumbersOff();
            }
        });
    }

    initSize();
    initDarkMode();
    if (includeAudioControls) {
        initRate();
        initAnnouncePageNumbers();
    }
}

function initDarkMode() {
    let darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    // listen for changes to the system theme preference
    darkModeMediaQuery.addEventListener("change", e => {
        if (e.matches) darkModeOn();
        else darkModeOff();
    });

    if (localStorage.getItem("abinb-darkmode") == null) {
        // set the initial state of the checkbox to the system theme preference    
        if (darkModeMediaQuery.matches) {
            darkModeOn();
        }
        else {
            darkModeOff();
        }
    }
    else if (localStorage.getItem("abinb-darkmode") == "true"){
        darkModeOn();
    }
    else {
        darkModeOff();
    }
}

function darkModeOn() {
    document.querySelector('body').classList.add('abinb-dark');
    document.querySelector('body').classList.remove('abinb-dark-pref-override');
    let darkModeToggle = document.querySelector("#abinb-dark-mode input");
    if (darkModeToggle) darkModeToggle.checked = true;

    localStorage.setItem("abinb-darkmode", true);
}
function darkModeOff() {
    document.querySelector('body').classList.remove('abinb-dark');
    document.querySelector('body').classList.add('abinb-dark-pref-override');
    localStorage.setItem("abinb-darkmode", false);
    let darkModeToggle = document.querySelector("#abinb-dark-mode input");
    if (darkModeToggle) darkModeToggle.checked = false;
}
function initSize() {
    let size = localStorage.getItem("abinb-size");

    let sizeRange = document.querySelector("#abinb-size input");
    sizeRange.value = size;

    sizeRange.addEventListener("input", e => {
        setSize(e.target.value);
    });
    document.querySelector("#abinb-reset-size").addEventListener("click", e => {
        sizeRange.value = 100;
        setSize(100);
    });

    setSize(size);
}
function setSize(size) {
    localStorage.setItem("abinb-size", size);
    document.querySelector("#abinb-size-value").textContent = `${size}%`;
    
    // scale the font
    document.querySelector("body").style["font-size"] = `${size}%`;
    
    // scale the icons
    let icons = Array.from(document.querySelectorAll("svg.abinb-iconify"));
    icons.map(icon => {
        icon.style["width"] =`calc(${size/100} * var(--abinb-icons))`;
        icon.style["height"] = icon.style["width"];
    });

    // scale the settings controls
    let settingsInputs = Array.from(document.querySelectorAll("#abinb-settings input[type=checkbox]"));
    settingsInputs.map(input => {
        input.style["width"] = `calc(${size/200} * var(--abinb-icons))`;
        input.style["height"] = `calc(${size/200} * var(--abinb-icons))`;
    });
    
    // scale the prev/next document links to get the right size hover box
    let doclinks = Array.from(document.querySelectorAll("#abinb-document-links a"));
    doclinks.map(link => {
        link.style["width"] = `calc(${size/100} * var(--abinb-icons))`;
        link.style["height"] = `calc(${size/100} * var(--abinb-icons))`;
    });

    // scale the app toolbar help link
    let toolbarLinks = Array.from(document.querySelectorAll("#abinb-help"));
    toolbarLinks.map(link => {
        link.style["width"] = `calc(${size/100} * var(--abinb-icons))`;
        link.style["height"] = `calc(${size/100} * var(--abinb-icons))`;
    });

    // scale the sliders
    let style = 
    `input[type=range] {
        height: calc(${size/500} * var(--abinb-icons));
    }
    input[type=range]::-moz-range-thumb, 
    input[type=range]::-ms-thumb,  
    input[type=range]::-webkit-slider-thumb {
        border: thin black solid;
        width: calc(${size/200} * var(--abinb-icons));
        height: calc(${size/200} * var(--abinb-icons));
    }`;

    if (document.querySelector("#abinb-settings style")) {
        document.querySelector("#abinb-settings style").innerHTML = style;
    }
    else {
        let styleElm = document.createElement("style");
        document.querySelector("#abinb-settings").insertBefore(styleElm, document.querySelector("#abinb-settings").firstChild);
        styleElm.innerHTML = style;
    }
    if (document.querySelector("#abinb-playback-toolbar")) {
        if (document.querySelector("#abinb-playback-toolbar style")) {
            document.querySelector("#abinb-playback-toolbar style").innerHTML = style;
        }
        else {
            let styleElm = document.createElement("style");
            document.querySelector("#abinb-playback-toolbar").insertBefore(styleElm, document.querySelector("#abinb-playback-toolbar").firstChild);
            styleElm.innerHTML = style;
        }
    }
    // scale the spacing on the nav sidebar
    document.querySelector("#abinb-nav > div").style["gap"] = `calc(${size/300} * var(--abinb-icons))`;

    // scale the close buttons
    let closeButtons = Array.from(document.querySelectorAll(".abinb-panel > button svg:last-child"));
    closeButtons.map(closeButton => {
        closeButton.style["width"] = `calc(${size/200} * var(--abinb-icons))`;
        closeButton.style["height"] = `calc(${size/200} * var(--abinb-icons))`;
    });

    toolbarLinks.map(link => {
        link.style["width"] = `calc(${size/100} * var(--abinb-icons))`;
        link.style["height"] = `calc(${size/100} * var(--abinb-icons))`;
    });

    // scale the self-links next to each heading
    let selflinks = Array.from(document.querySelectorAll("main .abinb-selflink .abinb-iconify"));
    selflinks.map(link => {
        link.style["width"] = `calc(${size/200} * var(--abinb-icons))`;
    });
}

function initRate() {
    let rate = localStorage.getItem("abinb-rate");

    if (document.querySelector("#abinb-rate input")) {
        let rateRange = document.querySelector("#abinb-rate input");
        rateRange.value = rate;

        rateRange.addEventListener("input", e => {
            setRate(e.target.value);
        });
        document.querySelector("#abinb-reset-rate").addEventListener("click", e => {
            rateRange.value = 100;
            setRate(100);
        });
    }
    setRate(rate);
}
function setRate(rate) {
    localStorage.setItem("abinb-rate", rate);
    if (document.querySelector("#abinb-rate-value")) {
        document.querySelector("#abinb-rate-value").textContent = `${rate}%`;
    }

    // set the rate
    if (player.audio) {
        player.audio.playbackRate = parseInt(rate)/100;
    }
}

function initAnnouncePageNumbers() {
    if (localStorage.getItem("abinb-announce-pagenumbers") == "false"){
        announcePageNumbersOff();
    }
    else {
        announcePageNumbersOn();
    }
}
function announcePageNumbersOn() {
    localStorage.setItem("abinb-announce-pagenumbers", true);
    let announcePageNumbersToggle = document.querySelector("#abinb-announce-pagenumbers-toggle");
    if (announcePageNumbersToggle) announcePageNumbersToggle.checked = true;
}
function announcePageNumbersOff() {
    localStorage.setItem("abinb-announce-pagenumbers", false);
    let announcePageNumbersToggle = document.querySelector("#abinb-announce-pagenumbers-toggle");
    if (announcePageNumbersToggle) announcePageNumbersToggle.checked = false;
}
export { createSettingsPanelContents };