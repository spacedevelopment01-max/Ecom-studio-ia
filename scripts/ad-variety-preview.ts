/**
 * Planche de variété des publicités (sans IA ni réseau) : les mêmes photos dans des compositions, traitements
 * d'image et places du logo différents, pour vérifier que deux créations ne se ressemblent pas.
 *   npx tsx scripts/ad-variety-preview.ts <dossier>
 * <dossier>/bg contient des photos (pool.jpg, escape.jpg, car.jpg, room.jpg, lamp.jpg) ; écrit <dossier>/variete-<format>.jpg.
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { composeAd } from "../src/lib/ads-v2/compose";
import type { AdArt, AdVariant } from "../src/lib/ads-v2/art";

const S = process.argv[2];
const art = (o: Partial<AdArt>): AdArt => ({ style: "premium", heading: "Playfair Display", headingWeight: 700, body: "Jost", display: "Archivo", displayWeight: 800, uppercase: false, cta: "pill", arrow: true, cycle: ["editorial"], ...o });
const logo = await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="560" height="120"><text x="0" y="90" font-family="serif" font-size="96" font-weight="700" fill="#1A1A1A">MARQUE</text></svg>`)).png().toBuffer();
const logoLight = await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="560" height="120"><text x="0" y="90" font-family="serif" font-size="96" font-weight="700" fill="#FFFFFF">MARQUE</text></svg>`)).png().toBuffer();
type Case = { layout: string; bg: string; brand: string; head: string; sub: string; cta: string; eyebrow?: string; art: AdArt; pal: Record<string, string>; variant?: AdVariant; logo?: boolean };
const cafe = { primary: "#7A1F1F", secondary: "#E9DCC3", accent: "#E8A33D", light: "#F4EBDC", dark: "#3A0D0D" };
const azur = { primary: "#1B2A4A", secondary: "#E8E2D6", accent: "#2E6FA0", light: "#F6F3EE", dark: "#14213D" };
const lumen = { primary: "#C2551F", secondary: "#F2C14E", accent: "#F2C14E", light: "#FBF4E8", dark: "#2A1A10" };
const nuance = { primary: "#2F4A33", secondary: "#B5C4A8", accent: "#D98E4A", light: "#F4EEE3", dark: "#1F3323" };
const auto = { primary: "#D7262E", secondary: "#2B2B2B", accent: "#E32630", light: "#F5F2EE", dark: "#0E0E0E" };
const CASES: Case[] = [
  { layout: "bigtype", bg: "escape.jpg", brand: "Minuit 13", head: "Le dernier indice, c'est vous.", sub: "Escape game • 2 à 6 joueurs", cta: "Réserver", art: art({ style: "bold", display: "Anton", displayWeight: 400 }), pal: auto, variant: { treatment: "duotone", logo: "foot" }, logo: true },
  { layout: "tilt", bg: "lamp.jpg", brand: "Lumen", head: "Changez la lumière.", sub: "Lampes de caractère • Fait main", cta: "Trouver ma lumière", art: art({ heading: "Instrument Serif", headingWeight: 400 }), pal: lumen, variant: { treatment: "warm" } },
  { layout: "capsule", bg: "pool.jpg", brand: "Azur Piscines", head: "Votre été commence ici.", sub: "Conception • Construction", cta: "Parlons de votre projet", art: art({ cta: "rounded" }), pal: azur, variant: { treatment: "punch" }, logo: true },
  { layout: "detail", bg: "room.jpg", brand: "Nuance", head: "Le détail qui change une pièce.", sub: "Peinture • Enduits • Finitions", cta: "Demander mon devis", art: art({ heading: "Libre Baskerville" }), pal: nuance, variant: { treatment: "warm", logo: "corner" }, logo: true },
  { layout: "glass", bg: "car.jpg", brand: "Atelier Carrosserie", head: "La précision jusque dans le reflet.", sub: "Carrosserie • Peinture", cta: "Demander un devis", art: art({ heading: "Playfair Display" }), pal: auto, variant: { treatment: "cool" }, logo: true },
  { layout: "lower", bg: "escape.jpg", brand: "Brume", head: "Réveillez le goût.", sub: "Café en grains • Torréfaction artisanale", cta: "Trouver mon café", art: art({ style: "bold", heading: "Oswald", display: "Anton", displayWeight: 400 }), pal: cafe, variant: { treatment: "moody", logo: "foot" }, logo: true },
  { layout: "editorial", bg: "pool.jpg", brand: "Azur Piscines", head: "Plongez dans votre été.", sub: "Conception • Rénovation", cta: "Voir nos réalisations", art: art({}), pal: azur, variant: { treatment: "mono", logo: "corner" }, logo: true },
  { layout: "tilt", bg: "room.jpg", brand: "Nuance", head: "Des murs qui vous ressemblent.", sub: "Peinture intérieure • Finitions", cta: "Demander mon devis", art: art({ heading: "Libre Baskerville", cta: "rounded" }), pal: nuance, variant: { treatment: "natural" }, logo: true },
  { layout: "bigtype", bg: "lamp.jpg", brand: "Lumen", head: "Lumière franche.", sub: "Lampes de caractère", cta: "Découvrir", art: art({ style: "bold", display: "Bebas Neue", displayWeight: 400 }), pal: lumen, variant: { treatment: "mono" } },
  { layout: "capsule", bg: "escape.jpg", brand: "Brume", head: "Le matin a un goût.", sub: "Torréfaction artisanale", cta: "Découvrir nos cafés", art: art({ heading: "Instrument Serif", headingWeight: 400 }), pal: cafe, variant: { treatment: "warm" } },
  { layout: "glass", bg: "pool.jpg", brand: "Azur Piscines", head: "Une piscine à votre image.", sub: "Étude • Construction • Entretien", cta: "Parlons-en", art: art({}), pal: azur, variant: { treatment: "natural" } },
  { layout: "detail", bg: "car.jpg", brand: "Atelier Carrosserie", head: "Chaque reflet compte.", sub: "Carrosserie • Peinture", cta: "Prendre rendez-vous", art: art({ style: "bold", heading: "Oswald" }), pal: auto, variant: { treatment: "punch" }, logo: true },
];
const F = [
  { aspect: "4:5", width: 1080, height: 1350 },
  { aspect: "1:1", width: 1080, height: 1080 },
  { aspect: "9:16", width: 1080, height: 1920 },
  { aspect: "1.91:1", width: 1200, height: 628 },
] as const;
const safeOf = (a: string) => (a === "9:16" ? { top: 0.14, bottom: 0.2, side: 0.06 } : { top: 0.05, bottom: 0.06, side: 0.05 });
for (const f of F) {
  const tiles: Buffer[] = [];
  const tw = 420;
  const th = Math.round((tw * f.height) / f.width);
  for (const c of CASES) {
    const r = await composeAd({ format: { platform: "meta_feed", aspect: f.aspect as never, width: f.width, height: f.height, label: f.aspect, safe: safeOf(f.aspect) }, layout: c.layout as never, palette: c.pal as never, typo: { heading: c.art.heading, body: c.art.body }, art: c.art, brand: c.brand, headline: c.head, subline: c.sub, eyebrow: c.eyebrow ?? null, cta: c.cta, background: fs.readFileSync(path.join(S, "bg", c.bg)), product: null, logo: c.logo ? logo : null, logoLight: c.logo ? logoLight : null, variant: c.variant });
    const bad = r.metrics.textContrast < 4.5 || r.metrics.safeOverflow || r.metrics.textOverlap || r.metrics.minFontPx < 22;
    console.log(f.aspect, c.layout, c.variant?.treatment, bad ? "PROBLÈME" : "ok", JSON.stringify(r.metrics));
    tiles.push(await sharp(r.jpg).resize(tw, th).toBuffer());
  }
  const cols = f.aspect === "1.91:1" ? 3 : 4;
  const gap = 16;
  const rows = Math.ceil(tiles.length / cols);
  await sharp({ create: { width: cols * (tw + gap) + gap, height: rows * (th + gap) + gap, channels: 3, background: "#ffffff" } })
    .composite(tiles.map((t, k) => ({ input: t, left: gap + (k % cols) * (tw + gap), top: gap + Math.floor(k / cols) * (th + gap) })))
    .jpeg({ quality: 86 })
    .toFile(path.join(S, `variete-${f.aspect.replace(":", "x")}.jpg`));
}
