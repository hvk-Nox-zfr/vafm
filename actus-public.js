import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabase = createClient(
  "https://blronpowdhaumjudtgvn.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJscm9ucG93ZGhhdW1qdWR0Z3ZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5ODU4MDAsImV4cCI6MjA4NDU2MTgwMH0.ThzU_Eqgwy0Qx2vTO381R0HHvV1jfhsAZFxY-Aw4hXI"
);

async function chargerActusPubliques() {
  const { data, error } = await supabase
    .from("actus")
    .select("id, titre, texte, date_pub, imageUrl")
    .eq("published", true)
    .order("date_pub", { ascending: false });

  const container = document.getElementById("actus-public");
  container.innerHTML = "";

  if (error) {
    console.error("Erreur Supabase :", error);
    container.innerHTML = "<p>Impossible de charger les actualités.</p>";
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML = "<p>Aucune actualité pour le moment.</p>";
    return;
  }

  if (data.length <= 4) {
    data.forEach(actu => container.appendChild(creerCarteActu(actu)));
    return;
  }

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

  activerCarousel(track, btnLeft, btnRight);
}

function creerCarteActu(actu) {
  const card = document.createElement("div");
  card.className = "actu-card";

  const link = document.createElement("a");
  link.href = `./page.html?id=${actu.id}`;
  link.className = "actu-link";

  const image = document.createElement("div");
  image.className = "actu-image";
  image.style.backgroundImage = `url('${actu.imageUrl || "/assets/default.jpg"}')`;

  const title = document.createElement("h3");
  title.textContent = actu.titre;

  const text = document.createElement("div");
  text.className = "actu-extrait";

  // Nettoyage du texte pour l'extrait
  let propre = actu.texte
    .replace(/<h2[\s\S]*?<\/h2>/gi, "")
    .replace(/class="floating-text"/g, "")
    .replace(/contenteditable="[^"]*"/g, "")
    .replace(/<div class="resize-handle"><\/div>/g, "")
    .replace(/Double-clique pour écrire…/g, "");

  const extrait = propre.slice(0, 300) + "...";
  text.innerHTML = extrait;

  const date = document.createElement("small");
  date.textContent = `Publié le ${actu.date_pub}`;

  link.appendChild(image);
  link.appendChild(title);
  link.appendChild(text);
  link.appendChild(date);

  card.appendChild(link);
  return card;
}

document.addEventListener("DOMContentLoaded", chargerActusPubliques);
