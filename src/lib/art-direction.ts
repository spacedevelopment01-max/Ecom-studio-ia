/**
 * Direction artistique d'un projet : UNE signature visuelle partagée par les publications et les vidéos, déduite du
 * style de la marque (premium, franc, artisan, chaleureux) — comme une agence qui tient une ligne sur tout un fil.
 *  - publications : familles de modèles qui portent la marque, étalonnage signature des photos ;
 *  - vidéos : typographie des titres, élément graphique (filets fins, aplats francs, panneaux arrondis), façon de
 *    mettre un mot en valeur (soulignement ou surlignage), rythme des animations et des transitions, étalonnage.
 * Variété DANS la ligne : les compositions changent d'une création à l'autre, la signature reste.
 */
import type { AdArt, AdStyle, Treatment } from "./ads-v2/art";
import type { TemplateFamily } from "./ads-v2/library/types";

/** Étalonnage des images d'une vidéo (plans filmés et photos). */
export type VideoGrade = "punch" | "warm" | "cinematic" | "soft";

export type VideoLook = {
  /** Titres : police de la marque (casse normale), police d'affiche en capitales, ou bâton de texte franc (casse normale). */
  type: "brand" | "poster" | "sans";
  /** Élément graphique : filets fins et cadre, aplats francs et formes inclinées, panneaux arrondis. */
  motif: "rule" | "block" | "soft";
  /** Mot fort : souligné d'un filet ou surligné d'un aplat. */
  highlight: "underline" | "fill";
  /** Rythme : lent et posé, franc, doux. */
  motion: "slow" | "punchy" | "gentle";
  grade: VideoGrade;
};

export type ArtDirection = {
  style: AdStyle;
  /** Nom affiché au client. */
  name: [fr: string, en: string];
  /**
   * Étalonnage signature des photos des publications : deux lumières sœurs qui alternent (le fil garde une même
   * ambiance sans que deux publications voisines soient identiques), appliquées dès que le modèle le permet.
   */
  grades: [Treatment, Treatment];
  /** Familles de modèles de publications qui portent cette ligne (les autres ne sont pas choisies d'office). */
  families: TemplateFamily[];
  video: VideoLook;
};

const DIRECTIONS: Record<AdStyle, ArtDirection> = {
  premium: {
    style: "premium",
    name: ["Éditorial raffiné", "Refined editorial"],
    grades: ["warm", "moody"],
    families: ["lux", "frame", "type", "split"],
    video: { type: "brand", motif: "rule", highlight: "underline", motion: "slow", grade: "cinematic" },
  },
  bold: {
    style: "bold",
    name: ["Affiche franche", "Bold poster"],
    grades: ["punch", "cool"],
    families: ["promo", "photo", "split", "type"],
    video: { type: "poster", motif: "block", highlight: "fill", motion: "punchy", grade: "punch" },
  },
  craft: {
    style: "craft",
    name: ["Artisan authentique", "Authentic craft"],
    grades: ["natural", "warm"],
    families: ["split", "frame", "photo", "collage"],
    video: { type: "sans", motif: "soft", highlight: "fill", motion: "gentle", grade: "soft" },
  },
  warm: {
    style: "warm",
    name: ["Chaleureux et lumineux", "Warm and bright"],
    grades: ["warm", "natural"],
    families: ["photo", "collage", "split", "lux"],
    video: { type: "brand", motif: "soft", highlight: "fill", motion: "gentle", grade: "warm" },
  },
};

export function artDirection(art: Pick<AdArt, "style">): ArtDirection {
  return DIRECTIONS[art.style] ?? DIRECTIONS.warm;
}

/** Filtre ffmpeg d'étalonnage d'un plan filmé. */
export const GRADE_FFMPEG: Record<VideoGrade | "default", string> = {
  default: "eq=contrast=1.05:saturation=1.12",
  punch: "eq=contrast=1.1:saturation=1.22",
  warm: "eq=contrast=1.05:saturation=1.08,colorbalance=rs=0.06:gs=0.02:bs=-0.06:rm=0.03:bm=-0.03",
  cinematic: "eq=contrast=1.08:saturation=0.9:brightness=-0.02,colorbalance=rs=0.04:bs=-0.03:rh=-0.02:bh=0.03",
  soft: "eq=contrast=1.03:saturation=1.04:brightness=0.02",
};

/** Même étalonnage pour les photos animées (filtre de canevas). */
export const GRADE_CANVAS: Record<VideoGrade, string> = {
  punch: "contrast(1.1) saturate(1.22)",
  warm: "sepia(0.16) saturate(1.1) contrast(1.05)",
  cinematic: "contrast(1.08) saturate(0.9) brightness(0.98)",
  soft: "brightness(1.02) saturate(1.04) contrast(1.03)",
};
