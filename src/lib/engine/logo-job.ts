/** Logo : nouvelles pistes ou application de la piste choisie, en tâche de fond (« brand.logo »). */
import { loadProject } from "../projects";
import { applyLogo, generateLogos, latestProposals, type ProposalKey } from "./identity";
import { saveBrandGuide } from "./brand";
import { PermanentError, type JobContext } from "../jobs";
import { L } from "../i18n-server";

/** Travail de la tâche « brand.logo » (exécuté par le worker). */
export async function runLogoJob(ctx: JobContext, projectId: string, b: { choice: ProposalKey | null; regenerate: boolean; redrawSymbol?: boolean }) {
  if (b.regenerate) await generateLogos(ctx, projectId, { choice: b.choice ?? undefined, redrawSymbol: b.redrawSymbol ?? true });
  else {
    const pr = latestProposals(projectId).find((x) => x.info.key === b.choice);
    if (!pr) throw new PermanentError(L("Proposition introuvable.", "Proposal not found."));
    await applyLogo(ctx, projectId, { key: pr.info.key, label: pr.info.label, concept: pr.info.concept, spec: pr.info.spec, colors: pr.info.colors, route: pr.info.route });
  }
  await saveBrandGuide(projectId);
  return { current: loadProject(projectId).brand?.logo.proposal ?? null };
}
