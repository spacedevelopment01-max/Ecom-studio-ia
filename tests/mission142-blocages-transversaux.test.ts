/** Native receipts, job state, free correction API, resume and decoded file delivery.
 * Text/image/review transports and readiness are simulated; no supplier/paid request is possible. */
import {afterAll,beforeAll,expect,it,vi} from "vitest";
import sharp from "sharp";
const session=vi.hoisted(()=>({user:null as any}));
vi.mock("@/lib/auth",async original=>({...await original<any>(),requireUser:async()=>session.user,currentUser:async()=>session.user}));
vi.mock("@/lib/social-v2/ai-post",async original=>({...await original<any>(),publicationReadiness:async()=>({ready:true,mode:"one-step",reason:null})}));
import {createUser} from "@/lib/auth";
import {seedImageFixture,seedCutout} from "./image-v2-fixtures";
import {campaignConcept,campaignVerdict} from "./publication-fixtures";
import {loadProject,saveProduct} from "@/lib/projects";
import {grantProjectPlan} from "./communication-choice-fixture";
import {run,one,all,json} from "@/lib/db";
import {enqueue,getJob,claimNext,WORKER_ID,JobContext,completeJob,failJob,markFinished} from "@/lib/jobs";
import {designPostWithAi,projectForSubject,type AiPostDeps} from "@/lib/social-v2/ai-post";
import {resolveSubject} from "@/lib/creative-subject";
import {publicationCopyIssues} from "@/lib/social-v2/publication-copy-policy";
import {generateAiPostImage} from "@/lib/engine/ai-post-image";
import {GET,POST} from "@/app/api/projects/[id]/images/copy-review/route";
import {getAsset} from "@/lib/library";
import {storagePath} from "@/lib/storage";
import fs from "node:fs";
beforeAll(()=>vi.stubGlobal("fetch",async()=>{throw Error("No external/provider network in isolated tests");}));
afterAll(()=>vi.unstubAllGlobals());
async function fixture(kind:"hightech"|"restaurant"|"saas"|"artisan"="hightech") {
 const user=await createUser(`guards142-${crypto.randomUUID()}@example.invalid`,"isolated-password","Fictif");session.user={...user,role:"client"};run("UPDATE users SET role='client' WHERE id=?",user.id);
 const pid=seedImageFixture(user.id,kind);grantProjectPlan(pid,"dominer");if(kind==="hightech"||kind==="saas")await seedCutout(user.id,pid);
 return {user,pid,p:loadProject(pid)};
}
const post={id:"guards142",network:"instagram",format:"image",title:"Présenter simplement",caption:"",pillar:null,objective:"sell",headline:"Présenter simplement",scheduled_at:null};
function transports(subline="Sans prix inventé") {
 const calls={copy:0,image:0,review:0};
 const deps:AiPostDeps={copy:async()=>{calls.copy++;return {headline:"Un projet à découvrir",subline,cta:"Découvrir",scene:"Documented subject, coherent side lighting",concept:campaignConcept()};},generate:async()=>{calls.image++;return sharp({create:{width:1080,height:1350,channels:3,background:"#335544"}}).png().toBuffer();},review:async(_img,_ref,texts)=>{calls.review++;return {...campaignVerdict(),productFaithful:true,textsExact:true,legible:true,score:9.2,issues:[],fix:"",person:false,anatomyOk:true,transcribed:texts};},spentMicro:()=>calls.copy*20000+calls.image*40000,maxMicro:()=>40000,conceptMaxMicro:()=>20000,reviewMaxMicro:()=>10000};
 return {calls,deps};
}
const options=(reference:string|null)=>({as:"ad" as const,aspect:"4:5" as const,maxCostEur:1,reference});
it.each(["hightech","restaurant","saas","artisan"] as const)("%s : demande simple, prix facultatif inconnu, sortie native conservée et réutilisable",async kind=>{
 const f=await fixture(kind),ref=resolveSubject(f.p,null)?.referenceAssetId??null,d=transports();
 const r=await designPostWithAi(f.p,post,options(ref),d.deps);expect(r.assetId,r.note).toBeTruthy();
 d.deps.maxMicro=()=>null;d.deps.copy=async()=>{throw Error("Already acquired copy must not be called again");};
 const resumed=await designPostWithAi(loadProject(f.pid),post,options(ref),d.deps);expect(resumed.assetId).toBe(r.assetId);expect(d.calls).toEqual({copy:1,image:1,review:1});
});
it.each(["Votre avis compte","Le meilleur de vos journées","de meilleurs moments","Découvrez Best"])("formulation légitime %s : pas de faux refus global par mot-clé",async text=>{
 const {p}=await fixture();p.brand!.name="Best";
 expect(publicationCopyIssues(p,{headline:text,subline:"",cta:""},"",[])).toEqual([]);
});
it.each(["50 % de remise","1 250 € seulement","1250 EUR seulement","5 étoiles","Le meilleur casque","Votre avis : 98 % garantis"])("assertion non confirmée %s : garde conservé",async text=>{
 const {p}=await fixture();expect(publicationCopyIssues(p,{headline:text,subline:"",cta:""},"",[]).length).toBeGreaterThan(0);
});
it("un prix avec espace de milliers ne se confond pas avec son suffixe",async()=>{
 const {p}=await fixture();p.product.price={amount:25000,currency:"EUR",status:"confirmed"};
 expect(publicationCopyIssues(p,{headline:"1 250 €",subline:"",cta:""},"250 €",[])[0].code).toBe("COMMERCIAL_NUMBER_UNCONFIRMED");
 p.product.price.amount=125000;expect(publicationCopyIssues(p,{headline:"1 250 €",subline:"",cta:""},"1250 EUR",[])).toEqual([]);
});
it("références incompatibles, mise en page absente et plafond trop faible : zéro rédaction achetée, aucun reçu pending",async()=>{
 const f=await fixture(),ref=resolveSubject(f.p,null)!.referenceAssetId,d=transports();
 d.deps.maxMicro=()=>null;
 expect((await designPostWithAi(f.p,post,options(ref),d.deps)).code).toBe("ESSENTIAL_REFERENCES_NO_COMPATIBLE_MODEL");
 d.deps.maxMicro=()=>40000;
 expect((await designPostWithAi(f.p,post,{...options(ref),mode:"two-step"},d.deps)).code).toBe("LAYOUT_STAGE_UNAVAILABLE");
 expect((await designPostWithAi(f.p,post,{...options(ref),maxCostEur:.001},d.deps)).code).toBe("CREATIVE_CAP_BEFORE_COPY");
 expect(d.calls).toEqual({copy:0,image:0,review:0});expect(all("SELECT id FROM memory WHERE project_id=? AND scope='publication-receipts'",f.pid)).toHaveLength(0);
 const recovered=await designPostWithAi(f.p,post,options(ref),d.deps);expect(recovered.assetId,recovered.note).toBeTruthy();
});
it("choix explicite disparu : images, publications et vidéos ne changent jamais de sujet en silence",async()=>{
 const f=await fixture();expect(()=>resolveSubject(f.p,{kind:"product",key:"removed"})).toThrow(/choisissez/);
 const s=await fixture("restaurant");expect(()=>resolveSubject(s.p,{kind:"service",name:"service supprimé"})).toThrow(/choisissez/);
 expect(resolveSubject(s.p,undefined)?.name).toBeTruthy();
});
async function execute(jid:string,deps:AiPostDeps) {
 const original=getJob(jid)!;const queueType=`test142.recovery:${jid}`;
 run("UPDATE jobs SET type=? WHERE id=?",queueType,jid);const claimed=claimNext([queueType])!;expect(claimed.id).toBe(jid);
 run("UPDATE jobs SET type='image.ai_post' WHERE id=? AND locked_by=?",jid,WORKER_ID);
 const ctx=new JobContext(getJob(jid)!);
 try{completeJob(jid,await generateAiPostImage(ctx,original.project_id!,ctx.payload.request,deps));}catch(e){failJob(getJob(jid)!,e,{permanent:true});}finally{markFinished(jid);}
 return getJob(jid)!;
}
const api=(pid:string,jid:string,data?:any)=>data?POST(new Request(`http://localhost/api/projects/${pid}/images/copy-review`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({jobId:jid,...data})}),{params:Promise.resolve({id:pid})}):GET(new Request(`http://localhost/api/projects/${pid}/images/copy-review?jobId=${jid}`),{params:Promise.resolve({id:pid})});
it.each(["hightech","restaurant"] as const)("%s : sous-ligne injustifiée → édition gratuite → reprise explicite → fichier décodé, sans repayer la rédaction",async kind=>{
 const f=await fixture(kind),d=transports("Une offre à 1250 €"),j=enqueue({userId:f.user.id,projectId:f.pid,type:"image.ai_post",payload:{projectId:f.pid,costCapMicro:300000,request:{entryPoint:"ads-guided",as:"ad",kind:"ad",request:"Présentation sans prix ou remise"}}});
 const failed=await execute(j.id,d.deps);expect(failed.status).toBe("failed");expect(failed.progress).toBe(.15);expect(d.calls).toEqual({copy:1,image:0,review:0});
 const review=(await(await api(f.pid,j.id)).json()).review;
 expect(review.issues).toEqual([{field:"subline",code:"COMMERCIAL_NUMBER_UNCONFIRMED",clientText:false}]);expect(review.proposal.subline).toBe("");
 const paidReceipt=one<{value:string}>("SELECT value FROM memory WHERE project_id=? AND key=?",f.pid,`publication.stage.${review.key}`)!.value;
 const edits={...review.proposal};
 expect((await api(f.pid,j.id,{action:"save",version:review.version,edits})).status).toBe(200);
 expect(getJob(j.id)!.status).toBe("failed");expect(d.calls.image).toBe(0);
 expect((await(await api(f.pid,j.id)).json()).review.edits).toEqual(edits);
 expect((await api(f.pid,j.id,{action:"resume",version:review.version,edits})).status).toBe(409);
 const estimate=(await import("@/lib/ai/estimate")).aiPostProbableMicro();
 const resumed=await api(f.pid,j.id,{action:"resume",version:review.version,edits,approvedEstimateMicro:estimate});expect(resumed.status).toBe(200);
 expect(json<any>(getJob(j.id)!.payload,{}).costCapMicro).toBe(300000);
 const done=await execute(j.id,d.deps);expect(done.status,done.error??"").toBe("done");expect(d.calls).toEqual({copy:1,image:1,review:1});
 const result=json<any>(done.result,{}),asset=getAsset(result.assetId)!;expect(asset.project_id).toBe(f.pid);expect(result.delivery.state).toBe("delivered");
 await expect(sharp(fs.readFileSync(storagePath(asset.storage_key))).metadata()).resolves.toMatchObject({format:"png"});
 expect(one<{value:string}>("SELECT value FROM memory WHERE project_id=? AND key=?",f.pid,`publication.stage.${review.key}`)!.value).toBe(paidReceipt);
});
it("une ancienne tâche reçoit le même parcours de correction depuis son reçu exact, sans texte d’un autre projet",async()=>{
 const f=await fixture(),d=transports("99 €"),j=enqueue({userId:f.user.id,projectId:f.pid,type:"image.ai_post",payload:{projectId:f.pid,request:{entryPoint:"ads-guided",as:"ad",kind:"ad"}}});
 await execute(j.id,d.deps);const review=(await(await api(f.pid,j.id)).json()).review;
 const {recordCall}=await import("@/lib/ai/trace");recordCall({userId:f.user.id,projectId:f.pid,jobId:j.id,task:"copywriting",provider:"synthetic",requestedModel:"simulation",servedModel:"simulation",unit:"tokens",status:"ok",usageKey:review.key});
 const cp=json<any>(getJob(j.id)!.checkpoint,{});delete cp["ai-post"].copyReview;delete cp["ai-post"].code;run("UPDATE jobs SET checkpoint=? WHERE id=?",JSON.stringify(cp),j.id);
 const old=(await(await api(f.pid,j.id)).json()).review;expect(old.key).toBe(review.key);expect(old.issues[0].field).toBe("subline");expect(d.calls.copy).toBe(1);
 const other=await fixture("restaurant");expect((await api(other.pid,j.id)).status).toBe(404);
 session.user={...f.user,role:"client"};
 const rejected=await api(f.pid,j.id,{action:"save",version:review.version,edits:review.original});expect(rejected.status).toBe(422);expect((await rejected.json()).code).toBe("COPY_FACTS_REJECTED");expect(getJob(j.id)!.status).toBe("failed");
 const {accountKeyFor}=await import("@/lib/project-billing");const key=accountKeyFor(f.user.id,f.pid);run("UPDATE wallets SET monthly_used=monthly_allowance WHERE user_id=?",key);
 expect((await api(f.pid,j.id,{action:"save",version:review.version,edits:review.proposal})).status).toBe(200);
 expect((await api(f.pid,j.id,{action:"resume",version:review.version,edits:review.proposal,approvedEstimateMicro:999999})).status).toBe(402);expect(d.calls).toEqual({copy:1,image:0,review:0});
});
it("contexte changé après la correction : aucune nouvelle rédaction payée sous couvert d’une reprise",async()=>{
 const f=await fixture(),d=transports("99 €"),j=enqueue({userId:f.user.id,projectId:f.pid,type:"image.ai_post",payload:{projectId:f.pid,costCapMicro:300000,request:{entryPoint:"ads-guided",as:"ad",kind:"ad"}}});
 await execute(j.id,d.deps);const review=(await(await api(f.pid,j.id)).json()).review;
 const approvedEstimateMicro=(await import("@/lib/ai/estimate")).aiPostProbableMicro();
 expect((await api(f.pid,j.id,{action:"resume",version:review.version,edits:review.proposal,approvedEstimateMicro})).status).toBe(200);
 // A duplicated request races with queued state: it cannot reopen or buy the same stage twice.
 expect((await api(f.pid,j.id,{action:"resume",version:review.version,edits:review.proposal,approvedEstimateMicro})).status).toBe(409);
 saveProduct(f.pid,{...loadProject(f.pid).product,summary:"Le client a modifié le contexte dans un autre onglet."});
 const failed=await execute(j.id,d.deps);expect(failed.status).toBe("failed");expect(failed.error).toMatch(/contexte a changé/);expect(d.calls).toEqual({copy:1,image:0,review:0});
});
it("un prix saisi non confirmé est demandé avant toute dépense ; le prix d’une autre prestation n’est pas emprunté",async()=>{
 const f=await fixture(),d=transports();d.deps.clientTexts={subline:"99 €"};
 const r=await designPostWithAi(f.p,post,options(resolveSubject(f.p,null)!.referenceAssetId),d.deps);expect(r.code).toBe("CLIENT_COPY_FACTS_REQUIRED");expect(d.calls.copy).toBe(0);
 const service=await fixture("restaurant");service.p.services.services[0].price="80 €";service.p.services.services[1].price="120 €";
 const p=projectForSubject(service.p,resolveSubject(service.p,{kind:"service",name:service.p.services.services[0].name}));
 expect(publicationCopyIssues(p,{headline:"80 €",subline:"",cta:""},"Présenter à 80 €",[])).toEqual([]);
 expect(publicationCopyIssues(p,{headline:"120 €",subline:"",cta:""},"120 €",[])[0].code).toBe("COMMERCIAL_NUMBER_UNCONFIRMED");
});
it("un texte client exact reste intact jusque dans la consigne image malgré les préférences génériques de vocabulaire",async()=>{
 const f=await fixture(),d=transports();const {addWordingRule}=await import("@/lib/client-wording");addWordingRule(f.pid,{avoid:"casque",use:"écouteur"});
 const text="Le casque de mes promenades";d.deps.clientTexts={headline:text};d.deps.copy=async()=>({headline:text,subline:"",cta:"",scene:"Documented subject, coherent side lighting",concept:campaignConcept()});
 const prompts:string[]=[];const gen=d.deps.generate;d.deps.generate=async(...args)=>{prompts.push(args[0]);return gen(...args);};
 const r=await designPostWithAi(loadProject(f.pid),post,options(resolveSubject(f.p,null)!.referenceAssetId),d.deps);expect(r.assetId,r.note).toBeTruthy();expect(prompts[0]).toContain(text);expect(prompts[0]).not.toContain("Le écouteur de mes promenades");
});
it("une autre fenêtre ne peut pas écraser une correction locale sauvegardée",async()=>{
 const f=await fixture(),d=transports("99 €"),j=enqueue({userId:f.user.id,projectId:f.pid,type:"image.ai_post",payload:{projectId:f.pid,request:{as:"ad",kind:"ad"}}});await execute(j.id,d.deps);
 const review=(await(await api(f.pid,j.id)).json()).review;
 expect((await api(f.pid,j.id,{action:"save",version:review.version,edits:review.proposal})).status).toBe(200);
 const overwritten=await api(f.pid,j.id,{action:"save",version:review.version,edits:{...review.proposal,headline:"Modification d’un autre onglet"}});
 expect(overwritten.status).toBe(409);expect((await overwritten.json()).code).toBe("COPY_CORRECTION_CONFLICT");
 expect((await(await api(f.pid,j.id)).json()).review.edits).toEqual(review.proposal);
});
it("budget temporairement engagé : refus avant envoi n’emprisonne pas la reprise ; résultat acquis ensuite relu sans nouvel appel",async()=>{
 const f=await fixture(),{publicationStage}=await import("@/lib/social-v2/publication-recipe"),billing=await import("@/lib/billing"),{withTrace}=await import("@/lib/ai/trace");
 const job=enqueue({userId:f.user.id,projectId:f.pid,type:"test142.unsent"}),available=billing.balance(f.user.id,f.pid).available;
 const held=billing.reserve(f.user.id,available,{task:"copywriting",provider:"synthetic",model:"simulation",projectId:f.pid,jobId:"other-isolated-task",usageKey:"other-held"});
 let sends=0;const fn=async()=>{const rid=billing.reserve(f.user.id,1000,{task:"copywriting",provider:"synthetic",model:"simulation",projectId:f.pid,jobId:job.id,usageKey:"unsent-copy"});sends++;billing.settle(rid,500,null,"simulation");return "acquired";};
 const scoped=()=>withTrace({jobId:job.id,projectId:f.pid,costCapMicro:2000},()=>publicationStage(f.pid,"unsent-copy",fn));
 await expect(scoped()).rejects.toThrow(/budget/);expect(sends).toBe(0);
 expect(one<{value:string}>("SELECT value FROM memory WHERE project_id=? AND key=?",f.pid,"publication.stage.unsent-copy")!.value).toContain('"not_sent"');
 billing.release(held);await expect(scoped()).resolves.toBe("acquired");await expect(scoped()).resolves.toBe("acquired");expect(sends).toBe(1);
});
it("un refus budgétaire après un appel déjà acquis ne rend pas un résultat ambigu gratuitement relançable",async()=>{
 const f=await fixture(),{publicationStage}=await import("@/lib/social-v2/publication-recipe"),billing=await import("@/lib/billing"),{withTrace}=await import("@/lib/ai/trace");
 const job=enqueue({userId:f.user.id,projectId:f.pid,type:"test142.sent"});let sends=0;
 const scoped=()=>withTrace({jobId:job.id,projectId:f.pid,costCapMicro:1500},()=>publicationStage(f.pid,"sent-copy",async()=>{
  const rid=billing.reserve(f.user.id,1000,{task:"copywriting",provider:"synthetic",model:"simulation",projectId:f.pid,jobId:job.id,usageKey:"first-copy"});sends++;billing.settle(rid,1000,null,"simulation");
  billing.reserve(f.user.id,1000,{task:"copywriting",provider:"synthetic",model:"simulation",projectId:f.pid,jobId:job.id,usageKey:"second-copy"});return "must not happen";
 }));
 await expect(scoped()).rejects.toThrow(/plafond/);await expect(scoped()).rejects.toThrow(/double paiement/);expect(sends).toBe(1);
});
it.each(["hightech","restaurant"] as const)("%s : une question communautaire n’est ni un faux avis client ni un script vidéo à rejeter",async kind=>{
 const f=await fixture(kind),{creativeContract}=await import("@/lib/social-v2/creative-contract"),{runVideoEngineV2}=await import("@/lib/video-v2/engine"),{mockVideoDeps}=await import("./video-v2-mock");
 const editorial=creativeContract({...post,caption:"Quel usage préférez-vous ?",editorial:{role:"Votre avis compte",structure:"community",blocks:[{kind:"question",text:"Donnez votre avis."}]}},"organic");
 const {deps,log}=mockVideoDeps({userId:f.user.id,projectId:f.pid,canWrite:true,generationAllowed:false});
 const plan=await runVideoEngineV2(null,f.pid,{ask:{text:"Question à la communauté",purpose:"organic",editorial,durationS:30},planOnly:true},deps);
 expect(plan.script.issues).toEqual([]);expect(plan.script.sections.some(s=>s.voice==="Donnez votre avis.")).toBe(true);expect(log.scripts).toBe(0);expect(log.clips).toHaveLength(0);
 expect(()=>creativeContract({...post,editorial:{role:"Avis client",structure:"quote",blocks:[{kind:"quote",text:"Avis prétendument client"}]}},"organic")).toThrow(/Avis indisponible/);
 const {scriptIssues}=await import("@/lib/video-v2/script");expect(scriptIssues([{part:"hook",durationS:10,voice:"Votre avis : 98 % de clients satisfaits",onScreen:""}],{facts:[],proofs:[],ctaRequired:false}).join(" ")).toMatch(/non confirmé/);
});
