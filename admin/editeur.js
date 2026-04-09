import { loadElements, setupSearch } from "./elements-search.js";

loadElements();
setupSearch();

// --- Supabase global UMD ---
const supabase = window.supabase.createClient(
  "https://blronpowdhaumjudtgvn.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJscm9ucG93ZGhhdW1qdWR0Z3ZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5ODU4MDAsImV4cCI6MjA4NDU2MTgwMH0.ThzU_Eqgwy0Qx2vTO381R0HHvV1jfhsAZFxY-Aw4hXI"
);

console.log("editeur.js loaded");

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
    editor.insertAdjacentHTML("beforeend", "<h2>Nouveau titre</h2>");
  }

  function addSubtitle() {
    const editor = $("#editor-page");
    editor.insertAdjacentHTML("beforeend", "<h3>Nouveau sous-titre</h3>");
  }

  function addParagraph() {
    const editor = $("#editor-page");
    editor.insertAdjacentHTML("beforeend", "<p>Nouveau paragraphe…</p>");
  }

  function addImage(src) {
    const editor = $("#editor-page");
    editor.insertAdjacentHTML(
      "beforeend",
      `<img src="${src}" style="max-width:100%; margin:20px 0;">`
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

            block.style.width = startWidth + dx + "px";
            block.style.height = startHeight + dy + "px";
        }

        function up() {
            document.removeEventListener("mousemove", move);
            document.removeEventListener("mouseup", up);
        }

        document.addEventListener("mousemove", move);
        document.addEventListener("mouseup", up);
    });
}

function makeDraggable(el) {
    let startX = 0, startY = 0;
    let origX = 0, origY = 0;

    el.addEventListener("mousedown", (e) => {
        if (e.button !== 0) return;

        const text = el.querySelector(".text-content");

        // Si on clique dans le texte → PAS de drag
        if (e.target.closest(".text-content")) return;

        // Si on clique sur la poignée de resize → PAS de drag
        if (e.target.classList.contains("resize-handle")) return;

        // Sélection du bloc
        document.querySelectorAll(".floating-text").forEach(b => b.classList.remove("selected"));
        el.classList.add("selected");

        // Si on est en mode édition → PAS de drag
        if (text.getAttribute("contenteditable") === "true") return;

        e.preventDefault();

        startX = e.clientX;
        startY = e.clientY;

        const rect = el.getBoundingClientRect();
        const parentRect = el.parentNode.getBoundingClientRect();

        origX = rect.left - parentRect.left;
        origY = rect.top - parentRect.top;

        function move(ev) {
            const dx = ev.clientX - startX;
            const dy = ev.clientY - startY;

            el.style.left = origX + dx + "px";
            el.style.top = origY + dy + "px";
        }

        function up() {
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
}

function createFloatingText() {
    const block = document.createElement("div");
    block.className = "floating-text";

    // Zone de texte
    const textContent = document.createElement("div");
    textContent.className = "text-content";
    textContent.innerHTML = "Double-clique pour écrire…";
    textContent.setAttribute("contenteditable", "false");

    // Empêche la sélection du texte hors édition
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
        textContent.style.userSelect = "text"; // ← autorise la sélection
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
            textContent.style.userSelect = "none"; // ← redevient non sélectionnable
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
    document.querySelector("#editor-page").appendChild(block);

    // Activer drag + resize
    makeDraggable(block);
    makeResizable(block);
}

async function chargerArticle() {
  const client = await window.__supabaseReady;

  const params = new URLSearchParams(window.location.search);
  const actuId = Number(params.get("id"));

  const { data, error } = await client
    .from("actus")
    .select("*")
    .eq("id", actuId)
    .single();

  if (error) {
    console.error(error);
    return;
  }

  // Injecter le HTML sauvegardé
  document.querySelector("#editor-page").innerHTML = data.texte;

  // 🔥 Réactiver le drag sur les blocs rechargés
document.querySelectorAll(".floating-text").forEach(el => {
    const textContent = el.querySelector(".text-content");

    // Réactiver drag
    makeDraggable(el);

    // Réactiver resize
    makeResizable(el);

    // Réactiver double-clic pour éditer
    el.addEventListener("dblclick", (e) => {
        e.stopPropagation();
        textContent.setAttribute("contenteditable", "true");
        el.classList.add("selected");
        el.style.cursor = "text";
        textContent.focus();
    });

    // Empêcher drag de voler le clic
    textContent.addEventListener("mousedown", (e) => {
        e.stopPropagation();
    });

    // Quitter édition quand on clique ailleurs
    document.addEventListener("mousedown", (e) => {
        if (!el.contains(e.target)) {
            textContent.setAttribute("contenteditable", "false");
            el.classList.remove("selected");
            el.style.cursor = "move";
        }
    });
});

}

chargerArticle();

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

    console.log('Toolbar détectée:', toolbar);

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

  const client = await window.__supabaseReady;
  if (!client) {
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

  const html = document.querySelector("#editor-page").innerHTML;

  const { data, error } = await client
    .from("actus")
    .update({
      texte: html // ← CORRECTION ICI
    })
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
}

// ❌ enlève cet appel global
// chargerArticle();

// Import d’image depuis l’explorateur
document.getElementById("hidden-image-input")?.addEventListener("change", function () {
  const file = this.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    addImage(e.target.result); // base64
  };
  reader.readAsDataURL(file);
});

  const canvas = document.getElementById("editor-page");

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
})();
