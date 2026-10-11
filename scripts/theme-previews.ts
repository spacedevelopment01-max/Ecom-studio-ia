/**
 * Vignettes de la galerie des thèmes (public/demo/directions/<thème>[.en].jpg et .webp), sans lancer le studio :
 * chaque thème est composé avec la marque de démonstration Ostral (mêmes photos, vidéo et logo que les vignettes
 * des directions d'origine), compilé, affiché dans Chromium puis photographié (haut de la page d'accueil).
 *
 *   npx tsx scripts/theme-previews.ts [thème…]      (par défaut : les thèmes du catalogue, en français et en anglais)
 */
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import sharp from "sharp";
import { chromium } from "playwright";
import { compileTheme } from "../src/lib/theme/compile";
import { renderPage, fontFilePath } from "../src/lib/theme/render";
import { CATALOG_IDS } from "../src/lib/theme/theme-catalog";
import type { DirectionId } from "../src/lib/theme/directions";
import { localCopy } from "../src/lib/engine/local-copy";
import { emptyProduct } from "../src/lib/project-types";
import { runWithLang } from "../src/lib/i18n-server";
import { build } from "../tests/fixtures";

const ids = (process.argv.slice(2).length ? process.argv.slice(2) : [...CATALOG_IDS]) as DirectionId[];
const OUT = path.join("public", "demo", "directions");
const DEMO = path.join("public", "demo", "drone");
type Demo = { id: string; brand: string; product: string; palette: string[] };
const demoOf = (file: string) => (JSON.parse(fs.readFileSync(path.join("public", "demo", file), "utf8")).demos as Demo[]).find((d) => d.id === "drone")!;

// Médias de la démonstration : nom du fichier dans le thème → fichier sur le disque.
const media: Record<string, string> = {
  "es-en-situation-1.jpg": "photo.jpg",
  "es-hero.jpg": "scene-2.jpg",
  "es-produit-detoure.webp": "cutout-1.webp",
  "es-packshot.jpg": "packshot-1.jpg",
  "es-detail-1.jpg": "detail-1.jpg",
  "es-scene-1.jpg": "scene-1.jpg",
  "es-scene-2.jpg": "scene-2.jpg",
  "es-video-1.mp4": "video.mp4",
  "es-affiche-1.jpg": "video-poster.jpg",
  "es-logo.svg": "logo.svg",
};
const TYPES: Record<string, string> = { ".jpg": "image/jpeg", ".webp": "image/webp", ".mp4": "video/mp4", ".svg": "image/svg+xml", ".css": "text/css", ".js": "application/javascript" };

function specFor(direction: DirectionId, lang: "fr" | "en") {
  const demo = demoOf(lang === "en" && fs.existsSync(path.join("public", "demo", "manifest.en.json")) ? "manifest.en.json" : "manifest.json");
  const [primary, secondary, accent, light, dark] = demo.palette;
  const product = { ...emptyProduct(), name: demo.product, sector: "hightech" as const, summary: demo.product, facts: [] };
  const tagline = lang === "en" ? "Technology, no detours." : "La technologie, sans détour.";
  const copy = runWithLang({ content: lang }, () => localCopy(product, { name: demo.brand, tagline, story: "", values: [] }));
  const spec = build({
    direction,
    shopName: demo.brand,
    palette: { primary, secondary, accent, light, dark },
    copy,
    images: { lifestyle: "es-en-situation-1.jpg", hero: "es-hero.jpg", banner: "es-hero.jpg", cutout: "es-produit-detoure.webp", packshot: "es-packshot.jpg", detail1: "es-detail-1.jpg", scene1: "es-scene-1.jpg", scene2: "es-scene-2.jpg", video: "es-video-1.mp4", videoPoster: "es-affiche-1.jpg", logo: "es-logo.svg" },
    files: Object.fromEntries(Object.keys(media).map((f) => [f, f])),
    product: { title: demo.product, handle: "drone", vendor: demo.brand, description_html: "", price: 34900, compare_at_price: null, currency: "EUR", options: [], variants: [], images: ["es-packshot.jpg"], tags: [] },
    language: lang,
  });
  return spec;
}

let current: { spec: ReturnType<typeof specFor>; files: Map<string, string> } | null = null;
const server = http.createServer(async (req, res) => {
  const u = new URL(req.url!, "http://x");
  const p = u.pathname.replace(/^\/p/, "") || "/";
  if (p.startsWith("/assets/")) {
    const name = decodeURIComponent(p.slice(8));
    if (media[name]) {
      res.writeHead(200, { "Content-Type": TYPES[path.extname(name)] ?? "application/octet-stream" });
      return res.end(fs.readFileSync(path.join(DEMO, media[name])));
    }
    const t = current!.files.get("assets/" + name);
    res.writeHead(t ? 200 : 404, { "Content-Type": TYPES[path.extname(name)] ?? "image/svg+xml" });
    return res.end(t ?? "");
  }
  if (p.startsWith("/__fonts/")) {
    const f = fontFilePath(p.slice(9));
    if (!f) return res.writeHead(404).end();
    res.writeHead(200, { "Content-Type": "font/ttf" });
    return res.end(fs.readFileSync(f));
  }
  const r = await renderPage({ spec: current!.spec, base: "/p", files: current!.files, cart: [] }, p, u.searchParams);
  res.writeHead(r.status, { "Content-Type": "text/html; charset=utf-8" });
  res.end(r.html);
});
await new Promise<void>((r) => server.listen(0, r));
const base = `http://localhost:${(server.address() as { port: number }).port}/p`;
// Animations figées, révélations au défilement affichées, vidéos à leur image d'affiche : vignettes stables.
const still = "*{animation:none!important;transition:none!important}[data-reveal]{opacity:1!important;transform:none!important;clip-path:none!important}";

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium" });
fs.mkdirSync(OUT, { recursive: true });
for (const id of ids) {
  for (const lang of ["fr", "en"] as const) {
    const spec = specFor(id, lang);
    current = { spec, files: compileTheme(spec) };
    const page = await browser.newPage({ viewport: { width: 1280, height: 860 }, reducedMotion: "reduce" });
    await page.goto(base + "/", { waitUntil: "networkidle" });
    await page.addStyleTag({ content: still });
    await page.waitForTimeout(600);
    // FULL=<dossier> : page entière aussi enregistrée (relecture de toute la composition).
    if (process.env.FULL) {
      fs.mkdirSync(process.env.FULL, { recursive: true });
      await page.screenshot({ path: path.join(process.env.FULL, `${id}-${lang}.png`), fullPage: true });
    }
    const png = await page.screenshot({ clip: { x: 0, y: 0, width: 1280, height: 1600 }, fullPage: true });
    await page.close();
    const name = `${id}${lang === "en" ? ".en" : ""}`;
    const img = sharp(png).resize({ width: 1200 });
    await img.clone().jpeg({ quality: 82, mozjpeg: true }).toFile(path.join(OUT, `${name}.jpg`));
    await img.clone().webp({ quality: 80 }).toFile(path.join(OUT, `${name}.webp`));
    console.log(`  ${name} ✓`);
  }
}
await browser.close();
server.close();
