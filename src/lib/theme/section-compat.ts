/**
 * Catalogue technique commun → sections réellement proposables pour un thème installé et une catégorie de projet
 * (section-fit.ts). Point d'entrée serveur unique pour la galerie « Sections », l'ajout manuel, les commandes locales,
 * les consignes données à l'IA et les opérations serveur : tous lisent la même liste.
 */
import { availableSectionTypes, type ThemeSpec } from "./spec";
import { fitContextOf, sectionFitReason, sectionFits } from "./section-fit";
import type { StoreKind } from "./store-kind";

/** Types de sections compatibles avec le thème installé et la catégorie du projet (thème importé : ses propres sections). */
export function compatibleSectionTypes(spec: ThemeSpec, kind?: StoreKind | null): string[] {
  const all = availableSectionTypes(spec);
  if (spec.imported) return all;
  const ctx = fitContextOf(spec, kind);
  return all.filter((t) => sectionFits(t, ctx));
}

/** Motif d'incompatibilité d'un type pour ce thème et cette catégorie (vide si compatible ; thème importé : jamais filtré). */
export function sectionIncompatibility(spec: Pick<ThemeSpec, "direction" | "settings" | "imported">, type: string, kind?: StoreKind | null, lang: "fr" | "en" = "fr"): string {
  if (spec.imported || type.startsWith("es-custom-")) return "";
  return sectionFitReason(type, fitContextOf(spec, kind), lang);
}
