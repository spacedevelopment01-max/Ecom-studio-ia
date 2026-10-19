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
import { ACTIVE_THEMES } from "../src/lib/theme/theme-fit";
import { localCopy } from "../src/lib/engine/local-copy";
import { emptyProduct } from "../src/lib/project-types";
import { runWithLang } from "../src/lib/i18n-server";
import { build } from "../tests/fixtures";

// Par défaut, les vignettes du catalogue actif (les quatre thèmes de référence) ; un identifiant explicite reste accepté pour lire un projet existant.
const ids = (process.argv.slice(2).length ? process.argv.slice(2) : [...ACTIVE_THEMES]) as DirectionId[];
const OUT = path.join("public", "demo", "directions");
const DEMO_ID = process.env.DEMO ?? "onde";
const DEMO = path.join("public", "demo", DEMO_ID);
type Demo = { id: string; brand: string; product: string; sector: string; palette: string[]; photo: string; logo: string; images: { src: string; label: string }[]; business?: "products" | "services" };
const demoOf = (file: string): Demo => (JSON.parse(fs.readFileSync(path.join("public", "demo", file), "utf8")).demos as Demo[]).find((d) => d.id === DEMO_ID) ?? (JSON.parse(fs.readFileSync(path.join("public", "demo", "manifest.json"), "utf8")).demos as Demo[]).find((d) => d.id === DEMO_ID)!;
/** Composition « site de services » quand la démonstration est une entreprise de services (SERVICES=1 pour forcer). */
const SERVICES = process.env.SERVICES === "1" || demoOf("manifest.json").business === "services";
// Médias de la démonstration : nom du fichier dans le thème → fichier sur le disque (public/demo/<id>/, kit privé).
const fileBase = (src: string) => path.basename(src);
const d0 = demoOf("manifest.json");
const byLabel = (re: RegExp, n = 0) => d0.images.filter((x) => re.test(x.label))[n]?.src;
const ext = (src: string | undefined) => (src ? path.extname(src) : ".jpg");
const media: Record<string, string> = {};
const slot = (name: string, src: string | undefined) => { if (src) media[name + ext(src)] = fileBase(src); return src ? name + ext(src) : undefined; };
const images = {
  lifestyle: slot("es-en-situation-1", d0.photo), hero: slot("es-hero", byLabel(/bannière|banner/i) ?? d0.photo), banner: slot("es-banniere", byLabel(/bannière|banner/i)),
  packshot: slot("es-packshot", byLabel(/packshot|fond blanc/i)), cutout: undefined, detail1: slot("es-detail-1", byLabel(/détail|detail/i, 0)), detail2: slot("es-detail-2", byLabel(/détail|detail/i, 1)),
  scene1: slot("es-scene-1", byLabel(/scène|scene/i, 0)), scene2: slot("es-scene-2", byLabel(/scène|scene/i, 1)), logo: slot("es-logo", d0.logo || undefined),
} as Record<string, string | undefined>;
const TYPES: Record<string, string> = { ".jpg": "image/jpeg", ".webp": "image/webp", ".mp4": "video/mp4", ".svg": "image/svg+xml", ".css": "text/css", ".js": "application/javascript" };

function specFor(direction: DirectionId, lang: "fr" | "en") {
  const demo = demoOf(lang === "en" && fs.existsSync(path.join("public", "demo", "manifest.en.json")) ? "manifest.en.json" : "manifest.json");
  const [primary, secondary, accent, light, dark] = demo.palette;
  const product = { ...emptyProduct(), name: demo.product, sector: (SERVICES ? "services" : "maison") as never, summary: demo.product, facts: [] };
  const copy = runWithLang({ content: lang }, () => localCopy(product, { name: demo.brand, tagline: "", story: "", values: [] }));
  const services = SERVICES
    ? {
        services: [
          { key: "conseil", name: lang === "en" ? "Advice and direction" : "Conseil & direction", description: lang === "en" ? "Clarify the mood and the choices that give your interior a direction." : "Préciser l'ambiance et les choix qui donneront une direction à votre intérieur." },
          { key: "piece", name: lang === "en" ? "One room" : "Aménagement d'une pièce", description: lang === "en" ? "Organise uses, circulation and materials at the scale of a room." : "Organiser les usages, la circulation et les matières à l'échelle d'une pièce." },
          { key: "ensemble", name: lang === "en" ? "Whole project" : "Projet d'ensemble", description: lang === "en" ? "Connect several spaces around one intention." : "Relier plusieurs espaces autour d'une intention." },
        ],
        area: "", address: "", phone: "", email: "", hours: "", bookingUrl: "", contactMode: "form" as const,
      }
    : undefined;
  const spec = build({
    direction,
    shopName: demo.brand,
    palette: { primary, secondary, accent, light, dark },
    copy,
    images: Object.fromEntries(Object.entries(images).filter(([, v]) => v)) as Parameters<typeof build>[0]["images"],
    files: Object.fromEntries(Object.keys(media).map((f) => [f, f])),
    product: { title: demo.product, handle: "produit", vendor: demo.brand, description_html: "", price: 2490, compare_at_price: null, currency: "EUR", options: [], variants: [], images: [images.packshot ?? images.lifestyle ?? ""].filter(Boolean), tags: [] },
    language: lang,
    ...(services ? { business: "services" as const, services } : {}),
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
    // CAPTURES=1 : captures de la démonstration elle-même (accueil ordinateur et téléphone, fiche produit) dans
    // public/demo/<id>/ (kit privé, hors dépôt), pour l'accueil, la découverte et la page Thèmes.
    if (process.env.CAPTURES === "1" && id === DEMO_ID) {
      const shots: [string, { width: number; height: number }, string][] = SERVICES
        ? [["site-bureau", { width: 1440, height: 900 }, "/"], ["site-mobile", { width: 390, height: 844 }, "/"]]
        : [["boutique-bureau", { width: 1440, height: 900 }, "/"], ["boutique-mobile", { width: 390, height: 844 }, "/"], ["fiche-produit", { width: 1440, height: 900 }, "/products/produit"]];
      for (const [name, viewport, route] of shots) {
        const pg = await browser.newPage({ viewport, reducedMotion: "reduce" });
        await pg.goto(base + route, { waitUntil: "networkidle" });
        await pg.addStyleTag({ content: still });
        await pg.waitForTimeout(600);
        const shot = await pg.screenshot({ clip: { x: 0, y: 0, width: viewport.width, height: viewport.width < 600 ? 1400 : 1400 }, fullPage: true });
        await pg.close();
        const file = `${name}${lang === "en" ? ".en" : ""}`;
        await sharp(shot).resize({ width: Math.min(1400, viewport.width) }).jpeg({ quality: 84, mozjpeg: true }).toFile(path.join(DEMO, `${file}.jpg`));
        await sharp(shot).resize({ width: Math.min(1400, viewport.width) }).webp({ quality: 80 }).toFile(path.join(DEMO, `${file}.webp`));
        console.log(`  ${DEMO_ID}/${file} ✓`);
      }
    }
    const name = `${id}${lang === "en" ? ".en" : ""}`;
    const img = sharp(png).resize({ width: 1200 });
    await img.clone().jpeg({ quality: 82, mozjpeg: true }).toFile(path.join(OUT, `${name}.jpg`));
    await img.clone().webp({ quality: 80 }).toFile(path.join(OUT, `${name}.webp`));
    console.log(`  ${name} ✓`);
  }
}
await browser.close();
server.close();
