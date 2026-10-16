/**
 * Publicité ARVEN de l'accueil, composée EN LOCAL par le moteur de l'éditeur de publicités du studio (composeAd, celui
 * qu'utilise un client quand il retouche une publicité), sans IA : photo IA validée (lifestyle-1 : montre entière,
 * bracelet et boucle) ou son détourage, vrai logo ARVEN, texte du propriétaire repris mot pour mot. Quatre formats.
 *
 *   npx tsx scripts/demo-arven-pubs.ts [dossier-de-sortie] [composition]
 *   (défaut : public/demo/montre, composition « panel », produit détouré posé entier sur la crème de la charte : la
 *   montre reste entière, bracelet et boucle compris, dans les quatre formats ; PHOTO=lifestyle-1.jpg PRODUCT= pour la photo en fond)
 * Sorties : pub-editeur-1x1.jpg, pub-editeur-4x5.jpg, pub-editeur-9x16.jpg, pub-editeur-16x9.jpg. Gratuit.
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { composeAd, type ComposeInput } from "../src/lib/ads-v2/compose";
import { posterFormat, type PosterAspect } from "../src/lib/ads-v2/poster";

const [out = path.join(process.cwd(), "public", "demo", "montre"), layout = "panel"] = process.argv.slice(2);
const DEMO = path.join(process.cwd(), "public", "demo", "montre");
const photo = fs.readFileSync(path.join(DEMO, process.env.PHOTO ?? "lifestyle-1.jpg"));
const asProduct = (process.env.PRODUCT ?? "1") !== "";
const logo = fs.readFileSync(path.join(DEMO, "logo.png"));
fs.mkdirSync(out, { recursive: true });

for (const aspect of ["1:1", "4:5", "9:16", "16:9"] as PosterAspect[]) {
  const r = await composeAd({
    format: posterFormat(aspect),
    layout: (process.env[`LAYOUT_${aspect.replace(":", "x")}`] ?? layout) as ComposeInput["layout"],
    // Couleurs de la charte ARVEN (planche) ; PRIMARY=crème : fond clair, le logo sombre reste lisible.
    palette: { primary: process.env.PRIMARY ?? "#E8DACF", secondary: "#E8DACF", accent: "#A86932", light: "#FAF7F5", dark: "#1E2225" },
    typo: { heading: "Montserrat", body: "Jost", headingWeight: 600 },
    brand: "ARVEN",
    // Texte donné par le propriétaire, repris mot pour mot ; « montre », jamais « chronographe ».
    headline: process.env.HEADLINE ?? "Acier et cuir véritable.",
    subline: "Montre acier et cuir",
    cta: "Découvrir",
    tagline: "Le temps, bien porté.",
    productName: "Montre acier et cuir",
    // Produit détouré posé entier (le moteur ne le rogne jamais) ; PRODUCT= (vide) : la photo sert de fond.
    background: asProduct ? (process.env.PHOTO ? photo : null) : photo,
    product: asProduct ? fs.readFileSync(path.join(DEMO, "cutout-1.webp")) : null,
    logo,
  });
  const file = path.join(out, `pub-editeur-${aspect.replace(":", "x")}.jpg`);
  await sharp(r.jpg).resize({ width: aspect === "16:9" ? 960 : 720 }).jpeg({ quality: 84, mozjpeg: true }).toFile(file);
  console.log(file, JSON.stringify(r.metrics));
}
