export { attemptProblem } from "./attempt-rules";
/** Compteur migrable : une correction ou une reformulation IA ne donne jamais deux nouveaux essais. */
import { all, json, one } from "../db";
import { stableHash } from "../brain/hash";
import { clientAttemptContext } from "./analysis-context";
import type { Brief, State } from "./types";

export function analysisAttemptHash(b: Brief) {
  return stableHash("analysis-client-input-v1", { input: b.input, client: clientAttemptContext(b) });
}
export function analysisAttempts(projectId: string, b: Brief, legacyHash: string) {
  const hash = analysisAttemptHash(b);
  const rows = all<{ payload: string; result: string | null; checkpoint: string; status: string }>("SELECT payload,result,checkpoint,status FROM jobs WHERE project_id=? AND type='project.prepare' AND json_extract(payload,'$.action')='analyze'", projectId)
    .map(row => ({ ...row, data: json<{ analysisAttemptHash?: string; inputHash?: string; revision?: number }>(row.payload, {}) }))
    .filter(row => row.data.inputHash === legacyHash);
  const version = (revision: unknown) => typeof revision === "number" && Number.isSafeInteger(revision)
    ? json<State | null>(one<{ value: string }>("SELECT value FROM memory WHERE project_id=? AND key=? AND kind='artifact'", projectId, `preparation.version.${revision}`)?.value, null)?.stages.brief?.data
    : undefined;
  const groups: { nodes: string[]; count: number }[] = [];
  const legacyNodes: string[] = [];
  let legacyCount = 0, incomplete = false;
  for (const row of rows) {
    const p = row.data;
    const before = p.analysisAttemptHash ?? (() => {
      const previous = version(p.revision);
      return previous ? analysisAttemptHash(previous) : undefined;
    })();
    const receipt = json<{ revision?: number }>(row.result, {});
    let after = version(receipt.revision);
    // L'analyse peut être acquise avant la sauvegarde de jobs.result : ne pas refaire payer ce checkpoint.
    if (!after) {
      const checkpoint = json<Record<string, unknown>>(row.checkpoint, {});
      const cached = checkpoint[`prepare:analyze:${p.inputHash}`] as Brief | undefined;
      if (cached?.input && cached.profile?.facts && cached.profile.questions && cached.services)
        after = cached;
    }
    if (!before || (!after && (receipt.revision != null || row.status === "done"))) incomplete = true;
    const nodes = [...new Set([before, after ? analysisAttemptHash(after) : undefined].filter((x): x is string => !!x))];
    if (p.analysisAttemptHash) groups.push({ nodes, count: 1 });
    else { legacyCount++; legacyNodes.push(...nodes); }
  }
  // L'ancienne limite portait sur le brief brut : la migration conserve cette cohorte entière.
  if (legacyCount) groups.push({ nodes: [...new Set(legacyNodes)], count: legacyCount });
  // Preuve d'un résultat historique manquante : ne jamais offrir implicitement un nouvel essai.
  if (incomplete) return { attempts: rows.length, hash, historyIncomplete: true };
  // Chaque analyse relie son entrée à sa sortie. La fermeture transitive empêche A→B→C de devenir
  // deux essais neufs à chaque reformulation. Une vraie saisie client entre B et D n'ajoute aucune liaison.
  const connected = new Set([hash]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const group of groups) if (group.nodes.some(node => connected.has(node)))
      for (const node of group.nodes) if (!connected.has(node)) { connected.add(node); changed = true; }
  }
  return { attempts: groups.filter(group => group.nodes.some(node => connected.has(node))).reduce((n, group) => n + group.count, 0), hash, historyIncomplete: false };
}
