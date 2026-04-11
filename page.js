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
    canvas.innerHTML = "<h2>Article introuvable</h2>";
    return;
  }

  let html = actu.texte || "";

  html = html
    .replace(/class="floating-text"/g, 'class="text-block"')
    .replace(/contenteditable="[^"]*"/g, "")
    .replace(/<div class="resize-handle"><\/div>/g, "")
    .replace(/Double-clique pour écrire…/g, "")
    .replace(/draggable="[^"]*"/g, "")
    .replace(/style="cursor: move;?"/g, "");

  canvas.innerHTML = html;

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

