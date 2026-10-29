/**
 * Contenus métier injectés au rendu (#239) : biens immobiliers, carte du restaurant. Un seul point d'entrée pour
 * l'aperçu, l'export et la publication du site hébergé ; le thème enregistré n'est jamais modifié, et un projet sans
 * contenu métier est rendu exactement comme avant.
 */
import { withBiens } from "../biens";
import type { ThemeSpec } from "../theme/spec";
import { withCarte } from "./carte";

export function withContenus(spec: ThemeSpec, projectId: string, opts: { bien?: string | null; plat?: string | null } = {}): ThemeSpec {
  return withCarte(withBiens(spec, projectId, { preview: opts.bien ?? null }), projectId, { preview: opts.plat ?? null });
}
