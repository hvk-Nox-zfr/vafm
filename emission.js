function updateLiveShowStatus() {
    const now = new Date();
    const day = now.getDay(); // 0 = dimanche, 1 = lundi, ..., 6 = samedi
    const hour = now.getHours();

    // Réinitialise tous les statuts
    document.querySelectorAll(".status").forEach(el => el.textContent = "");

    // Morning Vibes : lundi à vendredi, 7h–10h
    if (day >= 1 && day <= 5 && hour >= 7 && hour < 10) {
        document.querySelector("#morning .status").textContent = "En cours";
    }

    // Afterwork Lounge : tous les jours, 18h–20h
    if (hour >= 18 && hour < 20) {
        document.querySelector("#afterwork .status").textContent = "En cours";
    }

    // Night Session : jeudi à samedi, 22h–2h
    const isNightSession =
        // Jeudi, vendredi, samedi entre 22h et minuit
        (day >= 4 && day <= 6 && hour >= 22) ||
        // Vendredi et samedi entre minuit et 2h
        ((day === 5 || day === 6) && hour < 2);

    if (isNightSession) {
        document.querySelector("#night .status").textContent = "En cours";
    }
}

// Met à jour toutes les minutes
updateLiveShowStatus();
setInterval(updateLiveShowStatus, 60000);