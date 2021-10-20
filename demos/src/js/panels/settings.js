import * as player from '../player.js';

async function createSettingsPanelContents(includeAudioRate = false) {
    let settingsPanelContents = document.querySelector("#abotw-settings > div");
    settingsPanelContents.innerHTML = 
    `<h2>Settings</h2>
    <fieldset>
        <div id="abotw-dark-mode" title="Dark mode">
            <label for="abotw-dark-mode-toggle">Dark mode</label>
            <input type="checkbox" id="abotw-dark-mode-toggle">
        </div>
        <div id="abotw-scale" title="Scale">
            <label for="abotw-scale-range">Scale</label>
            <input type="range" id="abotw-scale-range" min="80" max="300" value="100" step="5">
            <p id="abotw-scale-value">100%</p>
            <button id="abotw-reset-scale">Reset scale</button>
        </div>
        ${includeAudioRate ? 
            `<div id="abotw-rate" title="Playback Rate">
                <label for="abotw-rate-range">Playback Rate</label>
                <input type="range" id="abotw-rate-range" min="50" max="300" value="100" step="5">
                <p id="abotw-rate-value">100%</p>
                <button id="abotw-reset-rate">Reset rate</button>
            </div>` 
            : ``}
    </fieldset>`;

    let darkModeToggle = document.querySelector("#abotw-dark-mode input");
    darkModeToggle.addEventListener("change", e => {
        if (darkModeToggle.checked) {
            darkModeOn();
        }
        else {
            darkModeOff();
        }
    });

    initScale();
    initDarkMode();
    if (includeAudioRate) initRate();
}

function initDarkMode() {
    if (localStorage.getItem("abotw-darkmode") == null) {
        // set the initial state of the checkbox to the system theme preference
        let darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        if (darkModeMediaQuery.matches) {
            darkModeOn();
        }
        else {
            darkModeOff();
        }
        
        // listen for changes to the system theme preference
        darkModeMediaQuery.addEventListener("change", e => {
            if (e.matches) darkModeOff();
            else darkModeOn();
        });
    }
    else if (localStorage.getItem("abotw-darkmode") == "true"){
        darkModeOn();
    }
    else {
        darkModeOff();
    }
}

function darkModeOn() {
    document.querySelector('body').classList.add('abotw-dark');
    document.querySelector('body').classList.remove('abotw-prefers-color-scheme-override');
    let darkModeToggle = document.querySelector("#abotw-dark-mode input");
    if (darkModeToggle) darkModeToggle.checked = true;

    localStorage.setItem("abotw-darkmode", true);
}
function darkModeOff() {
    document.querySelector('body').classList.remove('abotw-dark');
    document.querySelector('body').classList.add('abotw-prefers-color-scheme-override');
    localStorage.setItem("abotw-darkmode", false);
    let darkModeToggle = document.querySelector("#abotw-dark-mode input");
    if (darkModeToggle) darkModeToggle.checked = false;
}
function initScale() {
    let scale = localStorage.getItem("abotw-scale");

    let scaleRange = document.querySelector("#abotw-scale input");
    scaleRange.value = scale;

    scaleRange.addEventListener("input", e => {
        setScale(e.target.value);
    });
    document.querySelector("#abotw-reset-scale").addEventListener("click", e => {
        scaleRange.value = 100;
        setScale(100);
    });

    setScale(scale);
}
function setScale(scale) {
    localStorage.setItem("abotw-scale", scale);
    document.querySelector("#abotw-scale-value").textContent = `${scale}%`;
    
    // scale the font
    document.querySelector("body").style["font-size"] = `${scale}%`;
    
    // scale the icons
    let icons = Array.from(document.querySelectorAll("svg.abotw-iconify"));
    icons.map(icon => {
        icon.style["width"] =`calc(${scale/100} * var(--abotw-icons))`;
        icon.style["height"] = icon.style["width"];
    });

    // scale the settings controls
    let settingsInputs = Array.from(document.querySelectorAll("#abotw-settings input[type=checkbox]"));
    settingsInputs.map(input => {
        input.style["width"] = `calc(${scale/200} * var(--abotw-icons))`;
        input.style["height"] = `calc(${scale/200} * var(--abotw-icons))`;
    });
    
    // scale the prev/next document links to get the right size hover box
    let doclinks = Array.from(document.querySelectorAll("#abotw-document-links a"));
    doclinks.map(link => {
        link.style["width"] = `calc(${scale/100} * var(--abotw-icons))`;
        link.style["height"] = `calc(${scale/100} * var(--abotw-icons))`;
    });

    // scale the app toolbar help link
    let toolbarLinks = Array.from(document.querySelectorAll("#abotw-help"));
    toolbarLinks.map(link => {
        link.style["width"] = `calc(${scale/100} * var(--abotw-icons))`;
        link.style["height"] = `calc(${scale/100} * var(--abotw-icons))`;
    });

    // scale the sliders
    let style = 
    `input[type=range] {
        height: calc(${scale/500} * var(--abotw-icons));
    }
    input[type=range]::-moz-range-thumb, 
    input[type=range]::-ms-thumb,  
    input[type=range]::-webkit-slider-thumb {
        border: thin black solid;
        width: calc(${scale/200} * var(--abotw-icons));
        height: calc(${scale/200} * var(--abotw-icons));
    }`;

    if (document.querySelector("#abotw-settings style")) {
        document.querySelector("#abotw-settings style").innerHTML = style;
    }
    else {
        let styleElm = document.createElement("style");
        document.querySelector("#abotw-settings").insertBefore(styleElm, document.querySelector("#abotw-settings").firstChild);
        styleElm.innerHTML = style;
    }
    if (document.querySelector("#abotw-playback-toolbar")) {
        if (document.querySelector("#abotw-playback-toolbar style")) {
            document.querySelector("#abotw-playback-toolbar style").innerHTML = style;
        }
        else {
            let styleElm = document.createElement("style");
            document.querySelector("#abotw-playback-toolbar").insertBefore(styleElm, document.querySelector("#abotw-playback-toolbar").firstChild);
            styleElm.innerHTML = style;
        }
    }
    // scale the spacing on the nav sidebar
    document.querySelector("#abotw-nav > div").style["gap"] = `calc(${scale/300} * var(--abotw-icons))`;

    // scale the close buttons
    let closeButtons = Array.from(document.querySelectorAll(".abotw-panel > button svg:last-child"));
    closeButtons.map(closeButton => {
        closeButton.style["width"] = `calc(${scale/200} * var(--abotw-icons))`;
        closeButton.style["height"] = `calc(${scale/200} * var(--abotw-icons))`;
    });

    toolbarLinks.map(link => {
        link.style["width"] = `calc(${scale/100} * var(--abotw-icons))`;
        link.style["height"] = `calc(${scale/100} * var(--abotw-icons))`;
    });

    // scale the self-links next to each heading
    let selflinks = Array.from(document.querySelectorAll("main .abotw-selflink .abotw-iconify"));
    selflinks.map(link => {
        link.style["width"] = `calc(${scale/200} * var(--abotw-icons))`;
    });
}

function initRate() {
    let rate = localStorage.getItem("abotw-rate");

    if (document.querySelector("#abotw-rate input")) {
        let rateRange = document.querySelector("#abotw-rate input");
        rateRange.value = rate;

        rateRange.addEventListener("input", e => {
            setRate(e.target.value);
        });
        document.querySelector("#abotw-reset-rate").addEventListener("click", e => {
            rateRange.value = 100;
            setRate(100);
        });
    }
    setRate(rate);
}
function setRate(rate) {
    localStorage.setItem("abotw-rate", rate);
    if (document.querySelector("#abotw-rate-value")) {
        document.querySelector("#abotw-rate-value").textContent = `${rate}%`;
    }

    // set the rate
    if (player.audio) {
        player.audio.playbackRate = parseInt(rate)/100;
    }
}


export { createSettingsPanelContents };