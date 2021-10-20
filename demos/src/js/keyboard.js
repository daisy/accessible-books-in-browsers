function setupKeyboardShortcuts() {
    // modifier + G = go to page dialog
    // modifier + arrow = prev/next section
    // modifier + T = open TOC
    // modifier + S = open search

    let isPanelOpen = (id) => document.querySelector(`#${id}`).classList.contains("abotw-expanded");
    let closeNavPanel = () => {
        if (isPanelOpen("abotw-nav")) {
            document.querySelector("#abotw-nav > button").click();
        }
    }
    let openNavPanel = () => {
        if (!isPanelOpen("abotw-nav")) {
            document.querySelector("#abotw-nav > button").click();
        }
    }
    let closeSettingsPanel = () => {
        if (isPanelOpen("abotw-settings")) {
            document.querySelector("#abotw-settings > button").click();
        }
    }
    let openSettingsPanel = () => {
        if (!isPanelOpen("abotw-settings")) {
            document.querySelector("#abotw-settings > button").click();
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
            document.querySelector("#abotw-page-list-button").click();
            document.querySelector("#abotw-gotopage-text").focus();
        }
        if (e.ctrlKey && e.altKey && e.code == "KeyT") {
            openNavPanel();
            document.querySelector("#abotw-toc-button").click();
            document.querySelector("#abotw-toc-wrapper nav.epubtype_toc ol li a").focus();
        }
        if (e.ctrlKey && e.altKey && !e.shiftKey && e.code == "ArrowRight") {
            closeNavPanel();
            closeSettingsPanel();
            document.querySelector("#abotw-next-section")?.click();
        }
        if (e.ctrlKey && e.altKey && !e.shiftKey && e.code == "ArrowLeft") {
            closeNavPanel();
            closeSettingsPanel();
            document.querySelector("#abotw-previous-section")?.click();
        }
        if (e.ctrlKey && e.altKey && e.code == "KeyS") {
            openNavPanel();
            document.querySelector("#abotw-search-button").click();
            document.querySelector("#abotw-search-text").focus();
        }
        if (e.ctrlKey && e.altKey && e.code == "Space") {
            document.querySelector("#abotw-playpause").click();
        }
        if (e.ctrlKey && e.altKey && e.shiftKey && e.code == "ArrowRight") {            
            document.querySelector("#abotw-next-phrase").click();
        }
        if (e.ctrlKey && e.altKey && e.shiftKey && e.code == "ArrowLeft") {
            document.querySelector("#abotw-previous-phrase").click();
        }
        // focus on volume control
        // we could instead offer dedicated volume up/down shortcuts but i kinda like this better
        // keyboard users can just use the widget to adjust the volume once it has focus
        if (e.ctrlKey && e.altKey && e.code == "KeyV") {
            document.querySelector("#abotw-volume").focus();
        }
        if (e.ctrlKey && e.altKey && e.code == "Comma") {
            openSettingsPanel();
        }
        if (e.ctrlKey && e.altKey && e.code == "KeyH") {
            document.querySelector("#abotw-help a").click();
        }
        
    });

}

export { setupKeyboardShortcuts };