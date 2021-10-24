import { createNavToolbar  } from './toolbars/nav.js';
import { setupKeyboardShortcuts } from './keyboard.js';
import { createPlaybackToolbar } from './toolbars/playback.js';
import { createApplicationToolbar } from './toolbars/application.js';
import { createNavPanelContents } from './panels/nav.js';
import { createSettingsPanelContents } from './panels/settings.js';
import * as player from './player.js';

async function setupUi(searchIndexUrl, searchDataUrl) {
    initState();
    // collect data before these elements get replaced
    let aboutUrl = new URL(document.querySelector("#abotw-about-link").getAttribute("href"), document.location);
    let navUrl = new URL(document.querySelector("#abotw-toc-link").getAttribute("href"), document.location);

    await createNavToolbar();
    await createNavPanelContents(navUrl, aboutUrl, searchIndexUrl, searchDataUrl);
    
    let hasSyncAudio = false;
    if (document.querySelector("#abotw-audio")) {
        hasSyncAudio = true;
        await player.load();
        createPlaybackToolbar();
    }
    createApplicationToolbar('../src/help');
    await createSettingsPanelContents(hasSyncAudio);
    setupKeyboardShortcuts();

    let nextSection = document.querySelector("#abotw-next-section");
    let prevSection = document.querySelector("#abotw-previous-section")
    if (nextSection) {
        nextSection.addEventListener("click", async e => {
            document.querySelector("body").classList.add("abotw-fadeout");
        });
    }
    if (prevSection) {
        prevSection.addEventListener("click", async e => {
            document.querySelector("body").classList.add("abotw-fadeout");
        });
    }

    if (localStorage.getItem("abotw-target")) { 
        let elm = document.querySelector(localStorage.getItem("abotw-target"));
        if (elm) {
            elm.classList.add("search-result");
            elm.scrollIntoView();
            elm.setAttribute("role", "mark");
        }
    }
    localStorage.setItem("abotw-target", null);

    document.documentElement.classList.remove("abotw-js");
    document.querySelector("body").classList.add("abotw-fadein");

    if (localStorage.getItem("abotw-autoplay") == "true") {
        localStorage.setItem("abotw-autoplay", false);
        // let playButton = document.querySelector("#abotw-playpause");
        // try {
        //     console.debug("Attempting to start playback automatically");
        //     if (playButton) playButton.click();
        //     else console.error("Play button not found");
        // }
        // catch(err) {
        //     console.error(err);
        // }
    }
}


function initState() {
    if (localStorage.getItem("abotw-size") == null) {
        localStorage.setItem("abotw-size", "100");
    }
    if (localStorage.getItem("abotw-rate") == null) {
        localStorage.setItem("abotw-rate", "100");
    }
    if (localStorage.getItem("abotw-volume") == null) {
        localStorage.setItem("abotw-volume", 100);
    }
    if (localStorage.getItem("abotw-announce-pagenumbers") == null) {
        localStorage.setItem("abotw-announce-pagenumbers", true);
    }
}

// for the future
function trackScrollInLocationUrl() {
    let options = {
        root: document.querySelector('main'),
        rootMargin: '0px',
        threshold: .5
    }
    let callback = (entries, observer) => {
        entries.forEach(entry => {
          // Each entry describes an intersection change for one observed
          // target element:
          //   entry.boundingClientRect
          //   entry.intersectionRatio
          //   entry.intersectionRect
          //   entry.isIntersecting
          //   entry.rootBounds
          //   entry.target
          //   entry.time
          if (entry.isIntersecting) {
            //   history.pushState({}, document.title, new Url(entry.target.id, location.href));
          }
        });
      };
    
    let observer = new IntersectionObserver(callback, options);
    let elmsWithId = Array.from(document.querySelectorAll("main *[id]"));
    elmsWithId.map(elm => observer.observe(elm));
}

export { setupUi };