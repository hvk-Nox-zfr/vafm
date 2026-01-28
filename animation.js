function smoothScrollTo(target, duration = 900, offset = 40) {
  const start = window.pageYOffset;
  const element = document.querySelector(target);
  if (!element) return;

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

// ===============================
// ANIMATION DE TRANSITION PAGE
// ===============================

async function launchTransition(event) {
  event.preventDefault();
  const url = event.currentTarget.href;

  const overlay = document.getElementById("transition-overlay");
  const fakeLogo = document.getElementById("transition-logo");
  const realLogo = document.querySelector(".header-logo");

  if (!overlay || !fakeLogo) {
    window.location.href = url;
    return;
  }

  if (!realLogo) {
    overlay.classList.add("active");
  } else {
    const realRect = realLogo.getBoundingClientRect();
    const fakeRect = fakeLogo.getBoundingClientRect();

    const offsetX = realRect.left - fakeRect.left;
    const offsetY = realRect.top - fakeRect.top;

    overlay.style.setProperty("--logo-x", offsetX + "px");
    overlay.style.setProperty("--logo-y", offsetY + "px");

    overlay.classList.add("active");
    setTimeout(() => overlay.classList.add("fadein"), 80);
    setTimeout(() => overlay.classList.add("moveup"), 650);
  }

  // Chargement de la page en arrière-plan
  const response = await fetch(url);
  const html = await response.text();

  setTimeout(() => {
    document.open();
    document.write(html);
    document.close();
  }, 1500);
}

// 🔓 rendre la fonction dispo pour actus-public.js
window.launchTransition = launchTransition;
