// admin/emissions.js
// Exports: loadEmissions, setupEmissionForm
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
      div.dataset.id = em.id;

      const title = document.createElement('h3');
      title.innerHTML = escapeHtml(em.nom || em.titre || '—');

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
          const { error: delError } = await supabase.from('emissions').delete().eq('id', em.id);
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
  const nom = document.getElementById('emission-nom');
  const horaires = document.getElementById('emission-horaires');
  const description = document.getElementById('emission-description');

  if (!popup || !nom || !horaires || !description || !titleEl) {
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
    nom.value = em.nom || em.titre || '';
    horaires.value = em.horaires || '';
    description.value = em.description || '';
    popup.setAttribute('data-edit-id', em.id);
  }

  popup.classList.add('show');
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

  try {
    if (payload.id) {
      const { error } = await supabase.from('emissions').update({
        nom: payload.nom,
        horaires: payload.horaires,
        description: payload.description
      }).eq('id', payload.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('emissions').insert([{
        nom: payload.nom,
        horaires: payload.horaires,
        description: payload.description
      }]);
      if (error) throw error;
    }
    return true;
  } catch (err) {
    console.error('saveEmission error:', err);
    throw err;
  }
}

/* ---------- Setup du formulaire et des boutons du popup ---------- */
export function setupEmissionForm() {
  const addBtn = document.getElementById('add-emission');
  const popup = document.getElementById('popup-emission');
  const saveBtn = document.getElementById('popup-emission-save');
  const cancelBtn = document.getElementById('popup-emission-cancel');
  const nom = document.getElementById('emission-nom');
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
    popup.removeAttribute('data-edit-id');
  });

  saveBtn.addEventListener('click', async () => {
    const id = popup.getAttribute('data-edit-id') || null;
    const payload = {
      id,
      nom: nom.value.trim(),
      horaires: horaires.value.trim(),
      description: description.value.trim()
    };

    if (!payload.nom) {
      alert('Le nom de l’émission est requis.');
      nom.focus();
      return;
    }

    try {
      await saveEmission(payload);
      popup.classList.remove('show');
      popup.removeAttribute('data-edit-id');
      showAdminMessage(container, id ? 'Émission mise à jour' : 'Émission ajoutée', 'success');
      await loadEmissions({ containerId: 'emissions-admin' });
    } catch (err) {
      showAdminMessage(container, 'Erreur lors de la sauvegarde', 'error');
      alert('Erreur lors de la sauvegarde. Voir la console pour détails.');
    }
  });
}

/* ---------- Auto-init si nécessaire ---------- */
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    // si le DOM contient les éléments admin, on initialise automatiquement
    if (document.getElementById('emissions-admin')) {
      // charger et setup
      loadEmissions({ containerId: 'emissions-admin' }).catch(e => console.error(e));
      setupEmissionForm();
    }
  });
}
