import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabase = createClient(
  "https://blronpowdhaumjudtgvn.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJscm9ucG93ZGhhdW1qdWR0Z3ZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5ODU4MDAsImV4cCI6MjA4NDU2MTgwMH0.ThzU_Eqgwy0Qx2vTO381R0HHvV1jfhsAZFxY-Aw4hXI"
);

// ----------------------
// VARIABLES GLOBALES
// ----------------------
const params = new URLSearchParams(window.location.search);
const actuId = Number(params.get("id"));

const wrapper = document.querySelector(".canvas-wrapper");
const canvas = document.getElementById("actu-content");
const editorLayer = document.getElementById("editor-layer");

let selectedBlock = null;
let undoStack = [];
let redoStack = [];

// ----------------------
// CHARGEMENT DE L’ARTICLE
// ----------------------
async function chargerActu() {
  const { data: actu, error } = await supabase
    .from("actus")
    .select("*")
    .eq("id", actuId)
    .maybeSingle();

  if (!actu) return;

  // Texte
  if (actu.contenu?.texte) {
    canvas.innerHTML = actu.contenu.texte;
  }

  // Images flottantes
  if (actu.contenu?.images) {
    actu.contenu.images.forEach(img => addImageBlock(img));
  }
}

// ----------------------
// AJOUT D’UN BLOC IMAGE
// ----------------------
export function addImageBlock(data = {}) {
  const div = document.createElement("div");
  div.className = "block-public";
  div.style.position = "absolute";
  div.style.left = data.x || "100px";
  div.style.top = data.y || "100px";
  div.style.width = data.width || "300px";
  div.style.height = data.height || "200px";

  const img = document.createElement("img");
  img.src = data.url;
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

  editorLayer.appendChild(div);
}

// ----------------------
// DRAG
// ----------------------
function makeDraggable(el) {
  let offsetX, offsetY;

  el.addEventListener("mousedown", e => {
    if (e.target.classList.contains("resize-handle")) return;

    selectedBlock = el;
    selectBlock(el);

    offsetX = e.clientX - el.offsetLeft;
    offsetY = e.clientY - el.offsetTop;

    function move(e2) {
      el.style.left = e2.clientX - offsetX + "px";
      el.style.top = e2.clientY - offsetY + "px";
    }

    function stop() {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", stop);
    }

    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", stop);
  });
}

// ----------------------
// RESIZE
// ----------------------
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
      el.style.width = startW + (e2.clientX - startX) + "px";
      el.style.height = startH + (e2.clientY - startY) + "px";
    }

    function stop() {
      document.removeEventListener("mousemove", resize);
      document.removeEventListener("mouseup", stop);
    }

    document.addEventListener("mousemove", resize);
    document.addEventListener("mouseup", stop);
  });
}

// ----------------------
// SÉLECTION
// ----------------------
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

// ----------------------
// SAUVEGARDE SUPABASE
// ----------------------
async function sauvegarder() {
  const images = [...editorLayer.querySelectorAll(".block-public")].map(div => {
    const img = div.querySelector("img");

    return {
      url: img.src,
      x: div.style.left,
      y: div.style.top,
      width: div.style.width,
      height: div.style.height,
      offsetX: img.style.left,
      offsetY: img.style.top,
      imgWidth: img.style.width,
      imgHeight: img.style.height
    };
  });

  const texte = canvas.innerHTML;

  await supabase
    .from("actus")
    .update({
      contenu: {
        texte,
        images
      }
    })
    .eq("id", actuId);

  alert("Enregistré !");
}

document.getElementById("save-btn").addEventListener("click", sauvegarder);

// ----------------------
// INIT
// ----------------------
document.addEventListener("DOMContentLoaded", chargerActu);

