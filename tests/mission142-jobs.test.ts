import { afterAll, describe, expect, it, vi } from "vitest";
const isolated = vi.hoisted(() => {
  const fs = process.getBuiltinModule("fs"), path = process.getBuiltinModule("path"), os = process.getBuiltinModule("os");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ecs-test-142-jobs-"));
  vi.stubEnv("DATA_DIR", dir);
  return { dir };
});
afterAll(() => {
  (globalThis as { __ecomDb?: { close(): void } }).__ecomDb?.close();
  delete (globalThis as { __ecomDb?: unknown }).__ecomDb;
  vi.unstubAllEnvs();
  process.getBuiltinModule("fs").rmSync(isolated.dir, { recursive: true, force: true });
});
import { createUser } from "@/lib/auth";
import { all, run } from "@/lib/db";
import { claimNext, completeJob, enqueue, getJob, JobContext, LeaseLost, retryJob } from "@/lib/jobs";
let count = 0;
const user = () => createUser(`jobs-142-${++count}@example.invalid`, "isolated-test-password", "Jobs test");

describe("Mission 142 : suivi et isolation des tâches", () => {
  it.each(["queued","blocked"])("la récupération des acquis n'active aucun travail dépendant %s potentiellement payant",async status=>{
    const u=await user(),j=enqueue({userId:u.id,type:"test142.recover"}),child=enqueue({userId:u.id,type:"test142.child",dependsOn:[j.id]});
    run("UPDATE jobs SET status='failed',checkpoint=? WHERE id=?",JSON.stringify({acquired:"asset-kept"}),j.id);
    run("UPDATE jobs SET status=? WHERE id=?",status,child.id);retryJob(j.id,{recoveryOnly:true});
    expect(getJob(j.id)!.status).toBe("queued");expect(JSON.parse(getJob(j.id)!.payload).recoveryOnly).toBe(true);
    expect(JSON.parse(getJob(j.id)!.checkpoint).acquired).toBe("asset-kept");expect(getJob(child.id)!.status).toBe("blocked");
  });
  it("deux comptes utilisant la même clé ne récupèrent jamais le travail de l'autre", async () => {
    const a = await user(), b = await user();
    const first = enqueue({ userId: a.id, type: "test142.idempotence", idempotencyKey: "double-click" });
    const second = enqueue({ userId: b.id, type: "test142.idempotence", idempotencyKey: "double-click" });
    expect(second.user_id).toBe(b.id);
    expect(second.id).not.toBe(first.id);
    expect(enqueue({ userId: b.id, type: second.type, idempotencyKey: "double-click" }).id).toBe(second.id);
  });
  it("un prérequis disparu est bloqué avec un message visible plutôt qu'attendu pour toujours", async () => {
    const u = await user();
    expect(()=>enqueue({ userId: u.id, type: "test142.missing", dependsOn: ["missing-step"] })).toThrow();
    const job=enqueue({ userId: u.id, type: "test142.missing" });
    run("UPDATE jobs SET depends_on=? WHERE id=?",JSON.stringify(["missing-step"]),job.id);
    expect(claimNext([job.type])).toBeNull();
    expect(getJob(job.id)?.status).toBe("blocked");
    expect(getJob(job.id)?.message).toBeTruthy();
  });
  it("un prérequis appartenant à un autre client ne déclenche pas son travail", async () => {
    const a = await user(), b = await user();
    const foreign = enqueue({ userId: a.id, type: "test142.foreign" });
    run("UPDATE jobs SET status='done' WHERE id=?", foreign.id);
    expect(()=>enqueue({ userId: b.id, type: "test142.dep", dependsOn: [foreign.id] })).toThrow();
    const job = enqueue({ userId: b.id, type: "test142.dep" });
    run("UPDATE jobs SET depends_on=? WHERE id=?",JSON.stringify([foreign.id]),job.id);
    expect(claimNext([job.type])).toBeNull();
    expect(getJob(job.id)?.status).toBe("blocked");
  });
  it("deux notifications de fin d'une même reprise ne sont pas envoyées", async () => {
    const u = await user(), job = enqueue({ userId: u.id, type: "test142.complete" });
    claimNext([job.type]);
    completeJob(job.id, { notice: "Résultat conservé" });
    completeJob(job.id, { notice: "Résultat conservé" });
    expect(all("SELECT id FROM notifications WHERE user_id=?", u.id)).toHaveLength(1);
  });
  it("un ancien exécuteur ne modifie plus un travail terminé après libération de son bail", async () => {
    const u = await user(), job = enqueue({ userId: u.id, type: "test142.stale" });
    const ctx = new JobContext(claimNext([job.type])!);
    ctx.save("accepted", { assetId: "kept" });
    completeJob(job.id, { assetId: "kept" });
    expect(() => ctx.save("accepted", { assetId: "stale" })).toThrow(LeaseLost);
    expect(JSON.parse(getJob(job.id)!.checkpoint).accepted.assetId).toBe("kept");
  });
  it("relancer un échec retire sa date de fin précédente et conserve les étapes acquises", async () => {
    const u = await user(), job = enqueue({ userId: u.id, type: "test142.retry" });
    run("UPDATE jobs SET status='failed',finished_at=?,checkpoint=? WHERE id=?", Date.now(), JSON.stringify({ accepted: "kept" }), job.id);
    retryJob(job.id);
    expect(getJob(job.id)?.finished_at).toBeNull();
    expect(JSON.parse(getJob(job.id)!.checkpoint).accepted).toBe("kept");
  });
});
it("un code métier persiste après échec sans exposer les checkpoints acquis ni leur contenu privé",async()=>{
 const {failJob,UserFacingError,publicJob}=await import("@/lib/jobs");const u=await user(),j=enqueue({userId:u.id,type:"test142.business-code"});run("UPDATE jobs SET status='running',checkpoint=? WHERE id=?",JSON.stringify({acquired:"PRIVATE_ACQUIRED_RESULT"}),j.id);
 failJob(getJob(j.id)!,new UserFacingError("Reçu conservé : vérifiez le stockage.","VIDEO_RECEIPT_UNREADABLE"));
 const stored=getJob(j.id)!;expect(JSON.parse(stored.checkpoint).acquired).toBe("PRIVATE_ACQUIRED_RESULT");expect(publicJob(stored).failureCode).toBe("VIDEO_RECEIPT_UNREADABLE");expect(JSON.stringify(publicJob(stored))).not.toContain("PRIVATE_ACQUIRED_RESULT");
 run("UPDATE jobs SET status='running' WHERE id=?",j.id);failJob(getJob(j.id)!,new UserFacingError("Autre échec sans code"));expect(publicJob(getJob(j.id)!).failureCode).toBeUndefined();expect(JSON.parse(getJob(j.id)!.checkpoint).acquired).toBe("PRIVATE_ACQUIRED_RESULT");
});
