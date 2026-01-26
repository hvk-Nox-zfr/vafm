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
    container.innerHTML = "<p>Impossible de charger les actualités.</p>";
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML = "<p>Aucune actualité pour le moment.</p>";
    return;
  }

  // --- CAS NORMAL : 3 actus ou moins ---
  if (data.length <= 3) {
    data.forEach(actu => container.appendChild(creerCarteActu(actu)));
    return;
  }

  // --- CAS CAROUSEL ---
  container.classList.add("carousel-paged");

  // Bouton gauche
  const btnLeft = document.createElement("button");
  btnLeft.className = "carousel-btn left";
  btnLeft.textContent = "‹";

  // Track
  const track = document.createElement("div");
  track.className = "carousel-track";

  data.forEach(actu => {
    track.appendChild(creerCarteActu(actu));
  });

  // Bouton droit
  const btnRight = document.createElement("button");
  btnRight.className = "carousel-btn right";
  btnRight.textContent = "›";

  // Ajout dans le container
  container.appendChild(btnLeft);
  container.appendChild(track);
  container.appendChild(btnRight);

  // Activation du carousel
  activerCarousel(track, btnLeft, btnRight);
}

function creerCarteActu(actu) {
  const card = document.createElement("div");
  card.className = "actu-card";

  card.innerHTML = `
    <a href="page.html?id=${actu.id}" class="actu-link">
        <div class="actu-image" style="background-image: url('${actu.imageUrl || "assets/default.jpg"}');"></div>
        <h3>${actu.titre}</h3>
        <p>${actu.texte}</p>
        <small>Publié le ${actu.date_pub}</small>
    </a>
  `;

  return card;
}

function activerCarousel(track, btnLeft, btnRight) {
  btnLeft.addEventListener("click", () => {
    track.scrollBy({ left: -350, behavior: "smooth" });
  });

  btnRight.addEventListener("click", () => {
    track.scrollBy({ left: 350, behavior: "smooth" });
  });
}

document.addEventListener("DOMContentLoaded", chargerActusPubliques);
