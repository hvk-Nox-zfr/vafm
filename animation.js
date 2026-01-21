function smoothScrollTo(target, duration = 900, offset = 40) {
    const start = window.pageYOffset;
    const element = document.querySelector(target);
    const end = element.offsetTop - offset; // on s'arrête un peu avant
    const maxScroll = document.body.scrollHeight - window.innerHeight;

    const finalPosition = Math.min(end, maxScroll); // évite de dépasser
    const distance = finalPosition - start;

    let startTime = null;

    function animation(currentTime) {
        if (startTime === null) startTime = currentTime;

        const timeElapsed = currentTime - startTime;
        const progress = Math.min(timeElapsed / duration, 1);

        // Courbe ease-out encore plus douce
        const easeOut = 1 - Math.pow(1 - progress, 4);

        window.scrollTo(0, start + distance * easeOut);

        if (timeElapsed < duration) {
            requestAnimationFrame(animation);
        }
    }

    requestAnimationFrame(animation);
}

document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener("click", function (e) {
        e.preventDefault();
        const target = this.getAttribute("href");
        smoothScrollTo(target, 1000); // 1000ms = 1 seconde
    });
});

const actusTrack = document.getElementById("actus-public");
const btnLeft = document.querySelector(".carousel-btn.left");
const btnRight = document.querySelector(".carousel-btn.right");

btnLeft.addEventListener("click", () => {
  actusTrack.scrollBy({ left: -320, behavior: "smooth" });
});

btnRight.addEventListener("click", () => {
  actusTrack.scrollBy({ left: 320, behavior: "smooth" });
});