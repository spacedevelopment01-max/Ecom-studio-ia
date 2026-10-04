/**
 * Moteur local (sans fournisseur d'IA) : assemble des textes sobres à partir
 * des seules informations connues. Il n'invente rien : chaque inconnue reste
 * visible sous la forme « [À compléter : …] » (« [To complete: …] » en anglais). Il sert de base de travail et
 * de secours ; la rédaction de qualité est assurée par l'IA configurée.
 */
import type { ShopCopy } from "../theme/copy";
import { C } from "../i18n-server";
import type { Brand, Fact, ProductProfile, SectorId } from "../project-types";

type SectorVoice = { eyebrow: string; marquee: string[]; usageTitle: string; careTitle: string; aboutHeading: string; values: { title: string; text: string }[] };

const VOICES_FR: Record<SectorId, SectorVoice> = {
  beaute: { eyebrow: "Soin", marquee: ["Gestes simples", "Formule détaillée", "Rituel quotidien"], usageTitle: "Utilisation", careTitle: "Composition", aboutHeading: "Une marque de soin, sans détour", values: [{ title: "Transparence", text: "La composition est indiquée sur la fiche dès qu'elle est connue." }, { title: "Simplicité", text: "Des gestes clairs, expliqués pas à pas." }] },
  mode: { eyebrow: "Collection", marquee: ["Coupe étudiée", "Matières choisies", "À porter longtemps"], usageTitle: "Taille et coupe", careTitle: "Entretien", aboutHeading: "Des pièces pensées pour durer", values: [{ title: "Choix des matières", text: "Chaque matière est décrite précisément." }, { title: "Entretien", text: "Des conseils pour garder la pièce longtemps." }] },
  bijoux: { eyebrow: "Bijou", marquee: ["Détails précis", "Finitions soignées", "À offrir ou à garder"], usageTitle: "Dimensions", careTitle: "Matériaux et entretien", aboutHeading: "Des bijoux à regarder de près", values: [{ title: "Précision", text: "Matériaux et dimensions indiqués sans approximation." }, { title: "Écrin", text: "Une présentation pensée pour offrir." }] },
  maison: { eyebrow: "Maison", marquee: ["Objet du quotidien", "Lignes simples", "Fait pour durer"], usageTitle: "Dimensions", careTitle: "Matières et entretien", aboutHeading: "Des objets qui trouvent leur place", values: [{ title: "Usage", text: "Des objets pensés pour servir chaque jour." }, { title: "Matières", text: "Des matières décrites telles qu'elles sont." }] },
  hightech: { eyebrow: "Technologie", marquee: ["Fiche technique complète", "Prise en main rapide", "Compatibilités indiquées"], usageTitle: "Prise en main", careTitle: "Caractéristiques techniques", aboutHeading: "La technologie, expliquée clairement", values: [{ title: "Clarté", text: "Chaque caractéristique est indiquée précisément." }, { title: "Usage", text: "Des explications pour bien démarrer." }] },
  sport: { eyebrow: "Performance", marquee: ["Pensé pour bouger", "Prêt pour l'extérieur", "Facile à emporter"], usageTitle: "Utilisation", careTitle: "Caractéristiques", aboutHeading: "Du matériel pour sortir plus souvent", values: [{ title: "Terrain", text: "Des produits décrits pour l'usage réel." }, { title: "Durabilité", text: "Des conseils d'entretien pour durer." }] },
  alimentation: { eyebrow: "Épicerie", marquee: ["Ingrédients listés", "Origine indiquée", "À partager"], usageTitle: "Dégustation", careTitle: "Ingrédients et allergènes", aboutHeading: "Le goût, et rien à cacher", values: [{ title: "Ingrédients", text: "La composition est indiquée sur la fiche dès qu'elle est connue." }, { title: "Origine", text: "La provenance est précisée lorsqu'elle est connue." }] },
  enfants: { eyebrow: "Enfants", marquee: ["Pensé pour les petits", "Pratique pour les parents", "Informations claires"], usageTitle: "Âge et usage", careTitle: "Matériaux et sécurité", aboutHeading: "Des produits choisis pour les familles", values: [{ title: "Clarté", text: "Âges et usages indiqués précisément." }, { title: "Usage", text: "Des conseils d'utilisation simples." }] },
  animaux: { eyebrow: "Compagnons", marquee: ["Pensé pour eux", "Facile au quotidien", "Tailles détaillées"], usageTitle: "Utilisation", careTitle: "Composition et entretien", aboutHeading: "Pour le quotidien avec eux", values: [{ title: "Usage", text: "Des produits décrits selon l'animal et sa taille." }, { title: "Entretien", text: "Des conseils simples et précis." }] },
  artisanat: { eyebrow: "Atelier", marquee: ["Fait avec soin", "Petites séries", "Détails visibles"], usageTitle: "Dimensions", careTitle: "Matières et fabrication", aboutHeading: "Le geste, la matière, le temps", values: [{ title: "Savoir-faire", text: "Les étapes de fabrication sont décrites." }, { title: "Matières", text: "Des matières nommées et expliquées." }] },
};

const VOICES_EN: Record<SectorId, SectorVoice> = {
  beaute: { eyebrow: "Skincare", marquee: ["Simple routines", "Full formula listed", "Everyday ritual"], usageTitle: "How to use", careTitle: "Ingredients", aboutHeading: "A skincare brand, straight to the point", values: [{ title: "Transparency", text: "The full ingredient list goes on the product page as soon as it is known." }, { title: "Simplicity", text: "Clear routines, explained step by step." }] },
  mode: { eyebrow: "Collection", marquee: ["Considered fit", "Chosen fabrics", "Made to be worn"], usageTitle: "Size and fit", careTitle: "Care", aboutHeading: "Pieces designed to last", values: [{ title: "Fabric choices", text: "Every material is described precisely." }, { title: "Care", text: "Tips to keep each piece looking its best." }] },
  bijoux: { eyebrow: "Jewelry", marquee: ["Precise details", "Careful finishing", "To give or to keep"], usageTitle: "Dimensions", careTitle: "Materials and care", aboutHeading: "Jewelry worth a closer look", values: [{ title: "Precision", text: "Materials and dimensions stated exactly." }, { title: "Presentation", text: "Packaging designed for gifting." }] },
  maison: { eyebrow: "Home", marquee: ["Everyday object", "Clean lines", "Built to last"], usageTitle: "Dimensions", careTitle: "Materials and care", aboutHeading: "Objects that find their place", values: [{ title: "Use", text: "Objects designed to be used every day." }, { title: "Materials", text: "Materials described exactly as they are." }] },
  hightech: { eyebrow: "Tech", marquee: ["Full tech specs", "Quick setup", "Compatibility listed"], usageTitle: "Getting started", careTitle: "Technical specs", aboutHeading: "Technology, clearly explained", values: [{ title: "Clarity", text: "Every spec is stated precisely." }, { title: "Use", text: "Clear guidance to get started." }] },
  sport: { eyebrow: "Performance", marquee: ["Made to move", "Ready for the outdoors", "Easy to carry"], usageTitle: "How to use", careTitle: "Specs", aboutHeading: "Gear to get you outside more often", values: [{ title: "Real-world use", text: "Products described for how you will actually use them." }, { title: "Durability", text: "Care tips to keep your gear going." }] },
  alimentation: { eyebrow: "Pantry", marquee: ["Ingredients listed", "Origin stated", "Made for sharing"], usageTitle: "Serving", careTitle: "Ingredients and allergens", aboutHeading: "All the taste, nothing to hide", values: [{ title: "Ingredients", text: "The full ingredient list goes on the product page as soon as it is known." }, { title: "Origin", text: "Where it comes from is stated whenever it is known." }] },
  enfants: { eyebrow: "Kids", marquee: ["Made for little ones", "Practical for parents", "Clear information"], usageTitle: "Age and use", careTitle: "Materials and safety", aboutHeading: "Products chosen for families", values: [{ title: "Clarity", text: "Ages and uses stated precisely." }, { title: "Use", text: "Simple, practical usage tips." }] },
  animaux: { eyebrow: "Companions", marquee: ["Made for them", "Easy every day", "Sizes in detail"], usageTitle: "How to use", careTitle: "Composition and care", aboutHeading: "For everyday life together", values: [{ title: "Use", text: "Products described by animal and size." }, { title: "Care", text: "Simple, precise care tips." }] },
  artisanat: { eyebrow: "Workshop", marquee: ["Made with care", "Small batches", "Visible details"], usageTitle: "Dimensions", careTitle: "Materials and making", aboutHeading: "Craft, material, time", values: [{ title: "Craftsmanship", text: "Every making step is described." }, { title: "Materials", text: "Materials named and explained." }] },
};

/** Inconnue visible, dans la langue des contenus. */
const unk = (fr: string, en: string) => C(`[À compléter : ${fr}]`, `[To complete: ${en}]`);
/** Libellé d'inconnue dérivé d'un intitulé (minuscule en français, tel quel en anglais). */
const unkLabel = (label: string) => C(`[À compléter : ${label.toLowerCase()}]`, `[To complete: ${label.toLowerCase()}]`);

const known = (f: Fact) => f.status !== "unknown" && f.value.trim() !== "";

/**
 * Expressions courtes du bandeau et du texte défilant : uniquement des informations confirmées du produit
 * (contenance, coloris, matière…), jamais de promesse générique (« fait pour durer », « origine indiquée »).
 */
export function factMarquee(product: ProductProfile, brand: Pick<Brand, "name" | "tagline">): string[] {
  const out: string[] = [];
  const add = (t: string | undefined) => {
    const v = t?.replace(/\s+/g, " ").trim().replace(/[.;,]+$/, "");
    if (v && v.length <= 32 && !out.some((x) => x.toLowerCase() === v.toLowerCase())) out.push(v);
  };
  for (const v of product.variants) if (v.values.length > 1) add(C(`${v.values.length} ${v.name.toLowerCase()}${/s$/i.test(v.name) ? "" : "s"} au choix`, `${v.values.length} ${v.name.toLowerCase()}${/s$/i.test(v.name) ? "" : "s"} to choose from`));
  for (const f of product.facts.filter((f) => f.status === "confirmed" && f.value.trim() && !["price", "name", "summary", "shipping", "returns"].includes(f.key))) {
    const v = f.value.trim().replace(/[.;,]+$/, "");
    if (v.length <= 18) add(C(`${f.label.split("/")[0].trim()} : ${v}`, `${f.label.split("/")[0].trim()}: ${v}`));
    else add(v);
    if (out.length >= 4) break;
  }
  if (product.category) add(product.category);
  if (out.length < 2 && brand.tagline) add(brand.tagline.replace(/\.$/, ""));
  if (out.length < 2 && product.name) add(product.name);
  return out.slice(0, 4);
}

export function localCopy(product: ProductProfile, brand: Pick<Brand, "name" | "tagline" | "story" | "values">): ShopCopy {
  const sector = (product.sector ?? "maison") as SectorId;
  const v = C(VOICES_FR, VOICES_EN)[sector] ?? C(VOICES_FR, VOICES_EN).maison;
  const name = product.name || unk("nom du produit", "product name");
  const facts = product.facts.filter(known);
  const fact = (key: string) => facts.find((f) => f.key === key)?.value;
  const visualLine = product.visual.description || "";
  const summary = product.summary || visualLine || C(`${name}, présenté par ${brand.name}.`, `${name}, by ${brand.name}.`);
  // Accroche du héros : première phrase, coupée proprement (le résumé complet reste dans la fiche).
  const firstSentence = summary.split(/(?<=[.!?])\s/)[0];
  const lead = heroLead(firstSentence);

  const featureFacts = facts.filter((f) => !["price", "name"].includes(f.key)).slice(0, 4);
  const icons = ["sparkle", "leaf", "hand", "shield"] as const;
  const features = featureFacts.length >= 2
    ? featureFacts.map((f, i) => ({ title: f.label, text: f.value, icon: icons[i % icons.length] }))
    : [
        { title: v.usageTitle, text: fact("usage") ?? unkLabel(v.usageTitle), icon: "hand" as const },
        { title: v.careTitle, text: fact("materials") ?? fact("composition") ?? unkLabel(v.careTitle), icon: "leaf" as const },
        ...(visualLine ? [{ title: C("En image", "At a glance"), text: visualLine, icon: "sparkle" as const }] : []),
      ];

  const specs = product.facts
    .filter((f) => !["name", "summary"].includes(f.key))
    .slice(0, 10)
    .map((f) => ({ label: f.label, value: known(f) ? f.value : unkLabel(f.label) }));

  const steps = (featureFacts.length ? featureFacts : features.map((f) => ({ label: f.title, value: f.text }) as any)).slice(0, 3).map((f: any) => ({ title: f.label, text: f.value }));
  while (steps.length < 2) steps.push({ title: C("Le détail", "The detail"), text: visualLine || unk("caractéristique à mettre en avant", "key feature to highlight") });

  const delivery = fact("shipping") ?? unk("délais et tarifs de livraison", "shipping times and rates");
  const returns = fact("returns") ?? unk("conditions de retour", "return policy");

  return {
    seo: { title: `${name} | ${brand.name}`, description: summary.slice(0, 155) },
    announcement: [],
    hero: {
      eyebrow: v.eyebrow,
      heading: brand.tagline || name,
      line1: name.split(" ").slice(0, 2).join(" ") || brand.name,
      line2: brand.tagline ? brand.tagline.split(" ").slice(0, 4).join(" ") : C("par ", "by ") + brand.name,
      text: lead,
      cta: C("Découvrir", "Discover"),
    },
    statement: { eyebrow: brand.name, heading: brand.tagline || summary, text: brand.story || "" },
    features: { heading: C("Ce qu'il faut savoir", "Good to know"), items: features.slice(0, 4) },
    story: { heading: C(`${name}, en détail`, `${name}, in detail`), steps },
    detail: { eyebrow: v.eyebrow, heading: name, text: summary },
    specs: { heading: C("Caractéristiques", "Specifications"), items: specs },
    faq: {
      heading: C("Questions fréquentes", "FAQ"),
      items: [
        { q: C("Quels sont les délais de livraison ?", "How long does shipping take?"), a: delivery },
        { q: C("Puis-je retourner ma commande ?", "Can I return my order?"), a: returns },
        { q: C(`Comment utiliser ${name} ?`, `How do I use ${name}?`), a: fact("usage") ?? unk("mode d'emploi", "instructions for use") },
      ],
    },
    marquee: factMarquee(product, brand),
    gallery: { heading: C("En images", "Gallery"), captions: [] },
    cta: { heading: C(`Adopter ${name}`, `Make ${name} yours`), text: "", button: C("Commander", "Order now") },
    newsletter: { heading: C("Restons en contact", "Stay in touch"), text: C("Nouveautés et coulisses, sans excès.", "New arrivals and behind the scenes, never too often.") },
    product: {
      title: name,
      short: summary,
      description_html: `<p>${summary}</p>`,
      highlights: featureFacts.slice(0, 4).map((f) => C(`${f.label} : ${f.value}`, `${f.label}: ${f.value}`)),
      tabs: [
        { heading: v.careTitle, content_html: `<p>${fact("materials") ?? fact("composition") ?? unkLabel(v.careTitle)}</p>` },
        { heading: C("Livraison et retours", "Shipping and returns"), content_html: `<p>${delivery}</p><p>${returns}</p>` },
      ],
      reassurance: [],
    },
    about: {
      heading: v.aboutHeading,
      intro: brand.story || unk("histoire de la marque", "brand story"),
      blocks: [{ heading: C("Pourquoi ce produit", "Why this product"), text: summary }],
      values: brand.values.length ? brand.values.slice(0, 3) : v.values,
    },
    shipping: {
      heading: C("Livraison et retours", "Shipping and returns"),
      body_html: C(
        `<p><strong>Livraison :</strong> ${delivery}</p><p><strong>Retours :</strong> ${returns}</p><p><strong>Contact :</strong> ${unk("adresse e-mail du service client", "customer service email address")}</p>`,
        `<p><strong>Shipping:</strong> ${delivery}</p><p><strong>Returns:</strong> ${returns}</p><p><strong>Contact:</strong> ${unk("adresse e-mail du service client", "customer service email address")}</p>`,
      ),
    },
    contact: { heading: C("Écrivez-nous", "Contact us"), text: C("Une question sur une commande ou un produit ? Nous vous répondons.", "A question about an order or a product? We'll get back to you.") },
    footer: { about: brand.tagline || summary.slice(0, 120), newsletter: C("Nouveautés et coulisses, sans excès.", "New arrivals and behind the scenes, never too often.") },
  };
}

/** Phrase courte pour le héros : s'arrête de préférence à la fin d'une proposition (virgule), sans points de suspension. */
export function heroLead(sentence: string, max = 110): string {
  const s = sentence.trim();
  if (s.length <= max) return s;
  const head = s.slice(0, max + 1);
  const clause = Math.max(head.lastIndexOf(","), head.lastIndexOf(";"), head.lastIndexOf(" – "), head.lastIndexOf(" — "));
  if (clause >= 40) return `${s.slice(0, clause).replace(/\s+$/, "")}.`;
  return `${head.replace(/[\s,;:]+\S*$/, "")}…`;
}
