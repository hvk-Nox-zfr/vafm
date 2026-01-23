import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabase = createClient(
  "https://TON-PROJET.supabase.co",
  "ta-clé-anon"
);

async function chargerActus() {
  const { data, error } = await supabase
    .from("actus")
    .select("id, titre, texte, date_pub, imageUrl, published")
    .eq("published", true)
    .order("date_pub", { ascending: false });

  if (error) {
    console.error("Erreur chargement actus :", error);
    return;
  }

  const container = document.getElementById("actus-list-public");
  container.innerHTML = "";

  if (data.length === 0) {
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

document.addEventListener("DOMContentLoaded", chargerActus);
