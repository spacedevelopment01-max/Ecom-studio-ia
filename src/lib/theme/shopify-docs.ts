/**
 * Theme Check (outil officiel de Shopify) chargé avec des documents Shopify figés et locaux.
 *
 * Sans cela, @shopify/theme-check-docs-updater retélécharge les documents (theme-liquid-docs) depuis
 * raw.githubusercontent.com à chaque processus, sans contrôler la réponse, dans un cache commun à tous les processus
 * (site, worker, scripts). Une réponse vide, ou une lecture pendant qu'un autre processus réécrit le fichier, donne un
 * schéma vide accepté tel quel : « Unable to parse content from …/preset.json: Parse error at offset 0 », puis de
 * fausses erreurs ValidSchema. Constaté en CI (suivi #194) ; au studio, une section valide écrite par l'IA serait
 * refusée à tort.
 *
 * Ici : les documents livrés avec la version installée de la dépendance sont recopiés une fois par processus, relus en
 * JSON, servis par SHOPIFY_TLD_ROOT (lecture locale prévue par le module), avec un cache propre au processus.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

type ThemeCheckNode = typeof import("@shopify/theme-check-node");

/** Écrit l'arborescence du dépôt Shopify (data/…, schemas/…) depuis la dépendance installée ; un JSON illisible lève. */
export function writeShopifyDocs(out: string): { revision: string; schemas: number } {
  const req = createRequire(path.join(process.cwd(), "package.json"));
  const src = path.join(path.dirname(req.resolve("@shopify/theme-check-docs-updater/package.json")), "data");
  const read = (name: string) => {
    const text = fs.readFileSync(path.join(src, name), "utf8");
    JSON.parse(text);
    return text;
  };
  const put = (rel: string, text: string) => {
    fs.mkdirSync(path.dirname(path.join(out, rel)), { recursive: true });
    fs.writeFileSync(path.join(out, rel), text);
  };
  for (const r of ["filters", "objects", "tags", "latest", "shopify_system_translations"]) put(`data/${r}.json`, read(`${r}.json`));
  const uris = new Set<string>();
  for (const m of ["manifest_theme", "manifest_theme_app_extension"]) {
    const text = read(`${m}.json`);
    put(`schemas/${m}.json`, text);
    for (const s of JSON.parse(text).schemas as { uri: string }[]) uris.add(s.uri);
  }
  for (const uri of uris) put(`schemas/${uri}`, read(path.basename(uri)));
  return { revision: JSON.parse(read("latest.json")).revision, schemas: uris.size };
}

let loading: Promise<ThemeCheckNode> | null = null;

/**
 * Le module Theme Check, prêt à vérifier sans réseau. Quand l'appelant fournit déjà SHOPIFY_TLD_ROOT
 * (scripts/verify-theme.sh : documents écrits une fois, un cache par processus), ses réglages sont gardés tels quels.
 */
export function loadThemeCheck(): Promise<ThemeCheckNode> {
  return (loading ??= (async () => {
    if (process.env.SHOPIFY_TLD_ROOT) return (await import("@shopify/theme-check-node")) as ThemeCheckNode;
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "es-shopify-docs-"));
    process.on("exit", () => fs.rmSync(root, { recursive: true, force: true }));
    writeShopifyDocs(path.join(root, "docs"));
    process.env.SHOPIFY_TLD_ROOT = path.join(root, "docs");
    // Le dossier de cache du module est fixé à son chargement : un dossier propre à ce processus, puis retour à la normale.
    const previous = process.env.XDG_CACHE_HOME;
    process.env.XDG_CACHE_HOME = path.join(root, "cache");
    try {
      return (await import("@shopify/theme-check-node")) as ThemeCheckNode;
    } finally {
      if (previous === undefined) delete process.env.XDG_CACHE_HOME;
      else process.env.XDG_CACHE_HOME = previous;
    }
  })().catch((e) => {
    loading = null;
    throw e;
  }));
}
