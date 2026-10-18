/** Références du seul projet courant, avec les versions effectivement enregistrées. */
import { stateOf } from "../preparation/store";
import type { ChoiceReference } from "./request";
export function projectChoices(projectId: string): ChoiceReference[] {
  const s = stateOf(projectId);
  if (!s) return [];
  const r = s.stages.research;
  const b = s.stages.brand;
  return [
    ...(r?.data.angles.map((a, i) => ({ kind: "strategy", id: a.id, version: r.candidateId, ordinal: i + 1, selected: a.id === r.data.selectedId })) || []),
    ...(b?.data.logoCandidates.map((id, i) => ({ kind: "logo", id, version: b.candidateId, ordinal: i + 1, selected: id === b.data.selectedLogo })) || []),
    ...(b?.data.identityConfirmed ? [{ kind: "style", id: b.candidateId, version: s.revision, selected: true }] : []),
  ];
}
