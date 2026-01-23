console.log("ADMIN ACTUS CHARGÉ");

import { supabase } from "./supabase-init.js";

let actus = [];

/* ============================================================
   CHARGER LES ACTUS
============================================================ */
export async function loadActus() {
    console.log("Chargement des actus…");

    const { data, error } = await supabase
        .from("actus")
        .select("*")
        .order("id", { ascending: false });

    console.log("Résultat loadActus :", { data, error });

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
    console.log("Rendu des actus :", actus);

    const container = document.getElementById("actus-list");
    if (!container) return;

    container.innerHTML = "";

    if (actus.length === 0) {
        container.innerHTML = "<p>Aucune actualité pour le moment.</p>";
        return;
    }

    actus.forEach(actu => {
        const id = Number(actu.id);
        console.log("Actu ID :", id, actu);

        const card = document.createElement("div");
        card.className = "admin-card";

        card.innerHTML = `
            <div>
                <div class="admin-image-preview" style="background-image: url('${actu.imageUrl || "assets/default.jpg"}');"></div>
                <h3>${actu.titre}</h3>
                <p>${actu.texte || ""}</p>
                <small>Date prévue : ${actu.date_pub}</small>
                ${actu.published ? `<span class="badge-published">Publié</span>` : `<span class="badge-draft">Brouillon</span>`}
            </div>

            <div class="actions">
                ${actu.published 
                    ? `<button data-action="unpublish">Dépublier</button>` 
                    : `<button data-action="publish">Publier</button>`}
                <button data-action="edit">Modifier</button>
                <button data-action="delete">Supprimer</button>
                <button data-action="edit-content">Éditer le contenu</button>
            </div>
        `;

        /* ============================================================
           PUBLISH
        ============================================================ */
        card.querySelector("[data-action='publish']")?.addEventListener("click", async () => {
            console.log("→ PUBLISH demandé pour ID :", id);

            const { data, error } = await supabase
                .from("actus")
                .update({ published: true })
                .eq("id", id)
                .select();

            console.log("Résultat publish :", { data, error });

            await loadActus();
            renderActus();
        });

        /* ============================================================
           UNPUBLISH
        ============================================================ */
        card.querySelector("[data-action='unpublish']")?.addEventListener("click", async () => {
            console.log("→ UNPUBLISH demandé pour ID :", id);

            const { data, error } = await supabase
                .from("actus")
                .update({ published: false })
                .eq("id", id)
                .select();

            console.log("Résultat unpublish :", { data, error });

            await loadActus();
            renderActus();
        });

        /* ============================================================
           EDIT
        ============================================================ */
        card.querySelector("[data-action='edit']").addEventListener("click", () => {
            console.log("→ EDIT demandé pour ID :", id);

            document.getElementById("actu-titre").value = actu.titre;
            document.getElementById("actu-texte").value = actu.texte;
            document.getElementById("actu-date").value = actu.date_pub;

            const form = document.getElementById("actu-form");
            form.dataset.editId = id;

            document.getElementById("actu-modal").classList.remove("hidden");
        });

        /* ============================================================
           DELETE
        ============================================================ */
        card.querySelector("[data-action='delete']").addEventListener("click", async () => {
            if (!confirm("Supprimer cette actualité ?")) return;

            console.log("→ DELETE demandé pour ID :", id);

            const { data, error } = await supabase
                .from("actus")
                .delete()
                .eq("id", id)
                .select();

            console.log("Résultat delete :", { data, error });

            await loadActus();
            renderActus();
        });

        /* ============================================================
           EDIT CONTENT
        ============================================================ */
        card.querySelector("[data-action='edit-content']").addEventListener("click", () => {
            console.log("→ EDIT CONTENT pour ID :", id);
            window.location.href = `editeur.html?id=${id}`;
        });

        container.appendChild(card);
    });
}

/* ============================================================
   FORMULAIRE AJOUT / MODIF
============================================================ */
export function setupActuForm() {
    const modal = document.getElementById("actu-modal");
    const openBtn = document.getElementById("add-actu");
    const closeBtn = document.getElementById("close-modal");
    const actuForm = document.getElementById("actu-form");

    openBtn?.addEventListener("click", () => {
        console.log("→ OUVERTURE MODAL AJOUT");
        actuForm.reset();
        delete actuForm.dataset.editId;
        modal.classList.remove("hidden");
    });

    closeBtn?.addEventListener("click", () => {
        console.log("→ FERMETURE MODAL");
        modal.classList.add("hidden");
    });

    actuForm?.addEventListener("submit", async (e) => {
        e.preventDefault();

        const titre = document.getElementById("actu-titre").value.trim();
        const texte = document.getElementById("actu-texte").value.trim();
        const date = document.getElementById("actu-date").value || new Date().toISOString().slice(0, 10);
        const file = document.getElementById("actu-image").files[0];
        const editId = Number(actuForm.dataset.editId);

        console.log("→ SUBMIT FORM :", { titre, texte, date, editId });

        if (!titre || !texte) {
            alert("Titre et texte obligatoires.");
            return;
        }

        let imageUrl = "https://vafmlaradio.fr/assets/default.jpg";

        if (file) {
            const fileName = `actus/${Date.now()}-${file.name}`;
            console.log("→ UPLOAD IMAGE :", fileName);

            const { error: uploadError } = await supabase.storage
                .from("uploads")
                .upload(fileName, file);

            console.log("Résultat upload :", uploadError);

            if (uploadError) {
                alert("Erreur lors de l’upload de l’image.");
                return;
            }

            imageUrl = supabase.storage
                .from("uploads")
                .getPublicUrl(fileName).data.publicUrl;
        }

        let error;

        if (editId) {
            console.log("→ UPDATE actu ID :", editId);

            ({ error } = await supabase.from("actus").update({
                titre,
                texte,
                date_pub: date,
                imageUrl
            }).eq("id", editId));
        } else {
            console.log("→ INSERT nouvelle actu");

            ({ error } = await supabase.from("actus").insert([{
                titre,
                texte,
                date_pub: date,
                imageUrl,
                published: false,
                contenu: {}
            }]));
        }

        console.log("Résultat submit :", error);

        if (error) {
            alert("Erreur Supabase : " + error.message);
            return;
        }

        modal.classList.add("hidden");
        actuForm.reset();
        delete actuForm.dataset.editId;

        await loadActus();
        renderActus();
    });
}
