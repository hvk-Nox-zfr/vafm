// Remplacer l'import statique par une initialisation dynamique et sûre
// (colle ceci à la place de : import { createClient } from "...";)

let supabase = window.supabase || null;

// Promise indiquant que supabase est prêt
let __supabaseReady = (async () => {
  if (supabase) return supabase;

  // Import dynamique uniquement si nécessaire (évite double déclaration)
  const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm");
  const SUPABASE_URL = "https://blronpowdhaumjudtgvn.supabase.co";
  const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJscm9ucG93ZGhhdW1qdWR0Z3ZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5ODU4MDAsImV4cCI6MjA4NDU2MTgwMH0.ThzU_Eqgwy0Qx2vTO381R0HHvV1jfhsAZFxY-Aw4hXI";

  supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  // Optionnel : exposer globalement si tu veux réutiliser ailleurs
  window.supabase = supabase;
  return supabase;
})();

// --- VARIABLES (assignées après DOMContentLoaded)
let wrapper = null;
let canvas = null;
let editorLayer = null;
let selectedBlock = null;
let undoStack = [];
let redoStack = [];

// --- UTILITAIRES (drag / resize / select)
function makeDraggable(el) {
  let offsetX = 0, offsetY = 0;

  el.addEventListener("mousedown", e => {
    if (e.target.classList.contains("resize-handle")) return;

    selectedBlock = el;
    selectBlock(el);

    offsetX = e.clientX - el.offsetLeft;
    offsetY = e.clientY - el.offsetTop;

    function move(e2) {
      el.style.left = (e2.clientX - offsetX) + "px";
      el.style.top = (e2.clientY - offsetY) + "px";
    }

    function stop() {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", stop);
    }

    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", stop);
  });
}

function makeResizable(el) {
  const handle = document.createElement("div");
  handle.className = "resize-handle bottom-right";
  el.appendChild(handle);

  handle.addEventListener("mousedown", e => {
    e.stopPropagation();

    const startX = e.clientX;
    const startY = e.clientY;
    const startW = el.offsetWidth;
    const startH = el.offsetHeight;

    function resize(e2) {
      el.style.width = Math.max(20, startW + (e2.clientX - startX)) + "px";
      el.style.height = Math.max(20, startH + (e2.clientY - startY)) + "px";
    }

    function stop() {
      document.removeEventListener("mousemove", resize);
      document.removeEventListener("mouseup", stop);
    }

    document.addEventListener("mousemove", resize);
    document.addEventListener("mouseup", stop);
  });
}

function makeSelectable(el) {
  el.addEventListener("click", e => {
    e.stopPropagation();
    selectBlock(el);
  });
}

function selectBlock(el) {
  document.querySelectorAll(".block-public").forEach(b => b.classList.remove("selected"));
  el.classList.add("selected");
  selectedBlock = el;
}

// --- AJOUT D'UN BLOC IMAGE (exporté si besoin)
export function addImageBlock(data = {}) {
  // s'assurer que le DOM est prêt
  if (!editorLayer && !wrapper) {
    console.warn('addImageBlock: editorLayer et wrapper non initialisés');
    return null;
  }

  const div = document.createElement("div");
  div.className = "block-public";
  div.style.position = "absolute";
  div.style.left = data.x || "100px";
  div.style.top = data.y || "100px";
  div.style.width = data.width || "300px";
  div.style.height = data.height || "200px";

  const img = document.createElement("img");
  img.src = data.url || "";
  img.alt = data.alt || "";
  img.style.position = "absolute";
  img.style.left = data.offsetX || "0px";
  img.style.top = data.offsetY || "0px";
  img.style.width = data.imgWidth || "100%";
  img.style.height = data.imgHeight || "100%";
  img.style.objectFit = "contain";

  div.appendChild(img);

  makeDraggable(div);
  makeResizable(div);
  makeSelectable(div);

  if (editorLayer) editorLayer.appendChild(div);
  else wrapper.appendChild(div);

  return div;
}

// --- SAUVEGARDE
async function sauvegarder() {
  if (!editorLayer || !canvas) {
    alert("Impossible d'enregistrer : éditeur non initialisé.");
    return;
  }

  const images = [...editorLayer.querySelectorAll(".block-public")].map(div => {
    const img = div.querySelector("img");
    return {
      url: img?.src || "",
      x: div.style.left || "0px",
      y: div.style.top || "0px",
      width: div.style.width || "",
      height: div.style.height || "",
      offsetX: img?.style.left || "0px",
      offsetY: img?.style.top || "0px",
      imgWidth: img?.style.width || "100%",
      imgHeight: img?.style.height || "100%"
    };
  });

  const texte = canvas.innerHTML;

  try {
    const params = new URLSearchParams(window.location.search);
    const actuId = Number(params.get("id"));
    if (!actuId || isNaN(actuId)) {
      alert("ID d'article invalide.");
      return;
    }

    const { error } = await supabase
      .from("actus")
      .update({ contenu: { texte, images } })
      .eq("id", actuId);

    if (error) {
      console.error("Erreur sauvegarde Supabase:", error);
      alert("Erreur lors de l'enregistrement.");
      return;
    }

    alert("Enregistré !");
  } catch (err) {
    console.error("Erreur sauvegarde:", err);
    alert("Erreur lors de l'enregistrement.");
  }
}

// --- CHARGEMENT DE L'ARTICLE
async function chargerActu() {
  console.log('chargerActu start');
  const params = new URLSearchParams(window.location.search);
  const actuId = Number(params.get("id"));

  if (!actuId || isNaN(actuId)) {
    console.warn('chargerActu: actuId invalide');
    if (canvas) canvas.innerHTML = "<h2>Article introuvable</h2>";
    return;
  }

  try {
    const { data: actu, error } = await supabase
      .from("actus")
      .select("*")
      .eq("id", actuId)
      .maybeSingle();

    if (error) {
      console.error('Supabase error:', error);
      if (canvas) canvas.innerHTML = "<h2>Erreur lors du chargement</h2>";
      return;
    }

    if (!actu) {
      console.warn('Aucun article retourné');
      if (canvas) canvas.innerHTML = "<h2>Article introuvable</h2>";
      return;
    }

    // DEBUG: afficher l'objet brut si besoin
    console.log('actu raw:', actu);

    // Texte
    const texte = actu.contenu?.texte || "";
    if (canvas) {
      canvas.innerHTML = texte;
      console.log('texte injecté length:', texte.length);
    }

    // Images flottantes
    const images = Array.isArray(actu.contenu?.images) ? actu.contenu.images : [];
    images.forEach(img => addImageBlock(img));
    console.log('images ajoutées:', images.length);

  } catch (err) {
    console.error('Erreur chargerActu:', err);
    if (canvas) canvas.innerHTML = "<h2>Erreur lors du chargement</h2>";
  }
}
// editeur.js
// Module ES autonome : supabase client, gestion de l'éditeur, panels et interactions.

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

console.log('editeur.js loaded');

// --- CONFIG SUPABASE
const SUPABASE_URL = "https://blronpowdhaumjudtgvn.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJscm9ucG93ZGhhdW1qdWR0Z3ZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5ODU4MDAsImV4cCI6MjA4NDU2MTgwMH0.ThzU_Eqgwy0Qx2vTO381R0HHvV1jfhsAZFxY-Aw4hXI";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- VARIABLES (assignées après DOMContentLoaded)
let wrapper = null;
let canvas = null;
let editorLayer = null;
let selectedBlock = null;
let undoStack = [];
let redoStack = [];

// --- UTILITAIRES (drag / resize / select)
function makeDraggable(el) {
  let offsetX = 0, offsetY = 0;

  el.addEventListener("mousedown", e => {
    if (e.button !== 0) return; // only left click
    if (e.target.classList.contains("resize-handle")) return;

    selectedBlock = el;
    selectBlock(el);

    const rect = el.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;

    function move(e2) {
      el.style.left = (e2.clientX - offsetX) + "px";
      el.style.top = (e2.clientY - offsetY) + "px";
    }

    function stop() {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", stop);
    }

    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", stop);
  });
}

function makeResizable(el) {
  const handle = document.createElement("div");
  handle.className = "resize-handle bottom-right";
  el.appendChild(handle);

  handle.addEventListener("mousedown", e => {
    e.stopPropagation();
    if (e.button !== 0) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const startW = el.offsetWidth;
    const startH = el.offsetHeight;

    function resize(e2) {
      el.style.width = Math.max(20, startW + (e2.clientX - startX)) + "px";
      el.style.height = Math.max(20, startH + (e2.clientY - startY)) + "px";
    }

    function stop() {
      document.removeEventListener("mousemove", resize);
      document.removeEventListener("mouseup", stop);
    }

    document.addEventListener("mousemove", resize);
    document.addEventListener("mouseup", stop);
  });
}

function makeSelectable(el) {
  el.addEventListener("click", e => {
    e.stopPropagation();
    selectBlock(el);
  });
}

function selectBlock(el) {
  document.querySelectorAll(".block-public").forEach(b => b.classList.remove("selected"));
  if (el) el.classList.add("selected");
  selectedBlock = el;
}

// --- AJOUT D'UN BLOC IMAGE (exporté)
export function addImageBlock(data = {}) {
  if (!editorLayer && !wrapper) {
    console.warn('addImageBlock: editorLayer et wrapper non initialisés');
    return null;
  }

  const div = document.createElement("div");
  div.className = "block-public";
  div.style.position = "absolute";
  div.style.left = typeof data.x === "number" ? `${data.x}px` : (data.x || "100px");
  div.style.top = typeof data.y === "number" ? `${data.y}px` : (data.y || "100px");
  div.style.width = typeof data.width === "number" ? `${data.width}px` : (data.width || "300px");
  div.style.height = typeof data.height === "number" ? `${data.height}px` : (data.height || "200px");

  const img = document.createElement("img");
  img.src = data.url || "";
  img.alt = data.alt || "";
  img.style.position = "absolute";
  img.style.left = data.offsetX || "0px";
  img.style.top = data.offsetY || "0px";
  img.style.width = data.imgWidth || "100%";
  img.style.height = data.imgHeight || "100%";
  img.style.objectFit = "contain";
  img.draggable = false;

  div.appendChild(img);

  makeDraggable(div);
  makeResizable(div);
  makeSelectable(div);

  if (editorLayer) editorLayer.appendChild(div);
  else if (wrapper) wrapper.appendChild(div);

  return div;
}

// --- SAUVEGARDE
async function sauvegarder() {
  if (!editorLayer || !canvas) {
    alert("Impossible d'enregistrer : éditeur non initialisé.");
    return;
  }

  const images = [...editorLayer.querySelectorAll(".block-public")].map(div => {
    const img = div.querySelector("img");
    return {
      url: img?.src || "",
      x: div.style.left || "0px",
      y: div.style.top || "0px",
      width: div.style.width || "",
      height: div.style.height || "",
      offsetX: img?.style.left || "0px",
      offsetY: img?.style.top || "0px",
      imgWidth: img?.style.width || "100%",
      imgHeight: img?.style.height || "100%"
    };
  });

  const texte = canvas.innerHTML;

  try {
    const params = new URLSearchParams(window.location.search);
    const actuId = Number(params.get("id"));
    if (!actuId || isNaN(actuId)) {
      alert("ID d'article invalide.");
      return;
    }

    const { error } = await supabase
      .from("actus")
      .update({ contenu: { texte, images } })
      .eq("id", actuId);

    if (error) {
      console.error("Erreur sauvegarde Supabase:", error);
      alert("Erreur lors de l'enregistrement.");
      return;
    }

    alert("Enregistré !");
  } catch (err) {
    console.error("Erreur sauvegarde:", err);
    alert("Erreur lors de l'enregistrement.");
  }
}

// --- CHARGEMENT DE L'ARTICLE
async function chargerActu() {
  console.log('chargerActu start');
  const params = new URLSearchParams(window.location.search);
  const actuId = Number(params.get("id"));

  if (!actuId || isNaN(actuId)) {
    console.warn('chargerActu: actuId invalide');
    if (canvas) canvas.innerHTML = "<h2>Article introuvable</h2>";
    return;
  }

  try {
    const { data: actu, error } = await supabase
      .from("actus")
      .select("*")
      .eq("id", actuId)
      .maybeSingle();

    if (error) {
      console.error('Supabase error:', error);
      if (canvas) canvas.innerHTML = "<h2>Erreur lors du chargement</h2>";
      return;
    }

    if (!actu) {
      console.warn('Aucun article retourné');
      if (canvas) canvas.innerHTML = "<h2>Article introuvable</h2>";
      return;
    }

    console.log('actu raw:', actu);

    const texte = actu.contenu?.texte || "";
    if (canvas) {
      canvas.innerHTML = texte;
      console.log('texte injecté length:', texte.length);
    }

    const images = Array.isArray(actu.contenu?.images) ? actu.contenu.images : [];
    images.forEach(img => addImageBlock(img));
    console.log('images ajoutées:', images.length);

  } catch (err) {
    console.error('Erreur chargerActu:', err);
    if (canvas) canvas.innerHTML = "<h2>Erreur lors du chargement</h2>";
  }
}

// --- INITIALISATION AU DOM READY (unique handler)
document.addEventListener("DOMContentLoaded", () => {
  // récupérer les éléments après que le DOM soit prêt
  wrapper = document.querySelector(".canvas-wrapper");
  canvas = document.getElementById("actu-content");
  editorLayer = document.getElementById("editor-layer");

  // sécurité CSS/interaction pour le calque d'édition
  if (editorLayer) {
    editorLayer.style.pointerEvents = "auto";
    editorLayer.style.zIndex = 9999;
    editorLayer.style.position = "absolute";
    editorLayer.style.inset = "0";
  }

  // bouton sauvegarde
  const saveBtn = document.getElementById("save-btn");
  if (saveBtn) saveBtn.addEventListener("click", sauvegarder);

  // click outside pour désélectionner
  document.addEventListener("click", () => {
    document.querySelectorAll(".block-public").forEach(b => b.classList.remove("selected"));
    selectedBlock = null;
  });

  // panels controller
  const icons = Array.from(document.querySelectorAll('.canva-icon'));
  const panels = Array.from(document.querySelectorAll('.canva-panel'));
  let openTimer = null;
  let closeTimer = null;
  const OPEN_DELAY = 80;
  const CLOSE_DELAY = 160;

  function closeAllPanels() {
    panels.forEach(p => {
      p.classList.remove('open');
      p.setAttribute('aria-hidden', 'true');
    });
    icons.forEach(i => i.classList.remove('active'));
  }

  icons.forEach(icon => {
    const key = icon.dataset.panel || icon.dataset.tool;
    const panel = document.getElementById('panel-' + key);
    if (!panel) return;

    icon.addEventListener('mouseenter', () => {
      clearTimeout(closeTimer);
      openTimer = setTimeout(() => {
        closeAllPanels();
        panel.classList.add('open');
        panel.setAttribute('aria-hidden', 'false');
        icon.classList.add('active');
      }, OPEN_DELAY);
    });

    icon.addEventListener('mouseleave', () => {
      clearTimeout(openTimer);
      closeTimer = setTimeout(() => {
        if (!panel.matches(':hover')) {
          panel.classList.remove('open');
          panel.setAttribute('aria-hidden', 'true');
          icon.classList.remove('active');
        }
      }, CLOSE_DELAY);
    });

    icon.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const isOpen = panel.classList.contains('open');
      closeAllPanels();
      if (!isOpen) {
        panel.classList.add('open');
        panel.setAttribute('aria-hidden', 'false');
        icon.classList.add('active');
      }
      // dispatch event for external handlers
      document.dispatchEvent(new CustomEvent('canva-tool', { detail: { tool: key } }));
    });

    icon.addEventListener('focus', () => {
      clearTimeout(closeTimer);
      closeAllPanels();
      panel.classList.add('open');
      panel.setAttribute('aria-hidden', 'false');
      icon.classList.add('active');
    });
  });

  panels.forEach(panel => {
    panel.addEventListener('mouseenter', () => {
      clearTimeout(closeTimer);
      clearTimeout(openTimer);
      panel.classList.add('open');
      panel.setAttribute('aria-hidden', 'false');
    });
    panel.addEventListener('mouseleave', () => {
      closeTimer = setTimeout(() => {
        panel.classList.remove('open');
        panel.setAttribute('aria-hidden', 'true');
        const id = panel.id.replace(/^panel-/, '');
        const icon = document.querySelector(`.canva-icon[data-panel="${id}"], .canva-icon[data-tool="${id}"]`);
        if (icon) icon.classList.remove('active');
      }, CLOSE_DELAY);
    });

    panel.addEventListener('focusin', () => {
      clearTimeout(closeTimer);
      panel.classList.add('open');
      panel.setAttribute('aria-hidden', 'false');
    });
    panel.addEventListener('focusout', () => {
      setTimeout(() => {
        if (!panel.contains(document.activeElement)) {
          panel.classList.remove('open');
          panel.setAttribute('aria-hidden', 'true');
        }
      }, 10);
    });
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.canva-panel') && !e.target.closest('.canva-icon')) {
      closeAllPanels();
    }
  });

  // Ensure editor-layer is inside wrapper and covers canvas
  if (wrapper && editorLayer && editorLayer.parentElement !== wrapper) {
    wrapper.appendChild(editorLayer);
    Object.assign(editorLayer.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      right: '0',
      bottom: '0',
      pointerEvents: 'auto',
      zIndex: '9999'
    });
  }

  // initial state
  closeAllPanels();

  // lancer le chargement de l'article
  chargerActu();
});
