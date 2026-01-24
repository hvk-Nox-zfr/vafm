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

            // Pour admin : chemin relatif
            const urlAdmin = cleanPath.replace(/^admin\//, "");

            // Pour public : chemin absolu
            const urlPublic = "/" + cleanPath.replace(/^admin\//, "");

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

fs.writeFileSync("admin/elements-admin.json", JSON.stringify(elementsAdmin, null, 4));
fs.writeFileSync("public/elements.json", JSON.stringify(elementsPublic, null, 4));

console.log("✔ Fichiers elements.json générés pour admin et public !");
