console.log("📡 emission.js chargé");

// Utiliser le client global, sans recréer la variable
const supabase = window.__supabaseClient;

async function loadPublicEmissions() {
    console.log("🔄 Chargement des émissions…");

    const { data, error } = await supabase
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
        card.className = "emission-card";

        card.innerHTML = `
            <h3>${em.titre}</h3>
            <div class="emission-horaire">${em.horaires || ""}</div>
            <p>${em.description || ""}</p>
        `;

        container.appendChild(card);
    });
}

document.addEventListener("DOMContentLoaded", loadPublicEmissions);
