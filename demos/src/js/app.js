import { createNavToolbar  } from './toolbars/nav.js';
import { setupKeyboardShortcuts } from './keyboard.js';
import { createPlaybackToolbar } from './toolbars/playback.js';
import { createApplicationToolbar } from './toolbars/application.js';
import { createNavPanelContents } from './panels/nav.js';
import { createSettingsPanelContents } from './panels/settings.js';
import * as player from './player.js';

async function setupUi(smilHref, pathToRoot = '../') {
    initState();
    await createNavToolbar();
    await createNavPanelContents(pathToRoot);
    
    if (smilHref) {
        await player.load(new URL(smilHref, document.location.href));
        createPlaybackToolbar();
    }
    createApplicationToolbar();
    await createSettingsPanelContents(smilHref != null);
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