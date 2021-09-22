function createToolbar(id) {
    let toolbar = document.createElement("div");
    toolbar.setAttribute("id", id);
    toolbar.setAttribute("role", "region");
    toolbar.classList.add("p4w-toolbar");
    return toolbar;
}

export { createToolbar };