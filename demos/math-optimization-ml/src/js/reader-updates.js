import { uiKey } from './bootstrap-policy.js';
import { prepareReload, clearReturnState } from './settings-transfer.js';
import { registerAction, announceReaderAction } from './reader-actions.js';
export function initReaderUpdates() {
    const panel = document.querySelector('#webbook-info .webbook-info-body');
    if (!panel || document.getElementById('webbook-reader-updates')) return;
    const key = uiKey(new URL('./', location.href).href);
    let override;
    const read = name => { try { return window[name].getItem(key + ':override'); } catch { return null; } };
    override = read('sessionStorage') || read('localStorage');
    const section = document.createElement('section'); section.id = 'webbook-reader-updates';
    const heading = document.createElement('h3'); heading.textContent = 'Reader updates';
    const status = document.createElement('p');
    const channel = document.querySelector('meta[name="webbook-ui-channel"]')?.content;
    status.textContent = !channel ? 'This book uses its fixed bundled reader.' : override === 'local' ? 'Updates are paused for this book: you chose the bundled reader.'
        : override?.startsWith('release:') ? `This tab is pinned to reader release ${override.slice(8)}.`
        : override === 'remote' ? 'This tab checks the reader channel on every page load.'
        : channel ? 'Reader updates are enabled.' : 'This book uses its fixed bundled reader.';
    const restore = document.createElement('button'); restore.type = 'button'; restore.id = 'webbook-reader-updates-auto';
    restore.textContent = 'Return to automatic updates'; restore.hidden = !override || !channel;
    restore.addEventListener('click', () => {
        try {
            const reload = prepareReload('Automatic reader updates restored', heading.id, 'webbook-info');
            const url = new URL(location.href); url.searchParams.set('webbook-ui', 'auto');
            history.replaceState(history.state, '', url); reload();
        } catch { clearReturnState(); announceReaderAction('Reader updates could not be changed. Try adding ?webbook-ui=auto to this book’s address.'); }
    });
    heading.id = 'webbook-reader-updates-heading'; heading.tabIndex = -1;
    section.setAttribute('aria-labelledby', heading.id); section.append(heading, status, restore);
    const offline = panel.querySelector('#webbook-offline'); if (offline) offline.after(section); else panel.append(section);
    registerAction({ id:'automatic-reader-updates', label:'Return to automatic reader updates', group:'Reader updates', isAvailable:()=>!restore.hidden, run:()=>restore.click() });
}
