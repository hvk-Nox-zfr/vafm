// editeur.js (corrigé)
// Crée son propre client Supabase et s'assure que le DOM est prêt avant d'agir.

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

console.log('editeur.js loaded');

// --- CONFIG SUPABASE (remplace si tu veux une autre clé)
const SUPABASE_URL = "https://blronpowdhaumjudtgvn.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJscm9ucG93ZGhhdW1qdWR0Z3ZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5ODU4MDAsImV4cCI6MjA4NDU2MTgwMH0.ThzU_Eqgwy0Qx2vTO381R0HHvV1jfhsAZFxY-Aw4hXI";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- VARIABLES (assignées après DOMContentLoaded)
let wrapper = null;
let canvas = null;
let editorLayer = null;
let selectedBlock = null;
let undoStack = [];
let redoStack = [];

// --- UTILITAIRES (drag / resize / select)
function makeDraggable(el) {
  let offsetX = 0, offsetY = 0;

  el.addEventListener("mousedown", e => {
    if (e.target.classList.contains("resize-handle")) return;

    selectedBlock = el;
    selectBlock(el);

    offsetX = e.clientX - el.offsetLeft;
    offsetY = e.clientY - el.offsetTop;

    function move(e2) {
      el.style.left = (e2.clientX - offsetX) + "px";
      el.style.top = (e2.clientY - offsetY) + "px";
    }

    function stop() {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", stop);
    }

    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", stop);
  });
}

function makeResizable(el) {
  const handle = document.createElement("div");
  handle.className = "resize-handle bottom-right";
  el.appendChild(handle);

  handle.addEventListener("mousedown", e => {
    e.stopPropagation();

    const startX = e.clientX;
    const startY = e.clientY;
    const startW = el.offsetWidth;
    const startH = el.offsetHeight;

    function resize(e2) {
      el.style.width = Math.max(20, startW + (e2.clientX - startX)) + "px";
      el.style.height = Math.max(20, startH + (e2.clientY - startY)) + "px";
    }

    function stop() {
      document.removeEventListener("mousemove", resize);
      document.removeEventListener("mouseup", stop);
    }

    document.addEventListener("mousemove", resize);
    document.addEventListener("mouseup", stop);
  });
}

function makeSelectable(el) {
  el.addEventListener("click", e => {
    e.stopPropagation();
    selectBlock(el);
  });
}

function selectBlock(el) {
  document.querySelectorAll(".block-public").forEach(b => b.classList.remove("selected"));
  el.classList.add("selected");
  selectedBlock = el;
}

// --- AJOUT D'UN BLOC IMAGE (exporté si besoin)
export function addImageBlock(data = {}) {
  if (!editorLayer && !wrapper) {
    console.warn('addImageBlock: editorLayer et wrapper non initialisés');
    return null;
  }

  const div = document.createElement("div");
  div.className = "block-public";
  div.style.position = "absolute";
  div.style.left = data.x || "100px";
  div.style.top = data.y || "100px";
  div.style.width = data.width || "300px";
  div.style.height = data.height || "200px";

  const img = document.createElement("img");
  img.src = data.url || "";
  img.style.position = "absolute";
  img.style.left = data.offsetX || "0px";
  img.style.top = data.offsetY || "0px";
  img.style.width = data.imgWidth || "100%";
  img.style.height = data.imgHeight || "100%";
  img.style.objectFit = "contain";

  div.appendChild(img);

  makeDraggable(div);
  makeResizable(div);
  makeSelectable(div);

  // Ajouter dans editorLayer si présent, sinon dans wrapper
  if (editorLayer) editorLayer.appendChild(div);
  else wrapper.appendChild(div);

  return div;
}

// --- SAUVEGARDE
async function sauvegarder() {
  if (!editorLayer || !canvas) {
    alert("Impossible d'enregistrer : éditeur non initialisé.");
    return;
  }

  const images = [...editorLayer.querySelectorAll(".block-public")].map(div => {
    const img = div.querySelector("img");
    return {
      url: img?.src || "",
      x: div.style.left,
      y: div.style.top,
      width: div.style.width,
      height: div.style.height,
      offsetX: img?.style.left || "0px",
      offsetY: img?.style.top || "0px",
      imgWidth: img?.style.width || "100%",
      imgHeight: img?.style.height || "100%"
    };
  });

  const texte = canvas.innerHTML;

  try {
    const params = new URLSearchParams(window.location.search);
    const actuId = Number(params.get("id"));
    if (!actuId || isNaN(actuId)) {
      alert("ID d'article invalide.");
      return;
    }

    const { error } = await supabase
      .from("actus")
      .update({ contenu: { texte, images } })
      .eq("id", actuId);

    if (error) {
      console.error("Erreur sauvegarde Supabase:", error);
      alert("Erreur lors de l'enregistrement.");
      return;
    }

    alert("Enregistré !");
  } catch (err) {
    console.error("Erreur sauvegarde:", err);
    alert("Erreur lors de l'enregistrement.");
  }
}

// --- CHARGEMENT DE L'ARTICLE
async function chargerActu() {
  console.log('chargerActu start');
  const params = new URLSearchParams(window.location.search);
  const actuId = Number(params.get("id"));

  if (!actuId || isNaN(actuId)) {
    console.warn('chargerActu: actuId invalide');
    if (canvas) canvas.innerHTML = "<h2>Article introuvable</h2>";
    return;
  }

  try {
    const { data: actu, error } = await supabase
      .from("actus")
      .select("*")
      .eq("id", actuId)
      .maybeSingle();

    if (error) {
      console.error('Supabase error:', error);
      if (canvas) canvas.innerHTML = "<h2>Erreur lors du chargement</h2>";
      return;
    }

    if (!actu) {
      console.warn('Aucun article retourné');
      if (canvas) canvas.innerHTML = "<h2>Article introuvable</h2>";
      return;
    }

    // Texte
    const texte = actu.contenu?.texte || "";
    if (canvas) {
      canvas.innerHTML = texte;
      console.log('texte injecté length:', texte.length);
    }

    // Images flottantes
    const images = Array.isArray(actu.contenu?.images) ? actu.contenu.images : [];
    images.forEach(img => addImageBlock(img));
    console.log('images ajoutées:', images.length);

  } catch (err) {
    console.error('Erreur chargerActu:', err);
    if (canvas) canvas.innerHTML = "<h2>Erreur lors du chargement</h2>";
  }
}

// --- INITIALISATION AU DOM READY
document.addEventListener("DOMContentLoaded", () => {
  // récupérer les éléments après que le DOM soit prêt
  wrapper = document.querySelector(".canvas-wrapper");
  canvas = document.getElementById("actu-content");
  editorLayer = document.getElementById("editor-layer");

  // sécurité CSS/interaction pour le calque d'édition
  if (editorLayer) {
    editorLayer.style.pointerEvents = "auto";
    editorLayer.style.zIndex = 9999;
    editorLayer.style.position = "absolute";
    editorLayer.style.inset = "0";
  }

  // bouton sauvegarde
  const saveBtn = document.getElementById("save-btn");
  if (saveBtn) saveBtn.addEventListener("click", sauvegarder);

  // click outside pour désélectionner
  document.addEventListener("click", () => {
    document.querySelectorAll(".block-public").forEach(b => b.classList.remove("selected"));
    selectedBlock = null;
  });

  // lancer le chargement
  chargerActu();
});
