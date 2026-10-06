/** Modèle de données d'un projet (une boutique) : produit, marque, stratégie. */
import { z } from "zod";
import type { BrandPalette, DirectionId } from "./theme/directions";

export const SECTORS = [
  { id: "beaute", label: "Beauté & cosmétique", labelEn: "Beauty & cosmetics", kind: "products" },
  { id: "mode", label: "Mode & accessoires", labelEn: "Fashion & accessories", kind: "products" },
  { id: "bijoux", label: "Bijoux & montres", labelEn: "Jewelry & watches", kind: "products" },
  { id: "maison", label: "Maison & décoration", labelEn: "Home & decor", kind: "products" },
  { id: "hightech", label: "High-tech & gadgets", labelEn: "Tech & gadgets", kind: "products" },
  { id: "sport", label: "Sport & plein air", labelEn: "Sports & outdoors", kind: "products" },
  { id: "alimentation", label: "Alimentation & boissons", labelEn: "Food & drinks", kind: "products" },
  { id: "enfants", label: "Bébé & enfants", labelEn: "Baby & kids", kind: "products" },
  { id: "animaux", label: "Animaux", labelEn: "Pets", kind: "products" },
  { id: "artisanat", label: "Artisanat & papeterie", labelEn: "Crafts & stationery", kind: "products" },
  // Entreprises de services (project.business === "services").
  { id: "batiment", label: "Artisan & bâtiment", labelEn: "Trades & home improvement", kind: "services" },
  { id: "bienetre", label: "Beauté & bien-être (salon, institut)", labelEn: "Beauty & wellness (salon, spa)", kind: "services" },
  { id: "sante", label: "Santé & paramédical", labelEn: "Health & allied health", kind: "services" },
  { id: "coaching", label: "Sport & coaching", labelEn: "Fitness & coaching", kind: "services" },
  { id: "conseil", label: "Conseil, juridique & comptable", labelEn: "Consulting, legal & accounting", kind: "services" },
  { id: "restauration", label: "Restauration & traiteur", labelEn: "Restaurants & catering", kind: "services" },
  { id: "immobilier", label: "Immobilier", labelEn: "Real estate", kind: "services" },
  { id: "formation", label: "Formation & enseignement", labelEn: "Training & tutoring", kind: "services" },
  { id: "evenementiel", label: "Événementiel & photographie", labelEn: "Events & photography", kind: "services" },
  { id: "domicile", label: "Services à la personne", labelEn: "Home & personal care services", kind: "services" },
  { id: "agence", label: "Agence & services numériques", labelEn: "Agencies & digital services", kind: "services" },
] as const;
export type SectorId = (typeof SECTORS)[number]["id"];
/** Secteurs d'une boutique de produits / d'une entreprise de services. */
export type ProductSectorId = Extract<(typeof SECTORS)[number], { kind: "products" }>["id"];
export type ServiceSectorId = Extract<(typeof SECTORS)[number], { kind: "services" }>["id"];
export const SECTOR_IDS = SECTORS.map((s) => s.id) as [SectorId, ...SectorId[]];
export const PRODUCT_SECTOR_IDS = SECTORS.filter((s) => s.kind === "products").map((s) => s.id) as ProductSectorId[];
export const SERVICE_SECTOR_IDS = SECTORS.filter((s) => s.kind === "services").map((s) => s.id) as ServiceSectorId[];
/** Le secteur est-il celui d'une entreprise de services ? */
export const isServiceSector = (id?: string | null): id is ServiceSectorId => !!id && (SERVICE_SECTOR_IDS as string[]).includes(id);
/** Libellé du secteur dans la langue demandée (français par défaut). Fichier partagé navigateur/serveur : la langue est un paramètre. */
export const sectorLabel = (id?: string | null, lang: "fr" | "en" = "fr") => {
  const s = SECTORS.find((x) => x.id === id);
  return s ? (lang === "en" ? s.labelEn : s.label) : lang === "en" ? "Not determined" : "Non déterminé";
};

export const FactSchema = z.object({
  key: z.string(),
  label: z.string(),
  value: z.string(),
  status: z.enum(["confirmed", "inferred", "unknown"]),
  source: z.enum(["user", "photo", "link", "ai", "description"]),
});
export type Fact = z.infer<typeof FactSchema>;

export const QuestionSchema = z.object({
  id: z.string(),
  question: z.string(),
  why: z.string(),
  required: z.boolean(),
  factKey: z.string(),
  answer: z.string().optional(),
});
export type Question = z.infer<typeof QuestionSchema>;

export type ProductProfile = {
  name: string;
  nameStatus: "provided" | "detected" | "proposed" | "unknown";
  category: string;
  sector: SectorId | null;
  summary: string;
  facts: Fact[];
  visual: {
    colors: { hex: string; name: string; share: number }[];
    shape?: string;
    materials?: string[];
    labelText?: string[];
    hasLogo?: boolean;
    description?: string;
  };
  price: { amount: number | null; currency: string; status: "confirmed" | "unknown" };
  variants: { name: string; values: string[] }[];
  questions: Question[];
  claimsToAvoid: string[];
  sources: { type: "photo" | "link" | "description"; ref: string; summary: string }[];
  analyzedBy: "ai" | "local";
};

export type Brand = {
  name: string;
  nameStatus: "provided" | "proposed" | "validated";
  alternatives: string[];
  tagline: string;
  positioning: string;
  audience: string;
  personality: string[];
  tone: { voice: string; do: string[]; dont: string[] };
  palette: BrandPalette;
  fonts: { heading: string; body: string };
  logo: {
    assetId?: string;
    markAssetId?: string;
    concept: string;
    status: "proposed" | "validated" | "provided";
    /** Piste créative retenue (produit, concept, typo) ; anciennes propositions : logotype, symbole, emblème. */
    proposal?: "logotype" | "symbole" | "embleme" | "produit" | "concept" | "typo";
    /** Typographies et couleurs de la piste retenue (kit réseaux sociaux, charte, visuels). */
    route?: { key: string; name: string; heading: string; headingWeight: number; body: string; colors: { ink: string; accent: string; ground: string; tint: string }; roles?: { ink: keyof Brand["palette"]; accent: keyof Brand["palette"]; ground: keyof Brand["palette"]; tint: keyof Brand["palette"] }; source: "ai" | "local" };
  };
  /** Ligne éditoriale des réseaux sociaux (approche community manager). */
  social?: SocialVoice;
  /** Autres signatures proposées (au choix du client). */
  taglineAlternatives?: string[];
  /** Points que le contrôle qualité n'a pas pu corriger seul : à vérifier par le client (nom, signature, palette…). */
  checks?: string[];
  story: string;
  values: { title: string; text: string }[];
  direction: DirectionId;
  validated: string[];
  generatedBy: "ai" | "local";
};

export type SocialVoice = {
  pillars: { title: string; idea: string }[];
  say: string[];
  dontSay: string[];
  emoji: "none" | "sparing" | "free";
  emojis: string[];
  captions: { pillar: string; text: string }[];
  /** Séries récurrentes (rendez-vous hebdomadaires reconnaissables) : nom, idée, jour conseillé (0 = dimanche). */
  series?: { name: string; idea: string; weekday?: number }[];
  generatedBy: "ai" | "local";
};

export type Strategy = {
  audience: { label: string; needs: string[]; objections: string[] }[];
  angles: { title: string; idea: string }[];
  pillars: string[];
  keyMessages: string[];
  /** Plateforme de marque (stratège) : persona, problème, concurrence typique, preuves, objections et réponses. */
  platform?: BrandPlatform;
  generatedBy: "ai" | "local";
};

/**
 * Plateforme de marque, base de toute la rédaction : pour qui (persona), quel problème, face à quoi
 * (alternatives et codes de la concurrence typique), quelle différence crédible, quelles preuves
 * (disponibles ou manquantes : une preuve manquante n'est jamais affirmée), quelles objections et leurs réponses.
 */
export type BrandPlatform = {
  persona: string;
  problem: string;
  alternatives: string;
  difference: string;
  proofs: { claim: string; proof: string; status: "available" | "missing" }[];
  objections: { objection: string; answer: string }[];
};

/**
 * Nature du projet : une boutique qui vend des produits, ou le site d'une entreprise de services
 * (artisan, coach, salon, cabinet, agence, restaurant…). Pour les services, `product` décrit
 * l'activité (nom, résumé, secteur, faits confirmés) et `services` détaille l'offre.
 */
export type BusinessType = "products" | "services";
export type ServiceItem = { name: string; description: string; price?: string; duration?: string };
export type ServiceProfile = {
  /** Prestations proposées (texte fourni par le client ; prix et durées seulement s'il les donne). */
  services: ServiceItem[];
  /** Zone d'intervention ou adresse d'accueil. */
  area: string;
  address: string;
  phone: string;
  email: string;
  /** Horaires, en texte libre (« Lun–Ven 9 h–18 h »). */
  hours: string;
  /** Lien de prise de rendez-vous (Calendly, Planity, Doctolib…), facultatif. */
  bookingUrl: string;
  /** Façon de contacter PRINCIPALE (bouton principal du site) : appel, formulaire, rendez-vous en ligne, devis. */
  contactMode: ContactMode;
  /** Toutes les façons de contacter acceptées (la principale en premier). Absent sur les anciens projets. */
  contactModes?: ContactMode[];
};
export type ContactMode = "booking" | "quote" | "call" | "form";
export const CONTACT_MODES: ContactMode[] = ["booking", "quote", "call", "form"];
/** Façons de contacter d'un profil, la principale en premier, sans doublon. */
export function contactModesOf(s: Pick<ServiceProfile, "contactMode" | "contactModes"> | null | undefined): ContactMode[] {
  if (!s) return ["form"];
  return [...new Set([s.contactMode, ...(s.contactModes ?? [])])].filter((m): m is ContactMode => CONTACT_MODES.includes(m as ContactMode));
}
export const emptyServiceProfile = (): ServiceProfile => ({ services: [], area: "", address: "", phone: "", email: "", hours: "", bookingUrl: "", contactMode: "form" });

/** Type de boutique : un produit phare, un catalogue varié, ou une niche (plusieurs produits d'un même univers). */
export type StoreType = "mono" | "multi" | "niche";
export const STORE_TYPES: Record<StoreType, { label: string; hint: string; en: { label: string; hint: string } }> = {
  mono: { label: "Mono-produit", hint: "Un produit phare, toute la boutique raconte son histoire.", en: { label: "Single product", hint: "One hero product: the whole store tells its story." } },
  multi: { label: "Multi-produit", hint: "Un catalogue varié, organisé en collections.", en: { label: "Multi-product", hint: "A varied catalog, organized into collections." } },
  niche: { label: "Niche", hint: "Plusieurs produits d'un même univers, pour une communauté précise.", en: { label: "Niche", hint: "Several products from the same world, for a specific community." } },
};
/** Libellé et explication d'un type de boutique dans la langue demandée. */
export const storeTypeInfo = (t: StoreType, lang: "fr" | "en" = "fr") => (lang === "en" ? STORE_TYPES[t].en : { label: STORE_TYPES[t].label, hint: STORE_TYPES[t].hint });

/** Produit du catalogue (en plus du produit principal analysé en détail). */
export type CatalogItem = {
  key: string;
  name: string;
  category: string;
  price: number | null; // centimes
  compareAt: number | null;
  description: string;
  features: string[];
  /** Photo d'origine (rôle « catalog-original »). */
  originalAssetId: string | null;
  /** Provenance déclarée (fournisseur en marque blanche), affichée dans le studio seulement. */
  source?: { supplier: string; url: string; ref?: string };
};

export type ProjectSettings = {
  mode: "autopilot" | "guided";
  timezone: string;
  autopublish: { enabled: boolean; networks: string[]; requireApprovalFor: string[] };
  socialLinks?: Partial<Record<"instagram" | "tiktok" | "facebook" | "youtube" | "pinterest", string>>;
  /** Langue des contenus créés pour ce projet (boutique, images, vidéos, publications…). Français par défaut. */
  language?: "fr" | "en";
  /** « J'ai déjà mon site et mon logo » : résumé de la lecture du site du client (le détail est dans la mémoire, artefact « site_import »). */
  existingSite?: ExistingSiteSummary;
};

/** Résumé du site existant du client, affiché dans le studio (Pilote, Boutique, Marque). Tout vient du site lui-même. */
export type ExistingSiteSummary = {
  url: string;
  /** pending : lecture à venir ; read : site lu ; failed : lecture impossible (error). */
  status: "pending" | "read" | "failed";
  finalUrl?: string;
  /** Plateforme reconnue (shopify, wix, webflow, custom…) et son nom lisible. */
  platform?: string;
  platformLabel?: string;
  evidence?: string[];
  /** keep : site conservé tel quel ; reproduce : reproduit à l'identique sur la plateforme conseillée (target). */
  decision?: "keep" | "reproduce";
  target?: string;
  business?: BusinessType;
  name?: string;
  pages?: number;
  products?: number;
  images?: number;
  logoAssetId?: string;
  /** Logo envoyé par le client (sinon repris du site). */
  logoProvided?: boolean;
  colors?: string[];
  palette?: BrandPalette;
  fonts?: string[];
  warnings?: string[];
  /** Reproduction : ce qui est fidèle et ce qui est approché. */
  notes?: string[];
  readAt?: number;
  error?: string;
  /** Le client a demandé au studio de créer un nouveau site malgré tout. */
  newSiteRequested?: boolean;
};

export const emptyProduct = (): ProductProfile => ({
  name: "",
  nameStatus: "unknown",
  category: "",
  sector: null,
  summary: "",
  facts: [],
  visual: { colors: [] },
  price: { amount: null, currency: "EUR", status: "unknown" },
  variants: [],
  questions: [],
  claimsToAvoid: [],
  sources: [],
  analyzedBy: "local",
});
