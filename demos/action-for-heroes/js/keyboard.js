function setupKeyboardShortcuts() {
    // modifier + G = go to page dialog
    // modifier + arrow = prev/next section
    // modifier + T = open TOC
    // modifier + S = open search

    let isPanelOpen = (id) => document.querySelector(`#${id}`).classList.contains("expanded");
    let closeNavPanel = () => {
        if (isPanelOpen("nav")) {
            document.querySelector("#nav > button").click();
        }
    }
    let openNavPanel = () => {
        if (!isPanelOpen("nav")) {
            document.querySelector("#nav > button").click();
        }
    }
    let closeSettingsPanel = () => {
        if (isPanelOpen("settings")) {
            document.querySelector("#settings > button").click();
        }
    }
    let openSettingsPanel = () => {
        if (!isPanelOpen("settings")) {
            document.querySelector("#settings > button").click();
        }
    }

    document.addEventListener("keyup", e => {
        // console.log(e);
        if (e.code == "Escape") {
            closeNavPanel();  
            closeSettingsPanel(); 
        }
        if (e.ctrlKey && e.altKey && e.code == 'KeyG') {
            openNavPanel();
            document.querySelector("#pagelist-button").click();
            document.querySelector("#gotopage-text").focus();
        }
        if (e.ctrlKey && e.altKey && e.code == "KeyT") {
            openNavPanel();
            document.querySelector("#toc-button").click();
            document.querySelector("#toc-wrapper .epubtype-toc ol li a").focus();
        }
        if (e.ctrlKey && e.altKey && e.code == "ArrowRight") {
            closeNavPanel();
            document.querySelector("#document-links #next-section")?.click();
        }
        if (e.ctrlKey && e.altKey && e.code == "ArrowLeft") {
            closeNavPanel();
            document.querySelector("#document-links #previous-section")?.click();
        }
        if (e.ctrlKey && e.altKey && e.code == "KeyS") {
            openNavPanel();
            document.querySelector("#search-button").click();
            document.querySelector("#search-text").focus();
        }
    });

}

export { setupKeyboardShortcuts };