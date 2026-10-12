/**
 * Planches de la bibliothèque de modèles de publications (sans IA ni réseau) :
 *   npx tsx scripts/ad-library-preview.ts <dossier> [filtre]
 * <dossier>/bg contient des photos (pool.jpg, escape.jpg, car.jpg, room.jpg, lamp.jpg). Pour chaque modèle (dont
 * l'identifiant contient le filtre) : une planche <dossier>/lib/<id>.jpg (4 formats) ; une vue d'ensemble
 * <dossier>/lib/_ensemble.jpg (format 4:5) ; les mesures (contraste, taille, marges, chevauchements) en console.
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { composeAd, buildAdDocument } from "../src/lib/ads-v2/compose";
import { docMetrics } from "../src/lib/ad-doc/server";
import { TEMPLATES } from "../src/lib/ads-v2/library";
import type { AdArt } from "../src/lib/ads-v2/art";

const S = process.argv[2];
const filter = process.argv[3] ?? "";
const out = path.join(S, "lib");
fs.mkdirSync(out, { recursive: true });
const art = (o: Partial<AdArt>): AdArt => ({ style: "premium", heading: "Playfair Display", headingWeight: 700, body: "Jost", display: "Archivo", displayWeight: 800, uppercase: false, cta: "pill", arrow: true, cycle: ["editorial"], ...o });
const logo = await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="560" height="120"><text x="0" y="90" font-family="serif" font-size="96" font-weight="700" fill="#1A1A1A">MARQUE</text></svg>`)).png().toBuffer();
const logoLight = await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="560" height="120"><text x="0" y="90" font-family="serif" font-size="96" font-weight="700" fill="#FFFFFF">MARQUE</text></svg>`)).png().toBuffer();
const CASES = [
  { bg: "pool.jpg", brand: "Azur Piscines", head: "Votre été commence ici.", sub: "Conception • Construction", eyebrow: "Piscines sur mesure", cta: "Parlons de votre projet", art: art({ cta: "rounded" }), pal: { primary: "#1B2A4A", secondary: "#E8E2D6", accent: "#2E6FA0", light: "#F6F3EE", dark: "#14213D" }, logo: true },
  { bg: "escape.jpg", brand: "Brume", head: "Réveillez le goût.", sub: "Café en grains • Torréfaction artisanale", eyebrow: "Café de spécialité", cta: "Trouver mon café", art: art({ style: "bold", heading: "Oswald", headingWeight: 700, display: "Anton", displayWeight: 400 }), pal: { primary: "#7A1F1F", secondary: "#E9DCC3", accent: "#E8A33D", light: "#F4EBDC", dark: "#3A0D0D" }, logo: false },
  { bg: "room.jpg", brand: "Nuance", head: "Des murs qui vous ressemblent.", sub: "Peinture • Enduits • Finitions", eyebrow: "Artisan peintre", cta: "Demander mon devis", art: art({ heading: "Libre Baskerville", headingWeight: 700, cta: "rounded" }), pal: { primary: "#2F4A33", secondary: "#B5C4A8", accent: "#D98E4A", light: "#F4EEE3", dark: "#1F3323" }, logo: true },
  { bg: "lamp.jpg", brand: "Lumen", head: "Changez la lumière.", sub: "Lampes de caractère • Fait main", eyebrow: "Luminaires", cta: "Trouver ma lumière", art: art({ heading: "Cormorant", headingWeight: 600, display: "Bebas Neue", displayWeight: 400 }), pal: { primary: "#C2551F", secondary: "#F2C14E", accent: "#F2C14E", light: "#FBF4E8", dark: "#2A1A10" }, logo: false },
  { bg: "car.jpg", brand: "Nomade", head: "Partez léger. Voyez grand.", sub: "Sacs de randonnée • 28 à 45 L", eyebrow: "Randonnée", cta: "Voir la collection", art: art({ style: "bold", heading: "Space Grotesk", headingWeight: 700, display: "Archivo", displayWeight: 800 }), pal: { primary: "#4A5A3A", secondary: "#D9CFB8", accent: "#C8A24A", light: "#F5F1E8", dark: "#1E2416" }, logo: true },
];
const F = [
  { aspect: "4:5", width: 1080, height: 1350 },
  { aspect: "1:1", width: 1080, height: 1080 },
  { aspect: "9:16", width: 1080, height: 1920 },
  { aspect: "1.91:1", width: 1200, height: 628 },
] as const;
const safeOf = (a: string) => (a === "9:16" ? { top: 0.14, bottom: 0.2, side: 0.06 } : { top: 0.05, bottom: 0.06, side: 0.05 });
const overview: Buffer[] = [];
let problems = 0;
for (const [ti, t] of TEMPLATES.entries()) {
  if (filter && !t.id.includes(filter)) continue;
  const row: Buffer[] = [];
  for (const [fi, f] of F.entries()) {
    const c = CASES[(ti + fi) % CASES.length];
    const scheme = t.schemes[fi % t.schemes.length];
    const treatment = t.treatments?.[fi % t.treatments.length];
    const input = { format: { platform: "meta_feed", aspect: f.aspect as never, width: f.width, height: f.height, label: f.aspect, safe: safeOf(f.aspect) }, layout: `tpl:${t.id}`, palette: c.pal as never, typo: { heading: c.art.heading, body: c.art.body }, art: c.art, brand: c.brand, headline: c.head, subline: c.sub, eyebrow: c.eyebrow, cta: c.cta, background: t.photo === "none" ? null : fs.readFileSync(path.join(S, "bg", c.bg)), product: null, logo: c.logo ? logo : null, logoLight: c.logo ? logoLight : null, variant: { scheme, treatment } } as const;
    const r = await composeAd(input as never);
    const m = r.metrics;
    const bad = [m.textContrast < 4.5 && `contraste ${m.textContrast}`, m.safeOverflow && "hors marges", m.textOverlap && "chevauchement", m.minFontPx < 22 && `taille ${m.minFontPx}`].filter(Boolean);
    if (bad.length) {
      problems++;
      const b = await buildAdDocument(input as never);
      for (const pb of docMetrics(b.doc, b.images).problems) console.log(`   · ${pb.layerId} ${pb.code} ${pb.message}`);
    }
    console.log(`${t.id} ${f.aspect} ${scheme}/${treatment ?? "-"} ${bad.length ? "PROBLÈME " + bad.join(", ") : "ok"}`);
    const tile = await sharp(r.jpg).resize({ height: 540 }).toBuffer();
    row.push(tile);
    if (f.aspect === "4:5") overview.push(await sharp(r.jpg).resize(360, 450).toBuffer());
  }
  const metas = await Promise.all(row.map((b) => sharp(b).metadata()));
  const totalW = metas.reduce((a, mm) => a + (mm.width ?? 0) + 12, 12);
  let x = 12;
  await sharp({ create: { width: totalW, height: 564, channels: 3, background: "#ffffff" } })
    .composite(row.map((b, k) => { const o = { input: b, left: x, top: 12 }; x += (metas[k].width ?? 0) + 12; return o; }))
    .jpeg({ quality: 84 }).toFile(path.join(out, `${t.id}.jpg`));
}
if (overview.length) {
  const cols = 6;
  const rows = Math.ceil(overview.length / cols);
  await sharp({ create: { width: cols * 372 + 12, height: rows * 462 + 12, channels: 3, background: "#ffffff" } })
    .composite(overview.map((b, k) => ({ input: b, left: 12 + (k % cols) * 372, top: 12 + Math.floor(k / cols) * 462 })))
    .jpeg({ quality: 84 }).toFile(path.join(out, filter ? `_ensemble-${filter}.jpg` : "_ensemble.jpg"));
}
console.log(`${problems} rendu(s) à problème`);
