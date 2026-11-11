import { getActions } from './reader-actions.js';
import { getActionKeys, keySpecForEvent, shortcutRejection, shortcutWarning, assignShortcut, shortcutConflicts, restoreActionDefaults, removeShortcut, resetShortcuts, setShortcutCapture, shortcutName, loadKeyboardLayout } from './keyboard-shortcuts.js';

const MODIFIER_CODES = /^(Shift|Control|Alt|Meta)(Left|Right)$|^(AltGraph|CapsLock|NumLock|ScrollLock|Fn|FnLock)$/;
const ACTION_ORDER = [
    'play-pause', 'previous-phrase', 'next-phrase', 'go-to-narration', 'play-from-here', 'skip-past', 'rate-down', 'rate-up',
    'previous-page', 'next-page',
    'open-toc', 'open-settings', 'open-goto-page', 'open-search', 'open-about',
    'font-smaller', 'font-larger', 'toggle-caption-mode',
    'export-settings', 'import-settings', 'reset-settings',
    'copy-equation', 'copy-selection', 'copy-code'
];

// Loaded the first time the reader opens the editor (keyboard-shortcuts.js adds the button), and
// built then
export function openKeyboardShortcutEditor(openButton) {
    const settings = document.getElementById('webbook-settings');
    const panel = document.getElementById('webbook-keyboard-shortcuts') ?? buildEditor(openButton, settings);
    settings?.hidePopover?.();
    panel.showPopover();
    panel.querySelector('.webbook-popover-close')?.focus();
}

function buildEditor(openButton, settings) {
    const panel = document.createElement('section');
    panel.id = 'webbook-keyboard-shortcuts';
    panel.className = 'webbook';
    panel.setAttribute('popover', '');
    panel.setAttribute('aria-labelledby', 'webbook-keyboard-shortcuts-heading');
    const heading = document.createElement('h2');
    heading.id = 'webbook-keyboard-shortcuts-heading';
    heading.textContent = 'Keyboard shortcuts';
    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'webbook-popover-close';
    closeButton.title = 'Close';
    closeButton.setAttribute('aria-label', 'Close keyboard shortcuts');
    closeButton.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M5.293 5.293a1 1 0 0 1 1.414 0L12 10.586l5.293-5.293a1 1 0 1 1 1.414 1.414L13.414 12l5.293 5.293a1 1 0 0 1-1.414 1.414L12 13.414l-5.293 5.293a1 1 0 0 1-1.414-1.414L10.586 12 5.293 6.707a1 1 0 0 1 0-1.414Z"/></svg>';
    closeButton.addEventListener('click', () => panel.hidePopover());
    panel.append(closeButton, heading);

    const instructions = document.createElement('p');
    instructions.className = 'webbook-shortcut-instructions';
    instructions.textContent = 'Tab, Enter and Space are reserved and cannot be assigned.';
    panel.append(instructions);

    const status = document.createElement('p');
    status.id = 'webbook-shortcut-status';
    status.className = 'sr-only';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-atomic', 'true');
    panel.append(status);
    let announcementTimer;
    const announce = message => {
        clearTimeout(announcementTimer);
        status.textContent = '';
        announcementTimer = setTimeout(() => { status.textContent = message; }, 30);
    };

    const rows = new Map();
    let capture = null;

    function appendKeyNames(container, keys) {
        container.replaceChildren();
        if (!keys.length) {
            container.append('None');
            return;
        }
        keys.forEach((key, index) => {
            if (index) container.append(', ');
            const kbd = document.createElement('kbd');
            const name = shortcutName(key);
            // A separate text alternative avoids relying on how a screen reader pronounces
            // punctuation or Mac modifier symbols.
            const visual = document.createElement('span');
            visual.setAttribute('aria-hidden', 'true');
            visual.textContent = name.text;
            const spoken = document.createElement('span');
            spoken.className = 'sr-only';
            spoken.textContent = name.ariaLabel;
            kbd.append(visual, spoken);
            container.append(kbd);
        });
    }

    function keysMatch(first, second) {
        return first.length === second.length && first.every((key, index) => {
            const other = second[index];
            return key.code === other.code
                && ['shift', 'alt', 'ctrl', 'meta'].every(modifier => Boolean(key[modifier]) === Boolean(other[modifier]));
        });
    }

    function keyNames(keys, spoken = false) {
        if (!keys.length) return 'None';
        return keys.map(key => {
            const name = shortcutName(key);
            return spoken ? name.ariaLabel : name.text;
        }).join(', ');
    }

    function resetRestoreConfirmation(row) {
        row.confirmingRestore = false;
        row.restore.textContent = `Restore default ${keyNames(row.action.defaultKeys)}`;
        row.restore.setAttribute('aria-label', `Restore default ${keyNames(row.action.defaultKeys, true)} for ${row.action.label}`);
        row.restoreWarning.hidden = true;
        row.restoreWarning.textContent = '';
    }

    function refresh() {
        for (const [id, row] of rows) {
            const keys = getActionKeys(id);
            appendKeyNames(row.keys, keys);
            row.pendingAssignment = null;
            row.change.textContent = 'Change';
            row.change.setAttribute('aria-label', `Change shortcut for ${row.action.label}`);
            row.changeWarning.hidden = true;
            row.changeWarning.textContent = '';
            row.restore.hidden = keysMatch(keys, row.action.defaultKeys);
            resetRestoreConfirmation(row);
            const warning = keys.map(shortcutWarning).find(Boolean) ?? '';
            row.warning.textContent = warning;
            row.warning.hidden = !warning;
        }
    }

    function endCapture({ focus = true } = {}) {
        if (!capture) return;
        const button = capture.button;
        capture = null;
        setShortcutCapture(false);
        button.textContent = 'Change';
        button.setAttribute('aria-label', `Change shortcut for ${rows.get(button.dataset.action).action.label}`);
        if (focus) button.focus({ preventScroll: true });
    }

    function startCapture(action, button) {
        endCapture({ focus: false });
        for (const row of rows.values()) {
            row.pendingAssignment = null;
            row.change.textContent = 'Change';
            row.change.setAttribute('aria-label', `Change shortcut for ${row.action.label}`);
            row.changeWarning.hidden = true;
            row.changeWarning.textContent = '';
            resetRestoreConfirmation(row);
        }
        capture = { action, button };
        setShortcutCapture(true);
        button.textContent = 'Press a key…';
        button.setAttribute('aria-label', `Press a key for ${action.label}`);
        announce(`Press the new shortcut for ${action.label}, or Escape to cancel.`);
    }

    for (const group of ['Narration', 'Navigation', 'Panels', 'Reading', 'Settings']) {
        const actions = getActions()
            .filter(action => action.group === group)
            .sort((first, second) => ACTION_ORDER.indexOf(first.id) - ACTION_ORDER.indexOf(second.id));
        if (!actions.length) continue;
        const section = document.createElement('section');
        const groupHeading = document.createElement('h3');
        groupHeading.id = `webbook-shortcuts-${group.toLowerCase()}`;
        groupHeading.textContent = group;
        section.setAttribute('aria-labelledby', groupHeading.id);
        const list = document.createElement('ul');
        section.append(groupHeading, list);
        panel.append(section);

        for (const action of actions) {
            const row = document.createElement('li');
            const label = document.createElement('span');
            label.className = 'webbook-shortcut-label';
            label.id = `webbook-shortcut-${action.id}-label`;
            label.textContent = action.label;
            const keys = document.createElement('span');
            keys.className = 'webbook-shortcut-keys';
            keys.id = `webbook-shortcut-${action.id}-keys`;
            const controls = document.createElement('div');
            controls.className = 'webbook-shortcut-controls';
            const button = document.createElement('button');
            button.type = 'button';
            button.textContent = 'Change';
            button.dataset.action = action.id;
            button.setAttribute('aria-label', `Change shortcut for ${action.label}`);
            const changeWarning = document.createElement('p');
            changeWarning.className = 'webbook-shortcut-conflict-warning';
            changeWarning.id = `webbook-shortcut-${action.id}-change-warning`;
            changeWarning.setAttribute('role', 'status');
            changeWarning.setAttribute('aria-atomic', 'true');
            changeWarning.hidden = true;
            button.setAttribute('aria-describedby', `${keys.id} ${changeWarning.id}`);
            button.addEventListener('click', () => {
                const rowState = rows.get(action.id);
                if (!rowState?.pendingAssignment) {
                    startCapture(action, button);
                    return;
                }
                const spec = rowState.pendingAssignment;
                const moved = assignShortcut(action.id, spec);
                refresh();
                const name = shortcutName(spec).ariaLabel;
                announce(`${name} moved from ${moved.map(other => other.label).join(', ')} to ${action.label}.${shortcutWarning(spec) ? ` ${shortcutWarning(spec)}` : ''}`);
                button.focus({ preventScroll: true });
            });
            button.addEventListener('blur', () => {
                if (capture?.button !== button) return;
                endCapture({ focus: false });
                announce('Shortcut change cancelled.');
            });
            const remove = document.createElement('button');
            remove.type = 'button';
            remove.textContent = 'Remove';
            remove.setAttribute('aria-label', `Remove shortcut for ${action.label}`);
            remove.addEventListener('click', () => {
                endCapture({ focus: false });
                removeShortcut(action.id);
                refresh();
                announce(`Shortcut removed for ${action.label}.`);
            });
            const restore = document.createElement('button');
            restore.type = 'button';
            restore.className = 'webbook-shortcut-restore';
            const restoreWarning = document.createElement('p');
            restoreWarning.className = 'webbook-shortcut-conflict-warning';
            restoreWarning.id = `webbook-shortcut-${action.id}-restore-warning`;
            restoreWarning.setAttribute('role', 'status');
            restoreWarning.setAttribute('aria-atomic', 'true');
            restoreWarning.hidden = true;
            restore.setAttribute('aria-describedby', restoreWarning.id);
            restore.addEventListener('click', () => {
                for (const [otherId, otherRow] of rows) {
                    if (otherId !== action.id && otherRow.confirmingRestore) resetRestoreConfirmation(otherRow);
                    otherRow.pendingAssignment = null;
                    otherRow.change.textContent = 'Change';
                    otherRow.change.setAttribute('aria-label', `Change shortcut for ${otherRow.action.label}`);
                    otherRow.changeWarning.hidden = true;
                    otherRow.changeWarning.textContent = '';
                }
                const conflicts = shortcutConflicts(action.id, action.defaultKeys);
                if (conflicts.length && !rows.get(action.id).confirmingRestore) {
                    const names = conflicts.map(other => other.label).join(', ');
                    const defaults = keyNames(action.defaultKeys, true);
                    const message = `${defaults} is currently used by ${names}. Restoring the default will remove it from ${names}.`;
                    rows.get(action.id).confirmingRestore = true;
                    restore.textContent = `Confirm restore default ${keyNames(action.defaultKeys)}`;
                    restore.setAttribute('aria-label', `Confirm restore default ${defaults} for ${action.label}`);
                    restoreWarning.hidden = false;
                    restoreWarning.textContent = message;
                    return;
                }
                const moved = restoreActionDefaults(action.id);
                refresh();
                const movedMessage = moved.length ? ` ${keyNames(action.defaultKeys, true)} was removed from ${moved.map(other => other.label).join(', ')}.` : '';
                announce(`Default restored for ${action.label}.${movedMessage}`);
                rows.get(action.id).change.focus({ preventScroll: true });
            });
            const warning = document.createElement('p');
            warning.className = 'webbook-shortcut-warning';
            warning.hidden = true;
            controls.append(button, remove, restore);
            row.append(label, keys, controls, changeWarning, restoreWarning, warning);
            list.append(row);
            rows.set(action.id, { action, keys, change: button, changeWarning, restore, restoreWarning, warning, confirmingRestore: false, pendingAssignment: null });
        }
    }

    const reset = document.createElement('button');
    reset.type = 'button';
    reset.textContent = 'Reset to defaults';
    reset.addEventListener('click', () => {
        endCapture({ focus: false });
        resetShortcuts();
        refresh();
        announce('Keyboard shortcuts reset to defaults.');
    });
    panel.append(reset);
    document.body.append(panel);
    refresh();
    loadKeyboardLayout().then(refresh);

    // Capture before caption mode and the global listener see the key. Modifier presses don't
    // finish capture; Escape cancels without closing Settings. Capture ends after a refused key
    // too, so the next Tab always moves focus normally.
    document.addEventListener('keydown', event => {
        if (!capture || event.isComposing || event.repeat || MODIFIER_CODES.test(event.code)) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        const { action } = capture;
        if (event.code === 'Escape') {
            endCapture();
            announce('Shortcut change cancelled.');
            return;
        }
        const spec = keySpecForEvent(event);
        const rejection = shortcutRejection(spec, action.id);
        endCapture();
        if (rejection) {
            announce(rejection);
            return;
        }
        const conflicts = shortcutConflicts(action.id, [spec]);
        if (conflicts.length) {
            const row = rows.get(action.id);
            const names = conflicts.map(other => other.label).join(', ');
            const name = shortcutName(spec);
            row.pendingAssignment = spec;
            row.change.textContent = `Confirm change to ${name.text}`;
            row.change.setAttribute('aria-label', `Confirm change shortcut for ${action.label} to ${name.ariaLabel}`);
            row.changeWarning.hidden = false;
            row.changeWarning.textContent = `${name.ariaLabel} is currently used by ${names}. Assigning it to ${action.label} will remove it from ${names}.`;
            return;
        }
        assignShortcut(action.id, spec);
        refresh();
        const name = shortcutName(spec).ariaLabel;
        announce(`${name} assigned to ${action.label}.${shortcutWarning(spec) ? ` ${shortcutWarning(spec)}` : ''}`);
    }, { capture: true });

    panel.addEventListener('beforetoggle', event => {
        if (event.newState === 'closed') endCapture({ focus: false });
    });
    panel.addEventListener('toggle', event => {
        if (event.newState === 'open') return;
        settings?.addEventListener('toggle', settingsEvent => {
            if (settingsEvent.newState === 'open') openButton.focus({ preventScroll: true });
        }, { once: true });
        settings?.showPopover?.();
    });
    return panel;
}
