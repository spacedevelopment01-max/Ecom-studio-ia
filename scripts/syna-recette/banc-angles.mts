/**
 * Banc d'essai PRIVÉ des angles marketing : relance l'analyse des angles d'un projet sans rien enregistrer dans le projet.
 * Usage : tsx work/banc-angles.mts <projectId> <reuse|web> <sortie.json>
 *  - reuse : réutilise les pages déjà trouvées (aucune nouvelle recherche web) ;
 *  - web : nouvelle recherche web OpenAI puis analyse.
 * Coût plafonné à 1,5 € par essai (trace).
 */
import fs from "node:fs";
const [pid, mode, out] = process.argv.slice(2);
const { one } = await import("../../src/lib/db");
const { loadProject } = await import("../../src/lib/projects");
const { stateOf } = await import("../../src/lib/preparation/store");
const { researchProject } = await import("../../src/lib/preparation/research");
const { analyzeResearch } = await import("../../src/lib/preparation/research-ai");
const { openaiWebResearch } = await import("../../src/lib/ai/web-search");
const { withTrace } = await import("../../src/lib/ai/trace");
const { runForUser } = await import("../../src/lib/ai/access");
const p: any = loadProject(pid), brief: any = (stateOf(pid)!.stages as any).brief.data;
const jobId = `banc-${Date.now()}`;
const ctx: any = { job: { id: jobId, project_id: pid }, payload: { correction: "" }, step: (_k: string, fn: any) => fn() };
const t0 = Date.now();
const result = await runForUser(p.userId, () => withTrace({ jobId, projectId: pid, costCapMicro: 1_500_000 }, async () => {
  const base = mode.startsWith("file:")
    ? JSON.parse(fs.readFileSync(mode.slice(5), "utf8")).base
    : mode === "reuse"
    ? JSON.parse(one<{ value: string }>("SELECT value FROM memory WHERE project_id=? AND key='marketing.research.pages' ORDER BY rowid DESC LIMIT 1", pid)!.value)
    : await researchProject(p, brief, undefined, undefined, async (q: string) => (await openaiWebResearch({ userId: p.userId, projectId: pid, jobId, usageKey: `${jobId}:web` }, q)).findings);
  try { return { ok: true, research: await analyzeResearch(p, ctx, base), base }; }
  catch (e: any) { return { ok: false, error: String(e?.message ?? e), base }; }
}));
const cost = one<{ c: number }>("SELECT COALESCE(SUM(cost),0) c FROM ai_calls WHERE job_id=?", jobId)!.c / 1e6;
fs.writeFileSync(out, JSON.stringify({ ...result, cost, seconds: (Date.now() - t0) / 1000 }, null, 1));
console.log(result.ok ? "OK" : `ÉCHEC : ${(result as any).error}`, `coût ${cost.toFixed(3)} €`);
if (result.ok) for (const a of (result as any).research.angles) console.log(`\n[${a.id}] ${a.title}\n  émotion : ${a.emotion}\n  cible : ${a.audience}\n  accroche : ${a.message}\n  preuves à confirmer : ${(a.proofsToConfirm ?? []).join(" | ") || "aucune"}\n  sources : ${a.sourceIds.join(", ")}`);
process.exit(0);
