async function createSettingsPanelContents() {
    let settingsPanelContents = document.querySelector("#settings > div");
    settingsPanelContents.innerHTML = 
    `<h2>Settings</h2>
    <fieldset>
        <div id="dark-mode" title="Dark mode">
            <label for="dark-mode-toggle">Dark mode</label>
            <input type="checkbox" id="dark-mode-toggle">
        </div>
        <div id="font-size" title="Font size">
            <label for="font-size-range">Font size</label>
            <input type="range" id="font-size-range" min="80" max="300" value="100" step="5">
            <p id="font-size-value">100%</p>
            <button id="reset-font-size">Reset</button>
        </div>
    </fieldset>`;

    let darkModeToggle = document.querySelector("#dark-mode input");
    darkModeToggle.addEventListener("change", e => {
        if (darkModeToggle.checked) {
            darkModeOn();
        }
        else {
            darkModeOff();
        }
    });

    initFontsize();
    initDarkMode();
}

function initDarkMode() {
    if (localStorage.getItem("darkmode") == null) {
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
    else if (localStorage.getItem("darkmode") == "true"){
        darkModeOn();
    }
    else {
        darkModeOff();
    }
}

function darkModeOn() {
    document.querySelector('body').classList.add('dark');
    document.querySelector('body').classList.remove('prefers-color-scheme-override');
    let darkModeToggle = document.querySelector("#dark-mode input");
    if (darkModeToggle) darkModeToggle.checked = true;

    localStorage.setItem("darkmode", true);
}
function darkModeOff() {
    document.querySelector('body').classList.remove('dark');
    document.querySelector('body').classList.add('prefers-color-scheme-override');
    localStorage.setItem("darkmode", false);
    let darkModeToggle = document.querySelector("#dark-mode input");
    if (darkModeToggle) darkModeToggle.checked = false;
}
function initFontsize() {
    let fontsize = localStorage.getItem("fontsize");

    let fontSizeRange = document.querySelector("#font-size input");
    fontSizeRange.value = fontsize;

    fontSizeRange.addEventListener("input", e => {
        setFontSize(e.target.value);
    });
    document.querySelector("#reset-font-size").addEventListener("click", e => {
        setFontSize(100);
    });

    setFontSize(fontsize);
}
function setFontSize(fontsize) {
    localStorage.setItem("fontsize", fontsize);
    
    // scale the font
    document.querySelector("#font-size-value").textContent = `${fontsize}%`;
    document.querySelector("body").style["font-size"] = `${fontsize}%`;
    
    // scale the icons
    let icons = Array.from(document.querySelectorAll("svg.iconify"));
    icons.map(icon => {
        icon.style["width"] =`calc(${fontsize/100} * var(--icons))`;
        icon.style["height"] = icon.style["width"];
    });

    // scale the settings controls
    let settingsInputs = Array.from(document.querySelectorAll("#settings input[type=checkbox]"));
    settingsInputs.map(input => {
        input.style["width"] = `calc(${fontsize/200} * var(--icons))`;
        input.style["height"] = `calc(${fontsize/200} * var(--icons))`;
    });
    
    // scale the prev/next document links to get the right size hover box
    let doclinks = Array.from(document.querySelectorAll("#document-links a"));
    doclinks.map(link => {
        link.style["width"] = `calc(${fontsize/100} * var(--icons))`;
        link.style["height"] = `calc(${fontsize/100} * var(--icons))`;
    });

    // scale the app toolbar help link
    let toolbarLinks = Array.from(document.querySelectorAll("#app-toolbar #help"));
    toolbarLinks.map(link => {
        link.style["width"] = `calc(${fontsize/100} * var(--icons))`;
        link.style["height"] = `calc(${fontsize/100} * var(--icons))`;
    });

    // scale the slider
    let style = 
    `input[type=range] {
        height: calc(${fontsize/500} * var(--icons));
    }
    input[type=range]::-moz-range-thumb, 
    input[type=range]::-ms-thumb,  
    input[type=range]::-webkit-slider-thumb {
        border: thin black solid;
        width: calc(${fontsize/200} * var(--icons));
        height: calc(${fontsize/200} * var(--icons));
    }`;

    if (document.querySelector("#settings style")) {
        document.querySelector("#settings style").innerHTML = style;
    }
    else {
        let styleElm = document.createElement("style");
        document.querySelector("#settings").insertBefore(styleElm, document.querySelector("#settings").firstChild);
        styleElm.innerHTML = style;
    }

    // scale the spacing on the nav sidebar
    document.querySelector("#nav > div").style["gap"] = `calc(${fontsize/300} * var(--icons))`;

    // scale the close buttons
    let closeButtons = Array.from(document.querySelectorAll(".panel > button svg:last-child"));
    closeButtons.map(closeButton => {
        closeButton.style["width"] = `calc(${fontsize/200} * var(--icons))`;
        closeButton.style["height"] = `calc(${fontsize/200} * var(--icons))`;
    });

    toolbarLinks.map(link => {
        link.style["width"] = `calc(${fontsize/100} * var(--icons))`;
        link.style["height"] = `calc(${fontsize/100} * var(--icons))`;
    });

    // scale the self-links next to each heading
    let selflinks = Array.from(document.querySelectorAll("main .selflink .iconify"));
    selflinks.map(link => {
        link.style["width"] = `calc(${fontsize/200} * var(--icons))`;
    })
}


export { createSettingsPanelContents };