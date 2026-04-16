// page.js

// Ne pas déclarer `supabase` au top-level pour éviter les conflits globaux

const params = new URLSearchParams(window.location.search);
const idParam = params.get("id");
const actuId = Number(idParam);

const wrapper = document.querySelector(".canvas-wrapper");
const canvas = document.getElementById("actu-content");

async function chargerActu() {
  // Récupérer le client Supabase localement (getter central ou fallback)
  const supabase = (window.getDb && window.getDb()) || window.__supabaseClient;
  if (!supabase) {
    console.error("❌ Client Supabase non disponible");
    if (canvas) canvas.innerHTML = "<h2>Impossible de charger l'article</h2>";
    return;
  }

  if (!canvas) return;

  if (!idParam || isNaN(actuId)) {
    canvas.innerHTML = "<h2>Article introuvable</h2>";
    return;
  }

  try {
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
    let html = String(actu.texte || "");

    html = html
      .replace(/class="floating-text"/g, 'class="text-block"')
      .replace(/contenteditable="[^"]*"/g, "")
      .replace(/<div class="resize-handle"><\/div>/g, "")
      .replace(/Double-clique pour écrire…/g, "")
      .replace(/draggable="[^"]*"/g, "")
      .replace(/style="cursor: move;?"/g, "");

    canvas.innerHTML = html;

    // --- Affichage des images positionnées ---
    if (actu.contenu?.images && Array.isArray(actu.contenu.images) && wrapper) {
      // vider d'éventuels blocs précédents
      // (utile si la fonction peut être rappelée)
      const existing = wrapper.querySelectorAll(".block-public");
      existing.forEach(n => n.remove());

      actu.contenu.images.forEach(block => {
        const div = document.createElement("div");
        div.className = "block-public";

        // Sécurisation des valeurs (ajouter unités si nécessaire)
        div.style.position = "absolute";
        div.style.left = typeof block.x === "string" ? block.x : (block.x != null ? `${block.x}px` : "0px");
        div.style.top = typeof block.y === "string" ? block.y : (block.y != null ? `${block.y}px` : "0px");
        div.style.width = typeof block.width === "string" ? block.width : (block.width != null ? `${block.width}px` : "200px");
        div.style.height = typeof block.height === "string" ? block.height : (block.height != null ? `${block.height}px` : "200px");

        const img = document.createElement("img");
        img.src = block.url || "";
        img.alt = block.alt || "Image de l'article";

        img.style.position = "absolute";
        img.style.left = typeof block.offsetX === "string" ? block.offsetX : (block.offsetX != null ? `${block.offsetX}px` : "0px");
        img.style.top = typeof block.offsetY === "string" ? block.offsetY : (block.offsetY != null ? `${block.offsetY}px` : "0px");
        img.style.width = typeof block.imgWidth === "string" ? block.imgWidth : (block.imgWidth != null ? `${block.imgWidth}px` : "100%");
        img.style.height = typeof block.imgHeight === "string" ? block.imgHeight : (block.imgHeight != null ? `${block.imgHeight}px` : "100%");
        img.style.objectFit = "contain";

        div.appendChild(img);
        wrapper.appendChild(div);
      });
    }
  } catch (e) {
    console.error("❌ Erreur lors du chargement de l'article :", e);
    canvas.innerHTML = "<h2>Impossible de charger l'article</h2>";
  }
}

document.addEventListener("DOMContentLoaded", chargerActu);
