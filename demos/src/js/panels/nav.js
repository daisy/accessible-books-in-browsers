import * as icons from '../icons.js';
// import Fuse from '../lib/fuse.js';
import Fuse from 'https://cdn.jsdelivr.net/npm/fuse.js@6.4.6/dist/fuse.esm.js'

async function createNavPanelContents(pathToRoot, searchIndexUrl, searchDataUrl) {
    // read in the navigation document
    await importNavDoc(pathToRoot);

    // convert the navigation doc contents into a tabbed view
    convertToTabs();

    addGoToPage();

    await initSearchPanel(document.querySelector("#p4w-search"), searchIndexUrl, searchDataUrl);
    await initAboutPanel(pathToRoot);

    updateLinks(pathToRoot);
}


/*
structure the navigation like this
<!-- tab controls -->
<nav id="list-of-navs">
    <ol role="tablist">
        <!-- buttons instead of links -->
        <li><button role="tab">
        ...
    </ol>
</nav>
<!-- tab contents -->
<div role="tab-panel" >
    <!-- from original nav doc -->
    <nav class="epubtype-toc"> 
    ...
</div>
<div role="tab-panel">
    <!-- from original nav doc -->
    <nav class="epubtype-pagelist">
    ...
</div>
...
*/
function convertToTabs() {
    let listOfNavs = document.querySelector("#p4w-list-of-navs");
    let listItems = []; // all the tabs

    if (!listOfNavs) {
        // create if doesn't exist
        listOfNavs = document.createElement("nav");
        listOfNavs.id = "p4w-list-of-navs";
        listOfNavs.innerHTML = "<ol></ol>";
        document.querySelector("#p4w-nav > div").insertBefore(listOfNavs, document.querySelector("#p4w-nav > div").firstElementChild);
        // add a link to the toc
        let toc = document.querySelector("nav.epubtype-toc");
        listItems.push({"label": "Table of Contents", "target": toc.id});
    }
    // collect all the links
    listItems.push(
        Array.from(listOfNavs.querySelectorAll("li a")).map(link => 
            ({"label": link.innerHTML, "target": link.getAttribute("href").replace("#", '')}))
    );
    listItems = listItems.flat();

    // clear the list
    listOfNavs.querySelector("ol").innerHTML = '';

    // add a panel and a button for searching
    listItems.push({label: "Search", target: "p4w-search"});
    let searchSection = document.createElement("section");
    searchSection.id = "p4w-search";
    searchSection.classList.add("p4w-search");
    document.querySelector("#p4w-nav > div").appendChild(searchSection);

    // add a panel and a button for book info
    listItems.push({label: "About", target: "p4w-about"});
    let aboutSection = document.createElement("section");
    aboutSection.id = "p4w-about";
    aboutSection.classList.add("p4w-about");
    document.querySelector("#p4w-nav > div").appendChild(aboutSection);

    // convert all list items <button>s
    // Array.from(listOfNavs.querySelectorAll("li a")).map(link => {
    let tabs = listItems.map(item => createNavPanelTab(item.label, item.target)).join('');
    
    
    let divOfNavs = document.createElement("div");
    divOfNavs.innerHTML = tabs;
    divOfNavs.setAttribute("role", "tablist");
    
    // replace listOfNavs with divOfnavs
    document.querySelector("#p4w-nav > div").insertBefore(divOfNavs, listOfNavs);
    listOfNavs.remove();
    divOfNavs.id = "p4w-list-of-navs";

    // remove any redundant labels
    // the navs just use aria-label, not aria-labelledby
    // the tab panels will have the visual label for the nav wrapper
    document.querySelectorAll("#p4w-nav nav").forEach(nav => {
        if (nav.hasAttribute("aria-labelledby")) {
            let label = getLabel(nav);
            nav.setAttribute("aria-label", label);
            document.getElementById(nav.getAttribute("aria-labelledby")).remove();
            nav.removeAttribute("aria-labelledby");
        }
    });

    addEvents();
}

// 1. wrap the target element with a tabpanel
// 2. make tab button markup for that panel as <li><button>...
// 3. return the markup as a string
function createNavPanelTab(label, targetId) {
    let target = document.getElementById(targetId);
    
    // create a tab panel button, which will replace the original in-document link
    // pick an icon for it
    let icon = '';
    let idPrefix = '';
    if (target.classList.contains("epubtype-toc")) {
        icon = icons.toc;
        idPrefix = 'p4w-toc';
    }
    else if (target.classList.contains("epubtype-landmarks")) {
        icon = icons.landmarks;
        idPrefix = 'p4w-landmarks';
    }
    else if (target.classList.contains("epubtype-pagelist")) {
        icon = icons.pages;
        idPrefix = 'p4w-pagelist';
    }
    else if (target.classList.contains("p4w-bookmarks")) {
        icon = icons.bookmarks;
        idPrefix = 'p4w-bookmarks';
    }
    else if (target.classList.contains("p4w-search")) {
        icon = icons.search;
        idPrefix = 'p4w-search';
    }
    else if (target.classList.contains("p4w-about")) {
        icon = icons.info;
        idPrefix = 'p4w-about';
    }
    else {
        icon = icons.landmarks; // this icon is pretty generic-looking
        idPrefix = targetId;
    }

    // setup the tab panel by wrapping target of the link 
    // with <div role="tabpanel"  tabindex="0" aria-labelledby="tab-1">
    // we're not adding this directly to <nav> because we don't want to lose the semantics there
    
    let targetWrapper = document.createElement("div");
    targetWrapper.setAttribute("role", "tabpanel");
    targetWrapper.id = `${idPrefix}-wrapper`;
    targetWrapper.setAttribute("aria-labelledby", `${idPrefix}-button`);
    targetWrapper.setAttribute("tab-index", "0");
    target.parentElement.insertBefore(targetWrapper, target);
    targetWrapper.appendChild(target);

    // default focus on the toc
    let isToc = target.classList.contains("epubtype-toc");
    let tabIndex = isToc ? "0" : "-1";
    let ariaSelected = isToc ? "true" : "false";
    if (!isToc) {
        targetWrapper.setAttribute("hidden", true);
    }
    // the tab button
    let button = 
    `<button 
        aria-controls="${idPrefix}-wrapper" 
        id="${idPrefix}-button"
        tab-index="${tabIndex}"
        aria-selected="${ariaSelected}"
        role="tab"
        class="p4w-lightup"
        aria-label="${label}">
            ${icon}
            <span>${label}</span>
    </button>`
    
    return button;
}


function getLabel(elm) {
    if (elm.hasAttribute("aria-label")) {
        return elm.getAttribute("aria-label");
    }
    if (elm.hasAttribute("aria-labelledby")) {
        let labelledby = document.getElementById(elm.getAttribute("aria-labelledby"));
        return labelledby.textContent;
    }
    return "";
}

function addEvents() {
    const tabs = document.querySelectorAll('#p4w-nav [role="tab"]');
    const tabList = document.querySelector('#p4w-nav [role="tablist"]');

    // Add a click event handler to each tab
    tabs.forEach(tab => {
        tab.addEventListener("click", changeTabs);
    });
  
    // Enable arrow navigation between tabs in the tab list
    let tabFocus = 0;
  
    tabList.addEventListener("keydown", e => {
        // right/left
        if (e.keyCode === 39 || e.keyCode === 37) {
            tabs[tabFocus].setAttribute("tabindex", -1);
            
            if (e.keyCode === 39) {
                tabFocus++;
                // If we're at the end, go to the start
                if (tabFocus >= tabs.length) {
                    tabFocus = 0;
                }
            } 
            else if (e.keyCode === 37) {
                tabFocus--;
                // If we're at the start, move to the end
                if (tabFocus < 0) {
                    tabFocus = tabs.length - 1;
                }
            }
            tabs[tabFocus].setAttribute("tabindex", 0);
            tabs[tabFocus].focus();
        }
    });
}
  
function changeTabs(e) {

    const target = e.target;
    const tablist = document.querySelector("#p4w-nav *[role=tablist]");
    const navPanel = document.querySelector("#p4w-nav");

    if (target.hasAttribute("aria-controls") && target.getAttribute("role") == "tab") {
        // Remove all current selected tabs
        tablist
            .querySelectorAll('[aria-selected="true"]')
            .forEach(t => t.setAttribute("aria-selected", false));

        // Set this tab as selected
        target.setAttribute("aria-selected", true);

        // Hide all tab panels
        navPanel
            .querySelectorAll('[role="tabpanel"]')
            .forEach(p => p.setAttribute("hidden", true));

        // Show the selected panel
        navPanel.querySelector(`#${target.getAttribute("aria-controls")}`)
            .removeAttribute("hidden");
        e.preventDefault();
    }
    
}

function addGoToPage() {
    if (document.querySelector("nav.epubtype-pagelist")) {
        let gotoPage = (pageNumber) => {
            document.querySelector("#p4w-gotopage-error").textContent = "";
            let pages = document.querySelectorAll("nav.epubtype-pagelist li a");
            let page = Array.from(pages).find(page => page.textContent.toLowerCase() == pageNumber.trim().toLowerCase());
            if (page) page.click();
            else document.querySelector("#p4w-gotopage-error").textContent = "Page not found";
        };
    
        
        let gotoPagelist = document.createElement("div");
        gotoPagelist.innerHTML = 
        `<div>
            <label for="p4w-gotopage-text">Go to page:</label>
            <input id="p4w-gotopage-text" type="text" placeholder="Page number"></input>
            <input type="button" value="Go"></input>
        </div>
        <p id="p4w-gotopage-error" aria-live="polite"></p>
        `;
        document.querySelector("#p4w-pagelist-wrapper").insertBefore(gotoPagelist, document.querySelector("nav.epubtype-pagelist"));

        document.querySelector("#p4w-gotopage-text").addEventListener("keyup", e => {
            if (e.code == "Enter") gotoPage(e.target.value);
            else {
                if (e.target.value == "") document.querySelector("#p4w-gotopage-error").textContent = "";
            }
        });

        document.querySelector("#p4w-gotopage-text ~ input[type=button]").addEventListener("click", e => 
            gotoPage(document.querySelector("#p4w-gotopage-text").value));

    }
}

function updateLinks(pathToRoot = '') {
    // modify the nav hrefs to make sense in the context of our current document
    let navdocUrl = new URL(`${pathToRoot}nav.html`, document.location.href);
    let aboutdocUrl = new URL(`${pathToRoot}about.html`, document.location.href);
    Array.from(document.querySelectorAll("#p4w-nav > div a, #p4w-nav > div img")).map(elm => {
        if (elm.hasAttribute("href")) {
            let newHref = new URL(elm.getAttribute("href"), navdocUrl.href).href;
            elm.setAttribute("href", newHref);
        }
        if (elm.hasAttribute("src")) {
            let newSrc = new URL(elm.getAttribute("src"), aboutdocUrl.href).href;
            elm.setAttribute("src", newSrc);
        }
    });

}
async function initSearchPanel(searchPanel, searchIndexUrl, searchDataUrl) {
    searchPanel.innerHTML = 
    `<div>
        <label for="p4w-search">Search</label>
        <input type="search" id="p4w-search-text" placeholder="Search"></input>
        <input type="button" id="p4w-search-button" value="Search"></input>
    </div>`;

    let fuse = await initSearchEngine(searchIndexUrl, searchDataUrl);
    
    searchPanel.querySelector("#p4w-search-button").addEventListener("click", async e => {
        let searchText = searchPanel.querySelector("#p4w-search-text").value;
        if (searchText.trim() != '') {
            let result = fuse.search(searchText);
            presentSearchResults(result);
        }
    });
}

async function initAboutPanel(pathToRoot) {
    await importAboutDoc(pathToRoot);
}

async function importAboutDoc(pathToRoot) {
    // fetch the navigation document and extract the nav elements
    let aboutdocUrl = new URL(`${pathToRoot}about.html`, document.location.href);
    let res = await fetch(aboutdocUrl.href);
    let text = await res.text();    
    let parser = new DOMParser();
    let dom = await parser.parseFromString(text, 'text/html');
    let main = dom.querySelector('main');

    let navContainer = document.querySelector("#p4w-about");
    let images = Array.from(main.querySelector("img"));
    
    // adjust the image URLs 
    images
        .filter(img => !isAbsolute(img.getAttribute("src")))
        .map(img => img.setAttribute("src", "../" + img.getAttribute("src")));

    // reparent the nav doc elements
    Array.from(main.childNodes).map(child => navContainer.appendChild(child));

}

function isAbsolute(url) {
    if (!url || url.trim() == "") {
        return false;
    }
    // TODO make this more robust
    if (url.indexOf("http://") == 0 || url.indexOf("https://") == 0 || url.indexOf("/") == 0) {
        return true;
    }
    return false;
}

async function importNavDoc(pathToRoot) {
    // fetch the navigation document and extract the nav elements
    let navdocUrl = new URL(`${pathToRoot}nav.html`, document.location.href);
    let res = await fetch(navdocUrl.href);
    let text = await res.text();    
    let parser = new DOMParser();
    let dom = await parser.parseFromString(text, 'text/html');
    let main = dom.querySelector('main');

    let navContainer = document.querySelector("#p4w-nav > div");
    // reparent the nav doc elements
    Array.from(main.childNodes).map(child => navContainer.appendChild(child));

}
async function initSearchEngine(searchIndexUrl, searchDataUrl) {

    let idxFile = await fetch(searchIndexUrl);
    idxFile = await idxFile.text();
    let idx = Fuse.parseIndex(JSON.parse(idxFile));
    let dataFile = await fetch(searchDataUrl);
    let data = await dataFile.text();
    data = JSON.parse(data);
    const options = {
        includeScore: true,
        keys: ['text'],
        threshold: 0.4
    };
    let fuse = new Fuse(data, options, idx);
    return fuse;
}

function presentSearchResults(results) {
    // clear any old results
    let resultsElm = document.querySelector("#p4w-search section");
    if (resultsElm) resultsElm.remove();
    let oldResultHighlights = Array.from(document.querySelectorAll(".search-result"));
    oldResultHighlights.map(el => {
        el.classList.remove('.search-result');
        let attrval = el.getAttribute("role");
        attrval = attrval.replace('mark', '');
        el.setAttribute("role", attrval);
    });

    resultsElm = document.createElement("section");
    resultsElm.setAttribute("aria-label", "Search results");
    resultsElm.id = "p4w-search-results";
    
    resultsElm.innerHTML = 
    `<p>${results.length} results</p>
    <table summary="Search results, ranked by best match">
        <thead>
            <tr>
                <th>Rank</th>
                <th>Result</th>
                <th>Chapter</th>
            </tr>
        </thead>
        <tbody>
        ${results.map((result, idx) => 
            `<tr>
                <td>${idx+1}</td>
                <td><a href="${result.item.filename}" data-selector="${result.item.selector}">${result.item.text}</a></td>
                <td>${result.item.filetitle}</td>
            </tr>`)
        .join('')}
        </tbody>
    </table>`;
    
    let resultsLinks = Array.from(resultsElm.querySelectorAll("table td a[data-selector]"));
    resultsLinks.map(link => link.addEventListener("click", e => localStorage.setItem("p4w-target", link.getAttribute("data-selector"))));
    document.querySelector("#p4w-search").appendChild(resultsElm);

}
export { createNavPanelContents };