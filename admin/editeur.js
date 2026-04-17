// editeur.js (version corrigée et améliorée)
// Assure-toi que supabase-init.js (module ESM) est chargé avant ce fichier.

// Import des utilitaires d'éléments
import { loadElements, setupSearch } from "./elements-search.js";

loadElements();
setupSearch();

/* ----------------- Supabase safe getter ----------------- */
async function getDb() {
  if (window.__supabaseClient) return window.__supabaseClient;
  if (window.__supabaseReady) {
    try {
      const client = await window.__supabaseReady;
      return client;
    } catch (err) {
      console.error("getDb: supabase init rejected", err);
      throw err;
    }
  }
  throw new Error("Supabase non initialisé");
}

/* ----------------- Helpers ----------------- */
function $(sel, root = document) {
  return root.querySelector(sel);
}
function $all(sel, root = document) {
  return Array.from(root.querySelectorAll(sel));
}

/* ============================================================
   AJOUT DE CONTENU (WYSIWYG)
   ============================================================ */

function addTitle() {
  const editor = $("#editor-page");
  if (!editor) return;
  editor.insertAdjacentHTML("beforeend", "<h2>Nouveau titre</h2>");
}

function addSubtitle() {
  const editor = $("#editor-page");
  if (!editor) return;
  editor.insertAdjacentHTML("beforeend", "<h3>Nouveau sous-titre</h3>");
}

function addParagraph() {
  const editor = $("#editor-page");
  if (!editor) return;
  editor.insertAdjacentHTML("beforeend", "<p>Nouveau paragraphe…</p>");
}

function addImage(src) {
  const editor = $("#editor-page");
  if (!editor) return;
  // alt ajouté pour accessibilité
  editor.insertAdjacentHTML(
    "beforeend",
    `<img src="${src}" style="max-width:100%; margin:20px 0;" alt="Image insérée">`
  );
}

/* ============================================================
   BLOC DE TEXTE FLOTTANT (CANVA-LIKE)
   ============================================================ */

function makeResizable(block) {
  const handle = block.querySelector(".resize-handle");
  if (!handle) return;

  let startX = 0, startY = 0;
  let startWidth = 0, startHeight = 0;

  handle.addEventListener("mousedown", (e) => {
    e.preventDefault();
    e.stopPropagation();

    startX = e.clientX;
    startY = e.clientY;

    const rect = block.getBoundingClientRect();
    startWidth = rect.width;
    startHeight = rect.height;

    function move(ev) {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;

      block.style.width = Math.max(50, startWidth + dx) + "px";
      block.style.height = Math.max(20, startHeight + dy) + "px";
    }

    function up() {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
    }

    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
  });

  // Touch support
  handle.addEventListener("touchstart", (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    startX = touch.clientX;
    startY = touch.clientY;
    const rect = block.getBoundingClientRect();
    startWidth = rect.width;
    startHeight = rect.height;

    function moveTouch(ev) {
      const t = ev.touches[0];
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      block.style.width = Math.max(50, startWidth + dx) + "px";
      block.style.height = Math.max(20, startHeight + dy) + "px";
    }
    function endTouch() {
      document.removeEventListener("touchmove", moveTouch);
      document.removeEventListener("touchend", endTouch);
    }
    document.addEventListener("touchmove", moveTouch, { passive: false });
    document.addEventListener("touchend", endTouch);
  }, { passive: false });
}

function makeDraggable(el) {
  let startX = 0, startY = 0;
  let origX = 0, origY = 0;
  let dragging = false;

  el.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;

    // Si on clique dans le texte → PAS de drag
    if (e.target.closest(".text-content")) return;

    // Si on clique sur la poignée de resize → PAS de drag
    if (e.target.classList && e.target.classList.contains("resize-handle")) return;

    // Sélection du bloc
    document.querySelectorAll(".floating-text").forEach(b => b.classList.remove("selected"));
    el.classList.add("selected");

    const text = el.querySelector(".text-content");
    if (text && text.getAttribute("contenteditable") === "true") return;

    e.preventDefault();
    dragging = true;

    startX = e.clientX;
    startY = e.clientY;

    const rect = el.getBoundingClientRect();
    const parentRect = el.parentNode.getBoundingClientRect();

    origX = rect.left - parentRect.left;
    origY = rect.top - parentRect.top;

    function move(ev) {
      if (!dragging) return;
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;

      el.style.left = Math.max(0, origX + dx) + "px";
      el.style.top = Math.max(0, origY + dy) + "px";
    }

    function up() {
      dragging = false;
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
    }

    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
  });

  // Désélection si on clique ailleurs
  document.addEventListener("mousedown", (e) => {
    if (!el.contains(e.target)) {
      el.classList.remove("selected");
    }
  });

  // Touch support
  el.addEventListener("touchstart", (e) => {
    const t = e.touches[0];
    startX = t.clientX;
    startY = t.clientY;
    const rect = el.getBoundingClientRect();
    const parentRect = el.parentNode.getBoundingClientRect();
    origX = rect.left - parentRect.left;
    origY = rect.top - parentRect.top;

    function moveTouch(ev) {
      const tt = ev.touches[0];
      const dx = tt.clientX - startX;
      const dy = tt.clientY - startY;
      el.style.left = Math.max(0, origX + dx) + "px";
      el.style.top = Math.max(0, origY + dy) + "px";
    }
    function endTouch() {
      document.removeEventListener("touchmove", moveTouch);
      document.removeEventListener("touchend", endTouch);
    }
    document.addEventListener("touchmove", moveTouch, { passive: false });
    document.addEventListener("touchend", endTouch);
  }, { passive: false });
}

function createFloatingText() {
  const editor = $("#editor-page");
  if (!editor) return;

  const block = document.createElement("div");
  block.className = "floating-text";

  // Zone de texte
  const textContent = document.createElement("div");
  textContent.className = "text-content";
  textContent.innerHTML = "Double-clique pour écrire…";
  textContent.setAttribute("contenteditable", "false");
  textContent.style.userSelect = "none";

  block.appendChild(textContent);

  // Poignée de resize
  const handle = document.createElement("div");
  handle.className = "resize-handle";
  block.appendChild(handle);

  // Position initiale
  block.style.position = "absolute";
  block.style.top = "120px";
  block.style.left = "120px";
  block.style.minWidth = "150px";
  block.style.fontSize = "18px";
  block.style.background = "transparent";
  block.style.cursor = "move";

  /* --- Double clic → édition --- */
  block.addEventListener("dblclick", (e) => {
    e.stopPropagation();
    textContent.setAttribute("contenteditable", "true");
    textContent.style.userSelect = "text";
    block.classList.add("selected");
    block.style.cursor = "text";
    textContent.focus();
  });

  /* --- Empêcher le drag de voler le clic dans le texte --- */
  textContent.addEventListener("mousedown", (e) => {
    e.stopPropagation();
  });

  /* --- Quitter édition quand on clique ailleurs --- */
  document.addEventListener("mousedown", (e) => {
    if (!block.contains(e.target)) {
      textContent.setAttribute("contenteditable", "false");
      textContent.style.userSelect = "none";
      block.classList.remove("selected");
      block.style.cursor = "move";
    }
  });

  /* --- Empêcher disparition du texte --- */
  textContent.addEventListener("input", () => {
    if (textContent.innerHTML.trim() === "") {
      textContent.innerHTML = "<br>";
    }
  });

  // Ajouter au DOM
  editor.appendChild(block);

  // Activer drag + resize
  makeDraggable(block);
  makeResizable(block);
}

/* ============================================================
   CHARGER ARTICLE (utilise getDb)
   ============================================================ */

async function chargerArticle() {
  let client;
  try {
    client = await getDb();
  } catch (err) {
    console.warn("chargerArticle: supabase non disponible", err);
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const actuId = Number(params.get("id"));
  if (!actuId) {
    console.warn("chargerArticle: id manquant");
    return;
  }

  const { data, error } = await client
    .from("actus")
    .select("*")
    .eq("id", actuId)
    .single();

  if (error) {
    console.error("chargerArticle supabase error:", error);
    return;
  }

  // Injecter le HTML sauvegardé
  const editor = $("#editor-page");
  if (!editor) return;
  editor.innerHTML = data.texte || "";

  // Réactiver le drag/resize/édition sur les blocs rechargés
  document.querySelectorAll(".floating-text").forEach(el => {
    const textContent = el.querySelector(".text-content");
    makeDraggable(el);
    makeResizable(el);

    // Réattacher handlers d'édition si nécessaire (déduplication)
    el.addEventListener("dblclick", (e) => {
      e.stopPropagation();
      if (textContent) {
        textContent.setAttribute("contenteditable", "true");
        el.classList.add("selected");
        el.style.cursor = "text";
        textContent.focus();
      }
    });

    textContent?.addEventListener("mousedown", (e) => e.stopPropagation());

    // Quitter édition quand on clique ailleurs
    document.addEventListener("mousedown", (e) => {
      if (!el.contains(e.target)) {
        textContent?.setAttribute("contenteditable", "false");
        el.classList.remove("selected");
        el.style.cursor = "move";
      }
    });
  });
}

/* ============================================================
   TOOLBAR – FORMATAGE (WYSIWYG)
   ============================================================ */

function applyInlineStyle(cmd, value = null) {
  document.execCommand(cmd, false, value);
}

function applyBlockStyle(styleCallback) {
  const selection = window.getSelection();
  if (!selection.rangeCount) return;

  const range = selection.getRangeAt(0);
  let node = range.commonAncestorContainer;

  if (node.nodeType === 3) {
    node = node.parentNode;
  }

  styleCallback(node);
}

function attachFormatToolbarHandlers() {
  const toolbar = $('#format-toolbar');
  if (!toolbar) return console.warn('Toolbar introuvable');

  $('#ft-font', toolbar)?.addEventListener('change', (e) => {
    applyBlockStyle(node => node.style.fontFamily = e.target.value);
  });

  $('#ft-size', toolbar)?.addEventListener('change', (e) => {
    applyBlockStyle(node => node.style.fontSize = e.target.value);
  });

  $('#ft-bold', toolbar)?.addEventListener('click', (e) => {
    e.preventDefault();
    applyInlineStyle('bold');
  });

  $('#ft-italic', toolbar)?.addEventListener('click', (e) => {
    e.preventDefault();
    applyInlineStyle('italic');
  });

  $('#ft-underline', toolbar)?.addEventListener('click', (e) => {
    e.preventDefault();
    applyInlineStyle('underline');
  });

  $('#ft-color', toolbar)?.addEventListener('input', (e) => {
    applyInlineStyle('foreColor', e.target.value);
  });

  $('#ft-align-left', toolbar)?.addEventListener('click', (e) => {
    e.preventDefault();
    applyBlockStyle(node => node.style.textAlign = 'left');
  });

  $('#ft-align-center', toolbar)?.addEventListener('click', (e) => {
    e.preventDefault();
    applyBlockStyle(node => node.style.textAlign = 'center');
  });

  $('#ft-align-right', toolbar)?.addEventListener('click', (e) => {
    e.preventDefault();
    applyBlockStyle(node => node.style.textAlign = 'right');
  });

  $('#ft-lineheight', toolbar)?.addEventListener('change', (e) => {
    applyBlockStyle(node => node.style.lineHeight = e.target.value);
  });

  console.log('[toolbar] handlers attachés');
}

/* ============================================================
   PANNEAUX CANVA
   ============================================================ */

function attachSidebarHandlers() {
  $('#add-floating-text')?.addEventListener('click', () => {
    createFloatingText();
  });

  $('#add-image')?.addEventListener('click', () => {
    const input = document.getElementById("hidden-image-input");
    if (!input) return;
    input.value = ""; // reset
    input.click();
  });

  const icons = $all('.canva-icon');
  const panels = $all('.canva-panel');

  function closeAll() {
    panels.forEach(p => {
      p.classList.remove('open');
      p.setAttribute('aria-hidden', 'true');
    });
    icons.forEach(i => i.classList.remove('active'));
  }

  icons.forEach(icon => {
    const key = icon.dataset.panel;
    const panel = $('#panel-' + key);
    if (!panel) return;

    icon.addEventListener('mouseenter', () => {
      closeAll();
      panel.classList.add('open');
      panel.setAttribute('aria-hidden', 'false');
      icon.classList.add('active');
    });

    icon.addEventListener('click', (e) => {
      e.stopPropagation();
      closeAll();
      panel.classList.add('open');
      panel.setAttribute('aria-hidden', 'false');
      icon.classList.add('active');
    });
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.canva-panel') && !e.target.closest('.canva-icon')) {
      closeAll();
    }
  });
}

/* ============================================================
   SAUVEGARDE
   ============================================================ */

async function sauvegarder() {
  console.log("[sauvegarder] démarrage");

  let client;
  try {
    client = await getDb();
  } catch (err) {
    alert("Supabase non initialisé");
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const actuId = Number(params.get("id"));
  console.log("actuId =", actuId);

  if (!actuId) {
    alert("ID d'article manquant");
    return;
  }

  const editor = $("#editor-page");
  if (!editor) {
    alert("Éditeur introuvable");
    return;
  }

  const html = editor.innerHTML;

  try {
    const { data, error } = await client
      .from("actus")
      .update({ texte: html })
      .eq("id", actuId)
      .select();

    console.log("DATA :", data);
    console.log("ERROR :", error);

    if (error) {
      console.error(error);
      alert("Erreur Supabase");
      return;
    }

    alert("Enregistré !");
  } catch (err) {
    console.error("sauvegarder: erreur réseau", err);
    alert("Erreur réseau lors de la sauvegarde");
  }
}

/* ============================================================
   FILE INPUT + DRAG & DROP
   ============================================================ */

const hiddenInput = document.getElementById("hidden-image-input");
if (hiddenInput) {
  hiddenInput.addEventListener("change", function () {
    const file = this.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
      addImage(e.target.result); // base64
    };
    reader.readAsDataURL(file);
  });
}

const canvas = document.getElementById("editor-page");
if (canvas) {
  // Empêche le comportement par défaut
  ["dragenter", "dragover", "dragleave", "drop"].forEach(evt => {
    canvas.addEventListener(evt, e => e.preventDefault());
  });

  // Style visuel (optionnel)
  canvas.addEventListener("dragover", () => {
    canvas.classList.add("drag-hover");
  });
  canvas.addEventListener("dragleave", () => {
    canvas.classList.remove("drag-hover");
  });

  // Dépôt d’image
  canvas.addEventListener("drop", (e) => {
    canvas.classList.remove("drag-hover");

    const file = e.dataTransfer.files[0];
    if (!file || !file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = function (ev) {
      addImage(ev.target.result);
    };
    reader.readAsDataURL(file);
  });
}

/* ============================================================
   INIT
   ============================================================ */

function initEditor() {
  console.log("[initEditor] démarrage");

  const editor = document.querySelector("#editor-page");

  // On ne fait tourner l'éditeur QUE si le conteneur est marqué comme éditeur
  if (!editor || !editor.dataset.editor) {
    console.log("[initEditor] pas en mode éditeur, on ne fait rien");
    return;
  }

  // Charger l'article uniquement en mode éditeur
  chargerArticle();

  attachFormatToolbarHandlers();
  attachSidebarHandlers();

  const saveBtn = document.getElementById("save-btn-top");
  if (saveBtn && !saveBtn._saveAttached) {
    saveBtn.addEventListener("click", (e) => {
      e.preventDefault();
      sauvegarder();
    });
    saveBtn._saveAttached = true;
  }

  console.log("[initEditor] OK");
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initEditor);
} else {
  initEditor();
}

console.log('FIN DU FICHIER OK');
