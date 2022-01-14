function setupKeyboardShortcuts() {
    let isPanelOpen = (id) => document.querySelector(`#${id}`).classList.contains("abinb-expanded");
    let closeNavPanel = () => {
        if (isPanelOpen("abinb-nav")) {
            document.querySelector("#abinb-nav > button").click();
        }
    }
    let openNavPanel = () => {
        if (!isPanelOpen("abinb-nav")) {
            document.querySelector("#abinb-nav > button").click();
        }
    }
    let closeSettingsPanel = () => {
        if (isPanelOpen("abinb-settings")) {
            document.querySelector("#abinb-settings > button").click();
        }
    }
    let openSettingsPanel = () => {
        if (!isPanelOpen("abinb-settings")) {
            document.querySelector("#abinb-settings > button").click();
        }
    }

    document.addEventListener("keyup", e => {
        // console.log(e);
        if (e.code == "Escape") {
            closeNavPanel();  
            closeSettingsPanel(); 
            // clear any search results styling
            // TODO duplicate code
            let oldResultHighlights = Array.from(document.querySelectorAll(".search-result"));
            oldResultHighlights.map(el => {
                el.classList.remove('.search-result');
                let attrval = el.getAttribute("role");
                attrval = attrval.replace('mark', '');
                el.setAttribute("role", attrval);
            });
        }
        if (e.ctrlKey && e.altKey && e.code == 'KeyG') {
            openNavPanel();
            document.querySelector("#abinb-page-list-button").click();
            document.querySelector("#abinb-gotopage-text").focus();
        }
        if (e.ctrlKey && e.altKey && e.code == "KeyT") {
            openNavPanel();
            document.querySelector("#abinb-toc-button").click();
            document.querySelector("#abinb-toc-wrapper nav.epubtype_toc ol li a").focus();
        }
        if (e.ctrlKey && e.altKey && !e.shiftKey && e.code == "ArrowRight") {
            closeNavPanel();
            closeSettingsPanel();
            document.querySelector("#abinb-next-section")?.click();
        }
        if (e.ctrlKey && e.altKey && !e.shiftKey && e.code == "ArrowLeft") {
            closeNavPanel();
            closeSettingsPanel();
            document.querySelector("#abinb-previous-section")?.click();
        }
        if (e.ctrlKey && e.altKey && e.code == "KeyS") {
            openNavPanel();
            document.querySelector("#abinb-search-button").click();
            document.querySelector("#abinb-search-text").focus();
        }
        if (e.ctrlKey && e.altKey && e.code == "Space") {
            document.querySelector("#abinb-playpause").click();
        }
        if (e.ctrlKey && e.altKey && e.shiftKey && e.code == "ArrowRight") {            
            document.querySelector("#abinb-next-phrase").click();
        }
        if (e.ctrlKey && e.altKey && e.shiftKey && e.code == "ArrowLeft") {
            document.querySelector("#abinb-previous-phrase").click();
        }
        // focus on volume control
        // we could instead offer dedicated volume up/down shortcuts but i kinda like this better
        // keyboard users can just use the widget to adjust the volume once it has focus
        if (e.ctrlKey && e.altKey && e.code == "KeyV") {
            document.querySelector("#abinb-volume").focus();
        }
        if (e.ctrlKey && e.altKey && e.code == "Comma") {
            openSettingsPanel();
        }
        if (e.ctrlKey && e.altKey && e.code == "KeyH") {
            document.querySelector("#abinb-help a").click();
        }
        
    });

}

export { setupKeyboardShortcuts };