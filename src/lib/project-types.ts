/** Modèle de données d'un projet (une boutique) : produit, marque, stratégie. */
import { z } from "zod";
import type { BrandPalette, DirectionId } from "./theme/directions";

export const SECTORS = [
  { id: "beaute", label: "Beauté & cosmétique" },
  { id: "mode", label: "Mode & accessoires" },
  { id: "bijoux", label: "Bijoux & montres" },
  { id: "maison", label: "Maison & décoration" },
  { id: "hightech", label: "High-tech & gadgets" },
  { id: "sport", label: "Sport & plein air" },
  { id: "alimentation", label: "Alimentation & boissons" },
  { id: "enfants", label: "Bébé & enfants" },
  { id: "animaux", label: "Animaux" },
  { id: "artisanat", label: "Artisanat & papeterie" },
] as const;
export type SectorId = (typeof SECTORS)[number]["id"];
export const SECTOR_IDS = SECTORS.map((s) => s.id) as [SectorId, ...SectorId[]];
export const sectorLabel = (id?: string | null) => SECTORS.find((s) => s.id === id)?.label ?? "Non déterminé";

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
  logo: { assetId?: string; markAssetId?: string; concept: string; status: "proposed" | "validated" | "provided"; proposal?: "logotype" | "symbole" | "embleme" };
  /** Autres signatures proposées (au choix du client). */
  taglineAlternatives?: string[];
  story: string;
  values: { title: string; text: string }[];
  direction: DirectionId;
  validated: string[];
  generatedBy: "ai" | "local";
};

export type Strategy = {
  audience: { label: string; needs: string[]; objections: string[] }[];
  angles: { title: string; idea: string }[];
  pillars: string[];
  keyMessages: string[];
  generatedBy: "ai" | "local";
};

/** Type de boutique : un produit phare, un catalogue varié, ou une niche (plusieurs produits d'un même univers). */
export type StoreType = "mono" | "multi" | "niche";
export const STORE_TYPES: Record<StoreType, { label: string; hint: string }> = {
  mono: { label: "Mono-produit", hint: "Un produit phare, toute la boutique raconte son histoire." },
  multi: { label: "Multi-produit", hint: "Un catalogue varié, organisé en collections." },
  niche: { label: "Niche", hint: "Plusieurs produits d'un même univers, pour une communauté précise." },
};

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
