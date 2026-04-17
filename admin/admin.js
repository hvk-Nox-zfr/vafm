import { loadActus, renderActus, setupActuForm } from "./admin-actus.js";
import { loadEmissions, setupEmissionForm } from "./emissions.js";

/* ============================================================
   Helper : attendre et exposer le client Supabase UMD
   (compatible avec supabase-init.js qui expose window.__supabaseReady)
============================================================ */

async function waitForSupabase(timeout = 10000) {
  // si la promesse d'init existe, on l'attend
  if (window.__supabaseReady && typeof window.__supabaseReady.then === "function") {
    try {
      await Promise.race([
        window.__supabaseReady,
        new Promise((_, rej) => setTimeout(() => rej(new Error("Supabase init timeout")), timeout))
      ]);
    } catch (err) {
      console.error("waitForSupabase: erreur ou timeout", err);
      throw err;
    }
  }

  // récupérer le client via getDb() si disponible, sinon via __supabaseClient
  const client = (typeof window.getDb === "function" && window.getDb()) || window.__supabaseClient || window.supabaseClient || window.supabase;
  if (!client) {
    throw new Error("Supabase client non disponible après attente");
  }

  // exposer de façon conviviale pour le reste du code / modules
  window.supabase = client;
  window.supabaseClient = client;
  return client;
}

/* wrapper pratique pour exécuter des callbacks avec le client */
async function withDb(fn) {
  const db = await waitForSupabase();
  return fn(db);
}

/* ============================================================
   Main init
============================================================ */

(async function initAdmin() {
  try {
    // attendre et exposer le client Supabase avant tout
    const supabase = await waitForSupabase();

    // DOM ready
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
          const el = document.getElementById(target);
          if (el) el.classList.add("active");
        });
      });

      // default
      const defaultSection = document.getElementById("actus");
      if (defaultSection) defaultSection.classList.add("active");

      /* ============================================================
         ACTUALITÉS
      ============================================================ */

      try {
        setupActuForm();
        // loadActus et renderActus peuvent utiliser window.supabase si nécessaire
        await loadActus();
        renderActus();
      } catch (err) {
        console.error("Erreur initialisation actualités :", err);
      }

      /* ============================================================
         ÉMISSIONS
      ============================================================ */

      try {
        await loadEmissions();
        requestAnimationFrame(() => setupEmissionForm());
      } catch (err) {
        console.error("Erreur initialisation émissions :", err);
      }

      /* ============================================================
         ANIMATEURS — CHARGEMENT / CRUD
      ============================================================ */

      async function loadAnimateurs() {
        try {
          const { data, error } = await supabase
            .from("animateurs")
            .select("*")
            .order("created_at", { ascending: false });

          if (error) {
            console.error("Erreur chargement animateurs :", error);
            return [];
          }
          return data || [];
        } catch (err) {
          console.error("loadAnimateurs exception :", err);
          return [];
        }
      }

      async function saveAnimateur(anim, file) {
        try {
          let image_url = anim.image_url || null;

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

            const { data: publicData } = await supabase
              .storage
              .from("animateurs")
              .getPublicUrl(fileName);

            image_url = publicData?.publicUrl || null;
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
        } catch (err) {
          console.error("saveAnimateur error :", err);
          alert("Une erreur est survenue lors de la sauvegarde.");
        }
      }

      async function deleteAnimateur(id) {
        try {
          await supabase.from("animateurs").delete().eq("id", id);
        } catch (err) {
          console.error("deleteAnimateur error :", err);
          alert("Erreur lors de la suppression.");
        }
      }

      async function afficherAnimateursAdmin() {
        const container = document.getElementById("animateurs-list");
        if (!container) return;

        const animateurs = await loadAnimateurs();

        container.innerHTML = "";

        if (!Array.isArray(animateurs) || animateurs.length === 0) {
          container.innerHTML = "<p>Aucun animateur pour le moment.</p>";
          return;
        }

        animateurs.forEach(anim => {
          const card = document.createElement("div");
          card.className = "admin-card";

          card.innerHTML = `
            <div class="admin-anim-left">
              <img src="${anim.image_url || 'https://via.placeholder.com/80'}" class="admin-anim-img" alt="${(anim.nom || '').replace(/"/g,'')}" />
              <div>
                <h3>${escapeHtml(anim.nom || '—')}</h3>
                <p><strong>${escapeHtml(anim.emission || '—')}</strong></p>
                <p>${escapeHtml(anim.description || '')}</p>
              </div>
            </div>

            <div class="actions">
              <button class="edit">Modifier</button>
              <button class="delete">Supprimer</button>
            </div>
          `;

          const editBtn = card.querySelector(".edit");
          const delBtn = card.querySelector(".delete");

          if (editBtn) {
            editBtn.addEventListener("click", () => ouvrirPopupAnimateur(anim));
          }
          if (delBtn) {
            delBtn.addEventListener("click", async () => {
              if (!confirm("Supprimer cet animateur ?")) return;
              await deleteAnimateur(anim.id);
              afficherAnimateursAdmin();
            });
          }

          container.appendChild(card);
        });
      }

      /* ============================================================
         ANIMATEURS — POPUP
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
          if (nom) nom.value = "";
          if (emission) emission.value = "";
          if (description) description.value = "";
          if (preview) { preview.src = ""; preview.classList.add("hidden"); }
          if (imageInput) { imageInput.value = ""; imageInput.dataset.id = ""; }
        } else {
          title.textContent = "Modifier l’animateur";
          if (nom) nom.value = anim.nom || "";
          if (emission) emission.value = anim.emission || "";
          if (description) description.value = anim.description || "";
          if (preview) { preview.src = anim.image_url || ""; preview.classList.toggle("hidden", !anim.image_url); }
          if (imageInput) imageInput.dataset.id = anim.id || "";
        }

        if (popup) popup.classList.add("show");
      }

      const popupCancel = document.getElementById("popup-animateur-cancel");
      if (popupCancel) {
        popupCancel.addEventListener("click", () => {
          const popup = document.getElementById("popup-animateur");
          if (popup) popup.classList.remove("show");
        });
      }

      const popupSave = document.getElementById("popup-animateur-save");
      if (popupSave) {
        popupSave.addEventListener("click", async () => {
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

          const popup = document.getElementById("popup-animateur");
          if (popup) popup.classList.remove("show");
          afficherAnimateursAdmin();
        });
      }

      /* ============================================================
         DRAG & DROP IMAGE
      ============================================================ */

      const dropZone = document.getElementById("drop-zone");
      const imageInput = document.getElementById("animateur-image");
      const preview = document.getElementById("preview-image");

      if (dropZone) {
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

          const file = e.dataTransfer.files && e.dataTransfer.files[0];
          if (file && imageInput) {
            imageInput.files = e.dataTransfer.files;
            preview.src = URL.createObjectURL(file);
            preview.classList.remove("hidden");
          }
        });

        dropZone.addEventListener("click", () => {
          if (imageInput) imageInput.click();
        });
      }

      if (imageInput) {
        imageInput.addEventListener("change", () => {
          const file = imageInput.files && imageInput.files[0];
          if (file && preview) {
            preview.src = URL.createObjectURL(file);
            preview.classList.remove("hidden");
          }
        });
      }

      const addAnimateurBtn = document.getElementById("add-animateur");
      if (addAnimateurBtn) {
        addAnimateurBtn.addEventListener("click", () => ouvrirPopupAnimateur());
      }

      /* ============================================================
         INIT : afficher animateurs
      ============================================================ */

      try {
        await afficherAnimateursAdmin();
      } catch (err) {
        console.error("Erreur affichage animateurs au démarrage :", err);
      }
    });
  } catch (err) {
    console.error("Initialisation admin échouée :", err);
    // Optionnel : afficher un message utilisateur
    const container = document.getElementById("admin-content");
    if (container) {
      container.innerHTML = `<div class="error">Impossible d'initialiser l'administration : ${escapeHtml(err.message || 'Erreur')}</div>`;
    }
  }
})();

/* ============================================================
   Helpers
=========================================================== */

function escapeHtml(s = '') {
  return String(s).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

