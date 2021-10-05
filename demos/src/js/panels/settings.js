import * as player from '../player.js';

async function createSettingsPanelContents(includeAudioRate = false) {
    let settingsPanelContents = document.querySelector("#p4w-settings > div");
    settingsPanelContents.innerHTML = 
    `<h2>Settings</h2>
    <fieldset>
        <div id="p4w-dark-mode" title="Dark mode">
            <label for="p4w-dark-mode-toggle">Dark mode</label>
            <input type="checkbox" id="p4w-dark-mode-toggle">
        </div>
        <div id="p4w-scale" title="Scale">
            <label for="p4w-scale-range">Scale</label>
            <input type="range" id="p4w-scale-range" min="80" max="300" value="100" step="5">
            <p id="p4w-scale-value">100%</p>
            <button id="p4w-reset-scale">Reset scale</button>
        </div>
        ${includeAudioRate ? 
            `<div id="p4w-rate" title="Playback Rate">
                <label for="p4w-rate-range">Playback Rate</label>
                <input type="range" id="p4w-rate-range" min="50" max="300" value="100" step="5">
                <p id="p4w-rate-value">100%</p>
                <button id="p4w-reset-rate">Reset rate</button>
            </div>` 
            : ``}
    </fieldset>`;

    let darkModeToggle = document.querySelector("#p4w-dark-mode input");
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
    if (localStorage.getItem("p4w-darkmode") == null) {
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
    else if (localStorage.getItem("p4w-darkmode") == "true"){
        darkModeOn();
    }
    else {
        darkModeOff();
    }
}

function darkModeOn() {
    document.querySelector('body').classList.add('p4w-dark');
    document.querySelector('body').classList.remove('p4w-prefers-color-scheme-override');
    let darkModeToggle = document.querySelector("#p4w-dark-mode input");
    if (darkModeToggle) darkModeToggle.checked = true;

    localStorage.setItem("p4w-darkmode", true);
}
function darkModeOff() {
    document.querySelector('body').classList.remove('p4w-dark');
    document.querySelector('body').classList.add('p4w-prefers-color-scheme-override');
    localStorage.setItem("p4w-darkmode", false);
    let darkModeToggle = document.querySelector("#p4w-dark-mode input");
    if (darkModeToggle) darkModeToggle.checked = false;
}
function initScale() {
    let scale = localStorage.getItem("p4w-scale");

    let scaleRange = document.querySelector("#p4w-scale input");
    scaleRange.value = scale;

    scaleRange.addEventListener("input", e => {
        setScale(e.target.value);
    });
    document.querySelector("#p4w-reset-scale").addEventListener("click", e => {
        scaleRange.value = 100;
        setScale(100);
    });

    setScale(scale);
}
function setScale(scale) {
    localStorage.setItem("p4w-scale", scale);
    document.querySelector("#p4w-scale-value").textContent = `${scale}%`;
    
    // scale the font
    document.querySelector("body").style["font-size"] = `${scale}%`;
    
    // scale the icons
    let icons = Array.from(document.querySelectorAll("svg.p4w-iconify"));
    icons.map(icon => {
        icon.style["width"] =`calc(${scale/100} * var(--p4w-icons))`;
        icon.style["height"] = icon.style["width"];
    });

    // scale the settings controls
    let settingsInputs = Array.from(document.querySelectorAll("#p4w-settings input[type=checkbox]"));
    settingsInputs.map(input => {
        input.style["width"] = `calc(${scale/200} * var(--p4w-icons))`;
        input.style["height"] = `calc(${scale/200} * var(--p4w-icons))`;
    });
    
    // scale the prev/next document links to get the right size hover box
    let doclinks = Array.from(document.querySelectorAll("#p4w-document-links a"));
    doclinks.map(link => {
        link.style["width"] = `calc(${scale/100} * var(--p4w-icons))`;
        link.style["height"] = `calc(${scale/100} * var(--p4w-icons))`;
    });

    // scale the app toolbar help link
    let toolbarLinks = Array.from(document.querySelectorAll("#p4w-help"));
    toolbarLinks.map(link => {
        link.style["width"] = `calc(${scale/100} * var(--p4w-icons))`;
        link.style["height"] = `calc(${scale/100} * var(--p4w-icons))`;
    });

    // scale the sliders
    let style = 
    `input[type=range] {
        height: calc(${scale/500} * var(--p4w-icons));
    }
    input[type=range]::-moz-range-thumb, 
    input[type=range]::-ms-thumb,  
    input[type=range]::-webkit-slider-thumb {
        border: thin black solid;
        width: calc(${scale/200} * var(--p4w-icons));
        height: calc(${scale/200} * var(--p4w-icons));
    }`;

    if (document.querySelector("#p4w-settings style")) {
        document.querySelector("#p4w-settings style").innerHTML = style;
    }
    else {
        let styleElm = document.createElement("style");
        document.querySelector("#p4w-settings").insertBefore(styleElm, document.querySelector("#p4w-settings").firstChild);
        styleElm.innerHTML = style;
    }
    if (document.querySelector("#p4w-playback-toolbar")) {
        if (document.querySelector("#p4w-playback-toolbar style")) {
            document.querySelector("#p4w-playback-toolbar style").innerHTML = style;
        }
        else {
            let styleElm = document.createElement("style");
            document.querySelector("#p4w-playback-toolbar").insertBefore(styleElm, document.querySelector("#p4w-playback-toolbar").firstChild);
            styleElm.innerHTML = style;
        }
    }
    // scale the spacing on the nav sidebar
    document.querySelector("#p4w-nav > div").style["gap"] = `calc(${scale/300} * var(--p4w-icons))`;

    // scale the close buttons
    let closeButtons = Array.from(document.querySelectorAll(".p4w-panel > button svg:last-child"));
    closeButtons.map(closeButton => {
        closeButton.style["width"] = `calc(${scale/200} * var(--p4w-icons))`;
        closeButton.style["height"] = `calc(${scale/200} * var(--p4w-icons))`;
    });

    toolbarLinks.map(link => {
        link.style["width"] = `calc(${scale/100} * var(--p4w-icons))`;
        link.style["height"] = `calc(${scale/100} * var(--p4w-icons))`;
    });

    // scale the self-links next to each heading
    let selflinks = Array.from(document.querySelectorAll("main .p4w-selflink .p4w-iconify"));
    selflinks.map(link => {
        link.style["width"] = `calc(${scale/200} * var(--p4w-icons))`;
    });
}

function initRate() {
    let rate = localStorage.getItem("p4w-rate");

    if (document.querySelector("#p4w-rate input")) {
        let rateRange = document.querySelector("#p4w-rate input");
        rateRange.value = rate;

        rateRange.addEventListener("input", e => {
            setRate(e.target.value);
        });
        document.querySelector("#p4w-reset-rate").addEventListener("click", e => {
            rateRange.value = 100;
            setRate(100);
        });
    }
    setRate(rate);
}
function setRate(rate) {
    localStorage.setItem("p4w-rate", rate);
    if (document.querySelector("#p4w-rate-value")) {
        document.querySelector("#p4w-rate-value").textContent = `${rate}%`;
    }

    // set the rate
    if (player.audio) {
        player.audio.playbackRate = parseInt(rate)/100;
    }
}


export { createSettingsPanelContents };