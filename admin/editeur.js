// editeur.js — interactions de base pour l'éditeur (drag, resize, add text/image, save)
(() => {
  // Helpers Supabase UMD safe
  async function getSupabaseClient() {
    if (window.__supabaseReady && typeof window.__supabaseReady.then === 'function') {
      try { await window.__supabaseReady; } catch (e) { /* ignore */ }
    }
    const client = (typeof window.getDb === 'function' && window.getDb()) || window.__supabaseClient || window.supabaseClient || window.supabase;
    if (!client) return null;
    window.supabase = client;
    window.supabaseClient = client;
    return client;
  }

  // DOM refs
  const canvas = document.getElementById('editor-page');
  const layer = document.getElementById('editor-layer');
  const addTextBtn = document.getElementById('add-floating-text');
  const addImageBtn = document.getElementById('add-image');
  const hiddenInput = document.getElementById('hidden-image-input');
  const saveBtn = document.getElementById('save-btn-top');
  const properties = document.getElementById('properties-content');

  // state
  let selected = null;
  let elements = []; // {id, type, leftPct, topPct, widthPct, heightPct, data}
  let idCounter = Date.now();

  // util: convert px to percent relative to canvas
  function toPercent(x, y, w, h) {
    const rect = canvas.getBoundingClientRect();
    return {
      leftPct: Math.round((x - rect.left) / rect.width * 10000) / 100,
      topPct: Math.round((y - rect.top) / rect.height * 10000) / 100,
      widthPct: Math.round(w / rect.width * 10000) / 100,
      heightPct: Math.round(h / rect.height * 10000) / 100
    };
  }
  function fromPercent(p) {
    const rect = canvas.getBoundingClientRect();
    return {
      left: rect.left + rect.width * (p.leftPct / 100),
      top: rect.top + rect.height * (p.topPct / 100),
      width: rect.width * (p.widthPct / 100),
      height: rect.height * (p.heightPct / 100)
    };
  }

  // create floating text
  function createFloatingText(opts = {}) {
    const el = document.createElement('div');
    el.className = 'floating';
    el.dataset.id = ++idCounter;
    el.innerHTML = `<div class="text" contenteditable="true" spellcheck="false">${opts.text || 'Texte'}</div><div class="resize-handle" aria-hidden="true"></div>`;
    canvas.appendChild(el);
    // default position center
    const rect = canvas.getBoundingClientRect();
    const left = rect.left + rect.width * 0.08;
    const top = rect.top + rect.height * 0.12;
    el.style.left = (left - rect.left) + 'px';
    el.style.top = (top - rect.top) + 'px';
    el.style.width = (rect.width * 0.4) + 'px';
    attachInteractions(el);
    selectElement(el);
    persistState();
  }

  // create image element from file or url
  function createImageElement(src) {
    const el = document.createElement('div');
    el.className = 'floating';
    el.dataset.id = ++idCounter;
    el.innerHTML = `<img src="${src}" alt="image"><div class="resize-handle" aria-hidden="true"></div>`;
    canvas.appendChild(el);
    const rect = canvas.getBoundingClientRect();
    el.style.left = (rect.width * 0.1) + 'px';
    el.style.top = (rect.height * 0.12) + 'px';
    el.style.width = (rect.width * 0.5) + 'px';
    el.style.height = (rect.height * 0.4) + 'px';
    attachInteractions(el);
    selectElement(el);
    persistState();
  }

  // attach drag + resize + click
  function attachInteractions(el) {
    el.style.position = 'absolute';
    const handle = el.querySelector('.resize-handle');
    let dragging = false;
    let resizing = false;
    let start = null;
    let startRect = null;

    // pointerdown for drag
    el.addEventListener('pointerdown', (e) => {
      if (e.target === handle) return; // resize handled separately
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      dragging = true;
      start = { x: e.clientX, y: e.clientY };
      const r = el.getBoundingClientRect();
      startRect = { left: r.left, top: r.top, width: r.width, height: r.height };
      selectElement(el);
    });

    // pointerdown for resize
    handle?.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      handle.setPointerCapture(e.pointerId);
      resizing = true;
      start = { x: e.clientX, y: e.clientY };
      const r = el.getBoundingClientRect();
      startRect = { left: r.left, top: r.top, width: r.width, height: r.height };
      selectElement(el);
    });

    // pointermove global
    window.addEventListener('pointermove', (e) => {
      if (!dragging && !resizing) return;
      const rectCanvas = canvas.getBoundingClientRect();
      if (dragging) {
        const dx = e.clientX - start.x;
        const dy = e.clientY - start.y;
        let newLeft = startRect.left + dx;
        let newTop = startRect.top + dy;
        // clamp inside canvas
        newLeft = Math.max(rectCanvas.left, Math.min(newLeft, rectCanvas.right - startRect.width));
        newTop = Math.max(rectCanvas.top, Math.min(newTop, rectCanvas.bottom - startRect.height));
        el.style.left = (newLeft - rectCanvas.left) + 'px';
        el.style.top = (newTop - rectCanvas.top) + 'px';
        updatePropertiesFromElement(el);
      } else if (resizing) {
        const dx = e.clientX - start.x;
        const dy = e.clientY - start.y;
        let newW = Math.max(40, startRect.width + dx);
        let newH = Math.max(24, startRect.height + dy);
        // clamp to canvas
        newW = Math.min(newW, rectCanvas.right - startRect.left);
        newH = Math.min(newH, rectCanvas.bottom - startRect.top);
        el.style.width = newW + 'px';
        el.style.height = newH + 'px';
        updatePropertiesFromElement(el);
      }
    });

    // pointerup
    window.addEventListener('pointerup', (e) => {
      if (dragging || resizing) {
        dragging = false;
        resizing = false;
        persistState();
      }
    });

    // double click to edit text
    const text = el.querySelector('.text');
    if (text) {
      text.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        text.focus();
      });
      // blur persist
      text.addEventListener('blur', () => persistState());
    }

    // click to select
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      selectElement(el);
    });
  }

  // select element
  function selectElement(el) {
    // deselect previous
    document.querySelectorAll('.floating.selected').forEach(x => x.classList.remove('selected'));
    if (!el) {
      selected = null;
      clearProperties();
      return;
    }
    el.classList.add('selected');
    selected = el;
    updatePropertiesFromElement(el);
  }

  // update properties panel from element
  function updatePropertiesFromElement(el) {
    if (!properties) return;
    properties.innerHTML = '';
    const rect = el.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    const left = Math.round((rect.left - canvasRect.left));
    const top = Math.round((rect.top - canvasRect.top));
    const width = Math.round(rect.width);
    const height = Math.round(rect.height);

    properties.insertAdjacentHTML('beforeend', `
      <div><strong>Élément ${el.dataset.id}</strong></div>
      <div class="prop-row"><input id="prop-left" type="number" value="${left}" /><input id="prop-top" type="number" value="${top}" /></div>
      <div class="prop-row"><input id="prop-width" type="number" value="${width}" /><input id="prop-height" type="number" value="${height}" /></div>
      <div class="prop-row"><input id="prop-fontsize" type="number" value="${parseInt(window.getComputedStyle(el.querySelector('.text')||el).fontSize)||16}" /><input id="prop-color" type="color" value="#000000" /></div>
      <div><button id="prop-delete" class="btn full">Supprimer</button></div>
    `);

    // wire inputs
    document.getElementById('prop-left').addEventListener('input', (e) => {
      el.style.left = e.target.value + 'px';
    });
    document.getElementById('prop-top').addEventListener('input', (e) => {
      el.style.top = e.target.value + 'px';
    });
    document.getElementById('prop-width').addEventListener('input', (e) => {
      el.style.width = e.target.value + 'px';
    });
    document.getElementById('prop-height').addEventListener('input', (e) => {
      el.style.height = e.target.value + 'px';
    });
    document.getElementById('prop-fontsize').addEventListener('input', (e) => {
      const t = el.querySelector('.text');
      if (t) t.style.fontSize = e.target.value + 'px';
    });
    document.getElementById('prop-delete').addEventListener('click', () => {
      el.remove();
      selectElement(null);
      persistState();
    });
  }

  function clearProperties() {
    if (properties) properties.innerHTML = '<p class="muted">Sélectionne un élément pour modifier ses propriétés.</p>';
  }

  // persist state to localStorage (and attempt Supabase if available)
  async function persistState() {
    const rectCanvas = canvas.getBoundingClientRect();
    const nodes = Array.from(canvas.querySelectorAll('.floating'));
    const data = nodes.map(n => {
      const r = n.getBoundingClientRect();
      const left = Math.round((r.left - rectCanvas.left) / rectCanvas.width * 10000) / 100;
      const top = Math.round((r.top - rectCanvas.top) / rectCanvas.height * 10000) / 100;
      const width = Math.round(r.width / rectCanvas.width * 10000) / 100;
      const height = Math.round(r.height / rectCanvas.height * 10000) / 100;
      const type = n.querySelector('img') ? 'image' : 'text';
      const content = type === 'text' ? (n.querySelector('.text')?.innerHTML || '') : (n.querySelector('img')?.src || '');
      return { id: n.dataset.id, type, leftPct: left, topPct: top, widthPct: width, heightPct: height, content };
    });
    localStorage.setItem('editeur_state', JSON.stringify(data));
    // try to save to Supabase if available and if page has ?id= (article)
    const supabase = await getSupabaseClient();
    if (!supabase) return;
    const params = new URLSearchParams(location.search);
    const id = params.get('id');
    if (!id) return;
    try {
      // upsert into 'actus' table content field (assumes JSON column 'contenu')
      await supabase.from('actus').update({ contenu: data }).eq('id', id);
    } catch (err) {
      // ignore network errors silently
      console.warn('Supabase save failed', err);
    }
  }

  // load persisted state
  function loadState() {
    const raw = localStorage.getItem('editeur_state');
    if (!raw) return;
    try {
      const arr = JSON.parse(raw);
      arr.forEach(item => {
        if (item.type === 'text') {
          const el = document.createElement('div');
          el.className = 'floating';
          el.dataset.id = item.id || ++idCounter;
          el.innerHTML = `<div class="text" contenteditable="true">${item.content || 'Texte'}</div><div class="resize-handle"></div>`;
          canvas.appendChild(el);
          const rect = canvas.getBoundingClientRect();
          el.style.left = (rect.width * item.leftPct / 100) + 'px';
          el.style.top = (rect.height * item.topPct / 100) + 'px';
          el.style.width = (rect.width * item.widthPct / 100) + 'px';
          el.style.height = (rect.height * item.heightPct / 100) + 'px';
          attachInteractions(el);
        } else if (item.type === 'image') {
          const el = document.createElement('div');
          el.className = 'floating';
          el.dataset.id = item.id || ++idCounter;
          el.innerHTML = `<img src="${item.content}" alt="image"><div class="resize-handle"></div>`;
          canvas.appendChild(el);
          const rect = canvas.getBoundingClientRect();
          el.style.left = (rect.width * item.leftPct / 100) + 'px';
          el.style.top = (rect.height * item.topPct / 100) + 'px';
          el.style.width = (rect.width * item.widthPct / 100) + 'px';
          el.style.height = (rect.height * item.heightPct / 100) + 'px';
          attachInteractions(el);
        }
      });
    } catch (err) {
      console.warn('loadState parse error', err);
    }
  }

  // wire UI
  addTextBtn?.addEventListener('click', () => createFloatingText());
  addImageBtn?.addEventListener('click', () => hiddenInput?.click());
  hiddenInput?.addEventListener('change', (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    createImageElement(url);
    // attempt upload to supabase storage in background
    (async () => {
      const supabase = await getSupabaseClient();
      if (!supabase) return;
      try {
        const fileName = `editeur/${Date.now()}-${f.name}`;
        const { error } = await supabase.storage.from('uploads').upload(fileName, f);
        if (!error) {
          const { data } = await supabase.storage.from('uploads').getPublicUrl(fileName);
          // replace last created image src with public url
          const last = canvas.querySelector('.floating img:last-of-type');
          if (last) last.src = data.publicUrl;
          persistState();
        }
      } catch (err) { console.warn('upload failed', err); }
    })();
  });

  // click outside to deselect
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.floating')) selectElement(null);
  });

  // keyboard delete
  document.addEventListener('keydown', (e) => {
    if ((e.key === 'Delete' || e.key === 'Backspace') && selected) {
      selected.remove();
      selectElement(null);
      persistState();
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      saveAction();
    }
  });

  // save action (local + supabase)
  async function saveAction() {
    await persistState();
    // visual feedback
    const btn = saveBtn;
    if (!btn) return;
    const old = btn.textContent;
    btn.textContent = 'Enregistré ✓';
    btn.classList.add('primary');
    setTimeout(() => { btn.textContent = old; btn.classList.remove('primary'); }, 1200);
  }
  saveBtn?.addEventListener('click', saveAction);

  // init
  clearProperties();
  loadState();

  // expose for console debugging
  window.__editeur = {
    createFloatingText,
    createImageElement,
    persistState,
    loadState,
    getState: () => JSON.parse(localStorage.getItem('editeur_state') || '[]')
  };
})();
