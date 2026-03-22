// editeur.js (version corrigée, module ES)
let supabase = window.supabase || null;

let __supabaseReady = (async () => {
  if (supabase) return supabase;
  try {
    const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm");
    const SUPABASE_URL = "https://blronpowdhaumjudtgvn.supabase.co";
    const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJscm9ucG93ZGhhdW1qdWR0Z3ZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5ODU4MDAsImV4cCI6MjA4NDU2MTgwMH0.ThzU_Eqgwy0Qx2vTO381R0HHvV1jfhsAZFxY-Aw4hXI";
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    window.supabase = supabase;
    return supabase;
  } catch (err) {
    console.warn('supabase dynamic import failed:', err);
    return null;
  }
})();

console.log('editeur.js loaded');

// Variables
let wrapper = null;
let canvas = null;
let editorLayer = null;
let selectedBlock = null;

// Utilities
function makeDraggable(el) {
  let offsetX = 0, offsetY = 0;
  el.addEventListener("mousedown", e => {
    if (e.button !== 0) return;
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

// addImageBlock exported and exposed
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

// sauvegarder
async function sauvegarder() {
  const client = await __supabaseReady;
  if (!client) {
    alert("Supabase non initialisé. Impossible d'enregistrer.");
    return;
  }
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
    const { error } = await client
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

// chargerActu
async function chargerActu() {
  const client = await __supabaseReady;
  if (!client) {
    console.warn('chargerActu: supabase non initialisé, lecture locale uniquement');
  }
  const params = new URLSearchParams(window.location.search);
  const actuId = Number(params.get("id"));
  if (!actuId || isNaN(actuId)) {
    if (canvas) canvas.innerHTML = "<h2>Article introuvable</h2>";
    return;
  }
  try {
    const { data: actu, error } = await (client ? client.from("actus").select("*").eq("id", actuId).maybeSingle() : Promise.resolve({ data: null, error: null }));
    if (error) {
      console.error('Supabase error:', error);
      if (canvas) canvas.innerHTML = "<h2>Erreur lors du chargement</h2>";
      return;
    }
    const article = actu || (await fetch(`/public-page.html?id=${actuId}`).then(r=>r.ok? r.text() : null).catch(()=>null));
    if (!article) {
      if (canvas) canvas.innerHTML = "<h2>Article introuvable</h2>";
      return;
    }
    const texte = actu?.contenu?.texte || (typeof article === 'string' ? article : "");
    if (canvas) canvas.innerHTML = texte;
    const images = Array.isArray(actu?.contenu?.images) ? actu.contenu.images : [];
    images.forEach(img => addImageBlock(img));
  } catch (err) {
    console.error('Erreur chargerActu:', err);
    if (canvas) canvas.innerHTML = "<h2>Erreur lors du chargement</h2>";
  }
}

// Panels controller + initialisation DOM
document.addEventListener("DOMContentLoaded", () => {
  wrapper = document.querySelector(".canvas-wrapper");
  canvas = document.getElementById("actu-content");
  editorLayer = document.getElementById("editor-layer");

  if (editorLayer) {
    editorLayer.style.pointerEvents = "auto";
    editorLayer.style.zIndex = 9999;
    editorLayer.style.position = "absolute";
    editorLayer.style.inset = "0";
  }

  // expose for debug
  window.addImageBlock = addImageBlock;
  window.sauvegarder = sauvegarder;
  window.__supabaseReady = __supabaseReady;

  // save button
  const saveBtn = document.getElementById("save-btn");
  if (saveBtn) saveBtn.addEventListener("click", sauvegarder);

  // deselect on outside click
  document.addEventListener("click", () => {
    document.querySelectorAll(".block-public").forEach(b => b.classList.remove("selected"));
    selectedBlock = null;
  });

  // panels
  const icons = Array.from(document.querySelectorAll('.canva-icon'));
  const panels = Array.from(document.querySelectorAll('.canva-panel'));
  let openTimer = null;
  let closeTimer = null;
  const OPEN_DELAY = 80;
  const CLOSE_DELAY = 160;

  function closeAllPanels() {
    panels.forEach(p => { p.classList.remove('open'); p.setAttribute('aria-hidden','true'); });
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
        panel.setAttribute('aria-hidden','false');
        icon.classList.add('active');
      }, OPEN_DELAY);
    });

    icon.addEventListener('mouseleave', () => {
      clearTimeout(openTimer);
      closeTimer = setTimeout(() => {
        if (!panel.matches(':hover')) {
          panel.classList.remove('open');
          panel.setAttribute('aria-hidden','true');
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
        panel.setAttribute('aria-hidden','false');
        icon.classList.add('active');
      }
      document.dispatchEvent(new CustomEvent('canva-tool', { detail: { tool: key } }));
    });

    icon.addEventListener('focus', () => {
      clearTimeout(closeTimer);
      closeAllPanels();
      panel.classList.add('open');
      panel.setAttribute('aria-hidden','false');
      icon.classList.add('active');
    });
  });

  panels.forEach(panel => {
    panel.addEventListener('mouseenter', () => {
      clearTimeout(closeTimer);
      clearTimeout(openTimer);
      panel.classList.add('open');
      panel.setAttribute('aria-hidden','false');
    });
    panel.addEventListener('mouseleave', () => {
      closeTimer = setTimeout(() => {
        panel.classList.remove('open');
        panel.setAttribute('aria-hidden','true');
        const id = panel.id.replace(/^panel-/, '');
        const icon = document.querySelector(`.canva-icon[data-panel="${id}"], .canva-icon[data-tool="${id}"]`);
        if (icon) icon.classList.remove('active');
      }, CLOSE_DELAY);
    });
    panel.addEventListener('focusin', () => {
      clearTimeout(closeTimer);
      panel.classList.add('open');
      panel.setAttribute('aria-hidden','false');
    });
    panel.addEventListener('focusout', () => {
      setTimeout(() => {
        if (!panel.contains(document.activeElement)) {
          panel.classList.remove('open');
          panel.setAttribute('aria-hidden','true');
        }
      }, 10);
    });
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.canva-panel') && !e.target.closest('.canva-icon')) {
      closeAllPanels();
    }
  });

  closeAllPanels();
  chargerActu();
});
