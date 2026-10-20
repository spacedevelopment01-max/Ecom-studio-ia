import { expect, it } from "vitest";
import { fixture, simulatedDependencies, syntheticAsset } from "./preparation-fixtures";
import { blockers, initialize, queuePreparation, recoverablePreparation, recoverPreparation, runPreparation, stateOf, editBrief } from "@/lib/preparation/engine";
import { completeJob, failJob, getJob, JobContext, retryJob, WORKER_ID } from "@/lib/jobs";
import { all, run } from "@/lib/db";
import { reserve } from "@/lib/billing";
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
  if (edited) {
    expect(recoverablePreparation(f.pid)).toBeNull();
    expect(() => recoverPreparation(f.pid,stateOf(f.pid)!.revision)).toThrow(/changé/);
    retryJob(q.job!.id);
    await expect(execute()).rejects.toThrow(/données ont changé/);
    expect(stateOf(f.pid)!.stages.brief!.data.input.description).toMatch(/retouché par le client/);
  } else {
    expect(recoverablePreparation(f.pid)?.id).toBe(q.job!.id);
    recoverPreparation(f.pid,stateOf(f.pid)!.revision);
    expect(JSON.parse(getJob(q.job!.id)!.payload).recoveryOnly).toBe(true);
    await execute();
    expect(getJob(q.job!.id)!.status).toBe("done");
    expect(stateOf(f.pid)!.stages.brief!.data.provenance).toBe("simulation");
    expect(stateOf(f.pid)!.pending).toBeUndefined();
  }
  expect(acquisitions).toBe(1);
});

it("la récupération d'un acquis manquant bloque tout nouvel engagement et conserve le brief",async()=>{
  const f=await fixture();initialize(f.pid,f.input);
  const q=queuePreparation(f.pid,stateOf(f.pid)!.revision,"brief","analyze",{paid:false,capMicro:0});
  let first=true,providerCalls=0;
  const deps={...simulatedDependencies,async inspect(){if(first){first=false;throw Error("Incident avant résultat");}reserve(f.uid,1,{task:"copywriting",provider:"synthetic",model:"test-rate",projectId:f.pid});providerCalls++;throw Error("Ne doit pas être atteint");}};
  const execute=async()=>{run("UPDATE jobs SET status='running',locked_by=?,locked_until=? WHERE id=?",WORKER_ID,Date.now()+90000,q.job!.id);const ctx=new JobContext(getJob(q.job!.id)!);try{return await runForUser(f.uid,()=>runPreparation(ctx,deps),"normal",f.pid);}catch(e){failJob(getJob(ctx.job.id)!,e,{permanent:true});throw e;}};
  await expect(execute()).rejects.toThrow(/Incident avant/);recoverPreparation(f.pid,stateOf(f.pid)!.revision);
  await expect(execute()).rejects.toThrow(/nouvel essai nécessite son devis/);
  expect(providerCalls).toBe(0);expect(all("SELECT id FROM ai_reservations WHERE project_id=?",f.pid)).toHaveLength(0);
  expect(stateOf(f.pid)!.stages.brief!.data.input).toEqual(f.input);
});

it.each(["failed","cancelled","paused","missing"])("un pointeur de préparation %s ne promet pas un travail encore en cours", async status => {
  const f = await fixture(); initialize(f.pid,f.input);
  const q = queuePreparation(f.pid,stateOf(f.pid)!.revision,"brief","analyze",{paid:false,capMicro:0});
  if(status==="missing")run("DELETE FROM jobs WHERE id=?",q.job!.id);
  else run("UPDATE jobs SET status=? WHERE id=?",status,q.job!.id);
  expect(blockers(f.pid).join(" ")).not.toMatch(/encore en cours/);
  expect(blockers(f.pid).join(" ")).toMatch(status==="paused"?/pause/:/repris/);
});
