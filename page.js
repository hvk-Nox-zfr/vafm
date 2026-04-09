import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabase = createClient(
  "https://blronpowdhaumjudtgvn.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJscm9ucG93ZGhhdW1qdWR0Z3ZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5ODU4MDAsImV4cCI6MjA4NDU2MTgwMH0.ThzU_Eqgwy0Qx2vTO381R0HHvV1jfhsAZFxY-Aw4hXI"
);

const params = new URLSearchParams(window.location.search);
const idParam = params.get("id");
const actuId = Number(idParam);

// ⚠️ Le conteneur public
const publicPage = document.querySelector("#public-page");

// ⚠️ Le wrapper pour les images flottantes
const wrapper = document.querySelector(".canvas-wrapper");

async function chargerActu() {
  if (!idParam || isNaN(actuId)) {
    publicPage.innerHTML = "<h2>Article introuvable</h2>";
    return;
  }

  const { data: actu, error } = await supabase
    .from("actus")
    .select("*")
    .eq("id", actuId)
    .maybeSingle();

  if (error || !actu) {
    publicPage.innerHTML = "<h2>Article introuvable</h2>";
    return;
  }

  /* ============================================================
     🔥 NETTOYAGE DU HTML AVANT AFFICHAGE PUBLIC
  ============================================================ */
  let html = actu.texte || "";

  html = html
    // remplacer floating-text par un bloc normal
    .replace(/class="floating-text"/g, 'class="text-block"')

    // supprimer les attributs d’édition
    .replace(/contenteditable="[^"]*"/g, "")
    .replace(/draggable="[^"]*"/g, "")
    .replace(/style="cursor: move;?"/g, "")

    // supprimer les poignées de resize
    .replace(/<div class="resize-handle"><\/div>/g, "")

    // supprimer le placeholder
    .replace(/Double-clique pour écrire…/g, "")

    // supprimer les DIV flottants vides
    .replace(/<div class="floating-text"[^>]*><\/div>/g, "");

  // Injection dans la page publique
  publicPage.innerHTML = html;

  /* ============================================================
     🖼️ IMAGES FLOTTANTES
  ============================================================ */
  if (actu.contenu?.images) {
    actu.contenu.images.forEach(block => {
      const div = document.createElement("div");
      div.className = "block-public";

      div.style.left = block.x;
      div.style.top = block.y;
      div.style.width = block.width;
      div.style.height = block.height;
      div.style.position = "absolute";

      const img = document.createElement("img");
      img.src = block.url;

      img.style.position = "absolute";
      img.style.left = block.offsetX;
      img.style.top = block.offsetY;
      img.style.width = block.imgWidth;
      img.style.height = block.imgHeight;
      img.style.objectFit = "contain";

      div.appendChild(img);
      wrapper.appendChild(div);
    });
  }
}

document.addEventListener("DOMContentLoaded", chargerActu);
