/**
 * Démonstrations de l'accueil : 3 publications « entièrement faites par l'IA » par démo, avec la MÊME consigne que le
 * studio (aiPostPrompt de social-v2/ai-post.ts). Écrit une spécification par démo pour scripts/alibaba-qwen-essai.ts
 * (un envoi par image, plafond). Gratuit : ne fait aucun appel.
 *   npx tsx scripts/demo-posts-ia-spec.ts <dossier des références> <dossier de sortie>
 * Nouvel essai ciblé (comme le studio après un contrôle refusé) : ONLY=<id,id> FIX="<correction>" → spécifications
 * « <démo>-correction.json » limitées à ces publications, consigne de correction ajoutée.
 */
import fs from "node:fs";
import path from "node:path";
import { aiPostPrompt, type AiPostTexts } from "@/lib/social-v2/ai-post";

type Demo = { id: string; brand: string; product: string; summary: string; business: "products" | "services"; palette: string[]; posts: { title: string; pillar: string; aspect: "4:5" | "1:1"; texts: Omit<AiPostTexts, "brand"> }[] };
const DEMOS: Demo[] = [
  {
    id: "casque", brand: "Sonore", product: "Casque audio", business: "products", palette: ["#0B0F1A", "#8A9BC2", "#00E0A4", "#E8EEF6", "#05070D"],
    summary: "Casque audio supra-auriculaire noir, coques en métal brossé argenté, arceau rembourré.",
    posts: [
      { title: "Votre musique en grand", pillar: "inspiration", aspect: "4:5", texts: { headline: "Votre musique, en grand.", subline: "Casque audio supra-auriculaire", cta: "Découvrir", scene: "a dark recording studio at night, brushed aluminium surfaces and a soft mint-green rim light, the headphones floating above a glossy black plinth, subtle reflections" } },
      { title: "Un moment pour soi", pillar: "usage", aspect: "1:1", texts: { headline: "Écoutez autrement.", subline: "Casque audio Sonore", cta: "Commander", scene: "a walnut desk by a tall window at golden hour, vinyl records and a turntable softly blurred behind, warm sunlight grazing the brushed metal ear cups" } },
      { title: "Toujours avec vous", pillar: "style", aspect: "4:5", texts: { headline: "Le son vous suit.", subline: "Casque audio supra-auriculaire", cta: "Découvrir", scene: "an urban loft at night, raw concrete wall and a city skyline in deep blue bokeh through the glass, the headphones resting on a leather armchair, cool night reflections" } },
    ],
  },
  {
    id: "gourde", brand: "Cime", product: "Gourde isotherme 750 ml", business: "products", palette: ["#1E2326", "#9AA5AA", "#FF4D00", "#F4F6F6", "#0E1214"],
    summary: "Gourde isotherme double paroi en inox, 750 ml, finition mate vert sauge, bouchon en bambou à anse inox.",
    posts: [
      { title: "Partir en montagne", pillar: "inspiration", aspect: "4:5", texts: { headline: "Partez léger. Voyez grand.", subline: "Gourde isotherme 750 ml", cta: "Découvrir", scene: "a granite ridge at sunrise above a sea of clouds, the bottle standing on a lichen-covered rock, crisp orange first light and long shadows" } },
      { title: "Sur le sentier", pillar: "usage", aspect: "1:1", texts: { headline: "Votre eau, partout.", subline: "Gourde isotherme 750 ml", cta: "Commander", scene: "a mossy forest trail after the rain, the bottle on a fallen log beside a coiled climbing rope, soft green daylight filtering through pine trees" } },
      { title: "Au bord du lac", pillar: "style", aspect: "4:5", texts: { headline: "Prête pour la journée.", subline: "Gourde isotherme Cime", cta: "Découvrir", scene: "a wooden pontoon on a calm alpine lake at the end of the afternoon, mountains mirrored in the water, the bottle next to a folded wool blanket, warm low sun" } },
    ],
  },
  {
    id: "tribunes", brand: "Les Tribunes", product: "T-shirt supporter Lavande", business: "products", palette: ["#0D0D0D", "#C4C4C4", "#E10600", "#FAFAFA", "#050505"],
    summary: "T-shirt de supporter bleu marine, inscription FRANCE et numéro 10, brins de lavande brodés en ton sur ton, liserés bleu-blanc-rouge, drapeau sur la poitrine.",
    posts: [
      { title: "Soir de match", pillar: "inspiration", aspect: "4:5", texts: { headline: "Vibrez ensemble.", subline: "Édition Lavande", cta: "Commander", scene: "an empty stadium stand at night under powerful floodlights, the T-shirt laid flat on a blue plastic seat, light haze and glowing pitch in the background" } },
      { title: "Prêt pour la tribune", pillar: "style", aspect: "1:1", texts: { headline: "Porté par la tribune.", subline: "Édition Lavande", cta: "Découvrir", scene: "a vintage locker room with painted wooden benches, the T-shirt hanging on a wooden hanger against a dark wall, a single dramatic spotlight from above" } },
      { title: "Les couleurs de Provence", pillar: "histoire", aspect: "4:5", texts: { headline: "Les couleurs du cœur.", subline: "Édition Lavande", cta: "Commander", scene: "a rustic oak table in Provence at golden hour, the T-shirt neatly folded with fresh lavender sprigs and a small blue-white-red ribbon, lavender fields softly blurred outside the window" } },
    ],
  },
  {
    id: "fleuriste", brand: "Atelier Pivoine", product: "Atelier floral", business: "services", palette: ["#A3122B", "#F0E7DB", "#E0A100", "#FBF8F3", "#1B1717"],
    summary: "Fleuriste artisan.",
    posts: [
      { title: "Bouquets du jour", pillar: "service", aspect: "4:5", texts: { headline: "Des fleurs qui racontent.", subline: "Bouquets du jour", cta: "Commander un bouquet", scene: "a lush bouquet of pink and crimson peonies wrapped in kraft paper on a marble counter of a florist workshop, soft morning light through a large window, petals scattered" } },
      { title: "Mariages et événements", pillar: "service", aspect: "1:1", texts: { headline: "Vos fêtes en fleurs.", subline: "Mariages et événements", cta: "Demander un devis", scene: "an elegant wedding table dressing with low arrangements of peonies, garden roses and eucalyptus, linen tablecloth, candlelight at dusk, no guests" } },
      { title: "Le geste de l'atelier", pillar: "savoir-faire", aspect: "4:5", texts: { headline: "Le geste de l'artisan.", subline: "Atelier floral", cta: "Découvrir l'atelier", scene: "a wooden florist workbench seen from above: pruning shears, silk ribbon spools, cut stems of peonies and ranunculus, a half-finished bouquet, warm side light" } },
    ],
  },
  {
    id: "paysagiste", brand: "Racines & Pierres", product: "Création et entretien de jardins", business: "services", palette: ["#3F6B4A", "#DCE6D2", "#E89BA7", "#F7F8F1", "#1D2E22"],
    summary: "Paysagiste.",
    posts: [
      { title: "Création de jardin", pillar: "service", aspect: "4:5", texts: { headline: "Votre jardin prend vie.", subline: "Création de jardin", cta: "Demander un devis", scene: "a newly designed garden at golden hour: a curved gravel path between ornamental grasses, lavender and young olive trees, a dry-stone wall in the background, warm low sun" } },
      { title: "Terrasses en bois", pillar: "service", aspect: "1:1", texts: { headline: "Dehors, comme chez vous.", subline: "Terrasses et aménagements", cta: "Demander un devis", scene: "a wooden deck terrace at dusk with built-in planters full of grasses and white flowers, warm outdoor lights glowing, a house facade softly blurred, nobody" } },
      { title: "Murets en pierre sèche", pillar: "savoir-faire", aspect: "4:5", texts: { headline: "La pierre, posée à la main.", subline: "Murets en pierre sèche", cta: "Découvrir", scene: "a close view of a freshly built dry-stone wall in honey-coloured limestone, a mason's hammer and level resting on top, thyme and lavender growing at its foot, soft afternoon light" } },
    ],
  },
];

const [refs, out] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
for (const d of DEMOS) {
  const [primary, secondary, accent, light, dark] = d.palette;
  const p = { business: d.business, product: { name: d.product, category: d.product, summary: d.summary }, brand: { name: d.brand, palette: { primary, secondary, accent, light, dark } } } as never;
  const productRef = path.join(refs, `${d.id}-produit.png`);
  const hasRef = d.business === "products" && fs.existsSync(productRef);
  const only = (process.env.ONLY ?? "").split(",").filter(Boolean);
  const items = d.posts.map((post, k) => {
    const texts = { ...post.texts, brand: d.brand };
    const prompt = aiPostPrompt(p, { id: `${d.id}-${k + 1}`, network: "instagram", format: "image", title: post.title, caption: "", pillar: post.pillar, objective: null, headline: texts.headline, scheduled_at: null } as never, { aspect: post.aspect, hasReference: hasRef, hasLogo: true, texts, ...(process.env.FIX ? { fix: process.env.FIX } : {}) });
    return { id: `${d.id}-post-ia-${k + 1}`, aspect: post.aspect, prompt, reference: [...(hasRef ? [productRef] : []), path.join(refs, `${d.id}-logo.png`)], texts };
  });
  const chosen = only.length ? items.filter((it) => only.includes(it.id)) : items;
  if (!chosen.length) continue;
  fs.writeFileSync(path.join(out, `${d.id}${only.length ? "-correction" : ""}.json`), JSON.stringify({ model: "qwen-image-3.0-pro", items: chosen }, null, 2));
  console.log(`${d.id} : ${chosen.length} consignes`);
}
