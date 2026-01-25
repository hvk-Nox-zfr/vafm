import { loadActus, renderActus, setupActuForm } from "./admin-actus.js";
import { loadEmissions, setupEmissionForm } from "./emissions.js";

/* ============================================================
   SUPABASE CLIENT (UNE SEULE FOIS)
============================================================ */

const supabase = window.supabase.createClient(
    "https://blronpowdhaumjudtgvn.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJscm9ucG93ZGhhdW1qdWR0Z3ZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5ODU4MDAsImV4cCI6MjA4NDU2MTgwMH0.ThzU_Eqgwy0Qx2vTO381R0HHvV1jfhsAZFxY-Aw4hXI"
);

document.addEventListener("DOMContentLoaded", async () => {

    /* ============================================================
       NAVIGATION
    ============================================================ */

    const buttons = document.querySelectorAll(".admin-nav button");
    const sections = document.querySelectorAll(".admin-section");

    buttons.forEach(btn => {
        btn.addEventListener("click", () => {
            const target = btn.getAttribute("data-section");
            sections.forEach(sec => sec.classList.remove("show"));
            document.getElementById(target).classList.add("show");
        });
    });

    document.getElementById("actus").classList.add("show");

    /* ============================================================
       ACTUALITÉS
    ============================================================ */

    setupActuForm();
    await loadActus();
    renderActus();

    /* ============================================================
       ÉMISSIONS
    ============================================================ */

    await loadEmissions();
    requestAnimationFrame(() => setupEmissionForm());

    /* ============================================================
       CHARGER LES ANIMATEURS
    ============================================================ */

    async function loadAnimateurs() {
        const { data, error } = await supabase
            .from("animateurs")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Erreur chargement animateurs :", error);
            return [];
        }

        return data;
    }

    /* ============================================================
       UPLOAD IMAGE + SAVE ANIMATEUR
    ============================================================ */

    async function saveAnimateur(anim, file) {
        let image_url = anim.image_url;

        if (file) {
            const fileName = `anim-${Date.now()}-${file.name}`;

            const { error: uploadError } = await supabase
                .storage
                .from("animateurs")
                .upload(fileName, file);

            if (uploadError) {
                console.error("Erreur upload image :", uploadError);
                alert("Erreur lors de l'upload de l'image.");
                return;
            }

            image_url = supabase
                .storage
                .from("animateurs")
                .getPublicUrl(fileName).data.publicUrl;
        }

        if (anim.id) {
            await supabase
                .from("animateurs")
                .update({
                    nom: anim.nom,
                    emission: anim.emission,
                    description: anim.description,
                    image_url
                })
                .eq("id", anim.id);
        } else {
            await supabase
                .from("animateurs")
                .insert([{
                    nom: anim.nom,
                    emission: anim.emission,
                    description: anim.description,
                    image_url
                }]);
        }
    }

    /* ============================================================
       SUPPRESSION
    ============================================================ */

    async function deleteAnimateur(id) {
        await supabase.from("animateurs").delete().eq("id", id);
    }

    /* ============================================================
       AFFICHAGE ADMIN
    ============================================================ */

    async function afficherAnimateursAdmin() {
        const container = document.getElementById("animateurs-list");
        const animateurs = await loadAnimateurs();

        container.innerHTML = "";

        if (animateurs.length === 0) {
            container.innerHTML = "<p>Aucun animateur pour le moment.</p>";
            return;
        }

        animateurs.forEach(anim => {
            const card = document.createElement("div");
            card.className = "admin-card";

            card.innerHTML = `
                <div class="admin-anim-left">
                    <img src="${anim.image_url || 'https://via.placeholder.com/80'}" class="admin-anim-img">
                    <div>
                        <h3>${anim.nom}</h3>
                        <p><strong>${anim.emission}</strong></p>
                        <p>${anim.description}</p>
                    </div>
                </div>

                <div class="actions">
                    <button class="edit">Modifier</button>
                    <button class="delete">Supprimer</button>
                </div>
            `;

            card.querySelector(".edit").addEventListener("click", () => {
                ouvrirPopupAnimateur(anim);
            });

            card.querySelector(".delete").addEventListener("click", async () => {
                if (!confirm("Supprimer cet animateur ?")) return;
                await deleteAnimateur(anim.id);
                afficherAnimateursAdmin();
            });

            container.appendChild(card);
        });
    }

    /* ============================================================
       POPUP
    ============================================================ */

    function ouvrirPopupAnimateur(anim = null) {
        const popup = document.getElementById("popup-animateur");
        const title = document.getElementById("popup-animateur-title");

        const nom = document.getElementById("animateur-nom");
        const emission = document.getElementById("animateur-emission");
        const description = document.getElementById("animateur-description");
        const imageInput = document.getElementById("animateur-image");
        const preview = document.getElementById("preview-image");

        if (!anim) {
            title.textContent = "Nouvel animateur";
            nom.value = "";
            emission.value = "";
            description.value = "";
            preview.src = "";
            preview.classList.add("hidden");
            imageInput.value = "";
            imageInput.dataset.id = "";
        } else {
            title.textContent = "Modifier l’animateur";
            nom.value = anim.nom;
            emission.value = anim.emission;
            description.value = anim.description;
            preview.src = anim.image_url || "";
            preview.classList.toggle("hidden", !anim.image_url);
            imageInput.dataset.id = anim.id;
        }

        popup.classList.add("show");
    }

    document.getElementById("popup-animateur-cancel").addEventListener("click", () => {
        document.getElementById("popup-animateur").classList.remove("show");
    });

    document.getElementById("popup-animateur-save").addEventListener("click", async () => {
        const nom = document.getElementById("animateur-nom").value.trim();
        const emission = document.getElementById("animateur-emission").value.trim();
        const description = document.getElementById("animateur-description").value.trim();
        const file = document.getElementById("animateur-image").files[0];
        const id = document.getElementById("animateur-image").dataset.id;

        if (!nom || !emission || !description) {
            alert("Merci de remplir tous les champs.");
            return;
        }

        await saveAnimateur({ id, nom, emission, description }, file);

        document.getElementById("popup-animateur").classList.remove("show");
        afficherAnimateursAdmin();
    });

    /* ============================================================
       DRAG & DROP
    ============================================================ */

    const dropZone = document.getElementById("drop-zone");
    const imageInput = document.getElementById("animateur-image");
    const preview = document.getElementById("preview-image");

    dropZone.addEventListener("dragover", e => {
        e.preventDefault();
        dropZone.classList.add("dragover");
    });

    dropZone.addEventListener("dragleave", () => {
        dropZone.classList.remove("dragover");
    });

    dropZone.addEventListener("drop", e => {
        e.preventDefault();
        dropZone.classList.remove("dragover");

        const file = e.dataTransfer.files[0];
        if (file) {
            imageInput.files = e.dataTransfer.files;
            preview.src = URL.createObjectURL(file);
            preview.classList.remove("hidden");
        }
    });

    dropZone.addEventListener("click", () => imageInput.click());

    imageInput.addEventListener("change", () => {
        const file = imageInput.files[0];
        if (file) {
            preview.src = URL.createObjectURL(file);
            preview.classList.remove("hidden");
        }
    });

    /* ============================================================
       INIT
    ============================================================ */

    afficherAnimateursAdmin();
});

