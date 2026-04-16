console.log("📡 emission.js chargé");

// Client Supabase global
const db = window.__supabaseClient;

async function loadPublicEmissions() {
    const container = document.getElementById("emissions-public");
    if (!container) return;

    container.innerHTML = "<p>Chargement...</p>";

    console.log("🔄 Chargement des émissions…");

    const { data, error } = await db
        .from("emissions")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("❌ Erreur Supabase :", error);
        container.innerHTML = "<p>Impossible de charger les émissions.</p>";
        return;
    }

    console.log("📡 Émissions reçues :", data);

    displayPublicEmissions(data);
}

function displayPublicEmissions(list) {
    const container = document.getElementById("emissions-public");
    if (!container) return;

    container.innerHTML = ""; // reset propre

    list.forEach(em => {
        const titre = em.titre || "Sans titre";
        const horaires = em.horaires || "";
        const description = em.description || "";

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
