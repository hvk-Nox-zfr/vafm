console.log("🔥 emissions.js chargé");

// Initialisation Supabase
const supabaseUrl = "https://blronpowdhaumjudtgvn.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJscm9ucG93ZGhhdW1qdWR0Z3ZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5ODU4MDAsImV4cCI6MjA4NDU2MTgwMH0.ThzU_Eqgwy0Qx2vTO381R0HHvV1jfhsAZFxY-Aw4hXI";
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// -------------------------
// CHARGER LES EMISSIONS
// -------------------------
export async function loadEmissions() {
    const { data, error } = await supabase
        .from("emissions")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Erreur chargement émissions :", error);
        return;
    }

    displayEmissions(data);
}

// -------------------------
// AFFICHER DANS LA LISTE ADMIN
// -------------------------
function displayEmissions(list) {
    const container = document.getElementById("emissions-admin");
    if (!container) return;

    container.innerHTML = "";

    list.forEach(em => {
        const item = document.createElement("div");
        item.className = "admin-item";

        item.innerHTML = `
            <div class="admin-item-content">
                <h3>${em.titre}</h3>
                <p>${em.horaires}</p>
                <p>${em.description}</p>
            </div>
            <button class="delete-emission" data-id="${em.id}">🗑</button>
        `;

        container.appendChild(item);
    });

    document.querySelectorAll(".delete-emission").forEach(btn => {
        btn.addEventListener("click", () => deleteEmission(btn.dataset.id));
    });
}

// -------------------------
// AJOUTER UNE EMISSION
// -------------------------
async function addEmission() {
    const titre = document.getElementById("emission-nom").value;
    const horaires = document.getElementById("emission-horaires").value;
    const description = document.getElementById("emission-description").value;

    const { error } = await supabase
        .from("emissions")
        .insert([{ titre, horaires, description }]);

    if (error) {
        console.error("Erreur ajout émission :", error);
        return;
    }

    document.getElementById("popup-emission").classList.remove("active");
    loadEmissions();
}

// -------------------------
// SUPPRIMER UNE EMISSION
// -------------------------
async function deleteEmission(id) {
    const { error } = await supabase
        .from("emissions")
        .delete()
        .eq("id", id);

    if (error) {
        console.error("Erreur suppression émission :", error);
        return;
    }

    loadEmissions();
}

// -------------------------
// INITIALISATION DU FORMULAIRE
// -------------------------
export function setupEmissionForm() {

    document.getElementById("add-emission")?.addEventListener("click", () => {
        document.getElementById("popup-emission").classList.add("show");
    });

    document.getElementById("popup-emission-cancel")?.addEventListener("click", () => {
        document.getElementById("popup-emission").classList.remove("show");
    });

    document.getElementById("popup-emission-save")?.addEventListener("click", () => {
        addEmission();
    });
}
