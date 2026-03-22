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

// --- Handlers permanents pour boutons d'ajout
function insertTextBlockToCanvas(type) {
  if (!canvas) canvas = document.getElementById('actu-content');
  if (!canvas) return;
  const el = document.createElement(type === 'title' ? 'h2' : (type === 'subtitle' ? 'h3' : 'p'));
  el.textContent = type === 'title' ? 'Nouveau titre' : (type === 'subtitle' ? 'Nouveau sous-titre' : 'Nouveau paragraphe');
  el.style.margin = '12px 0';
  canvas.appendChild(el);
  return el;
}

function bindAddImageButton(btn) {
  if (!btn) return;
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.addEventListener('change', async () => {
      const file = input.files && input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const url = reader.result;
        // si addImageBlock est exportée et exposée
        if (typeof window.addImageBlock === 'function') {
          window.addImageBlock({ url, x: 120, y: 120, width: 320, height: 200 });
        } else {
          // fallback simple
          const div = document.createElement('div');
          div.className = 'block-public';
          div.style.position = 'absolute';
          div.style.left = '120px';
          div.style.top = '120px';
          div.style.width = '320px';
          div.style.height = '200px';
          const img = document.createElement('img');
          img.src = url;
          img.style.width = '100%';
          img.style.height = '100%';
          img.style.objectFit = 'contain';
          div.appendChild(img);
          (editorLayer || wrapper || document.body).appendChild(div);
        }
      };
      reader.readAsDataURL(file);
    });
    input.click();
  });
}

// dans DOMContentLoaded, après initialisation des variables
const btnImage = document.getElementById('add-image');
const btnTitle = document.getElementById('add-title');
const btnSubtitle = document.getElementById('add-subtitle');
const btnParagraph = document.getElementById('add-paragraph');

if (btnTitle) btnTitle.addEventListener('click', () => insertTextBlockToCanvas('title'));
if (btnSubtitle) btnSubtitle.addEventListener('click', () => insertTextBlockToCanvas('subtitle'));
if (btnParagraph) btnParagraph.addEventListener('click', () => insertTextBlockToCanvas('paragraph'));
bindAddImageButton(btnImage);

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
// --- Text blocks éditables, déplaçables et redimensionnables
function createTextBlock({ type = 'paragraph', x = 120, y = 120, width = 360, text = '' } = {}) {
  const block = document.createElement('div');
  block.className = 'block-public text-block';
  block.style.position = 'absolute';
  block.style.left = (typeof x === 'number' ? x + 'px' : x);
  block.style.top = (typeof y === 'number' ? y + 'px' : y);
  block.style.width = (typeof width === 'number' ? width + 'px' : width);
  block.style.minWidth = '80px';
  block.style.padding = '8px 10px';
  block.style.cursor = 'move';
  block.setAttribute('tabindex', '0');

  // contenu éditable
  const content = document.createElement(type === 'title' ? 'h2' : (type === 'subtitle' ? 'h3' : 'p'));
  content.className = 'text-block-content';
  content.contentEditable = 'true';
  content.spellcheck = false;
  content.innerText = text || (type === 'title' ? 'Titre' : (type === 'subtitle' ? 'Sous-titre' : 'Paragraphe'));
  content.style.margin = '0';
  content.style.outline = 'none';
  content.style.cursor = 'text';

  // poignée de redimensionnement
  const handle = document.createElement('div');
  handle.className = 'resize-handle bottom-right';

  block.appendChild(content);
  block.appendChild(handle);

  // interactions
  makeDraggable(block);
  makeResizable(block);
  makeSelectable(block);

  // focus editing on double click
  block.addEventListener('dblclick', (e) => {
    e.stopPropagation();
    content.focus();
    // place caret at end
    const range = document.createRange();
    range.selectNodeContents(content);
    range.collapse(false);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  });

  // prevent dragging while editing
  content.addEventListener('mousedown', (e) => e.stopPropagation());

  // append to editor layer
  const parent = editorLayer || wrapper || document.body;
  parent.appendChild(block);

  return { block, content };
}

// Attacher aux boutons existants (dans DOMContentLoaded)
const btnTitle = document.getElementById('add-title');
const btnSubtitle = document.getElementById('add-subtitle');
const btnParagraph = document.getElementById('add-paragraph');

if (btnTitle) btnTitle.addEventListener('click', (e) => { e.preventDefault(); createTextBlock({ type: 'title', x: 140, y: 140, width: 520 }); });
if (btnSubtitle) btnSubtitle.addEventListener('click', (e) => { e.preventDefault(); createTextBlock({ type: 'subtitle', x: 160, y: 160, width: 420 }); });
if (btnParagraph) btnParagraph.addEventListener('click', (e) => { e.preventDefault(); createTextBlock({ type: 'paragraph', x: 180, y: 180, width: 360 }); });

// Exposer utilitaire pour console ou autres modules
window.createTextBlock = createTextBlock;

  closeAllPanels();
  chargerActu();
});
