/** Logo : nouvelles pistes (ajoutées à celles gardées) ou application de la piste choisie, en tâche de fond (« brand.logo »). */
import { loadProject } from "../projects";
import { applyLogo, latestProposals } from "./identity";
import { saveBrandGuide } from "./brand";
import { PermanentError, UserFacingError, type JobContext } from "../jobs";
import { L } from "../i18n-server";
import { recordBrandDecision } from "../brain/brand-locks";
import { imageDelivery, type ImageDelivery } from "../media/delivery-check";

export async function runLogoJob(ctx: JobContext, projectId: string, b: { proposalId: string | null; regenerate: boolean }) {
  let delivery:ImageDelivery|undefined;
  if (b.regenerate) {
    // Nouvelles propositions : Brand & Logo Engine V2 (l'ancien générateur de pistes n'est plus appelé).
    const { runLogoEngineV2 } = await import("../logo-v2/engine");
    const { applyBestLogoV2 } = await import("../logo-v2/choose");
    const run = await runLogoEngineV2(ctx, projectId);
    const {currentSeries}=await import("../logo-v2/direction-series");const series=currentSeries(projectId);
    if(series&&series.status!=="complete")throw new UserFacingError(L(`Série incomplète : ${series.directions.length}/3 directions conservées. Le logo validé reste en place ; aucun nouvel essai automatique.`,`Incomplete series: ${series.directions.length}/3 directions kept. The validated logo stays in place; no automatic retry.`));
    delivery=await imageDelivery(projectId,series?series.directions.map(d=>d.logoId):[...run.shown,...run.studio].map(r=>r.assetId),{expected:series?3:1,reasons:run.notes});
    delivery.message=L("Propositions de logo disponibles, à examiner avant validation.","Logo proposals available, for review before validation.");
    await ctx.step("logo-v2:apply", async () => (await applyBestLogoV2(ctx, projectId, [...run.shown, ...run.studio]))?.assetId ?? null);
  } else {
    const pr = latestProposals(projectId).find((x) => x.id === b.proposalId);
    if (!pr) throw new PermanentError(L("Piste introuvable (supprimée entre-temps ?).", "Route not found (deleted in the meantime?)."));
    await applyLogo(ctx, projectId, { id: pr.id, key: pr.info.key, label: pr.info.label, concept: pr.info.concept, spec: pr.info.spec, colors: pr.info.colors, route: pr.info.route });
    // Piste choisie par le client : décision de marque (la précédente reste dans l'historique).
    recordBrandDecision(projectId, "logo", `${pr.info.route?.name ?? pr.info.label} (${pr.id})`);
  }
  // Charte : jamais sur un logo provisoire (version du studio appliquée faute de proposition validée).
  if (!loadProject(projectId).brand?.logo.provisional) await saveBrandGuide(projectId);
  return { current: loadProject(projectId).brand?.logo.proposalId ?? null,...(delivery?{delivery}:{}) };
}
