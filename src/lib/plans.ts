/**
 * Forfaits et packs : la seule source de vérité (page d'accueil, abonnement, studio, paiement, quotas).
 * Une seule boutique ou un seul site par abonnement, quel que soit le forfait.
 * Les crédits d'IA ne sont jamais affichés au client : il voit des quotas concrets (visuels, vidéos…).
 * Le budget IA interne (caché) découle des prix : 40 % du HT du forfait, 50 % du HT des packs (voir billing.ts).
 */

export type PlanId = "creer" | "vendre" | "dominer";
export type Billing = "month" | "year";
/** Ce qui se compte chaque mois (et ce que les packs ajoutent). */
export type QuotaKey = "visuals" | "aiVideos" | "ugc" | "blog";

export type Plan = {
  id: PlanId;
  name: { fr: string; en: string };
  tagline: { fr: string; en: string };
  /** Prix TTC en euros. À l'année : 2 mois offerts. */
  price: { month: number; year: number };
  /** Mis en avant sur la page des tarifs. */
  featured?: boolean;
  quotas: Record<QuotaKey, number>;
  /** Qualité des vidéos filmées par l'IA. */
  videoQuality: "fast" | "max";
  calendarDays: number;
  autopublish: boolean;
  /** Campagnes publicitaires actives (Infinity = illimitées). */
  campaigns: number;
  adVariants: boolean;
  languages: number;
  theme: "composed" | "custom-sections" | "fully-custom";
  support: "email" | "priority" | "priority-call";
  /** Quotas non utilisés reportés au mois suivant (dans la limite d'un mois). */
  rollover: boolean;
  /** Remise sur les packs. */
  packDiscount: number;
};

export const PLANS: Record<PlanId, Plan> = {
  creer: {
    id: "creer",
    name: { fr: "Créer", en: "Create" },
    tagline: { fr: "Lancer sa boutique", en: "Launch your store" },
    price: { month: 49.9, year: 499 },
    quotas: { visuals: 30, aiVideos: 4, ugc: 0, blog: 0 },
    videoQuality: "fast",
    calendarDays: 7,
    autopublish: false,
    campaigns: 1,
    adVariants: false,
    languages: 1,
    theme: "composed",
    support: "email",
    rollover: false,
    packDiscount: 0,
  },
  vendre: {
    id: "vendre",
    name: { fr: "Vendre", en: "Sell" },
    tagline: { fr: "Faire grandir ses ventes", en: "Grow your sales" },
    price: { month: 79.9, year: 799 },
    featured: true,
    quotas: { visuals: 80, aiVideos: 8, ugc: 1, blog: 2 },
    videoQuality: "max",
    calendarDays: 30,
    autopublish: true,
    campaigns: 5,
    adVariants: true,
    languages: 2,
    theme: "custom-sections",
    support: "priority",
    rollover: true,
    packDiscount: 0.1,
  },
  dominer: {
    id: "dominer",
    name: { fr: "Dominer", en: "Dominate" },
    tagline: { fr: "Viser le haut de gamme", en: "Go premium" },
    price: { month: 99.9, year: 999 },
    quotas: { visuals: 150, aiVideos: 10, ugc: 2, blog: 8 },
    videoQuality: "max",
    calendarDays: 30,
    autopublish: true,
    campaigns: Infinity,
    adVariants: true,
    languages: 5,
    theme: "fully-custom",
    support: "priority-call",
    rollover: true,
    packDiscount: 0.2,
  },
};
export const PLAN_IDS = Object.keys(PLANS) as PlanId[];

/** Thèmes entièrement sur mesure par compte et par mois, forfait Dominer (garde-fou : chaque thème mobilise beaucoup d'IA). */
export const CUSTOM_THEMES_PER_MONTH = 2;

/** Découverte gratuite : faite par le moteur du studio, sans IA (pas d'export, pas d'images ni de vidéos). */
export const DISCOVERY = {
  includes: ["analysis", "brand", "logos", "homePreview"] as const,
  /** Une découverte par compte (e-mail vérifié). */
  perAccount: 1,
};

export type PackId = "visuals" | "videos" | "ugc" | "launch" | "language";
export type Pack = {
  id: PackId;
  name: { fr: string; en: string };
  description: { fr: string; en: string };
  /** Prix TTC en euros (avant remise du forfait). */
  price: number;
  /** Ce que le pack ajoute (n'expire pas). */
  adds: Partial<Record<QuotaKey | "languages", number>>;
  /** Achat unique (pack de lancement). */
  once?: boolean;
  /** Pas encore en vente (la fonction n'est pas construite). */
  soon?: boolean;
};

export const PACKS: Record<PackId, Pack> = {
  visuals: {
    id: "visuals",
    name: { fr: "Pack Visuels", en: "Visuals pack" },
    description: { fr: "20 visuels créés par l'IA : photos mises en scène, bannières, publicités.", en: "20 AI-created visuals: staged photos, banners, ads." },
    price: 14.9,
    adds: { visuals: 20 },
  },
  videos: {
    id: "videos",
    name: { fr: "Pack Vidéos", en: "Videos pack" },
    description: { fr: "5 vidéos avec des plans filmés par l'IA.", en: "5 videos with AI-filmed shots." },
    price: 19.9,
    adds: { aiVideos: 5 },
  },
  ugc: {
    id: "ugc",
    name: { fr: "Pack UGC", en: "UGC pack" },
    description: { fr: "1 vidéo où une personne présente votre produit face caméra.", en: "1 video where a person presents your product on camera." },
    price: 24.9,
    adds: { ugc: 1 },
  },
  launch: {
    id: "launch",
    name: { fr: "Pack Lancement", en: "Launch pack" },
    description: { fr: "20 visuels, 5 vidéos IA, 1 vidéo UGC, une campagne publicitaire et 30 jours de publications prêtes.", en: "20 visuals, 5 AI videos, 1 UGC video, an ad campaign and 30 days of ready-made posts." },
    price: 59.9,
    adds: { visuals: 20, aiVideos: 5, ugc: 1 },
    once: true,
  },
  language: {
    id: "language",
    name: { fr: "Langue en plus", en: "Extra language" },
    description: { fr: "Votre boutique traduite dans une langue de plus : textes, pages et fiches produits.", en: "Your store translated into one more language: copy, pages and product pages." },
    price: 29.9,
    adds: { languages: 1 },
    soon: true,
  },
};
export const PACK_IDS = Object.keys(PACKS) as PackId[];
/** Packs en vente (les packs « bientôt » ne sont ni affichés ni vendus). */
export const PACKS_FOR_SALE = PACK_IDS.filter((id) => !PACKS[id].soon);

/** Prix d'un pack pour un forfait (remise comprise), arrondi au centime. */
export const packPrice = (pack: PackId, plan?: PlanId | null) => Math.round(PACKS[pack].price * (1 - (plan ? PLANS[plan].packDiscount : 0)) * 100) / 100;

/** Prix mensuel équivalent d'un abonnement annuel. */
export const monthlyEquivalent = (plan: PlanId) => Math.round((PLANS[plan].price.year / 12) * 100) / 100;

/** Garantie : satisfait ou remboursé (jours). */
export const REFUND_DAYS = 14;

/** Réponse de GET /api/billing (vue client : jamais de crédits ni de coûts, seulement des quotas). */
export type QuotaView = {
  /** Inclus dans le forfait ce mois-ci. */
  included: number;
  /** Report du mois précédent (forfaits avec report). */
  rollover: number;
  /** Ajouté par des packs (n'expire pas). */
  pack: number;
  used: number;
  /** Ce qu'il reste : included + rollover + pack − used (jamais négatif). */
  left: number;
};
export type BillingView = {
  /** Forfait en cours (null : pas d'abonnement — découverte gratuite). */
  plan: PlanId | null;
  /** Création d'images, de vidéos et d'UGC ouverte (forfait, ou compte administrateur). */
  canCreate?: boolean;
  billing: Billing | null;
  status: "none" | "trial" | "active" | "past_due" | "canceled" | "manual";
  /** Fin de la période en cours (renouvellement des quotas), en ms. */
  periodEnd: number;
  quotas: Record<QuotaKey, QuotaView>;
  /** Langues de la boutique : incluses dans le forfait + ajoutées par des packs. */
  languages: { included: number; extra: number };
  /** Découverte gratuite (comptes sans abonnement). */
  discovery: { available: boolean; used: boolean };
  /** Prix des packs pour ce compte (remise du forfait comprise). */
  packPrices: Record<PackId, number>;
  /** Le pack Lancement a déjà été acheté (achat unique). */
  launchPackBought: boolean;
  paymentsLive: boolean;
  /** Derniers paiements (abonnement, packs). */
  history: { kind: "subscription" | "pack" | "topup"; label: string; amountEur: number; at: number }[];
};

/** Corps de POST /api/billing/checkout. Réponse : { url } (page de paiement Stripe). */
export type CheckoutBody = { kind: "plan"; plan: PlanId; billing: Billing } | { kind: "pack"; pack: PackId };

/** Code d'erreur (champ `code` des réponses API et des tâches) quand un quota est épuisé : l'écran propose le pack adapté. */
export const QUOTA_ERROR = "quota_exhausted";
