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
    console.error("Erreur chargement actus :", error);
    container.innerHTML = "<p>Impossible de charger les actualités.</p>";
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML = "<p>Aucune actualité pour le moment.</p>";
    return;
  }

  // --- CAS 1 : 3 actus ou moins → affichage normal ---
  if (data.length <= 3) {
    data.forEach(actu => container.appendChild(creerCarteActu(actu)));
    return;
  }

  // --- CAS 2 : plus de 3 actus → CAROUSEL ---
  container.classList.add("carousel");

  const inner = document.createElement("div");
  inner.className = "carousel-inner";

  data.forEach(actu => {
    const card = creerCarteActu(actu);
    card.classList.add("carousel-item");
    inner.appendChild(card);
  });

  container.appendChild(inner);

  lancerCarousel(inner, data.length);
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

function lancerCarousel(inner, total) {
  let index = 0;

  setInterval(() => {
    index = (index + 1) % total;
    inner.style.transform = `translateX(-${index * 100}%)`;
  }, 3000);
}

document.addEventListener("DOMContentLoaded", chargerActusPubliques);
