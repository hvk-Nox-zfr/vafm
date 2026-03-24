// editeur.js — version fusionnée et corrigée
(function () {
  'use strict';

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

  console.log('editeur.js loaded');

// editeur.js
// Éditeur d’article – version simplifiée et propre

/* ----------------- Variables globales ----------------- */
let wrapper = null;
let canvas = null;
let editorLayer = null;
let currentBlock = null;

/* ----------------- Utilitaires DOM ----------------- */
function $(sel, root = document) {
  return root.querySelector(sel);
}
function $all(sel, root = document) {
  return Array.from(root.querySelectorAll(sel));
}

/* ----------------- Blocs d’édition ----------------- */
let blockIdCounter = 0;

function createTextBlock({ type = 'paragraph', x = 100, y = 100, width = 400, html = '' } = {}) {
  if (!editorLayer) return;

  const block = document.createElement('div');
  block.className = 'block-public';
  block.dataset.type = type;
  block.dataset.blockId = `block-${++blockIdCounter}`;
  block.contentEditable = 'true';

  block.style.position = 'absolute';
  block.style.left = `${x}px`;
  block.style.top = `${y}px`;
  block.style.width = `${width}px`;

  block.innerHTML = html || (type === 'title' ? 'Titre de l’article' : 'Nouveau texte');

  editorLayer.appendChild(block);
  makeDraggable(block);
  makeSelectable(block);
  selectBlock(block);

  return block;
}

function addImageBlock(src, { x = 100, y = 100, width = 300 } = {}) {
  if (!editorLayer) return;

  const block = document.createElement('div');
  block.className = 'block-public block-image';
  block.dataset.type = 'image';
  block.dataset.blockId = `block-${++blockIdCounter}`;

  block.style.position = 'absolute';
  block.style.left = `${x}px`;
  block.style.top = `${y}px`;
  block.style.width = `${width}px`;

  const img = document.createElement('img');
  img.src = src;
  img.alt = '';
  img.style.width = '100%';
  img.style.display = 'block';

  block.appendChild(img);
  editorLayer.appendChild(block);

  makeDraggable(block);
  makeSelectable(block);
  selectBlock(block);

  return block;
}

/* ----------------- Sélection de bloc ----------------- */
function selectBlock(block) {
  currentBlock = block;
  $all('.block-public').forEach(b => b.classList.remove('selected'));
  if (block) block.classList.add('selected');
}

/* ----------------- Drag & drop simple ----------------- */
function makeDraggable(el) {
  let startX = 0, startY = 0, origX = 0, origY = 0;
  function onMouseDown(e) {
    if (e.button !== 0) return;
    selectBlock(el);
    startX = e.clientX;
    startY = e.clientY;
    const rect = el.getBoundingClientRect();
    origX = rect.left + window.scrollX;
    origY = rect.top + window.scrollY;
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    e.preventDefault();
  }
  function onMouseMove(e) {
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    el.style.left = `${origX + dx - wrapper.getBoundingClientRect().left}px`;
    el.style.top = `${origY + dy - wrapper.getBoundingClientRect().top}px`;
  }
  function onMouseUp() {
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  }
  el.addEventListener('mousedown', onMouseDown);
}

function makeSelectable(el) {
  el.addEventListener('click', (e) => {
    e.stopPropagation();
    selectBlock(el);
  });
}

/* ----------------- Toolbar : application du style ----------------- */
function applyInlineStyle(command, value = null) {
  if (!currentBlock) return;
  currentBlock.focus();
  document.execCommand(command, false, value);
}

function applyBlockStyle(styleFn) {
  if (!currentBlock) return;
  styleFn(currentBlock);
}

/* ----------------- Sauvegarde (à adapter à Supabase) ----------------- */
async function sauvegarder() {
  console.log('[sauvegarder] démarrage');

  const blocks = $all('.block-public', editorLayer).map(b => ({
    id: b.dataset.blockId,
    type: b.dataset.type || 'paragraph',
    html: b.innerHTML,
    x: parseInt(b.style.left || '0', 10),
    y: parseInt(b.style.top || '0', 10),
    width: parseInt(b.style.width || '400', 10)
  }));

  console.log('[sauvegarder] blocs à sauvegarder :', blocks);

  // TODO: remplacer par ton appel Supabase réel
  // await supabase.from('articles').update({ content: blocks }).eq('id', articleId);

  console.log('[sauvegarder] terminé (mock)');
}

/* ----------------- Chargement initial (mock) ----------------- */
async function chargerActu() {
  console.log('[chargerActu] mock – aucun chargement distant');
  // Ici tu peux recharger depuis Supabase si besoin
}

/* ----------------- Toolbar : binding des contrôles ----------------- */
function attachFormatToolbarHandlers() {
  const toolbar = document.getElementById('format-toolbar');
  if (!toolbar) {
    console.warn('format-toolbar introuvable');
    return;
  }

  // Police
  const fontSelect = $('#ft-font', toolbar);
  if (fontSelect) {
    fontSelect.addEventListener('change', (e) => {
      applyBlockStyle(block => {
        block.style.fontFamily = e.target.value;
      });
    });
  }

  // Taille
  const sizeSelect = $('#ft-size', toolbar);
  if (sizeSelect) {
    sizeSelect.addEventListener('change', (e) => {
      applyBlockStyle(block => {
        block.style.fontSize = e.target.value;
      });
    });
  }

  // Gras / Italique / Souligné
  const boldBtn = $('#ft-bold', toolbar);
  const italicBtn = $('#ft-italic', toolbar);
  const underlineBtn = $('#ft-underline', toolbar);

  if (boldBtn) boldBtn.addEventListener('click', (e) => { e.preventDefault(); applyInlineStyle('bold'); });
  if (italicBtn) italicBtn.addEventListener('click', (e) => { e.preventDefault(); applyInlineStyle('italic'); });
  if (underlineBtn) underlineBtn.addEventListener('click', (e) => { e.preventDefault(); applyInlineStyle('underline'); });

  // Couleur
  const colorInput = $('#ft-color', toolbar);
  if (colorInput) {
    colorInput.addEventListener('input', (e) => {
      applyInlineStyle('foreColor', e.target.value);
    });
  }

  // Alignements
  const alignLeft = $('#ft-align-left', toolbar);
  const alignCenter = $('#ft-align-center', toolbar);
  const alignRight = $('#ft-align-right', toolbar);

  if (alignLeft) alignLeft.addEventListener('click', (e) => { e.preventDefault(); applyBlockStyle(b => b.style.textAlign = 'left'); });
  if (alignCenter) alignCenter.addEventListener('click', (e) => { e.preventDefault(); applyBlockStyle(b => b.style.textAlign = 'center'); });
  if (alignRight) alignRight.addEventListener('click', (e) => { e.preventDefault(); applyBlockStyle(b => b.style.textAlign = 'right'); });

  // Interligne
  const lineHeightSelect = $('#ft-lineheight', toolbar);
  if (lineHeightSelect) {
    lineHeightSelect.addEventListener('change', (e) => {
      applyBlockStyle(b => b.style.lineHeight = e.target.value);
    });
  }

  // Z-index (avant / arrière)
  const sendFront = $('#ft-send-front', toolbar);
  const sendBack = $('#ft-send-back', toolbar);

  if (sendFront) {
    sendFront.addEventListener('click', (e) => {
      e.preventDefault();
      applyBlockStyle(b => {
        b.style.zIndex = String((parseInt(b.style.zIndex || '1', 10) || 1) + 1);
      });
    });
  }

  if (sendBack) {
    sendBack.addEventListener('click', (e) => {
      e.preventDefault();
      applyBlockStyle(b => {
        b.style.zIndex = String((parseInt(b.style.zIndex || '1', 10) || 1) - 1);
      });
    });
  }

  console.log('[toolbar] handlers attachés');
}

/* ----------------- Boutons latéraux (canva) ----------------- */
function attachSidebarHandlers() {
  const addTitleBtn = document.getElementById('add-title');
  const addSubtitleBtn = document.getElementById('add-subtitle');
  const addParagraphBtn = document.getElementById('add-paragraph');
  const addImageBtn = document.getElementById('add-image');

  if (addTitleBtn) {
    addTitleBtn.addEventListener('click', () => {
      createTextBlock({ type: 'title', x: 120, y: 120, width: 420 });
    });
  }

  if (addSubtitleBtn) {
    addSubtitleBtn.addEventListener('click', () => {
      createTextBlock({ type: 'subtitle', x: 140, y: 180, width: 420, html: 'Sous-titre' });
    });
  }

  if (addParagraphBtn) {
    addParagraphBtn.addEventListener('click', () => {
      createTextBlock({ type: 'paragraph', x: 140, y: 240, width: 480, html: 'Nouveau paragraphe…' });
    });
  }

  if (addImageBtn) {
    addImageBtn.addEventListener('click', () => {
      const url = window.prompt('URL de l’image :');
      if (url) addImageBlock(url, { x: 160, y: 260, width: 320 });
    });
  }
}

/* ----------------- Panels canva (hover / click) ----------------- */
function attachCanvaPanels() {
  const icons = $all('.canva-icon');
  const panels = $all('.canva-panel');
  let openTimer = null, closeTimer = null;
  const OPEN_DELAY = 80, CLOSE_DELAY = 160;

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
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.canva-panel') && !e.target.closest('.canva-icon')) {
      closeAllPanels();
    }
  });
}

/* ----------------- Init éditeur ----------------- */
function initEditor() {
  wrapper = document.querySelector('.canvas-wrapper') || document.body;
  canvas = document.getElementById('actu-content') || wrapper;
  editorLayer = document.getElementById('editor-layer') || wrapper;

  // exposer pour debug
  window.addImageBlock = addImageBlock;
  window.createTextBlock = createTextBlock;
  window.sauvegarder = sauvegarder;
  window.chargerActu = chargerActu;

  attachFormatToolbarHandlers();
  attachSidebarHandlers();
  attachCanvaPanels();

  // bloc par défaut si aucun
  if (editorLayer && !editorLayer.querySelector('.block-public')) {
    createTextBlock({ type: 'title', x: 120, y: 120, width: 420 });
  }

  // désélection quand on clique à l’extérieur
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.block-public')) selectBlock(null);
  });

  // bouton Enregistrer en haut à droite
  const saveTop = document.getElementById('save-btn-top');
  if (saveTop) {
    saveTop.addEventListener('click', (e) => {
      e.preventDefault();
      sauvegarder();
    });
  }

  console.log('Editor initialized');
}

/* ----------------- DOM Ready ----------------- */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initEditor);
} else {
  initEditor();
}

console.log('FIN DU FICHIER OK');
