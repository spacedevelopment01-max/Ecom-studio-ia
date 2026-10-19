import { currentSeries, directionSeries } from "../logo-v2/direction-series";
/** Références du seul projet courant, avec les versions effectivement enregistrées. */
import { stateOf } from "../preparation/store";
import { loadProject } from "../projects";
import type { ChoiceReference } from "./request";
export function projectChoices(projectId: string): ChoiceReference[] {
  const s = stateOf(projectId);
  const current = currentSeries(projectId);
  const chosen = loadProject(projectId).brand?.artIdentity;
  const identity: ChoiceReference[] = current ? current.directions.flatMap((d, i) => [{ kind: "style", id: d.id, version: current.id, ordinal: i + 1, selected: current.id === chosen?.seriesId && d.id === chosen.directionId }, { kind: "logo", id: d.logoId, version: current.id, ordinal: i + 1, selected: current.id === chosen?.seriesId && d.id === chosen.directionId }]) : [];
  if (chosen && chosen.seriesId !== current?.id) {
    const previous = directionSeries(projectId).find(s => s.id === chosen.seriesId)?.directions.find(d => d.id === chosen.directionId);
    if (previous) identity.push({ kind: "style", id: previous.id, version: chosen.seriesId, selected: true }, { kind: "logo", id: previous.logoId, version: chosen.seriesId, selected: true });
  }
  if (!s) return identity;
  const r = s.stages.research;
  const b = s.stages.brand;
  return [
    ...(r?.data.angles.map((a, i) => ({ kind: "strategy", id: a.id, version: r.candidateId, ordinal: i + 1, selected: a.id === r.data.selectedId })) || []),
    ...identity,
    ...(!current ? b?.data.logoCandidates.map((id, i) => ({ kind: "logo", id, version: b.candidateId, ordinal: i + 1, selected: id === b.data.selectedLogo })) || [] : []),
    ...(!current && b?.data.identityConfirmed ? [{ kind: "style", id: b.candidateId, version: s.revision, selected: true }] : []),
  ];
}
