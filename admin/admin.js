/* ============================================================
   ADMIN.JS — VERSION CORRIGÉE
============================================================ */

import { supabase } from "./supabase-init.js";
import { loadActus, renderActus } from "./admin-actus.js";

document.addEventListener("DOMContentLoaded", async () => {

    /* ============================================================
       NAVIGATION ENTRE SECTIONS
    ============================================================ */

    const buttons = document.querySelectorAll(".admin-nav button");
    const sections = document.querySelectorAll(".admin-section");

    buttons.forEach(btn => {
        btn.addEventListener("click", () => {
            const target = btn.getAttribute("data-section");

            sections.forEach(sec => sec.classList.remove("active"));
            document.getElementById(target).classList.add("active");
        });
    });

    // Section par défaut
    document.getElementById("actus").classList.add("active");

    /* ============================================================
       MODAL ACTUS (géré par admin-actus.js)
    ============================================================ */

    await loadActus();
    renderActus();

    /* ============================================================
       ANIMATEURS (LOCALSTORAGE)
    ============================================================ */

    const ANIMATEURS_KEY = "vafm_animateurs";
    let animateurs = [];
    let animateurEditIndex = null;

    function loadAnimateurs() {
        const saved = localStorage.getItem(ANIMATEURS_KEY);
        animateurs = saved ? JSON.parse(saved) : [];
    }

    function saveAnimateurs() {
        localStorage.setItem(ANIMATEURS_KEY, JSON.stringify(animateurs));
    }

    function ouvrirPopupAnimateur(index = null) {
        const popup = document.getElementById("popup-animateur");
        const title = document.getElementById("popup-animateur-title");

        const nom = document.getElementById("animateur-nom");
        const emission = document.getElementById("animateur-emission");
        const description = document.getElementById("animateur-description");
        const imageInput = document.getElementById("animateur-image");

        animateurEditIndex = index;

        if (index === null) {
            title.textContent = "Nouvel animateur";
            nom.value = "";
            emission.value = "";
            description.value = "";
            imageInput.value = "";
        } else {
            const anim = animateurs[index];
            title.textContent = "Modifier l’animateur";
            nom.value = anim.nom;
            emission.value = anim.emission;
            description.value = anim.description;
            imageInput.value = "";
        }

        popup.classList.add("show");
    }

    function fermerPopupAnimateur() {
        document.getElementById("popup-animateur").classList.remove("show");
    }

    document.getElementById("popup-animateur-cancel").addEventListener("click", fermerPopupAnimateur);

    document.getElementById("popup-animateur-save").addEventListener("click", () => {
        const nom = document.getElementById("animateur-nom").value.trim();
        const emission = document.getElementById("animateur-emission").value.trim();
        const description = document.getElementById("animateur-description").value.trim();
        const imageInput = document.getElementById("animateur-image");
        const file = imageInput.files[0];

        if (!nom || !emission || !description) {
            alert("Merci de remplir tous les champs.");
            return;
        }

        let imageUrl = "";
        if (file) {
            imageUrl = URL.createObjectURL(file);
        } else if (animateurEditIndex !== null) {
            imageUrl = animateurs[animateurEditIndex].imageUrl || "";
        }

        const newAnim = { nom, emission, description, imageUrl };

        if (animateurEditIndex === null) {
            animateurs.push(newAnim);
        } else {
            animateurs[animateurEditIndex] = newAnim;
        }

        saveAnimateurs();
        afficherAnimateursAdmin();
        fermerPopupAnimateur();
    });

    function afficherAnimateursAdmin() {
        const container = document.getElementById("animateurs-list");
        container.innerHTML = "";

        if (animateurs.length === 0) {
            container.innerHTML = "<p>Aucun animateur pour le moment.</p>";
            return;
        }

        animateurs.forEach((anim, index) => {
            const card = document.createElement("div");
            card.className = "admin-card";

            card.innerHTML = `
                <div class="admin-anim-left">
                    <img src="${anim.imageUrl || 'https://via.placeholder.com/80'}" class="admin-anim-img">
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
                ouvrirPopupAnimateur(index);
            });

            card.querySelector(".delete").addEventListener("click", () => {
                if (!confirm("Supprimer cet animateur ?")) return;
                animateurs.splice(index, 1);
                saveAnimateurs();
                afficherAnimateursAdmin();
            });

            container.appendChild(card);
        });
    }

    document.getElementById("add-animateur").addEventListener("click", () => {
        ouvrirPopupAnimateur();
    });

    loadAnimateurs();
    afficherAnimateursAdmin();
});


/* ============================================================
   ÉMISSIONS (POPUP)
============================================================ */

let emissionEditIndex = null;

function ouvrirPopupEmission(index = null) {
    const popup = document.getElementById("popup-emission");
    const title = document.getElementById("popup-emission-title");

    const nom = document.getElementById("emission-nom");
    const horaires = document.getElementById("emission-horaires");
    const description = document.getElementById("emission-description");

    emissionEditIndex = index;

    const saved = JSON.parse(localStorage.getItem("vafm_emissions")) || [];

    if (index === null) {
        title.textContent = "Nouvelle émission";
        nom.value = "";
        horaires.value = "";
        description.value = "";
    } else {
        const em = saved[index];
        title.textContent = "Modifier l’émission";
        nom.value = em.nom;
        horaires.value = em.horaires;
        description.value = em.description;
    }

    popup.classList.add("show");
}

function fermerPopupEmission() {
    document.getElementById("popup-emission").classList.remove("show");
}

document.getElementById("popup-emission-cancel").addEventListener("click", fermerPopupEmission);

document.getElementById("popup-emission-save").addEventListener("click", () => {
    const nom = document.getElementById("emission-nom").value.trim();
    const horaires = document.getElementById("emission-horaires").value.trim();
    const description = document.getElementById("emission-description").value.trim();

    if (!nom || !horaires || !description) {
        alert("Merci de remplir tous les champs.");
        return;
    }

    let emissions = JSON.parse(localStorage.getItem("vafm_emissions")) || [];

    const nouvelleEmission = { nom, horaires, description };

    if (emissionEditIndex === null) {
        emissions.push(nouvelleEmission);
    } else {
        emissions[emissionEditIndex] = nouvelleEmission;
    }

    localStorage.setItem("vafm_emissions", JSON.stringify(emissions));

    afficherEmissionsAdmin();
    fermerPopupEmission();
});

function afficherEmissionsAdmin() {
    const container = document.getElementById("emissions-admin");
    if (!container) return;

    const emissions = JSON.parse(localStorage.getItem("vafm_emissions")) || [];

    container.innerHTML = "";

    emissions.forEach((em, index) => {
        const div = document.createElement("div");
        div.className = "admin-item";

        div.innerHTML = `
            <strong>${em.nom}</strong><br>
            <em>${em.horaires}</em><br>
            ${em.description}<br><br>

            <button onclick="ouvrirPopupEmission(${index})">Modifier</button>
            <button onclick="supprimerEmission(${index})" class="danger">Supprimer</button>
        `;

        container.appendChild(div);
    });
}

document.getElementById("add-emission").addEventListener("click", () => {
    ouvrirPopupEmission();
});

function supprimerEmission(index) {
    let emissions = JSON.parse(localStorage.getItem("vafm_emissions")) || [];
    emissions.splice(index, 1);
    localStorage.setItem("vafm_emissions", JSON.stringify(emissions));
    afficherEmissionsAdmin();
}

afficherEmissionsAdmin();

// -------------------------
// DROPZONE ANIMATEUR
// -------------------------
const dropZone = document.getElementById("drop-zone");
const fileInput = document.getElementById("animateur-image");
const preview = document.getElementById("preview-image");

let animateurImageBase64 = ""; // image finale enregistrée

if (dropZone) {

    // Empêche le comportement par défaut
    ["dragenter", "dragover", "dragleave", "drop"].forEach(eventName => {
        dropZone.addEventListener(eventName, e => e.preventDefault());
        dropZone.addEventListener(eventName, e => e.stopPropagation());
    });

    // Style visuel
    dropZone.addEventListener("dragover", () => {
        dropZone.classList.add("dragover");
    });

    dropZone.addEventListener("dragleave", () => {
        dropZone.classList.remove("dragover");
    });

    // Dépôt d'image
    dropZone.addEventListener("drop", e => {
        dropZone.classList.remove("dragover");

        const file = e.dataTransfer.files[0];
        if (!file || !file.type.startsWith("image/")) return;

        const reader = new FileReader();
        reader.onload = () => {
            animateurImageBase64 = reader.result;
            preview.src = reader.result;
            preview.classList.remove("hidden");
        };
        reader.readAsDataURL(file);
    });

    // Clique pour parcourir
    dropZone.addEventListener("click", () => {
        fileInput.click();
    });

    // Sélection via input
    fileInput.addEventListener("change", () => {
        const file = fileInput.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
            animateurImageBase64 = reader.result;
            preview.src = reader.result;
            preview.classList.remove("hidden");
        };
        reader.readAsDataURL(file);
    });
}

document.getElementById("popup-animateur-save").addEventListener("click", () => {

    const animateur = {
        nom: document.getElementById("animateur-nom").value,
        emission: document.getElementById("animateur-emission").value,
        description: document.getElementById("animateur-description").value,
        photo: animateurImageBase64 // ← l’image est ici
    };

    // tu l’ajoutes à ton tableau animateurs
    // puis tu sauvegardes dans localStorage

});
