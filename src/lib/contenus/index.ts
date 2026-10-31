/**
 * Contenus métier injectés au rendu (#239) : biens immobiliers, carte du restaurant, réalisations des artisans. Un seul point d'entrée pour
 * l'aperçu, l'export et la publication du site hébergé ; le thème enregistré n'est jamais modifié, et un projet sans
 * contenu métier est rendu exactement comme avant.
 */
import { withBiens } from "../biens";
import type { ThemeSpec } from "../theme/spec";
import { withCarte } from "./carte";
import { withRealisations } from "./realisations";

/**
 * Sections du thème enregistré dont le contenu vient d'un onglet métier et est remplacé au rendu (carte, réalisations) :
 * clé « gabarit:section » → onglet. SYNA ne les retouche ni ne les retire (#276) ; sans contenu métier, aucune.
 */
export function managedSections(spec: ThemeSpec, projectId: string): Map<string, "carte" | "realisations"> {
  const out = new Map<string, "carte" | "realisations">();
  const rendered = withContenus(spec, projectId);
  if (rendered === spec) return out;
  for (const [key, tpl] of Object.entries(spec.templates)) for (const [sid, sec] of Object.entries(tpl.sections)) {
    const after = rendered.templates[key]?.sections[sid];
    if (after && JSON.stringify(after) !== JSON.stringify(sec)) out.set(`${key}:${sid}`, /^ts-/.test(sec.type) ? "carte" : "realisations");
  }
  return out;
}

export function withContenus(spec: ThemeSpec, projectId: string, opts: { bien?: string | null; plat?: string | null; realisation?: string | null } = {}): ThemeSpec {
  return withRealisations(withCarte(withBiens(spec, projectId, { preview: opts.bien ?? null }), projectId, { preview: opts.plat ?? null }), projectId, { preview: opts.realisation ?? null });
}
