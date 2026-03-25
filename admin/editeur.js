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

  // Si c’est un texte, on remonte au parent
  if (node.nodeType === 3) {
    node = node.parentNode;
  }

  styleCallback(node);
}

function attachFormatToolbarHandlers() {
  const toolbar = $('#format-toolbar');
  if (!toolbar) return console.warn('Toolbar introuvable');

  console.log('Toolbar détectée:', toolbar);

  /* Police */
  $('#ft-font', toolbar)?.addEventListener('change', (e) => {
    applyBlockStyle(node => node.style.fontFamily = e.target.value);
  });

  /* Taille */
  $('#ft-size', toolbar)?.addEventListener('change', (e) => {
    applyBlockStyle(node => node.style.fontSize = e.target.value);
  });

  /* Gras / Italique / Souligné */
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

  /* Couleur */
  $('#ft-color', toolbar)?.addEventListener('input', (e) => {
    applyInlineStyle('foreColor', e.target.value);
  });

  /* Alignements */
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

  /* Interligne */
  $('#ft-lineheight', toolbar)?.addEventListener('change', (e) => {
    applyBlockStyle(node => node.style.lineHeight = e.target.value);
  });

  console.log('[toolbar] handlers attachés');
}

/* ============================================================
   PANNEAUX CANVA
   ============================================================ */

function attachSidebarHandlers() {
  // Boutons d’ajout de contenu WYSIWYG
  $('#add-title')?.addEventListener('click', addTitle);
  $('#add-subtitle')?.addEventListener('click', addSubtitle);
  $('#add-paragraph')?.addEventListener('click', addParagraph);

  $('#add-image')?.addEventListener('click', async () => {
    const url = window.prompt('URL de l’image :');
    if (url) addImage(url);
  });

  // Gestion des panneaux Canva
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
  console.log("[sauvegarder] démarrage");

  const client = await window.__supabaseReady;
  if (!client) {
    alert("Supabase non initialisé");
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const actuId = Number(params.get("id"));
  if (!actuId) {
    alert("ID d'article manquant");
    return;
  }

  const html = document.querySelector("#editor-page").innerHTML;

  const contenu = {
    html,
    updated_at: new Date().toISOString()
  };

  const { data, error } = await client
    .from("actus")
    .update({ contenu })
    .eq("id", actuId)
    .select();

  if (error) {
    console.error(error);
    alert("Erreur Supabase");
    return;
  }

  alert("Enregistré !");
}


/* ============================================================
   BARRE CANVA
   ============================================================ */
  
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
   INIT
   ============================================================ */

function initEditor() {
  console.log("[initEditor] démarrage");

  const editor = document.querySelector("#editor-page");
  if (!editor) {
    console.error("[initEditor] #editor-page introuvable");
    return;
  }

  attachFormatToolbarHandlers();
  attachSidebarHandlers();
  attachCanvaPanels();

  // Bouton enregistrer
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
