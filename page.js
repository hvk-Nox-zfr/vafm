const params = new URLSearchParams(window.location.search);
const actuId = Number(params.get("id"));

const actus = JSON.parse(localStorage.getItem("vafm_actus")) || [];
const actu = actus.find(a => a.id === actuId);

if (!actu) {
    document.body.innerHTML = "<h2>Article introuvable</h2>";
    throw new Error("Actu introuvable");
}

const canvas = document.getElementById("actu-content");

// -------------------------
// 1️⃣ AFFICHAGE DU TEXTE PRINCIPAL
// -------------------------
canvas.innerHTML = actu.contenu?.texte || "";

// -------------------------
// 2️⃣ AFFICHAGE DES IMAGES FLOTTANTES
// -------------------------
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