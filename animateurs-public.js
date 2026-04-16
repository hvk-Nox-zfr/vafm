console.log("📡 animateurs-public.js chargé");

// Client Supabase global
const db = window.__supabaseClient;

async function loadPublicAnimateurs() {
  const container = document.getElementById("animateurs-public");
  if (!container) return;

  container.innerHTML = "<p>Chargement...</p>";

  console.log("🔄 Chargement des animateurs…");

  const { data, error } = await db
    .from("animateurs")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("❌ Erreur Supabase :", error);
    container.innerHTML = "<p>Impossible de charger les animateurs.</p>";
    return;
  }

  console.log("📡 Animateurs reçus :", data);

  displayPublicAnimateurs(data);
}

function displayPublicAnimateurs(list) {
  const container = document.getElementById("animateurs-public");
  if (!container) return;

  container.innerHTML = ""; // reset propre

  list.forEach(anim => {
    const card = document.createElement("div");
    card.className = "animateur-card";

    const image = anim.image_url || "https://via.placeholder.com/120";
    const nom = anim.nom || "Sans nom";
    const emission = anim.emission || "";
    const description = anim.description || "";

    card.innerHTML = `
      <img src="${image}" alt="${nom}">
      <h3>${nom}</h3>
      <p><strong>${emission}</strong></p>
      <p>${description}</p>
    `;

    container.appendChild(card);
  });
}

document.addEventListener("DOMContentLoaded", loadPublicAnimateurs);

