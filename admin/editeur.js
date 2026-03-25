// emissions.js
(async function () {
  'use strict';

  // Récupère le client Supabase de façon robuste
  const supabase = await (window.__supabaseReady || (async () => {
    if (window.supabase) return window.supabase;
    try {
      const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm');
      const SUPABASE_URL = 'https://blronpowdhaumjudtgvn.supabase.co';
      const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJscm9ucG93ZGhhdW1qdWR0Z3ZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5ODU4MDAsImV4cCI6MjA4NDU2MTgwMH0.ThzU_Eqgwy0Qx2vTO381R0HHvV1jfhsAZFxY-Aw4hXI';
      const client = createClient(SUPABASE_URL, SUPABASE_KEY);
      // expose localement pour debug si nécessaire
      window.supabase = window.supabase || client;
      window.__supabaseReady = window.__supabaseReady || Promise.resolve(client);
      return client;
    } catch (err) {
      console.error('Impossible d\'initialiser Supabase:', err);
      return null;
    }
  })());

  if (!supabase) {
    console.error('Supabase non disponible. Abandon.');
    return;
  }

  // Sélecteur cible pour injecter la liste
  const containerId = 'emissions-list';
  let container = document.getElementById(containerId);
  if (!container) {
    container = document.createElement('div');
    container.id = containerId;
    // style minimal pour visibilité
    container.style.padding = '12px';
    container.style.background = '#fff';
    container.style.border = '1px solid #e6e6e6';
    document.body.prepend(container);
  }

  // Récupère et affiche les émissions
  try {
    const { data, error } = await supabase.from('emissions').select('*').order('id', { ascending: true }).limit(500);
    if (error) {
      console.error('Erreur Supabase lors de la récupération des émissions:', error);
      container.innerHTML = `<div style="color:#b00">Erreur lors du chargement des émissions (voir console)</div>`;
      return;
    }

    if (!data || data.length === 0) {
      container.innerHTML = '<div>Aucune émission trouvée.</div>';
      return;
    }

    // Render simple
    const list = document.createElement('div');
    list.style.display = 'grid';
    list.style.gridTemplateColumns = 'repeat(auto-fit,minmax(240px,1fr))';
    list.style.gap = '10px';

    data.forEach(row => {
      const card = document.createElement('div');
      card.style.border = '1px solid #eee';
      card.style.padding = '10px';
      card.style.borderRadius = '6px';
      card.style.background = '#fafafa';
      const title = row.nom || row.titre || row.emission || `ID ${row.id}`;
      const subtitle = row.emission ? `<div style="font-size:13px;color:#666">${row.emission}</div>` : '';
      card.innerHTML = `<strong>${escapeHtml(title)}</strong>${subtitle}<div style="font-size:12px;color:#888;margin-top:6px">${row.created_at || ''}</div>`;
      list.appendChild(card);
    });

    container.innerHTML = `<h3 style="margin:0 0 8px 0">Émissions (${data.length})</h3>`;
    container.appendChild(list);
  } catch (err) {
    console.error('Exception lors du rendu des émissions:', err);
    container.innerHTML = `<div style="color:#b00">Erreur inattendue (voir console)</div>`;
  }

  // utilitaire simple pour échapper le HTML
  function escapeHtml(str) {
    if (!str && str !== 0) return '';
    return String(str).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
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
  console.log('[sauvegarder] démarrage');
  try {
    const client = await (window.__supabaseReady || Promise.resolve(window.supabase || null));
    if (!client) {
      console.error('[sauvegarder] supabase client absent');
      alert("Impossible d'enregistrer : service non initialisé.");
      return { ok: false, reason: 'no-client' };
    }

    const params = new URLSearchParams(window.location.search);
    const actuId = Number(params.get('id'));
    if (!actuId) {
      console.error('[sauvegarder] id article manquant');
      alert("ID d'article manquant dans l'URL.");
      return { ok: false, reason: 'no-id' };
    }

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

    const { data, error } = await client.from('actus').update({ contenu }).eq('id', actuId).select();

    console.log('[sauvegarder] supabase response', { data, error });

    if (error) {
      console.error('[sauvegarder] erreur supabase', error);
      alert("Erreur lors de l'enregistrement (voir console).");
      return { ok: false, reason: 'supabase-error', error };
    }

    if (Array.isArray(data) && data.length) {
      const updated = data[0];
      if (updated.contenu && updated.contenu.previewHtml) {
        const previewEl = document.getElementById('actu-content');
        if (previewEl) {
          previewEl.innerHTML = updated.contenu.previewHtml;
          console.log('[sauvegarder] previewHtml mis à jour dans le DOM');
        }
      }
    }

    alert('Enregistré !');
    return { ok: true, data };
  } catch (err) {
    console.error('[sauvegarder] exception', err);
    alert("Erreur inattendue lors de l'enregistrement (voir console).");
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

  // attacher le bouton d'enregistrement visible (top ou toolbar)
(function attachSaveButtons(){
  const top = document.getElementById('save-btn-top');
  if (top && !top._saveAttached) {
    top.addEventListener('click', (e) => { e.preventDefault(); sauvegarder(); });
    top._saveAttached = true;
    console.log('save-btn-top handler attaché');
  }
  const toolbarSave = document.getElementById('save-btn');
  if (toolbarSave && !toolbarSave._saveAttached) {
    toolbarSave.addEventListener('click', (e) => { e.preventDefault(); sauvegarder(); });
    toolbarSave._saveAttached = true;
    console.log('save-btn (toolbar) handler attaché');
  }
})();

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
