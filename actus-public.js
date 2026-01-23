import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabase = createClient(
  "https://blronpowdhaumjudtgvn.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJscm9ucG93ZGhhdW1qdWR0Z3ZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5ODU4MDAsImV4cCI6MjA4NDU2MTgwMH0.ThzU_Eqgwy0Qx2vTO381R0HHvV1jfhsAZFxY-Aw4hXI"
);

async function chargerActusPubliques() {
  const { data, error } = await supabase
    .from("actus")
    .select("id, titre, texte, date_pub, imageUrl") // ← ID AJOUTÉ ICI
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

  data.forEach(actu => {
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

    container.appendChild(card);
  });
}

document.addEventListener("DOMContentLoaded", chargerActusPubliques);
