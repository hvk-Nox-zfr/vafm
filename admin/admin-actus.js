import { supabase } from "./supabase-init.js";

export let actus = [];

/* ============================================================
   CHARGER LES ACTUS
============================================================ */
export async function loadActus() {
    const { data, error } = await supabase
        .from("actus")
        .select("*")
        .order("date_pub", { ascending: false });

    if (error) {
        console.error("Erreur chargement actus :", error);
        actus = [];
    } else {
        actus = data;
    }
}

/* ============================================================
   AFFICHER LES ACTUS
============================================================ */
export function renderActus() {
    const container = document.getElementById("actus-list");
    if (!container) return;

    container.innerHTML = "";

    if (actus.length === 0) {
        container.innerHTML = "<p>Aucune actualité pour le moment.</p>";
        return;
    }

    actus.forEach(actu => {
        const card = document.createElement("div");
        card.className = "admin-card";

        card.innerHTML = `
            <div>
                <div class="admin-image-preview" style="background-image: url('${actu.imageUrl || "assets/default.jpg"}');"></div>
                <h3>${actu.titre}</h3>
                <p>${actu.texte}</p>
                <small>Date prévue : ${actu.date_pub}</small>
                ${actu.published ? `<span class="badge-published">Publié</span>` : `<span class="badge-draft">Brouillon</span>`}
            </div>

            <div class="actions">
                ${actu.published ? `<button class="unpublish">Dépublier</button>` : `<button class="publish">Publier</button>`}
                <button class="edit">Modifier</button>
                <button class="delete">Supprimer</button>
                <button class="edit-content">Éditer le contenu</button>
            </div>
        `;

        /* Publier */
        card.querySelector(".publish")?.addEventListener("click", async () => {
            await supabase.from("actus").update({ published: true }).eq("id", actu.id);
            await loadActus();
            renderActus();
        });

        /* Dépublier */
        card.querySelector(".unpublish")?.addEventListener("click", async () => {
            await supabase.from("actus").update({ published: false }).eq("id", actu.id);
            await loadActus();
            renderActus();
        });

        /* Modifier */
        card.querySelector(".edit").addEventListener("click", () => {
            document.getElementById("actu-titre").value = actu.titre;
            document.getElementById("actu-texte").value = actu.texte;
            document.getElementById("actu-date").value = actu.date_pub;
            document.getElementById("actu-image").value = actu.imageUrl || "";

            const form = document.getElementById("actu-form");
            form.dataset.editId = actu.id;

            document.getElementById("actu-modal").classList.remove("hidden");
        });

        /* Supprimer */
        card.querySelector(".delete").addEventListener("click", async () => {
            if (!confirm("Supprimer cette actualité ?")) return;
            await supabase.from("actus").delete().eq("id", actu.id);
            await loadActus();
            renderActus();
        });

        /* Éditer contenu */
        card.querySelector(".edit-content").addEventListener("click", () => {
            if (!actu.id) {
                alert("ID introuvable pour cette actu.");
                return;
            }
            window.location.href = `editeur.html?id=${actu.id}`;
        });

        container.appendChild(card);
    });
}

/* ============================================================
   FORMULAIRE AJOUT / MODIF
============================================================ */

document.addEventListener("DOMContentLoaded", () => {
    const modal = document.getElementById("actu-modal");
    const openBtn = document.getElementById("add-actu");
    const closeBtn = document.getElementById("close-modal");
    const actuForm = document.getElementById("actu-form");

    openBtn?.addEventListener("click", () => {
        actuForm.reset();
        delete actuForm.dataset.editId;
        modal.classList.remove("hidden");
    });

    closeBtn?.addEventListener("click", () => {
        modal.classList.add("hidden");
    });

    actuForm?.addEventListener("submit", async (e) => {
        e.preventDefault();

        const titre = document.getElementById("actu-titre").value.trim();
        const texte = document.getElementById("actu-texte").value.trim();
        const date = document.getElementById("actu-date").value || new Date().toISOString().slice(0, 10);
        const imageUrl = document.getElementById("actu-image").value.trim();
        const editId = actuForm.dataset.editId;

        if (!titre || !texte) {
            alert("Titre et texte obligatoires.");
            return;
        }

        if (editId) {
            await supabase.from("actus").update({
                titre,
                texte,
                date_pub: date,
                imageUrl
            }).eq("id", editId);
        } else {
            await supabase.from("actus").insert([{
                titre,
                texte,
                date_pub: date,
                imageUrl,
                published: false,
                contenu: {}
            }]);
        }

        modal.classList.add("hidden");
        actuForm.reset();
        delete actuForm.dataset.editId;

        await loadActus();
        renderActus();
    });
});
