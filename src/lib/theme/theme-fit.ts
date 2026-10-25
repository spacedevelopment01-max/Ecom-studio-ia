/**
 * Catalogue actif et compatibilité explicite entre les thèmes et les trois catégories de projet (store-kind.ts).
 *
 * Consigne du 19 octobre (issue #137, commentaire 6264783184) : seuls les quatre thèmes de référence sont proposés —
 * FRAISE et ONDE → boutique spécialisée ; ORBE → e-commerce ; Atelier Rive → prestations de services. Les trente
 * anciens thèmes sont RETIRÉS du catalogue actif : plus jamais sélectionnables, recommandés ni prévisualisés pour un
 * nouveau choix. Leurs définitions restent dans le code uniquement pour la compatibilité de lecture des projets
 * existants (rendu, retouches, versions) : un projet qui en utilise un le conserve, sans migration silencieuse.
 * Aucun cinquième thème n'est inventé et aucun repli vers l'ancien catalogue n'existe : une catégorie se voit proposer
 * exactement ses thèmes actifs.
 *
 * Module sans dépendance serveur (lu par l'interface).
 */
import type { StoreKind } from "./store-kind";

/** Thèmes de référence (issue #137) : compatibilités déclarées, jamais déduites du nom. */
export const REFERENCE_THEMES = ["fraise", "onde", "orbe", "rive", "sillon", "noctil", "traverse", "heuren", "alcove", "museau-club", "souple", "table-saison", "atelier-nuance", "parenthese", "phase"] as const;
export type ReferenceThemeId = (typeof REFERENCE_THEMES)[number];

const REFERENCE_FIT: Record<ReferenceThemeId, StoreKind[]> = {
  fraise: ["specialty"],
  onde: ["catalog"],
  orbe: ["catalog"],
  rive: ["services"],
  // Issue #148 : troisième thème « boutique spécialisée » (machine à espresso nomade).
  sillon: ["specialty"],
  // Issue #152 : quatrième et cinquième thèmes « boutique spécialisée » (projecteur de galaxies, sac de voyage modulable).
  noctil: ["specialty"],
  traverse: ["specialty"],
  // Issue #155 : deux thèmes mono-produit de la famille E-commerce (montre, fauteuil), jamais « boutique spécialisée ».
  heuren: ["catalog"],
  alcove: ["catalog"],
  // Issue #158 : collection de quatre produits pour chiens, boutique spécialisée (décision du 21 octobre).
  "museau-club": ["specialty"],
  // Issue #158 : collection de quatre produits (tapis, brique, sangle, anneau), famille E-commerce.
  souple: ["catalog"],
  // Issue #175 : thème restaurant de la famille Services (réservation de table).
  "table-saison": ["services"],
  // Issue #177 : salon de coiffure de la famille Services (prise de rendez-vous).
  "atelier-nuance": ["services"],
  // Mission PARENTHÈSE (PR #179) : cabinet de sophrologie de la famille Services (séances, ateliers, réservation).
  parenthese: ["services"],
  // PHASE — Électricité (25 octobre 2026, PR documentaire #188) : artisan électricien de la famille Services.
  phase: ["services"],
};

export const isReferenceThemeId = (id: string): id is ReferenceThemeId => (REFERENCE_THEMES as readonly string[]).includes(id);

/** Catalogue actif : exactement les quatre thèmes de référence (même liste, nommée pour ce qu'elle décide). */
export const ACTIVE_THEMES = REFERENCE_THEMES;
export type ActiveThemeId = ReferenceThemeId;
export const isActiveThemeId = (id: string): id is ActiveThemeId => isReferenceThemeId(id);

/** Statut d'un identifiant de thème : actif (proposé), retiré (ancien catalogue, lecture seule) ou inconnu. */
export function themeStatus(id: string, known: boolean): "active" | "retired" | "unknown" {
  return isActiveThemeId(id) ? "active" : known ? "retired" : "unknown";
}

/** Motif lisible pour un thème retiré du catalogue (ancien catalogue, conservé seulement pour les projets qui l'utilisent). */
export function retiredThemeReason(lang: "fr" | "en" = "fr"): string {
  return lang === "en"
    ? "This theme was withdrawn from the catalogue (19 October): it is kept only for the projects already using it and cannot be chosen for a new selection."
    : "Ce thème a été retiré du catalogue (19 octobre) : il n'est conservé que pour les projets qui l'utilisent déjà et ne peut plus être choisi.";
}

/** Catégories servies par un thème actif ; un thème retiré ou inconnu n'en sert aucune (jamais de repli vers l'ancien catalogue). */
export function themeKinds(id: string): StoreKind[] {
  return isReferenceThemeId(id) ? REFERENCE_FIT[id] : [];
}

export const themeFits = (id: string, kind: StoreKind) => themeKinds(id).includes(kind);

/** Motif lisible d'incompatibilité (vide si compatible). */
export function themeFitReason(id: string, kind: StoreKind, lang: "fr" | "en" = "fr"): string {
  if (themeFits(id, kind)) return "";
  if (!isActiveThemeId(id)) return retiredThemeReason(lang);
  const served = themeKinds(id);
  const labels: Record<StoreKind, { fr: string; en: string }> = {
    services: { fr: "prestations de services", en: "services" },
    catalog: { fr: "e-commerce", en: "e-commerce" },
    specialty: { fr: "boutique spécialisée", en: "specialty store" },
  };
  const list = served.map((k) => labels[k][lang]).join(lang === "en" ? " or " : " ou ");
  return lang === "en" ? `This theme is designed for ${list} projects, not for a ${labels[kind].en} project.` : `Ce thème est conçu pour un projet « ${list} », pas pour un projet « ${labels[kind].fr} ».`;
}

/**
 * Capture d'exemple d'un thème. Celles des thèmes dont les médias sont suivis dans le dépôt (SILLON, issue #148 ; NOCTIL et
 * TRAVERSE, issue #152 ; HEUREN et ALCÔVE, issue #155 ; MUSEAU CLUB et SOUPLE, issue #158) y sont
 * aussi ; les autres viennent du kit privé (public/demo/directions/, hors dépôt).
 */
const TRACKED_PREVIEWS: Record<string, string> = { sillon: "/theme-assets/sillon/apercu-theme.jpg", noctil: "/theme-assets/noctil/apercu-theme.jpg", traverse: "/theme-assets/traverse/apercu-theme.jpg", heuren: "/theme-assets/heuren/apercu-theme.jpg", alcove: "/theme-assets/alcove/apercu-theme.jpg", "museau-club": "/theme-assets/museau-club/apercu-theme.jpg", souple: "/theme-assets/souple/apercu-theme.jpg", "atelier-nuance": "/theme-assets/atelier-nuance/apercu-theme.jpg", parenthese: "/theme-assets/parenthese/apercu-theme.jpg", "table-saison": "/theme-assets/table-saison/apercu-theme.jpg" };
export const themePreviewPath = (id: string) => TRACKED_PREVIEWS[id] ?? `/demo/directions/${id}.jpg`;
