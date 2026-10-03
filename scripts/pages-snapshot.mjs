/**
 * Vitrine statique pour GitHub Pages : la page d'accueil, ses vidéos et ses démonstrations.
 *   PAGES_BASE_PATH=/Ecom-studio-ia npx next build && PAGES_BASE_PATH=/Ecom-studio-ia node scripts/pages-snapshot.mjs
 * Le studio a besoin d'un serveur (base de données, worker) : sur Pages, ses liens mènent à une page
 * qui l'ouvre dans GitHub Codespaces.
 */
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const BASE = process.env.PAGES_BASE_PATH;
if (!BASE) throw new Error("PAGES_BASE_PATH manquant (ex. /Ecom-studio-ia)");
const REPO = process.env.GITHUB_REPOSITORY ?? "spacedevelopment01-max/Ecom-studio-ia";
const PORT = 3100;
const OUT = path.join(process.cwd(), "_site");

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const server = spawn(path.join("node_modules", ".bin", "next"), ["start", "-p", String(PORT)], { env: { ...process.env, PORT: String(PORT) }, stdio: ["ignore", "inherit", "inherit"], detached: true });
let html = "";
/** Pages statiques publiées avec l'accueil (pages légales). */
const PAGES = ["mentions-legales", "conditions", "confidentialite", "cookies", "contact"];
const pages = {};
try {
  for (let i = 0; i < 60 && !html; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}${BASE}`);
      if (res.ok) html = await res.text();
    } catch {}
  }
  for (const p of PAGES) {
    const res = await fetch(`http://127.0.0.1:${PORT}${BASE}/${p}`);
    if (!res.ok) throw new Error(`Page ${p} : ${res.status}`);
    pages[p] = await res.text();
  }
} finally {
  process.kill(-server.pid); // tout le groupe : next démarre ses propres processus
}
if (!html) throw new Error("La page d'accueil n'a pas répondu.");

// Fichiers de public/ référencés à la racine : on les place sous le chemin du dépôt (HTML, données RSC, CSS).
const prefix = (s) => s.replace(/(["'(])\/(demo|explainers|fonts)\//g, `$1${BASE}/$2/`).replace(/(["'])\/favicon\.svg/g, `$1${BASE}/favicon.svg`);

fs.writeFileSync(path.join(OUT, "index.html"), prefix(html));
for (const [p, h] of Object.entries(pages)) {
  fs.mkdirSync(path.join(OUT, p), { recursive: true });
  fs.writeFileSync(path.join(OUT, p, "index.html"), prefix(h));
}
fs.cpSync("public", OUT, { recursive: true });
fs.cpSync(path.join(".next-pages", "static"), path.join(OUT, "_next", "static"), { recursive: true });
for (const f of fs.readdirSync(path.join(OUT, "_next", "static", "css"))) {
  const p = path.join(OUT, "_next", "static", "css", f);
  fs.writeFileSync(p, prefix(fs.readFileSync(p, "utf8")));
}

const codespace = `https://codespaces.new/${REPO}?quickstart=1`;
const studio = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Ouvrir le studio — E-COM STUDIO IA</title><link rel="icon" href="${BASE}/favicon.svg">
<style>
:root{color-scheme:light dark;--bg:#f6f7fb;--fg:#0b1020;--muted:#5b6478;--card:#fff;--line:#e3e6ef;--signal:#2F5BEA}
@media (prefers-color-scheme:dark){:root{--bg:#070B17;--fg:#eef1f8;--muted:#9aa3b8;--card:#0e1426;--line:#1d2540;--signal:#3D6EF0}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.55 system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;padding:16px}
main{max-width:560px;background:var(--card);border:1px solid var(--line);border-radius:20px;padding:32px}
h1{font-size:26px;line-height:1.2;margin:0 0 12px}p{color:var(--muted);margin:0 0 14px}ol{color:var(--muted);padding-left:20px;margin:0 0 22px}li{margin:4px 0}
a.btn{display:block;text-align:center;background:var(--signal);color:#fff;text-decoration:none;font-weight:600;padding:14px 18px;border-radius:12px;margin-bottom:10px}
a.ghost{display:block;text-align:center;color:var(--fg);border:1px solid var(--line);text-decoration:none;padding:12px 18px;border-radius:12px}
</style></head><body><main>
<h1>Le studio s'ouvre dans GitHub Codespaces</h1>
<p>Cette page GitHub est une vitrine : elle ne peut pas faire tourner le studio, qui a besoin d'un serveur (base de données, création des images et vidéos).</p>
<ol><li>Touchez « Ouvrir le studio » et connectez-vous à GitHub.</li><li>Patientez 2 à 3 minutes : l'installation et le démarrage sont automatiques.</li><li>Le studio s'affiche dans un onglet (port 3000).</li></ol>
<a class="btn" href="${codespace}">Ouvrir le studio</a>
<a class="ghost" href="${BASE}/">Retour à l'accueil</a>
</main></body></html>`;
for (const r of ["studio", "inscription", "connexion"]) {
  fs.mkdirSync(path.join(OUT, r), { recursive: true });
  fs.writeFileSync(path.join(OUT, r, "index.html"), studio);
}
fs.writeFileSync(path.join(OUT, "404.html"), studio.replace("Le studio s'ouvre dans GitHub Codespaces", "Cette page fait partie du studio"));
fs.writeFileSync(path.join(OUT, ".nojekyll"), "");
console.log(`✓ _site prêt (${BASE})`);
