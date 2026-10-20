/**
 * Forfaits (V2) : la seule source de vérité des droits (page d'accueil, abonnement, studio, serveur, worker).
 *
 * UN ABONNEMENT = UN PROJET UNIQUE. Un compte peut avoir plusieurs projets, chacun avec son propre abonnement
 * (et son propre budget IA, ses recharges, ses droits) — voir project-billing.ts.
 * Découverte gratuite : aucun projet réel, démonstration seulement (aucun appel d'IA payant).
 * Le budget IA interne (caché, affiché en %) découle des prix : 40 % du HT du forfait, 50 % du HT des recharges.
 * Seuls achats complémentaires : la recharge IA à 10 € (par projet) et le rendez-vous téléphonique de 60 minutes.
 */

export type PlanId = "creer" | "vendre" | "dominer";
export type Billing = "month" | "year";
/** Ce qui se compte chaque mois. Depuis les forfaits V2 seul le blog IA a une limite en nombre (le reste : budget IA). */
export type QuotaKey = "visuals" | "aiVideos" | "ugc" | "blog";

export type Plan = {
  id: PlanId;
  name: { fr: string; en: string };
  tagline: { fr: string; en: string };
  /** Accroche de la grille tarifaire. */
  pitch: { fr: string; en: string };
  /** Bouton de la grille tarifaire. */
  cta: { fr: string; en: string };
  /** Prix TTC en euros. À l'année : 10 mois payés. */
  price: { month: number; year: number };
  /** Mis en avant sur la page des tarifs (« Notre recommandation »). */
  featured?: boolean;
  /** Limites en nombre par mois (seul le blog compte encore ; images et vidéos : budget IA du projet). */
  quotas: Record<QuotaKey, number>;
  /** Thèmes accessibles par famille (catalogue cible de cinq). */
  themes: number;
  /** Fonctions de section de la bibliothèque par famille, jamais une limite de blocs/page. */
  librarySections: number;
  themeEditing: "basic" | "advanced" | "custom";
  /** Propositions initiales de direction artistique (sous réserve du budget IA). */
  artDirections: number;
  /** Vidéos IA : aucune, courtes, avancées. */
  videos: "none" | "short" | "advanced";
  /** Qualité des vidéos filmées par l'IA. */
  videoQuality: "fast" | "max";
  /** Vidéos UGC (une personne présente le produit) par l'IA. */
  ugc: boolean;
  /** Création, reconstruction et modification avancée des sections par l'IA ; pages personnalisées. */
  aiSections: boolean;
  /** Bibliothèque des modèles de pages, ajout libre de pages, mise en page propre à un produit ou une prestation. */
  pageModels: boolean;
  /** Publicités : essentielles, avancées (variantes), complètes (multivariantes). */
  ads: "none" | "essential" | "advanced" | "full";
  seo: "essential" | "advanced" | "full";
  /** Jours de calendrier de publications. */
  calendarDays: number;
  /** Publications programmées par jour (au plus). */
  postsPerDay: number;
  autopublish: boolean;
  /** Automatisations marketing : essentielles, intermédiaires, avancées. */
  automation: "essential" | "intermediate" | "advanced";
  /** Campagnes publicitaires actives (Infinity = illimitées). */
  campaigns: number;
  adVariants: boolean;
  languages: number;
  theme: "composed" | "custom-sections" | "fully-custom";
  support: "email" | "priority" | "priority-call";
  /** Rendez-vous téléphonique de 60 minutes, prix TTC en euros (null : réglé par l'administration). */
  callPrice: number | null;
  /** Première heure d'accompagnement offerte (une seule fois par compte client). */
  freeFirstCall: boolean;
  /** Quotas non utilisés reportés (anciens forfaits ; plus utilisé). */
  rollover: boolean;
  /** Remise sur les anciens packs (plus vendus). */
  packDiscount: number;
};

export const PLANS: Record<PlanId, Plan> = {
  creer: {
    id: "creer",
    name: { fr: "Créer", en: "Create" },
    tagline: { fr: "Lancer son e-commerce", en: "Launch your e-commerce" },
    pitch: { fr: "Lancez votre e-commerce avec l'intelligence artificielle.", en: "Launch your e-commerce with artificial intelligence." },
    cta: { fr: "Créer mon e-commerce", en: "Build my e-commerce" },
    price: { month: 49, year: 490 },
    quotas: { visuals: 0, aiVideos: 0, ugc: 0, blog: 0 },
    themes: 1,
    librarySections: 8,
    themeEditing: "basic",
    artDirections: 1,
    videos: "none",
    videoQuality: "fast",
    ugc: false,
    aiSections: false,
    pageModels: false,
    ads: "none",
    seo: "essential",
    calendarDays: 7,
    postsPerDay: 1,
    autopublish: true,
    automation: "essential",
    campaigns: 0,
    adVariants: false,
    languages: 1,
    theme: "composed",
    support: "email",
    callPrice: 60,
    freeFirstCall: false,
    rollover: false,
    packDiscount: 0,
  },
  vendre: {
    id: "vendre",
    name: { fr: "Développer", en: "Grow" },
    tagline: { fr: "Développer ses ventes", en: "Grow your sales" },
    pitch: { fr: "Créez vos vidéos et contenus pour développer vos ventes.", en: "Create your videos and content to grow your sales." },
    cta: { fr: "Développer mon activité", en: "Grow my business" },
    price: { month: 89, year: 890 },
    featured: true,
    quotas: { visuals: 0, aiVideos: 0, ugc: 0, blog: 5 },
    themes: 3,
    librarySections: 12,
    themeEditing: "advanced",
    artDirections: 3,
    videos: "short",
    videoQuality: "fast",
    ugc: false,
    aiSections: false,
    pageModels: true,
    ads: "none",
    seo: "advanced",
    calendarDays: 30,
    postsPerDay: 3,
    autopublish: true,
    automation: "intermediate",
    campaigns: 0,
    adVariants: false,
    languages: 2,
    theme: "custom-sections",
    support: "priority",
    callPrice: 30,
    freeFirstCall: false,
    rollover: false,
    packDiscount: 0,
  },
  dominer: {
    id: "dominer",
    name: { fr: "Dominer", en: "Dominate" },
    tagline: { fr: "Le studio complet", en: "The complete studio" },
    pitch: { fr: "Automatisez votre marketing et exploitez toute la puissance du studio IA.", en: "Automate your marketing and use the full power of the AI studio." },
    cta: { fr: "Accéder au studio complet", en: "Get the complete studio" },
    price: { month: 129, year: 1290 },
    quotas: { visuals: 0, aiVideos: 0, ugc: 0, blog: 10 },
    themes: 5,
    librarySections: 20,
    themeEditing: "custom",
    artDirections: 5,
    videos: "advanced",
    videoQuality: "max",
    ugc: true,
    aiSections: true,
    pageModels: true,
    ads: "full",
    seo: "full",
    calendarDays: 90,
    postsPerDay: 5,
    autopublish: true,
    automation: "advanced",
    campaigns: Infinity,
    adVariants: true,
    languages: 5,
    theme: "fully-custom",
    support: "priority-call",
    callPrice: null,
    freeFirstCall: true,
    rollover: false,
    packDiscount: 0,
  },
};
/** Recharge IA : seul complément payant avec le rendez-vous, rattachée à un projet précis. */
export const TOPUP_PRICE_EUR = 10;
/** Un projet par abonnement, identique aux trois niveaux. Les anciens projets ne sont jamais supprimés. */
export const PROJECTS_PER_SUBSCRIPTION = 1;
export const PLAN_IDS = Object.keys(PLANS) as PlanId[];

/** Thèmes entièrement sur mesure par compte et par mois, forfait Dominer (garde-fou : chaque thème mobilise beaucoup d'IA). */
export const CUSTOM_THEMES_PER_MONTH = 2;

/** Découverte gratuite : studio de démonstration (exemples préexistants), aucun projet réel, aucun appel d'IA payant. */
export const DISCOVERY = {
  includes: ["analysis", "brand", "logos", "homePreview"] as const,
  /** Aucun projet réel. */
  perAccount: 0,
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
/**
 * Anciens packs : plus vendus depuis les forfaits V2 (seuls la recharge IA et le rendez-vous restent). Les soldes
 * déjà achetés restent honorés.
 */
export const PACKS_FOR_SALE: PackId[] = [];

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
  /** Utilisation de l'IA en % seulement : forfait du mois et crédits achetés (null s'il n'y en a pas) ; null sans forfait. */
  ai: { plan: { used: number }; credits: { used: number } | null; paused: boolean; pending?: boolean; /** Base des % de coût (jamais affichée). */ baseMicro?: number } | null;
  /** Derniers paiements (abonnement, packs). */
  history: { kind: "subscription" | "pack" | "topup"; label: string; amountEur: number; at: number }[];
};

/** Corps de POST /api/billing/checkout. Réponse : { url } (page de paiement Stripe). */
export type CheckoutBody =
  | { kind: "plan"; plan: PlanId; billing: Billing }
  | { kind: "pack"; pack: PackId }
  /** Forfaits V2 : nouvel abonnement (= un nouveau projet), réactivation d'un projet résilié, recharge IA d'un projet. */
  | { kind: "subscription"; plan: PlanId; billing: Billing }
  | { kind: "reactivate"; projectId: string; plan: PlanId; billing: Billing }
  | { kind: "topup"; projectId: string };

/** Code d'erreur (champ `code` des réponses API et des tâches) quand un quota est épuisé : l'écran propose le pack adapté. */
export const QUOTA_ERROR = "quota_exhausted";
