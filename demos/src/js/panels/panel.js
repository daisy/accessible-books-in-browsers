/* a panel looks like:

<div class="panel">
    <button data-desc="Navigation">
        <svg open icon>
        <svg close icon>
    </button>
    <div>
        panel contents
    </div>
</div>
*/

function setupPanel(id, isInitiallyExpanded, onExpand = null, onClose = null) {
    let panelButton = document.querySelector(`#${id} > button`);
    panelButton.addEventListener("click", async e => {
        // toggle the state
        let expand = !(panelButton.getAttribute("aria-expanded") === "true");
        setPanelState(id, expand);

        if (expand) {
            if (onExpand) onExpand();
        }
        else {
            if (onClose) onClose();
        }
    });
    setPanelState(id, isInitiallyExpanded);
}

function setPanelState(id, expand) {
    let panel = document.querySelector(`#${id}`);
    let panelButton = panel.querySelector(':scope > button');
    let desc = panelButton.getAttribute("data-desc");
    let label;

    if (expand) {
        //show
        label = `Close ${desc}`;
        panelButton.setAttribute("aria-expanded", true);
        panel.classList.add("p4w-expanded");
    }
    else {
        //hide
        label = `Show ${desc}`;
        panelButton.setAttribute("aria-expanded", false);
        panel.classList.remove("p4w-expanded");
    } 
    panelButton.setAttribute("aria-label", label);
    panelButton.setAttribute("title", label);
}

export { setupPanel };