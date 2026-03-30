let ELEMENTS = [];

export async function loadElements() {
    const res = await fetch("assets/elements.json");
    ELEMENTS = await res.json();
    renderElements(ELEMENTS);
}

export function setupSearch() {
    const searchInput = document.getElementById("element-search");
    const resultsBox = document.getElementById("elements-results");

    searchInput.addEventListener("input", () => {
        const q = searchInput.value.toLowerCase();

        const filtered = ELEMENTS.filter(el =>
            el.name.toLowerCase().includes(q) ||
            el.category.toLowerCase().includes(q) ||
            el.tags.some(t => t.toLowerCase().includes(q))
        );

        renderElements(filtered);
    });
}

export function renderElements(list) {
    const resultsBox = document.getElementById("elements-results");
    resultsBox.innerHTML = "";

    if (list.length === 0) {
        resultsBox.innerHTML = "<p style='opacity:0.6'>Aucun élément trouvé</p>";
        return;
    }

    list.forEach(el => {
        const item = document.createElement("div");
        item.className = "element-item";

        item.innerHTML = `
            <img src="${el.url}" alt="${el.name}">
            <span>${el.name}</span>
        `;

        item.addEventListener("click", () => {
            addPresetToCanvas(el);
        });

        resultsBox.appendChild(item);
    });
}

export function addPresetToCanvas(el) {
    const img = document.createElement("img");
    img.src = el.url;
    img.className = "canvas-element";

    img.style.position = "absolute";
    img.style.top = "150px";
    img.style.left = "150px";
    img.style.width = "120px";
    img.style.cursor = "move";

    document.querySelector("#editor-page").appendChild(img);

    makeDraggable(img);
}

