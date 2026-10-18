import { directionSeries } from "./direction-series";
import type { RequestScope } from "../orchestrator/request";
/** Une référence du projet et une action de choix explicite ; jamais une citation, hypothèse ou consigne de conservation. */
export function selectedDirectionCommand(projectId: string, scope?: RequestScope) {
  if (!scope?.choiceRequested || scope.references.length !== 1 || scope.informational || scope.preserved.some(x => ["logo", "style", "marque", "palette", "identite"].includes(x))) return null;
  const ref = scope.references[0];
  const series = directionSeries(projectId).find(s => s.id === ref.version);
  const d = series?.directions.find(d => ref.kind === "logo" ? d.logoId === ref.id : ref.kind === "style" && d.id === ref.id);
  return series?.status === "complete" && d ? { seriesId: series.id, directionId: d.id, logoId: d.logoId } : null;
}
export function selectionScope(scope: RequestScope): RequestScope {
  return { ...scope, actionable: "choisir la direction complète existante identifiée", clarification: undefined };
}
