/**
 * Publicités d'E-COM STUDIO IA lui-même (promotion du site), faites avec la bibliothèque de modèles du studio,
 * sans IA ni réseau :
 *   npx tsx scripts/promo-ecom-studio.ts <dossier>
 * Visuels : vraies vues du studio (images de présentation de la page d'accueil, recadrées sans leurs légendes).
 * Textes : repris de la page d'accueil (aucune promesse ajoutée, aucun chiffre inventé).
 * Écrit <dossier>/promo-<n>-<format>.jpg, <dossier>/planche.jpg et deux versions animées (MP4).
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

process.env.DATA_DIR ??= fs.mkdtempSync(path.join(os.tmpdir(), "promo-ecom-"));
const out = path.resolve(process.argv[2] ?? "promo-ecom-studio");
fs.mkdirSync(out, { recursive: true });
const sharp = (await import("sharp")).default;
const { composeAd } = await import("../src/lib/ads-v2/compose");
const { loadDocImages } = await import("../src/lib/ad-doc/server");
const { renderAnimatedDoc } = await import("../src/lib/ad-doc/animate-server");

/** Vue du studio recadrée (sans la légende des images de présentation). */
const view = (file: string, top = 110, height = 600) => sharp(path.join("public/explainers", file)).extract({ left: 0, top, width: 960, height }).jpeg({ quality: 92 }).toBuffer();
const V = { store: await view("hero.jpg"), visuals: await view("formats.jpg"), chat: await view("chat.jpg", 120, 580), calendar: await view("cal.jpg", 120, 580), brand: await view("photo.jpg") };

const palette = { primary: "#0A1024", secondary: "#3A9BE8", accent: "#2F5BEA", light: "#F5F7FC", dark: "#0A1024" };
const art = { style: "bold", heading: "Space Grotesk", headingWeight: 700, body: "Inter", display: "Archivo", displayWeight: 800, uppercase: false, cta: "pill", arrow: true, cycle: ["editorial"] } as const;
const ADS: { layout: string; bg: Buffer | null; head: string; sub: string; eyebrow?: string; scheme?: string; treatment?: string }[] = [
  { layout: "tpl:split-half", bg: V.store, head: "Votre marque, votre boutique, vos publicités.", sub: "Logo • Boutique • Publicités", eyebrow: "Studio de création", scheme: "dark" },
  { layout: "tpl:neon-glow", bg: V.store, head: "Une boutique composée pour votre marque.", sub: "Shopify • WooCommerce • PrestaShop", scheme: "dark" },
  { layout: "tpl:burst-card", bg: V.visuals, head: "Des visuels fidèles au vrai produit.", sub: "Détourage • Packshots • Scènes", eyebrow: "Aux bons formats", scheme: "brand", treatment: "natural" },
  { layout: "tpl:polaroid", bg: V.chat, head: "Tout se modifie en discutant.", sub: "Une version à chaque étape", scheme: "brand", treatment: "natural" },
  { layout: "glass", bg: V.calendar, head: "Rien ne part sans votre accord.", sub: "Publications prêtes dans le calendrier", treatment: "natural" },
  { layout: "tpl:arch-window", bg: V.brand, head: "Une identité qui part de votre produit.", sub: "Logo SVG • Palette • Typographies", scheme: "light", treatment: "natural" },
  { layout: "tpl:highlight-type", bg: null, head: "Une photo, un lien ou une description suffit.", sub: "Marque • Boutique • Images • Publications", scheme: "light" },
  { layout: "tpl:collage-trio", bg: V.visuals, head: "Des publicités que vous retouchez vous-même.", sub: "1:1 • 4:5 • 9:16 • 16:9", scheme: "dark", treatment: "natural" },
];
const F = [
  { aspect: "4:5", width: 1080, height: 1350, safe: { top: 0.05, bottom: 0.06, side: 0.05 } },
  { aspect: "1:1", width: 1080, height: 1080, safe: { top: 0.05, bottom: 0.06, side: 0.05 } },
  { aspect: "9:16", width: 1080, height: 1920, safe: { top: 0.14, bottom: 0.2, side: 0.06 } },
  { aspect: "1.91:1", width: 1200, height: 628, safe: { top: 0.05, bottom: 0.05, side: 0.05 } },
] as const;

const tiles: Buffer[] = [];
const problems: string[] = [];
for (const [n, ad] of ADS.entries()) {
  for (const f of F) {
    const r = await composeAd({ format: { platform: f.aspect === "9:16" ? "meta_story" : "meta_feed", aspect: f.aspect as never, width: f.width, height: f.height, label: f.aspect, safe: f.safe }, layout: ad.layout as never, palette, typo: { heading: art.heading, body: art.body }, art: art as never, brand: "E-COM STUDIO IA", headline: ad.head, subline: ad.sub, eyebrow: ad.eyebrow ?? null, cta: "Commencer mon projet", background: ad.bg, product: null, variant: { scheme: ad.scheme, treatment: ad.treatment as never } });
    const m = r.metrics;
    if (m.textContrast < 4.5 || m.safeOverflow || m.textOverlap || m.minFontPx < 22) problems.push(`${n + 1} ${f.aspect} ${JSON.stringify(m)}`);
    fs.writeFileSync(path.join(out, `promo-${n + 1}-${f.aspect.replace(":", "x")}.jpg`), r.jpg);
    if (f.aspect === "4:5") {
      tiles.push(await sharp(r.jpg).resize(432, 540).toBuffer());
      // Deux versions animées (vidéo) : la première et la troisième publicité.
      if (n === 0 || n === 2) {
        const images = await loadDocImages(new Map(ad.bg ? [["background", ad.bg]] : []));
        await renderAnimatedDoc(r.doc, images, path.join(out, `promo-${n + 1}-anime.mp4`), { style: n === 0 ? "slide" : "pop" });
      }
    }
  }
  console.log(`publicité ${n + 1} : ${ad.head}`);
}
const cols = 4;
await sharp({ create: { width: cols * 448 + 16, height: Math.ceil(tiles.length / cols) * 556 + 16, channels: 3, background: "#ffffff" } })
  .composite(tiles.map((t, k) => ({ input: t, left: 16 + (k % cols) * 448, top: 16 + Math.floor(k / cols) * 556 })))
  .jpeg({ quality: 88 })
  .toFile(path.join(out, "planche.jpg"));
console.log(problems.length ? `À revoir : ${problems.join(" | ")}` : "Tous les rendus sont lisibles, dans les marges, sans chevauchement.");
