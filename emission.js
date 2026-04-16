console.log("📡 emission.js chargé");

async function loadPublicEmissions() {
  const db = (window.getDb && window.getDb()) || window.__supabaseClient;
  const container = document.getElementById("emissions-public");
  if (!container) return;

  container.innerHTML = "<p>Chargement...</p>";
  console.log("🔄 Chargement des émissions…");

  try {
    const { data, error } = await db
      .from("emissions")
      .select("*")
      .order("created_at", { ascending: false });

    container.innerHTML = "";

    if (error) {
      console.error("❌ Erreur Supabase :", error);
      container.innerHTML = "<p>Impossible de charger les émissions.</p>";
      return;
    }

    if (!data || data.length === 0) {
      container.innerHTML = "<p>Aucune émission pour le moment.</p>";
      return;
    }

    displayPublicEmissions(data);
  } catch (e) {
    console.error("❌ Erreur lors du chargement des émissions :", e);
    container.innerHTML = "<p>Impossible de charger les émissions.</p>";
  }
}

function displayPublicEmissions(list) {
  const container = document.getElementById("emissions-public");
  if (!container) return;

  container.innerHTML = ""; // reset propre

  const esc = str => String(str ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  list.forEach(em => {
    const titre = esc(em?.titre || "Sans titre");
    const horaires = esc(em?.horaires || "");
    const description = esc(em?.description || "");

    const card = document.createElement("div");
    card.className = "emission-card";

    card.innerHTML = `
      <h3>${titre}</h3>
      <div class="emission-horaire">${horaires}</div>
      <p>${description}</p>
    `;

    container.appendChild(card);
  });
}

document.addEventListener("DOMContentLoaded", loadPublicEmissions);
