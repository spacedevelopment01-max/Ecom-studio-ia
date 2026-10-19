import { describe, expect, it, vi } from "vitest";
let sessionUser: any = null;
vi.mock("@/lib/auth", async original => {
  const real = await original<typeof import("@/lib/auth")>();
  return { ...real, requireUser: async () => sessionUser ?? (() => { throw new real.HttpError(401, "Connexion requise"); })() };
});

describe("Création vidéo guidée : droits natifs, sans fournisseur", async () => {
  const { createUser } = await import("@/lib/auth");
  const { getSubscription, syncAllowance } = await import("@/lib/billing");
  const { all, run } = await import("@/lib/db");
  const { seedImageFixture } = await import("./image-v2-fixtures");
  const { saveAsset } = await import("@/lib/library");
  const route = await import("@/app/api/projects/[id]/creative/video/route");
  it("choisir une photo conserve le scénario déjà rédigé sans nouvelle tâche texte",async()=>{
    const {loadProject}=await import("@/lib/projects");const {enqueue,claimNext,completeJob}=await import("@/lib/jobs");
    const {videoScope,sceneApprovalRequest}=await import("@/lib/video-v2/approval");const {localScenePlan}=await import("@/lib/video-v2/three-scenes");
    const u=await createUser(`scenario-photo-${crypto.randomUUID()}@test.invalid`,"motdepasse-test","Fixture");sessionUser=u;
    const pid=seedImageFixture(u.id,"hightech"),p=loadProject(pid),request={as:"post" as const,scenes:3,totalS:15};
    getSubscription(u.id);run("UPDATE subscriptions SET status='active',plan='creer' WHERE user_id=?",u.id);syncAllowance(u.id);
    const scenario=localScenePlan(p,null,request);scenario.scenes[0].title="Titre conservé";
    const j=enqueue({userId:u.id,projectId:pid,type:"video.scenario",label:"Scénario simulé",payload:{request}});
    expect(claimNext(["video.scenario"])?.id).toBe(j.id);completeJob(j.id,{scenario,scope:videoScope(p,sceneApprovalRequest(request))});
    const photo=await saveAsset({projectId:pid,userId:u.id,data:Buffer.from("photo simulée"),name:"source.jpg",mime:"image/jpeg",role:"scene",origin:"upload"});
    // A scene photo is not a stable original product reference: it changes only the selected image.
    const response=await route.POST(new Request("http://localhost",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"plan",...request,sceneImages:[{assetId:photo.id,use:"reuse"}],draftPlan:scenario,scenarioJobId:j.id})}),{params:Promise.resolve({id:pid})});
    const next=await response.json();expect(response.status,JSON.stringify(next)).toBe(200);expect(next.scenario.scenes[0].title).toBe("Titre conservé");expect(next.approvalToken).toBeTruthy();
    expect(all("SELECT id FROM jobs WHERE project_id=? AND type='video.scenario'",pid)).toHaveLength(1);
  });
  it("expose le document conservé après échec du premier encodage, puis retire la carte d'erreur après rendu",async()=>{
    const {loadProject}=await import("@/lib/projects");const {buildSceneDoc,localScenePlan}=await import("@/lib/video-v2/three-scenes");const {saveVideoVersion}=await import("@/lib/video-v2/store");
    const u=await createUser(`resume-encode-${crypto.randomUUID()}@test.invalid`,"motdepasse-test","Fixture");sessionUser=u;const pid=seedImageFixture(u.id,"restaurant"),p=loadProject(pid);
    const request={as:"post" as const,key:"fixture-first-encode"};const docKey=`vid:${(await import("node:crypto")).default.createHash("sha256").update(request.key).digest("hex").slice(0,20)}`;
    const {enqueue}=await import("@/lib/jobs");const job=enqueue({userId:u.id,projectId:pid,type:"video.scenes",label:"Échec simulé",payload:{request}});run("UPDATE jobs SET status='failed',error='Encodeur interrompu' WHERE id=?",job.id);
    const plan=localScenePlan(p,null,request),doc=buildSceneDoc(p,[0,1,2].map(k=>({assetId:`source${k}`,durationS:5,generated:false})),plan,"9:16","post");saveVideoVersion(pid,docKey,doc);
    const ctx={params:Promise.resolve({id:pid})},get=()=>route.GET(new Request("http://localhost"),ctx);
    expect((await(await get()).json()).drafts[0].docKey).toBe(docKey);
    saveVideoVersion(pid,docKey,doc,{renderedAssetId:"fixture-rendered"});expect((await(await get()).json()).drafts).toHaveLength(0);
    expect(all("SELECT id FROM jobs WHERE project_id=?",pid)).toHaveLength(1);
  });
  it("devis consultable, création refusée sans forfait même pour montage gratuit ; propriétaire payé accepté, étranger refusé", async () => {
    const u = await createUser(`video-droits-${crypto.randomUUID()}@test.fr`, "motdepasse-test", "Test isolé");
    sessionUser = u;
    const pid = seedImageFixture(u.id, "restaurant");
    const ctx = { params: Promise.resolve({ id: pid }) };
    let approvedEstimateMicro: number | undefined;let approvalToken:string|undefined;
    const req = (action: string) => new Request(`http://localhost/api/projects/${pid}/creative/video`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, as: "ad", scenes: 3, totalS: 15, approvedEstimateMicro,approvalToken }) });
    expect((await route.POST(req("quote"), ctx)).status).toBe(200);
    expect((await route.POST(req("create"), ctx)).status).toBe(402);
    expect(all("SELECT id FROM jobs WHERE project_id = ?", pid)).toHaveLength(0);
    getSubscription(u.id);
    run("UPDATE subscriptions SET status='active', plan='creer' WHERE user_id = ?", u.id);
    syncAllowance(u.id);
    approvedEstimateMicro = (await (await route.POST(req("quote"), ctx)).json()).estimateMicro;
    approvalToken=(await(await route.POST(req("plan"),ctx)).json()).approvalToken;
    expect((await route.POST(req("create"), ctx)).status).toBe(200);
    expect(all("SELECT id FROM jobs WHERE project_id = ? AND type='video.scenes'", pid)).toHaveLength(1);
    await saveAsset({ projectId: pid, userId: u.id, data: Buffer.from("fichier simulé, aucun encodage testé ici"), name: "simulation.mp4", mime: "video/mp4", role: "video", origin: "import", status: "review", meta: { scenes: { as: "ad" }, creative: { notes: ["Voix indisponible"] }, finalCheck: { summary: { unchecked: ["Fidélité produit"], issues: [{ detail: "Scènes trop proches" }] } } } });
    const listed = await (await route.GET(new Request(`http://localhost/api/projects/${pid}/creative/video`), ctx)).json();
    expect(listed.videos[0]).toMatchObject({ reviewRequired: true });
    expect(listed.videos[0].warnings).toEqual(expect.arrayContaining(["Voix indisponible", "Scènes trop proches", "Non vérifié : Fidélité produit"]));
    sessionUser = await createUser(`video-etranger-${crypto.randomUUID()}@test.fr`, "motdepasse-test", "Étranger isolé");
    expect((await route.POST(req("quote"), ctx)).status).toBe(404);
  });
});
