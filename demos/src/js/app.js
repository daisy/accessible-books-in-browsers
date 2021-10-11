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
    let aboutUrl = new URL(document.querySelector("#p4w-about-link").getAttribute("href"), document.location);
    let navUrl = new URL(document.querySelector("#p4w-toc-link").getAttribute("href"), document.location);

    await createNavToolbar();
    await createNavPanelContents(navUrl, aboutUrl, searchIndexUrl, searchDataUrl);
    
    let hasSyncAudio = false;
    if (document.querySelector("#p4w-audio")) {
        let audioSrc = new URL(document.querySelector("#p4w-audio audio").getAttribute("src"), document.location);
        let vttSrc = new URL(document.querySelector("#p4w-audio track").getAttribute("src"), document.location);
        hasSyncAudio = true;
        await player.load(audioSrc, vttSrc);
        createPlaybackToolbar();
    }
    createApplicationToolbar();
    await createSettingsPanelContents(hasSyncAudio);
    setupKeyboardShortcuts();

    let nextSection = document.querySelector("#p4w-next-section");
    let prevSection = document.querySelector("#p4w-previous-section")
    if (nextSection) {
        nextSection.addEventListener("click", async e => {
            document.querySelector("body").classList.add("p4w-fadeout");
        });
    }
    if (prevSection) {
        prevSection.addEventListener("click", async e => {
            document.querySelector("body").classList.add("p4w-fadeout");
        });
    }

    if (localStorage.getItem("p4w-target")) { 
        let elm = document.querySelector(localStorage.getItem("p4w-target"));
        if (elm) {
            // console.log("highlighting search result", localStorage.getItem("p4w-target"));
            elm.classList.add("search-result");
            elm.scrollIntoView();
            elm.setAttribute("role", "mark");
        }
    }
    localStorage.setItem("p4w-target", null);

    document.documentElement.classList.remove("p4w-js");
    document.querySelector("body").classList.add("p4w-fadein");
}


function initState() {
    // if (localStorage.getItem("p4w-darkmode") == null) {
    //     localStorage.setItem("p4w-darkmode", false);
    // }
    if (localStorage.getItem("p4w-scale") == null) {
        localStorage.setItem("p4w-scale", "100");
    }
    if (localStorage.getItem("p4w-rate") == null) {
        localStorage.setItem("p4w-rate", "100");
    }
    if (localStorage.getItem("p4w-volume") == null) {
        localStorage.setItem("p4w-volume", 100);
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