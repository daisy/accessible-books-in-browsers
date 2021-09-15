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

    fontSizeRange.addEventListener("change", e => {
        setFontSize(e.target.value);
    });
    setFontSize(fontsize);
}
function setFontSize(fontsize) {
    document.querySelector("#font-size-value").textContent = `${fontsize}%`;
    document.querySelector("body").style["font-size"] = `${fontsize}%`;
    localStorage.setItem("fontsize", fontsize);
}


export { createSettingsPanelContents };