import { createNavToolbar  } from './toolbars/nav.js';
// import * as icons from './icons.js';
// import { setupSettings } from './settings.js';
import { setupKeyboardShortcuts } from './keyboard.js';
// import { setupPlayback } from './toolbars/playback.js';
import { createAppToolbar } from './toolbars/app.js';
import { createNavPanelContents } from './panels/nav.js';
import { createSettingsPanelContents } from './panels/settings.js';

async function setupUi(smilHref, pathToRoot = '../') {
    try {
        initState();
        await createNavToolbar();
        createAppToolbar();
        await createNavPanelContents(pathToRoot);
        await createSettingsPanelContents();

        // if (smilHref) {
        //     setupPlayback(smilHref);
        // }
        
        setupKeyboardShortcuts();

        // remove the link to the nav document, we're using the nav sidebar instead
        document.querySelector("#toc-link").remove();
        document.querySelector("#about-link").remove();

        document.documentElement.classList.remove("js");
    }
    catch(err) {
        console.error(err);
        document.documentElement.classList.remove("js"); // make sure to remove this even if there was a crash
    }

}


function initState() {
    // if (localStorage.getItem("darkmode") == null) {
    //     localStorage.setItem("darkmode", false);
    // }
    if (localStorage.getItem("fontsize") == null) {
        localStorage.setItem("fontsize", "100");
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