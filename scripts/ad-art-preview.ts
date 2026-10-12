/**
 * Planche de contrôle des compositions publicitaires (Ads V2), sans IA ni réseau :
 *   npx tsx scripts/ad-art-preview.ts <dossier>
 * <dossier>/bg contient des photos de fond (pool.jpg, escape.jpg, car.jpg, room.jpg, lamp.jpg) ; les créations
 * (6 compositions × 4 formats : 1:1, 4:5, 9:16, 1,91:1) sont écrites dans <dossier>/out avec leurs mesures.
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { composeAd } from "../src/lib/ads-v2/compose";
import type { AdArt } from "../src/lib/ads-v2/art";
const S = process.argv[2];
const F = [
  { aspect: "1:1", width: 1080, height: 1080 },
  { aspect: "4:5", width: 1080, height: 1350 },
  { aspect: "9:16", width: 1080, height: 1920 },
  { aspect: "1.91:1", width: 1200, height: 628 },
] as const;
const safeOf = (a: string) => (a === "9:16" ? { top: 0.14, bottom: 0.2, side: 0.06 } : { top: 0.05, bottom: 0.06, side: 0.05 });
const art = (o: Partial<AdArt>): AdArt => ({ style: "premium", heading: "Playfair Display", headingWeight: 700, body: "Jost", display: "Archivo", displayWeight: 800, uppercase: false, cta: "pill", arrow: true, cycle: ["editorial"], ...o });
const logoPng = async (svg: string) => sharp(Buffer.from(fs.readFileSync(svg))).resize({ height: 200 }).png().toBuffer();
const cases = [
  { name: "piscine-panel", layout: "panel", bg: "pool.jpg", brand: "Azur Piscines", head: "Votre été commence ici.", sub: "Conception • Construction • Rénovation", cta: "Parlons de votre projet", art: art({ heading: "Playfair Display", headingWeight: 600, cta: "rounded" }), pal: { primary: "#1B2A4A", secondary: "#E8E2D6", accent: "#2E6FA0", light: "#F6F3EE", dark: "#14213D" } },
  { name: "escape-poster", layout: "poster", bg: "escape.jpg", brand: "Minuit 13", head: "Le dernier indice, c'est vous.", sub: "Escape game • Une aventure à partager", cta: "Réserver une session", art: art({ heading: "Playfair Display", headingWeight: 600, arrow: false }), pal: { primary: "#C9A45C", secondary: "#2A2117", accent: "#D4AF63", light: "#F3EBDD", dark: "#120E0A" } },
  { name: "auto-frame", layout: "frame", bg: "car.jpg", brand: "Atelier Carrosserie", head: "La précision jusque dans le reflet.", sub: "Carrosserie • Peinture • Finition", eyebrow: "Atelier carrosserie", cta: "Demander un devis", art: art({ heading: "Playfair Display", headingWeight: 700 }), pal: { primary: "#D7262E", secondary: "#2B2B2B", accent: "#E32630", light: "#F5F2EE", dark: "#0E0E0E" } },
  { name: "peinture-editorial", layout: "editorial", bg: "room.jpg", brand: "Nuance", head: "Un nouveau souffle pour vos murs.", sub: "Peinture intérieure & finitions", cta: "Demander mon devis", art: art({ heading: "Libre Baskerville", headingWeight: 700 }), pal: { primary: "#2F4A33", secondary: "#B5C4A8", accent: "#2F4A33", light: "#F4EEE3", dark: "#1F3323" } },
  { name: "lampe-band", layout: "band", bg: "lamp.jpg", brand: "Lumen", head: "Changez la lumière.", sub: "Lampes de caractère", cta: "Trouver ma lumière", art: art({ heading: "Instrument Serif", headingWeight: 400, display: "Bricolage Grotesque", displayWeight: 800, arrow: false }), pal: { primary: "#C2551F", secondary: "#F2C14E", accent: "#F2C14E", light: "#FBF4E8", dark: "#2A1A10" } },
  { name: "cafe-poster-bold", layout: "poster", bg: "escape.jpg", brand: "Brume", head: "Réveillez le goût.", sub: "Café en grains • Torréfaction artisanale", cta: "Trouver mon café", art: art({ style: "bold", heading: "Playfair Display", headingWeight: 700, display: "Anton", displayWeight: 400, cta: "pill", arrow: false }), pal: { primary: "#7A1F1F", secondary: "#E9DCC3", accent: "#F1E6D0", light: "#F4EBDC", dark: "#3A0D0D" } },
  { name: "nomade-editorial", layout: "editorial", bg: "car.jpg", brand: "Nomade", head: "Partez léger. Voyez grand.", sub: "Le sac de vos prochaines escapades", cta: "Explorer la collection", art: art({ heading: "Libre Baskerville", headingWeight: 700, body: "Jost" }), pal: { primary: "#4A5A3A", secondary: "#D9CFB8", accent: "#5E6B48", light: "#F5F1E8", dark: "#1E2416" } },
  { name: "the-typo", layout: "typographic", bg: null, brand: "Verger", head: "Le thé glacé qui sent la pêche.", sub: "Thé glacé • 33 cl", cta: "Découvrir", product: "public/demo/verger/cutout-1.webp", logo: "public/demo/verger/logo.svg", art: art({ heading: "Cormorant", headingWeight: 600 }), pal: { primary: "#E8732C", secondary: "#F7D9B9", accent: "#2E5E3A", light: "#FFF6EC", dark: "#3A1E0E" } },
] as const;
for (const c of cases) {
  const bg = c.bg ? fs.readFileSync(path.join(S, "bg", c.bg)) : null;
  const product = "product" in c ? await sharp(c.product).png().toBuffer() : null;
  const logo = "logo" in c ? await logoPng(c.logo) : null;
  const outs: string[] = [];
  for (const f of F) {
    const r = await composeAd({ format: { platform: "meta_feed", aspect: f.aspect as any, width: f.width, height: f.height, label: f.aspect, safe: safeOf(f.aspect) }, layout: c.layout as any, palette: c.pal, typo: { heading: c.art.heading, body: c.art.body }, brand: c.brand, headline: c.head, subline: c.sub, eyebrow: "eyebrow" in c ? c.eyebrow : null, cta: c.cta, background: bg, product, logo, art: c.art });
    const o = path.join(S, "out", `${c.name}-${f.aspect.replace(":", "x")}.jpg`);
    fs.writeFileSync(o, r.jpg);
    outs.push(o);
    console.log(c.name, f.aspect, JSON.stringify(r.metrics));
  }
}
