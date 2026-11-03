export function initToolbarAutoHide() {
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

    // Show briefly on load
    showToolbar();

    // Reset timer on any user activity
    ['mousemove', 'touchstart', 'keydown'].forEach(evt => {
        document.addEventListener(evt, showToolbar, { passive: true });
    });
}
