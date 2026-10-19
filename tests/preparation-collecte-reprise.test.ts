/** Reprise du vrai orchestrateur, médias/fournisseurs injectés : aucun appel réel. */
import { it, expect } from "vitest";
import { fixture, initializeSynthetic, simulatedDependencies, syntheticAsset } from "./preparation-fixtures";
import { approve, confirmIdentity, queuePreparation, runPreparation, stateOf } from "@/lib/preparation/engine";
import { createQuote } from "@/lib/preparation/quote";
import { runForUser } from "@/lib/ai/access";
import { JobContext, getJob, completeJob, failJob } from "@/lib/jobs";
import { all, run } from "@/lib/db";
import type { Dependencies } from "@/lib/preparation/deps";
import type { Step } from "@/lib/preparation/types";

it.each(["products", "services"] as const)("collecte %s : avancement sauvé avant échec, seuls les manques repris, aucun double achat", async business => {
  const f = await fixture(business); initializeSynthetic(f.pid, f.input);
  const execute = async (step: Step, action: "generate" | "logo" | "collect", deps = simulatedDependencies, correction?: string) => {
    const queued = queuePreparation(f.pid, stateOf(f.pid)!.revision, step, action, { paid: false, capMicro: 0, correction });
    if (!queued.job) return queued;
    run("UPDATE jobs SET status='running',attempts=1 WHERE id=?", queued.job.id);
    const ctx = new JobContext(getJob(queued.job.id)!);
    try { const r = await runForUser(f.uid, () => runPreparation(ctx, deps), "normal", f.pid); completeJob(ctx.job.id, r); return r; }
    catch (e) { failJob(getJob(ctx.job.id)!, e, { permanent: true }); throw e; }
  };
  const accept = (step: Step, opts = {}) => approve(f.pid, stateOf(f.pid)!.revision, step, opts);
  accept("brief"); await execute("research", "generate"); accept("research", { choiceId: "transparence" });
  await execute("brand", "generate");
  const brand = stateOf(f.pid)!.stages.brand!.data.proposal;
  confirmIdentity(f.pid, stateOf(f.pid)!.revision, { name: brand.name, tagline: brand.tagline });
  await execute("brand", "logo"); accept("brand", { logoId: stateOf(f.pid)!.stages.brand!.data.logoCandidates[0] });
  await execute("content", "generate"); accept("content");
  const calls: string[] = []; let outage = true;
  const deps: Dependencies = { ...simulatedDependencies, async image(p, _ctx, slot) {
    calls.push(slot.key);
    if (outage && slot.key === "final:image:3") { outage = false; throw new Error("Fournisseur simulé indisponible après deux résultats acceptés."); }
    const receipt = { ...slot, alignment: { status: "accepted", reason: "Contrôle injecté, pas qualité réelle" } };
    return syntheticAsset(p.id, slot.key, "generated", { preparation: { reviewedSlot: receipt } });
  } };
  await expect(execute("media", "collect", deps)).rejects.toThrow(/indisponible/);
  expect(stateOf(f.pid)!.stages.media!.data.slots.filter(s => s.assetId)).toHaveLength(2);
  const first = stateOf(f.pid)!.stages.media!.data.slots[0].assetId;
  expect(stateOf(f.pid)!.pending).toBeUndefined();
  await execute("media", "collect", deps, "Reprendre les seuls emplacements non terminés après rétablissement du fournisseur.");
  const slots = stateOf(f.pid)!.stages.media!.data.slots;
  expect(slots.filter(s=>s.kind!=="video").every(s => s.assetId && s.alignment?.status === "accepted")).toBe(true);
  expect(slots.filter(s=>s.kind==="video").every(s=>s.source==="ai"&&!s.assetId)).toBe(true); // clips séparés : aucun appel caché dans la collecte d’images
  expect(slots[0].assetId).toBe(first);
  expect(calls.filter(x => x === "final:image:1")).toHaveLength(1);
  expect(calls.filter(x => x === "final:image:2")).toHaveLength(1);
  expect(calls.filter(x => x === "final:image:3")).toHaveLength(2);
  expect(slots).toHaveLength(business === "products" ? 11 : 12);
  const before = all("SELECT id FROM jobs WHERE project_id=?", f.pid).length;
  expect(createQuote(f.pid, "media", "collect")).toMatchObject({ paid: false, maxBudgetPct: 0 });
  expect(await execute("media", "collect", deps)).toHaveProperty("reused", true);
  expect(all("SELECT id FROM jobs WHERE project_id=?", f.pid)).toHaveLength(before);
  expect(all("SELECT id FROM ai_calls WHERE project_id=?", f.pid)).toEqual([]);
  expect(all("SELECT id FROM theme_versions WHERE project_id=?", f.pid)).toEqual([]);
});
