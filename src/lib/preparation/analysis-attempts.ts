export { attemptProblem } from "./attempt-rules";
/** Compteur migrable : une correction seule ne donne jamais droit à deux nouveaux essais. */
import { all, json, one } from "../db";
import { stableHash } from "../brain/hash";
import { clientAttemptContext } from "./analysis-context";
import type { Brief, State } from "./types";

export function analysisAttemptHash(b: Brief) {
  return stableHash("analysis-client-input-v1", { input: b.input, client: clientAttemptContext(b) });
}
export function analysisAttempts(projectId: string, b: Brief, legacyHash: string) {
  const hash = analysisAttemptHash(b);
  const rows = all<{ payload: string }>("SELECT payload FROM jobs WHERE project_id=? AND type='project.prepare' AND json_extract(payload,'$.action')='analyze'", projectId)
    .map(row => json<{ analysisAttemptHash?: string; inputHash?: string; revision?: number }>(row.payload, {}));
  const legacy = rows.filter(p => !p.analysisAttemptHash && p.inputHash === legacyHash);
  // Une migration ne fractionne pas les deux essais déjà consommés pour l'ancienne signature.
  // Tous restent acquis si cette fiche correspond à l'un de leurs instantanés, ou si une preuve manque.
  const sameLegacyCohort = legacy.some(p => {
    const historical = json<State | null>(one<{ value: string }>("SELECT value FROM memory WHERE project_id=? AND key=? AND kind='artifact'", projectId, `preparation.version.${p.revision}`)?.value, null)?.stages.brief?.data;
    return !historical || analysisAttemptHash(historical) === hash;
  });
  const attempts = rows.filter(p => p.analysisAttemptHash === hash).length + (sameLegacyCohort ? legacy.length : 0);
  return { attempts, hash };
}
