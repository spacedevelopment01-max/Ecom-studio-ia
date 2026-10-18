/** Réutilise la mémoire du projet ; instantanés immuables et pointeur courant, sous transaction. */
import { all, id, json, now, one, tx } from "../db";
import { remember } from "../projects";
import { HttpError } from "../auth";
import { stableHash as brainHash } from "../brain/hash";
const stableHash = (data: unknown) => brainHash("preparation", data);
import { STEPS, type State, type Step, type Data, type Stage } from "./types";
export const CURRENT = "preparation.current";
export function stateOf(projectId: string): State | null {
  return json(
    one<{ value: string }>(
      "SELECT value FROM memory WHERE project_id=? AND kind='artifact' AND key=?",
      projectId,
      CURRENT,
    )?.value,
    null,
  );
}
export function historyOf(projectId: string) {
  return all<{ value: string }>(
    "SELECT value FROM memory WHERE project_id=? AND kind='artifact' AND key LIKE 'preparation.version.%' ORDER BY created_at DESC,rowid DESC LIMIT 80",
    projectId,
  ).map((r) => JSON.parse(r.value) as State);
}
export function commitState(
  projectId: string,
  expected: number,
  change: (s: State) => void,
): State {
  return tx(() => {
    const prev = stateOf(projectId);
    if ((prev?.revision ?? 0) !== expected)
      throw new HttpError(
        409,
        "Le projet a changé. Rechargez avant de valider.",
        "preparation_conflict",
      );
    const s = structuredClone(
      prev ?? {
        schemaVersion: 1,
        projectId,
        revision: 0,
        createdAt: now(),
        updatedAt: now(),
        stages: {},
      },
    ) as State;
    change(s);
    s.revision++;
    s.updatedAt = now();
    remember(projectId, {
      kind: "artifact",
      key: `preparation.version.${s.revision}`,
      value: JSON.stringify(s),
      source: "local",
    });
    remember(projectId, {
      kind: "artifact",
      key: CURRENT,
      value: JSON.stringify(s),
      source: "local",
    });
    // Un contrat approuvé décrit une révision précise : toute mutation retire le pointeur exploitable.
    // approve() le republie seulement après les contrôles complets de la nouvelle révision.
    remember(projectId, {
      kind: "artifact",
      key: "project.ready_for_theme",
      value: JSON.stringify({ ready: false, revision: s.revision }),
      status: "inferred",
      source: "local",
    });
    return s;
  });
}
export function inputHash(s: State, step: Step): string {
  const i = STEPS.indexOf(step);
  return stableHash({
    step,
    upstream: STEPS.slice(0, i).map((k) => ({
      step: k,
      data: s.stages[k]?.data,
      approved: s.stages[k]?.status === "approved",
    })),
    ...(step === "brief" ? { brief: s.stages.brief?.data.input } : {}),
  });
}
export function requireUpstream(s: State, step: Step) {
  for (const k of STEPS.slice(0, STEPS.indexOf(step)))
    if (s.stages[k]?.status !== "approved")
      throw new HttpError(
        409,
        `Validez d'abord l'étape ${k}.`,
        "preparation_not_approved",
      );
}
export function invalidateAfter(s: State, step: Step) {
  for (const k of STEPS.slice(STEPS.indexOf(step) + 1)) {
    const st = s.stages[k];
    if (st) st.status = "stale";
  }
  delete s.error;
}
export function draft<K extends Step>(s: State, step: K, data: Data[K]) {
  invalidateAfter(s, step);
  (s.stages as any)[step] = {
    data,
    inputHash: "",
    status: "draft",
    candidateId: id(),
  } satisfies Stage<K>;
  s.stages[step]!.inputHash = inputHash(s, step);
}
export function stageOf<K extends Step>(s: State, step: K): Stage<K> {
  const x = s.stages[step];
  if (!x)
    throw new HttpError(
      409,
      "Cette étape doit être préparée avant validation.",
    );
  return x as Stage<K>;
}
