/**
 * Catalogue technique commun → sections réellement proposables pour un thème installé et un projet (section-fit.ts).
 * Point d'entrée serveur unique pour la galerie « Sections », l'ajout manuel, les commandes locales, les consignes
 * données à l'IA et les opérations serveur : tous lisent la même liste.
 *
 * Mission #190 : plus de familles. Sont proposables les sections de la bibliothèque commune (toutes ses fonctions, quelle
 * que soit l'ancienne famille) que le thème sait rendre, plus les sections propres au thème (dessinées d'après ses
 * maquettes). Seules restent les vraies incompatibilités : section propre à un autre thème, style d'un autre profil
 * graphique, ou vente de produits sur un site de prestations sans produits.
 */
import { availableSectionTypes, type ThemeSpec } from "./spec";
import { fitContextOf, sectionFitReason, sectionFits } from "./section-fit";
import type { StoreKind } from "./store-kind";
import { isStructuralType, libraryTypes } from "./section-families";
import { isOwnSectionOf } from "./theme-own-sections";
import { isReferenceThemeId } from "./theme-fit";

const proposable = (direction: string, type: string) => libraryTypes().has(type) || isOwnSectionOf(direction, type) || isStructuralType(type) || type.startsWith("es-custom-");

/** Types de sections compatibles avec le thème installé et le projet (thème importé : ses propres sections). */
export function compatibleSectionTypes(spec: ThemeSpec, kind?: StoreKind | null): string[] {
  const all = availableSectionTypes(spec);
  if (spec.imported) return all;
  const ctx = fitContextOf(spec, kind);
  // Les anciennes sections restent rendues pour les projets enregistrés, mais ne sont plus proposées. Ancien thème
  // (hors thèmes de référence) d'un projet sans catégorie connue : lecture inchangée, rien n'est filtré par bibliothèque.
  const filter = !!kind || isReferenceThemeId(spec.direction);
  return all.filter((t) => sectionFits(t, ctx) && (!filter || proposable(spec.direction, t)));
}

/** Motif d'incompatibilité d'un type pour ce thème et ce projet (vide si compatible ; thème importé : jamais filtré). */
export function sectionIncompatibility(spec: Pick<ThemeSpec, "direction" | "settings" | "imported">, type: string, kind?: StoreKind | null, lang: "fr" | "en" = "fr"): string {
  if (spec.imported || type.startsWith("es-custom-")) return "";
  const fit = sectionFitReason(type, fitContextOf(spec, kind), lang);
  if (fit) return fit;
  // Projet connu : seules la bibliothèque commune et les sections propres au thème sont proposables.
  if (kind && !proposable(spec.direction, type)) return lang === "en" ? "Section outside the section library." : "Section hors de la bibliothèque de sections.";
  return "";
}
