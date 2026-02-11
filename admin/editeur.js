import { supabase } from "./supabase-init.js";

// -------------------------
// RÉCUP PARAMÈTRE ID
// -------------------------
const params = new URLSearchParams(window.location.search);
const actuId = Number(params.get("id"));

let actu = null;        // l'actu en cours d'édition
let history = [];       // historique pour undo/redo
let future = [];        // redo

const editorTitle = document.getElementById("editor-title");
const editorArea = document.getElementById("editor-area");

// PANNEAUX PROPRIÉTÉS
const noSelectionPanel = document.getElementById("no-selection-panel");
const textPanel = document.getElementById("text-panel");
const imagePanel = document.getElementById("image-panel");

// SÉLECTION
let selectedBlock = null;   // .block-public (image / svg)
let selectedText = null;    // .editable-text
let currentCropBlock = null;

// -------------------------
// INIT : CHARGER L'ACTU DEPUIS SUPABASE
// -------------------------
async function initEditor() {
    if (!actuId || Number.isNaN(actuId)) {
        alert("Article introuvable (ID manquant)");
        window.location.href = "index.html";
        return;
    }

    const { data, error } = await supabase
        .from("actus")
        .select("*")
        .eq("id", actuId)
        .single();

    if (error || !data) {
        console.error("Erreur chargement actu :", error);
        alert("Article introuvable");
        window.location.href = "index.html";
        return;
    }

    actu = data;

    // Normalisation du contenu
    if (!actu.contenu || typeof actu.contenu !== "object") {
        actu.contenu = { texte: "", images: [] };
    } else {
        if (!actu.contenu.texte) actu.contenu.texte = "";
        if (!Array.isArray(actu.contenu.images)) actu.contenu.images = [];
    }

    if (editorTitle) editorTitle.textContent = actu.titre || "Sans titre";

    reloadEditor(false);
    saveState();
    updatePropertiesPanel();
}

// -------------------------
// HISTORIQUE
// -------------------------
function getState() {
    return JSON.stringify(actu.contenu);
}

function setState(stateStr) {
    actu.contenu = JSON.parse(stateStr);
    reloadEditor(false);
}

function saveState() {
    const state = getState();
    if (history.length === 0 || history[history.length - 1] !== state) {
        history.push(state);
        future = [];
    }
}

// UNDO / REDO / RETOUR
document.getElementById("undo-btn")?.addEventListener("click", () => {
    if (history.length > 1) {
        const current = history.pop();
        future.push(current);
        const prev = history[history.length - 1];
        setState(prev);
        clearSelection();
        updatePropertiesPanel();
    }
});

document.getElementById("redo-btn")?.addEventListener("click", () => {
    if (future.length > 0) {
        const next = future.pop();
        history.push(next);
        setState(next);
        clearSelection();
        updatePropertiesPanel();
    }
});

document.getElementById("back-btn")?.addEventListener("click", () => {
    window.location.href = "index.html";
});

// -------------------------
// UPLOAD IMAGE SUPABASE
// -------------------------
async function uploadImage(file) {
    const fileName = Date.now() + "-" + file.name;

    const { data, error } = await supabase.storage
        .from("uploads")
        .upload(fileName, file);

    if (error) {
        console.error("Erreur upload :", error);
        return null;
    }

    const { data: publicUrl } = supabase.storage
        .from("uploads")
        .getPublicUrl(fileName);

    return publicUrl.publicUrl;
}

// -------------------------
// RECHARGER L'ÉDITEUR
// -------------------------
function reloadEditor(pushHistory = true) {
    if (!actu) return;

    editorArea.innerHTML = actu.contenu.texte || "";

    // Si aucun élément n'a la classe editable-text, on en crée un
    if (!editorArea.querySelector(".editable-text")) {
        const wrapper = document.createElement("div");
        wrapper.className = "editable-text";
        wrapper.setAttribute("contenteditable", "true");
        wrapper.innerHTML = editorArea.innerHTML || "Tape ton texte ici…";
        editorArea.innerHTML = "";
        editorArea.appendChild(wrapper);
    } else {
        // S'assurer que tous les blocs texte sont bien éditables
        editorArea.querySelectorAll(".editable-text").forEach(el => {
            el.setAttribute("contenteditable", "true");
        });
    }

    // On enlève d'éventuels blocs images résiduels (ils seront recréés)
    [...editorArea.querySelectorAll(".block-public")].forEach(el => el.remove());

    // On recrée les images flottantes
    actu.contenu.images.forEach(imgData => addImageBlock(imgData));

    attachTextHandlers();

    if (pushHistory) {
        saveState();
    }
}

// -------------------------
// SÉLECTION GLOBALE
// -------------------------
function clearSelection() {
    if (selectedBlock) {
        selectedBlock.classList.remove("selected", "cropping");
    }
    if (selectedText) {
        selectedText.classList.remove("selected");
    }
    selectedBlock = null;
    selectedText = null;
    currentCropBlock = null;
    updatePropertiesPanel();
}

// Sélection robuste : on remonte toujours au bloc parent
const canvasWrapper = document.querySelector(".canvas-wrapper");

canvasWrapper.addEventListener("mousedown", e => {
    const block = e.target.closest(".block-public");
    const textEl = e.target.closest(".editable-text");

    if (block) {
        e.preventDefault();

        if (selectedText) {
            selectedText.classList.remove("selected");
            selectedText = null;
        }

        if (selectedBlock && selectedBlock !== block) {
            selectedBlock.classList.remove("selected", "cropping");
        }

        selectedBlock = block;
        selectedBlock.classList.add("selected");
        updatePropertiesPanel("image");
        return;
    }

    if (textEl) {
        if (selectedBlock) {
            selectedBlock.classList.remove("selected", "cropping");
            selectedBlock = null;
        }

        if (selectedText && selectedText !== textEl) {
            selectedText.classList.remove("selected");
        }

        selectedText = textEl;
        textEl.classList.add("selected");
        updatePropertiesPanel("text");
        return;
    }

    clearSelection();
});

// -------------------------
// PANNEAU PROPRIÉTÉS
// -------------------------
function updatePropertiesPanel(type = null) {
    noSelectionPanel.classList.add("hidden");
    textPanel.classList.add("hidden");
    imagePanel.classList.add("hidden");

    if (!type) {
        noSelectionPanel.classList.remove("hidden");
        return;
    }

    if (type === "text" && selectedText) {
        textPanel.classList.remove("hidden");
        const style = window.getComputedStyle(selectedText);
        const fs = parseInt(style.fontSize);
        document.getElementById("text-font-size").value = isNaN(fs) ? 18 : fs;
        document.getElementById("text-color").value = rgbToHex(style.color);
        return;
    }

    if (type === "image" && selectedBlock) {
        imagePanel.classList.remove("hidden");
        const rect = selectedBlock.getBoundingClientRect();
        document.getElementById("img-frame-width").value = rect.width;
        document.getElementById("img-frame-height").value = rect.height;
        return;
    }
}

function rgbToHex(rgb) {
    const m = rgb.match(/\d+/g);
    if (!m) return "#000000";
    const [r, g, b] = m.map(Number);
    return "#" + [r, g, b].map(v => v.toString(16).padStart(2, "0")).join("");
}

// -------------------------
// TEXTE
// -------------------------
function attachTextHandlers() {
    [...editorArea.querySelectorAll(".editable-text")].forEach(el => {
        el.oninput = () => {
            saveTextContent();
        };
        el.onfocus = () => {
            if (selectedBlock) {
                selectedBlock.classList.remove("selected", "cropping");
                selectedBlock = null;
            }
            if (selectedText && selectedText !== el) {
                selectedText.classList.remove("selected");
            }
            selectedText = el;
            el.classList.add("selected");
            updatePropertiesPanel("text");
        };
    });
}

function saveTextContent() {
    if (!actu) return;
    actu.contenu.texte = editorArea.innerHTML;
}

// -------------------------
// AJOUT IMAGE (UPLOAD SUPABASE)
// -------------------------
document.getElementById("add-image").addEventListener("click", () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";

    input.onchange = async () => {
        const file = input.files[0];
        if (!file) return;

        const url = await uploadImage(file);
        if (!url) return;

        addImageBlock({ url });
        autoSaveImages();
        saveState();
    };

    input.click();
});
// -------------------------
// SUPPRIMER SÉLECTION
// -------------------------
document.getElementById("delete-selected-btn").addEventListener("click", () => {
    // On utilise la sélection logique, pas querySelector(".selected")
    let target = null;

    if (selectedBlock) {
        target = selectedBlock;
    } else if (selectedText) {
        target = selectedText;
    }

    if (!target) return;

    const isDeletable =
        target.classList.contains("block-public") ||
        target.classList.contains("editable-text");

    if (!isDeletable) {
        console.warn("Cet élément ne peut pas être supprimé.");
        return;
    }

    target.remove();

    // Si on supprime un bloc texte, on met à jour le HTML
    saveTextContent();
    // Si on supprime une image, on met à jour la liste des images
    autoSaveImages();

    saveState();
    clearSelection();
});

// -------------------------
// AJOUT D'UNE IMAGE FLOTTANTE
// -------------------------
function addImageBlock(data = {}) {
    const div = document.createElement("div");
    div.className = "block-public";
    div.setAttribute("contenteditable", "false");

    div.style.left = data.x || "100px";
    div.style.top = data.y || "100px";
    div.style.width = data.width || "300px";
    div.style.height = data.height || "200px";
    div.style.position = "absolute";
    div.style.userSelect = "none";
    div.style.overflow = "visible";

    const img = document.createElement("img");
    img.src = data.url;
    img.setAttribute("contenteditable", "false");
    img.style.position = "absolute";
    img.style.left = data.offsetX || "0px";
    img.style.top = data.offsetY || "0px";
    img.style.width = data.imgWidth || "100%";
    img.style.height = data.imgHeight || "100%";
    img.style.objectFit = "contain";
    img.draggable = false;
    img.style.pointerEvents = "auto";

    div.appendChild(img);

    const positions = [
        "top-left", "top", "top-right",
        "right", "bottom-right", "bottom",
        "bottom-left", "left"
    ];

    positions.forEach(pos => {
        const handle = document.createElement("div");
        handle.className = `resize-handle ${pos}`;
        handle.style.pointerEvents = "auto";
        handle.style.zIndex = "9999";
        div.appendChild(handle);
        makeResizable(div, handle, pos);
    });

    makeDraggable(div);
    document.querySelector(".canvas-wrapper").appendChild(div);
}

// -------------------------
// DRAG BLOC
// -------------------------
function makeDraggable(el) {
    let isDown = false;
    let offsetX = 0;
    let offsetY = 0;
    let parentRect = null;

    el.addEventListener("mousedown", e => {
        if (e.target.classList.contains("resize-handle")) return;
        if (el.classList.contains("cropping")) return;

        isDown = true;
        parentRect = el.parentElement.getBoundingClientRect();

        const elRect = el.getBoundingClientRect();
        offsetX = e.clientX - elRect.left;
        offsetY = e.clientY - elRect.top;

        el.style.zIndex = 999;
    });

    document.addEventListener("mousemove", e => {
        if (!isDown || !parentRect) return;

        const elRect = el.getBoundingClientRect();

        let newLeft = e.clientX - parentRect.left - offsetX;
        let newTop = e.clientY - parentRect.top - offsetY;

        const maxLeft = parentRect.width - elRect.width;
        const maxTop = parentRect.height - elRect.height;

        newLeft = Math.max(0, Math.min(newLeft, maxLeft));
        newTop = Math.max(0, Math.min(newTop, maxTop));

        el.style.left = newLeft + "px";
        el.style.top = newTop + "px";
    });

    document.addEventListener("mouseup", () => {
        if (isDown) {
            autoSaveImages();
            saveState();
        }
        isDown = false;
        el.style.zIndex = 1;
        parentRect = null;
    });
}

// -------------------------
// REDIMENSIONNEMENT BLOC
// -------------------------
function makeResizable(el, handle, position) {
    let isResizing = false;
    let startX, startY, startWidth, startHeight, startLeft, startTop;

    handle.addEventListener("mousedown", e => {
        e.stopPropagation();
        if (el.classList.contains("cropping")) return;
        isResizing = true;

        const rect = el.getBoundingClientRect();

        startX = e.clientX;
        startY = e.clientY;
        startWidth = rect.width;
        startHeight = rect.height;
        startLeft = el.offsetLeft;
        startTop = el.offsetTop;

        document.addEventListener("mousemove", resize);
        document.addEventListener("mouseup", stopResize);
    });

    function resize(e) {
        if (!isResizing) return;

        let dx = e.clientX - startX;
        let dy = e.clientY - startY;

        let newWidth = startWidth;
        let newHeight = startHeight;
        let newLeft = startLeft;
        let newTop = startTop;

        if (position.includes("right")) newWidth = startWidth + dx;
        if (position.includes("left")) {
            newWidth = startWidth - dx;
            newLeft = startLeft + dx;
        }
        if (position.includes("bottom")) newHeight = startHeight + dy;
        if (position.includes("top")) {
            newHeight = startHeight - dy;
            newTop = startTop + dy;
        }

        newWidth = Math.max(50, newWidth);
        newHeight = Math.max(30, newHeight);

        el.style.width = newWidth + "px";
        el.style.height = newHeight + "px";
        el.style.left = newLeft + "px";
        el.style.top = newTop + "px";
    }

    function stopResize() {
        if (isResizing) {
            autoSaveImages();
            saveState();
        }
        isResizing = false;
        document.removeEventListener("mousemove", resize);
        document.removeEventListener("mouseup", stopResize);
    }
}

// -------------------------
// SLIDERS IMAGE
// -------------------------
document.getElementById("img-frame-width").addEventListener("input", e => {
    if (!selectedBlock) return;
    selectedBlock.style.width = e.target.value + "px";
    autoSaveImages();
});

document.getElementById("img-frame-height").addEventListener("input", e => {
    if (!selectedBlock) return;
    selectedBlock.style.height = e.target.value + "px";
    autoSaveImages();
});

// -------------------------
// PROPRIÉTÉS TEXTE
// -------------------------
document.getElementById("text-font-size").addEventListener("input", e => {
    if (!selectedText) return;
    selectedText.style.fontSize = e.target.value + "px";
    saveTextContent();
    saveState();
});

document.getElementById("text-color").addEventListener("input", e => {
    if (!selectedText) return;
    selectedText.style.color = e.target.value;
    saveTextContent();
    saveState();
});

textPanel.querySelectorAll("[data-align]").forEach(btn => {
    btn.addEventListener("click", () => {
        if (!selectedText) return;
        const align = btn.getAttribute("data-align");
        selectedText.style.textAlign = align;
        saveTextContent();
        saveState();
    });
});

textPanel.querySelectorAll("[data-style]").forEach(btn => {
    btn.addEventListener("click", () => {
        if (!selectedText) return;

        const style = btn.getAttribute("data-style");

        if (style === "bold") {
            selectedText.style.fontWeight =
                selectedText.style.fontWeight === "bold" ? "normal" : "bold";
        }

        if (style === "italic") {
            selectedText.style.fontStyle =
                selectedText.style.fontStyle === "italic" ? "normal" : "italic";
        }

        if (style === "underline") {
            selectedText.style.textDecoration =
                selectedText.style.textDecoration === "underline"
                    ? "none"
                    : "underline";
        }

        saveTextContent();
        saveState();
    });
});

// -------------------------
// SAUVEGARDE IMAGES (EN MÉMOIRE)
// -------------------------
function autoSaveImages() {
    if (!actu) return;

    const images = [...document.querySelectorAll(".block-public")].map(div => {
        const img = div.querySelector("img");
        return {
            url: img ? img.src : "",
            x: div.style.left,
            y: div.style.top,
            width: div.style.width,
            height: div.style.height,
            offsetX: img ? img.style.left : "0px",
            offsetY: img ? img.style.top : "0px",
            imgWidth: img ? img.style.width : "100%",
            imgHeight: img ? img.style.height : "100%"
        };
    });

    actu.contenu.images = images;
}

// -------------------------
// BOUTON ENREGISTRER (SUPABASE)
// -------------------------
document.getElementById("save-btn").addEventListener("click", async () => {
    if (!actu) return;

    saveTextContent();
    autoSaveImages();

    const { error } = await supabase
        .from("actus")
        .update({ contenu: actu.contenu })
        .eq("id", actuId);

    if (error) {
        console.error("Erreur sauvegarde Supabase :", error);
        alert("Erreur lors de l'enregistrement.");
        return;
    }

    alert("Contenu enregistré !");
});
// -------------------------
// LIBRAIRIE D'ÉLÉMENTS
// -------------------------
let ELEMENTS_LIBRARY = [];

fetch("./elements.json")
    .then(res => res.json())
    .then(data => {
        ELEMENTS_LIBRARY = data;
        console.log("Éléments chargés :", ELEMENTS_LIBRARY);
    });

const searchInput = document.getElementById("element-search");
const resultsContainer = document.getElementById("elements-results");

searchInput.addEventListener("input", () => {
    const query = searchInput.value.toLowerCase().trim();

    if (query.length === 0) {
        resultsContainer.innerHTML = "";
        return;
    }

    const results = ELEMENTS_LIBRARY.filter(el => {
        return (
            el.name.toLowerCase().includes(query) ||
            (el.tags && el.tags.some(tag => tag.toLowerCase().includes(query)))
        );
    });

    displaySearchResults(results);
});

function displaySearchResults(list) {
    resultsContainer.innerHTML = "";

    list.forEach(el => {
        const item = document.createElement("div");
        item.className = "element-item";

        if (el.type === "svg") {
            fetch(el.url)
                .then(res => res.text())
                .then(svg => {
                    item.innerHTML = svg;
                });
        } else {
            const img = document.createElement("img");
            img.src = el.url;
            item.appendChild(img);
        }

        item.addEventListener("click", () => addElementToCanvas(el));

        resultsContainer.appendChild(item);
    });
}

function addElementToCanvas(el) {
    if (el.type === "svg") {
        fetch(el.url)
            .then(res => res.text())
            .then(svg => {
                const div = document.createElement("div");
                div.className = "block-public";
                div.style.position = "absolute";
                div.style.left = "100px";
                div.style.top = "100px";
                div.style.width = "150px";
                div.style.height = "150px";
                div.style.overflow = "hidden";
                div.setAttribute("contenteditable", "false");
                div.innerHTML = svg;

                const positions = [
                    "top-left", "top", "top-right",
                    "right", "bottom-right", "bottom",
                    "bottom-left", "left"
                ];

                positions.forEach(pos => {
                    const handle = document.createElement("div");
                    handle.className = `resize-handle ${pos}`;
                    handle.style.pointerEvents = "auto";
                    handle.style.zIndex = "9999";
                    div.appendChild(handle);
                    makeResizable(div, handle, pos);
                });

                makeDraggable(div);
                document.querySelector(".canvas-wrapper").appendChild(div);
                autoSaveImages();
                saveState();
            });
    } else {
        addImageBlock({ url: el.url });
        autoSaveImages();
        saveState();
    }
}

// ⚠️ IMPORTANT : on supprime complètement ce bloc qui cassait la sélection
// document.addEventListener("click", (e) => { ... });

// -------------------------
// LANCEMENT
// -------------------------
initEditor();
