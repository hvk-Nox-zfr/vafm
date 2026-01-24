// Initialisation Supabase
const supabaseUrl = "https://xxxxx.supabase.co"; // ton URL
const supabaseKey = "public-anon-key"; // ta clé
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// -------------------------
// CHARGER LES EMISSIONS
// -------------------------
async function loadEmissions() {
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
    const container = document.getElementById("emissions-list");
    container.innerHTML = "";

    list.forEach(em => {
        const item = document.createElement("div");
        item.className = "emission-item";

        item.innerHTML = `
            <img src="${em.image_url}" class="thumb">
            <div class="info">
                <h3>${em.titre}</h3>
                <p>${em.animateur}</p>
                <p>${em.horaire}</p>
            </div>
            <button class="delete-btn" data-id="${em.id}">🗑</button>
        `;

        container.appendChild(item);
    });

    // Boutons supprimer
    document.querySelectorAll(".delete-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            deleteEmission(btn.dataset.id);
        });
    });
}

// -------------------------
// AJOUTER UNE EMISSION
// -------------------------
async function addEmission() {
    const titre = document.getElementById("titre").value;
    const description = document.getElementById("description").value;
    const animateur = document.getElementById("animateur").value;
    const horaire = document.getElementById("horaire").value;
    const image_url = document.getElementById("image_url").value;

    const { error } = await supabase
        .from("emissions")
        .insert([{
            titre,
            description,
            animateur,
            horaire,
            image_url
        }]);

    if (error) {
        console.error("Erreur ajout émission :", error);
        return;
    }

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
// AU CHARGEMENT
// -------------------------
document.addEventListener("DOMContentLoaded", () => {
    loadEmissions();

    document.getElementById("add-emission-btn").addEventListener("click", () => {
        addEmission();
    });
});

