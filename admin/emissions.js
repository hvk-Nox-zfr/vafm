// admin/emissions.js
// Export named loadEmissions and optional auto-run with data-autoload

export async function loadEmissions(options = {}) {
  const { containerId = 'emissions-list', limit = 1000 } = options;

  const supabase = await (window.__supabaseReady || (async () => {
    if (window.supabase) return window.supabase;
    try {
      const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm');
      const SUPABASE_URL = 'https://blronpowdhaumjudtgvn.supabase.co';
      const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJscm9ucG93ZGhhdW1qdWR0Z3ZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5ODU4MDAsImV4cCI6MjA4NDU2MTgwMH0.ThzU_Eqgwy0Qx2vTO381R0HHvV1jfhsAZFxY-Aw4hXI';
      const client = createClient(SUPABASE_URL, SUPABASE_KEY);
      window.supabase = window.supabase || client;
      window.__supabaseReady = window.__supabaseReady || Promise.resolve(client);
      return client;
    } catch (err) {
      console.error('Impossible d\'initialiser Supabase dynamiquement:', err);
      return null;
    }
  })());

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
        container.innerHTML = `<div style="color:#b00;padding:8px">Erreur lors du chargement (voir console)</div>`;
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
      container.innerHTML = `<div style="color:#b00;padding:8px">Erreur inattendue (voir console)</div>`;
    }
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
  }

  await loadAndRender();
  return { loadAndRender };
}

// Auto-run when loaded as script with data-autoload
if (typeof document !== 'undefined') {
  const s = document.currentScript;
  if (s && s.getAttribute && s.getAttribute('data-autoload') !== null) {
    // call the exported function directly (no self-import)
    loadEmissions().catch(e => console.error('auto-run failed', e));
  }
}
