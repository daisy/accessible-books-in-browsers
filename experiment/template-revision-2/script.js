console.log("hello");

// toggle TOC popover
document.querySelector("#webbook-toc-nav").addEventListener('toggle', e => {
    if (e.newState == 'open') {
        e.target.querySelector('li a[aria-current="page"]').scrollIntoView();
        document.querySelector('button[popovertarget="webbook-toc-nav"]').classList.add("open");
    }
    if (e.newState == 'closed') {
        document.querySelector('button[popovertarget="webbook-toc-nav"]').classList.remove("open");
    }
});

// toggle menu popover
document.querySelector("#webbook-menu").addEventListener('toggle', e => {
    if (e.newState == 'open') {
        document.querySelector('button[popovertarget="webbook-menu"]').classList.add("open");
    }
    if (e.newState == 'closed') {
        document.querySelector('button[popovertarget="webbook-menu"]').classList.remove("open");
    }
});



document.querySelector('button[popovertarget="webbook-menu"]').click();

// document.querySelector('button[popovertarget="webbook-settings"]').click();