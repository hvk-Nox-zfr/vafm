function afficherActusPublic() {
    const container = document.getElementById("actus-public");
    if (!container) return;

    const saved = localStorage.getItem("vafm_actus");
    const actus = saved ? JSON.parse(saved) : [];
    const actusPubliees = actus.filter(a => a.published);

    if (actusPubliees.length === 0) {
        container.innerHTML = "<p>Aucune actualité pour le moment.</p>";
        return;
    }

    // Structure du carousel
    container.classList.add("carousel-paged");
    container.innerHTML = `
        <button class="carousel-btn left">‹</button>
        <div class="carousel-track"></div>
        <button class="carousel-btn right">›</button>
    `;

    const track = container.querySelector(".carousel-track");

    // Remplir les cartes
    actusPubliees.forEach(actu => {
        const card = document.createElement("article");
        card.className = "actu-card";

        const texteCourt = actu.contenu?.texte
            ? actu.contenu.texte.replace(/<[^>]+>/g, "").slice(0, 150) + "..."
            : "";

        card.innerHTML = `
            <div class="actu-image" style="background-image: url('${actu.imageUrl || "assets/default.jpg"}');"></div>
            <div class="actu-content">
                <h3>${actu.titre}</h3>
                <p>${texteCourt}</p>
                <span class="actu-date">Publié le ${actu.date}</span>
                <a href="page.html?id=${actu.id}" class="actu-link">Lire l'article</a>
            </div>
        `;

        track.appendChild(card);
    });

    // Défilement simple, sans index ni calcul chelou
    const cardWidth = 340; // largeur approximative d'une carte + gap

    const btnLeft = container.querySelector(".carousel-btn.left");
    const btnRight = container.querySelector(".carousel-btn.right");

    btnLeft.addEventListener("click", () => {
        track.scrollBy({ left: -cardWidth, behavior: "smooth" });
    });

    btnRight.addEventListener("click", () => {
        track.scrollBy({ left: cardWidth, behavior: "smooth" });
    });
}

afficherActusPublic();
afficherActusPublic();

function afficherEmissions() {
    const container = document.getElementById("emissions-public");
    const saved = localStorage.getItem("vafm_emissions");
    const emissions = saved ? JSON.parse(saved) : [];

    if (emissions.length === 0) {
        container.innerHTML = "<p>Aucune émission disponible.</p>";
        return;
    }

    emissions.forEach(em => {
        const card = document.createElement("div");
        card.className = "emission-card";
        card.innerHTML = `
            <h3>${em.nom}</h3>
            <p>${em.description}</p>
            <span class="emission-horaire">${em.horaires || "Horaire non défini"}</span>
        `;
        container.appendChild(card);
    });
}

function afficherAnimateurs() {
    const container = document.getElementById("animateurs-public");
    const saved = localStorage.getItem("vafm_animateurs");
    const animateurs = saved ? JSON.parse(saved) : [];

    if (animateurs.length === 0) {
        container.innerHTML = "<p>Aucun animateur pour le moment.</p>";
        return;
    }

    animateurs.forEach(anim => {
        const card = document.createElement("div");
        card.className = "animateur-card";
        card.innerHTML = `
            <img src="${anim.imageUrl || 'assets/default.jpg'}" alt="">
            <h3>${anim.nom}</h3>
            <p>${anim.description}</p>
        `;
        container.appendChild(card);
    });
}

afficherEmissions();
afficherAnimateurs();