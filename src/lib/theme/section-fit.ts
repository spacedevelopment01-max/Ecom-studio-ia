/**
 * Compatibilité explicite des sections de la bibliothèque avec le thème installé et la catégorie du projet
 * (consigne du 19 octobre, issue #137) : la galerie « Sections » ne propose que les sections compatibles, et les mêmes
 * règles s'appliquent à l'ajout manuel, à l'ajout par l'IA, aux commandes locales et aux opérations serveur.
 *
 * La compatibilité est déclarée ici par métadonnées (catégories de projet, thèmes ou profils graphiques), jamais
 * déduite d'une recherche par nom. Une section absente du tableau est transversale : compatible partout.
 *
 * Trois familles « à profil » : les sections `cv-*` (profil « conversion » : FRAISE, ONDE), `ed-*` (compositions
 * éditoriales : ORBE, Atelier Rive) et `ref-*` (compositions de référence : ORBE, Atelier Rive, et les anciens Vitrine
 * et Jardin pour les projets existants qui les utilisent encore ; ces deux thèmes sont retirés du catalogue depuis le
 * 19 octobre et ne sont plus proposés).
 * Elles ne s'ajoutent que dans un thème qui charge leur feuille de style, sinon leur rendu emprunterait le style d'une
 * autre activité.
 */
import type { StoreKind } from "./store-kind";
import { isReferenceThemeId } from "./theme-fit";

export type SectionFit = {
  /** Catégories de projet où la section a un sens (absent : toutes). */
  kinds?: StoreKind[];
  /** Thèmes (identifiants de direction) qui savent rendre la section (absent : tous). */
  themes?: string[];
  /** Profils graphiques globaux qui activent la section, lus dans les réglages du thème (absent : aucun requis). */
  profiles?: ("conversion" | "editorial")[];
};

const SHOP: StoreKind[] = ["catalog", "specialty"];
const CONVERSION_THEMES = ["fraise", "onde", "sillon"];
const EDITORIAL_THEMES = ["orbe", "rive"];
// Vitrine et Jardin sont retirés du catalogue (19 octobre) mais rendent encore ces sections : un projet existant qui les
// utilise les garde compatibles ; aucun thème actif autre qu'ORBE / Rive ne se les voit proposer.
const REFERENCE_THEMES = ["vitrine", "jardin", "orbe", "rive"];

export const SECTION_FIT: Record<string, SectionFit> = {
  // Profil « conversion » (pages de vente denses) : FRAISE, ONDE, ou tout thème dont le profil est activé.
  "cv-hero": { kinds: SHOP, themes: CONVERSION_THEMES, profiles: ["conversion"] },
  "cv-cards": { kinds: SHOP, themes: CONVERSION_THEMES, profiles: ["conversion"] },
  "cv-reviews": { kinds: SHOP, themes: CONVERSION_THEMES, profiles: ["conversion"] },
  "cv-feature": { kinds: SHOP, themes: CONVERSION_THEMES, profiles: ["conversion"] },
  "cv-guarantee": { kinds: SHOP, themes: CONVERSION_THEMES, profiles: ["conversion"] },
  "cv-article": { kinds: SHOP, themes: CONVERSION_THEMES, profiles: ["conversion"] },
  "cv-hotspots": { kinds: SHOP, themes: CONVERSION_THEMES, profiles: ["conversion"] },
  "cv-alternating": { themes: CONVERSION_THEMES, profiles: ["conversion"] },
  "cv-steps": { themes: CONVERSION_THEMES, profiles: ["conversion"] },
  "cv-gallery": { themes: CONVERSION_THEMES, profiles: ["conversion"] },
  "cv-specs": { kinds: SHOP, themes: CONVERSION_THEMES, profiles: ["conversion"] },
  "cv-banner": { kinds: SHOP, themes: CONVERSION_THEMES, profiles: ["conversion"] },
  "cv-stories": { themes: CONVERSION_THEMES, profiles: ["conversion"] },
  "cv-ingredients": { kinds: SHOP, themes: CONVERSION_THEMES, profiles: ["conversion"] },
  "cv-quote": { themes: CONVERSION_THEMES, profiles: ["conversion"] },
  // Compositions éditoriales (ORBE, Atelier Rive).
  "ed-opening": { themes: EDITORIAL_THEMES, profiles: ["editorial"] },
  "ed-statement": { themes: EDITORIAL_THEMES, profiles: ["editorial"] },
  "ed-diptych": { themes: EDITORIAL_THEMES, profiles: ["editorial"] },
  "ed-scene": { themes: EDITORIAL_THEMES, profiles: ["editorial"] },
  "ed-study": { themes: EDITORIAL_THEMES, profiles: ["editorial"] },
  "ed-contact": { themes: EDITORIAL_THEMES, profiles: ["editorial"] },
  "ed-finishes": { kinds: SHOP, themes: EDITORIAL_THEMES, profiles: ["editorial"] },
  // Compositions de référence (Vitrine, Jardin) et leurs dérivées.
  "ref-hero": { themes: REFERENCE_THEMES },
  "ref-editorial": { themes: REFERENCE_THEMES },
  "ref-narrative": { themes: REFERENCE_THEMES },
  "ref-offers": { themes: REFERENCE_THEMES },
  "ref-notes": { themes: REFERENCE_THEMES },
  // Vente de produits : fiche, offres, catalogue, panier. Jamais sur un site de prestations.
  "featured-purchase": { kinds: SHOP },
  "purchase-offers": { kinds: SHOP },
  "featured-product": { kinds: SHOP },
  "product-360": { kinds: SHOP },
  "product-recommendations": { kinds: SHOP },
  "product-reviews": { kinds: SHOP },
  "featured-collection": { kinds: SHOP },
  "collection-list": { kinds: SHOP },
  "visual-menu": { kinds: SHOP },
  "story-circles": { kinds: SHOP },
  "featured-offer": { kinds: SHOP },
  "countdown": { kinds: SHOP },
  "shipping-journey": { kinds: SHOP },
  // Aussi pour les services : bandeau « Contact et prise de rendez-vous » de leur bibliothèque (issue #145).
  "cta-banner": { kinds: [...SHOP, "services"] },
  "hero-split": { kinds: SHOP },
  "hero-editorial": { kinds: SHOP },
  "comparison-table": { kinds: SHOP },
  "specs-list": { kinds: SHOP },
  "exploded-view": { kinds: SHOP },
  "routine-steps": { kinds: SHOP },
  "scroll-story": { kinds: SHOP },
  // Aussi pour les services : « Méthode de travail » en étapes de leur bibliothèque (issue #145).
  "how-to": { kinds: [...SHOP, "services"] },
  "precautions": { kinds: SHOP },
  "content-tabs": { kinds: SHOP },
  "animated-benefits": { kinds: SHOP },
  "floating-scene": { kinds: SHOP },
  "day-night": { kinds: SHOP },
  "customer-wall": { kinds: SHOP },
  "video-stories": { kinds: SHOP },
  "situations": { kinds: SHOP },
  // Prestations de services : réservation, tarifs, prestations.
  "services-list": { kinds: ["services"] },
  pricing: { kinds: ["services"] },
  "booking-calendar": { kinds: ["services"] },
  booking: { kinds: ["services"] },
  // Transversales déclarées (équipe, réalisations, infos pratiques, FAQ, image et texte, contact…) : aucune entrée,
  // donc compatibles partout, rendues dans le style du thème actif.
};

export type FitContext = {
  /** Catégorie du projet (absente : seules les règles de thème et de profil s'appliquent). */
  kind?: StoreKind | null;
  /** Identifiant de la direction (thème) installée. */
  theme: string;
  /** Réglages globaux du thème (profils `conversion_profile`, `editorial_profile`). */
  settings?: Record<string, unknown>;
};

function activeProfiles(settings?: Record<string, unknown>): Set<"conversion" | "editorial"> {
  const out = new Set<"conversion" | "editorial">();
  const conv = String(settings?.conversion_profile ?? "none");
  const ed = String(settings?.editorial_profile ?? "none");
  if (conv && conv !== "none") out.add("conversion");
  if (ed && ed !== "none") out.add("editorial");
  return out;
}

/** Vérifie une section contre le contexte ; renvoie le motif d'incompatibilité (vide si compatible). */
export function sectionFitReason(type: string, ctx: FitContext, lang: "fr" | "en" = "fr"): string {
  const fit = SECTION_FIT[type];
  if (!fit) return "";
  if (fit.kinds && ctx.kind && !fit.kinds.includes(ctx.kind)) {
    const labels: Record<StoreKind, { fr: string; en: string }> = { services: { fr: "prestations de services", en: "services" }, catalog: { fr: "e-commerce", en: "e-commerce" }, specialty: { fr: "boutique spécialisée", en: "specialty store" } };
    return lang === "en" ? `Section meant for ${fit.kinds.map((k) => labels[k].en).join(" or ")} projects, not for a ${labels[ctx.kind].en} project.` : `Section prévue pour un projet « ${fit.kinds.map((k) => labels[k].fr).join(" ou ")} », pas pour un projet « ${labels[ctx.kind].fr} ».`;
  }
  if (fit.themes || fit.profiles) {
    const byTheme = fit.themes?.includes(ctx.theme) ?? false;
    const byProfile = fit.profiles?.some((p) => activeProfiles(ctx.settings).has(p)) ?? false;
    if (!byTheme && !byProfile) {
      return lang === "en"
        ? `Section rendered only by the themes ${(fit.themes ?? []).join(", ")}${fit.profiles ? ` (or a theme with the ${fit.profiles.join("/")} profile enabled)` : ""}; the installed theme would borrow another style.`
        : `Section rendue seulement par les thèmes ${(fit.themes ?? []).join(", ")}${fit.profiles ? ` (ou un thème dont le profil ${fit.profiles.join("/")} est activé)` : ""} ; le thème installé emprunterait un autre style.`;
    }
  }
  return "";
}

export const sectionFits = (type: string, ctx: FitContext) => !sectionFitReason(type, ctx);

/** Contexte de compatibilité d'un thème : direction et réglages globaux. */
export const fitContextOf = (spec: { direction: string; settings: Record<string, unknown> }, kind?: StoreKind | null): FitContext => ({ kind, theme: spec.direction, settings: spec.settings });

/**
 * Sections devenues incompatibles après un changement de thème ou de catégorie : identifiées, jamais supprimées
 * (le studio les pose masquées et le signale).
 */
export function incompatibleSections(spec: { direction: string; settings: Record<string, unknown>; templates: Record<string, { order: string[]; sections: Record<string, { type: string; disabled?: boolean }> }> }, kind?: StoreKind | null, lang: "fr" | "en" = "fr"): { template: string; id: string; type: string; reason: string }[] {
  const ctx = fitContextOf(spec, kind);
  const out: { template: string; id: string; type: string; reason: string }[] = [];
  for (const [template, tpl] of Object.entries(spec.templates)) {
    for (const id of tpl.order) {
      const s = tpl.sections[id];
      if (!s) continue;
      const reason = sectionFitReason(s.type, ctx, lang);
      if (reason) out.push({ template, id, type: s.type, reason });
    }
  }
  return out;
}

/** Les thèmes de référence déclarent leur profil : utile pour savoir qu'un thème rend une famille de sections. */
export const themeProfiles = (theme: string): ("conversion" | "editorial")[] => (isReferenceThemeId(theme) ? (CONVERSION_THEMES.includes(theme) ? ["conversion"] : ["editorial"]) : []);
