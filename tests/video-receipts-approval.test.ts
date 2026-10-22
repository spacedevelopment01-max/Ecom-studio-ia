import {describe,it,expect,vi} from "vitest";
import {videoReceipt} from "@/lib/video-v2/receipts";
import {approveVideoScenario,readVideoApproval,sceneApprovalRequest} from "@/lib/video-v2/approval";
import {createUser} from "@/lib/auth";
import {loadProject} from "@/lib/projects";
import {run} from "@/lib/db";
import {seedImageFixture} from "./image-v2-fixtures";
import {rememberPreference} from "@/lib/video-v2/creative-memory";
describe("Reçus et accords vidéo, aucun fournisseur réel",()=>{
 it("un contrôle sans identité confirmée ou avec une marque tierce ne valide pas le plan",async()=>{
  const {gateShot}=await import("@/lib/video-v2/quality");
  const review={score:9,sameProduct:null,productAltered:false,characterConsistent:null,offTopic:false,artifacts:false,personVisible:false,issues:[]};
  expect(gateShot({review,expectsProduct:true,expectsCharacter:false,attempt:0}).verdict).not.toBe("FINAL");
  const rejected=gateShot({review:{...review,sameProduct:true,foreignBrands:["marque étrangère fictive"]},expectsProduct:true,expectsCharacter:false,attempt:0});
  expect(rejected.fatal).toBe(true);expect(rejected.verdict).toBe("REJECTED");
 });

 it("un fichier reçu est récupéré après interruption avant persistance de l'asset",async()=>{
  const project=`fixture-${crypto.randomUUID()}`,key="clip-received";
  const provider=vi.fn(async()=>Buffer.from("résultat simulé"));
  expect((await videoReceipt(project,key,provider)).toString()).toBe("résultat simulé");
  expect((await videoReceipt(project,key,provider)).toString()).toBe("résultat simulé");
  expect(provider).toHaveBeenCalledTimes(1);
 });
 it("un résultat incertain reste bloqué même si le worker est relancé",async()=>{
  const project=`fixture-${crypto.randomUUID()}`;
  const provider=vi.fn(async()=>{throw new Error("réponse perdue après envoi");});
  await expect(videoReceipt(project,"unknown",provider)).rejects.toThrow("réponse perdue");
  await expect(videoReceipt(project,"unknown",provider)).rejects.toThrow(/incertain/);
  expect(provider).toHaveBeenCalledTimes(1);
 });
 it("une annulation après envoi n'autorise pas de réémission sans rapprochement",async()=>{
  const {JobCancelled}=await import("@/lib/jobs");const project=`fixture-${crypto.randomUUID()}`;
  const provider=vi.fn(async()=>{throw new JobCancelled("Annulé pendant le traitement distant");});
  await expect(videoReceipt(project,"cancel",provider)).rejects.toBeInstanceOf(JobCancelled);
  await expect(videoReceipt(project,"cancel",provider)).rejects.toThrow(/incertain/);
  expect(provider).toHaveBeenCalledTimes(1);
 });
 it("deux workers ne peuvent envoyer simultanément la même étape",async()=>{
  const project=`fixture-${crypto.randomUUID()}`;let finish!:(b:Buffer)=>void;
  const pending=videoReceipt(project,"exclusive",()=>new Promise(resolve=>{finish=resolve;}));
  const second=vi.fn(async()=>Buffer.from("second"));
  await expect(videoReceipt(project,"exclusive",second)).rejects.toThrow(/concurrent/);
  finish(Buffer.from("premier"));await pending;expect(second).not.toHaveBeenCalled();
 });
 it("un accord couvre la demande et la voix exactes du projet",async()=>{
  const u=await createUser(`scope-${crypto.randomUUID()}@test.invalid`,"motdepasse-test","Fixture");
  const p=loadProject(seedImageFixture(u.id,"hightech")),request=sceneApprovalRequest({as:"ad",scenes:4,totalS:20});
  const signed=approveVideoScenario(p,request,{scenes:["Scénario exact"]},100);
  expect(readVideoApproval(p,request,signed.token).scenario).toEqual({scenes:["Scénario exact"]});
  expect(()=>readVideoApproval(p,{...request,totalS:30},signed.token)).toThrow(/Scénario/);
  expect(()=>readVideoApproval(p,request,signed.token.slice(0,-1)+"x")).toThrow(/Scénario/);
  rememberPreference(p.id,"voice","on");
  expect(()=>readVideoApproval(p,request,signed.token)).toThrow(/Scénario/);
 });
 it("l'accord du projet reste valable quand le moteur cible une autre prestation",async()=>{
  const u=await createUser(`scope-subject-${crypto.randomUUID()}@test.invalid`,"motdepasse-test","Fixture"),p=loadProject(seedImageFixture(u.id,"restaurant"));
  (await import("./communication-choice-fixture")).grantProjectPlan(p.id,"dominer");
  const {runVideoEngineV2}=await import("@/lib/video-v2/engine");const {mockVideoDeps}=await import("./video-v2-mock");const {deps}=mockVideoDeps({userId:p.userId,projectId:p.id});
  const ask={subject:{kind:"service" as const,name:p.services!.services[1].name},text:"Présenter cette prestation.",purpose:"organic" as const};const plan=await runVideoEngineV2(null,p.id,{ask,planOnly:true},deps);const signed=approveVideoScenario(p,{ask,offer:null},plan.script,1000000);
  const approved=await runVideoEngineV2(null,p.id,{ask,approval:signed.approval,planOnly:true},deps);expect(approved.script).toEqual(plan.script);expect(approved.strategy.message).toBe(plan.strategy.message);
 });
 it("un changement de marque invalide l'accord avant les fournisseurs",async()=>{
  const u=await createUser(`scope-brand-${crypto.randomUUID()}@test.invalid`,"motdepasse-test","Fixture");
  const p=loadProject(seedImageFixture(u.id,"restaurant")),request=sceneApprovalRequest({as:"post"});
  const signed=approveVideoScenario(p,request,{},0);
  run("UPDATE projects SET brand_json=json_set(brand_json,'$.name','Marque corrigée') WHERE id=?",p.id);
  expect(()=>readVideoApproval(loadProject(p.id),request,signed.token)).toThrow(/Scénario/);
 });
});

it("stockage plein avant tout envoi : seul le reçu créé par ce processus est retiré, puis reprise possible",async()=>{
 const fs=await import("node:fs"),{DATA_DIR}=await import("@/lib/db"),path=await import("node:path"),crypto=await import("node:crypto");
 const project=`fixture-${crypto.randomUUID()}`,key="disk-before-send",provider=vi.fn(async()=>Buffer.from("simulation reçue"));
 const writing=vi.spyOn(fs.default,"writeFileSync").mockImplementationOnce((...args:any[])=>{expect(typeof args[0]).toBe("number");throw Object.assign(new Error("isolated ENOSPC"),{code:"ENOSPC"});});
 try {await expect(videoReceipt(project,key,provider)).rejects.toThrow(/aucun plan envoyé/);}finally{writing.mockRestore();}
 expect(provider).not.toHaveBeenCalled();
 const dir=path.join(DATA_DIR,"video-receipts",crypto.createHash("sha256").update(project).digest("hex"));expect(fs.readdirSync(dir)).toEqual([]);
 expect((await videoReceipt(project,key,provider)).toString()).toBe("simulation reçue");expect(provider).toHaveBeenCalledTimes(1);
});
it("un ancien reçu tronqué n’est ni supprimé ni rejoué comme s’il n’avait jamais été envoyé",async()=>{
 const fs=await import("node:fs"),path=await import("node:path"),crypto=await import("node:crypto"),{DATA_DIR}=await import("@/lib/db");
 const project=`fixture-${crypto.randomUUID()}`,key="truncated-receipt",hash=crypto.createHash("sha256").update(`${project}:${key}`).digest("hex"),dir=path.join(DATA_DIR,"video-receipts",crypto.createHash("sha256").update(project).digest("hex"));
 fs.mkdirSync(dir,{recursive:true});const file=path.join(dir,`${hash}.json`);fs.writeFileSync(file,'{"state":');const provider=vi.fn(async()=>Buffer.from("must not send"));
 await expect(videoReceipt(project,key,provider)).rejects.toThrow(/Reçu vidéo illisible/);expect(provider).not.toHaveBeenCalled();expect(fs.readFileSync(file,"utf8")).toBe('{"state":');
});
