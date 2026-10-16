/**
 * Captures de la boutique ARVEN (démonstration de l'accueil), refaites EN LOCAL, sans IA ni studio lancé : le moteur de
 * thème du studio (buildSpec + compileTheme + renderPage, comme scripts/theme-screens.ts) compose la boutique avec les
 * textes du moteur local et uniquement les images IA validées par le propriétaire (montre entière, bracelet et boucle,
 * aucune fausse lettre) : photo d'ouverture, fond blanc, détourage, mise en situation, logo.
 *
 *   npx tsx scripts/demo-arven-boutique.ts [dossier-de-sortie] [direction]
 *   (défaut : public/demo/montre, direction « atelier » : la photo d'ouverture y tient en entier dans sa carte)
 * Sorties : boutique-ia-bureau.jpg (1200×750), boutique-ia-mobile.jpg (390×844), fiche-ia-bureau.jpg.
 * Gratuit : aucun appel réseau hors du serveur local.
 */
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import sharp from "sharp";
import { chromium } from "playwright";
import { buildSpec } from "../src/lib/theme/directions";
import { contentFromInput, libraryFiller } from "../src/lib/theme/library-fill";
import { compileTheme } from "../src/lib/theme/compile";
import { renderPage, fontFilePath } from "../src/lib/theme/render";
import { localCopy } from "../src/lib/engine/local-copy";
import { emptyProduct } from "../src/lib/project-types";
import type { DirectionId } from "../src/lib/theme/directions";

const [out = path.join(process.cwd(), "public", "demo", "montre"), direction = "atelier"] = process.argv.slice(2);
const DEMO = path.join(process.cwd(), "public", "demo", "montre");
// Images servies à la boutique : nom dans le thème → fichier validé de la démonstration.
const MEDIA: Record<string, string> = {
  "arven-ouverture.jpg": path.join(DEMO, process.env.HERO ?? "lifestyle-1.jpg"),
  "arven-fond-blanc.jpg": path.join(DEMO, "packshot-1.jpg"),
  "arven-detoure.webp": path.join(DEMO, "cutout-1.webp"),
  "arven-situation.jpg": path.join(DEMO, "lifestyle-1.jpg"),
  "arven-logo.png": path.join(DEMO, "logo.png"),
};

const product = {
  ...emptyProduct(),
  name: "Montre acier et cuir",
  nameStatus: "provided" as const,
  category: "Montres",
  // Pas de secteur : son libellé (« Bijou ») s'afficherait en sur-titre ; le vocabulaire du client est « montre ».
  sector: null,
  summary: "Montre : boîtier en acier poli, lunette graduée, cadran noir à trois compteurs argentés, guichet de date, bracelet en cuir brun surpiqué doublé de tissu bleu.",
};
const brand = { name: "ARVEN", tagline: "Le temps, bien porté.", story: "", values: [] as { title: string; text: string }[] };
const copy = localCopy(product, brand);
const input = {
  direction: direction as DirectionId,
  shopName: "ARVEN",
  palette: { primary: "#1E2225", secondary: "#E8DACF", accent: "#A86932", light: "#FAF7F5", dark: "#1E2225" },
  copy,
  images: { lifestyle: "arven-ouverture.jpg", hero: "arven-situation.jpg", packshot: "arven-fond-blanc.jpg", cutout: "arven-detoure.webp", logo: "arven-logo.png" },
  files: Object.fromEntries(Object.keys(MEDIA).map((f) => [f, f])),
  product: { title: "Montre acier et cuir", handle: "montre-acier-et-cuir", vendor: "ARVEN", description_html: `<p>${product.summary}</p>`, price: null, compare_at_price: null, currency: "EUR", options: [], variants: [], images: ["arven-fond-blanc.jpg", "arven-situation.jpg"], tags: [] },
} as const;
const spec: any = buildSpec({ ...(input as any), fill: libraryFiller(input.files as any, contentFromInput(input as any), undefined) });
const files = compileTheme(spec);

const TYPES: Record<string, string> = { ".css": "text/css", ".js": "application/javascript", ".svg": "image/svg+xml", ".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };
const server = http.createServer(async (req, res) => {
  const u = new URL(req.url!, "http://x");
  const p = u.pathname.replace(/^\/p/, "") || "/";
  if (p.startsWith("/assets/")) {
    const name = decodeURIComponent(p.slice(8));
    const media = MEDIA[name];
    const body = media ? fs.readFileSync(media) : files.get("assets/" + name);
    res.writeHead(body ? 200 : 404, { "Content-Type": TYPES[path.extname(name)] ?? "application/octet-stream" });
    return res.end(body ?? "");
  }
  if (p.startsWith("/__fonts/")) {
    const f = fontFilePath(p.slice(9));
    if (!f) return res.writeHead(404).end();
    res.writeHead(200, { "Content-Type": "font/ttf" });
    return res.end(fs.readFileSync(f));
  }
  const r = await renderPage({ spec, base: "/p", files, cart: [] }, p, u.searchParams);
  res.writeHead(r.status, { "Content-Type": "text/html; charset=utf-8" });
  res.end(r.html);
});
await new Promise<void>((r) => server.listen(0, r));
const base = `http://localhost:${(server.address() as { port: number }).port}/p`;
const still = "*{animation:none!important;transition:none!important}[data-reveal]{opacity:1!important;transform:none!important;clip-path:none!important}";

fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
// Ordinateur : rendu en 1600 × 1000 (la carte de la photo d'ouverture y tient entière), enregistré en 1200 × 750 comme les autres captures de l'accueil.
const DESK = { width: Number(process.env.DESK_W ?? 1600), height: Math.round(Number(process.env.DESK_W ?? 1600) / 1.6) };
const shots: [string, string, { width: number; height: number }, boolean, { width: number; height: number }][] = [
  ["boutique-ia-bureau", "/", DESK, false, { width: 1200, height: 750 }],
  ["boutique-ia-mobile", "/", { width: 390, height: 844 }, true, { width: 390, height: 844 }],
  ["fiche-ia-bureau", `/products/${input.product.handle}`, DESK, false, { width: 1200, height: 750 }],
];
const errors: string[] = [];
for (const [name, route, viewport, mobile, size] of shots) {
  const page = await browser.newPage({ viewport, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 2 });
  page.on("pageerror", (e) => errors.push(`${name} : ${e.message}`));
  page.on("response", (r) => r.status() >= 400 && errors.push(`${name} : ${r.status()} ${r.url()}`));
  await page.goto(base + route, { waitUntil: "networkidle" });
  await page.addStyleTag({ content: still });
  // Téléphone : la photo d'ouverture est sous les textes ; la capture la montre en entier (jamais une montre coupée).
  if (mobile && route === "/")
    await page.evaluate(() => [...document.images].find((i) => i.src.includes("arven-ouverture"))?.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(300);
  const png = await page.screenshot();
  await sharp(png).resize(size.width, size.height).jpeg({ quality: 84, mozjpeg: true }).toFile(path.join(out, `${name}.jpg`));
  await page.close();
}
await browser.close();
server.close();
console.log(errors.length ? `Problèmes :\n${errors.join("\n")}` : `Captures écrites dans ${out}`);
