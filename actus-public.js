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

  data.forEach(actu => {
    track.appendChild(creerCarteActu(actu));
  });

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

  card.innerHTML = `
    <a href="page.html?id=${actu.id}" class="actu-link" onclick="launchTransition(event)">
        <div class="actu-image" style="background-image: url('${actu.imageUrl || "/assets/default.jpg"}');"></div>
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

function launchTransition(event) {
    event.preventDefault();
    const url = event.currentTarget.href;

    const overlay = document.getElementById("transition-overlay");
    const fakeLogo = document.getElementById("transition-logo");
    const realLogo = document.querySelector(".header-logo");

    // Sécurité si le logo n'est pas trouvé
    if (!realLogo) {
        window.location.href = url;
        return;
    }

    // Position réelle du logo
    const realRect = realLogo.getBoundingClientRect();
    const fakeRect = fakeLogo.getBoundingClientRect();

    const offsetX = realRect.left - fakeRect.left;
    const offsetY = realRect.top - fakeRect.top;

    overlay.style.setProperty("--logo-x", offsetX + "px");
    overlay.style.setProperty("--logo-y", offsetY + "px");

    // Étape 1 : écran blanc
    overlay.classList.add("active");

    // Étape 2 : fade-in
    setTimeout(() => {
        overlay.classList.add("fadein");
    }, 80);

    // 🚀 Préchargement de la page en arrière-plan
    const preloader = document.createElement("iframe");
    preloader.src = url;
    preloader.style.display = "none";
    document.body.appendChild(preloader);

    // Étape 3 : déplacement
    setTimeout(() => {
        overlay.classList.add("moveup");
    }, 650);

    // Étape 4 : bascule vers la page déjà en cours de chargement
    setTimeout(() => {
        window.location.href = url;
    }, 1500);
}

window.launchTransition = launchTransition;

document.addEventListener("DOMContentLoaded", chargerActusPubliques);
