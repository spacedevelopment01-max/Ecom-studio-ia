// Taille du JavaScript chargé à l'ouverture des routes clés (union des morceaux de la page et de ses mises en page).
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
const dir = process.argv[2];
const m = JSON.parse(fs.readFileSync(path.join(dir, ".next/app-build-manifest.json"), "utf8")).pages;
const size = (files) => {
  let raw = 0, gz = 0;
  for (const f of new Set(files)) {
    const p = path.join(dir, ".next", f);
    if (!f.endsWith(".js") || !fs.existsSync(p)) continue;
    const b = fs.readFileSync(p);
    raw += b.length;
    gz += zlib.gzipSync(b).length;
  }
  return `${Math.round(raw / 1024)} Ko / ${Math.round(gz / 1024)} Ko gz`;
};
const chain = (page) => {
  const parts = page.split("/").filter(Boolean);
  const keys = ["/layout"];
  for (let i = 1; i < parts.length; i++) keys.push("/" + parts.slice(0, i).join("/") + "/layout");
  keys.push(page);
  return keys.flatMap((k) => m[k] ?? []);
};
for (const page of ["/page", "/studio/page", "/studio/[projectId]/[tab]/page", "/admin/page"]) console.log(page.padEnd(34), size(chain(page)));
// Morceaux chargés à la demande (onglets, éditeurs) : total de tous les fichiers JS du client.
const all = fs.readdirSync(path.join(dir, ".next/static/chunks"), { recursive: true }).filter((f) => String(f).endsWith(".js")).map((f) => "static/chunks/" + f);
console.log("total JS client".padEnd(34), size(all));
