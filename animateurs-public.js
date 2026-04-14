console.log("animateurs-public.js exécuté à", performance.now());
console.log("📡 animateurs-public.js chargé");

// Utiliser le client global, sans recréer la variable
const supabase = window.__supabaseClient;

async function loadPublicAnimateurs() {
  console.log("🔄 Chargement des animateurs…");

  const { data, error } = await supabase
    .from("animateurs")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("❌ Erreur Supabase :", error);
    return;
  }

  console.log("📡 Animateurs reçus :", data);
  displayPublicAnimateurs(data);
}

function displayPublicAnimateurs(list) {
  const container = document.getElementById("animateurs-public");
  if (!container) return;

  container.innerHTML = "";

  list.forEach(anim => {
    const card = document.createElement("div");
    card.className = "animateur-card";

    card.innerHTML = `
      <img src="${anim.image_url || 'https://via.placeholder.com/120'}" alt="${anim.nom}">
      <h3>${anim.nom}</h3>
      <p><strong>${anim.emission || ""}</strong></p>
      <p>${anim.description || ""}</p>
    `;

    container.appendChild(card);
  });
}

document.addEventListener("DOMContentLoaded", loadPublicAnimateurs);
