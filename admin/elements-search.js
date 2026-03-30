let ELEMENTS = [];

export async function loadElements() {
    const res = await fetch("./elements.json");
    ELEMENTS = await res.json();
    renderElements(ELEMENTS);
}


export function renderSuggestions() {
    const resultsBox = document.getElementById("elements-results");
    resultsBox.innerHTML = "<h4 style='opacity:0.7;margin:8px;'>Suggestions</h4>";

    // Exemple : 6 éléments aléatoires
    const random = ELEMENTS.sort(() => 0.5 - Math.random()).slice(0, 6);

    random.forEach(el => {
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


export function setupSearch() {
    const searchInput = document.getElementById("element-search");

    searchInput.addEventListener("input", () => {
        const q = searchInput.value.toLowerCase();

        if (q.trim() === "") {
            // Suggestions par défaut
            renderSuggestions();
            return;
        }

        const filtered = ELEMENTS.filter(el =>
            el.name.toLowerCase().includes(q) ||
            el.category.toLowerCase().includes(q) ||
            el.tags.some(t => t.toLowerCase().includes(q))
        );

        renderElements(filtered);
    });

    // Afficher suggestions au chargement
    renderSuggestions();
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
    img.style.width = "60px";
    img.style.cursor = "move";

    document.querySelector("#editor-page").appendChild(img);

    makeDraggable(img);
}
