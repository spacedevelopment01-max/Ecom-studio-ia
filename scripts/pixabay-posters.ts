/**
 * Planche d'affiches sur de VRAIES photos Pixabay, avec le même moteur que le studio (aucune IA, aucune dépense) :
 *   PIXABAY_API_KEY=… npx tsx scripts/pixabay-posters.ts <dossier>
 * Pour chaque exemple (produit ou service) : recherche Pixabay par mots du métier ou du produit, photos pertinentes
 * seulement (description qui cite le sujet), choix de la meilleure pour une affiche (zone calme pour le texte,
 * cadrage, définition, popularité), puis affiche dans plusieurs formats. Écrit <dossier>/<exemple>-<format>.jpg,
 * <dossier>/planche.jpg et <dossier>/sources.txt (photo retenue, auteur, page Pixabay : crédit et vérification).
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

process.env.DATA_DIR ??= fs.mkdtempSync(path.join(os.tmpdir(), "pixabay-posters-"));
const out = process.argv[2] ?? "pixabay-posters";
fs.mkdirSync(out, { recursive: true });

const { searchStock, downloadStock } = await import("../src/lib/stock/photos");
const { adFitOrder } = await import("../src/lib/stock/ad-fit");
const { rankStock } = await import("../src/lib/stock/trade-queries");
const { composeAd } = await import("../src/lib/ads-v2/compose");
const sharp = (await import("sharp")).default;

if (!process.env.PIXABAY_API_KEY) {
  console.error("PIXABAY_API_KEY manquante (variable d'environnement) : aucune recherche possible.");
  process.exit(1);
}

type Ex = { name: string; queries: string[]; must: string[]; avoid?: string[]; brand: string; head: string; sub: string; cta: string; heading: string; body?: string; style?: "premium" | "bold" | "craft" | "warm"; layouts: string[]; pal: Record<string, string> };
const EX: Ex[] = [
  { name: "cafe", queries: ["coffee beans cup", "espresso cup coffee beans"], must: ["coffee", "espresso"], brand: "Brume", head: "Réveillez le goût.", sub: "Café en grains • Torréfaction artisanale", cta: "Trouver mon café", heading: "Anton", style: "bold", layouts: ["poster", "corner"], pal: { primary: "#7A1F1F", secondary: "#E9DCC3", accent: "#F1E6D0", light: "#F4EBDC", dark: "#3A0D0D" } },
  { name: "randonnee", queries: ["hiking backpack mountain", "backpack mountain sunrise"], must: ["backpack", "hiking"], brand: "Nomade", head: "Partez léger. Voyez grand.", sub: "Le sac de vos prochaines escapades", cta: "Explorer la collection", heading: "Libre Baskerville", layouts: ["editorial", "lower"], pal: { primary: "#4A5A3A", secondary: "#D9CFB8", accent: "#5E6B48", light: "#F5F1E8", dark: "#1E2416" } },
  { name: "serum", queries: ["serum", "face serum", "serum skincare"], must: ["serum"], avoid: ["vaccine", "injection", "medicine", "needle", "syringe"], brand: "Aura", head: "Le rituel qui change tout.", sub: "Sérum visage • Texture légère", cta: "Découvrir", heading: "Cormorant", style: "premium", layouts: ["editorial", "panel"], pal: { primary: "#3B2A1E", secondary: "#E8DCC8", accent: "#1A1410", light: "#F6EFE4", dark: "#1A1410" } },
  { name: "lampe", queries: ["table lamp", "desk lamp light"], must: ["table lamp", "desk lamp", "bedside lamp"], brand: "Lumen", head: "Changez la lumière.", sub: "Lampes de caractère", cta: "Trouver ma lumière", heading: "Cormorant", style: "premium", layouts: ["corner", "editorial"], pal: { primary: "#C2551F", secondary: "#F2C14E", accent: "#F2C14E", light: "#FBF4E8", dark: "#2A1A10" } },
  { name: "peintre", queries: ["painter roller wall", "house painter painting wall"], must: ["painter", "paint roller", "roller"], brand: "Nuance", head: "Un nouveau souffle pour vos murs.", sub: "Peinture intérieure • Finitions", cta: "Demander mon devis", heading: "Libre Baskerville", style: "craft", layouts: ["editorial", "panel"], pal: { primary: "#2F4A33", secondary: "#B5C4A8", accent: "#2F4A33", light: "#F4EEE3", dark: "#1F3323" } },
  { name: "piscine", queries: ["swimming pool villa", "infinity pool sea"], must: ["pool", "swimming"], brand: "Azur Piscines", head: "Votre été commence ici.", sub: "Conception • Construction • Rénovation", cta: "Parlons de votre projet", heading: "Playfair Display", style: "craft", layouts: ["panel", "lower"], pal: { primary: "#1B2A4A", secondary: "#E8E2D6", accent: "#2E6FA0", light: "#F6F3EE", dark: "#14213D" } },
  { name: "boulangerie", queries: ["bread bakery", "fresh bread loaves"], must: ["bread", "bakery", "baguette"], brand: "Fournil d'Élise", head: "Le pain du matin, fait ici.", sub: "Levain naturel • Farines locales", cta: "Voir nos pains", heading: "Playfair Display", style: "warm", layouts: ["editorial", "corner"], pal: { primary: "#8A5A2B", secondary: "#F1E3C8", accent: "#F1E3C8", light: "#FBF5EA", dark: "#2B1A0D" } },
  { name: "coiffeur", queries: ["hair salon", "hairdresser salon chair"], must: ["hair", "salon", "hairdresser", "barber"], brand: "Atelier Mèche", head: "Votre style, sans compromis.", sub: "Coupe • Couleur • Soin", cta: "Prendre rendez-vous", heading: "Instrument Serif", style: "premium", layouts: ["lower", "panel"], pal: { primary: "#2B2B2B", secondary: "#E6DDD3", accent: "#C9A27E", light: "#F7F3EE", dark: "#151515" } },
];

const ASPECTS = [
  { aspect: "4:5", width: 1080, height: 1350 },
  { aspect: "1:1", width: 1080, height: 1080 },
  { aspect: "1.91:1", width: 1200, height: 628 },
] as const;

const sources: string[] = [];
const tiles: Buffer[] = [];
for (const ex of EX) {
  const found = await searchStock(ex.queries, "landscape", "en", new Set(), 40);
  const ranked = rankStock(found, ex.must, false).filter((p) => !ex.avoid?.some((w) => p.alt.toLowerCase().includes(w)));
  const best = (await adFitOrder(ranked, "1:1", { top: 12 }))[0];
  if (!best) {
    sources.push(`${ex.name} : aucune photo pertinente trouvée (${found.length} résultats, aucun ne cite ${ex.must.join("/")})`);
    continue;
  }
  // Pixabay limite les téléchargements rapprochés (429) : on attend puis on réessaie.
  let bg: Buffer | undefined;
  for (let t = 0; !bg; t++) {
    try {
      bg = await downloadStock(best);
    } catch (e) {
      if (t >= 4 || !/429/.test((e as Error).message)) throw e;
      await new Promise((r) => setTimeout(r, 15_000 * (t + 1)));
    }
  }
  sources.push(`${ex.name} : ${best.page} — ${best.author} (${best.license}) — « ${best.alt} »`);
  const art = { style: ex.style ?? "warm", heading: ex.heading, headingWeight: ex.heading === "Anton" ? 400 : ex.heading === "Cormorant" ? 500 : 600, body: ex.body ?? "Jost", display: ex.heading === "Anton" ? "Anton" : "Archivo", displayWeight: ex.heading === "Anton" ? 400 : 800, uppercase: false, cta: ex.style === "craft" ? "rounded" : "pill", arrow: ex.style !== "bold", cycle: ["editorial"] } as const;
  for (const [k, f] of ASPECTS.entries()) {
    const layout = ex.layouts[k % ex.layouts.length];
    const r = await composeAd({ format: { platform: "meta_feed", aspect: f.aspect as never, width: f.width, height: f.height, label: f.aspect, safe: { top: 0.05, bottom: 0.06, side: 0.05 } }, layout: layout as never, palette: ex.pal as never, typo: { heading: ex.heading, body: ex.body ?? "Jost" }, art: art as never, brand: ex.brand, headline: ex.head, subline: ex.sub, cta: ex.cta, background: bg, product: null });
    const file = path.join(out, `${ex.name}-${f.aspect.replace(":", "x")}-${layout}.jpg`);
    fs.writeFileSync(file, r.jpg);
    if (k < 2) tiles.push(await sharp(r.jpg).resize(540, 540, { fit: "contain", background: "#ffffff" }).toBuffer());
  }
  console.log(`${ex.name} : ${best.page}`);
}
fs.writeFileSync(path.join(out, "sources.txt"), sources.join("\n") + "\n");
if (tiles.length) {
  const cols = 4;
  const rows = Math.ceil(tiles.length / cols);
  await sharp({ create: { width: cols * 540, height: rows * 540, channels: 3, background: "#ffffff" } })
    .composite(tiles.map((t, i) => ({ input: t, left: (i % cols) * 540, top: Math.floor(i / cols) * 540 })))
    .jpeg({ quality: 88 })
    .toFile(path.join(out, "planche.jpg"));
}
console.log(sources.join("\n"));
