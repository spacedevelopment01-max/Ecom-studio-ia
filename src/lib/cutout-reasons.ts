/**
 * Raisons de refus d'un détourage et genres de photos (tri avant détourage), en codes stables traduits à
 * l'affichage. Ce module ne dépend ni de Next ni de la base : utilisable côté serveur, worker et navigateur.
 */
import type { Lang } from "./i18n";

export const CUTOUT_REASONS = {
  // Règles locales (mesures sur le masque du détourage).
  empty: { fr: "aucun produit isolé", en: "no product isolated" },
  too_small: { fr: "produit presque absent du détourage", en: "product almost missing from the cutout" },
  too_large: { fr: "le fond est resté presque entier", en: "almost all of the background was kept" },
  fragments: { fr: "morceaux épars (texte, fond ou décor découpés)", en: "scattered pieces (text, background or props cut out)" },
  cut_by_frame: { fr: "produit coupé par le bord de la photo ou personne gardée", en: "product cut by the photo's edge or a person kept" },
  ragged: { fr: "contour flou ou incertain", en: "blurry or uncertain outline" },
  hole: { fr: "partie du produit retirée (trou)", en: "part of the product removed (hole)" },
  // Contrôle visuel par l'IA.
  product_cut: { fr: "produit incomplet ou coupé", en: "product incomplete or cut off" },
  background_left: { fr: "morceaux de fond restants", en: "pieces of background left" },
  person_left: { fr: "morceaux de personne restants (main, bras, cou…)", en: "parts of a person left (hand, arm, neck…)" },
  missing_parts: { fr: "parties du produit retirées", en: "parts of the product removed" },
  wrong_object: { fr: "ce n'est pas le produit qui a été isolé", en: "the isolated object is not the product" },
  other_objects: { fr: "autres objets gardés avec le produit", en: "other objects kept with the product" },
  text_left: { fr: "texte publicitaire gardé", en: "advertising text kept" },
  blurry: { fr: "image floue ou trop petite", en: "blurry or too small image" },
  // Décisions.
  not_packshot: { fr: "photo source qui n'est pas une photo du produit seul", en: "source photo is not a photo of the product alone" },
  user: { fr: "écarté par vous", en: "set aside by you" },
} as const satisfies Record<string, { fr: string; en: string }>;

export type CutoutReason = keyof typeof CUTOUT_REASONS;
export const isCutoutReason = (s: unknown): s is CutoutReason => typeof s === "string" && s in CUTOUT_REASONS;

export function cutoutReasonText(code: string, lang: Lang): string {
  return isCutoutReason(code) ? CUTOUT_REASONS[code][lang] : code;
}

/** Genre d'une photo du produit, établi avant tout détourage. */
export type PhotoKind = "packshot" | "situation" | "text" | "other" | "busy";

export const PHOTO_KINDS: Record<PhotoKind, { fr: string; en: string }> = {
  packshot: { fr: "Produit seul sur fond uni", en: "Product alone on a plain background" },
  situation: { fr: "Photo en situation", en: "Lifestyle photo" },
  text: { fr: "Visuel avec texte : non utilisé", en: "Visual with text: not used" },
  other: { fr: "Autre visuel : non utilisé", en: "Other visual: not used" },
  busy: { fr: "Fond chargé : non détourée", en: "Busy background: not cut out" },
};

/** Contrôle d'un détourage enregistré dans `meta.quality` de l'asset. */
export type CutoutQuality = {
  verdict: "ok" | "rejected" | "user";
  reasons: string[];
  /** Note sur 10 (règles locales, puis contrôle visuel quand il a eu lieu). */
  score: number;
  /** Qui a décidé : règles locales seules, ou règles locales puis contrôle visuel par l'IA. */
  by: "local" | "ai";
  /** Remarque libre du contrôle visuel (langue de l'interface au moment du contrôle). */
  note?: string;
  checkedAt: number;
};
