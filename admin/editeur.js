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
let selectedBlock = null;
let selectedText = null;
let currentCropBlock = null;

// -------------------------
// INIT : CHARGER L'ACTU DEPUIS SUPABASE
// -------------------------
async function initEditor() {
    if (!actuId) {
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

    // On initialise l'éditeur
    reloadEditor(false);
    saveState();          // premier état dans l'historique
    updatePropertiesPanel();
}

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

// -------------------------
// UNDO / REDO / RETOUR
// -------------------------
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

    // On enlève d'éventuels blocs images résiduels
    [...editorArea.querySelectorAll(".block-public")].forEach(el => el.remove());

    // On recrée les images
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
        selectedBlock.classList.remove("selected");
        selectedBlock.classList.remove("cropping");
    }
    if (selectedText) {
        selectedText.classList.remove("selected");
    }
    selectedBlock = null;
    selectedText = null;
    currentCropBlock = null;
    updatePropertiesPanel();
}

editorArea.addEventListener("mousedown", e => {
    const block = e.target.closest(".block-public");
    const textEl = e.target.closest(".editable-text");

    if (block) {
        e.preventDefault();
        if (selectedText) selectedText.classList.remove("selected");
        selectedText = null;

        if (selectedBlock && selectedBlock !== block) {
            selectedBlock.classList.remove("selected");
            selectedBlock.classList.remove("cropping");
        }
        selectedBlock = block;
        selectedBlock.classList.add("selected");
        updatePropertiesPanel("image");
        return;
    }

    if (textEl) {
        if (selectedBlock) {
            selectedBlock.classList.remove("selected");
            selectedBlock.classList.remove("cropping");
        }
        selectedBlock = null;

        if (selectedText && selectedText !== textEl) {
            selectedText.classList.remove("selected");
        }
        selectedText = textEl;
        selectedText.classList.add("selected");
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

        const img = selectedBlock.querySelector("img");
        if (img) {
            const zoomInput = document.getElementById("img-zoom");
            if (zoomInput) {
                const w = parseFloat(img.style.width) || 100;
                zoomInput.value = w;
            }
        }
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
                selectedBlock.classList.remove("selected");
                selectedBlock.classList.remove("cropping");
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
    if (selectedBlock) {
        selectedBlock.remove();
        selectedBlock = null;
        autoSaveImages();
        saveState();
        clearSelection();
        return;
    }
    if (selectedText) {
        selectedText.remove();
        saveTextContent();
        saveState();
        clearSelection();
    }
});

// -------------------------
// AJOUT D'UNE IMAGE FLOTTANTE
// -------------------------
function addImageBlock(data = {}) {
    const div = document.createElement("div");
    div.className = "block-public";
    div.style.left = data.x || "100px";
    div.style.top = data.y || "100px";
    div.style.width = data.width || "300px";
    div.style.height = data.height || "200px";
    div.style.position = "absolute";
    div.style.userSelect = "none";
    div.style.overflow = "visible"; // ✅ plus de rognage par défaut

    const img = document.createElement("img");
    img.src = data.url;

    // Position dans le bloc
    img.style.position = "absolute";
    img.style.left = data.offsetX || "0px";
    img.style.top = data.offsetY || "0px";

    // Taille : 100% pour éviter le débordement
    img.style.width = data.imgWidth || "100%";
    img.style.height = data.imgHeight || "100%";

    // Affichage non rogné
    img.style.objectFit = "contain";

    // Interaction
    img.draggable = false;
    img.style.pointerEvents = "auto";

    div.appendChild(img);

    // Handles de redimensionnement
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
    makeImageDraggableInside(div, img);
    editorArea.appendChild(div);
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
        parentRect = editorArea.getBoundingClientRect();
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
// DRAG IMAGE INTERNE (CROP)
// -------------------------
function makeImageDraggableInside(block, img) {
    let isDraggingImg = false;
    let startX, startY, startLeft, startTop;

    img.addEventListener("mousedown", e => {
        if (!block.classList.contains("cropping")) return;
        e.stopPropagation();
        isDraggingImg = true;
        startX = e.clientX;
        startY = e.clientY;
        startLeft = parseFloat(img.style.left || "0");
        startTop = parseFloat(img.style.top || "0");
    });

    document.addEventListener("mousemove", e => {
        if (!isDraggingImg) return;

        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        let newLeft = startLeft + dx;
        let newTop = startTop + dy;

        const blockRect = block.getBoundingClientRect();
        const imgRect = img.getBoundingClientRect();

        const maxLeft = 0;
        const maxTop = 0;
        const minLeft = blockRect.width - imgRect.width;
        const minTop = blockRect.height - imgRect.height;

        newLeft = Math.min(maxLeft, Math.max(minLeft, newLeft));
        newTop = Math.min(maxTop, Math.max(minTop, newTop));

        img.style.left = newLeft + "px";
        img.style.top = newTop + "px";
    });

    document.addEventListener("mouseup", () => {
        if (isDraggingImg) {
            autoSaveImages();
            saveState();
        }
        isDraggingImg = false;
    });
}

// -------------------------
// MODE CROP
// -------------------------
document.getElementById("crop-toggle-btn").addEventListener("click", () => {
    if (!selectedBlock) return;
    const img = selectedBlock.querySelector("img");
    if (!img) return;
    toggleCropMode(selectedBlock);
});

function toggleCropMode(block) {
    if (currentCropBlock && currentCropBlock !== block) {
        currentCropBlock.classList.remove("cropping");
    }

    const isNowCropping = !block.classList.contains("cropping");
    if (isNowCropping) {
        block.classList.add("cropping");
        currentCropBlock = block;
    } else {
        block.classList.remove("cropping");
        currentCropBlock = null;
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

const zoomInput = document.getElementById("img-zoom");
if (zoomInput) {
    zoomInput.addEventListener("input", e => {
        if (!selectedBlock) return;
        const img = selectedBlock.querySelector("img");
        if (!img) return;
        const zoom = e.target.value;
        img.style.width = zoom + "%";
        img.style.height = zoom + "%";
        autoSaveImages();
    });
}

// -------------------------
// PROPRIÉTÉS TEXTE
// -------------------------
document.getElementById("text-font-size").addEventListener("input", e => {
    if (!selectedText) return;
    selectedText.style.fontSize = e.target.value + "px";
    saveTextContent();
});

document.getElementById("text-color").addEventListener("input", e => {
    if (!selectedText) return;
    selectedText.style.color = e.target.value;
    saveTextContent();
});

textPanel.querySelectorAll("[data-align]").forEach(btn => {
    btn.addEventListener("click", () => {
        const align = btn.getAttribute("data-align");
        if (align === "left") document.execCommand("justifyLeft");
        if (align === "center") document.execCommand("justifyCenter");
        if (align === "right") document.execCommand("justifyRight");
        saveTextContent();
    });
});

textPanel.querySelectorAll("[data-style]").forEach(btn => {
    btn.addEventListener("click", () => {
        const style = btn.getAttribute("data-style");
        document.execCommand(style);
        saveTextContent();
    });
});

// -------------------------
// SAUVEGARDE IMAGES (EN MÉMOIRE)
// -------------------------
function autoSaveImages() {
    if (!actu) return;

    const images = [...editorArea.querySelectorAll(".block-public")].map(div => {
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
                editorArea.appendChild(div);
                autoSaveImages();
                saveState();
            });
    } else {
        addImageBlock({ url: el.url });
        autoSaveImages();
        saveState();
    }
}

// -------------------------
// SÉLECTION TEXTE VIA SELECTIONCHANGE
// -------------------------
document.addEventListener("selectionchange", () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    const range = sel.getRangeAt(0);
    const node = range.startContainer.parentNode;

    if (node && node.closest("#editor-area")) {
        selectedText = node;
        selectedBlock = null;
        updatePropertiesPanel("text");
    }
});

// -------------------------
// LANCEMENT
// -------------------------
initEditor();
