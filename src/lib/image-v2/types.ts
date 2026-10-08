/**
 * Image & Search Engine V2 (phase 5A) — types partagés.
 *
 * PROJECT BRAIN → VISUAL INTENT → ART DIRECTION → SEARCH OR GENERATION → QUALITY GATE → SELECTION → ASSET LIBRARY → REUSE
 *
 * Un seul moteur pour tous les onglets (boutique, pages produits et services, publicités, réseaux sociaux, blog,
 * vidéos, bannières, galeries, contenus de marque) : chaque module donne un brief spécialisé, les règles de sélection,
 * de qualité, de provenance et de réutilisation sont les mêmes.
 */
import type { Verdict } from "../quality/gate";

/** Intention visuelle : ce qu'il faut produire (et donc quelle partie de la chaîne est utile). */
export const VISUAL_KINDS = [
  "stock_photo", // photographie existante (banque d'images), sans métier particulier
  "trade_photo", // photographie du métier (entreprise de services)
  "product_image", // image du produit réel
  "packshot", // produit seul, fond propre
  "lifestyle", // produit en situation de vie
  "usage_scene", // scène d'utilisation (geste)
  "ambiance", // univers, ambiance (sans le produit)
  "banner", // bannière large de site
  "ad_image", // image publicitaire
  "retouch", // retouche d'une image existante
  "cutout", // détourage
  "variation", // déclinaison d'une image existante
  "site_image", // image d'une section de site
  "social_image", // image d'une publication
] as const;
export type VisualKind = (typeof VISUAL_KINDS)[number];

/** Support final de l'image (décide du format, de la zone de texte et du cadrage). */
export type Support = "site" | "product_page" | "service_page" | "social" | "ad" | "blog" | "video" | "banner" | "gallery" | "brand";

/** Directions artistiques possibles : choisies selon la marque, le public, le produit et le support, jamais imposées. */
export const ART_DIRECTIONS = [
  "minimal_studio",
  "premium_photo",
  "natural_lifestyle",
  "editorial",
  "architectural",
  "product_demo",
  "tech_universe",
  "warm_universe",
  "premium_ad",
  "graphic",
  "documentary_trade", // reportage sur le métier : gestes, outils, chantier réel
] as const;
export type ArtDirectionId = (typeof ART_DIRECTIONS)[number];

export type AspectId = "1:1" | "4:5" | "2:3" | "3:2" | "9:16" | "16:9" | "3:1" | "4:1";

export type FormatSpec = { aspect: AspectId; width: number; height: number; label: string; textZone: "none" | "left" | "right" | "top" | "bottom" | "center" };

/** Brief visuel structuré : construit localement quand l'information suffit, réutilisé par les fournisseurs et le contrôle. */
export type VisualBrief = {
  version: string;
  kind: VisualKind;
  support: Support;
  /** Ce qui doit se voir (sujet principal). */
  subject: string;
  /** Geste ou action (métier : le travail en train de se faire). */
  action: string | null;
  environment: string | null;
  purpose: string;
  audience: string | null;
  artDirection: ArtDirectionId;
  composition: string;
  lighting: string;
  framing: string;
  palette: string[];
  format: FormatSpec;
  /** Concepts qui DOIVENT se reconnaître (au moins un) : métier, geste, produit. */
  positive: string[];
  /** Mots dont l'un doit figurer dans la description d'une photo de banque pour qu'elle soit retenue sans contrôle visuel. */
  must: string[];
  /** Requêtes de recherche : MÉTIER + ACTION + ENVIRONNEMENT + INTENTION (anglais, vocabulaire des banques). */
  queries: string[];
  /** Concepts hors sujet (servent au classement et au contrôle : pas collés dans les requêtes). */
  negative: string[];
  /** Contraintes factuelles : ce qui ne s'invente pas (produit réel, aucun avis ni chiffre). */
  facts: string[];
  /** Images de référence (détourage du produit, photo du client). */
  references: string[];
  /** Le produit réel doit-il être reconnaissable et fidèle ? */
  productFidelity: boolean;
  /** Note visée par la barrière (seuil FINAL de la politique). */
  expectedQuality: number;
  /** Axe de diversité dans une série (angle, lieu, lumière, intention). */
  variant: { index: number; angle: string; setting: string; light: string; intent: string } | null;
  /** D'où vient la compréhension : métier (services), catégorie produit, ou repli générique. */
  understanding: { source: "trade" | "product" | "generic"; id: string; confidence: "high" | "medium" | "low" };
};

/** Licence et provenance d'une image de banque : jamais « libre de droits » sans vérification. */
export type LicenseInfo = {
  name: string;
  url: string | null;
  /** Comment la licence a été établie : conditions de la plateforme pour TOUT son contenu, licence du résultat, ou rien. */
  verifiedBy: "platform_terms" | "result_license" | "unverified";
  commercialUse: boolean | null;
  attributionRequired: boolean | null;
  restrictions: string[];
};

export type StockCandidate = {
  source: string;
  id: string;
  url: string;
  page: string;
  author: string;
  width: number;
  height: number;
  /** Description de la banque (titre, mots-clés) : seule base du classement gratuit. */
  alt: string;
  license: LicenseInfo;
  query: string;
};

export type RankedCandidate = StockCandidate & { relevance: number; reasons: string[] };

/** Défauts que la barrière sait reconnaître (codes stables). */
export type ImageCode =
  | "off_topic"
  | "wrong_product"
  | "product_altered"
  | "deformed"
  | "text_in_image"
  | "artifacts"
  | "low_resolution"
  | "bad_crop"
  | "weak_aesthetics"
  | "brand_mismatch"
  | "brief_mismatch"
  | "duplicate"
  | "license_unverified"
  | "corrupt"
  | "forbidden";

export const IMAGE_CRITERIA = ["relevance", "fidelity", "aesthetics", "composition", "realism", "brand", "brief", "support", "artifacts", "commercial"] as const;
export type ImageCriterion = (typeof IMAGE_CRITERIA)[number];

/** Correction ciblée proposée par le contrôle. */
export type FixTarget = "lighting" | "composition" | "background" | "crop" | "product" | "direction" | "none";

export type ImageReview = {
  criteria: Record<ImageCriterion, number>;
  /** Ce que l'image montre réellement (une phrase) : sert au diagnostic, jamais au client. */
  shows: string;
  offTopic: boolean;
  productAltered: boolean;
  wrongProduct: boolean;
  textInImage: boolean;
  deformed: boolean;
  artifacts: boolean;
  issues: string[];
  fix: { target: FixTarget; instruction: string };
};

export type ImageOutcome = {
  briefHash: string;
  verdict: Verdict;
  score: number | null;
  codes: string[];
  reason: string;
  origin: "stock" | "generated" | "reused" | "none";
  assetId: string | null;
  attempts: number;
  candidateKey: string | null;
};
