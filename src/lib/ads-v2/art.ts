/**
 * Direction artistique des publicités (Ads V2) : une famille de mises en page, des typographies de marque traitées en
 * titres d'affiche (graisse, interlignage serré, lignes équilibrées) et un bouton propres à CHAQUE projet. Les
 * créations d'une campagne alternent des compositions réellement différentes (éditorial, affiche, panneau de marque,
 * bandeau franc, cadre sombre), et deux projets n'ont pas la même rotation.
 */
import crypto from "node:crypto";
import { CANVAS_FONTS } from "../media/fonts";
import type { Typo } from "../media/compose";
import type { Project } from "../projects";

export const AD_LAYOUTS = ["editorial", "poster", "panel", "band", "frame", "typographic", "lower", "corner", "capsule", "tilt", "bigtype", "detail", "glass"] as const;
export type AdLayout = (typeof AD_LAYOUTS)[number];

/** Anciennes mises en page (créations et tests existants) → composition actuelle la plus proche. */
const LEGACY: Record<string, AdLayout> = { hero_left: "editorial", full_bleed: "editorial", hero_center: "poster", split: "panel" };
export const toAdLayout = (l: string): AdLayout => LEGACY[l] ?? ((AD_LAYOUTS as readonly string[]).includes(l) ? (l as AdLayout) : "editorial");

export type AdStyle = "premium" | "bold" | "craft" | "warm";

export type AdArt = {
  style: AdStyle;
  heading: string;
  headingWeight: number;
  body: string;
  /** Police lourde des bandeaux francs (titre très gras). */
  display: string;
  displayWeight: number;
  uppercase: boolean;
  /** Bouton : pilule (produits, marques grand public) ou rectangle adouci (services, marques sobres). */
  cta: "pill" | "rounded";
  arrow: boolean;
  /** Ordre des compositions de la campagne (création 1, 2, 3…). */
  cycle: AdLayout[];
};

/**
 * Rotation des compositions : les compositions « graphiques » (photo en capsule, carte inclinée et pastille, titre
 * géant sur photo bichromie, loupe sur le détail, carte en verre dépoli) alternent avec les compositions photo, pour
 * que deux créations qui se suivent ne se ressemblent jamais.
 */
const CYCLES: Record<AdStyle, AdLayout[]> = {
  premium: ["editorial", "capsule", "glass", "corner", "detail", "poster", "panel", "lower", "frame"],
  bold: ["bigtype", "tilt", "poster", "detail", "lower", "glass", "frame", "editorial"],
  craft: ["panel", "detail", "glass", "lower", "capsule", "frame", "editorial", "tilt"],
  warm: ["tilt", "editorial", "capsule", "detail", "panel", "lower", "glass", "poster", "corner"],
};

/**
 * Traitements de la photo (étalonnage d'affiche) : la photo est TRAVAILLÉE, pas simplement posée.
 *  - natural : telle quelle ; punch : contraste et couleurs relevés ; warm : chaude et dorée ; cool : fraîche ;
 *  - mono : noir et blanc contrasté ; moody : assombrie, vignette ; duotone : bichromie aux couleurs de la marque.
 */
export const TREATMENTS = ["natural", "punch", "warm", "cool", "mono", "moody", "duotone"] as const;
export type Treatment = (typeof TREATMENTS)[number];
export const TREATMENT_FILTER: Record<Treatment, string | null> = {
  natural: null,
  punch: "contrast(1.12) saturate(1.22)",
  warm: "sepia(0.22) saturate(1.18) contrast(1.06)",
  cool: "hue-rotate(-10deg) saturate(1.08) contrast(1.1) brightness(0.98)",
  mono: "grayscale(1) contrast(1.18)",
  moody: "brightness(0.84) contrast(1.16) saturate(0.92)",
  duotone: "contrast(1.1)",
};
/** Traitements qui vont bien avec une composition et un style (le premier sert par défaut). */
export function treatmentsFor(layout: AdLayout, style: AdStyle): Treatment[] {
  if (layout === "bigtype") return ["duotone", "mono", "moody"];
  if (layout === "glass" || layout === "capsule" || layout === "tilt") return style === "bold" ? ["punch", "natural", "cool"] : ["natural", "warm", "punch"];
  if (layout === "frame") return ["moody", "mono", "cool"];
  if (style === "premium") return ["warm", "natural", "moody", "mono"];
  if (style === "bold") return ["punch", "cool", "moody", "duotone"];
  if (style === "craft") return ["natural", "punch", "warm", "cool"];
  return ["warm", "punch", "natural", "cool"];
}

/** Placement du logo : dans la colonne de texte, au coin opposé, ou en signature au pied de la création. */
export type LogoPlacement = "column" | "corner" | "foot";
export type AdVariant = { treatment?: Treatment; logo?: LogoPlacement; scheme?: string };

const fold = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Graisse disponible la plus proche de celle voulue (jamais une graisse absente : rendu identique partout). */
export function nearestWeight(family: string, want: number): number {
  const def = CANVAS_FONTS[family];
  if (!def) return want;
  return Object.keys(def.file).map(Number).sort((a, b) => Math.abs(a - want) - Math.abs(b - want))[0] ?? want;
}

const kindOf = (family: string) => CANVAS_FONTS[family]?.kind ?? "sans";

export function adArt(p: Project, typo: Typo): AdArt {
  const b = p.brand;
  const text = fold([...(b?.personality ?? []), b?.positioning ?? "", b?.tone?.voice ?? "", p.product.category ?? "", p.product.sector ?? ""].join(" "));
  const services = p.business === "services";
  const serif = kindOf(typo.heading) === "serif";
  const heavy = (typo.headingWeight ?? 500) >= 700 || kindOf(typo.heading) === "display";
  const premium = /premium|luxe|haut de gamme|raffine|elegan|prestige|precieu|sobre|intemporel/.test(text);
  const energetic = /dynamique|energi|audacieu|fun|sport|tech|nettoyage|jeune|ludique|pop|vif/.test(text);
  const style: AdStyle = premium || (serif && !heavy && !energetic) ? "premium" : heavy || energetic ? "bold" : services ? "craft" : "warm";
  // Titres d'affiche : graisse franche (le titre se lit d'un coup d'œil sur téléphone), même famille que la marque.
  const headingWeight = nearestWeight(typo.heading, Math.max(typo.headingWeight ?? 500, serif ? 600 : 700));
  // Police d'affiche : celle de la marque si elle est franche ; sinon une capitale condensée (Anton) pour les marques
  // énergiques, Archivo ailleurs.
  const display = kindOf(typo.heading) === "display" || (!serif && nearestWeight(typo.heading, 800) >= 700) ? typo.heading : kindOf(typo.body) === "display" ? typo.body : style === "bold" ? "Anton" : "Archivo";
  // Rotation propre au projet : deux marques du même style ne commencent pas par la même composition.
  const cycle = CYCLES[style];
  const seed = parseInt(crypto.createHash("sha256").update(p.id).digest("hex").slice(0, 6), 16) % cycle.length;
  return {
    style,
    heading: typo.heading,
    headingWeight,
    body: typo.body,
    display,
    displayWeight: nearestWeight(display, 800),
    uppercase: !!typo.uppercase,
    cta: services || style === "premium" || style === "craft" ? "rounded" : "pill",
    arrow: style !== "bold",
    cycle: [...cycle.slice(seed), ...cycle.slice(0, seed)],
  };
}

/** Composition de la création n° k de la campagne (une image : jamais « typographique » ; sans image : typographique). */
export const layoutForConcept = (art: AdArt, k: number): AdLayout => art.cycle[k % art.cycle.length];

/**
 * Zone de l'image à garder calme pour le texte, selon la composition et le format : la génération d'image et la
 * composition s'accordent (le texte ne tombe jamais sur le sujet).
 */
export function textZoneFor(layout: AdLayout, width: number, height: number): "none" | "left" | "top" {
  const land = width / height >= 1.4;
  const square = !land && width / height > 0.9;
  if (layout === "panel" || layout === "typographic" || layout === "capsule" || layout === "tilt") return "none";
  if (layout === "bigtype") return "top";
  if (layout === "detail" || layout === "glass") return land || square ? "left" : "top";
  if (layout === "lower") return "top"; // le sujet reste en haut, le texte en bas (zone à garder « calme » : le bas)
  if (layout === "corner") return land || square ? "left" : "top";
  if (layout === "editorial" || layout === "frame") return land || square ? "left" : "top";
  return land ? "left" : "top";
}
