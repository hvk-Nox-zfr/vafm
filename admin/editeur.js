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

  /* ---------------- Globals ---------------- */
  let wrapper = null;
  let canvas = null;
  let editorLayer = null;
  let selectedBlock = null;

  /* ---------------- Utilities ---------------- */
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function $(sel, root = document) { return root.querySelector(sel); }
  function $all(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }

  /* ---------------- Drag / Resize / Select ---------------- */
  function makeDraggable(el) {
    // Use pointer events with threshold to avoid teleportation and selection conflicts
    let dragging = false;
    let startX = 0, startY = 0;
    let origLeft = 0, origTop = 0;
    let offsetX = 0, offsetY = 0;
    const DRAG_THRESHOLD = 6;

    function onPointerDown(e) {
      // left mouse or touch only
      if (e.type === 'mousedown' && e.button !== 0) return;
      const p = e.type.startsWith('touch') ? (e.touches[0] || e.changedTouches[0]) : e;
      // if target is editable content, don't start drag (allow selection)
      const content = el.querySelector('.text-block-content');
      if (content && (p.target === content || content.contains(p.target)) && !p.target.classList.contains('drag-handle')) {
        return;
      }
      e.preventDefault && e.preventDefault();

      startX = p.clientX;
      startY = p.clientY;
      const rect = el.getBoundingClientRect();
      origLeft = rect.left + window.scrollX;
      origTop = rect.top + window.scrollY;
      offsetX = startX - origLeft;
      offsetY = startY - origTop;

      function onMove(ev) {
        const q = ev.type.startsWith('touch') ? (ev.touches[0] || ev.changedTouches[0]) : ev;
        const dx = q.clientX - startX;
        const dy = q.clientY - startY;
        if (!dragging) {
          if (Math.hypot(dx, dy) >= DRAG_THRESHOLD) {
            dragging = true;
            el.classList.add('dragging');
            el.dataset._zBefore = el.style.zIndex || '10';
            el.style.zIndex = '9999';
            // ensure absolute positioning
            el.style.position = 'absolute';
            el.style.left = origLeft + 'px';
            el.style.top = origTop + 'px';
            el.style.margin = '0';
            el.style.transform = 'none';
          } else {
            return;
          }
        }
        const newLeft = q.clientX - offsetX + window.scrollX;
        const newTop = q.clientY - offsetY + window.scrollY;

        if (wrapper) {
          const wrapRect = wrapper.getBoundingClientRect();
          const bRect = el.getBoundingClientRect();
          const minLeft = wrapRect.left + window.scrollX;
          const minTop = wrapRect.top + window.scrollY;
          const maxLeft = wrapRect.left + window.scrollX + wrapRect.width - bRect.width;
          const maxTop = wrapRect.top + window.scrollY + wrapRect.height - bRect.height;
          el.style.left = clamp(newLeft, minLeft, maxLeft) + 'px';
          el.style.top = clamp(newTop, minTop, maxTop) + 'px';
        } else {
          el.style.left = newLeft + 'px';
          el.style.top = newTop + 'px';
        }
      }

      function onUp() {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        window.removeEventListener('touchmove', onMove);
        window.removeEventListener('touchend', onUp);
        if (dragging) {
          dragging = false;
          el.classList.remove('dragging');
          el.style.zIndex = el.dataset._zBefore || '10';
          delete el.dataset._zBefore;
          document.dispatchEvent(new CustomEvent('block-moved', { detail: { block: el } }));
        }
      }

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
      window.addEventListener('touchmove', onMove, { passive: false });
      window.addEventListener('touchend', onUp);
    }

    el.addEventListener('mousedown', onPointerDown);
    el.addEventListener('touchstart', onPointerDown, { passive: false });
  }

  function makeResizable(el) {
    const handle = document.createElement('div');
    handle.className = 'resize-handle bottom-right';
    // minimal inline styles so handle is usable even without CSS
    handle.style.position = 'absolute';
    handle.style.right = '6px';
    handle.style.bottom = '6px';
    handle.style.width = '12px';
    handle.style.height = '12px';
    handle.style.cursor = 'nwse-resize';
    handle.style.background = 'rgba(0,0,0,0.2)';
    el.appendChild(handle);

    handle.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      if (e.button !== 0) return;
      const startX = e.clientX, startY = e.clientY;
      const startW = el.offsetWidth, startH = el.offsetHeight;
      function onMove(ev) {
        el.style.width = Math.max(20, startW + (ev.clientX - startX)) + 'px';
        el.style.height = Math.max(20, startH + (ev.clientY - startY)) + 'px';
      }
      function onUp() {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });

    handle.addEventListener('touchstart', (e) => {
      e.stopPropagation();
      const t = e.touches[0];
      if (!t) return;
      const startX = t.clientX, startY = t.clientY;
      const startW = el.offsetWidth, startH = el.offsetHeight;
      function onMoveTouch(ev) {
        const tt = ev.touches[0] || ev.changedTouches[0];
        if (!tt) return;
        el.style.width = Math.max(20, startW + (tt.clientX - startX)) + 'px';
        el.style.height = Math.max(20, startH + (tt.clientY - startY)) + 'px';
      }
      function onUpTouch() {
        window.removeEventListener('touchmove', onMoveTouch);
        window.removeEventListener('touchend', onUpTouch);
      }
      window.addEventListener('touchmove', onMoveTouch, { passive: false });
      window.addEventListener('touchend', onUpTouch);
    }, { passive: false });
  }

  function makeSelectable(el) {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      selectBlock(el);
    });
  }

  function selectBlock(el) {
    $all('.block-public').forEach(b => b.classList.remove('selected'));
    if (el) el.classList.add('selected');
    selectedBlock = el;
    document.dispatchEvent(new Event('selectionchange'));
  }

  /* ---------------- Blocks creation ---------------- */
  function addImageBlock(data = {}) {
    if (!editorLayer && !wrapper) {
      console.warn('addImageBlock: editorLayer et wrapper non initialisés');
      return null;
    }
    const div = document.createElement('div');
    div.className = 'block-public';
    div.style.position = 'absolute';
    div.style.left = typeof data.x === 'number' ? `${data.x}px` : (data.x || '100px');
    div.style.top = typeof data.y === 'number' ? `${data.y}px` : (data.y || '100px');
    div.style.width = typeof data.width === 'number' ? `${data.width}px` : (data.width || '300px');
    div.style.height = typeof data.height === 'number' ? `${data.height}px` : (data.height || '200px');

    const img = document.createElement('img');
    img.src = data.url || '';
    img.alt = data.alt || '';
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'contain';
    img.draggable = false;
    div.appendChild(img);

    makeDraggable(div);
    makeResizable(div);
    makeSelectable(div);

    (editorLayer || wrapper).appendChild(div);
    return div;
  }

  function createTextBlock({ type = 'paragraph', x = 120, y = 120, width = 360, html = '' } = {}) {
    if (!editorLayer) editorLayer = document.getElementById('editor-layer') || wrapper;
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

    // small drag handle area to avoid interfering with text selection
    const dragHandle = document.createElement('div');
    dragHandle.className = 'drag-handle';
    dragHandle.style.position = 'absolute';
    dragHandle.style.right = '6px';
    dragHandle.style.top = '6px';
    dragHandle.style.width = '12px';
    dragHandle.style.height = '12px';
    dragHandle.style.background = 'rgba(0,0,0,0.15)';
    dragHandle.style.cursor = 'grab';
    dragHandle.title = 'Déplacer';

    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'resize-handle bottom-right';
    resizeHandle.style.position = 'absolute';
    resizeHandle.style.right = '6px';
    resizeHandle.style.bottom = '6px';
    resizeHandle.style.width = '12px';
    resizeHandle.style.height = '12px';
    resizeHandle.style.cursor = 'nwse-resize';
    resizeHandle.style.background = 'rgba(0,0,0,0.15)';

    block.appendChild(content);
    block.appendChild(dragHandle);
    block.appendChild(resizeHandle);

    // attach behaviors
    makeDraggable(block);
    makeResizable(block);
    makeSelectable(block);

    // prevent mousedown inside content from starting drag
    content.addEventListener('mousedown', (e) => e.stopPropagation());

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

    (editorLayer || wrapper).appendChild(block);
    return { block, content };
  }

  /* ---------------- Save / persist ---------------- */
async function sauvegarder() {
  try {
    console.log('[sauvegarder] démarrage');
    const client = await __supabaseReady;
    if (!client) {
      console.error('[sauvegarder] supabase non initialisé');
      alert("Impossible d'enregistrer : service non initialisé.");
      return { ok: false, reason: 'no-client' };
    }

    if (!editorLayer || !canvas) {
      console.error('[sauvegarder] editorLayer ou canvas manquant', { editorLayer, canvas });
      alert("Impossible d'enregistrer : éditeur non initialisé.");
      return { ok: false, reason: 'no-editor' };
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

    const params = new URLSearchParams(window.location.search);
    const actuId = Number(params.get("id"));
    if (!actuId || isNaN(actuId)) {
      console.warn('[sauvegarder] actuId invalide', params.get("id"));
      alert("ID d'article invalide. Vérifie l'URL (paramètre id).");
      return { ok: false, reason: 'invalid-id' };
    }

    console.log('[sauvegarder] payload', { actuId, texts, images });

    const { error } = await client
      .from("actus")
      .update({ contenu: { previewHtml, texts, images } })
      .eq("id", actuId);

    if (error) {
      console.error('[sauvegarder] erreur supabase', error);
      alert("Erreur lors de l'enregistrement (voir console).");
      return { ok: false, reason: 'supabase-error', error };
    }

    console.log('[sauvegarder] OK');
    alert("Enregistré !");
    return { ok: true };
  } catch (err) {
    console.error('[sauvegarder] exception', err);
    alert("Erreur inattendue lors de l'enregistrement (voir console).");
    return { ok: false, reason: 'exception', error: err };
  }
}

  /* ---------------- Charger article ---------------- */
  function parseCssPx(val) {
    if (val === undefined || val === null) return undefined;
    if (typeof val === 'number') return val;
    const m = String(val).match(/^(-?\d+(\.\d+)?)px$/);
    return m ? Number(m[1]) : val;
  }

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
        images.forEach(img => addImageBlock(img));
      }
    } catch (err) {
      console.error('Erreur chargerActu:', err);
      if (canvas) canvas.innerHTML = "<h2>Erreur lors du chargement</h2>";
    }
  }

  /* ---------------- Format toolbar handlers ---------------- */
  function attachFormatToolbarHandlers() {
    const ftFont = document.getElementById('ft-font');
    if (!ftFont) return; // toolbar absent
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

    function applyStyleToSelectionOrBlock(cssObj) {
      if (selectedBlock && selectedBlock.classList.contains('text-block')) {
        const content = selectedBlock.querySelector('.text-block-content');
        if (content) Object.assign(content.style, cssObj);
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
      }
    }

    function updateToolbarState() {
      if (selectedBlock && selectedBlock.classList.contains('text-block')) {
        const content = selectedBlock.querySelector('.text-block-content');
        if (!content) return;
        ftFont.value = window.getComputedStyle(content).fontFamily || ftFont.value;
        if (ftSize) ftSize.value = window.getComputedStyle(content).fontSize || ftSize.value;
        if (ftLineheight) {
          const lh = window.getComputedStyle(content).lineHeight;
          ftLineheight.value = lh && lh !== 'normal' ? lh : ftLineheight.value;
        }
        if (ftColor) {
          const color = window.getComputedStyle(content).color;
          const m = color && color.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
          if (m) ftColor.value = "#" + [1,2,3].map(i => parseInt(m[i]).toString(16).padStart(2,'0')).join('');
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

  /* ---------------- Initialization ---------------- */
  function initEditor() {
    wrapper = document.querySelector('.canvas-wrapper') || document.body;
    canvas = document.getElementById('actu-content') || wrapper;
    editorLayer = document.getElementById('editor-layer') || wrapper;

    // expose for debug and compatibility
    window.addImageBlock = addImageBlock;
    window.createTextBlock = createTextBlock;
    window.sauvegarder = sauvegarder;
    window.__supabaseReady = __supabaseReady;
    window.chargerActu = chargerActu;

    // attach toolbar handlers (after DOM elements exist)
    attachFormatToolbarHandlers();

    // --- Robust toolbar wiring: place this inside initEditor() right after attachFormatToolbarHandlers(); ---
(function robustToolbarInit(){
  // find toolbar container (fallbacks)
  const toolbar = document.querySelector('.toolbar, .editor-toolbar, #toolbar, header, .canva-panel') || document.body;

  // 1) ensure save button exists and is wired
  let saveBtn = document.getElementById('save-btn');
  if (!saveBtn) {
    saveBtn = document.createElement('button');
    saveBtn.id = 'save-btn';
    saveBtn.type = 'button';
    saveBtn.textContent = 'Enregistrer';
    saveBtn.className = 'canva-save-btn';
    Object.assign(saveBtn.style, {
      margin: '6px',
      padding: '6px 10px',
      background: '#0b74de',
      color: '#fff',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      zIndex: 10000
    });
    toolbar.prepend(saveBtn);
    console.log('robustToolbarInit: save button created');
  }
  if (!saveBtn._attached) {
    saveBtn.addEventListener('click', (e) => {
      e.preventDefault();
      console.log('save-btn clicked');
      if (typeof sauvegarder === 'function') sauvegarder();
      else console.error('sauvegarder() introuvable');
    });
    saveBtn._attached = true;
  }

  // 2) delegated click handler for toolbar actions (works even if buttons are added later)
  const root = toolbar || document;
  if (!root._toolbarDelegationAttached) {
    root.addEventListener('click', (ev) => {
      const btn = ev.target.closest('button, [data-action], .canva-icon, .ft-button, .format-btn, input[type="color"]');
      if (!btn) return;
      // debug
      console.log('toolbar click:', btn, 'data-action=', btn.dataset && btn.dataset.action, 'id=', btn.id);
      ev.preventDefault();
      ev.stopPropagation();

      // ensure pointer-events enabled on clicked element and parents (in case CSS blocked it)
      let p = btn;
      for (let i = 0; i < 6 && p; i++, p = p.parentElement) {
        if (getComputedStyle(p).pointerEvents === 'none') p.style.pointerEvents = 'auto';
      }

      const action = (btn.dataset && btn.dataset.action) || btn.id || btn.getAttribute('data-action') || btn.className || btn.textContent.trim().toLowerCase();

      switch (action) {
        case 'save':
        case 'save-btn':
        case 'ft-save':
        case 'canva-save-btn':
          if (typeof sauvegarder === 'function') sauvegarder(); else console.error('sauvegarder() introuvable');
          break;
        case 'bold':
        case 'ft-bold':
          document.execCommand('bold'); break;
        case 'italic':
        case 'ft-italic':
          document.execCommand('italic'); break;
        case 'underline':
        case 'ft-underline':
          document.execCommand('underline'); break;
        case 'align-left':
        case 'ft-align-left':
          document.execCommand('justifyLeft'); break;
        case 'align-center':
        case 'ft-align-center':
          document.execCommand('justifyCenter'); break;
        case 'align-right':
        case 'ft-align-right':
          document.execCommand('justifyRight'); break;
        default:
          // try custom handler named window[action]
          if (action && typeof window[action] === 'function') {
            try { window[action](btn); } catch (err) { console.error('Erreur handler custom', action, err); }
          } else {
            console.log('toolbar action non mappée:', action);
          }
      }
    }, { passive: false });
    root._toolbarDelegationAttached = true;
    console.log('robustToolbarInit: delegation attached to', root);
  }

  // 3) debug helper: detect overlay covering toolbar and temporarily disable it
  (function detectOverlay(){
    const t = toolbar;
    if (!t) return;
    const r = t.getBoundingClientRect();
    const el = document.elementFromPoint(r.left + r.width/2, r.top + r.height/2);
    if (el && el !== t && !t.contains(el)) {
      console.warn('robustToolbarInit: overlay detected covering toolbar:', el, 'classes:', el.className);
      // temporarily allow clicks through the overlay for debugging
      el.style.pointerEvents = 'none';
      el.dataset._pointerEventsDisabledByRobustInit = 'true';
      console.log('robustToolbarInit: pointer-events disabled on overlay for debug. Reload to restore.');
    } else {
      console.log('robustToolbarInit: no overlay detected at toolbar center');
    }
  })();

  // 4) reattach behaviors to existing blocks (safety)
  document.querySelectorAll('.block-public').forEach(b => {
    try {
      if (typeof makeDraggable === 'function') makeDraggable(b);
      if (typeof makeResizable === 'function') makeResizable(b);
      if (typeof makeSelectable === 'function') makeSelectable(b);
    } catch (err) { console.error('robustToolbarInit: réattache handlers pour', b, err); }
  });
  console.log('robustToolbarInit: reattached handlers on .block-public');
})();

    // create a default block if none exist
    if (editorLayer && !editorLayer.querySelector('.block-public')) {
      createTextBlock({ type: 'title', x: 120, y: 120, width: 420 });
    }

    // save button
    const saveBtn = document.getElementById("save-btn");
    if (saveBtn) saveBtn.addEventListener("click", sauvegarder);

    // deselect on outside click
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.block-public')) selectBlock(null);
    });

    // panels (if present)
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

    // MutationObserver to update toolbar when content changes
    if (typeof MutationObserver !== 'undefined') {
      const toolbarObserver = new MutationObserver((mutations) => {
        for (const m of mutations) {
          if (m.addedNodes && m.addedNodes.length) {
            document.dispatchEvent(new Event('selectionchange'));
          }
        }
      });
      try { toolbarObserver.observe(document.body, { childList: true, subtree: true }); } catch (e) { /* ignore */ }
    }

    console.log('Editor initialized');
  }

  /* Run on DOM ready */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEditor);
  } else {
    initEditor();
  }

  /* end marker */
  console.log("FIN DU FICHIER OK");

})();
