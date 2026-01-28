console.log("📡 animateurs-public.js chargé");

// Connexion Supabase (nom unique pour éviter les conflits)
const supabaseAnimateurs = window.supabase.createClient(
  "https://blronpowdhaumjudtgvn.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJscm9ucG93ZGhhdW1qdWR0Z3ZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5ODU4MDAsImV4cCI6MjA4NDU2MTgwMH0.ThzU_Eqgwy0Qx2vTO381R0HHvV1jfhsAZFxY-Aw4hXI"
);

async function loadPublicAnimateurs() {
  console.log("🔄 Chargement des animateurs…");

  const { data, error } = await supabaseAnimateurs
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
