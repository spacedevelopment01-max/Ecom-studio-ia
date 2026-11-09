/**
 * Étape 6 du parcours SINA (#492) : THÈME OU MAQUETTES — les thèmes du Studio montrés TELS QU'ILS SONT.
 *
 * Consigne du propriétaire (7 novembre) : SINA montre les thèmes avec leurs images et leurs textes d'origine (capture de
 * la démonstration, lien vers la démonstration complète) ; elle ne les recompose pas avec le projet du client. Gratuit,
 * sans IA. Le catalogue proposé (thèmes refaits d'après les maquettes de Thomas, `ACTIVE_THEMES`) sert à tout projet ;
 * ce que chaque thème met en scène (un produit, une petite collection, des prestations) sert seulement à ordonner.
 */
import { L } from "../i18n-server";
import { loadProject } from "../projects";
import { listProducts } from "../products/catalog";
import { DIRECTIONS } from "../theme/directions";
import { ACTIVE_THEMES, themePreviewPath } from "../theme/theme-fit";
import { themeDemoStatus } from "../theme/theme-demos";
import { assertThemeAllowed } from "../plan-gates";

export type ThemeCard = {
  id: string; name: string; tagline: string;
  /** Capture d'origine du thème (sa démonstration, ses images et ses textes), jamais le site du client. */
  preview: string;
  /** Ce que le thème met en scène, au regard du projet (une phrase courte, sans jargon). */
  why: string;
  recommended: boolean;
  /** Inclus dans le forfait du projet ; sinon le motif (forfait nécessaire). */
  allowed: boolean; blocked?: string;
  /** Démonstration complète consultable (exports préparés). */
  demo: boolean;
};
export type SinaThemes = { list: ThemeCard[]; recommendedId: string | null; all: boolean; at: number };

/** Ce que chaque thème proposé met en scène (d'après ses maquettes). */
const STAGING: Record<string, "one" | "few" | "services"> = {
  onde: "one", heuren: "one", alcove: "one", sillon: "one", noctil: "one", traverse: "one", fraise: "one",
  souple: "few", "museau-club": "few",
  rive: "services", "table-saison": "services", "atelier-nuance": "services", parenthese: "services", phase: "services", "maison-horizon": "services", aplat: "services",
};
const WHY: Record<"one" | "few" | "services", string> = {
  one: "Pensé pour mettre en avant un produit phare.",
  few: "Pensé pour une petite collection de produits qui vont ensemble.",
  services: "Pensé pour présenter des prestations et prendre des demandes.",
};

/**
 * Thèmes à montrer : d'abord ceux qui mettent en scène ce que vend le client (prestations ; une collection dès deux
 * produits ; un produit phare sinon), puis les autres. Trois par défaut ; tout le catalogue quand il veut tout voir.
 */
export function themeChoices(projectId: string, all = false): SinaThemes {
  const p = loadProject(projectId);
  let count = 0;
  try { count = listProducts(projectId).length; } catch { count = 0; }
  count = Math.max(count, p.catalog.length);
  const wanted: "one" | "few" | "services" = p.business === "services" ? "services" : count >= 2 ? "few" : "one";
  const fallback: "one" | "few" | "services" = wanted === "few" ? "one" : wanted === "one" ? "few" : "services";
  const active = ACTIVE_THEMES as readonly string[];
  const rank = (id: string) => (STAGING[id] === wanted ? 0 : STAGING[id] === fallback ? 1 : 2);
  const ordered = [...active].sort((a, b) => rank(a) - rank(b));
  const ids = ordered.slice(0, all ? active.length : 3);
  const recommendedId = rank(ordered[0]) === 0 ? ordered[0] : null;
  const list = ids.map((id): ThemeCard => {
    const d = DIRECTIONS.find((x) => x.id === id);
    let allowed = true, blocked: string | undefined;
    try { assertThemeAllowed(projectId, id, null); } catch (e) { allowed = false; blocked = (e as Error).message; }
    let demo = false;
    try { demo = themeDemoStatus(id).ready; } catch { demo = false; }
    const staging = STAGING[id];
    const why = staging ? L(WHY[staging], WHY[staging]) : "";
    return { id, name: d?.name ?? id, tagline: d?.tagline ?? "", preview: themePreviewPath(id), why, recommended: id === recommendedId, allowed, ...(blocked ? { blocked } : {}), demo };
  });
  return { list, recommendedId, all, at: Date.now() };
}
