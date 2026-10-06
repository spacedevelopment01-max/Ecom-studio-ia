/**
 * Moteur local (sans fournisseur d'IA) : assemble des textes sobres à partir
 * des seules informations connues. Il n'invente rien : chaque inconnue reste
 * visible sous la forme « [À compléter : …] » (« [To complete: …] » en anglais). Il sert de base de travail et
 * de secours ; la rédaction de qualité est assurée par l'IA configurée.
 */
import type { ShopCopy } from "../theme/copy";
import { C } from "../i18n-server";
import type { Brand, Fact, ProductProfile, ProductSectorId } from "../project-types";
import { areaMentioned, contactCta, howToBook, isServicesBusiness, practicalInfo, pricesText, serviceAboutHeading, serviceEyebrow, serviceGalleryHeading, serviceIsMobile, serviceLine, serviceTermsHtml, unknownText, type BusinessInfo } from "./services-text";

type SectorVoice = { eyebrow: string; marquee: string[]; usageTitle: string; careTitle: string; aboutHeading: string; values: { title: string; text: string }[] };

const VOICES_FR: Record<ProductSectorId, SectorVoice> = {
  beaute: { eyebrow: "Soin", marquee: ["Gestes simples", "Formule détaillée", "Rituel quotidien"], usageTitle: "Utilisation", careTitle: "Composition", aboutHeading: "Une marque de soin, sans détour", values: [{ title: "Transparence", text: "La composition est indiquée sur la fiche dès qu'elle est connue." }, { title: "Simplicité", text: "Des gestes clairs, expliqués pas à pas." }] },
  mode: { eyebrow: "Collection", marquee: ["Coupe étudiée", "Matières choisies", "À porter longtemps"], usageTitle: "Taille et coupe", careTitle: "Entretien", aboutHeading: "Des pièces pensées pour durer", values: [{ title: "Choix des matières", text: "Chaque matière est décrite précisément." }, { title: "Entretien", text: "Des conseils pour garder la pièce longtemps." }] },
  bijoux: { eyebrow: "Bijou", marquee: ["Détails précis", "Finitions soignées", "À offrir ou à garder"], usageTitle: "Dimensions", careTitle: "Matériaux et entretien", aboutHeading: "Des bijoux à regarder de près", values: [{ title: "Précision", text: "Matériaux et dimensions indiqués sans approximation." }, { title: "Écrin", text: "Une présentation pensée pour offrir." }] },
  maison: { eyebrow: "Maison", marquee: ["Objet du quotidien", "Lignes simples", "Fait pour durer"], usageTitle: "Dimensions", careTitle: "Matières et entretien", aboutHeading: "Des objets qui trouvent leur place", values: [{ title: "Usage", text: "Des objets pensés pour servir chaque jour." }, { title: "Matières", text: "Des matières décrites telles qu'elles sont." }] },
  hightech: { eyebrow: "Technologie", marquee: ["Fiche technique complète", "Prise en main rapide", "Compatibilités indiquées"], usageTitle: "Prise en main", careTitle: "Caractéristiques techniques", aboutHeading: "La technologie, expliquée clairement", values: [{ title: "Clarté", text: "Chaque caractéristique est indiquée précisément." }, { title: "Usage", text: "Des explications pour bien démarrer." }] },
  sport: { eyebrow: "Performance", marquee: ["Pensé pour bouger", "Prêt pour l'extérieur", "Facile à emporter"], usageTitle: "Utilisation", careTitle: "Caractéristiques", aboutHeading: "Du matériel pour sortir plus souvent", values: [{ title: "Terrain", text: "Des produits décrits pour l'usage réel." }, { title: "Durabilité", text: "Des conseils d'entretien pour durer." }] },
  alimentation: { eyebrow: "Épicerie", marquee: ["Ingrédients listés", "Origine indiquée", "À partager"], usageTitle: "Dégustation", careTitle: "Ingrédients et allergènes", aboutHeading: "Le goût, et rien à cacher", values: [{ title: "Ingrédients", text: "La composition est indiquée sur la fiche dès qu'elle est connue." }, { title: "Origine", text: "La provenance est précisée lorsqu'elle est connue." }] },
  enfants: { eyebrow: "Enfants", marquee: ["Pensé pour les petits", "Pratique pour les parents", "Informations claires"], usageTitle: "Âge et usage", careTitle: "Matériaux et entretien", aboutHeading: "Des produits choisis pour les familles", values: [{ title: "Clarté", text: "Âges et usages indiqués précisément." }, { title: "Usage", text: "Des conseils d'utilisation simples." }] },
  animaux: { eyebrow: "Compagnons", marquee: ["Pensé pour eux", "Facile au quotidien", "Tailles détaillées"], usageTitle: "Utilisation", careTitle: "Composition et entretien", aboutHeading: "Pour le quotidien avec eux", values: [{ title: "Usage", text: "Des produits décrits selon l'animal et sa taille." }, { title: "Entretien", text: "Des conseils simples et précis." }] },
  artisanat: { eyebrow: "Atelier", marquee: ["Fait avec soin", "Petites séries", "Détails visibles"], usageTitle: "Dimensions", careTitle: "Matières et fabrication", aboutHeading: "Le geste, la matière, le temps", values: [{ title: "Savoir-faire", text: "Les étapes de fabrication sont décrites." }, { title: "Matières", text: "Des matières nommées et expliquées." }] },
};

const VOICES_EN: Record<ProductSectorId, SectorVoice> = {
  beaute: { eyebrow: "Skincare", marquee: ["Simple routines", "Full formula listed", "Everyday ritual"], usageTitle: "How to use", careTitle: "Ingredients", aboutHeading: "A skincare brand, straight to the point", values: [{ title: "Transparency", text: "The full ingredient list goes on the product page as soon as it is known." }, { title: "Simplicity", text: "Clear routines, explained step by step." }] },
  mode: { eyebrow: "Collection", marquee: ["Considered fit", "Chosen fabrics", "Made to be worn"], usageTitle: "Size and fit", careTitle: "Care", aboutHeading: "Pieces designed to last", values: [{ title: "Fabric choices", text: "Every material is described precisely." }, { title: "Care", text: "Tips to keep each piece looking its best." }] },
  bijoux: { eyebrow: "Jewelry", marquee: ["Precise details", "Careful finishing", "To give or to keep"], usageTitle: "Dimensions", careTitle: "Materials and care", aboutHeading: "Jewelry worth a closer look", values: [{ title: "Precision", text: "Materials and dimensions stated exactly." }, { title: "Presentation", text: "Packaging designed for gifting." }] },
  maison: { eyebrow: "Home", marquee: ["Everyday object", "Clean lines", "Built to last"], usageTitle: "Dimensions", careTitle: "Materials and care", aboutHeading: "Objects that find their place", values: [{ title: "Use", text: "Objects designed to be used every day." }, { title: "Materials", text: "Materials described exactly as they are." }] },
  hightech: { eyebrow: "Tech", marquee: ["Full tech specs", "Quick setup", "Compatibility listed"], usageTitle: "Getting started", careTitle: "Technical specs", aboutHeading: "Technology, clearly explained", values: [{ title: "Clarity", text: "Every spec is stated precisely." }, { title: "Use", text: "Clear guidance to get started." }] },
  sport: { eyebrow: "Performance", marquee: ["Made to move", "Ready for the outdoors", "Easy to carry"], usageTitle: "How to use", careTitle: "Specs", aboutHeading: "Gear to get you outside more often", values: [{ title: "Real-world use", text: "Products described for how you will actually use them." }, { title: "Durability", text: "Care tips to keep your gear going." }] },
  alimentation: { eyebrow: "Pantry", marquee: ["Ingredients listed", "Origin stated", "Made for sharing"], usageTitle: "Serving", careTitle: "Ingredients and allergens", aboutHeading: "All the taste, nothing to hide", values: [{ title: "Ingredients", text: "The full ingredient list goes on the product page as soon as it is known." }, { title: "Origin", text: "Where it comes from is stated whenever it is known." }] },
  enfants: { eyebrow: "Kids", marquee: ["Made for little ones", "Practical for parents", "Clear information"], usageTitle: "Age and use", careTitle: "Materials and care", aboutHeading: "Products chosen for families", values: [{ title: "Clarity", text: "Ages and uses stated precisely." }, { title: "Use", text: "Simple, practical usage tips." }] },
  animaux: { eyebrow: "Companions", marquee: ["Made for them", "Easy every day", "Sizes in detail"], usageTitle: "How to use", careTitle: "Composition and care", aboutHeading: "For everyday life together", values: [{ title: "Use", text: "Products described by animal and size." }, { title: "Care", text: "Simple, precise care tips." }] },
  artisanat: { eyebrow: "Workshop", marquee: ["Made with care", "Small batches", "Visible details"], usageTitle: "Dimensions", careTitle: "Materials and making", aboutHeading: "Craft, material, time", values: [{ title: "Craftsmanship", text: "Every making step is described." }, { title: "Materials", text: "Materials named and explained." }] },
};

/** Inconnue visible, dans la langue des contenus. */
const unk = (fr: string, en: string) => C(`[À compléter : ${fr}]`, `[To complete: ${en}]`);
/** Libellé d'inconnue dérivé d'un intitulé (minuscule en français, tel quel en anglais). */
const unkLabel = (label: string) => C(`[À compléter : ${label.toLowerCase()}]`, `[To complete: ${label.toLowerCase()}]`);

const known = (f: Fact) => f.status !== "unknown" && f.value.trim() !== "";

/**
 * Objections typiques d'un acheteur, par secteur (ce qu'un concepteur-rédacteur traite en FAQ et sur la fiche).
 * Chaque objection renvoie au fait qui y répond : la réponse est ce fait s'il est confirmé, sinon un espace réservé
 * que la réponse du commerçant (question posée à l'analyse) viendra remplacer.
 */
type Objection = { q: [string, string]; keys: string[]; unknown: [string, string] };
const O = (fr: string, en: string, keys: string[], ufr: string, uen: string): Objection => ({ q: [fr, en], keys, unknown: [ufr, uen] });
export const SECTOR_OBJECTIONS: Record<ProductSectorId, Objection[]> = {
  enfants: [O("À partir de quel âge ?", "What age is it for?", ["age"], "âge conseillé", "recommended age"), O("Comment fonctionne-t-il ?", "How does it work?", ["function", "usage"], "fonctionnement (piles, recharge, boutons)", "how it works (batteries, charging, buttons)"), O("Comment le nettoyer ?", "How do I clean it?", ["care"], "conseils de nettoyage", "cleaning instructions")],
  hightech: [O("Est-ce facile à prendre en main ?", "Is it easy to get started?", ["usage"], "prise en main et réglages", "setup and getting started"), O("Quelles sont ses caractéristiques ?", "What are the specs?", ["specs", "weight", "dimensions", "camera", "autonomy", "battery", "range", "resolution"], "caractéristiques techniques", "technical specs"), O("Que contient la boîte ?", "What's in the box?", ["box"], "contenu du colis", "what's in the box"), O("Est-il compatible avec mon matériel ?", "Is it compatible with my devices?", ["compatibility"], "compatibilités", "compatibility")],
  beaute: [O("Convient-il à mon type de peau ?", "Is it right for my skin type?", ["usage"], "types de peau concernés", "suitable skin types"), O("Que contient-il ?", "What's in it?", ["ingredients", "materials"], "liste des ingrédients (INCI)", "ingredient list (INCI)"), O("Comment l'utiliser ?", "How do I use it?", ["usage"], "mode d'emploi", "instructions for use")],
  mode: [O("Quelle taille choisir ?", "Which size should I pick?", ["sizes", "dimensions"], "guide des tailles", "size guide"), O("En quelle matière ?", "What is it made of?", ["materials"], "composition", "fabric composition"), O("Comment l'entretenir ?", "How do I care for it?", ["care"], "conseils d'entretien", "care instructions")],
  bijoux: [O("En quelle matière ?", "What is it made of?", ["materials"], "matière et finition", "material and finish"), O("Quelles sont ses dimensions ?", "What size is it?", ["dimensions"], "dimensions", "dimensions"), O("Comment l'entretenir ?", "How do I care for it?", ["care"], "conseils d'entretien", "care instructions")],
  maison: [O("Quelles sont ses dimensions ?", "What are the dimensions?", ["dimensions"], "dimensions", "dimensions"), O("En quelle matière ?", "What is it made of?", ["materials"], "matière", "material"), O("Comment l'entretenir ?", "How do I care for it?", ["care"], "conseils d'entretien", "care instructions")],
  sport: [O("Pour quel usage est-il conçu ?", "What is it designed for?", ["usage"], "usage prévu", "intended use"), O("Quelle taille et quel poids ?", "What size and weight?", ["dimensions", "weight"], "taille et poids", "size and weight"), O("Comment l'entretenir ?", "How do I care for it?", ["care"], "conseils d'entretien", "care instructions")],
  alimentation: [O("Quels sont les ingrédients et allergènes ?", "What are the ingredients and allergens?", ["ingredients", "materials"], "ingrédients et allergènes", "ingredients and allergens"), O("D'où vient-il ?", "Where does it come from?", ["origin"], "origine", "origin"), O("Comment le conserver ?", "How should I store it?", ["care", "origin"], "conservation", "storage")],
  animaux: [O("Convient-il à mon animal ?", "Is it right for my pet?", ["usage"], "animaux et tailles concernés", "suitable animals and sizes"), O("En quelle matière ?", "What is it made of?", ["materials"], "matière", "material"), O("Comment le nettoyer ?", "How do I clean it?", ["care"], "conseils de nettoyage", "cleaning instructions")],
  artisanat: [O("Comment est-il fabriqué ?", "How is it made?", ["origin"], "fabrication", "how it's made"), O("En quelles matières ?", "What materials are used?", ["materials"], "matières", "materials"), O("Comment l'entretenir ?", "How do I care for it?", ["care"], "conseils d'entretien", "care instructions")],
};

/** Questions et réponses d'objections pour un produit : réponse = fait confirmé, sinon espace réservé. */
export function objectionAnswers(product: ProductProfile): { q: string; a: string }[] {
  const list = SECTOR_OBJECTIONS[(product.sector ?? "maison") as ProductSectorId] ?? SECTOR_OBJECTIONS.maison;
  const facts = product.facts.filter(known);
  return list.map((o) => {
    const found = o.keys.map((k) => facts.find((x) => x.key === k)).filter((x): x is Fact => !!x);
    // Une seule information : la valeur ; plusieurs (fiche technique) : « Libellé : valeur » pour chacune, trois au plus.
    const a = !found.length ? unk(o.unknown[0], o.unknown[1]) : found.length === 1 ? sentence(found[0].value) : found.slice(0, 3).map((f) => C(`${f.label} : ${f.value.trim().replace(/[.;]+$/, "")}`, `${f.label}: ${f.value.trim().replace(/[.;]+$/, "")}`)).join(C(" ; ", "; ")) + ".";
    return { q: C(o.q[0], o.q[1]), a };
  });
}
/** Valeur d'un fait rendue en phrase (majuscule, point final). */
const sentence = (v: string) => {
  const t = v.trim();
  const up = t.charAt(0).toLocaleUpperCase() + t.slice(1);
  return /[.!?…\]]$/.test(up) ? up : `${up}.`;
};
/** Texte coupé proprement à la fin d'un mot (méta-description, extraits), sans points de suspension. */
export function clip(text: string, max: number): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max + 1);
  const end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
  if (end >= max * 0.6) return t.slice(0, end + 1);
  return `${cut.replace(/[\s,;:]+\S*$/, "").replace(/[\s,;:]+$/, "")}.`;
}

/**
 * Expressions courtes du bandeau et du texte défilant : uniquement des informations confirmées du produit
 * (contenance, coloris, matière…), jamais de promesse générique (« fait pour durer », « origine indiquée »).
 */
export function factMarquee(product: ProductProfile, brand: Pick<Brand, "name" | "tagline">): string[] {
  const out: string[] = [];
  const add = (t: string | undefined) => {
    const v = t?.replace(/\s+/g, " ").trim().replace(/[.;,]+$/, "");
    if (v && v.length <= 32 && !out.some((x) => x.toLowerCase() === v.toLowerCase())) out.push(v.charAt(0).toLocaleUpperCase() + v.slice(1));
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

/**
 * Textes du site. `biz` (le projet, ou { business, services }) : pour une entreprise de services,
 * les textes parlent de prestations, de rendez-vous, de zone et d'horaires (jamais de panier ni de livraison).
 */
export function localCopy(product: ProductProfile, brand: Pick<Brand, "name" | "tagline" | "story" | "values">, biz?: BusinessInfo | null): ShopCopy {
  if (isServicesBusiness(biz)) return localServiceCopy(product, brand, biz);
  const voices = C(VOICES_FR, VOICES_EN);
  const v = voices[(product.sector ?? "maison") as ProductSectorId] ?? voices.maison;
  const name = product.name || unk("nom du produit", "product name");
  const facts = product.facts.filter(known);
  const fact = (key: string) => facts.find((f) => f.key === key)?.value;
  const visualLine = product.visual.description || "";
  const summary = product.summary || visualLine || C(`${name}, présenté par ${brand.name}.`, `${name}, by ${brand.name}.`);
  // Accroche du héros : première phrase, coupée proprement (le résumé complet reste dans la fiche).
  const firstSentence = summary.split(/(?<=[.!?])\s/)[0];
  const lead = heroLead(firstSentence);

  const featureFacts = facts.filter((f) => !["price", "name"].includes(f.key)).slice(0, 4);
  // Informations importantes encore inconnues (hors logistique) : signalées sur la fiche, jamais devinées.
  const toConfirm = product.facts.filter((f) => f.status === "unknown" && !["price", "name", "shipping", "returns"].includes(f.key)).slice(0, 2);
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
  // SEO : mot-clé de la catégorie (ce que tape l'acheteur) avec le nom et la marque, dans la limite de 60 caractères.
  const cat = product.category?.trim() ?? "";
  const withCat = `${name}, ${cat.charAt(0).toLocaleLowerCase()}${cat.slice(1)} | ${brand.name}`;
  const seoTitle = cat && !name.toLowerCase().includes(cat.toLowerCase()) && withCat.length <= 60 ? withCat : `${name} | ${brand.name}`;
  const objections = objectionAnswers(product);
  const specsHtml = specs.length ? `<ul>${specs.map((x) => `<li><strong>${x.label}${C(" :", ":")}</strong> ${x.value}</li>`).join("")}</ul>` : `<p>${unk("caractéristiques", "specifications")}</p>`;

  return {
    seo: { title: seoTitle, description: clip(summary, 155) },
    announcement: [],
    hero: {
      eyebrow: v.eyebrow,
      heading: brand.tagline || name,
      line1: name.split(" ").slice(0, 2).join(" ") || brand.name,
      line2: brand.tagline ? brand.tagline.split(" ").slice(0, 4).join(" ") : C("par ", "by ") + brand.name,
      text: lead,
      // Bouton qui dit où il mène (le produit nommé) plutôt qu'un « Découvrir » passe-partout.
      cta: product.name && product.name.length <= 14 ? C(`Voir ${product.name}`, `See ${product.name}`) : C("Voir le produit", "See the product"),
    },
    // Pas de doublon avec le héros (qui porte déjà la signature) : le fait le plus parlant, ou le résumé.
    statement: brand.tagline && featureFacts[0] && featureFacts[0].value.length <= 110
      ? { eyebrow: featureFacts[0].label, heading: sentence(featureFacts[0].value).replace(/\.$/, ""), text: brand.story || (summary !== lead ? summary : "") }
      : { eyebrow: brand.name, heading: brand.tagline ? heroLead(firstSentence, 90) : summary, text: brand.story || "" },
    features: { heading: C("Ce qu'il faut savoir", "Good to know"), items: features.slice(0, 4) },
    story: { heading: C(`${name}, en détail`, `${name}, in detail`), steps },
    detail: { eyebrow: v.eyebrow, heading: name, text: summary },
    specs: { heading: C("Caractéristiques", "Specifications"), items: specs },
    faq: {
      heading: C("Questions fréquentes", "FAQ"),
      items: [
        // Objections de l'acheteur dans ce secteur d'abord, puis la logistique.
        ...objections,
        ...((SECTOR_OBJECTIONS[(product.sector ?? "maison") as ProductSectorId] ?? []).some((o) => o.keys.includes("usage") || o.keys.includes("function")) ? [] : [{ q: C("Comment l'utiliser ?", "How do I use it?"), a: fact("usage") ? sentence(fact("usage")!) : unk("mode d'emploi", "instructions for use") }]),
        { q: C("Quels sont les délais de livraison ?", "How long does shipping take?"), a: delivery },
        { q: C("Puis-je retourner ma commande ?", "Can I return my order?"), a: returns },
      ].slice(0, 8),
    },
    marquee: factMarquee(product, brand),
    gallery: { heading: C("En images", "Gallery"), captions: [] },
    cta: { heading: C(`Adopter ${name}`, `Make ${name} yours`), text: "", button: C("Commander", "Order now") },
    newsletter: { heading: C("Restons en contact", "Stay in touch"), text: C("Nouveautés et coulisses, sans excès.", "New arrivals and behind the scenes, never too often.") },
    product: {
      title: name,
      short: summary,
      // Accroche, puis les faits confirmés en liste, puis ce qui reste à préciser (honnêtement visible).
      description_html: `<p>${summary}</p>${featureFacts.length ? `<ul>${featureFacts.map((f) => `<li><strong>${f.label}</strong>${C(" : ", ": ")}${f.value}</li>`).join("")}</ul>` : ""}${toConfirm.length ? `<p><strong>${C("Bon à savoir", "Good to know")}${C(" :", ":")}</strong> ${toConfirm.map((f) => unkLabel(f.label)).join(" ")}</p>` : ""}`,
      // Points forts courts (2 à 6 mots) : la valeur seule quand elle est brève, sinon le libellé et une valeur courte.
      highlights: featureFacts.map((f) => {
        const head = f.value.split(/[,:;(]/)[0].trim();
        return head.length >= 3 && head.length <= 40 ? sentence(head).replace(/\.$/, "") : f.label;
      }).slice(0, 4),
      tabs: [
        { heading: C("Caractéristiques", "Specifications"), content_html: specsHtml },
        ...(/caractéristiques|specs/i.test(v.careTitle) ? [] : [{ heading: v.careTitle, content_html: `<p>${fact("materials") ?? fact("composition") ?? unkLabel(v.careTitle)}</p>` }]),
        ...(fact("box") ? [{ heading: C("Contenu du colis", "What's in the box"), content_html: `<p>${sentence(fact("box")!)}</p>` }] : []),
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

/**
 * Textes d'une entreprise de services : prestations, déroulé, infos pratiques (zone, horaires, contact),
 * conditions de prestation en espaces réservés. Tarifs, durées et coordonnées : uniquement ceux saisis.
 */
function localServiceCopy(product: ProductProfile, brand: Pick<Brand, "name" | "tagline" | "story" | "values">, biz: BusinessInfo): ShopCopy {
  const profile = biz.services;
  const services = (profile?.services ?? []).filter((s) => s.name.trim());
  const activity = product.name || brand.name || unknownText("nom de l'activité", "business name");
  const eyebrow = serviceEyebrow(product);
  const facts = product.facts.filter(known).filter((f) => !["price", "name", "summary", "shipping", "returns"].includes(f.key));
  const area = profile?.area?.trim() || "";
  const areaTail = area && !areaMentioned(activity, area) ? `, ${area}` : "";
  const summary = product.summary || (services.length ? C(`${activity} : ${services.slice(0, 3).map((s) => s.name.toLowerCase()).join(", ")}${areaTail}.`, `${activity}: ${services.slice(0, 3).map((s) => s.name.toLowerCase()).join(", ")}${areaTail}.`) : unknownText("présentation de l'activité en une phrase", "one-sentence description of the business"));
  const lead = heroLead(summary.split(/(?<=[.!?])\s/)[0]);
  const cta = contactCta(profile?.contactMode);
  const info = practicalInfo(product, profile);
  const book = howToBook(profile);
  const prices = pricesText(profile);
  const icons = ["sparkle", "hand", "check", "shield"] as const;

  // Prestations : celles saisies ; à défaut, ce que le client a confirmé, puis des espaces réservés.
  const offer = services.length
    ? services.slice(0, 6).map((s, i) => ({ title: s.name, text: s.description?.trim() || [s.duration?.trim(), s.price?.trim()].filter(Boolean).join(" · ") || unknownText(`description de « ${s.name} »`, `description of "${s.name}"`), icon: icons[i % icons.length] }))
    : facts.slice(0, 4).map((f, i) => ({ title: f.label, text: f.value, icon: icons[i % icons.length] }));
  while (offer.length < 2) offer.push({ title: offer.length ? C("Prestation", "Service") : C("Prestation principale", "Main service"), text: unknownText("nom et description de la prestation", "service name and description"), icon: icons[offer.length] });

  const steps = [
    { title: C("Votre demande", "Your request"), text: book },
    { title: profile?.contactMode === "quote" ? C("Le devis", "The quote") : C("Le rendez-vous", "The appointment"), text: profile?.contactMode === "quote" ? unknownText("comment le devis est établi et envoyé", "how the quote is prepared and sent") : unknownText("déroulé du premier rendez-vous", "how the first appointment works") },
    { title: C("La prestation", "The service"), text: unknownText("comment se déroule la prestation", "how the service is carried out") },
  ];

  const specs = [
    ...info,
    ...services.filter((s) => s.price?.trim() || s.duration?.trim()).slice(0, 6).map((s) => ({ label: s.name, value: [s.duration?.trim(), s.price?.trim()].filter(Boolean).join(" · ") })),
  ].slice(0, 14);

  const durations = services.filter((s) => s.duration?.trim());
  const faq = [
    profile?.contactMode === "quote" ? { q: C("Comment obtenir un devis ?", "How do I get a quote?"), a: book } : { q: C("Comment prendre rendez-vous ?", "How do I book an appointment?"), a: book },
    { q: C("Quels sont vos tarifs ?", "What are your rates?"), a: prices },
    { q: serviceAreaQuestion(info), a: info[0].value },
    { q: C("Quels sont vos horaires ?", "What are your opening hours?"), a: profile?.hours?.trim() || unknownText("horaires", "opening hours") },
    ...(durations.length ? [{ q: C("Combien de temps dure une prestation ?", "How long does a session take?"), a: durations.map((s) => C(`${s.name} : ${s.duration!.trim()}`, `${s.name}: ${s.duration!.trim()}`)).join(C(" ; ", "; ")) + "." }] : []),
    // Le délai est le premier frein d'un client local : question posée, réponse seulement si elle est fournie.
    serviceIsMobile(product) ? { q: C("Sous quel délai pouvez-vous intervenir ?", "How soon can you come out?"), a: unknownText("délai habituel d'intervention", "usual response time") } : { q: C("Quand puis-je avoir un rendez-vous ?", "How soon can I get an appointment?"), a: profile?.bookingUrl?.trim() ? C("Les créneaux disponibles sont affichés en ligne, au moment de réserver.", "Available slots are shown online when you book.") : unknownText("délai habituel pour un rendez-vous", "usual wait for an appointment") },
    profile?.contactMode === "quote" ? { q: C("Que comprend le devis ?", "What does the quote include?"), a: unknownText("contenu du devis, validité et acompte éventuel", "what the quote covers, how long it is valid, any deposit") } : { q: C("Comment annuler ou déplacer un rendez-vous ?", "How do I cancel or reschedule?"), a: unknownText("conditions d'annulation et de report", "cancellation and rescheduling terms") },
  ].slice(0, 12);

  const marquee: string[] = [];
  const addM = (t?: string) => {
    const x = t?.replace(/\s+/g, " ").trim().replace(/[.;,]+$/, "");
    if (x && x.length <= 32 && !marquee.some((m) => m.toLowerCase() === x.toLowerCase())) marquee.push(x);
  };
  services.slice(0, 4).forEach((s) => addM(s.name));
  addM(area);
  addM(profile?.hours);
  if (marquee.length < 2) addM(brand.tagline);
  if (marquee.length < 2) addM(eyebrow);
  if (marquee.length < 2) addM(cta);
  const list = services.length ? `<ul>${services.map((s) => `<li><strong>${serviceLine(s)}</strong>${s.description?.trim() ? `${C(" : ", ": ")}${s.description.trim()}` : ""}</li>`).join("")}</ul>` : `<p>${unknownText("liste des prestations", "list of services")}</p>`;
  const practicalHtml = info.map((r) => `<p><strong>${r.label}${C(" :", ":")}</strong> ${r.value}</p>`).join("");

  return {
    seo: { title: localSeoTitle(product, activity, brand.name, area), description: clip(`${summary.replace(/[.\s]+$/, "")}. ${cta}.`.length <= 155 ? `${summary.replace(/[.\s]+$/, "")}. ${cta}.` : summary, 155) },
    announcement: [],
    hero: {
      eyebrow,
      heading: brand.tagline || activity,
      line1: activity.split(" ").slice(0, 2).join(" ") || brand.name,
      line2: brand.tagline ? brand.tagline.split(" ").slice(0, 4).join(" ") : area || brand.name,
      text: lead,
      cta,
    },
    // Le héros porte déjà la signature : la déclaration dit le métier (résumé), sans doublon.
    statement: { eyebrow: brand.name, heading: brand.tagline ? heroLead(summary.split(/(?<=[.!?])\s/)[0], 90) : summary, text: brand.story || "" },
    features: { heading: C("Nos prestations", "Our services"), items: offer.slice(0, 6) },
    story: { heading: C("Comment ça se passe", "How it works"), steps },
    detail: { eyebrow, heading: activity, text: summary },
    specs: { heading: C("Infos pratiques", "Practical information"), items: specs },
    faq: { heading: C("Questions fréquentes", "FAQ"), items: faq },
    marquee: marquee.slice(0, 4),
    gallery: { heading: serviceGalleryHeading(product), captions: [] },
    cta: { heading: profile?.contactMode === "quote" ? C("Parlons de votre projet", "Let's talk about your project") : C("Prenons rendez-vous", "Let's set up a time"), text: book, button: cta },
    newsletter: { heading: C("Restons en contact", "Stay in touch"), text: C("Conseils et actualités, sans excès.", "Tips and news, never too often.") },
    product: {
      title: activity,
      short: summary,
      description_html: `<p>${summary}</p>${list}`,
      highlights: services.slice(0, 6).map((s) => serviceLine(s)),
      tabs: [
        { heading: C("Prestations", "Services"), content_html: list },
        { heading: C("Tarifs", "Rates"), content_html: `<p>${prices}</p>` },
        { heading: C("Infos pratiques", "Practical information"), content_html: practicalHtml },
      ],
      reassurance: [],
    },
    about: {
      heading: serviceAboutHeading(product),
      intro: brand.story || unknownText("votre parcours et votre façon de travailler", "your background and the way you work"),
      blocks: [
        { heading: C("Notre métier", "What we do"), text: summary },
        { heading: info[0].label, text: info[0].value },
      ],
      values: brand.values.length ? brand.values.slice(0, 3) : [
        { title: C("Des prestations claires", "Clear services"), text: C("Chaque prestation est décrite sur ce site, avec ses tarifs dès qu'ils sont indiqués.", "Every service is described on this site, with its rates once they are listed.") },
        { title: C("Un contact direct", "Direct contact"), text: book },
      ],
    },
    shipping: {
      heading: C("Infos pratiques", "Practical information"),
      body_html: `${practicalHtml}<h3>${C("Conditions de prestation", "Terms of service")}</h3>${serviceTermsHtml(profile)}`,
    },
    contact: { heading: profile?.contactMode === "booking" ? C("Prendre rendez-vous", "Book an appointment") : profile?.contactMode === "quote" ? C("Demander un devis", "Request a quote") : C("Contact", "Contact"), text: C("Une question, un projet ? ", "A question, a project? ") + book },
    footer: { about: brand.tagline || summary.slice(0, 120), newsletter: C("Conseils et actualités, sans excès.", "Tips and news, never too often.") },
  };
}

/**
 * Titre SEO local : « Métier à Ville | Nom » (la requête que tape un client de la zone), 60 caractères au plus ;
 * à défaut, l'activité puis le nom. Rien n'est ajouté qui n'a pas été saisi.
 */
export function localSeoTitle(product: Pick<ProductProfile, "category">, activity: string, brandName: string, area: string): string {
  const cat = product.category?.trim() ?? "";
  const city = area.split(/[,(/]| et | and /)[0].trim();
  const fits = (x: string) => x.length <= 60;
  const named = (x: string) => new RegExp(`(^|[^\\p{L}])${brandName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^\\p{L}])`, "iu").test(x);
  const tail = (x: string) => (brandName && !named(x) ? `${x} | ${brandName}` : x);
  if (cat && city && !areaMentioned(cat, city)) {
    const t = tail(C(`${cat.charAt(0).toLocaleUpperCase()}${cat.slice(1)} à ${city}`, `${cat.charAt(0).toLocaleUpperCase()}${cat.slice(1)} in ${city}`));
    if (fits(t)) return t;
  }
  const a = tail(activity);
  if (fits(a)) return a;
  return clip(brandName || activity, 60);
}

const serviceAreaQuestion = (info: { label: string }[]) => (info[0].label === C("Adresse", "Address") ? C("Où nous trouver ?", "Where can I find you?") : C("Où intervenez-vous ?", "Which areas do you cover?"));

/** Phrase courte pour le héros : s'arrête de préférence à la fin d'une proposition (virgule), sans points de suspension. */
export function heroLead(sentence: string, max = 110): string {
  const s = sentence.trim();
  if (s.length <= max) return s;
  const head = s.slice(0, max + 1);
  const clause = Math.max(head.lastIndexOf(","), head.lastIndexOf(";"), head.lastIndexOf(" – "), head.lastIndexOf(" — "));
  if (clause >= 40) return `${s.slice(0, clause).replace(/\s+$/, "")}.`;
  return `${head.replace(/[\s,;:]+\S*$/, "")}…`;
}
