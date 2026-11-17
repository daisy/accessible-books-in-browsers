// CSS state only. The saved preference is read in appearance.js.
export function publishedAppearanceActive() {
    return document.documentElement.getAttribute('data-webbook-appearance') === 'published';
}
