console.log("📡 animateurs-public.js chargé");

async function loadPublicAnimateurs() {
  const db = (window.getDb && window.getDb()) || window.__supabaseClient;
  const container = document.getElementById("animateurs-public");
  if (!container) return;

  container.innerHTML = "<p>Chargement...</p>";

  console.log("🔄 Chargement des animateurs…");

  try {
    const { data, error } = await db
      .from("animateurs")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("❌ Erreur Supabase :", error);
      container.innerHTML = "<p>Impossible de charger les animateurs.</p>";
      return;
    }

    if (!data || data.length === 0) {
      container.innerHTML = "<p>Aucun animateur pour le moment.</p>";
      return;
    }

    console.log("📡 Animateurs reçus :", data);
    displayPublicAnimateurs(data);
  } catch (e) {
    console.error("❌ Erreur lors du chargement des animateurs :", e);
    container.innerHTML = "<p>Impossible de charger les animateurs.</p>";
  }
}

function displayPublicAnimateurs(list) {
  const container = document.getElementById("animateurs-public");
  if (!container) return;

  container.innerHTML = ""; // reset propre

  list.forEach(anim => {
    const card = document.createElement("div");
    card.className = "animateur-card";

    const image = anim?.image_url || "https://via.placeholder.com/120";
    const nom = anim?.nom || "Sans nom";
    const emission = anim?.emission || "";
    const description = anim?.description || "";

    // Éviter l'injection HTML en échappant les valeurs simples
    const esc = str => String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

    card.innerHTML = `
      <img src="${esc(image)}" alt="${esc(nom)}">
      <h3>${esc(nom)}</h3>
      <p><strong>${esc(emission)}</strong></p>
      <p>${esc(description)}</p>
    `;

    container.appendChild(card);
  });
}

document.addEventListener("DOMContentLoaded", loadPublicAnimateurs);

