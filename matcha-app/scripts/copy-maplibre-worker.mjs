import { copyFileSync, mkdirSync } from "node:fs";

// MapLibre v6 charge son worker depuis une URL relative au bundle, que Next ne sert pas.
// On expose les fichiers dans public/ et UsersGlobe pointe dessus via setWorkerUrl().
const from = "node_modules/maplibre-gl/dist";
const to = "public/maplibre";

mkdirSync(to, { recursive: true });
for (const file of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) {
	copyFileSync(`${from}/${file}`, `${to}/${file}`);
}
