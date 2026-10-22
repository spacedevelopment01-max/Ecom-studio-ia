/**
 * Vignettes et captures de la galerie des thèmes, photographiées sur les démos réellement préparées (diagnostic du
 * 22 octobre : les vignettes suivies dataient d'avant la réécriture des textes ; celle de TRAVERSE affichait encore
 * « du café du matin »). Aucune IA, aucun réseau, rien n'est publié.
 *
 *   THEME_DEMOS_DIR=<démos préparées> CHROMIUM=/chemin/chrome npx tsx scripts/theme-thumbnails.ts [thème…]
 *
 * Thèmes aux médias suivis : public/theme-assets/<id>/ (apercu-theme.jpg, boutique-bureau.jpg, boutique-mobile.jpg,
 * fiche-produit.jpg) et apercu-theme.json (titre d'ouverture, commit de la démo), contrôlé par
 * tests/theme-thumbnails.test.ts. Thèmes du kit privé (FRAISE, ONDE, ORBE, Atelier Rive) : public/demo/directions/<id>.jpg
 * et .webp, public/demo/<id>/boutique-*.jpg, hors dépôt comme le kit.
 */
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import sharp from "sharp";
import { chromium } from "playwright";
import { DEMO_THEMES, KIT_THEMES, themeDemosDir } from "../src/lib/theme/theme-demos";

const ids = process.argv.slice(2).length ? process.argv.slice(2) : [...DEMO_THEMES];
const MIME: Record<string, string> = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".jpg": "image/jpeg", ".webp": "image/webp", ".png": "image/png", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".ttf": "font/ttf", ".json": "application/json", ".webm": "video/webm" };
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
let failed = 0;
try {
  for (const id of ids) {
    const dir = path.join(themeDemosDir(), id);
    if (!fs.existsSync(path.join(dir, "accueil.html"))) { console.error(`${id} : démo absente de ${dir}`); failed++; continue; }
    const plan = JSON.parse(fs.readFileSync(path.join(dir, "pages.json"), "utf8")) as { missing?: string[] };
    if (plan.missing?.length) { console.error(`${id} : démo préparée sans ses visuels (${plan.missing.length} absents), vignette non refaite`); failed++; continue; }
    const meta = JSON.parse(fs.readFileSync(path.join(dir, "demo.json"), "utf8")) as { version?: string };
    const server = http.createServer((q, r) => {
      const file = path.join(dir, decodeURIComponent((q.url ?? "/").split("?")[0]).replace(/^\/+/, "") || "accueil.html");
      if (!file.startsWith(dir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return r.writeHead(404).end();
      r.writeHead(200, { "Content-Type": MIME[path.extname(file)] ?? "application/octet-stream" });
      fs.createReadStream(file).pipe(r);
    }).listen(0);
    const origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
    const shot = async (page: string, width: number, height: number) => {
      const p = await browser.newPage({ viewport: { width, height }, reducedMotion: "reduce" });
      await p.goto(`${origin}/${page}`, { waitUntil: "networkidle" });
      await p.evaluate(() => document.querySelectorAll("img[loading=lazy]").forEach((i) => ((i as HTMLImageElement).loading = "eager")));
      await p.waitForLoadState("networkidle");
      await p.waitForTimeout(400);
      const h1 = (await p.locator("h1").first().innerText().catch(() => "")).replace(/\s+/g, " ").trim();
      const png = await p.screenshot();
      await p.close();
      return { png, h1 };
    };
    const kit = (KIT_THEMES as readonly string[]).includes(id);
    const assets = kit ? path.join("public", "demo", id) : path.join("public", "theme-assets", id);
    const thumb = kit ? path.join("public", "demo", "directions", `${id}.jpg`) : path.join(assets, "apercu-theme.jpg");
    fs.mkdirSync(path.dirname(thumb), { recursive: true });
    const home = await shot("accueil.html", 1200, 1500);
    await sharp(home.png).jpeg({ quality: 84, mozjpeg: true }).toFile(thumb);
    if (kit) await sharp(home.png).webp({ quality: 80 }).toFile(thumb.replace(/\.jpg$/, ".webp"));
    await sharp((await shot("accueil.html", 1400, 1361)).png).jpeg({ quality: 84, mozjpeg: true }).toFile(path.join(assets, "boutique-bureau.jpg"));
    await sharp((await shot("accueil.html", 390, 1400)).png).jpeg({ quality: 84, mozjpeg: true }).toFile(path.join(assets, "boutique-mobile.jpg"));
    if (fs.existsSync(path.join(dir, "produit.html"))) await sharp((await shot("produit.html", 1400, 1361)).png).jpeg({ quality: 84, mozjpeg: true }).toFile(path.join(assets, "fiche-produit.jpg"));
    if (!kit) fs.writeFileSync(path.join(assets, "apercu-theme.json"), JSON.stringify({ h1: home.h1, demo: meta.version ?? "" }, null, 2) + "\n");
    server.close();
    console.log(`${id} : vignette refaite (« ${home.h1} »)`);
  }
} finally {
  await browser.close();
}
process.exit(failed ? 1 : 0);
