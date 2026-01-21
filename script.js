// --- PLAYER RADIO ---

const audio = document.getElementById("radio-audio");
const playBtn = document.getElementById("play-btn");
const currentShow = document.getElementById("current-show");
const playIcon = playBtn.querySelector(".icon");

// Texte affiché sous le titre
if (currentShow) {
    currentShow.textContent = "En direct : Le meilleur du son !";
}

// État du player
let isMuted = false;
let hasStarted = false;

if (playBtn && audio) {
    playBtn.addEventListener("click", async () => {
        try {
            // Première lecture du flux
            if (!hasStarted) {
                await audio.play();
                audio.volume = 1;
                hasStarted = true;
                isMuted = false;
                playIcon.textContent = "⏸";
                playBtn.classList.add("playing");
                return;
            }

            // Si déjà lancé : on coupe / remet le son
            if (!isMuted) {
                audio.volume = 0;
                isMuted = true;
                playIcon.textContent = "▶";
                playBtn.classList.remove("playing");
            } else {
                audio.volume = 1;
                isMuted = false;
                playIcon.textContent = "⏸";
                playBtn.classList.add("playing");
            }

        } catch (e) {
            console.error("Erreur lecture stream :", e);
            alert("Impossible de lancer le stream pour le moment.");
        }
    });
}

// --- TITRE MUSIQUE EN DIRECT + EFFET RADIO VOITURE ---

const marquee = document.getElementById("marquee");
const trackSpan = document.getElementById("current-track");

let animTimeout = null;

function lancerDefilementVoiture(titre) {
    if (!marquee || !trackSpan) return;

    clearTimeout(animTimeout);

    trackSpan.textContent = titre;

    trackSpan.style.transition = "none";
    trackSpan.style.transform = "translateX(0)";

    animTimeout = setTimeout(() => {
        const containerWidth = marquee.offsetWidth;
        const textWidth = trackSpan.offsetWidth;

        if (textWidth <= containerWidth) return;

        const distance = textWidth - containerWidth + 20;
        const duration = distance * 15;

        trackSpan.style.transition = `transform ${duration}ms linear`;
        trackSpan.style.transform = `translateX(-${distance}px)`;

        animTimeout = setTimeout(() => {
            trackSpan.style.transition = "none";
            trackSpan.style.transform = "translateX(0)";
        }, duration + 1000);

    }, 1000);
}

async function updateCurrentTitle() {
    try {
        const response = await fetch("https://manager10.streamradio.fr:1555/status-json.xsl");
        const data = await response.json();

        const rawTitle = data.icestats?.source?.title;

        if (!rawTitle) {
            lancerDefilementVoiture("Titre non disponible");
            return;
        }

        const formattedTitle = rawTitle.replace(" - ", " – ");
        lancerDefilementVoiture(formattedTitle);

    } catch (error) {
        console.error("Erreur récupération titre :", error);
        lancerDefilementVoiture("Titre non disponible");
    }
}

updateCurrentTitle();
setInterval(updateCurrentTitle, 20000);