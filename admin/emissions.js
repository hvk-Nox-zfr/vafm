// admin/emissions.js
// Exports: loadEmissions, setupEmissionForm, ouvrirPopupEmission
'use strict';

/* ---------- Récupération sûre du client Supabase global UMD ---------- */
async function getSupabaseClient() {
  if (window.__supabaseReady && typeof window.__supabaseReady.then === 'function') {
    try { await window.__supabaseReady; } catch (e) { console.warn('supabase ready rejected', e); }
  }
  const client = (typeof window.getDb === 'function' && window.getDb()) || window.__supabaseClient || window.supabaseClient || window.supabase;
  if (!client) throw new Error('Supabase client non initialisé');
  // exposer pour compatibilité
  window.supabase = client;
  window.supabaseClient = client;
  return client;
}

/* ---------- Helpers ---------- */
function escapeHtml(s = '') {
  return String(s).replace(/[&<>"']/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));
}

function showAdminMessage(container, msg, type = 'info') {
  if (!container) return;
  const el = document.createElement('div');
  el.className = `admin-msg admin-msg-${type}`;
  el.textContent = msg;
  container.prepend(el);
  setTimeout(() => el.remove(), 3500);
}

/* ---------- Charger émissions ---------- */
export async function loadEmissions(options = {}) {
  const { containerId = 'emissions-admin', limit = 1000 } = options;
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = '<p>Chargement des émissions…</p>';

  let supabase;
  try {
    supabase = await getSupabaseClient();
  } catch (err) {
    console.error('Supabase client unavailable', err);
    container.innerHTML = '<p>Impossible de se connecter à la base de données.</p>';
    return;
  }

  try {
    const { data, error } = await supabase
      .from('emissions')
      .select('*')
      .limit(limit)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erreur Supabase:', error);
      container.innerHTML = '<p>Erreur lors du chargement des émissions.</p>';
      return;
    }

    container.innerHTML = '';
    if (!data || data.length === 0) {
      container.innerHTML = '<p>Aucune émission pour le moment.</p>';
      return;
    }

    data.forEach(em => {
      const div = document.createElement('div');
      div.className = 'emission-item admin-card';
      // store id for delegation
      div.dataset.id = em.id;

      const title = document.createElement('h3');
      // prefer titre (DB) but keep compatibility if nom exists
      title.innerHTML = escapeHtml(em.titre || em.nom || '—');

      const meta = document.createElement('div');
      meta.className = 'emission-meta muted';
      meta.textContent = em.horaires || '';

      const desc = document.createElement('p');
      desc.innerHTML = escapeHtml((em.description || '').slice(0, 400));
      if ((em.description || '').length > 400) desc.innerHTML += '…';

      const actions = document.createElement('div');
      actions.className = 'emission-actions';

      const editBtn = document.createElement('button');
      editBtn.className = 'btn btn-secondary btn-edit';
      editBtn.type = 'button';
      editBtn.textContent = 'Modifier';
      editBtn.addEventListener('click', () => ouvrirPopupEmission(em));

      const delBtn = document.createElement('button');
      delBtn.className = 'btn btn-secondary btn-delete';
      delBtn.type = 'button';
      delBtn.textContent = 'Supprimer';
      delBtn.addEventListener('click', async () => {
        if (!confirm('Supprimer cette émission ?')) return;
        try {
          const sup = await getSupabaseClient();
          const { error: delError } = await sup.from('emissions').delete().eq('id', em.id);
          if (delError) throw delError;
          showAdminMessage(container, 'Émission supprimée', 'success');
          await loadEmissions({ containerId, limit });
        } catch (err) {
          console.error('Erreur suppression émission:', err);
          showAdminMessage(container, 'Erreur lors de la suppression', 'error');
        }
      });

      actions.appendChild(editBtn);
      actions.appendChild(delBtn);

      div.appendChild(title);
      div.appendChild(meta);
      div.appendChild(desc);
      div.appendChild(actions);

      container.appendChild(div);
    });
  } catch (err) {
    console.error('Erreur loadEmissions:', err);
    container.innerHTML = '<p>Erreur inattendue lors du chargement.</p>';
  }
}

/* ---------- Ouvrir popup émission (create / edit) ---------- */
export function ouvrirPopupEmission(em = null) {
  const popup = document.getElementById('popup-emission');
  const titleEl = document.getElementById('popup-emission-title');
  const nom = document.getElementById('emission-nom');           // UI field (kept for compatibility)
  const horaires = document.getElementById('emission-horaires');
  const description = document.getElementById('emission-description');

  if (!popup || !titleEl || !nom || !horaires || !description) {
    console.error('Popup émission: éléments DOM manquants');
    return;
  }

  if (!em) {
    titleEl.textContent = 'Nouvelle émission';
    nom.value = '';
    horaires.value = '';
    description.value = '';
    popup.removeAttribute('data-edit-id');
  } else {
    titleEl.textContent = 'Modifier l’émission';
    // map DB field 'titre' into UI input
    nom.value = em.titre || em.nom || '';
    horaires.value = em.horaires || '';
    description.value = em.description || '';
    popup.setAttribute('data-edit-id', em.id);
  }

  // show popup (class + inline style for fallback)
  popup.classList.remove('hidden');
  popup.classList.add('show');
  popup.style.display = 'block';
  popup.setAttribute('aria-hidden', 'false');

  nom.focus();
}

/* ---------- Sauvegarder émission (create / update) ---------- */
async function saveEmission(payload) {
  let supabase;
  try {
    supabase = await getSupabaseClient();
  } catch (err) {
    console.error('Supabase client unavailable', err);
    throw err;
  }

  // Map UI payload to DB columns (DB uses 'titre')
  const dbObj = {
    titre: payload.titre || payload.nom || '',
    horaires: payload.horaires || null,
    description: payload.description || null
    // add image_url, animateur mapping here if you extend the form
  };

  // debug
  console.log('saveEmission dbObj:', dbObj, 'id:', payload.id || null);

  try {
    if (payload.id) {
      const res = await supabase.from('emissions').update(dbObj).eq('id', payload.id);
      console.log('Supabase update response:', res);
      if (res.error) throw res.error;
    } else {
      const res = await supabase.from('emissions').insert([dbObj]);
      console.log('Supabase insert response:', res);
      if (res.error) throw res.error;
    }
    return true;
  } catch (err) {
    console.error('saveEmission error: ', err);
    if (err.status) console.error('HTTP status:', err.status);
    if (err.message) console.error('Error message:', err.message);
    throw err;
  }
}

/* ---------- Setup du formulaire et des boutons du popup ---------- */
export function setupEmissionForm() {
  const addBtn = document.getElementById('add-emission');
  const popup = document.getElementById('popup-emission');
  const saveBtn = document.getElementById('popup-emission-save');
  const cancelBtn = document.getElementById('popup-emission-cancel');
  const nom = document.getElementById('emission-nom');           // UI field (kept name 'nom' for backward compatibility)
  const horaires = document.getElementById('emission-horaires');
  const description = document.getElementById('emission-description');
  const container = document.getElementById('emissions-admin');

  if (!addBtn || !popup || !saveBtn || !cancelBtn || !nom || !horaires || !description || !container) {
    console.warn('setupEmissionForm: éléments manquants dans le DOM');
    return;
  }

  addBtn.addEventListener('click', () => ouvrirPopupEmission());

  cancelBtn.addEventListener('click', () => {
    popup.classList.remove('show');
    popup.classList.add('hidden');
    popup.style.display = 'none';
    popup.removeAttribute('data-edit-id');
    popup.setAttribute('aria-hidden', 'true');
  });

  saveBtn.addEventListener('click', async () => {
    const id = popup.getAttribute('data-edit-id') || null;
    const payload = {
      id,
      // map UI input 'nom' into payload.titre for DB
      titre: nom.value.trim(),
      nom: nom.value.trim(), // keep for compatibility in code paths that read nom
      horaires: horaires.value.trim(),
      description: description.value.trim()
    };

    if (!payload.titre) {
      alert('Le nom / titre de l’émission est requis.');
      nom.focus();
      return;
    }

    try {
      await saveEmission(payload);
      // hide popup
      popup.classList.remove('show');
      popup.classList.add('hidden');
      popup.style.display = 'none';
      popup.removeAttribute('data-edit-id');
      popup.setAttribute('aria-hidden', 'true');

      showAdminMessage(container, id ? 'Émission mise à jour' : 'Émission ajoutée', 'success');
      await loadEmissions({ containerId: 'emissions-admin' });
    } catch (err) {
      console.error('Erreur lors de la sauvegarde:', err);
      showAdminMessage(container, 'Erreur lors de la sauvegarde', 'error');
      alert('Erreur lors de la sauvegarde. Voir la console pour détails.');
    }
  });

  // Delegation: allow edit buttons rendered dynamically to open popup
  container.addEventListener('click', async (e) => {
    const editBtn = e.target.closest('.btn-edit, .edit, button.edit');
    if (!editBtn) return;
    const item = editBtn.closest('[data-id], .emission-item, .emission-card');
    const id = item?.dataset?.id;
    if (!id) {
      console.warn('Impossible de trouver id pour édition', item);
      return;
    }
    try {
      const sup = await getSupabaseClient();
      const { data, error } = await sup.from('emissions').select('*').eq('id', id).limit(1);
      if (error) throw error;
      const em = (data && data[0]) || null;
      if (!em) { alert('Émission introuvable'); return; }
      ouvrirPopupEmission(em);
    } catch (err) {
      console.error('Erreur récupération émission pour édition', err);
      alert('Erreur lors de la récupération de l’émission. Voir la console.');
    }
  });
}

/* ---------- Auto-init si nécessaire ---------- */
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('emissions-admin')) {
      loadEmissions({ containerId: 'emissions-admin' }).catch(e => console.error(e));
      setupEmissionForm();
    }
  });
}
