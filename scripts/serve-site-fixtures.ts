/**
 * Sert les sites de démonstration (tests/fixtures/sites/<nom>/) sur http://127.0.0.1:4600/<nom>/
 * pour essayer « J'ai déjà mon site et mon logo » dans le studio sans accès à Internet.
 *
 *   npx tsx scripts/serve-site-fixtures.ts            (port 4600, ou PORT=…)
 *
 * Le studio refuse les adresses locales (protection anti-SSRF). Pour l'essai, lancer le serveur
 * de développement avec SITE_IMPORT_ALLOW_LOCAL=1 (jamais pris en compte en production).
 *
 * Les sites de démonstration sont écrits comme de vrais sites servis à la racine (« /pages/contact »).
 * Servis sous /<nom>/, leurs adresses absolues (« /… ») sont réécrites en « /<nom>/… » dans le HTML,
 * les CSS, les JSON et robots.txt.
 */
import http from "node:http";
import fs from "node:fs";
import { FIXTURE_SITES, SITES_DIR, fixtureMime, resolveFixtureFile } from "../tests/site-fixtures";

const PORT = Number(process.env.PORT ?? 4600);
const HOST = "127.0.0.1";
const sites = fs.existsSync(SITES_DIR) ? fs.readdirSync(SITES_DIR).filter((d) => fs.statSync(`${SITES_DIR}/${d}`).isDirectory()) : [...FIXTURE_SITES];

function rewrite(body: string, site: string, mime: string): string {
  const prefix = `/${site}/`;
  if (/text\/plain/.test(mime)) return body.replace(/^((?:dis)?allow|sitemap)(\s*:\s*)\/(?!\/)/gim, `$1$2${prefix}`);
  return body
    .replace(/(["'(])\/(?![/>\s])/g, `$1${prefix}`) // href="/…", href="/", src='/…', url(/…), "…":"/…"
    .replace(/(\d+[wx],\s*)\/(?![/>\s])/g, `$1${prefix}`); // entrées suivantes d'un srcset
}

const server = http.createServer((req, res) => {
  const u = new URL(req.url ?? "/", `http://${HOST}:${PORT}`);
  const [, site, ...rest] = u.pathname.split("/");
  if (!site) {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(`<!doctype html><meta charset="utf-8"><title>Sites de démonstration</title><h1>Sites de démonstration</h1><ul>${sites.map((s) => `<li><a href="/${s}/">http://${HOST}:${PORT}/${s}/</a></li>`).join("")}</ul>`);
    return;
  }
  if (!sites.includes(site)) {
    res.writeHead(404, { "content-type": "text/html; charset=utf-8" }).end("<h1>Site inconnu</h1>");
    return;
  }
  if (u.pathname === `/${site}`) {
    res.writeHead(301, { location: `/${site}/` }).end();
    return;
  }
  const file = resolveFixtureFile(site, "/" + rest.join("/"));
  if (!file) {
    res.writeHead(404, { "content-type": "text/html; charset=utf-8" }).end("<!doctype html><title>404</title><h1>Page introuvable</h1>");
    return;
  }
  const mime = fixtureMime(file);
  const data = fs.readFileSync(file);
  const text = /^(text\/|application\/json)/.test(mime) && !/javascript/.test(mime);
  res.writeHead(200, { "content-type": mime, "cache-control": "no-store" });
  res.end(text ? rewrite(data.toString("utf8"), site, mime) : data);
});

server.listen(PORT, HOST, () => {
  console.log(`Sites de démonstration servis sur http://${HOST}:${PORT}/`);
  for (const s of sites) console.log(`  http://${HOST}:${PORT}/${s}/`);
  console.log("Dans le studio : lancer le serveur avec SITE_IMPORT_ALLOW_LOCAL=1 pour autoriser ces adresses locales.");
});
