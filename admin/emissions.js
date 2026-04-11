// admin/emissions.js
// Exports: loadEmissions, setupEmissionForm

// --- Supabase global UMD ---
const supabase = window.supabase.createClient(
  "https://blronpowdhaumjudtgvn.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJscm9ucG93ZGhhdW1qdWR0Z3ZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5ODU4MDAsImV4cCI6MjA4NDU2MTgwMH0.ThzU_Eqgwy0Qx2vTO381R0HHvV1jfhsAZFxY-Aw4hXI"
);

// -------------------------
// CHARGEMENT DES EMISSIONS
// -------------------------
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

// -------------------------
// FORMULAIRE D’AJOUT
// -------------------------
export function setupEmissionForm(containerSelector = '#emission-form') {
  const container = document.querySelector(containerSelector);
  if (!container) return null;

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
      const { error } = await supabase.from('emissions').insert([payload]);
      if (error) {
        console.error('Insert error', error);
        return;
      }

      console.log('Emission saved');

      // rafraîchir si possible
      try {
        loadEmissions();
      } catch (_) {}
    } catch (err) {
      console.error('Submit failed', err);
    }
  });

  container.appendChild(form);
  return form;
}

// -------------------------
// AUTO-RUN SI data-autoload
// -------------------------
if (typeof document !== 'undefined') {
  const s = document.currentScript;
  if (s && s.getAttribute && s.getAttribute('data-autoload') !== null) {
    loadEmissions().catch(e => console.error('auto-run failed', e));
  }
}
