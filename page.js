import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabase = createClient(
  "https://blronpowdhaumjudtgvn.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJscm9ucG93ZGhhdW1qdWR0Z3ZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5ODU4MDAsImV4cCI6MjA4NDU2MTgwMH0.ThzU_Eqgwy0Qx2vTO381R0HHvV1jfhsAZFxY-Aw4hXI"
);

const params = new URLSearchParams(window.location.search);
const idParam = params.get("id");
const actuId = Number(idParam);

// ⚠️ IMPORTANT : on récupère le wrapper, pas seulement le canvas
const wrapper = document.querySelector(".canvas-wrapper");
const canvas = document.getElementById("actu-content");

async function chargerActu() {
  if (idParam === null || isNaN(actuId)) {
    document.body.innerHTML = "<h2>Article introuvable</h2>";
    return;
  }

  const { data: actu, error } = await supabase
    .from("actus")
    .select("*")
    .eq("id", actuId)
    .maybeSingle();

  if (error || !actu) {
    document.body.innerHTML = "<h2>Article introuvable</h2>";
    return;
  }

  // 📝 Texte
  if (actu.contenu?.texte) {
    canvas.innerHTML = actu.contenu.texte;
  }

  // 🖼️ Images flottantes
  if (actu.contenu?.images) {
    actu.contenu.images.forEach(block => {
      const div = document.createElement("div");
      div.className = "block-public";

      // mêmes positions que dans l’éditeur
      div.style.left = block.x;
      div.style.top = block.y;
      div.style.width = block.width;
      div.style.height = block.height;
      div.style.position = "absolute";

      const img = document.createElement("img");
      img.src = block.url;

      // mêmes offsets internes que dans l’éditeur
      img.style.position = "absolute";
      img.style.left = block.offsetX;
      img.style.top = block.offsetY;
      img.style.width = block.imgWidth;
      img.style.height = block.imgHeight;
      img.style.objectFit = "contain";

      div.appendChild(img);

      // ⚠️ IMPORTANT : on ajoute dans le wrapper, pas dans le canvas
      wrapper.appendChild(div);
    });
  }
}

document.addEventListener("DOMContentLoaded", chargerActu);

