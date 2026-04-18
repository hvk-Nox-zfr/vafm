// actus-public.js — version sécurisée et robuste

'use strict';

/* ---------- Récupération robuste du client Supabase UMD/Global ---------- */
function getDbClient() {
  // priorités : window.getDb() (si fourni), window.__supabaseClient, window.supabase
  try {
    if (typeof window.getDb === 'function') return window.getDb();
    if (window.__supabaseClient) return window.__supabaseClient;
    if (window.supabase) return window.supabase;
  } catch (e) {
    // ignore
  }
  return null;
}

/* ---------- sanitizePublicHtml : nettoie le HTML d'éditeur pour affichage public ---------- */
function sanitizePublicHtml(html) {
  if (!html) return '';

  // parser dans un DOM temporaire
  const tmp = document.createElement('div');
  tmp.innerHTML = html;

  // 1) supprimer éléments d'éditeur et UI
  tmp.querySelectorAll('.floating, .floating-text, .resize-handle, .editor-only, [data-editor]').forEach(el => el.remove());

  // 2) supprimer scripts et styles
  tmp.querySelectorAll('script, style').forEach(el => el.remove());

  // 3) nettoyer attributs inline et data-*
  tmp.querySelectorAll('*').forEach(el => {
    el.removeAttribute('style');
    // supprimer tous les data-*
    Array.from(el.attributes).forEach(attr => {
      if (attr.name.startsWith('data-')) el.removeAttribute(attr.name);
    });
  });

  // 4) autoriser seulement un sous-ensemble de balises et d'attributs
  const ALLOWED_TAGS = ['P','BR','STRONG','EM','A','UL','OL','LI','IMG','H1','H2','H3','BLOCKQUOTE'];
  const ALLOWED_ATTRS = { 'A': ['href','title','target','rel'], 'IMG': ['src','alt','width','height'] };

  // parcourir et remplacer balises non autorisées par leur contenu textuel
  const walker = document.createTreeWalker(tmp, NodeFilter.SHOW_ELEMENT, null, false);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  // itérer sur une copie pour éviter problèmes lors de modifications
  nodes.forEach(node => {
    const tag = node.tagName;
    if (!ALLOWED_TAGS.includes(tag)) {
      // remplacer l'élément par son contenu (préserver texte)
      const frag = document.createDocumentFragment();
      while (node.firstChild) frag.appendChild(node.firstChild);
      if (node.parentNode) node.parentNode.replaceChild(frag, node);
    } else {
      // filtrer attributs autorisés
      Array.from(node.attributes).forEach(attr => {
        const allowed = (ALLOWED_ATTRS[tag] || []).includes(attr.name);
        if (!allowed) node.removeAttribute(attr.name);
        else {
          // pour href/src : refuser javascript: et data:text/html
          if ((attr.name === 'href' || attr.name === 'src') && /^(javascript:|data:text\/html)/i.test(attr.value.trim())) {
            node.removeAttribute(attr.name);
          }
        }
      });
    }
  });

  return tmp.innerHTML;
}

/* ---------- util pour échapper attributs (sécurité) ---------- */
function escapeAttribute(str) {
  return String(str).replace(/["']/g, match => (match === '"' ? '&quot;' : '&#39;'));
}

/* ---------- création d'une carte d'actualité sécurisée ---------- */
function creerCarteActu(actu) {
  const card = document.createElement("div");
  card.className = "actu-card";

  const link = document.createElement("a");
  link.href = `./page.html?id=${encodeURIComponent(actu.id)}`;
  link.className = "actu-link";
  link.setAttribute('aria-label', actu.titre || 'Article');

  const image = document.createElement("div");
  image.className = "actu-image";
  const imageUrl = actu.imageUrl || "/assets/default.jpg";
  image.style.backgroundImage = `url('${escapeAttribute(imageUrl)}')`;

  const title = document.createElement("h3");
  title.textContent = actu.titre || "Sans titre";

  const text = document.createElement("div");
  text.className = "actu-extrait";

  // Nettoyage complet du HTML de l'éditeur
  const propreHtml = sanitizePublicHtml(String(actu.texte || ""));

  // Extraire un extrait texte (limité) : on retire les balises et on tronque proprement
  const tmp = document.createElement('div');
  tmp.innerHTML = propreHtml;
  const plain = (tmp.textContent || '').trim().replace(/\s+/g, ' ');
  const extrait = plain.length > 300 ? plain.slice(0, 300) + "…" : plain;

  // Insérer uniquement du texte (sécurisé) dans l'extrait
  text.textContent = extrait || '';

  const date = document.createElement("small");
  date.textContent = `Publié le ${actu.date_pub || "?"}`;

  link.appendChild(image);
  link.appendChild(title);
  link.appendChild(text);
  link.appendChild(date);

  card.appendChild(link);
  return card;
}

/* ---------- chargement des actualités publiques ---------- */
async function chargerActusPubliques() {
  const db = getDbClient();
  const container = document.getElementById("actus-public");
  if (!container) return;

  container.innerHTML = "<p>Chargement...</p>";

  if (!db) {
    console.error("❌ Supabase client non disponible");
    container.innerHTML = "<p>Impossible de charger les actualités.</p>";
    return;
  }

  try {
    const { data, error } = await db
      .from("actus")
      .select("id, titre, texte, date_pub, imageUrl")
      .eq("published", true)
      .order("date_pub", { ascending: false });

    container.innerHTML = ""; // reset propre

    if (error) {
      console.error("❌ Erreur Supabase :", error);
      container.innerHTML = "<p>Impossible de charger les actualités.</p>";
      return;
    }

    if (!data || data.length === 0) {
      container.innerHTML = "<p>Aucune actualité pour le moment.</p>";
      return;
    }

    // Si 4 actus ou moins → pas de carousel
    if (data.length <= 4) {
      data.forEach(actu => container.appendChild(creerCarteActu(actu)));
      return;
    }

    // Mode carousel
    container.classList.add("carousel-paged");

    const btnLeft = document.createElement("button");
    btnLeft.className = "carousel-btn left";
    btnLeft.setAttribute('aria-label', 'Précédent');
    btnLeft.textContent = "‹";

    const track = document.createElement("div");
    track.className = "carousel-track";

    data.forEach(actu => track.appendChild(creerCarteActu(actu)));

    const btnRight = document.createElement("button");
    btnRight.className = "carousel-btn right";
    btnRight.setAttribute('aria-label', 'Suivant');
    btnRight.textContent = "›";

    container.appendChild(btnLeft);
    container.appendChild(track);
    container.appendChild(btnRight);

    // activerCarousel peut être défini ailleurs, vérifier avant d'appeler
    if (typeof activerCarousel === "function") {
      activerCarousel(track, btnLeft, btnRight);
    } else {
      console.warn("activerCarousel non défini, affichage sans carousel");
    }
  } catch (e) {
    console.error("❌ Erreur lors du chargement des actualités :", e);
    container.innerHTML = "<p>Impossible de charger les actualités.</p>";
  }
}

/* ---------- initialisation DOM ---------- */
document.addEventListener("DOMContentLoaded", chargerActusPubliques);
