console.log("📡 emission.js chargé");

// Connexion Supabase (nom différent pour éviter le conflit)
const supabasePublic = window.supabase.createClient(
    "https://blronpowdhaumjudtgvn.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJscm9ucG93ZGhhdW1qdWR0Z3ZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5ODU4MDAsImV4cCI6MjA4NDU2MTgwMH0.ThzU_Eqgwy0Qx2vTO381R0HHvV1jfhsAZFxY-Aw4hXI"
);

async function loadPublicEmissions() {
    console.log("🔄 Chargement des émissions…");

    const { data, error } = await supabasePublic
        .from("emissions")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("❌ Erreur Supabase :", error);
        return;
    }

    console.log("📡 Émissions reçues :", data);
    displayPublicEmissions(data);
}

function displayPublicEmissions(list) {
    const container = document.getElementById("emissions-public");
    if (!container) return;

    container.innerHTML = "";

    list.forEach(em => {
        const card = document.createElement("div");
        card.className = "card";

        card.innerHTML = `
            ${em.image_url ? `<img src="${em.image_url}" class="card-img">` : ""}
            <div class="card-content">
                <h3>${em.titre}</h3>
                <p class="horaire">${em.horaires || ""}</p>
                <p class="description">${em.description || ""}</p>
            </div>
        `;

        container.appendChild(card);
    });
}

document.addEventListener("DOMContentLoaded", loadPublicEmissions);
