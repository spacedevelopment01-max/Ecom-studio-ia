import type { AdStyle, Treatment } from "../art";
import type { Kit, Scheme } from "./kit";

/** Familles de modèles (galerie du studio, choix sans répétition). */
export const TEMPLATE_FAMILIES = ["photo", "split", "frame", "collage", "type", "promo", "lux"] as const;
export type TemplateFamily = (typeof TEMPLATE_FAMILIES)[number];

/**
 * Modèle de la bibliothèque : une composition complète, refaite pour chaque format par sa fonction `build`
 * (paysage, carré, portrait, story), déclinable en schémas de couleurs et traitements de photo.
 */
export type Template = {
  /** Identifiant court et stable (enregistré dans les créations : ne jamais renommer). */
  id: string;
  name: [fr: string, en: string];
  family: TemplateFamily;
  /** « required » : besoin d'une photo ; « none » : composition sans photo ; « optional » : les deux. */
  photo: "required" | "optional" | "none";
  /** Styles de marque auxquels il convient le mieux (vide : tous). */
  styles?: AdStyle[];
  /** Schémas de couleurs possibles (le premier par défaut). */
  schemes: Scheme[];
  /** Traitements de photo possibles (le premier par défaut). */
  treatments?: Treatment[];
  /** Modèle « produit » : met en scène le produit détouré (préféré dès qu'un détourage existe). */
  product?: boolean;
  build: (k: Kit) => void;
};
