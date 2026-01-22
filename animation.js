function smoothScrollTo(target, duration = 900, offset = 40) {
    const start = window.pageYOffset;
    const element = document.querySelector(target);
    if (!element) return; // Sécurité

    const end = element.offsetTop - offset;
    const maxScroll = document.body.scrollHeight - window.innerHeight;

    const finalPosition = Math.min(end, maxScroll);
    const distance = finalPosition - start;

    let startTime = null;

    function animation(currentTime) {
        if (startTime === null) startTime = currentTime;

        const timeElapsed = currentTime - startTime;
        const progress = Math.min(timeElapsed / duration, 1);

        const easeOut = 1 - Math.pow(1 - progress, 4);

        window.scrollTo(0, start + distance * easeOut);

        if (timeElapsed < duration) {
            requestAnimationFrame(animation);
        }
    }

    requestAnimationFrame(animation);
}

// Smooth scroll sur les liens #
document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener("click", function (e) {
        e.preventDefault();
        const target = this.getAttribute("href");
        smoothScrollTo(target, 1000);
    });
});

// ===============================
// CARROUSEL ACTUS (sécurisé)
// ===============================

const actusTrack = document.getElementById("actus-public");
const btnLeft = document.querySelector(".carousel-btn.left");
const btnRight = document.querySelector(".carousel-btn.right");

// Vérifie que les éléments existent AVANT d'ajouter les events
if (actusTrack && btnLeft) {
    btnLeft.addEventListener("click", () => {
        actusTrack.scrollBy({ left: -320, behavior: "smooth" });
    });
}

if (actusTrack && btnRight) {
    btnRight.addEventListener("click", () => {
        actusTrack.scrollBy({ left: 320, behavior: "smooth" });
    });
}
