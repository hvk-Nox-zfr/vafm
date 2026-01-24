const fs = require("fs");
const path = require("path");

const BASE_DIR = "admin/assets";
let elementsAdmin = [];
let elementsPublic = [];

function scanDir(dir, category) {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
        const fullPath = path.join(dir, file);

        if (fs.lstatSync(fullPath).isDirectory()) {
            scanDir(fullPath, file);
        } else if (file.endsWith(".svg") || file.endsWith(".png")) {
            const name = file.replace(/\.(svg|png)/, "");
            const cleanPath = fullPath.replace(/\\/g, "/");

            // Chemin admin (sans "admin/")
            const urlAdmin = cleanPath.replace(/^admin\//, "");

            // Chemin public (avec "admin/" devant)
            const urlPublic = "admin/" + cleanPath.replace(/^admin\//, "");

            const element = {
                name: name,
                type: file.endsWith(".svg") ? "svg" : "png",
                category: category,
                tags: [name, category],
                url: urlAdmin
            };

            const elementPublic = { ...element, url: urlPublic };

            elementsAdmin.push(element);
            elementsPublic.push(elementPublic);
        }
    });
}

scanDir(BASE_DIR, "general");

// Création du dossier public si nécessaire
if (!fs.existsSync("public")) {
    fs.mkdirSync("public", { recursive: true });
}

// Écriture des fichiers
fs.writeFileSync("admin/elements.json", JSON.stringify(elementsAdmin, null, 4));
fs.writeFileSync("elements.json", JSON.stringify(elementsPublic, null, 4));

console.log("✔ Fichiers elements.json générés pour admin et public !");

