// Connexion Supabase
const supabaseUrl = "https://blronpowdhaumjudtgvn.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJscm9ucG93ZGhhdW1qdWR0Z3ZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5ODU4MDAsImV4cCI6MjA4NDU2MTgwMH0.ThzU_Eqgwy0Qx2vTO381R0HHvV1jfhsAZFxY-Aw4hXI";
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// Charger les émissions
async function loadPublicEmissions() {
    const { data, error } = await supabase
        .from("emissions")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Erreur chargement émissions :", error);
        return;
    }

    displayPublicEmissions(data);
}

// Affichage public
function displayPublicEmissions(list) {
    const container = document.getElementById("emissions-public");
    if (!container) return;

    container.innerHTML = "";

    list.forEach(em => {
        const card = document.createElement("div");
        card.className = "card";

        card.innerHTML = `
            <div class="card-content">
                <h3>${em.titre}</h3>
                <p class="horaire">${em.horaires || ""}</p>
                <p class="description">${em.description || ""}</p>
            </div>
        `;

        container.appendChild(card);
    });
}

// Charger au démarrage
document.addEventListener("DOMContentLoaded", loadPublicEmissions);

