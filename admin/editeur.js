// editeur.js complet corrigé

// Robust supabase init — place this at the very top
(function(){
  if (window.__supabaseClient) {
    window.__supabaseClient = window.__supabaseClient;
  } else if (window.supabase) {
    window.__supabaseClient = window.supabase;
  } else {
    window.__supabaseClient = null;
  }
})();

let supabase = window.__supabaseClient || null;

let __supabaseReady = (async () => {
  if (supabase) return supabase;
  try {
    const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm");
    const SUPABASE_URL = "https://blronpowdhaumjudtgvn.supabase.co";
    const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJscm9ucG93ZGhhdW1qdWR0Z3ZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5ODU4MDAsImV4cCI6MjA4NDU2MTgwMH0.ThzU_Eqgwy0Qx2vTO381R0HHvV1jfhsAZFxY-Aw4hXI";
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    window.__supabaseClient = supabase;
    window.supabase = supabase;
    return supabase;
  } catch (err) {
    console.warn('supabase dynamic import failed:', err);
    return null;
  }
})();

// Logging
console.log('editeur.js loaded');

// DOM refs (initialized on DOMContentLoaded)
let wrapper = null;
let canvas = null;
let editorLayer = null;
let selectedBlock = null;

// Utilities: drag / resize / select
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

// addImageBlock: create image block inside editorLayer
function addImageBlock(data = {}) {
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

// createTextBlock: create editable text block inside editorLayer
function createTextBlock({ type = 'paragraph', x = 120, y = 120, width = 360, html = '' } = {}) {
  if (!editorLayer) editorLayer = document.getElementById('editor-layer');
  if (!editorLayer) {
    console.warn('createTextBlock: editorLayer introuvable');
    return null;
  }
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
  block.dataset.type = type;
  const content = document.createElement(type === 'title' ? 'h2' : (type === 'subtitle' ? 'h3' : 'p'));
  content.className = 'text-block-content';
  content.contentEditable = 'true';
  content.spellcheck = false;
  content.innerHTML = html || (type === 'title' ? 'Titre' : (type === 'subtitle' ? 'Sous-titre' : 'Paragraphe'));
  content.style.margin = '0';
  content.style.outline = 'none';
  content.style.cursor = 'text';
  const handle = document.createElement('div');
  handle.className = 'resize-handle bottom-right';
  block.appendChild(content);
  block.appendChild(handle);
  makeDraggable(block);
  makeResizable(block);
  makeSelectable(block);
  block.addEventListener('dblclick', (e) => {
    e.stopPropagation();
    content.focus();
    const range = document.createRange();
    range.selectNodeContents(content);
    range.collapse(false);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  });
  content.addEventListener('mousedown', (e) => e.stopPropagation());
  editorLayer.appendChild(block);
  return { block, content };
}

// Save function: serialize editorLayer blocks and preview HTML
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
  const texts = [...editorLayer.querySelectorAll('.block-public.text-block')].map(div => {
    const content = div.querySelector('.text-block-content');
    return {
      type: div.dataset.type || 'paragraph',
      html: content ? content.innerHTML : '',
      x: div.style.left || '0px',
      y: div.style.top || '0px',
      width: div.style.width || '',
      height: div.style.height || ''
    };
  });
  const images = [...editorLayer.querySelectorAll('.block-public')].filter(d => d.querySelector('img')).map(div => {
    const img = div.querySelector('img');
    return {
      url: img?.src || '',
      x: div.style.left || '0px',
      y: div.style.top || '0px',
      width: div.style.width || '',
      height: div.style.height || ''
    };
  });
  const previewHtml = canvas ? canvas.innerHTML : '';
  try {
    const params = new URLSearchParams(window.location.search);
    const actuId = Number(params.get("id"));
    if (!actuId || isNaN(actuId)) {
      alert("ID d'article invalide.");
      return;
    }
    const { error } = await client
      .from("actus")
      .update({ contenu: { previewHtml, texts, images } })
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

// Load article: rebuild preview and editorLayer blocks
async function chargerActu() {
  const client = await __supabaseReady;
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
    if (!actu) {
      if (canvas) canvas.innerHTML = "<h2>Article introuvable</h2>";
      return;
    }
    const previewHtml = actu.contenu?.previewHtml || actu.contenu?.texte || "";
    if (canvas) canvas.innerHTML = previewHtml;
    if (editorLayer) {
      editorLayer.innerHTML = '';
      const texts = Array.isArray(actu.contenu?.texts) ? actu.contenu.texts : [];
      texts.forEach(t => createTextBlock({ type: t.type, x: parseCssPx(t.x), y: parseCssPx(t.y), width: parseCssPx(t.width), html: t.html }));
      const images = Array.isArray(actu.contenu?.images) ? actu.contenu.images : [];
      images.forEach(img => {
        addImageBlock(img);
      });
    }
  } catch (err) {
    console.error('Erreur chargerActu:', err);
    if (canvas) canvas.innerHTML = "<h2>Erreur lors du chargement</h2>";
  }
}

function parseCssPx(val) {
  if (!val && val !== 0) return undefined;
  if (typeof val === 'number') return val;
  const m = String(val).match(/^(-?\d+(\.\d+)?)px$/);
  return m ? Number(m[1]) : val;
}

// DOM ready: attach handlers and panels
document.addEventListener("DOMContentLoaded", () => {
  wrapper = document.querySelector(".canvas-wrapper");
  canvas = document.getElementById("actu-content");
  editorLayer = document.getElementById("editor-layer");
  if (editorLayer) {
    Object.assign(editorLayer.style, { pointerEvents: 'auto', zIndex: '9999', position: 'absolute', top: '0', left: '0', right: '0', bottom: '0' });
  }
  // expose for debug and compatibility
  window.addImageBlock = addImageBlock;
  window.createTextBlock = createTextBlock;
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
  let openTimer = null, closeTimer = null;
  const OPEN_DELAY = 80, CLOSE_DELAY = 160;
  function closeAllPanels() { panels.forEach(p => { p.classList.remove('open'); p.setAttribute('aria-hidden','true'); }); icons.forEach(i => i.classList.remove('active')); }
  icons.forEach(icon => {
    const key = icon.dataset.panel || icon.dataset.tool;
    const panel = document.getElementById('panel-' + key);
    if (!panel) return;
    icon.addEventListener('mouseenter', () => { clearTimeout(closeTimer); openTimer = setTimeout(() => { closeAllPanels(); panel.classList.add('open'); panel.setAttribute('aria-hidden','false'); icon.classList.add('active'); }, OPEN_DELAY); });
    icon.addEventListener('mouseleave', () => { clearTimeout(openTimer); closeTimer = setTimeout(() => { if (!panel.matches(':hover')) { panel.classList.remove('open'); panel.setAttribute('aria-hidden','true'); icon.classList.remove('active'); } }, CLOSE_DELAY); });
    icon.addEventListener('click', (ev) => { ev.stopPropagation(); const isOpen = panel.classList.contains('open'); closeAllPanels(); if (!isOpen) { panel.classList.add('open'); panel.setAttribute('aria-hidden','false'); icon.classList.add('active'); } document.dispatchEvent(new CustomEvent('canva-tool', { detail: { tool: key } })); });
    icon.addEventListener('focus', () => { clearTimeout(closeTimer); closeAllPanels(); panel.classList.add('open'); panel.setAttribute('aria-hidden','false'); icon.classList.add('active'); });
  });
  panels.forEach(panel => {
    panel.addEventListener('mouseenter', () => { clearTimeout(closeTimer); clearTimeout(openTimer); panel.classList.add('open'); panel.setAttribute('aria-hidden','false'); });
    panel.addEventListener('mouseleave', () => { closeTimer = setTimeout(() => { panel.classList.remove('open'); panel.setAttribute('aria-hidden','true'); const id = panel.id.replace(/^panel-/, ''); const icon = document.querySelector(`.canva-icon[data-panel="${id}"], .canva-icon[data-tool="${id}"]`); if (icon) icon.classList.remove('active'); }, CLOSE_DELAY); });
    panel.addEventListener('focusin', () => { clearTimeout(closeTimer); panel.classList.add('open'); panel.setAttribute('aria-hidden','false'); });
    panel.addEventListener('focusout', () => { setTimeout(() => { if (!panel.contains(document.activeElement)) { panel.classList.remove('open'); panel.setAttribute('aria-hidden','true'); } }, 10); });
  });
  document.addEventListener('click', (e) => { if (!e.target.closest('.canva-panel') && !e.target.closest('.canva-icon')) closeAllPanels(); });
  // attach add buttons
  const btnImage = document.getElementById('add-image');
  const btnTitle = document.getElementById('add-title');
  const btnSubtitle = document.getElementById('add-subtitle');
  const btnParagraph = document.getElementById('add-paragraph');
  if (btnTitle) btnTitle.addEventListener('click', (e) => { e.preventDefault(); createTextBlock({ type: 'title', x: 140, y: 140, width: 520 }); });
  if (btnSubtitle) btnSubtitle.addEventListener('click', (e) => { e.preventDefault(); createTextBlock({ type: 'subtitle', x: 160, y: 160, width: 420 }); });
  if (btnParagraph) btnParagraph.addEventListener('click', (e) => { e.preventDefault(); createTextBlock({ type: 'paragraph', x: 180, y: 180, width: 360 }); });
  if (btnImage) {
    btnImage.addEventListener('click', (e) => {
      e.preventDefault();
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.addEventListener('change', () => {
        const file = input.files && input.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          const url = reader.result;
          addImageBlock({ url, x: 120, y: 120, width: 320, height: 200 });
        };
        reader.readAsDataURL(file);
      });
      input.click();
    });
  }

  // ---------- Format toolbar handlers (à placer dans DOMContentLoaded) ----------
(function attachFormatToolbarHandlers() {
  const ftFont = document.getElementById('ft-font');
  const ftSize = document.getElementById('ft-size');
  const ftBold = document.getElementById('ft-bold');
  const ftItalic = document.getElementById('ft-italic');
  const ftUnderline = document.getElementById('ft-underline');
  const ftColor = document.getElementById('ft-color');
  const ftAlignLeft = document.getElementById('ft-align-left');
  const ftAlignCenter = document.getElementById('ft-align-center');
  const ftAlignRight = document.getElementById('ft-align-right');
  const ftLineheight = document.getElementById('ft-lineheight');
  const ftSendFront = document.getElementById('ft-send-front');
  const ftSendBack = document.getElementById('ft-send-back');

  if (!ftFont) return; // toolbar non présente

  function applyInlineStyleToBlock(block, cssObj) {
    const content = block.querySelector('.text-block-content') || block;
    Object.keys(cssObj).forEach(k => content.style[k] = cssObj[k]);
  }

  function applyStyleToSelectionOrBlock(styleFn) {
    if (selectedBlock && selectedBlock.classList.contains('text-block')) {
      styleFn(selectedBlock);
      return;
    }
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    // try to wrap selection in a span
    const span = document.createElement('span');
    styleFn(span);
    try {
      range.surroundContents(span);
      sel.removeAllRanges();
      const newRange = document.createRange();
      newRange.selectNodeContents(span);
      sel.addRange(newRange);
    } catch (e) {
      // fallback: use document.execCommand for basic formatting
      if (span.style.fontWeight) document.execCommand('bold');
      if (span.style.fontStyle) document.execCommand('italic');
      if (span.style.textDecoration) document.execCommand('underline');
      if (span.style.color) document.execCommand('foreColor', false, span.style.color);
      if (span.style.fontSize) {
        // execCommand fontSize uses 1-7; approximate by wrapping span
        const wrapper = document.createElement('span');
        wrapper.style.fontSize = span.style.fontSize;
        try { range.surroundContents(wrapper); } catch(e2) { console.warn('fontSize fallback failed', e2); }
      }
    }
  }

  // update toolbar state from selectedBlock
  function updateToolbarState() {
    if (selectedBlock && selectedBlock.classList.contains('text-block')) {
      const content = selectedBlock.querySelector('.text-block-content');
      if (!content) return;
      ftFont.value = window.getComputedStyle(content).fontFamily || ftFont.value;
      ftSize.value = window.getComputedStyle(content).fontSize || ftSize.value;
      const lh = window.getComputedStyle(content).lineHeight;
      ftLineheight.value = lh && lh !== 'normal' ? lh : ftLineheight.value;
      const color = window.getComputedStyle(content).color;
      if (color) {
        const m = color.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (m) ftColor.value = "#" + [1,2,3].map(i => parseInt(m[i]).toString(16).padStart(2,'0')).join('');
      }
    }
  }
/* editeur.js — fichier consolidé prêt à coller */

/* ---------------- Robust supabase init — place this at the very top ---------------- */
(function(){
  if (window.__supabaseClient) {
    window.__supabaseClient = window.__supabaseClient;
  } else if (window.supabase) {
    window.__supabaseClient = window.supabase;
  } else {
    window.__supabaseClient = null;
  }
})();

let supabase = window.__supabaseClient || null;

let __supabaseReady = (async () => {
  if (supabase) return supabase;
  try {
    const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm");
    const SUPABASE_URL = "https://blronpowdhaumjudtgvn.supabase.co";
    const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJscm9ucG93ZGhhdW1qdWR0Z3ZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5ODU4MDAsImV4cCI6MjA4NDU2MTgwMH0.ThzU_Eqgwy0Qx2vTO381R0HHvV1jfhsAZFxY-Aw4hXI";
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    window.__supabaseClient = supabase;
    window.supabase = supabase;
    return supabase;
  } catch (err) {
    console.warn('supabase dynamic import failed:', err);
    return null;
  }
})();

/* ---------------- Logging ---------------- */
console.log('editeur.js loaded');

/* ---------------- DOM refs (initialized on DOMContentLoaded) ---------------- */
let wrapper = null;
let canvas = null;
let editorLayer = null;
let selectedBlock = null;

/* ---------------- Utilities ---------------- */
function parseCssPx(val) {
  if (!val && val !== 0) return undefined;
  if (typeof val === 'number') return val;
  const m = String(val).match(/^(-?\d+(\.\d+)?)px$/);
  return m ? Number(m[1]) : val;
}

function applyInlineStyleToBlock(block, cssObj) {
  const content = block.querySelector('.text-block-content') || block;
  Object.keys(cssObj).forEach(k => {
    content.style[k] = cssObj[k];
  });
}

function rgbToHex(rgb) {
  if (!rgb) return null;
  const m = rgb.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return null;
  return "#" + [1,2,3].map(i => parseInt(m[i]).toString(16).padStart(2,'0')).join('');
}

/* ---------------- Selection / block helpers ---------------- */
function selectBlock(el) {
  document.querySelectorAll(".block-public").forEach(b => b.classList.remove("selected"));
  if (el) el.classList.add("selected");
  selectedBlock = el;
}

/* Expose helper for debug if needed */
window.__editorHelpers = {
  setSelectedBlock: (el) => { selectBlock(el); },
  getSelectedBlock: () => selectedBlock
};

/* ---------------- Draggable / Resizable / Selectable ---------------- */
function makeDraggable(el) {
  let offsetX = 0, offsetY = 0;
  el.addEventListener("mousedown", e => {
    if (e.button !== 0) return;
    if (e.target.classList && e.target.classList.contains("resize-handle")) return;
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
  // if a handle already exists, don't duplicate
  if (el.querySelector('.resize-handle.bottom-right')) return;
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

/* ---------------- Blocks creation ---------------- */
function addImageBlock(data = {}) {
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

function createTextBlock({ type = 'paragraph', x = 120, y = 120, width = 360, html = '' } = {}) {
  if (!editorLayer) editorLayer = document.getElementById('editor-layer');
  if (!editorLayer) {
    console.warn('createTextBlock: editorLayer introuvable');
    return null;
  }
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
  block.dataset.type = type;
  const content = document.createElement(type === 'title' ? 'h2' : (type === 'subtitle' ? 'h3' : 'p'));
  content.className = 'text-block-content';
  content.contentEditable = 'true';
  content.spellcheck = false;
  content.innerHTML = html || (type === 'title' ? 'Titre' : (type === 'subtitle' ? 'Sous-titre' : 'Paragraphe'));
  content.style.margin = '0';
  content.style.outline = 'none';
  content.style.cursor = 'text';
  const handle = document.createElement('div');
  handle.className = 'resize-handle bottom-right';
  block.appendChild(content);
  block.appendChild(handle);
  makeDraggable(block);
  makeResizable(block);
  makeSelectable(block);
  block.addEventListener('dblclick', (e) => {
    e.stopPropagation();
    content.focus();
    const range = document.createRange();
    range.selectNodeContents(content);
    range.collapse(false);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  });
  content.addEventListener('mousedown', (e) => e.stopPropagation());
  editorLayer.appendChild(block);
  return { block, content };
}

/* ---------------- Save function: serialize editorLayer blocks and preview HTML ---------------- */
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
  const texts = [...editorLayer.querySelectorAll('.block-public.text-block')].map(div => {
    const content = div.querySelector('.text-block-content');
    return {
      type: div.dataset.type || 'paragraph',
      html: content ? content.innerHTML : '',
      x: parseCssPx(div.style.left) ?? div.style.left || '0px',
      y: parseCssPx(div.style.top) ?? div.style.top || '0px',
      width: parseCssPx(div.style.width) ?? div.style.width || '',
      height: parseCssPx(div.style.height) ?? div.style.height || ''
    };
  });
  const images = [...editorLayer.querySelectorAll('.block-public')].filter(d => d.querySelector('img')).map(div => {
    const img = div.querySelector('img');
    return {
      url: img?.src || '',
      x: parseCssPx(div.style.left) ?? div.style.left || '0px',
      y: parseCssPx(div.style.top) ?? div.style.top || '0px',
      width: parseCssPx(div.style.width) ?? div.style.width || '',
      height: parseCssPx(div.style.height) ?? div.style.height || ''
    };
  });
  const previewHtml = canvas ? canvas.innerHTML : '';
  try {
    const params = new URLSearchParams(window.location.search);
    const actuId = Number(params.get("id"));
    if (!actuId || isNaN(actuId)) {
      alert("ID d'article invalide.");
      return;
    }
    const { error } = await client
      .from("actus")
      .update({ contenu: { previewHtml, texts, images } })
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

/* ---------------- DOM ready: attach handlers and panels ---------------- */
document.addEventListener("DOMContentLoaded", () => {
  wrapper = document.querySelector(".canvas-wrapper");
  canvas = document.getElementById("actu-content");
  editorLayer = document.getElementById("editor-layer");
  if (editorLayer) {
    Object.assign(editorLayer.style, { pointerEvents: 'auto', zIndex: '9999', position: 'absolute', top: '0', left: '0', right: '0', bottom: '0' });
  }

  // expose for debug and compatibility
  window.addImageBlock = addImageBlock;
  window.createTextBlock = createTextBlock;
  window.sauvegarder = sauvegarder;
  window.__supabaseReady = __supabaseReady;

  // save button fallback (old button)
  const saveBtn = document.getElementById("save-btn");
  if (saveBtn) saveBtn.addEventListener("click", (e) => { e.preventDefault(); sauvegarder(); });

  // deselect on outside click
  document.addEventListener("click", (e) => {
    if (!e.target.closest('.block-public')) {
      document.querySelectorAll(".block-public").forEach(b => b.classList.remove("selected"));
      selectedBlock = null;
    }
  });

  // panels (icons / hover / click)
  const icons = Array.from(document.querySelectorAll('.canva-icon'));
  const panels = Array.from(document.querySelectorAll('.canva-panel'));
  let openTimer = null, closeTimer = null;
  const OPEN_DELAY = 80, CLOSE_DELAY = 160;
  function closeAllPanels() { panels.forEach(p => { p.classList.remove('open'); p.setAttribute('aria-hidden','true'); }); icons.forEach(i => i.classList.remove('active')); }
  icons.forEach(icon => {
    const key = icon.dataset.panel || icon.dataset.tool;
    const panel = document.getElementById('panel-' + key);
    if (!panel) return;
    icon.addEventListener('mouseenter', () => { clearTimeout(closeTimer); openTimer = setTimeout(() => { closeAllPanels(); panel.classList.add('open'); panel.setAttribute('aria-hidden','false'); icon.classList.add('active'); }, OPEN_DELAY); });
    icon.addEventListener('mouseleave', () => { clearTimeout(openTimer); closeTimer = setTimeout(() => { if (!panel.matches(':hover')) { panel.classList.remove('open'); panel.setAttribute('aria-hidden','true'); icon.classList.remove('active'); } }, CLOSE_DELAY); });
    icon.addEventListener('click', (ev) => { ev.stopPropagation(); const isOpen = panel.classList.contains('open'); closeAllPanels(); if (!isOpen) { panel.classList.add('open'); panel.setAttribute('aria-hidden','false'); icon.classList.add('active'); } document.dispatchEvent(new CustomEvent('canva-tool', { detail: { tool: key } })); });
    icon.addEventListener('focus', () => { clearTimeout(closeTimer); closeAllPanels(); panel.classList.add('open'); panel.setAttribute('aria-hidden','false'); icon.classList.add('active'); });
  });
  panels.forEach(panel => {
    panel.addEventListener('mouseenter', () => { clearTimeout(closeTimer); clearTimeout(openTimer); panel.classList.add('open'); panel.setAttribute('aria-hidden','false'); });
    panel.addEventListener('mouseleave', () => { closeTimer = setTimeout(() => { panel.classList.remove('open'); panel.setAttribute('aria-hidden','true'); const id = panel.id.replace(/^panel-/, ''); const icon = document.querySelector(`.canva-icon[data-panel="${id}"], .canva-icon[data-tool="${id}"]`); if (icon) icon.classList.remove('active'); }, CLOSE_DELAY); });
    panel.addEventListener('focusin', () => { clearTimeout(closeTimer); panel.classList.add('open'); panel.setAttribute('aria-hidden','false'); });
    panel.addEventListener('focusout', () => { setTimeout(() => { if (!panel.contains(document.activeElement)) { panel.classList.remove('open'); panel.setAttribute('aria-hidden','true'); } }, 10); });
  });
  document.addEventListener('click', (e) => { if (!e.target.closest('.canva-panel') && !e.target.closest('.canva-icon')) closeAllPanels(); });

  // attach add buttons
  const btnImage = document.getElementById('add-image');
  const btnTitle = document.getElementById('add-title');
  const btnSubtitle = document.getElementById('add-subtitle');
  const btnParagraph = document.getElementById('add-paragraph');
  if (btnTitle) btnTitle.addEventListener('click', (e) => { e.preventDefault(); createTextBlock({ type: 'title', x: 140, y: 140, width: 520 }); });
  if (btnSubtitle) btnSubtitle.addEventListener('click', (e) => { e.preventDefault(); createTextBlock({ type: 'subtitle', x: 160, y: 160, width: 420 }); });
  if (btnParagraph) btnParagraph.addEventListener('click', (e) => { e.preventDefault(); createTextBlock({ type: 'paragraph', x: 180, y: 180, width: 360 }); });
  if (btnImage) {
    btnImage.addEventListener('click', (e) => {
      e.preventDefault();
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.addEventListener('change', () => {
        const file = input.files && input.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          const url = reader.result;
          addImageBlock({ url, x: 120, y: 120, width: 320, height: 200 });
        };
        reader.readAsDataURL(file);
      });
      input.click();
    });
  }

  // Initialize format toolbar handlers (if toolbar exists)
  initFormatToolbarHandlers();

  // hide old save button if present (optional)
  const oldSave = document.getElementById('save-btn');
  if (oldSave) oldSave.classList.add('hide-secondary');

  // force initial sync
  setTimeout(syncEditorLayerToCanvas, 80);

  // call closeAllPanels and chargerActu if available
  try { closeAllPanels(); } catch(e) {}
  if (typeof chargerActu === 'function') {
    try { chargerActu(); } catch(e) { console.warn('chargerActu() error on initial call', e); }
  }
});

/* ---------------- Format toolbar handlers (definition) ---------------- */
function initFormatToolbarHandlers() {
  const ftFont = document.getElementById('ft-font');
  const ftSize = document.getElementById('ft-size');
  const ftBold = document.getElementById('ft-bold');
  const ftItalic = document.getElementById('ft-italic');
  const ftUnderline = document.getElementById('ft-underline');
  const ftColor = document.getElementById('ft-color');
  const ftAlignLeft = document.getElementById('ft-align-left');
  const ftAlignCenter = document.getElementById('ft-align-center');
  const ftAlignRight = document.getElementById('ft-align-right');
  const ftLineheight = document.getElementById('ft-lineheight');
  const ftSendFront = document.getElementById('ft-send-front');
  const ftSendBack = document.getElementById('ft-send-back');

  if (!ftFont) return; // toolbar not present

  function applyStyleToSelectionOrBlock(styleFn) {
    if (selectedBlock && selectedBlock.classList && selectedBlock.classList.contains('text-block')) {
      styleFn(selectedBlock);
      return;
    }
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    const span = document.createElement('span');
    styleFn(span);
    try {
      range.surroundContents(span);
      sel.removeAllRanges();
      const newRange = document.createRange();
      newRange.selectNodeContents(span);
      sel.addRange(newRange);
    } catch (e) {
      // fallback: execCommand for basic formatting
      try {
        if (span.style.fontWeight) document.execCommand('bold');
        if (span.style.fontStyle) document.execCommand('italic');
        if (span.style.textDecoration && span.style.textDecoration.includes('underline')) document.execCommand('underline');
        if (span.style.color) document.execCommand('foreColor', false, span.style.color);
        if (span.style.fontSize) {
          const wrapper = document.createElement('span');
          wrapper.style.fontSize = span.style.fontSize;
          try { range.surroundContents(wrapper); } catch(e2) { console.warn('fontSize fallback failed', e2); }
        }
      } catch (e2) {
        console.warn('Fallback formatting failed', e2);
      }
    }
  }

  function applyInlineStyleToBlockLocal(block, cssObj) {
    const content = block.querySelector('.text-block-content') || block;
    Object.keys(cssObj).forEach(k => content.style[k] = cssObj[k]);
  }

  // handlers
  ftFont.addEventListener('change', () => {
    applyStyleToSelectionOrBlock(el => {
      if (el.classList && el.classList.contains('text-block')) applyInlineStyleToBlockLocal(el, { fontFamily: ftFont.value });
      else el.style.fontFamily = ftFont.value;
    });
  });

  ftSize.addEventListener('change', () => {
    applyStyleToSelectionOrBlock(el => {
      if (el.classList && el.classList.contains('text-block')) applyInlineStyleToBlockLocal(el, { fontSize: ftSize.value });
      else el.style.fontSize = ftSize.value;
    });
  });

  ftBold.addEventListener('click', () => {
    const pressed = ftBold.getAttribute('aria-pressed') === 'true';
    ftBold.setAttribute('aria-pressed', String(!pressed));
    applyStyleToSelectionOrBlock(el => {
      if (el.classList && el.classList.contains('text-block')) applyInlineStyleToBlockLocal(el, { fontWeight: !pressed ? '700' : '400' });
      else el.style.fontWeight = !pressed ? '700' : '400';
    });
  });

  ftItalic.addEventListener('click', () => {
    const pressed = ftItalic.getAttribute('aria-pressed') === 'true';
    ftItalic.setAttribute('aria-pressed', String(!pressed));
    applyStyleToSelectionOrBlock(el => {
      if (el.classList && el.classList.contains('text-block')) applyInlineStyleToBlockLocal(el, { fontStyle: !pressed ? 'italic' : 'normal' });
      else el.style.fontStyle = !pressed ? 'italic' : 'normal';
    });
  });

  ftUnderline.addEventListener('click', () => {
    const pressed = ftUnderline.getAttribute('aria-pressed') === 'true';
    ftUnderline.setAttribute('aria-pressed', String(!pressed));
    applyStyleToSelectionOrBlock(el => {
      if (el.classList && el.classList.contains('text-block')) applyInlineStyleToBlockLocal(el, { textDecoration: !pressed ? 'underline' : 'none' });
      else el.style.textDecoration = !pressed ? 'underline' : 'none';
    });
  });

  ftColor.addEventListener('input', () => {
    const color = ftColor.value;
    applyStyleToSelectionOrBlock(el => {
      if (el.classList && el.classList.contains('text-block')) applyInlineStyleToBlockLocal(el, { color });
      else el.style.color = color;
    });
  });

  ftAlignLeft.addEventListener('click', () => { if (selectedBlock) applyInlineStyleToBlockLocal(selectedBlock, { textAlign: 'left' }); });
  ftAlignCenter.addEventListener('click', () => { if (selectedBlock) applyInlineStyleToBlockLocal(selectedBlock, { textAlign: 'center' }); });
  ftAlignRight.addEventListener('click', () => { if (selectedBlock) applyInlineStyleToBlockLocal(selectedBlock, { textAlign: 'right' }); });

  ftLineheight.addEventListener('change', () => { if (selectedBlock) applyInlineStyleToBlockLocal(selectedBlock, { lineHeight: ftLineheight.value }); });

  ftSendFront.addEventListener('click', () => {
    if (!selectedBlock) return;
    selectedBlock.style.zIndex = (parseInt(selectedBlock.style.zIndex || 10) + 10).toString();
  });
  ftSendBack.addEventListener('click', () => {
    if (!selectedBlock) return;
    selectedBlock.style.zIndex = Math.max(0, (parseInt(selectedBlock.style.zIndex || 10) - 10)).toString();
  });

  // update toolbar when selection or block changes
  document.addEventListener('selectionchange', updateToolbarState);
  document.addEventListener('click', updateToolbarState);
}

/* ---------------- sync editor layer ---------------- */
function syncEditorLayerToCanvas() {
  const wrapperEl = document.querySelector('.canvas-wrapper');
  const canvasEl = document.querySelector('.canvas');
  const editorLayerEl = document.getElementById('editor-layer');
  if (!wrapperEl || !canvasEl || !editorLayerEl) return;

  const canvasRect = canvasEl.getBoundingClientRect();
  const wrapperRect = wrapperEl.getBoundingClientRect();

  const left = canvasRect.left - wrapperRect.left;
  const top = canvasRect.top - wrapperRect.top;

  editorLayerEl.style.left = left + 'px';
  editorLayerEl.style.top = top + 'px';
  editorLayerEl.style.width = canvasRect.width + 'px';
  editorLayerEl.style.height = canvasRect.height + 'px';
}

window.addEventListener('load', syncEditorLayerToCanvas);
window.addEventListener('resize', () => {
  clearTimeout(window.__syncEditorTimer);
  window.__syncEditorTimer = setTimeout(syncEditorLayerToCanvas, 120);
});
document.addEventListener('canva-sync', syncEditorLayerToCanvas);

/* ---------------- position helpers ---------------- */
function getRelativePosToCanvas(el) {
  const canvasEl = document.querySelector('.canvas');
  if (!canvasEl) return { x: 0, y: 0, width: el.offsetWidth, height: el.offsetHeight };
  const canvasRect = canvasEl.getBoundingClientRect();
  const elRect = el.getBoundingClientRect();
  return {
    x: Math.round(elRect.left - canvasRect.left),
    y: Math.round(elRect.top - canvasRect.top),
    width: el.offsetWidth,
    height: el.offsetHeight
  };
}

function applyRelativePosToBlock(div, pos) {
  div.style.left = (typeof pos.x === 'number' ? pos.x + 'px' : (pos.x || '0px'));
  div.style.top = (typeof pos.y === 'number' ? pos.y + 'px' : (pos.y || '0px'));
  if (pos.width) div.style.width = (typeof pos.width === 'number' ? pos.width + 'px' : pos.width);
  if (pos.height) div.style.height = (typeof pos.height === 'number' ? pos.height + 'px' : pos.height);
}

/* ---------------- Handler Enregistrer (boutons) ---------------- */

// s'assurer que la fonction est bien exposée
if (typeof window.sauvegarder !== "function") {
  window.sauvegarder = sauvegarder;
}

// câblage direct des boutons une fois le DOM prêt
document.addEventListener('DOMContentLoaded', () => {
  const topBtn = document.getElementById('save-btn-top');
  const oldBtn = document.getElementById('save-btn');

  async function handleSaveClick(e, btn) {
    e.preventDefault();
    if (!btn || btn.disabled) return;

    btn.disabled = true;
    const originalHTML = btn.innerHTML;

    try {
      btn.innerHTML = 'Enregistrement…';
      if (typeof window.sauvegarder === 'function') {
        await window.sauvegarder();
        btn.innerHTML = 'Enregistré';
        setTimeout(() => { try { btn.innerHTML = originalHTML; } catch {} }, 1100);
      } else {
        console.warn('window.sauvegarder non dispo');
        alert('Fonction de sauvegarde indisponible.');
        btn.innerHTML = originalHTML;
      }
    } catch (err) {
      console.error('Erreur lors de la sauvegarde:', err);
      alert('Erreur lors de l’enregistrement. Voir console.');
      btn.innerHTML = originalHTML;
    } finally {
      btn.disabled = false;
    }
  }

  if (topBtn) {
    topBtn.addEventListener('click', (e) => handleSaveClick(e, topBtn));
  }

  if (oldBtn) {
    oldBtn.addEventListener('click', (e) => handleSaveClick(e, oldBtn));
    // si tu veux le masquer :
    // oldBtn.classList.add('hide-secondary');
  }
});


/* ---------------- Ensure sync after load / chargerActu ---------------- */
(async function ensureSyncAfterLoad() {
  try {
    if (typeof chargerActu === 'function') {
      const maybePromise = chargerActu();
      if (maybePromise && typeof maybePromise.then === 'function') {
        await maybePromise;
      }
    }
  } catch (e) {
    console.warn('chargerActu() a levé une erreur lors du premier appel', e);
  } finally {
    if (typeof syncEditorLayerToCanvas === 'function') {
      syncEditorLayerToCanvas();
    } else {
      document.dispatchEvent(new Event('canva-sync'));
    }
  }
})();

/* ---------------- MutationObserver for dynamic DOM (toolbar updates) ---------------- */
let toolbarObserver = null;
if (typeof MutationObserver !== 'undefined') {
  toolbarObserver = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.addedNodes && m.addedNodes.length) {
        if (typeof updateToolbarState === 'function') updateToolbarState();
      }
    }
  });
  try { toolbarObserver.observe(document.body, { childList: true, subtree: true }); } catch(e) { /* ignore */ }
}

/* ---------------- End of file ---------------- */

