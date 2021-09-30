import { createNavToolbar  } from './toolbars/nav.js';
// import * as icons from './icons.js';
// import { setupSettings } from './settings.js';
import { setupKeyboardShortcuts } from './keyboard.js';
import { createPlaybackToolbar } from './toolbars/playback.js';
import { createAppToolbar } from './toolbars/app.js';
import { createNavPanelContents } from './panels/nav.js';
import { createSettingsPanelContents } from './panels/settings.js';
import * as player from './player.js';

async function setupUi(smilHref, pathToRoot = '../') {
    try {
        initState();
        await createNavToolbar();
        createAppToolbar();
        await createNavPanelContents(pathToRoot);
        await createSettingsPanelContents(smilHref != null);

        if (smilHref) {
            createPlaybackToolbar(player);
            player.load(smilHref);
        }
        
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

        // remove the link to the nav document, we're using the nav sidebar instead
        document.querySelector("#p4w-toc-link").remove();
        document.querySelector("#p4w-about-link").remove();

        document.documentElement.classList.remove("p4w-js");
        document.querySelector("body").classList.add("p4w-fadein");        
    }
    catch(err) {
        console.error(err);
        document.documentElement.classList.remove("p4w-js"); // make sure to remove this even if there was a crash
    }

}


function initState() {
    // if (localStorage.getItem("p4w-darkmode") == null) {
    //     localStorage.setItem("p4w-darkmode", false);
    // }
    if (localStorage.getItem("p4w-fontsize") == null) {
        localStorage.setItem("p4w-fontsize", "100");
    }
    if (localStorage.getItem("p4w-rate") == null) {
        localStorage.setItem("p4w-rate", "100");
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