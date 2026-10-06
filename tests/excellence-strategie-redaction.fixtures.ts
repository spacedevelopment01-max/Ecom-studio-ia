/**
 * Cas réels de la passe « excellence » (stratégie et rédaction) : deux produits photographiés, avec une marque
 * inventée, et des réponses d'IA simulées à trois niveaux (excellente, moyenne, mauvaise).
 *  - Compagnon pour enfant rose à oreilles (photo fournisseur avec filigrane « VLGSKY », jamais repris) : marque « Mirabou ».
 *  - Drone pliable gris (inscription « E24 F1.8 » sur la caméra) : marque « Ventelle ».
 * Les réponses du client (fonction, âge, autonomie…) sont SIMULÉES pour la démonstration et signalées comme telles.
 */
import { emptyProduct, type Brand, type Fact, type Strategy } from "@/lib/project-types";
import type { ShopCopy } from "@/lib/theme/copy";
import type { Project } from "@/lib/projects";

const fact = (key: string, label: string, value: string, status: Fact["status"] = "confirmed", source: Fact["source"] = "user"): Fact => ({ key, label, value, status, source });

// ---------------------------------------------------------------- produits (après les réponses simulées du client)

export const kidProduct = {
  ...emptyProduct(),
  name: "Mirabou Lumi",
  nameStatus: "proposed" as const,
  category: "Veilleuse pour enfant",
  sector: "enfants" as const,
  summary: "Veilleuse tactile rose à oreilles de lapin, rechargeable, pour la chambre d'enfant.",
  facts: [
    fact("function", "Fonction", "veilleuse tactile : une pression allume, une autre change l'intensité"),
    fact("light", "Lumière", "blanc chaud, 3 niveaux d'intensité"),
    fact("timer", "Minuterie", "arrêt automatique après 30 minutes"),
    fact("charging", "Recharge", "batterie rechargeable par câble USB-C (fourni)"),
    fact("materials", "Matière", "coque en silicone souple"),
    fact("age", "Âge conseillé", "à partir de 3 ans"),
    fact("shape", "Forme", "boîtier rond rose à deux oreilles de lapin, disque blanc diffusant", "inferred", "photo"),
    fact("shipping", "Délais et frais de livraison", "", "unknown", "ai"),
    fact("returns", "Conditions de retour", "", "unknown", "ai"),
  ],
  price: { amount: 2990, currency: "EUR", status: "confirmed" as const },
  visual: { colors: [{ hex: "#E6C4C2", share: 0.4, name: "rose pâle" }], shape: "rond, deux oreilles", description: "Boîtier rond rose pâle à deux oreilles de lapin, disque central blanc.", labelText: ["VLGSKY"], hasLogo: false },
};

export const droneProduct = {
  ...emptyProduct(),
  name: "Ventelle Air",
  nameStatus: "proposed" as const,
  category: "Drone pliable avec caméra",
  sector: "hightech" as const,
  summary: "Drone pliable gris de 249 g avec caméra 4K orientable et retour automatique au point de départ.",
  facts: [
    fact("weight", "Poids", "249 g"),
    fact("camera", "Caméra", "vidéo 4K, nacelle orientable"),
    fact("specs", "Autonomie", "jusqu'à 25 minutes par batterie (donnée du fabricant)"),
    fact("range", "Portée de transmission", "jusqu'à 3 km sans obstacle (donnée du fabricant)"),
    fact("rth", "Retour automatique", "retour au point de départ par GPS"),
    fact("box", "Contenu du colis", "drone, 2 batteries, radiocommande, 4 hélices de rechange, câble USB-C, housse de transport"),
    fact("fold", "Format", "bras repliables le long du corps", "inferred", "photo"),
    fact("shipping", "Délais et frais de livraison", "", "unknown", "ai"),
    fact("returns", "Conditions de retour", "", "unknown", "ai"),
  ],
  price: { amount: 18900, currency: "EUR", status: "confirmed" as const },
  visual: { colors: [{ hex: "#8E9196", share: 0.6, name: "gris" }], shape: "quadrirotor, bras repliables", description: "Drone gris anthracite à quatre bras repliables, caméra frontale sur nacelle.", labelText: ["E24 F1.8"], hasLogo: false },
};

// ---------------------------------------------------------------- plateformes de marque (niveau stratège)

export const kidPlatform: NonNullable<Strategy["platform"]> = {
  persona: "Parent d'un enfant de 3 à 6 ans qui fait le rituel du coucher seul en semaine et veut une lumière douce que l'enfant peut allumer lui-même.",
  problem: "Le soir, l'enfant réclame de la lumière ; le plafonnier est trop fort, la lampe de chevet trop chaude au toucher ou trop compliquée pour lui.",
  alternatives: "Veilleuses branchées sur une prise, lampes de chevet d'adulte, lumière du couloir laissée allumée. Codes du secteur : pastels, étoiles, lunes, promesses de sommeil.",
  difference: "Une veilleuse que l'enfant allume d'une simple pression, sans fil pendant l'utilisation, qui s'éteint seule au bout de 30 minutes.",
  proofs: [
    { claim: "S'allume d'une pression", proof: "Fonction tactile confirmée", status: "available" },
    { claim: "S'éteint toute seule", proof: "Minuterie de 30 minutes confirmée", status: "available" },
    { claim: "Sans fil la nuit", proof: "Batterie rechargeable USB-C confirmée", status: "available" },
    { claim: "Autonomie d'une nuit complète", proof: "", status: "missing" },
    { claim: "Résiste aux chutes", proof: "", status: "missing" },
  ],
  objections: [
    { objection: "À partir de quel âge ?", answer: "Elle est conseillée à partir de 3 ans." },
    { objection: "Mon enfant saura-t-il l'utiliser seul ?", answer: "Une pression sur la veilleuse l'allume, une autre change l'intensité : pas de bouton à chercher." },
    { objection: "Et si elle reste allumée toute la nuit ?", answer: "Elle s'éteint automatiquement au bout de 30 minutes." },
    { objection: "Combien de temps tient la batterie ?", answer: "[À compléter : autonomie par charge]" },
    { objection: "Comment la recharger ?", answer: "Avec le câble USB-C fourni." },
  ],
};

export const dronePlatform: NonNullable<Strategy["platform"]> = {
  persona: "Randonneur ou voyageur qui veut filmer ses sorties vu du ciel sans porter un équipement lourd ni passer des semaines à apprendre à piloter.",
  problem: "Il hésite entre un drone jouet qui filme mal et un équipement encombrant et intimidant, et ne sait pas quelles règles s'appliquent.",
  alternatives: "Drones jouets, drones de vidéaste plus lourds, photos au téléphone. Codes du secteur : surenchère de chiffres, vocabulaire technique, visuels de vitesse.",
  difference: "249 g et des bras qui se replient : il part dans le sac de randonnée avec deux batteries et filme en 4K.",
  proofs: [
    { claim: "Léger", proof: "249 g confirmés", status: "available" },
    { claim: "Vidéo 4K stabilisée par nacelle", proof: "Caméra 4K sur nacelle orientable confirmée", status: "available" },
    { claim: "Revient seul", proof: "Retour au point de départ par GPS confirmé", status: "available" },
    { claim: "Deux batteries", proof: "Contenu du colis confirmé", status: "available" },
    { claim: "Résiste au vent", proof: "", status: "missing" },
    { claim: "Évite les obstacles", proof: "", status: "missing" },
  ],
  objections: [
    { objection: "Faut-il un permis pour le faire voler ?", answer: "Il pèse 249 g. Les règles d'enregistrement et de vol dépendent du pays : [À compléter : lien vers la réglementation de votre pays]." },
    { objection: "Est-ce difficile pour un débutant ?", answer: "[À compléter : modes d'aide au pilotage disponibles]" },
    { objection: "Combien de temps vole-t-il ?", answer: "Jusqu'à 25 minutes par batterie selon le fabricant, et deux batteries sont fournies." },
    { objection: "Que se passe-t-il si je perds le signal ?", answer: "Il dispose d'un retour au point de départ par GPS ; [À compléter : déclenchement en cas de perte de signal]." },
    { objection: "Que contient la boîte ?", answer: "Le drone, 2 batteries, la radiocommande, 4 hélices de rechange, un câble USB-C et une housse." },
  ],
};

export const kidBrand: Pick<Brand, "name" | "tagline" | "story" | "values"> = { name: "Mirabou", tagline: "La lumière à sa portée", story: "", values: [] };
export const droneBrand: Pick<Brand, "name" | "tagline" | "story" | "values"> = { name: "Ventelle", tagline: "Le ciel dans le sac", story: "", values: [] };

export function projectOf(product: typeof kidProduct | typeof droneProduct, brand: Pick<Brand, "name" | "tagline" | "story" | "values">, platform?: Strategy["platform"]): Project {
  return {
    id: `p-${brand.name.toLowerCase()}`,
    userId: "u-test",
    business: "products",
    settings: { language: "fr" },
    catalog: [],
    sources: [],
    product,
    brand: { ...brand, nameStatus: "proposed", alternatives: [], positioning: "", audience: "", personality: [], tone: { voice: "", do: [], dont: [] }, palette: { primary: "#3A3F4B", secondary: "#E6E2DC", accent: "#B5714A", light: "#F7F5F2", dark: "#16181D" }, fonts: { heading: "", body: "" }, logo: { concept: "", status: "proposed" }, direction: "atelier", validated: [], generatedBy: "ai" },
    strategy: platform ? { audience: [], angles: [], pillars: [], keyMessages: [], platform, generatedBy: "ai" } : null,
  } as unknown as Project;
}

// ---------------------------------------------------------------- textes de boutique simulés

/** Base commune des textes (les champs non montrés dans la démonstration restent sobres et vrais). */
function base(over: Partial<ShopCopy>): ShopCopy {
  return {
    seo: { title: "", description: "" },
    announcement: [],
    hero: { eyebrow: "", heading: "", line1: "", line2: "", text: "", cta: "" },
    statement: { eyebrow: "", heading: "", text: "" },
    features: { heading: "", items: [] },
    story: { heading: "", steps: [] },
    detail: { eyebrow: "", heading: "", text: "" },
    specs: { heading: "Caractéristiques", items: [] },
    faq: { heading: "Questions fréquentes", items: [] },
    marquee: [],
    gallery: { heading: "En images", captions: [] },
    cta: { heading: "", text: "", button: "" },
    newsletter: { heading: "", text: "" },
    product: { title: "", short: "", description_html: "", highlights: [], tabs: [], reassurance: [] },
    about: { heading: "", intro: "", blocks: [{ heading: "", text: "" }], values: [] },
    shipping: { heading: "Livraison et retours", body_html: "<p>[À compléter : délais et tarifs de livraison]</p><p>[À compléter : conditions de retour]</p>" },
    contact: { heading: "", text: "" },
    footer: { about: "", newsletter: "" },
    ...over,
  } as ShopCopy;
}

/** Niveau « agence » : bénéfices prouvés, objections traitées, micro-textes et SEO soignés. */
export const kidExcellent: ShopCopy = base({
  seo: { title: "Veilleuse enfant tactile rechargeable | Mirabou", description: "Mirabou Lumi, la veilleuse à oreilles de lapin que votre enfant allume d'une pression. Lumière blanc chaud, arrêt automatique après 30 minutes." },
  hero: { eyebrow: "Veilleuse tactile", heading: "Une pression, et la nuit s'adoucit", line1: "Une pression,", line2: "la nuit s'adoucit", text: "La veilleuse à oreilles de lapin que votre enfant allume lui-même, dès 3 ans.", cta: "Voir Mirabou Lumi" },
  statement: { eyebrow: "Au moment du coucher", heading: "Le plafonnier éblouit, le couloir reste allumé", text: "Mirabou Lumi pose une lumière blanc chaud à côté du lit, que votre enfant règle sans vous appeler." },
  features: {
    heading: "Pensée pour ses petites mains",
    items: [
      { title: "Il l'allume tout seul", text: "Une pression sur la coque allume la veilleuse, une autre change l'intensité.", icon: "hand" },
      { title: "Elle s'éteint sans vous", text: "La minuterie l'arrête automatiquement au bout de 30 minutes.", icon: "check" },
      { title: "Aucun fil près du lit", text: "La batterie se recharge par câble USB-C, puis la veilleuse se pose où vous voulez.", icon: "sparkle" },
      { title: "Une lumière qui se règle", text: "Trois niveaux de blanc chaud, du plus doux au plus lumineux.", icon: "sparkle" },
    ],
  },
  story: { heading: "Le rituel en trois gestes", steps: [{ title: "Recharger", text: "Branchez le câble USB-C fourni dans la journée." }, { title: "Poser", text: "Placez Mirabou Lumi sur la table de chevet ou une étagère." }, { title: "Appuyer", text: "Votre enfant l'allume d'une pression et choisit l'intensité." }] },
  detail: { eyebrow: "Le détail", heading: "Deux oreilles, un disque qui diffuse", text: "La lumière passe par le grand disque blanc, encadré par la coque en silicone souple." },
  specs: { heading: "Caractéristiques", items: [{ label: "Lumière", value: "Blanc chaud, 3 niveaux d'intensité" }, { label: "Minuterie", value: "Arrêt automatique après 30 minutes" }, { label: "Recharge", value: "Batterie rechargeable, câble USB-C fourni" }, { label: "Matière", value: "Silicone souple" }, { label: "Âge conseillé", value: "À partir de 3 ans" }, { label: "Autonomie par charge", value: "[À compléter : autonomie par charge]" }] },
  faq: {
    heading: "Vos questions",
    items: [
      { q: "À partir de quel âge ?", a: "Mirabou Lumi est conseillée à partir de 3 ans." },
      { q: "Mon enfant saura-t-il l'utiliser seul ?", a: "Oui : une pression l'allume, une autre change l'intensité. Il n'y a pas de bouton à chercher." },
      { q: "Et si elle reste allumée toute la nuit ?", a: "Elle s'éteint automatiquement au bout de 30 minutes." },
      { q: "Combien de temps tient la batterie ?", a: "[À compléter : autonomie par charge]" },
      { q: "Comment la recharger ?", a: "Avec le câble USB-C fourni." },
      { q: "Comment la nettoyer ?", a: "[À compléter : conseils de nettoyage]" },
      { q: "Quels sont les délais de livraison ?", a: "[À compléter : délais et tarifs de livraison]" },
      { q: "Puis-je la retourner ?", a: "[À compléter : conditions de retour]" },
    ],
  },
  marquee: ["Une pression pour allumer", "Arrêt après 30 minutes", "Recharge USB-C", "Dès 3 ans"],
  cta: { heading: "Sa lumière, à sa portée", text: "Mirabou Lumi, 29,90 €, câble USB-C fourni.", button: "Choisir Mirabou Lumi" },
  newsletter: { heading: "Les nouvelles de Mirabou", text: "Nouveautés et idées de rituels du soir, une fois par mois au plus." },
  product: {
    title: "Mirabou Lumi, veilleuse tactile pour enfant",
    short: "La veilleuse à oreilles de lapin que votre enfant allume d'une pression, dès 3 ans.",
    description_html: "<p>Le soir, votre enfant veut de la lumière, mais pas celle du plafonnier. Mirabou Lumi pose une lueur blanc chaud près du lit, qu'il règle lui-même.</p><ul><li><strong>Il l'allume tout seul</strong> : une pression allume, une autre change l'intensité.</li><li><strong>Elle s'éteint sans vous</strong> : arrêt automatique après 30 minutes.</li><li><strong>Aucun fil près du lit</strong> : batterie rechargeable par câble USB-C.</li><li><strong>Trois ambiances</strong> : trois niveaux de blanc chaud.</li></ul><p>Rechargez-la dans la journée, posez-la sur la table de chevet, et laissez votre enfant prendre la main.</p><p><strong>Bon à savoir</strong> : [À compléter : autonomie par charge].</p>",
    highlights: ["Allumage d'une pression", "Arrêt après 30 min", "Recharge USB-C", "Dès 3 ans"],
    tabs: [{ heading: "Caractéristiques", content_html: "<ul><li>Blanc chaud, 3 niveaux</li><li>Minuterie 30 minutes</li><li>Silicone souple</li></ul>" }, { heading: "Contenu du colis", content_html: "<p>La veilleuse et son câble USB-C.</p>" }, { heading: "Livraison et retours", content_html: "<p>[À compléter : délais et tarifs de livraison]</p><p>[À compléter : conditions de retour]</p>" }],
    reassurance: [],
  },
  about: { heading: "Mirabou, des objets du soir", intro: "[À compléter : histoire de la marque]", blocks: [{ heading: "Ce que nous faisons", text: "Des objets simples pour le coucher, que l'enfant utilise lui-même." }], values: [] },
  contact: { heading: "Une question avant de choisir ?", text: "Écrivez-nous : nous répondons sur l'utilisation, la recharge et votre commande." },
  footer: { about: "Mirabou, la lumière à sa portée.", newsletter: "Nouveautés et idées de rituels du soir, une fois par mois au plus." },
});

/** Niveau « correct mais générique » : typique d'une consigne vague (caractéristiques sans bénéfices, formules creuses, FAQ pauvre). */
export const kidMedium: ShopCopy = base({
  seo: { title: "Mirabou Lumi | Mirabou", description: "Découvrez Mirabou Lumi, une veilleuse pour enfant au design mignon." },
  hero: { eyebrow: "Nouveau", heading: "Découvrez Mirabou Lumi", line1: "Découvrez", line2: "Mirabou Lumi", text: "Une veilleuse au design mignon pour la chambre de votre enfant.", cta: "Découvrir" },
  statement: { eyebrow: "Mirabou", heading: "Le compagnon idéal des nuits", text: "Une veilleuse pensée pour les enfants." },
  features: { heading: "Caractéristiques", items: [{ title: "Tactile", text: "Fonction tactile.", icon: "hand" }, { title: "Minuterie", text: "30 minutes.", icon: "check" }, { title: "USB-C", text: "Rechargeable.", icon: "sparkle" }] },
  story: { heading: "Comment ça marche", steps: [{ title: "Étape 1", text: "Chargez." }, { title: "Étape 2", text: "Utilisez." }] },
  faq: { heading: "FAQ", items: [{ q: "Quels sont les délais de livraison ?", a: "[À compléter : délais et tarifs de livraison]" }, { q: "Puis-je retourner ma commande ?", a: "[À compléter : conditions de retour]" }] },
  marquee: ["Design mignon", "Tactile"],
  cta: { heading: "Adoptez Mirabou Lumi", text: "", button: "Acheter" },
  newsletter: { heading: "Newsletter", text: "Inscrivez-vous à notre newsletter." },
  product: { title: "Mirabou Lumi", short: "Une veilleuse mignonne.", description_html: "<p>Mirabou Lumi est une veilleuse tactile, rechargeable, avec minuterie.</p>", highlights: ["Tactile", "USB-C"], tabs: [], reassurance: [] },
  contact: { heading: "Contact", text: "Contactez-nous." },
  footer: { about: "Mirabou", newsletter: "Inscrivez-vous." },
});

/** Niveau « dangereux » : allégations interdites pour un produit pour enfants, avis et livraison inventés. */
export const kidBad: ShopCopy = base({
  ...kidMedium,
  hero: { eyebrow: "Best-seller", heading: "La veilleuse qui aide bébé à s'endormir", line1: "Des nuits", line2: "apaisées", text: "Sans danger pour les bébés, matériaux non toxiques, recommandée par les pédiatres.", cta: "Acheter" },
  announcement: ["Livraison offerte dès aujourd'hui"],
  statement: { eyebrow: "Mirabou", heading: "Déjà 10 000 parents conquis", text: "Une veilleuse révolutionnaire qui apaise votre enfant." },
});

export const droneExcellent: ShopCopy = base({
  seo: { title: "Drone pliable 249 g avec caméra 4K | Ventelle", description: "Ventelle Air : 249 g, bras repliables, vidéo 4K sur nacelle et retour automatique. Deux batteries fournies pour filmer vos sorties." },
  hero: { eyebrow: "Drone pliable 4K", heading: "249 g, et vos sorties vues du ciel", line1: "249 g,", line2: "vues du ciel", text: "Ventelle Air se replie dans le sac de randonnée et filme en 4K.", cta: "Voir Ventelle Air" },
  statement: { eyebrow: "Entre le jouet et l'équipement de pro", heading: "Filmer du ciel sans porter une valise", text: "Ventelle Air tient dans une housse, vole jusqu'à 25 minutes par batterie selon le fabricant, et deux batteries sont fournies." },
  features: {
    heading: "Fait pour partir avec vous",
    items: [
      { title: "Se replie, se glisse, s'oublie", text: "Les quatre bras se replient le long du corps ; la housse de transport est fournie.", icon: "hand" },
      { title: "Des images nettes en 4K", text: "La caméra filme en 4K sur une nacelle orientable.", icon: "sparkle" },
      { title: "Il revient tout seul", text: "Le retour automatique par GPS le ramène à son point de départ.", icon: "shield" },
      { title: "Deux batteries dans la boîte", text: "Jusqu'à 25 minutes de vol chacune, selon le fabricant.", icon: "check" },
    ],
  },
  story: { heading: "De la housse au premier plan", steps: [{ title: "Déplier", text: "Ouvrez les quatre bras repliés le long du corps." }, { title: "Décoller", text: "Pilotez avec la radiocommande fournie." }, { title: "Rentrer", text: "Le retour automatique le ramène à son point de départ." }] },
  detail: { eyebrow: "Gros plan", heading: "La caméra sur sa nacelle", text: "À l'avant, la caméra 4K s'oriente pour cadrer le paysage, du plan large à la vue plongeante." },
  specs: { heading: "Caractéristiques", items: [{ label: "Poids", value: "249 g" }, { label: "Vidéo", value: "4K, nacelle orientable" }, { label: "Autonomie", value: "Jusqu'à 25 minutes par batterie (fabricant)" }, { label: "Portée", value: "Jusqu'à 3 km sans obstacle (fabricant)" }, { label: "Sécurité de vol", value: "Retour au point de départ par GPS" }, { label: "Dans la boîte", value: "Drone, 2 batteries, radiocommande, 4 hélices, câble USB-C, housse" }] },
  faq: {
    heading: "Avant de décoller",
    items: [
      { q: "Faut-il un permis pour le faire voler ?", a: "Ventelle Air pèse 249 g. Les règles d'enregistrement et de vol dépendent du pays : [À compléter : lien vers la réglementation de votre pays]." },
      { q: "Combien de temps vole-t-il ?", a: "Jusqu'à 25 minutes par batterie selon le fabricant ; deux batteries sont fournies." },
      { q: "Que se passe-t-il si je perds le signal ?", a: "Ventelle Air dispose d'un retour au point de départ par GPS. [À compléter : déclenchement en cas de perte de signal]" },
      { q: "Est-ce difficile pour un débutant ?", a: "[À compléter : modes d'aide au pilotage disponibles]" },
      { q: "Que contient la boîte ?", a: "Le drone, 2 batteries, la radiocommande, 4 hélices de rechange, un câble USB-C et une housse de transport." },
      { q: "Quels sont les délais de livraison ?", a: "[À compléter : délais et tarifs de livraison]" },
      { q: "Puis-je le retourner ?", a: "[À compléter : conditions de retour]" },
    ],
  },
  marquee: ["249 g", "Vidéo 4K", "Bras repliables", "2 batteries fournies"],
  cta: { heading: "Votre prochaine sortie, vue d'en haut", text: "Ventelle Air, 189 €, livré avec deux batteries et sa housse.", button: "Choisir Ventelle Air" },
  newsletter: { heading: "Le carnet de vol", text: "Conseils de prise de vue et nouveautés Ventelle, une fois par mois au plus." },
  product: {
    title: "Ventelle Air, drone pliable avec caméra 4K",
    short: "Le drone de 249 g qui se replie dans le sac et filme vos sorties en 4K.",
    description_html: "<p>Vous voulez filmer vos randonnées vues du ciel, sans porter un équipement lourd. Ventelle Air pèse 249 g et se replie dans sa housse.</p><ul><li><strong>Se transporte partout</strong> : bras repliables, housse fournie.</li><li><strong>Des images nettes</strong> : vidéo 4K sur nacelle orientable.</li><li><strong>Revient tout seul</strong> : retour au point de départ par GPS.</li><li><strong>Plus de temps en l'air</strong> : 2 batteries, jusqu'à 25 minutes chacune selon le fabricant.</li></ul><p>Dépliez les bras, décollez avec la radiocommande, cadrez avec la nacelle.</p><p><strong>Bon à savoir</strong> : les règles de vol dépendent du pays. Aide au pilotage : [À compléter : modes d'aide au pilotage disponibles].</p>",
    highlights: ["249 g", "Vidéo 4K", "Retour automatique GPS", "2 batteries fournies"],
    tabs: [{ heading: "Caractéristiques", content_html: "<ul><li>249 g</li><li>Vidéo 4K, nacelle orientable</li><li>Portée jusqu'à 3 km (fabricant)</li></ul>" }, { heading: "Contenu du colis", content_html: "<p>Drone, 2 batteries, radiocommande, 4 hélices de rechange, câble USB-C, housse.</p>" }, { heading: "Livraison et retours", content_html: "<p>[À compléter : délais et tarifs de livraison]</p><p>[À compléter : conditions de retour]</p>" }],
    reassurance: [],
  },
  about: { heading: "Ventelle, le ciel à portée de sac", intro: "[À compléter : histoire de la marque]", blocks: [{ heading: "Ce que nous faisons", text: "Des drones légers, pensés pour filmer ses sorties." }], values: [] },
  contact: { heading: "Une question avant de décoller ?", text: "Écrivez-nous : nous répondons sur le pilotage, les batteries et votre commande." },
  footer: { about: "Ventelle, le ciel dans le sac.", newsletter: "Conseils de prise de vue, une fois par mois au plus." },
});

export const droneMedium: ShopCopy = base({
  seo: { title: "Ventelle Air | Ventelle", description: "Découvrez le drone Ventelle Air, un drone de qualité supérieure avec caméra." },
  hero: { eyebrow: "Nouveau", heading: "Le drone qu'il vous faut", line1: "Le drone", line2: "qu'il vous faut", text: "Un drone innovant avec caméra pour tous vos besoins.", cta: "Découvrir" },
  statement: { eyebrow: "Ventelle", heading: "La technologie à portée de main", text: "Un drone performant." },
  features: { heading: "Caractéristiques", items: [{ title: "Caméra 4K", text: "Caméra 4K.", icon: "sparkle" }, { title: "249 g", text: "Léger.", icon: "check" }, { title: "GPS", text: "Retour automatique.", icon: "shield" }] },
  story: { heading: "Utilisation", steps: [{ title: "Étape 1", text: "Dépliez." }, { title: "Étape 2", text: "Volez." }] },
  faq: { heading: "FAQ", items: [{ q: "Quels sont les délais de livraison ?", a: "[À compléter : délais et tarifs de livraison]" }, { q: "Puis-je retourner ma commande ?", a: "[À compléter : conditions de retour]" }] },
  marquee: ["Drone", "Caméra"],
  cta: { heading: "Adoptez Ventelle Air", text: "", button: "Acheter" },
  newsletter: { heading: "Newsletter", text: "Inscrivez-vous." },
  product: { title: "Ventelle Air", short: "Un drone avec caméra.", description_html: "<p>Ventelle Air est un drone pliable avec caméra 4K, GPS et deux batteries.</p>", highlights: ["4K", "GPS"], tabs: [], reassurance: [] },
  contact: { heading: "Contact", text: "Contactez-nous." },
  footer: { about: "Ventelle", newsletter: "Inscrivez-vous." },
});

// ---------------------------------------------------------------- relectures simulées du directeur de création

const scores = (v: number[]) => ({ specificity: v[0], benefits: v[1], objections: v[2], clarity: v[3], voice: v[4], seo: v[5], conversion: v[6] });
export const reviewExcellent = { scores: scores([9, 9, 9, 9, 8, 9, 8]), issues: [], brief: "" };
export const reviewMedium = {
  scores: scores([5, 4, 3, 7, 6, 5, 5]),
  issues: [
    { path: "hero.heading", severity: "mineur", problem: "Titre générique, valable pour n'importe quel produit.", fix: "Une pression, et la nuit s'adoucit" },
    { path: "statement.heading", severity: "mineur", problem: "Formule creuse « le compagnon idéal ».", fix: "Le plafonnier éblouit, le couloir reste allumé" },
    { path: "faq.items", severity: "mineur", problem: "Aucune objection de la plateforme traitée (âge, autonomie, arrêt automatique).", fix: "Ajouter : À partir de quel âge ? / Combien de temps tient la batterie ? / Et si elle reste allumée ?" },
  ],
  brief: "Écrire les bénéfices vécus par le parent (titre) avec la caractéristique en preuve, traiter les objections dans la FAQ et mettre le mot-clé « veilleuse enfant » dans le titre SEO.",
};
export const reviewBad = {
  scores: scores([4, 3, 2, 6, 4, 4, 3]),
  issues: [
    { path: "hero.heading", severity: "bloquant", problem: "Allégation de sommeil interdite pour un produit pour enfants.", fix: "Une pression, et la nuit s'adoucit" },
    { path: "statement.heading", severity: "bloquant", problem: "Preuve sociale inventée (10 000 parents).", fix: "Le plafonnier éblouit, le couloir reste allumé" },
  ],
  brief: "Retirer toute allégation de sécurité, de sommeil et de preuve sociale ; s'appuyer sur la fonction tactile et la minuterie confirmées.",
};
