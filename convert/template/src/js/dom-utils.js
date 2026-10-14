export function isInteractiveTarget(target) {
    if (!(target instanceof Element)) return false;
    return Boolean(target.closest('input, select, textarea, button, [contenteditable="true"], [contenteditable=""]'));
}

export function isAnyPopoverOpen() {
    try {
        return Boolean(document.querySelector('.webbook[popover]:popover-open'));
    } catch {
        return false;
    }
}
