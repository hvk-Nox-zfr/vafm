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
}); // ferme la fonction fléchée et l'appel addEventListener


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

  if (!ftFont) return;

// editeur-clean.js
(function () {
  'use strict';

  function $(sel, root = document) { return root.querySelector(sel); }
  function $all(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  let wrapper = null;
  let canvas = null;
  let editorLayer = null;
  let selectedBlock = null;

  function applyInlineStyleToBlock(block, cssObj) {
    const content = block.querySelector('.text-block-content') || block;
    Object.keys(cssObj).forEach(k => content.style[k] = cssObj[k]);
  }

  function applyStyleToSelectionOrBlock(cssObj) {
    if (selectedBlock && selectedBlock.classList.contains('text-block')) {
      applyInlineStyleToBlock(selectedBlock, cssObj);
      return;
    }
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    const span = document.createElement('span');
    Object.assign(span.style, cssObj);
    try {
      range.surroundContents(span);
      sel.removeAllRanges();
      const newRange = document.createRange();
      newRange.selectNodeContents(span);
      sel.addRange(newRange);
    } catch (e) {
      if (cssObj.fontWeight === 'bold') document.execCommand('bold');
      if (cssObj.fontStyle === 'italic') document.execCommand('italic');
      if (cssObj.textDecoration === 'underline') document.execCommand('underline');
      if (cssObj.color) document.execCommand('foreColor', false, cssObj.color);
      if (cssObj.fontSize) {
        const wrapper = document.createElement('span');
        wrapper.style.fontSize = cssObj.fontSize;
        try { range.surroundContents(wrapper); } catch (e2) {}
      }
    }
  }

  function attachFormatToolbarHandlers() {
    const ftFont = $('#ft-font');
    if (!ftFont) return;
    const ftSize = $('#ft-size');
    const ftBold = $('#ft-bold');
    const ftItalic = $('#ft-italic');
    const ftUnderline = $('#ft-underline');
    const ftColor = $('#ft-color');
    const ftAlignLeft = $('#ft-align-left');
    const ftAlignCenter = $('#ft-align-center');
    const ftAlignRight = $('#ft-align-right');
    const ftLineheight = $('#ft-lineheight');
    const ftSendFront = $('#ft-send-front');
    const ftSendBack = $('#ft-send-back');

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
          if (m) {
            ftColor.value = "#" + [1,2,3].map(i =>
              parseInt(m[i]).toString(16).padStart(2,'0')
            ).join('');
          }
        }
      }
    }

    ftFont.addEventListener('change', () => applyStyleToSelectionOrBlock({ fontFamily: ftFont.value }));
    if (ftSize) ftSize.addEventListener('change', () => applyStyleToSelectionOrBlock({ fontSize: ftSize.value }));
    if (ftBold) ftBold.addEventListener('click', () => applyStyleToSelectionOrBlock({ fontWeight: 'bold' }));
    if (ftItalic) ftItalic.addEventListener('click', () => applyStyleToSelectionOrBlock({ fontStyle: 'italic' }));
    if (ftUnderline) ftUnderline.addEventListener('click', () => applyStyleToSelectionOrBlock({ textDecoration: 'underline' }));
    if (ftColor) ftColor.addEventListener('change', () => applyStyleToSelectionOrBlock({ color: ftColor.value }));
    if (ftAlignLeft) ftAlignLeft.addEventListener('click', () => applyStyleToSelectionOrBlock({ textAlign: 'left' }));
    if (ftAlignCenter) ftAlignCenter.addEventListener('click', () => applyStyleToSelectionOrBlock({ textAlign: 'center' }));
    if (ftAlignRight) ftAlignRight.addEventListener('click', () => applyStyleToSelectionOrBlock({ textAlign: 'right' }));
    if (ftLineheight) ftLineheight.addEventListener('change', () => applyStyleToSelectionOrBlock({ lineHeight: ftLineheight.value }));

    if (ftSendFront) ftSendFront.addEventListener('click', () => {
      if (!selectedBlock) return;
      selectedBlock.style.zIndex = (parseInt(selectedBlock.style.zIndex || 1) + 1000).toString();
    });
    if (ftSendBack) ftSendBack.addEventListener('click', () => {
      if (!selectedBlock) return;
      selectedBlock.style.zIndex = (parseInt(selectedBlock.style.zIndex || 1) - 1000).toString();
    });

    document.addEventListener('selectionchange', updateToolbarState);
  }

  function createTextBlock(opts = {}) {
    const { type = 'paragraph', x = 100, y = 100, width = 300, text = '' } = opts;
    const block = document.createElement('div');
    block.className = 'text-block block-public';
    block.style.position = 'absolute';
    block.style.left = x + 'px';
    block.style.top = y + 'px';
    block.style.width = width + 'px';
    block.style.zIndex = '10';
    block.setAttribute('tabindex', '0');

    const content = document.createElement('div');
    content.className = 'text-block-content';
    content.contentEditable = 'true';
    content.innerHTML = text || (type === 'title' ? 'Titre' : type === 'subtitle' ? 'Sous-titre' : 'Paragraphe');
    content.style.minHeight = '24px';
    content.style.cursor = 'text';
    block.appendChild(content);

    const handle = document.createElement('div');
    handle.className = 'text-block-handle';
    handle.style.position = 'absolute';
    handle.style.right = '6px';
    handle.style.top = '6px';
    handle.style.width = '12px';
    handle.style.height = '12px';
    handle.style.borderRadius = '2px';
    handle.style.background = 'rgba(0,0,0,0.2)';
    handle.style.cursor = 'grab';
    block.appendChild(handle);

    attachBlockEvents(block, handle, content);
    (editorLayer || wrapper || document.body).appendChild(block);
    return block;
  }

  function attachBlockEvents(block, handle, content) {
    block.addEventListener('mousedown', (ev) => {
      if (ev.button !== 0) return;
      selectBlock(block);
    });
    block.addEventListener('focus', () => selectBlock(block));

    let dragging = false;
    let startX = 0, startY = 0;
    let origLeft = 0, origTop = 0;
    let offsetX = 0, offsetY = 0;
    const DRAG_THRESHOLD = 6;

    function onPointerDown(ev) {
      const isTouch = ev.type === 'touchstart';
      const p = isTouch ? ev.touches[0] : ev;
      const targetIsContent = p.target && (p.target === content || content.contains(p.target));
      if (!handle.contains(p.target) && targetIsContent) {
        return;
      }
      ev.preventDefault && ev.preventDefault();

      dragging = false;
      startX = p.clientX;
      startY = p.clientY;
      const rect = block.getBoundingClientRect();
      origLeft = rect.left + window.scrollX;
      origTop = rect.top + window.scrollY;
      offsetX = startX - origLeft;
      offsetY = startY - origTop;

      function onPointerMove(e) {
        const q = e.type.startsWith('touch') ? (e.touches[0] || e.changedTouches[0]) : e;
        const dx = q.clientX - startX;
        const dy = q.clientY - startY;
        if (!dragging) {
          if (Math.hypot(dx, dy) >= DRAG_THRESHOLD) {
            dragging = true;
            block.classList.add('dragging');
            block.style.position = 'absolute';
            block.style.left = origLeft + 'px';
            block.style.top = origTop + 'px';
            block.style.margin = '0';
            block.style.transform = 'none';
            block.dataset._zBefore = block.style.zIndex || '10';
            block.style.zIndex = '9999';
          } else {
            return;
          }
        }
        const newLeft = q.clientX - offsetX + window.scrollX;
        const newTop = q.clientY - offsetY + window.scrollY;

        if (wrapper) {
          const wrapRect = wrapper.getBoundingClientRect();
          const bRect = block.getBoundingClientRect();
          const minLeft = wrapRect.left + window.scrollX;
          const minTop = wrapRect.top + window.scrollY;
          const maxLeft = wrapRect.left + window.scrollX + wrapRect.width - bRect.width;
          const maxTop = wrapRect.top + window.scrollY + wrapRect.height - bRect.height;
          block.style.left = clamp(newLeft, minLeft, maxLeft) + 'px';
          block.style.top = clamp(newTop, minTop, maxTop) + 'px';
        } else {
          block.style.left = newLeft + 'px';
          block.style.top = newTop + 'px';
        }
      }

      function onPointerUp(e) {
        window.removeEventListener('mousemove', onPointerMove);
        window.removeEventListener('mouseup', onPointerUp);
        window.removeEventListener('touchmove', onPointerMove);
        window.removeEventListener('touchend', onPointerUp);
        if (dragging) {
          dragging = false;
          block.classList.remove('dragging');
          block.style.zIndex = block.dataset._zBefore || '10';
          delete block.dataset._zBefore;
          document.dispatchEvent(new CustomEvent('block-moved', { detail: { block } }));
        }
      }

      window.addEventListener('mousemove', onPointerMove);
      window.addEventListener('mouseup', onPointerUp);
      window.addEventListener('touchmove', onPointerMove, { passive: false });
      window.addEventListener('touchend', onPointerUp);
    }

    handle.addEventListener('mousedown', onPointerDown);
    handle.addEventListener('touchstart', onPointerDown, { passive: false });

    block.addEventListener('dblclick', () => {
      const c = block.querySelector('.text-block-content');
      if (c) {
        c.focus();
        const range = document.createRange();
        range.selectNodeContents(c);
        range.collapse(false);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      }
    });
  }

  function selectBlock(block) {
    $all('.block-public.selected').forEach(b => b.classList.remove('selected'));
    if (!block) {
      selectedBlock = null;
      return;
    }
    block.classList.add('selected');
    selectedBlock = block;
    document.dispatchEvent(new Event('selectionchange'));
  }

  function init() {
    wrapper = document.querySelector('.canvas-wrapper') || document.body;
    canvas = document.getElementById('actu-content') || wrapper;
    editorLayer = document.getElementById('editor-layer') || wrapper;

    attachFormatToolbarHandlers();

    window.createTextBlock = createTextBlock;
    window.selectBlock = selectBlock;

    if ($all('.text-block').length === 0) {
      createTextBlock({ type: 'title', x: 120, y: 120, width: 420 });
    }

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.text-block')) {
        selectBlock(null);
      }
    });

    if (typeof MutationObserver !== 'undefined') {
      const toolbarObserver = new MutationObserver((mutations) => {
        for (const m of mutations) {
          if (m.addedNodes && m.addedNodes.length) {
            if (typeof document.dispatchEvent === 'function') document.dispatchEvent(new Event('selectionchange'));
          }
        }
      });
      try { toolbarObserver.observe(document.body, { childList: true, subtree: true }); } catch (e) { /* ignore */ }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // end marker
  console.log("FIN DU FICHIER OK");
})();
