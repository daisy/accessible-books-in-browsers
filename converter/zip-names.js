// Browser converter (plan 19): a zip entry name that leads out of the folder it's unzipped into (../, a
// leading /, a drive letter or a backslash). A valid EPUB never has one. Used by the page's checks
// (epub-check.js) and the unzip shim (shims/extract-zip.js).
export function unsafeZipName(name) {
    return name.startsWith('/') || name.includes('\\') || /^[A-Za-z]:/.test(name) || name.split('/').includes('..');
}
