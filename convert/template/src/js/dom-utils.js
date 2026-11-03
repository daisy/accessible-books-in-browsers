export function isInteractiveTarget(target) {
    if (!(target instanceof Element)) return false;
    return Boolean(target.closest('input, select, textarea, button, [contenteditable="true"], [contenteditable=""]'));
}

// Controls where typing a character means entering text, so a single-key shortcut mustn't fire
export function isTextEntryTarget(target) {
    if (!(target instanceof Element)) return false;
    if (target.closest('textarea, select, [contenteditable="true"], [contenteditable=""]')) return true;
    const input = target.closest('input');
    return Boolean(input && !['checkbox', 'radio', 'range', 'button', 'submit', 'reset', 'color'].includes(input.type));
}

export function isAnyPopoverOpen() {
    try {
        return Boolean(document.querySelector('.webbook[popover]:popover-open'));
    } catch {
        return false;
    }
}
