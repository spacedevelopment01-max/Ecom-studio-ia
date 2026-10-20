import { enqueue, failJob, getJob, JobContext, type Job } from "@/lib/jobs";
/** Real routes and worker boundary, simulated readiness/engine. No provider or social network called. */
import { describe, it, expect, vi } from "vitest";
import sharp from "sharp";
const state = vi.hoisted(() => ({
  user: null as any,
  ai: true,
  result: null as any,
}));
vi.mock("@/lib/auth", async (orig) => ({
  ...(await orig<any>()),
  currentUser: async () => state.user,
  requireUser: async () => state.user,
}));
vi.mock("@/lib/ai/access", async (orig) => ({
  ...(await orig<any>()),
  aiActiveFor: () => state.ai,
}));
vi.mock("@/lib/social-v2/ai-post", async (orig) => ({
  ...(await orig<any>()),
  publicationReadiness: async () => ({
    ready: true,
    mode: "one-step",
    reason: null,
  }),
}));
vi.mock("@/lib/ads-v2/engine", async (orig) => ({
  ...(await orig<any>()),
  runAdEngineV2: async () => state.result,
}));
import { createUser } from "@/lib/auth";
import { loadProject } from "@/lib/projects";
import { seedImageFixture, seedCutout } from "./image-v2-fixtures";
import { grantProjectPlan } from "@/lib/project-subscriptions";
import { one, run } from "@/lib/db";
import { saveAsset } from "@/lib/library";
import * as route from "@/app/api/projects/[id]/campaigns/v2/route";
import { campaignEstimate } from "@/lib/ads-v2/estimate";
import { handlers } from "../worker/handlers";
async function project() {
  const u = await createUser(
    `campaign-api-${crypto.randomUUID()}@test.invalid`,
    "motdepasse-test",
    "Test",
  );
  state.user = { ...u, role: "client" };
  const p = loadProject(seedImageFixture(u.id, "hightech"));
  grantProjectPlan(p.id, "vendre");
  await seedCutout(u.id, p.id);
  return p;
}
const jobContext = (p: { id: string; userId: string }) => {
  const j = enqueue({
    userId: p.userId,
    projectId: p.id,
    type: "ads.v2",
    payload: { projectId: p.id, request: {} },
  });
  run("UPDATE jobs SET status='running' WHERE id=?", j.id);
  return new JobContext(one<Job>("SELECT * FROM jobs WHERE id=?", j.id)!);
};
const post = (pid: string, b: unknown) =>
  route.POST(
    new Request(`http://localhost/api/projects/${pid}/campaigns/v2`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(b),
    }),
    { params: Promise.resolve({ id: pid }) },
  );
describe("Campagnes : devis, reprise HTTP et statut réel de la tâche", () => {
  it("quote compte concepts et destinations, accord obligatoire, plafond transmis à la file", async () => {
    const p = await project();
    const req = {
      count: 2,
      platforms: ["meta_feed"] as const,
      aspects: ["4:5"],
    };
    const q = await (
      await post(p.id, { action: "campaign_quote", ...req })
    ).json();
    expect(q.images).toBe(2);
    expect(q.estimateMicro).toBeGreaterThan(0);
    expect(q.capMicro).toBeGreaterThan(q.estimateMicro);
    expect((await post(p.id, { action: "generate", ...req })).status).toBe(409);
    const accepted = await post(p.id, {
      action: "generate",
      ...req,
      approvedEstimateMicro: q.estimateMicro,
      operationId: "network-retry-campaign",
    });
    expect(accepted.status).toBe(200);
    const a = await accepted.json();
    const again = await post(p.id, {
      action: "generate",
      ...req,
      approvedEstimateMicro: q.estimateMicro,
      operationId: "network-retry-campaign",
    });
    // An already running task is reported, never duplicated.
    expect(again.status).toBe(409);
    const job = one<{ payload: string }>(
      "SELECT payload FROM jobs WHERE id=?",
      a.jobId,
    )!;
    expect(JSON.parse(job.payload).costCapMicro).toBe(q.capMicro);
    run("UPDATE jobs SET status='done' WHERE id=?", a.jobId);
    const resumed = await (
      await post(p.id, {
        action: "generate",
        ...req,
        approvedEstimateMicro: q.estimateMicro,
        operationId: "network-retry-campaign",
      })
    ).json();
    expect(resumed.jobId).toBe(a.jobId);
  });
  it("création guidée : un renvoi HTTP utilise le même job ; une nouvelle intention garde une clé distincte", async () => {
    const p = await project();
    const q = await (await post(p.id, { action: "ai_quote" })).json();
    const req = {
      action: "ai_create",
      subject: { kind: "product", key: "main" },
      aspect: "2:3",
      request: "Objet documenté, aucun humain",
      approvedEstimateMicro: q.estimateMicro,
      operationId: "network-retry-image",
    };
    const a = await (await post(p.id, req)).json(),
      b = await (await post(p.id, req)).json();
    expect(a.jobId).toBeTruthy();
    expect(b.jobId).toBe(a.jobId);
    const c = await (
      await post(p.id, { ...req, operationId: "deliberate-new-image" })
    ).json();
    expect(c.jobId).not.toBe(a.jobId);
  });
  it("un aperçu local provisoire ne figure pas comme campagne IA prête", async () => {
    const p = await project();
    const data = await sharp({
      create: { width: 1080, height: 1350, channels: 3, background: "#234567" },
    })
      .png()
      .toBuffer();
    const draft = await saveAsset({
      projectId: p.id,
      userId: p.userId,
      data,
      name: "apercu-test.png",
      mime: "image/png",
      role: "ad",
      origin: "generated",
      status: "draft",
      meta: { aiAd: true, aiPost: {}, reformat: { method: "studio" } },
    });
    const r = await route.GET(new Request("http://localhost"), {
      params: Promise.resolve({ id: p.id }),
    });
    expect((await r.json()).aiAds.some((a: any) => a.id === draft.id)).toBe(
      false,
    );
  });
  it("le suivi terminal est relu après déconnexion, sans publications organiques ni tâche étrangère", async () => {
    const p=await project();
    const own=enqueue({userId:p.userId,projectId:p.id,type:"image.ai_post",payload:{request:{as:"ad",entryPoint:"ads-guided"}}});
    run("UPDATE jobs SET status='running' WHERE id=?",own.id);
    failJob(getJob(own.id)!,new Error("Fichier simulé non enregistré"),{permanent:true});
    enqueue({userId:p.userId,projectId:p.id,type:"image.ai_post",payload:{request:{as:"post"}}});
    const foreign=seedImageFixture(p.userId,"restaurant");
    enqueue({userId:p.userId,projectId:foreign,type:"image.ai_post",payload:{request:{as:"ad"}}});
    for(let i=0;i<2;i++){
      const r=await route.GET(new Request("http://localhost"),{params:Promise.resolve({id:p.id})});
      const data=await r.json();expect(data.aiJobs).toHaveLength(1);expect(data.aiJobs[0].id).toBe(own.id);expect(data.aiJobs[0].status).toBe("failed");expect(data.aiJobs[0].error).toBeTruthy();
    }
  });
  it("zéro image après refus du contrôle : le worker échoue et conserve la raison, sans faux ‘prêt’", async () => {
    const p = await project();
    state.result = {
      concepts: [{}],
      outcomes: [
        { assetId: null, reason: "logo non conforme", verdict: "REJECTED" },
      ],
      costMicro: 123,
      stats: {},
      stoppedByCostCap: false,
    };
    await expect(handlers["ads.v2"](jobContext(p))).rejects.toThrow(
      /logo non conforme/,
    );
  });
  it("succès partiel explicite : image utilisable conservée, blocage et coût retournés", async () => {
    const p = await project();
    const usable=await saveAsset({projectId:p.id,userId:p.userId,data:await sharp({create:{width:64,height:64,channels:3,background:"#234567"}}).png().toBuffer(),name:"publicite-simulee.png",mime:"image/png",role:"ad",origin:"generated",status:"ready",meta:{gate:{verdict:"FINAL"}}});
    state.result = {
      concepts: [{}],
      outcomes: [
        {
          assetId: usable.id,
          verdict: "FINAL",
          platform: "meta_feed",
          aspect: "4:5",
        },
        {
          assetId: null,
          reason: "plafond atteint",
          verdict: "REJECTED",
          platform: "meta_story",
          aspect: "9:16",
        },
      ],
      costMicro: 123,
      stats: {},
      stoppedByCostCap: true,
    };
    const r = (await handlers["ads.v2"](jobContext(p))) as any;
    expect(r.partial).toBe(true);
    expect(r.delivery.state).toBe("partial");
    expect(r.delivery.delivered).toBe(1);
    expect(r.delivery.expected).toBe(2);
    expect(r.costMicro).toBe(123);
    expect(r.outcomes[1].reason).toBe("plafond atteint");
  });
});
