import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabase = createClient(
  "https://blronpowdhaumjudtgvn.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJscm9ucG93ZGhhdW1qdWR0Z3ZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5ODU4MDAsImV4cCI6MjA4NDU2MTgwMH0.ThzU_Eqgwy0Qx2vTO381R0HHvV1jfhsAZFxY-Aw4hXI"
);

const params = new URLSearchParams(window.location.search);
const actuId = Number(params.get("id"));

const canvas = document.getElementById("actu-content");

async function chargerActu() {
  if (!actuId || isNaN(actuId)) {
    document.body.innerHTML = "<h2>Article introuvable</h2>";
    console.error("ID d'article manquant ou invalide :", actuId);
    return;
  }

  const { data: actu, error } = await supabase
    .from("actus")
    .select("*")
    .eq("id", actuId)
    .maybeSingle();

  if (error || !actu) {
    document.body.innerHTML = "<h2>Article introuvable</h2>";
    console.error("Erreur chargement actu :", error);
    return;
  }

  if (actu.contenu?.texte) {
    canvas.innerHTML = actu.contenu.texte;
  }

  if (actu.contenu?.images) {
    actu.contenu.images.forEach(block => {
      const x = block.x || "0px";
      const y = block.y || "0px";
      const w = block.width || "200px";
      const h = block.height || "150px";
      const imageUrl = block.url || "";

      const div = document.createElement("div");
      div.className = "block-public";
      div.style.position = "absolute";
      div.style.left = x;
      div.style.top = y;
      div.style.width = w;
      div.style.height = h;

      const img = document.createElement("img");
      img.src = imageUrl;
      img.style.width = "100%";
      img.style.height = "100%";
      img.style.objectFit = "contain";

      div.appendChild(img);
      canvas.appendChild(div);
    });
  }
}

document.addEventListener("DOMContentLoaded", chargerActu);
