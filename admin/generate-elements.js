const fs = require("fs");
const path = require("path");

// Dossier où sont stockés les éléments
const BASE_DIR = "admin/assets";

let elements = [];

// Mini IA locale : dictionnaire de concepts + synonymes
const AI_SYNONYMS = {
    manette: ["jeu", "gaming", "console", "joystick", "gamepad"],
    game: ["jeu", "gaming", "console"],
    controller: ["jeu", "gaming", "console", "manette"],
    micro: ["radio", "podcast", "audio", "voix", "microphone"],
    mic: ["radio", "podcast", "audio", "voix"],
    soleil: ["été", "lumière", "météo", "jour", "sun"],
    sun: ["été", "lumière", "météo", "jour", "soleil"],
    etoile: ["nuit", "ciel", "briller", "star"],
    star: ["nuit", "ciel", "briller", "etoile"],
    casque: ["audio", "musique", "écoute", "headphones"],
    radio: ["antenne", "fm", "broadcast", "audio"],
    cloud: ["nuage", "météo", "ciel"],
    nuage: ["cloud", "météo", "ciel"]
};

// Nettoyage du nom
function cleanName(str) {
    return str
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\-]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

// Générateur automatique de tags
function autoTags(name, category) {
    const clean = cleanName(name);
    let tags = [];

    const parts = clean.split(/[\s\-]+/);
    tags.push(...parts);
    tags.push(category);
    tags.push("icon", "element", "graphic");

    parts.forEach(part => {
        Object.keys(AI_SYNONYMS).forEach(key => {
            if (part.includes(key)) {
                tags.push(...AI_SYNONYMS[key]);
            }
        });
    });

    return [...new Set(tags)];
}

// Scan récursif
function scanDir(dir, category) {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
        const fullPath = path.join(dir, file);

        if (fs.lstatSync(fullPath).isDirectory()) {
            scanDir(fullPath, file);
        } else if (file.endsWith(".svg") || file.endsWith(".png")) {
            const name = file.replace(/\.(svg|png)/, "");

            // Nettoyage du chemin (Windows safe)
            const cleanPath = fullPath.replace(/\\/g, "/");

            // URL ABSOLUE pour éviter admin/admin/
            const publicUrl = "/" + cleanPath.replace(/^admin\//, "");

            elements.push({
                name: name,
                type: file.endsWith(".svg") ? "svg" : "png",
                category: category,
                tags: autoTags(name, category),
                url: publicUrl
            });
        }
    });
}

// Lancement
scanDir(BASE_DIR, "general");

// Écriture du fichier JSON
fs.writeFileSync("admin/elements.json", JSON.stringify(elements, null, 4));

console.log("✔ elements.json généré avec succès !");

