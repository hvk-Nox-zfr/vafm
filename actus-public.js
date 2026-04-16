// actus-public.js

async function chargerActusPubliques() {
  const db = (window.getDb && window.getDb()) || window.__supabaseClient;
  const container = document.getElementById("actus-public");
  if (!container) return;

  container.innerHTML = "<p>Chargement...</p>";

  try {
    const { data, error } = await db
      .from("actus")
      .select("id, titre, texte, date_pub, imageUrl")
      .eq("published", true)
      .order("date_pub", { ascending: false });

    container.innerHTML = ""; // reset propre

    if (error) {
      console.error("❌ Erreur Supabase :", error);
      container.innerHTML = "<p>Impossible de charger les actualités.</p>";
      return;
    }

    if (!data || data.length === 0) {
      container.innerHTML = "<p>Aucune actualité pour le moment.</p>";
      return;
    }

    // Si 4 actus ou moins → pas de carousel
    if (data.length <= 4) {
      data.forEach(actu => container.appendChild(creerCarteActu(actu)));
      return;
    }

    // Mode carousel
    container.classList.add("carousel-paged");

    const btnLeft = document.createElement("button");
    btnLeft.className = "carousel-btn left";
    btnLeft.textContent = "‹";

    const track = document.createElement("div");
    track.className = "carousel-track";

    data.forEach(actu => track.appendChild(creerCarteActu(actu)));

    const btnRight = document.createElement("button");
    btnRight.className = "carousel-btn right";
    btnRight.textContent = "›";

    container.appendChild(btnLeft);
    container.appendChild(track);
    container.appendChild(btnRight);

    // activerCarousel peut être défini ailleurs, vérifier avant d'appeler
    if (typeof activerCarousel === "function") {
      activerCarousel(track, btnLeft, btnRight);
    } else {
      console.warn("activerCarousel non défini, affichage sans carousel");
    }
  } catch (e) {
    console.error("❌ Erreur lors du chargement des actualités :", e);
    container.innerHTML = "<p>Impossible de charger les actualités.</p>";
  }
}

function creerCarteActu(actu) {
  const card = document.createElement("div");
  card.className = "actu-card";

  const link = document.createElement("a");
  link.href = `./page.html?id=${encodeURIComponent(actu.id)}`;
  link.className = "actu-link";

  const image = document.createElement("div");
  image.className = "actu-image";
  const imageUrl = actu.imageUrl || "/assets/default.jpg";
  image.style.backgroundImage = `url('${escapeAttribute(imageUrl)}')`;

  const title = document.createElement("h3");
  title.textContent = actu.titre || "Sans titre";

  const text = document.createElement("div");
  text.className = "actu-extrait";

  let propre = String(actu.texte || "")
    .replace(/<h2[\s\S]*?<\/h2>/gi, "")
    .replace(/class="floating-text"/g, "")
    .replace(/contenteditable="[^"]*"/g, "")
    .replace(/<div class="resize-handle"><\/div>/g, "")
    .replace(/Double-clique pour écrire…/g, "");

  const extrait = propre.length > 300 ? propre.slice(0, 300) + "..." : propre;
  // Insérer du HTML nettoyé en toute conscience
  text.innerHTML = extrait;

  const date = document.createElement("small");
  date.textContent = `Publié le ${actu.date_pub || "?"}`;

  link.appendChild(image);
  link.appendChild(title);
  link.appendChild(text);
  link.appendChild(date);

  card.appendChild(link);
  return card;
}

// Petit utilitaire pour échapper les valeurs utilisées dans les attributs
function escapeAttribute(str) {
  return String(str).replace(/["']/g, match => (match === '"' ? '&quot;' : '&#39;'));
}

document.addEventListener("DOMContentLoaded", chargerActusPubliques);
