/**
 * Documents Shopify (theme-liquid-docs) de Theme Check, servis en local et figés avec la version installée de
 * @shopify/theme-check-docs-updater, au lieu d'être téléchargés à chaque exécution.
 *
 * Cause corrigée (suivi #194, journaux relevés par Codex) : chaque processus Theme Check retéléchargeait les documents
 * depuis raw.githubusercontent.com sans vérifier la réponse, dans un cache partagé. Une réponse vide ou une lecture
 * pendant l'écriture d'un autre processus donnait un schéma vide (« Parse error at offset 0 ») accepté tel quel, puis de
 * fausses erreurs ValidSchema, au hasard des exécutions de la CI.
 *
 *   node scripts/theme-docs-local.mjs <dossier>   puis   SHOPIFY_TLD_ROOT=<dossier> (et un XDG_CACHE_HOME par processus)
 *
 * Le dossier reproduit l'arborescence du dépôt Shopify (data/…, schemas/…). Chaque fichier est relu en JSON : un
 * document illisible arrête la vérification au lieu de produire de faux résultats.
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const out = path.resolve(process.argv[2] ?? "");
if (!process.argv[2]) throw new Error("Usage : node scripts/theme-docs-local.mjs <dossier>");
const require = createRequire(import.meta.url);
const src = path.join(path.dirname(require.resolve("@shopify/theme-check-docs-updater/package.json")), "data");
const read = (name) => {
  const text = fs.readFileSync(path.join(src, name), "utf8");
  JSON.parse(text);
  return text;
};
const put = (rel, text) => {
  fs.mkdirSync(path.dirname(path.join(out, rel)), { recursive: true });
  fs.writeFileSync(path.join(out, rel), text);
};

for (const r of ["filters", "objects", "tags", "latest", "shopify_system_translations"]) put(`data/${r}.json`, read(`${r}.json`));
const uris = new Set();
for (const m of ["manifest_theme", "manifest_theme_app_extension"]) {
  const text = read(`${m}.json`);
  put(`schemas/${m}.json`, text);
  for (const s of JSON.parse(text).schemas) uris.add(s.uri);
}
for (const uri of uris) put(`schemas/${uri}`, read(path.basename(uri)));
console.log(`Documents Shopify locaux (révision ${JSON.parse(read("latest.json")).revision.slice(0, 8)}) : ${uris.size} schémas dans ${out}`);
