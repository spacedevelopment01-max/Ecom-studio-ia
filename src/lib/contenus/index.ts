/**
 * Contenus métier injectés au rendu (#239) : biens immobiliers, carte du restaurant, réalisations des artisans. Un seul point d'entrée pour
 * l'aperçu, l'export et la publication du site hébergé ; le thème enregistré n'est jamais modifié, et un projet sans
 * contenu métier est rendu exactement comme avant.
 */
import { withBiens } from "../biens";
import type { ThemeSpec } from "../theme/spec";
import { withCarte } from "./carte";
import { withRealisations } from "./realisations";

export function withContenus(spec: ThemeSpec, projectId: string, opts: { bien?: string | null; plat?: string | null; realisation?: string | null } = {}): ThemeSpec {
  return withRealisations(withCarte(withBiens(spec, projectId, { preview: opts.bien ?? null }), projectId, { preview: opts.plat ?? null }), projectId, { preview: opts.realisation ?? null });
}
