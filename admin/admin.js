import { loadActus, renderActus, setupActuForm } from "./admin-actus.js";
import "./emissions.js";


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

    document.getElementById("actus").classList.add("active");

    /* ============================================================
       ACTUALITÉS (SUPABASE)
    ============================================================ */

    setupActuForm();
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

    document.getElementById("popup-animateur-cancel")?.addEventListener("click", fermerPopupAnimateur);

    document.getElementById("popup-animateur-save")?.addEventListener("click", () => {
        const nom = document.getElementById("animateur-nom").value.trim();
        const emission = document.getElementById("animateur-emission").value.trim();
        const description = document.getElementById("animateur-description").value.trim();
        const file = document.getElementById("animateur-image").files[0];

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
        if (!container) return;

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

    document.getElementById("add-animateur")?.addEventListener("click", () => {
        ouvrirPopupAnimateur();
    });

    loadAnimateurs();
    afficherAnimateursAdmin();

