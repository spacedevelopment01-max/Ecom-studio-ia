/**
 * Sites de démonstration (tests/fixtures/sites/<nom>/) : le conteneur n'a pas accès aux sites publics,
 * la lecture d'un site se teste donc sur ces copies locales.
 * - `fixtureFetcher(nom)` : fetcher en mémoire (aucun réseau) pour importSite / downloadSiteImage ;
 * - `resolveFixtureFile` / `fixtureMime` : partagés avec scripts/serve-site-fixtures.ts.
 */
import fs from "node:fs";
import path from "node:path";
import type { SiteFetcher } from "@/lib/engine/site-import";

export const SITES_DIR = path.resolve(import.meta.dirname, "fixtures/sites");
export const FIXTURE_SITES = ["shopify", "woocommerce", "wix", "webflow", "custom"] as const;

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
};
export const fixtureMime = (file: string) => MIME[path.extname(file).toLowerCase()] ?? "application/octet-stream";

/** Fichier servi pour un chemin du site (« / » → index.html, « /a-propos/ » → a-propos/index.html, « /products.json », « /shop » → shop.html…). */
export function resolveFixtureFile(site: string, pathname: string): string | null {
  const root = path.join(SITES_DIR, site);
  let p: string;
  try {
    p = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  const rel = path.normalize(p).replace(/^(\.\.(\/|\\|$))+/, "").replace(/^[/\\]+/, "");
  const base = path.join(root, rel);
  if (!base.startsWith(root)) return null; // pas de sortie du dossier
  const tries = rel === "" || p.endsWith("/") ? [path.join(base, "index.html")] : [base, `${base}.html`, path.join(base, "index.html"), `${base}.json`];
  for (const t of tries) if (fs.existsSync(t) && fs.statSync(t).isFile()) return t;
  return null;
}

/** Fetcher en mémoire : https://<site>.test/… → tests/fixtures/sites/<site>/… ; garde la liste des adresses demandées. */
export function fixtureFetcher(site: string, origin = `https://${site}.test`): SiteFetcher & { log: string[] } {
  const log: string[] = [];
  const f = (async (url: string) => {
    log.push(url);
    const u = new URL(url);
    if (u.origin !== origin) return { url, status: 404, type: "text/html", body: Buffer.from("<h1>Introuvable</h1>") };
    const file = resolveFixtureFile(site, u.pathname);
    if (!file) return { url, status: 404, type: "text/html; charset=utf-8", body: Buffer.from("<!doctype html><title>404</title><h1>Page introuvable</h1>") };
    return { url, status: 200, type: fixtureMime(file), body: fs.readFileSync(file) };
  }) as SiteFetcher & { log: string[] };
  f.log = log;
  return f;
}
