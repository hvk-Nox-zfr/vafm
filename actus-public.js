import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// Remplace par ton URL et ta clé anon
const supabase = createClient(
  "https://blronpowdhaumjudtgvn.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJscm9ucG93ZGhhdW1qdWR0Z3ZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTkzNzYxNzksImV4cCI6MjAxNDk1MjE3OX0.3r7Zz1gKjvWZzWZkZ7vWZzWZzWZzWZzWZzWZzWZzWZz"
);

async function chargerActusPubliques() {
  const { data, error } = await supabase
    .from("actus")
    .select("titre, texte, date_pub, imageUrl")
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
      <div class="actu-image" style="background-image: url('${actu.imageUrl || "assets/default.jpg"}');"></div>
      <h3>${actu.titre}</h3>
      <p>${actu.texte}</p>
      <small>Publié le ${actu.date_pub}</small>
    `;

    container.appendChild(card);
  });
}

document.addEventListener("DOMContentLoaded", chargerActusPubliques);
