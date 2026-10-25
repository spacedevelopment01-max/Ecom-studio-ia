/**
 * Catalogue des thèmes proposés et usage prévu de chaque thème de référence.
 *
 * Mission #190 (25 octobre 2026) : seuls les thèmes refaits d'après les maquettes de Thomas sont proposés aux clients
 * (galerie, IA, commandes, recommandation, tarifs) — `MAQUETTE_THEMES`, inventaire : docs/INVENTAIRE-THEMES-190.md.
 * ORBE et ALCÔVE, créés avant la méthode sur maquettes (aucune maquette retrouvée), ne sont plus proposés ; comme les
 * trente thèmes de l'ancien catalogue (retirés le 19 octobre), ils restent lisibles pour les projets qui les utilisent
 * (rendu, retouches, versions), sans migration silencieuse ni suppression.
 *
 * Plus de familles dans le choix ni dans les droits : n'importe quel thème proposé peut être choisi pour n'importe quel
 * projet ; l'usage prévu (`themeKinds`) ne sert plus qu'à recommander et à décrire. Les droits d'accès sont réglés par
 * thème et par forfait (theme-rights.ts).
 *
 * Module sans dépendance serveur (lu par l'interface).
 */
import type { StoreKind } from "./store-kind";

/** Thèmes de référence (issue #137) : compatibilités déclarées, jamais déduites du nom. */
export const REFERENCE_THEMES = ["fraise", "onde", "orbe", "rive", "sillon", "noctil", "traverse", "heuren", "alcove", "museau-club", "souple", "table-saison", "atelier-nuance", "parenthese", "phase", "maison-horizon", "aplat"] as const;
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
  "maison-horizon": ["services"],
  // APLAT (dix maquettes du 25 octobre, PR #187) : plâtrerie et peinture intérieure, famille Prestations de services.
  aplat: ["services"],
};

export const isReferenceThemeId = (id: string): id is ReferenceThemeId => (REFERENCE_THEMES as readonly string[]).includes(id);

/** Thèmes de référence créés avant la méthode sur maquettes (aucune maquette retrouvée) : plus proposés depuis le 25 octobre. */
export const PRE_MAQUETTE_THEMES = ["orbe", "alcove"] as const satisfies readonly ReferenceThemeId[];

/** Catalogue proposé aux clients : les thèmes refaits d'après les maquettes de Thomas (mission #190). */
export const MAQUETTE_THEMES = REFERENCE_THEMES.filter((id) => !(PRE_MAQUETTE_THEMES as readonly string[]).includes(id)) as Exclude<ReferenceThemeId, (typeof PRE_MAQUETTE_THEMES)[number]>[];
export const ACTIVE_THEMES: readonly ActiveThemeId[] = MAQUETTE_THEMES;
export type ActiveThemeId = Exclude<ReferenceThemeId, (typeof PRE_MAQUETTE_THEMES)[number]>;
export const isActiveThemeId = (id: string): id is ActiveThemeId => (ACTIVE_THEMES as readonly string[]).includes(id);
/** Thème de référence retiré du catalogue proposé le 25 octobre (créé avant les maquettes). */
export const isPreMaquetteTheme = (id: string) => (PRE_MAQUETTE_THEMES as readonly string[]).includes(id);

/** Statut d'un identifiant de thème : actif (proposé), retiré (ancien catalogue, lecture seule) ou inconnu. */
export function themeStatus(id: string, known: boolean): "active" | "retired" | "unknown" {
  return isActiveThemeId(id) ? "active" : known ? "retired" : "unknown";
}

/** Motif lisible pour un thème retiré du catalogue (conservé seulement pour les projets qui l'utilisent). */
export function retiredThemeReason(lang: "fr" | "en" = "fr", id?: string): string {
  if (id && isPreMaquetteTheme(id))
    return lang === "en"
      ? "This theme was withdrawn from the catalogue on 25 October (created before the mockup-based method): it is kept only for the projects already using it and cannot be chosen for a new selection."
      : "Ce thème a été retiré du catalogue le 25 octobre (créé avant la méthode sur maquettes) : il n'est conservé que pour les projets qui l'utilisent déjà et ne peut plus être choisi.";
  return lang === "en"
    ? "This theme was withdrawn from the catalogue (19 October): it is kept only for the projects already using it and cannot be chosen for a new selection."
    : "Ce thème a été retiré du catalogue (19 octobre) : il n'est conservé que pour les projets qui l'utilisent déjà et ne peut plus être choisi.";
}

/** Usage prévu d'un thème de référence (description et recommandation seulement, jamais une restriction). */
export function themeKinds(id: string): StoreKind[] {
  return isReferenceThemeId(id) ? REFERENCE_FIT[id] : [];
}

/** Conçu d'abord pour ce type de projet ? Sert à recommander, jamais à interdire. */
export const themeDesignedFor = (id: string, kind: StoreKind) => themeKinds(id).includes(kind);

/** Plus de familles (mission #190) : tout thème proposé convient à tout projet ; un thème retiré ne convient à aucun. */
export const themeFits = (id: string, _kind?: StoreKind) => isActiveThemeId(id);

/** Motif lisible si le thème ne peut pas être choisi (vide sinon) : seul un thème retiré du catalogue est refusé. */
export function themeFitReason(id: string, _kind: StoreKind, lang: "fr" | "en" = "fr"): string {
  return themeFits(id) ? "" : retiredThemeReason(lang, id);
}

/**
 * Capture d'exemple d'un thème. Celles des thèmes dont les médias sont suivis dans le dépôt (SILLON, issue #148 ; NOCTIL et
 * TRAVERSE, issue #152 ; HEUREN et ALCÔVE, issue #155 ; MUSEAU CLUB et SOUPLE, issue #158 ; Atelier Rive, dossier du 23 octobre) y sont
 * aussi ; les autres viennent du kit privé (public/demo/directions/, hors dépôt).
 */
const TRACKED_PREVIEWS: Record<string, string> = { sillon: "/theme-assets/sillon/apercu-theme.jpg", noctil: "/theme-assets/noctil/apercu-theme.jpg", traverse: "/theme-assets/traverse/apercu-theme.jpg", heuren: "/theme-assets/heuren/apercu-theme.jpg", alcove: "/theme-assets/alcove/apercu-theme.jpg", "museau-club": "/theme-assets/museau-club/apercu-theme.jpg", souple: "/theme-assets/souple/apercu-theme.jpg", "atelier-nuance": "/theme-assets/atelier-nuance/apercu-theme.jpg", parenthese: "/theme-assets/parenthese/apercu-theme.jpg", "table-saison": "/theme-assets/table-saison/apercu-theme.jpg", rive: "/theme-assets/rive/apercu-theme.jpg" };
export const themePreviewPath = (id: string) => TRACKED_PREVIEWS[id] ?? `/demo/directions/${id}.jpg`;
