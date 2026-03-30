let ELEMENTS = [];

/* ============================================================
   CHARGEMENT DES ÉLÉMENTS
============================================================ */
export async function loadElements() {
    const res = await fetch("./elements.json");
    ELEMENTS = await res.json();
    renderSuggestions();
}

/* ============================================================
   SUGGESTIONS
============================================================ */
export function renderSuggestions() {
    const resultsBox = document.getElementById("elements-results");
    resultsBox.innerHTML = "<h4 style='opacity:0.7;margin:8px;'>Suggestions</h4>";

    const random = ELEMENTS.sort(() => 0.5 - Math.random()).slice(0, 12);

    random.forEach(el => {
        const item = document.createElement("div");
        item.className = "element-item";

        item.innerHTML = `
            <img src="${el.url}" alt="${el.name}" class="element-thumb">
        `;

        item.addEventListener("click", () => addPresetToCanvas(el));
        resultsBox.appendChild(item);
    });
}

/* ============================================================
   RECHERCHE
============================================================ */
export function setupSearch() {
    const searchInput = document.getElementById("element-search");

    searchInput.addEventListener("input", () => {
        const q = searchInput.value.toLowerCase();

        if (q.trim() === "") {
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

    renderSuggestions();
}

/* ============================================================
   AFFICHAGE DES RÉSULTATS
============================================================ */
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
            <img src="${el.url}" alt="${el.name}" class="element-thumb">
        `;

        item.addEventListener("click", () => addPresetToCanvas(el));
        resultsBox.appendChild(item);
    });
}

/* ============================================================
   AJOUT DANS L'ÉDITEUR (TAILLE AUTO)
============================================================ */
export function addPresetToCanvas(el) {
    const img = document.createElement("img");
    img.src = el.url;
    img.className = "canvas-element";

    img.style.position = "absolute";
    img.style.top = "150px";
    img.style.left = "150px";
    img.style.cursor = "move";

    // Taille auto-réduite (comme Canva)
    img.onload = () => {
        const max = 80; // taille max en px
        const ratio = img.width / img.height;

        if (img.width > img.height) {
            img.style.width = max + "px";
            img.style.height = (max / ratio) + "px";
        } else {
            img.style.height = max + "px";
            img.style.width = (max * ratio) + "px";
        }
    };

    document.querySelector("#editor-page").appendChild(img);
    makeDraggable(img);
}
