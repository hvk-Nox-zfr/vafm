function updateLiveShowStatus() {
    const now = new Date();
    const day = now.getDay(); // 0 = dimanche, 1 = lundi, ..., 6 = samedi
    const hour = now.getHours();

    // Réinitialise tous les statuts
    document.querySelectorAll(".status").forEach(el => {
        el.textContent = "";
    });

    // Morning Vibes : lundi à vendredi, 7h–10h
    if (day >= 1 && day <= 5 && hour >= 7 && hour < 10) {
        const morningStatus = document.querySelector("#morning .status");
        if (morningStatus) morningStatus.textContent = "En cours";
    }

    // Afterwork Lounge : tous les jours, 18h–20h
    if (hour >= 18 && hour < 20) {
        const afterworkStatus = document.querySelector("#afterwork .status");
        if (afterworkStatus) afterworkStatus.textContent = "En cours";
    }

    // Night Session : jeudi à samedi, 22h–2h
    const isNightSession =
        (day >= 4 && day <= 6 && hour >= 22) || // Jeudi à samedi, 22h–minuit
        ((day === 5 || day === 6) && hour < 2); // Vendredi/samedi, minuit–2h

    if (isNightSession) {
        const nightStatus = document.querySelector("#night .status");
        if (nightStatus) nightStatus.textContent = "En cours";
    }
}

// Met à jour toutes les minutes
updateLiveShowStatus();
setInterval(updateLiveShowStatus, 60000);
