/** Logo : nouvelles pistes (ajoutées à celles gardées) ou application de la piste choisie, en tâche de fond (« brand.logo »). */
import { loadProject } from "../projects";
import { applyLogo, generateLogos, latestProposals } from "./identity";
import { saveBrandGuide } from "./brand";
import { PermanentError, type JobContext } from "../jobs";
import { L } from "../i18n-server";
import { recordBrandDecision } from "../brain/brand-locks";

export async function runLogoJob(ctx: JobContext, projectId: string, b: { proposalId: string | null; regenerate: boolean }) {
  if (b.regenerate) await generateLogos(ctx, projectId, { redrawSymbol: true, add: true });
  else {
    const pr = latestProposals(projectId).find((x) => x.id === b.proposalId);
    if (!pr) throw new PermanentError(L("Piste introuvable (supprimée entre-temps ?).", "Route not found (deleted in the meantime?)."));
    await applyLogo(ctx, projectId, { id: pr.id, key: pr.info.key, label: pr.info.label, concept: pr.info.concept, spec: pr.info.spec, colors: pr.info.colors, route: pr.info.route });
    // Piste choisie par le client : décision de marque (la précédente reste dans l'historique).
    recordBrandDecision(projectId, "logo", `${pr.info.route?.name ?? pr.info.label} (${pr.id})`);
  }
  // Charte : jamais sur un logo provisoire (version du studio appliquée faute de proposition validée).
  if (!loadProject(projectId).brand?.logo.provisional) await saveBrandGuide(projectId);
  return { current: loadProject(projectId).brand?.logo.proposalId ?? null };
}
