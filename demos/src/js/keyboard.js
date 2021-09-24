function setupKeyboardShortcuts() {
    // modifier + G = go to page dialog
    // modifier + arrow = prev/next section
    // modifier + T = open TOC
    // modifier + S = open search

    let isPanelOpen = (id) => document.querySelector(`#${id}`).classList.contains("p4w-expanded");
    let closeNavPanel = () => {
        if (isPanelOpen("p4w-nav")) {
            document.querySelector("#p4w-nav > button").click();
        }
    }
    let openNavPanel = () => {
        if (!isPanelOpen("p4w-nav")) {
            document.querySelector("#p4w-nav > button").click();
        }
    }
    let closeSettingsPanel = () => {
        if (isPanelOpen("p4w-settings")) {
            document.querySelector("#p4w-settings > button").click();
        }
    }
    let openSettingsPanel = () => {
        if (!isPanelOpen("p4w-settings")) {
            document.querySelector("#p4w-settings > button").click();
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
            document.querySelector("#p4w-pagelist-button").click();
            document.querySelector("#p4w-gotopage-text").focus();
        }
        if (e.ctrlKey && e.altKey && e.code == "KeyT") {
            openNavPanel();
            document.querySelector("#p4w-toc-button").click();
            document.querySelector("#p4w-toc-wrapper nav.epubtype-toc ol li a").focus();
        }
        if (e.ctrlKey && e.altKey && e.code == "ArrowRight") {
            closeNavPanel();
            document.querySelector("#p4w-next-section")?.click();
        }
        if (e.ctrlKey && e.altKey && e.code == "ArrowLeft") {
            closeNavPanel();
            document.querySelector("#p4w-previous-section")?.click();
        }
        if (e.ctrlKey && e.altKey && e.code == "KeyS") {
            openNavPanel();
            document.querySelector("#p4w-search-button").click();
            document.querySelector("#p4w-search-text").focus();
        }
    });

}

export { setupKeyboardShortcuts };