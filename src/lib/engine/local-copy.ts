/**
 * Moteur local (sans fournisseur d'IA) : assemble des textes sobres à partir
 * des seules informations connues. Il n'invente rien : chaque inconnue reste
 * visible sous la forme « [À compléter : …] ». Il sert de base de travail et
 * de secours ; la rédaction de qualité est assurée par l'IA configurée.
 */
import type { ShopCopy } from "../theme/copy";
import { UNKNOWN } from "../theme/copy";
import type { Brand, Fact, ProductProfile, SectorId } from "../project-types";

type SectorVoice = { eyebrow: string; marquee: string[]; usageTitle: string; careTitle: string; aboutHeading: string; values: { title: string; text: string }[] };

const VOICES: Record<SectorId, SectorVoice> = {
  beaute: { eyebrow: "Soin", marquee: ["Gestes simples", "Formule détaillée", "Rituel quotidien"], usageTitle: "Utilisation", careTitle: "Composition", aboutHeading: "Une marque de soin, sans détour", values: [{ title: "Transparence", text: "La composition complète est indiquée sur chaque produit." }, { title: "Simplicité", text: "Des gestes clairs, expliqués pas à pas." }] },
  mode: { eyebrow: "Collection", marquee: ["Coupe étudiée", "Matières choisies", "À porter longtemps"], usageTitle: "Taille et coupe", careTitle: "Entretien", aboutHeading: "Des pièces pensées pour durer", values: [{ title: "Choix des matières", text: "Chaque matière est décrite précisément." }, { title: "Entretien", text: "Des conseils pour garder la pièce longtemps." }] },
  bijoux: { eyebrow: "Bijou", marquee: ["Détails précis", "Finitions soignées", "À offrir ou à garder"], usageTitle: "Dimensions", careTitle: "Matériaux et entretien", aboutHeading: "Des bijoux à regarder de près", values: [{ title: "Précision", text: "Matériaux et dimensions indiqués sans approximation." }, { title: "Écrin", text: "Une présentation pensée pour offrir." }] },
  maison: { eyebrow: "Maison", marquee: ["Objet du quotidien", "Lignes simples", "Fait pour durer"], usageTitle: "Dimensions", careTitle: "Matières et entretien", aboutHeading: "Des objets qui trouvent leur place", values: [{ title: "Usage", text: "Des objets pensés pour servir chaque jour." }, { title: "Matières", text: "Des matières décrites telles qu'elles sont." }] },
  hightech: { eyebrow: "Technologie", marquee: ["Fiche technique complète", "Prise en main rapide", "Compatibilités indiquées"], usageTitle: "Prise en main", careTitle: "Caractéristiques techniques", aboutHeading: "La technologie, expliquée clairement", values: [{ title: "Clarté", text: "Chaque caractéristique est indiquée précisément." }, { title: "Support", text: "Une équipe joignable pour vos questions." }] },
  sport: { eyebrow: "Performance", marquee: ["Pensé pour bouger", "Prêt pour l'extérieur", "Facile à emporter"], usageTitle: "Utilisation", careTitle: "Caractéristiques", aboutHeading: "Du matériel pour sortir plus souvent", values: [{ title: "Terrain", text: "Des produits décrits pour l'usage réel." }, { title: "Durabilité", text: "Des conseils d'entretien pour durer." }] },
  alimentation: { eyebrow: "Épicerie", marquee: ["Ingrédients listés", "Origine indiquée", "À partager"], usageTitle: "Dégustation", careTitle: "Ingrédients et allergènes", aboutHeading: "Le goût, et rien à cacher", values: [{ title: "Ingrédients", text: "La liste complète figure sur chaque produit." }, { title: "Origine", text: "La provenance est précisée lorsqu'elle est connue." }] },
  enfants: { eyebrow: "Enfants", marquee: ["Pensé pour les petits", "Pratique pour les parents", "Informations claires"], usageTitle: "Âge et usage", careTitle: "Matériaux et sécurité", aboutHeading: "Des produits choisis pour les familles", values: [{ title: "Clarté", text: "Âges et usages indiqués précisément." }, { title: "Écoute", text: "Une équipe disponible pour les parents." }] },
  animaux: { eyebrow: "Compagnons", marquee: ["Pensé pour eux", "Facile au quotidien", "Tailles détaillées"], usageTitle: "Utilisation", careTitle: "Composition et entretien", aboutHeading: "Pour le quotidien avec eux", values: [{ title: "Usage", text: "Des produits décrits selon l'animal et sa taille." }, { title: "Entretien", text: "Des conseils simples et précis." }] },
  artisanat: { eyebrow: "Atelier", marquee: ["Fait avec soin", "Petites séries", "Détails visibles"], usageTitle: "Dimensions", careTitle: "Matières et fabrication", aboutHeading: "Le geste, la matière, le temps", values: [{ title: "Savoir-faire", text: "Les étapes de fabrication sont décrites." }, { title: "Matières", text: "Des matières nommées et expliquées." }] },
};

const known = (f: Fact) => f.status !== "unknown" && f.value.trim() !== "";

export function localCopy(product: ProductProfile, brand: Pick<Brand, "name" | "tagline" | "story" | "values">): ShopCopy {
  const sector = (product.sector ?? "maison") as SectorId;
  const v = VOICES[sector];
  const name = product.name || UNKNOWN("nom du produit");
  const facts = product.facts.filter(known);
  const fact = (key: string) => facts.find((f) => f.key === key)?.value;
  const visualLine = product.visual.description || "";
  const summary = product.summary || visualLine || `${name}, présenté par ${brand.name}.`;

  const featureFacts = facts.filter((f) => !["price", "name"].includes(f.key)).slice(0, 4);
  const icons = ["sparkle", "leaf", "hand", "shield"] as const;
  const features = featureFacts.length >= 2
    ? featureFacts.map((f, i) => ({ title: f.label, text: f.value, icon: icons[i % icons.length] }))
    : [
        { title: v.usageTitle, text: fact("usage") ?? UNKNOWN(v.usageTitle.toLowerCase()), icon: "hand" as const },
        { title: v.careTitle, text: fact("materials") ?? fact("composition") ?? UNKNOWN(v.careTitle.toLowerCase()), icon: "leaf" as const },
        ...(visualLine ? [{ title: "En image", text: visualLine, icon: "sparkle" as const }] : []),
      ];

  const specs = product.facts
    .filter((f) => !["name", "summary"].includes(f.key))
    .slice(0, 10)
    .map((f) => ({ label: f.label, value: known(f) ? f.value : UNKNOWN(f.label.toLowerCase()) }));

  const steps = (featureFacts.length ? featureFacts : features.map((f) => ({ label: f.title, value: f.text }) as any)).slice(0, 3).map((f: any) => ({ title: f.label, text: f.value }));
  while (steps.length < 2) steps.push({ title: "Le détail", text: visualLine || UNKNOWN("caractéristique à mettre en avant") });

  const delivery = fact("shipping") ?? UNKNOWN("délais et tarifs de livraison");
  const returns = fact("returns") ?? UNKNOWN("conditions de retour");

  return {
    seo: { title: `${name} — ${brand.name}`, description: summary.slice(0, 155) },
    announcement: [],
    hero: {
      eyebrow: v.eyebrow,
      heading: brand.tagline || name,
      line1: name.split(" ").slice(0, 2).join(" ") || brand.name,
      line2: brand.tagline ? brand.tagline.split(" ").slice(0, 4).join(" ") : "par " + brand.name,
      text: summary,
      cta: "Découvrir",
    },
    statement: { eyebrow: brand.name, heading: brand.tagline || summary, text: brand.story || "" },
    features: { heading: "Ce qu'il faut savoir", items: features.slice(0, 4) },
    story: { heading: `${name}, en détail`, steps },
    detail: { eyebrow: v.eyebrow, heading: name, text: summary },
    specs: { heading: "Caractéristiques", items: specs },
    faq: {
      heading: "Questions fréquentes",
      items: [
        { q: "Quels sont les délais de livraison ?", a: delivery },
        { q: "Puis-je retourner ma commande ?", a: returns },
        { q: `Comment utiliser ${name} ?`, a: fact("usage") ?? UNKNOWN("mode d'emploi") },
      ],
    },
    marquee: v.marquee,
    gallery: { heading: "En images", captions: [] },
    cta: { heading: `Adopter ${name}`, text: "", button: "Commander" },
    newsletter: { heading: "Restons en contact", text: "Nouveautés et coulisses, sans excès." },
    product: {
      title: name,
      short: summary,
      description_html: `<p>${summary}</p>`,
      highlights: featureFacts.slice(0, 4).map((f) => `${f.label} : ${f.value}`),
      tabs: [
        { heading: v.careTitle, content_html: `<p>${fact("materials") ?? fact("composition") ?? UNKNOWN(v.careTitle.toLowerCase())}</p>` },
        { heading: "Livraison et retours", content_html: `<p>${delivery}</p><p>${returns}</p>` },
      ],
      reassurance: [],
    },
    about: {
      heading: v.aboutHeading,
      intro: brand.story || UNKNOWN("histoire de la marque"),
      blocks: [{ heading: "Pourquoi ce produit", text: summary }],
      values: brand.values.length ? brand.values.slice(0, 3) : v.values,
    },
    shipping: {
      heading: "Livraison et retours",
      body_html: `<p><strong>Livraison :</strong> ${delivery}</p><p><strong>Retours :</strong> ${returns}</p><p><strong>Contact :</strong> ${UNKNOWN("adresse e-mail du service client")}</p>`,
    },
    contact: { heading: "Écrivez-nous", text: "Une question sur une commande ou un produit ? Nous vous répondons." },
    footer: { about: brand.tagline || summary.slice(0, 120), newsletter: "Nouveautés et coulisses, sans excès." },
  };
}
