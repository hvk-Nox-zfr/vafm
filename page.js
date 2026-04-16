// Connexion Supabase (client global unique)
const supabase = window.__supabaseClient;

const params = new URLSearchParams(window.location.search);
const idParam = params.get("id");
const actuId = Number(idParam);

const wrapper = document.querySelector(".canvas-wrapper");
const canvas = document.getElementById("actu-content");

async function chargerActu() {
  if (!idParam || isNaN(actuId)) {
    canvas.innerHTML = "<h2>Article introuvable</h2>";
    return;
  }

  const { data: actu, error } = await supabase
    .from("actus")
    .select("*")
    .eq("id", actuId)
    .maybeSingle();

  if (error || !actu) {
    console.error("❌ Erreur Supabase :", error);
    canvas.innerHTML = "<h2>Article introuvable</h2>";
    return;
  }

  // --- Nettoyage du HTML avant affichage ---
  let html = actu.texte || "";

  html = html
    .replace(/class="floating-text"/g, 'class="text-block"')
    .replace(/contenteditable="[^"]*"/g, "")
    .replace(/<div class="resize-handle"><\/div>/g, "")
    .replace(/Double-clique pour écrire…/g, "")
    .replace(/draggable="[^"]*"/g, "")
    .replace(/style="cursor: move;?"/g, "");

  canvas.innerHTML = html;

  // --- Affichage des images positionnées ---
  if (actu.contenu?.images && Array.isArray(actu.contenu.images)) {
    actu.contenu.images.forEach(block => {
      const div = document.createElement("div");
      div.className = "block-public";

      // Sécurisation des valeurs
      div.style.position = "absolute";
      div.style.left = block.x || "0px";
      div.style.top = block.y || "0px";
      div.style.width = block.width || "200px";
      div.style.height = block.height || "200px";

      const img = document.createElement("img");
      img.src = block.url || "";
      img.alt = "Image de l'article";

      img.style.position = "absolute";
      img.style.left = block.offsetX || "0px";
      img.style.top = block.offsetY || "0px";
      img.style.width = block.imgWidth || "100%";
      img.style.height = block.imgHeight || "100%";
      img.style.objectFit = "contain";

      div.appendChild(img);
      wrapper.appendChild(div);
    });
  }
}

document.addEventListener("DOMContentLoaded", chargerActu);

