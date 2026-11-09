export function initToolbarAutoHide() {
    // The reader is running: the basic navigation for reading without JavaScript can go. The
    // head's appearance script usually says so first (webbook-dark/webbook-light), but not when
    // storage is blocked.
    document.documentElement.classList.add('webbook-js');
    const toolbar = document.querySelector('#webbook-toolbar');
    const topToolbar = document.querySelector('#webbook-top-toolbar');
    const spineNav = document.querySelector('#webbook-spine-nav');
    let hideTimer;

    function showToolbar() {
        toolbar.classList.add('visible');
        topToolbar.classList.add('visible');
        spineNav.classList.add('visible');
        clearTimeout(hideTimer);
        hideTimer = setTimeout(() => {
            toolbar.classList.remove('visible');
            topToolbar.classList.remove('visible');
            spineNav.classList.remove('visible');
        }, 3000);
    }

    // Things that float above the toolbar (Skip past) need its height, and scrolling to a link's
    // target or to focus needs both toolbars' (layout.css); they change with the screen width and
    // text size
    if (typeof ResizeObserver === 'function') {
        const observer = new ResizeObserver(() => {
            document.documentElement.style.setProperty('--webbook-toolbar-height', `${toolbar.offsetHeight}px`);
            document.documentElement.style.setProperty('--webbook-top-toolbar-height', `${topToolbar.offsetHeight}px`);
        });
        observer.observe(toolbar);
        observer.observe(topToolbar);
    }

    // Show briefly on load
    showToolbar();

    // Reset timer on any user activity
    ['mousemove', 'touchstart', 'keydown'].forEach(evt => {
        document.addEventListener(evt, showToolbar, { passive: true });
    });
}
