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

/* ============================================================
   ÉDITEUR D’ARTICLE – VERSION PROPRE ET FONCTIONNELLE
   ============================================================ */

/* ----------------- Variables globales ----------------- */
let wrapper = null;
let canvas = null;
let editorLayer = null;
let currentBlock = null;
let blockIdCounter = 0;

/* ----------------- Helpers ----------------- */
function $(sel, root = document) {
  return root.querySelector(sel);
}
function $all(sel, root = document) {
  return Array.from(root.querySelectorAll(sel));
}

/* ============================================================
   BLOCS D’ÉDITION
   ============================================================ */

function createTextBlock({ type = 'paragraph', x = 100, y = 100, width = 400, html = '' } = {}) {
  const block = document.createElement('div');
  block.className = 'block-public';
  block.dataset.type = type;
  block.dataset.blockId = `block-${++blockIdCounter}`;
  block.contentEditable = 'true';

  block.style.position = 'absolute';
  block.style.left = `${x}px`;
  block.style.top = `${y}px`;
  block.style.width = `${width}px`;

  block.innerHTML = html || (type === 'title' ? 'Titre' : 'Texte…');

  editorLayer.appendChild(block);
  makeDraggable(block);
  makeSelectable(block);
  selectBlock(block);

  return block;
}

function addImageBlock(src, { x = 100, y = 100, width = 300 } = {}) {
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
  img.style.width = '100%';

  block.appendChild(img);
  editorLayer.appendChild(block);

  makeDraggable(block);
  makeSelectable(block);
  selectBlock(block);

  return block;
}

/* ============================================================
   SÉLECTION & DRAG
   ============================================================ */

function selectBlock(block) {
  currentBlock = block;
  $all('.block-public').forEach(b => b.classList.remove('selected'));
  if (block) block.classList.add('selected');
}

function makeSelectable(el) {
  el.addEventListener('click', (e) => {
    e.stopPropagation();
    selectBlock(el);
  });
}

function makeDraggable(el) {
  let startX = 0, startY = 0, origX = 0, origY = 0;

  el.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    selectBlock(el);

    startX = e.clientX;
    startY = e.clientY;

    const rect = el.getBoundingClientRect();
    origX = rect.left + window.scrollX;
    origY = rect.top + window.scrollY;

    function move(ev) {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;

      el.style.left = `${origX + dx - wrapper.getBoundingClientRect().left}px`;
      el.style.top = `${origY + dy - wrapper.getBoundingClientRect().top}px`;
    }

    function up() {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
    }

    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  });
}

/* ============================================================
   TOOLBAR – FORMATAGE
   ============================================================ */

function applyInlineStyle(cmd, value = null) {
  if (!currentBlock) return;
  currentBlock.focus();
  document.execCommand(cmd, false, value);
}

function applyBlockStyle(fn) {
  if (!currentBlock) return;
  fn(currentBlock);
}

function attachFormatToolbarHandlers() {
  const toolbar = $('#format-toolbar');
  if (!toolbar) return console.warn('Toolbar introuvable');

  console.log('Toolbar détectée:', toolbar);

  /* Police */
  $('#ft-font', toolbar)?.addEventListener('change', (e) => {
    applyBlockStyle(b => b.style.fontFamily = e.target.value);
  });

  /* Taille */
  $('#ft-size', toolbar)?.addEventListener('change', (e) => {
    applyBlockStyle(b => b.style.fontSize = e.target.value);
  });

  /* Gras / Italique / Souligné */
  $('#ft-bold', toolbar)?.addEventListener('click', (e) => { e.preventDefault(); applyInlineStyle('bold'); });
  $('#ft-italic', toolbar)?.addEventListener('click', (e) => { e.preventDefault(); applyInlineStyle('italic'); });
  $('#ft-underline', toolbar)?.addEventListener('click', (e) => { e.preventDefault(); applyInlineStyle('underline'); });

  /* Couleur */
  $('#ft-color', toolbar)?.addEventListener('input', (e) => {
    applyInlineStyle('foreColor', e.target.value);
  });

  /* Alignements */
  $('#ft-align-left', toolbar)?.addEventListener('click', (e) => { e.preventDefault(); applyBlockStyle(b => b.style.textAlign = 'left'); });
  $('#ft-align-center', toolbar)?.addEventListener('click', (e) => { e.preventDefault(); applyBlockStyle(b => b.style.textAlign = 'center'); });
  $('#ft-align-right', toolbar)?.addEventListener('click', (e) => { e.preventDefault(); applyBlockStyle(b => b.style.textAlign = 'right'); });

  /* Interligne */
  $('#ft-lineheight', toolbar)?.addEventListener('change', (e) => {
    applyBlockStyle(b => b.style.lineHeight = e.target.value);
  });

  /* Z-index */
  $('#ft-send-front', toolbar)?.addEventListener('click', (e) => {
    e.preventDefault();
    applyBlockStyle(b => b.style.zIndex = (parseInt(b.style.zIndex || '1') + 1));
  });

  $('#ft-send-back', toolbar)?.addEventListener('click', (e) => {
    e.preventDefault();
    applyBlockStyle(b => b.style.zIndex = (parseInt(b.style.zIndex || '1') - 1));
  });

  console.log('[toolbar] handlers attachés');
}

/* ============================================================
   PANNEAUX CANVA
   ============================================================ */

function attachSidebarHandlers() {
  $('#add-title')?.addEventListener('click', () => {
    createTextBlock({ type: 'title', x: 120, y: 120, width: 420 });
  });

  $('#add-subtitle')?.addEventListener('click', () => {
    createTextBlock({ type: 'subtitle', x: 140, y: 180, width: 420, html: 'Sous-titre' });
  });

  $('#add-paragraph')?.addEventListener('click', () => {
    createTextBlock({ type: 'paragraph', x: 140, y: 240, width: 480, html: 'Nouveau paragraphe…' });
  });

  $('#add-image')?.addEventListener('click', () => {
    const url = window.prompt('URL de l’image :');
    if (url) addImageBlock(url);
  });
}

function attachCanvaPanels() {
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
   SAUVEGARDE (mock)
   ============================================================ */

async function sauvegarder() {
  try {
    console.log('[sauvegarder] démarrage');

    // 1) attendre le client Supabase exposé par supabase-init.js
    const client = await (window.__supabaseReady || Promise.resolve(null));
    if (!client) {
      console.error('[sauvegarder] __supabaseReady non disponible');
      alert("Impossible d'enregistrer : service non initialisé.");
      return { ok: false, reason: 'no-client' };
    }

    // 2) récupérer l'ID d'article depuis l'URL (paramètre id)
    const params = new URLSearchParams(window.location.search);
    const actuId = Number(params.get('id'));
    if (!actuId || isNaN(actuId)) {
      console.warn('[sauvegarder] id invalide dans l\'URL', params.get('id'));
      alert("ID d'article invalide. Vérifie le paramètre id dans l'URL.");
      return { ok: false, reason: 'invalid-id' };
    }

    // 3) construire le payload : blocs éditables + preview HTML
    const blocks = Array.from(document.querySelectorAll('#editor-layer .block-public')).map(b => ({
      id: b.dataset.blockId || null,
      type: b.dataset.type || 'paragraph',
      html: b.innerHTML,
      x: parseInt(b.style.left || '0', 10) || 0,
      y: parseInt(b.style.top || '0', 10) || 0,
      width: b.style.width || ''
    }));

    const previewHtml = (document.getElementById('actu-content') || document.body).innerHTML;

    const contenu = { previewHtml, blocks, updated_at: new Date().toISOString() };

    console.log('[sauvegarder] payload', { actuId, contenu });

    // 4) appel Supabase : adapter le nom de table/colonne si besoin
    const { error } = await client
      .from('actus')
      .update({ contenu })
      .eq('id', actuId);

    if (error) {
      console.error('[sauvegarder] erreur supabase', error);
      alert('Erreur lors de l\'enregistrement (voir console).');
      return { ok: false, reason: 'supabase-error', error };
    }

    console.log('[sauvegarder] OK');
    alert('Enregistré !');
    return { ok: true };
  } catch (err) {
    console.error('[sauvegarder] exception', err);
    alert('Erreur inattendue lors de l\'enregistrement (voir console).');
    return { ok: false, reason: 'exception', error: err };
  }
}


/* ============================================================
   INIT
   ============================================================ */

function initEditor() {
  wrapper = $('.canvas-wrapper');
  canvas = $('#actu-content');
  editorLayer = $('#editor-layer');

  attachFormatToolbarHandlers();
  attachSidebarHandlers();
  attachCanvaPanels();

  if (!$('.block-public', editorLayer)) {
    createTextBlock({ type: 'title', x: 120, y: 120, width: 420 });
  }

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.block-public')) selectBlock(null);
  });

  $('#save-btn-top')?.addEventListener('click', (e) => {
    e.preventDefault();
    sauvegarder();
  });

  console.log('Editor initialized');
}

/* ============================================================
   DOM READY
   ============================================================ */

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initEditor);
} else {
  initEditor();
}

console.log('FIN DU FICHIER OK');

})();
