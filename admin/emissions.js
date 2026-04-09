// admin/emissions.js
// Exports: loadEmissions, setupEmissionForm
// Auto-run only when loaded via <script type="module" data-autoload>

// --- Supabase global UMD ---
const supabase = window.supabase.createClient(
  "https://blronpowdhaumjudtgvn.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJscm9ucG93ZGhhdW1qdWR0Z3ZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5ODU4MDAsImV4cCI6MjA4NDU2MTgwMH0.ThzU_Eqgwy0Qx2vTO381R0HHvV1jfhsAZFxY-Aw4hXI"
);

export async function loadEmissions(options = {}) {
  const { containerId = 'emissions-list', limit = 1000 } = options;

  const { data, error } = await supabase
    .from("emissions")
    .select("*")
    .limit(limit)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erreur Supabase :", error);
    return;
  }

  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = "";

  data.forEach(em => {
    const div = document.createElement("div");
    div.className = "emission-item";
    div.innerHTML = `
      <strong>${em.titre}</strong><br>
      <em>${em.horaires || ""}</em><br>
      <p>${em.description || ""}</p>
    `;
    container.appendChild(div);
  });
}

  if (!supabase) {
    console.error('Supabase non disponible. Abandon.');
    return null;
  }

  let container = document.getElementById(containerId);
  if (!container) {
    container = document.createElement('div');
    container.id = containerId;
    container.style.padding = '12px';
    container.style.background = '#fff';
    container.style.border = '1px solid #e6e6e6';
    container.style.margin = '12px';
    container.style.borderRadius = '6px';
    document.body.prepend(container);
  }

  async function loadAndRender() {
    container.innerHTML = '<div style="padding:8px;color:#666">Chargement...</div>';
    try {
      const { data, error } = await supabase
        .from('emissions')
        .select('*')
        .order('id', { ascending: true })
        .limit(limit);

      if (error) {
        console.error('Erreur Supabase lors de la récupération des émissions:', error);
        container.innerHTML = '<div style="color:#b00;padding:8px">Erreur lors du chargement (voir console)</div>';
        return;
      }

      if (!data || data.length === 0) {
        container.innerHTML = '<div style="padding:8px">Aucune émission trouvée.</div>';
        return;
      }

      container.innerHTML = '';
      const header = document.createElement('div');
      header.style.display = 'flex';
      header.style.justifyContent = 'space-between';
      header.style.alignItems = 'center';
      header.style.marginBottom = '10px';
      const title = document.createElement('h3');
      title.style.margin = '0';
      title.textContent = `Émissions (${data.length})`;
      const refreshBtn = document.createElement('button');
      refreshBtn.textContent = 'Rafraîchir';
      refreshBtn.addEventListener('click', loadAndRender);
      header.appendChild(title);
      header.appendChild(refreshBtn);
      container.appendChild(header);

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
        card.style.minHeight = '72px';
        const titleText = escapeHtml(row.nom || row.titre || row.emission || `ID ${row.id}`);
        const subtitle = row.emission ? `<div style="font-size:13px;color:#666">${escapeHtml(row.emission)}</div>` : '';
        const created = row.created_at ? `<div style="font-size:12px;color:#888;margin-top:6px">${escapeHtml(row.created_at)}</div>` : '';
        card.innerHTML = `<strong>${titleText}</strong>${subtitle}${created}`;
        list.appendChild(card);
      });

      container.appendChild(list);
    } catch (err) {
      console.error('Exception lors du rendu des émissions:', err);
      container.innerHTML = '<div style="color:#b00;padding:8px">Erreur inattendue (voir console)</div>';
    }
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
  }

  await loadAndRender();
  return { loadAndRender };
}

/* Minimal helper to create a simple form UI and hook submit to Supabase.
   Exported so other admin scripts can import it: import { setupEmissionForm } from './emissions.js'
*/
export function setupEmissionForm(containerSelector = '#emission-form') {
  const container = document.querySelector(containerSelector);
  if (!container) return null;

  // If a form already exists, return it
  const existing = container.querySelector('form');
  if (existing) return existing;

  const form = document.createElement('form');
  form.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:8px">
      <label>Nom: <input name="nom" required></label>
      <label>Emission: <input name="emission"></label>
      <button type="submit">Enregistrer</button>
    </div>
  `;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const payload = Object.fromEntries(fd.entries());
    try {
      if (window.supabase) {
        const { error } = await window.supabase.from('emissions').insert([payload]);
        if (error) {
          console.error('Insert error', error);
          return;
        }
        // optionally refresh list if present
        try { import('./emissions.js').then(m => m.loadEmissions && m.loadEmissions()); } catch(e){/* ignore */ }
        console.log('Emission saved');
      } else {
        console.log('Payload (no supabase):', payload);
      }
    } catch (err) {
      console.error('Submit failed', err);
    }
  });
  container.appendChild(form);
  return form;
}

// Auto-run when loaded as script with data-autoload
if (typeof document !== 'undefined') {
  const s = document.currentScript;
  if (s && s.getAttribute && s.getAttribute('data-autoload') !== null) {
    // call the exported function directly (no self-import)
    // safe: loadEmissions is defined above
    loadEmissions().catch(e => console.error('auto-run failed', e));
  }
}
