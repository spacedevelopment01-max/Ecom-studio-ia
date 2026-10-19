/**
 * Catalogue technique commun → sections réellement proposables pour un thème installé et une catégorie de projet
 * (section-fit.ts). Point d'entrée serveur unique pour la galerie « Sections », l'ajout manuel, les commandes locales,
 * les consignes données à l'IA et les opérations serveur : tous lisent la même liste.
 */
import { availableSectionTypes, type ThemeSpec } from "./spec";
import { fitContextOf, sectionFitReason, sectionFits } from "./section-fit";
import type { StoreKind } from "./store-kind";
import { familyOf, familyTypes, isStructuralType, FAMILY_LABEL } from "./section-families";

/** Types de sections compatibles avec le thème installé et la catégorie du projet (thème importé : ses propres sections). */
export function compatibleSectionTypes(spec: ThemeSpec, kind?: StoreKind | null): string[] {
  const all = availableSectionTypes(spec);
  if (spec.imported) return all;
  const ctx = fitContextOf(spec, kind);
  // Bibliothèque de la famille du projet (issue #141) : 20 fonctions, leurs dispositions et rien d'autre ; les
  // anciennes sections restent rendues pour les projets enregistrés, mais ne sont plus proposées.
  const family = familyOf(kind, spec.direction);
  const own = family ? familyTypes(family) : null;
  return all.filter((t) => sectionFits(t, ctx) && (!own || own.has(t) || isStructuralType(t) || t.startsWith("es-custom-")));
}

/** Motif d'incompatibilité d'un type pour ce thème et cette catégorie (vide si compatible ; thème importé : jamais filtré). */
export function sectionIncompatibility(spec: Pick<ThemeSpec, "direction" | "settings" | "imported">, type: string, kind?: StoreKind | null, lang: "fr" | "en" = "fr"): string {
  if (spec.imported || type.startsWith("es-custom-")) return "";
  const fit = sectionFitReason(type, fitContextOf(spec, kind), lang);
  if (fit) return fit;
  // Catégorie connue : seule la bibliothèque de sa famille est proposable (galerie, IA, commandes, opérations serveur).
  if (kind && !isStructuralType(type) && !familyTypes(kind).has(type)) {
    const f = FAMILY_LABEL[kind];
    return lang === "en" ? `Section outside the ${f.en} library of this project.` : `Section hors de la bibliothèque « ${f.fr} » de ce projet.`;
  }
  return "";
}
