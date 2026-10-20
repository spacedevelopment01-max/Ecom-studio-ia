import { expect, it } from "vitest";
import { fixture, simulatedDependencies, syntheticAsset } from "./preparation-fixtures";
import { blockers, initialize, queuePreparation, runPreparation, stateOf, editBrief } from "@/lib/preparation/engine";
import { completeJob, failJob, getJob, JobContext, retryJob, WORKER_ID } from "@/lib/jobs";
import { run } from "@/lib/db";
import { runForUser } from "@/lib/ai/access";

it.each([false, true])("reprise explicite du même travail : résultat acquis gardé ; retouche client protégée (%s)", async edited => {
  const f = await fixture();
  initialize(f.pid, f.input);
  const q = queuePreparation(f.pid, stateOf(f.pid)!.revision, "brief", "analyze", { paid: false, capMicro: 0 });
  let acquisitions = 0, first = true;
  const deps = { ...simulatedDependencies, async inspect(_p: any, brief: any, ctx: JobContext) {
    await ctx.step("142:acquired-media", async () => { acquisitions++; return syntheticAsset(f.pid); });
    if (first) { first = false; throw new Error("Incident simulé après conservation du média"); }
    return { ...brief, provenance: "simulation" as const, observations: ["Récupération simulée"] };
  } };
  const execute = async () => {
    run("UPDATE jobs SET status='running',locked_by=?,locked_until=?,attempts=attempts+1 WHERE id=?", WORKER_ID, Date.now()+90_000, q.job!.id);
    const ctx = new JobContext(getJob(q.job!.id)!);
    try { const r = await runForUser(f.uid, () => runPreparation(ctx, deps), "normal", f.pid); completeJob(ctx.job.id,r); }
    catch (e) { failJob(getJob(ctx.job.id)!,e,{permanent:true}); throw e; }
  };
  await expect(execute()).rejects.toThrow(/Incident simulé/);
  if (edited) editBrief(f.pid, stateOf(f.pid)!.revision, { ...f.input, description: "Texte retouché par le client après incident" });
  retryJob(q.job!.id);
  if (edited) {
    await expect(execute()).rejects.toThrow(/données ont changé/);
    expect(stateOf(f.pid)!.stages.brief!.data.input.description).toMatch(/retouché par le client/);
  } else {
    await execute();
    expect(getJob(q.job!.id)!.status).toBe("done");
    expect(stateOf(f.pid)!.stages.brief!.data.provenance).toBe("simulation");
    expect(stateOf(f.pid)!.pending).toBeUndefined();
  }
  expect(acquisitions).toBe(1);
});

it.each(["failed","cancelled","paused","missing"])("un pointeur de préparation %s ne promet pas un travail encore en cours", async status => {
  const f = await fixture(); initialize(f.pid,f.input);
  const q = queuePreparation(f.pid,stateOf(f.pid)!.revision,"brief","analyze",{paid:false,capMicro:0});
  if(status==="missing")run("DELETE FROM jobs WHERE id=?",q.job!.id);
  else run("UPDATE jobs SET status=? WHERE id=?",status,q.job!.id);
  expect(blockers(f.pid).join(" ")).not.toMatch(/encore en cours/);
  expect(blockers(f.pid).join(" ")).toMatch(status==="paused"?/pause/:/repris/);
});
