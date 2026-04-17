/* editeur.js — éditeur complet (drag, resize, safe area, guides, save, supabase-safe) */

'use strict';

//
// Helpers Supabase UMD safe
//
async function getSupabaseClient() {
  if (window.__supabaseReady && typeof window.__supabaseReady.then === 'function') {
    try { await window.__supabaseReady; } catch (e) { /* ignore rejection, return null below */ }
  }
  const client = (typeof window.getDb === 'function' && window.getDb()) || window.__supabaseClient || window.supabaseClient || window.supabase;
  if (!client) return null;
  window.supabase = client;
  window.supabaseClient = client;
  return client;
}

//
// DOM refs and state
//
const canvas = document.getElementById('editor-page'); // page container (white rectangle)
const layer = document.getElementById('editor-layer'); // overlay (optional)
const addTextBtn = document.getElementById('add-floating-text');
const addImageBtn = document.getElementById('add-image');
const hiddenInput = document.getElementById('hidden-image-input');
const saveBtn = document.getElementById('save-btn-top');
const propertiesContent = document.getElementById('properties-content');

let idCounter = Date.now();
let selectedEl = null;

//
// Utility functions
//
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function escapeHtml(s='') { return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
function getCanvasRect() { return canvas.getBoundingClientRect(); }

//
// Safe area + Guides setup
//
(function setupSafeAreaAndToggle() {
  if (!canvas) return;
  // safe area element
  let safe = canvas.querySelector('.content-safe-area');
  if (!safe) {
    safe = document.createElement('div');
    safe.className = 'content-safe-area';
    safe.innerHTML = '<div class="center-line" aria-hidden="true"></div>';
    canvas.appendChild(safe);
  }
  // toggle button
  let toggle = canvas.querySelector('.guide-toggle');
  if (!toggle) {
    toggle = document.createElement('button');
    toggle.className = 'guide-toggle';
    toggle.type = 'button';
    toggle.textContent = 'Guides';
    canvas.appendChild(toggle);
  }
  let guidesVisible = true;
  function updateGuides() {
    safe.style.display = guidesVisible ? 'block' : 'none';
    toggle.style.opacity = guidesVisible ? '1' : '0.6';
  }
  updateGuides();
  toggle.addEventListener('click', () => { guidesVisible = !guidesVisible; updateGuides(); });
  // expose for console
  window.__editorGuides = { toggle: () => { guidesVisible = !guidesVisible; updateGuides(); } };
})();

//
// Selection / Properties panel helpers
//
function clearProperties() {
  if (!propertiesContent) return;
  propertiesContent.innerHTML = '<p class="muted">Sélectionne un élément pour modifier ses propriétés.</p>';
}

function updatePropertiesFromElement(el) {
  if (!propertiesContent || !el) return;
  propertiesContent.innerHTML = '';
  const rect = el.getBoundingClientRect();
  const canvasRect = getCanvasRect();
  const left = Math.round(rect.left - canvasRect.left);
  const top = Math.round(rect.top - canvasRect.top);
  const width = Math.round(rect.width);
  const height = Math.round(rect.height);
  const isText = !!el.querySelector('.text');

  propertiesContent.insertAdjacentHTML('beforeend', `
    <div><strong>Élément ${el.dataset.id || '—'}</strong></div>
    <div class="prop-row"><input id="prop-left" type="number" value="${left}" aria-label="Position gauche"/><input id="prop-top" type="number" value="${top}" aria-label="Position haut"/></div>
    <div class="prop-row"><input id="prop-width" type="number" value="${width}" aria-label="Largeur"/><input id="prop-height" type="number" value="${height}" aria-label="Hauteur"/></div>
    <div class="prop-row"><input id="prop-fontsize" type="number" value="${isText ? (parseInt(window.getComputedStyle(el.querySelector('.text')).fontSize) || 16) : 16}" aria-label="Taille de police"/><input id="prop-color" type="color" value="#000000" aria-label="Couleur"/></div>
    <div><button id="prop-delete" class="btn full">Supprimer</button></div>
  `);

  // wire inputs
  const inLeft = document.getElementById('prop-left');
  const inTop = document.getElementById('prop-top');
  const inW = document.getElementById('prop-width');
  const inH = document.getElementById('prop-height');
  const inFs = document.getElementById('prop-fontsize');
  const inColor = document.getElementById('prop-color');
  const delBtn = document.getElementById('prop-delete');

  inLeft?.addEventListener('input', (e) => { el.style.left = e.target.value + 'px'; });
  inTop?.addEventListener('input', (e) => { el.style.top = e.target.value + 'px'; });
  inW?.addEventListener('input', (e) => { el.style.width = e.target.value + 'px'; });
  inH?.addEventListener('input', (e) => { el.style.height = e.target.value + 'px'; });
  inFs?.addEventListener('input', (e) => { const t = el.querySelector('.text'); if (t) t.style.fontSize = e.target.value + 'px'; });
  inColor?.addEventListener('input', (e) => { const t = el.querySelector('.text'); if (t) t.style.color = e.target.value; });
  delBtn?.addEventListener('click', () => { el.remove(); selectElement(null); persistState(); });
}

function selectElement(el) {
  document.querySelectorAll('.floating.selected').forEach(x => x.classList.remove('selected'));
  if (!el) {
    selectedEl = null;
    clearProperties();
    return;
  }
  el.classList.add('selected');
  selectedEl = el;
  updatePropertiesFromElement(el);
}

//
// Create elements
//
function createFloatingText(opts = {}) {
  if (!canvas) return null;
  const el = document.createElement('div');
  el.className = 'floating';
  el.dataset.id = ++idCounter;
  const text = opts.text || 'Texte';
  el.innerHTML = `<div class="text" contenteditable="true" spellcheck="false">${escapeHtml(text)}</div><div class="resize-handle" aria-hidden="true"></div>`;
  canvas.appendChild(el);
  // default placement
  const rect = getCanvasRect();
  el.style.left = Math.round(rect.width * 0.08) + 'px';
  el.style.top = Math.round(rect.height * 0.12) + 'px';
  el.style.width = Math.round(rect.width * 0.4) + 'px';
  attachInteractions(el);
  selectElement(el);
  persistStateDebounced();
  return el;
}

function createImageElement(src) {
  if (!canvas) return null;
  const el = document.createElement('div');
  el.className = 'floating';
  el.dataset.id = ++idCounter;
  el.innerHTML = `<img src="${escapeHtml(src)}" alt="image"><div class="resize-handle" aria-hidden="true"></div>`;
  canvas.appendChild(el);
  const rect = getCanvasRect();
  el.style.left = Math.round(rect.width * 0.1) + 'px';
  el.style.top = Math.round(rect.height * 0.12) + 'px';
  el.style.width = Math.round(rect.width * 0.5) + 'px';
  el.style.height = Math.round(rect.height * 0.4) + 'px';
  attachInteractions(el);
  selectElement(el);
  persistStateDebounced();
  return el;
}

//
// Interactions: single global pointer handlers (drag + resize)
//
const interactionState = {
  activeEl: null,
  mode: null, // 'drag' or 'resize'
  pointerId: null,
  startX: 0, startY: 0,
  startRect: null
};

function enableElementInteractions(el) {
  if (!el || el.dataset._interactions) return;
  el.dataset._interactions = '1';
  el.style.position = 'absolute';
  const handle = el.querySelector('.resize-handle');

  // drag start
  el.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    if (e.target === handle) return;
    e.preventDefault();
    interactionState.activeEl = el;
    interactionState.mode = 'drag';
    interactionState.pointerId = e.pointerId;
    interactionState.startX = e.clientX;
    interactionState.startY = e.clientY;
    const r = el.getBoundingClientRect();
    interactionState.startRect = { left: r.left, top: r.top, width: r.width, height: r.height };
    el.setPointerCapture(e.pointerId);
    selectElement(el);
  });

  // resize start
  handle?.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    interactionState.activeEl = el;
    interactionState.mode = 'resize';
    interactionState.pointerId = e.pointerId;
    interactionState.startX = e.clientX;
    interactionState.startY = e.clientY;
    const r = el.getBoundingClientRect();
    interactionState.startRect = { left: r.left, top: r.top, width: r.width, height: r.height };
    handle.setPointerCapture(e.pointerId);
    selectElement(el);
  });

  // double click to focus text
  const text = el.querySelector('.text');
  if (text) {
    text.addEventListener('dblclick', (ev) => { ev.stopPropagation(); text.focus(); });
    text.addEventListener('blur', () => persistStateDebounced());
  }

  // click selects
  el.addEventListener('click', (ev) => { ev.stopPropagation(); selectElement(el); });
}

// global pointermove
window.addEventListener('pointermove', (e) => {
  if (!interactionState.activeEl || interactionState.pointerId !== e.pointerId) return;
  const el = interactionState.activeEl;
  const canvasRect = getCanvasRect();

  if (interactionState.mode === 'drag') {
    const dx = e.clientX - interactionState.startX;
    const dy = e.clientY - interactionState.startY;
    let newLeft = interactionState.startRect.left + dx;
    let newTop = interactionState.startRect.top + dy;
    // clamp inside canvas
    newLeft = clamp(newLeft, canvasRect.left, canvasRect.right - interactionState.startRect.width);
    newTop = clamp(newTop, canvasRect.top, canvasRect.bottom - interactionState.startRect.height);
    el.style.left = Math.round(newLeft - canvasRect.left) + 'px';
    el.style.top = Math.round(newTop - canvasRect.top) + 'px';
    updatePropertiesFromElement(el);
  } else if (interactionState.mode === 'resize') {
    const dx = e.clientX - interactionState.startX;
    const dy = e.clientY - interactionState.startY;
    let newW = Math.max(40, interactionState.startRect.width + dx);
    let newH = Math.max(24, interactionState.startRect.height + dy);
    // clamp to canvas
    newW = Math.min(newW, canvasRect.right - interactionState.startRect.left);
    newH = Math.min(newH, canvasRect.bottom - interactionState.startRect.top);
    el.style.width = Math.round(newW) + 'px';
    el.style.height = Math.round(newH) + 'px';
    updatePropertiesFromElement(el);
  }
});

// global pointerup
window.addEventListener('pointerup', (e) => {
  if (!interactionState.activeEl) return;
  // snap to center if close to safe area center
  const safe = canvas.querySelector('.content-safe-area');
  if (interactionState.mode === 'drag' && safe && safe.style.display !== 'none') {
    const sel = interactionState.activeEl;
    const elRect = sel.getBoundingClientRect();
    const safeRect = safe.getBoundingClientRect();
    const elCenterX = elRect.left + elRect.width / 2;
    const safeCenterX = safeRect.left + safeRect.width / 2;
    const delta = Math.abs(elCenterX - safeCenterX);
    const SNAP_THRESHOLD = 28;
    if (delta <= SNAP_THRESHOLD) {
      const canvasRect = getCanvasRect();
      const newLeft = safeCenterX - elRect.width / 2 - canvasRect.left;
      sel.style.left = Math.round(clamp(newLeft, 0, canvasRect.width - elRect.width)) + 'px';
      sel.classList.add('snap-center');
      setTimeout(() => sel.classList.remove('snap-center'), 700);
    }
  }

  // finalize
  interactionState.activeEl = null;
  interactionState.mode = null;
  interactionState.pointerId = null;
  persistStateDebounced();
});

//
// Attach interactions to existing and future floating elements
//
function attachInteractionsToAll() {
  document.querySelectorAll('.floating').forEach(el => enableElementInteractions(el));
}
const observer = new MutationObserver(() => attachInteractionsToAll());
if (canvas) observer.observe(canvas, { childList: true, subtree: true });
attachInteractionsToAll();

//
// Persist / Load state (localStorage + optional Supabase)
//
function readQueryId() {
  try {
    const params = new URLSearchParams(location.search);
    return params.get('id');
  } catch (e) { return null; }
}

async function persistState() {
  if (!canvas) return;
  const rectCanvas = getCanvasRect();
  const nodes = Array.from(canvas.querySelectorAll('.floating'));
  const data = nodes.map(n => {
    const r = n.getBoundingClientRect();
    const leftPct = Math.round((r.left - rectCanvas.left) / rectCanvas.width * 10000) / 100;
    const topPct = Math.round((r.top - rectCanvas.top) / rectCanvas.height * 10000) / 100;
    const widthPct = Math.round(r.width / rectCanvas.width * 10000) / 100;
    const heightPct = Math.round(r.height / rectCanvas.height * 10000) / 100;
    const type = n.querySelector('img') ? 'image' : 'text';
    const content = type === 'text' ? (n.querySelector('.text')?.innerHTML || '') : (n.querySelector('img')?.src || '');
    return { id: n.dataset.id, type, leftPct, topPct, widthPct, heightPct, content };
  });
  try {
    localStorage.setItem('editeur_state', JSON.stringify(data));
  } catch (e) { console.warn('localStorage set failed', e); }

  // attempt Supabase save if available and page has id
  const supabase = await getSupabaseClient();
  const id = readQueryId();
  if (!supabase || !id) return;
  try {
    await supabase.from('actus').update({ contenu: data }).eq('id', id);
  } catch (err) {
    console.warn('Supabase save failed', err);
  }
}

let persistTimer = null;
function persistStateDebounced(delay = 300) {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => { persistState(); persistTimer = null; }, delay);
}

function loadState() {
  if (!canvas) return;
  const raw = localStorage.getItem('editeur_state');
  if (!raw) return;
  try {
    const arr = JSON.parse(raw);
    arr.forEach(item => {
      if (item.type === 'text') {
        const el = document.createElement('div');
        el.className = 'floating';
        el.dataset.id = item.id || ++idCounter;
        el.innerHTML = `<div class="text" contenteditable="true" spellcheck="false">${item.content || 'Texte'}</div><div class="resize-handle" aria-hidden="true"></div>`;
        canvas.appendChild(el);
        const rect = getCanvasRect();
        el.style.left = Math.round(rect.width * item.leftPct / 100) + 'px';
        el.style.top = Math.round(rect.height * item.topPct / 100) + 'px';
        el.style.width = Math.round(rect.width * item.widthPct / 100) + 'px';
        el.style.height = Math.round(rect.height * item.heightPct / 100) + 'px';
        enableElementInteractions(el);
      } else if (item.type === 'image') {
        const el = document.createElement('div');
        el.className = 'floating';
        el.dataset.id = item.id || ++idCounter;
        el.innerHTML = `<img src="${escapeHtml(item.content)}" alt="image"><div class="resize-handle" aria-hidden="true"></div>`;
        canvas.appendChild(el);
        const rect = getCanvasRect();
        el.style.left = Math.round(rect.width * item.leftPct / 100) + 'px';
        el.style.top = Math.round(rect.height * item.topPct / 100) + 'px';
        el.style.width = Math.round(rect.width * item.widthPct / 100) + 'px';
        el.style.height = Math.round(rect.height * item.heightPct / 100) + 'px';
        enableElementInteractions(el);
      }
    });
  } catch (err) {
    console.warn('loadState parse error', err);
  }
}

//
// UI wiring: buttons, file input, keyboard
//
addTextBtn?.addEventListener('click', () => createFloatingText());
addImageBtn?.addEventListener('click', () => hiddenInput?.click());

hiddenInput?.addEventListener('change', (e) => {
  const f = e.target.files && e.target.files[0];
  if (!f) return;
  const url = URL.createObjectURL(f);
  const el = createImageElement(url);
  // background upload to Supabase if available
  (async () => {
    const supabase = await getSupabaseClient();
    if (!supabase) return;
    try {
      const fileName = `editeur/${Date.now()}-${f.name}`;
      const { error } = await supabase.storage.from('uploads').upload(fileName, f);
      if (!error) {
        const { data } = await supabase.storage.from('uploads').getPublicUrl(fileName);
        if (data?.publicUrl && el) {
          const img = el.querySelector('img');
          if (img) img.src = data.publicUrl;
          persistStateDebounced();
        }
      }
    } catch (err) { console.warn('upload failed', err); }
  })();
});

// click outside to deselect
document.addEventListener('click', (e) => { if (!e.target.closest('.floating')) selectElement(null); });

// keyboard handlers
document.addEventListener('keydown', (e) => {
  if ((e.key === 'Delete' || e.key === 'Backspace') && selectedEl) {
    selectedEl.remove();
    selectElement(null);
    persistStateDebounced();
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    e.preventDefault();
    saveAction();
  }
});

async function saveAction() {
  await persistState();
  if (!saveBtn) return;
  const old = saveBtn.textContent;
  saveBtn.textContent = 'Enregistré ✓';
  saveBtn.classList.add('primary');
  setTimeout(() => { saveBtn.textContent = old; saveBtn.classList.remove('primary'); }, 1200);
}
saveBtn?.addEventListener('click', saveAction);

//
// Initialization
//
(function init() {
  clearProperties();
  loadState();
  // attach interactions to any pre-existing floating elements
  attachInteractionsToAll();
  // expose API for debugging
  window.__editeur = {
    createFloatingText,
    createImageElement,
    persistState,
    loadState,
    getState: () => JSON.parse(localStorage.getItem('editeur_state') || '[]'),
    selectElement
  };
})();
