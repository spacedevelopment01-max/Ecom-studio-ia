/** Recette de livraison : moteur natif, dépendances fournisseur simulées, base explicitement isolée. */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";
const dir=process.env.DATA_DIR;
if(!dir||!path.basename(dir).startsWith("ecs-parcours-test-142-"))throw Error("Base de recette isolée obligatoire");
globalThis.fetch=async()=>{throw Error("Aucun réseau fournisseur dans cette recette");};
const {all,one,run,id,now}=await import("../../src/lib/db");
const {createUser}=await import("../../src/lib/auth");
const {emptyProduct}=await import("../../src/lib/project-types");
const {localBrand}=await import("../../src/lib/engine/local");
const {saveAsset}=await import("../../src/lib/library");
const {grantProjectPlan}=await import("../../src/lib/project-subscriptions");
const billing=await import("../../src/lib/billing");
const {setSetting,setJsonSetting,getSetting}=await import("../../src/lib/settings");
const {accountKeyFor}=await import("../../src/lib/project-billing");
const phase=process.env.DELIVERY_PHASE??"before";if(!["before","after","bank"].includes(phase))throw Error("Phase de recette inconnue");
const command=process.argv[2],pid=process.argv[3],privatePath=path.join(dir,`delivery-${phase}-private.json`);
if(command==="seed"){
 if(fs.existsSync(privatePath))throw Error("Comptes de recette déjà présents, aucun écrasement");
 const accounts=[];
 for(const business of ["products","services"] as const){
  const u=await createUser(`delivery142-${crypto.randomUUID()}@example.invalid`,crypto.randomBytes(32).toString("hex"),"Compte fictif livraison");
  run("UPDATE users SET role='client' WHERE id=?",u.id);
  const name=business==="products"?"Doseur Vermeil Test":"Atelier Accord Test";
  const product={...emptyProduct(),name,nameStatus:"provided" as const,category:business==="products"?"Doseur à épices":"Accord et entretien de pianos",sector:business==="products"?"maison" as const:"artisanat" as const,summary:business==="products"?"Doseur à épices fourni par le client fictif.":"Accord de pianos et entretien, sur demande de devis."};
  const services=business==="services"?{services:[{name:"Accord de piano",description:"Intervention pour accorder l’instrument."}],area:"Lyon",contactMode:"quote"}:null;
  const {brand,strategy}=localBrand(product,name,{business,services} as any);
  const projectId=id();
  run("INSERT INTO projects(id,user_id,name,status,platform,product_json,brand_json,strategy_json,settings_json,sources_json,business_type,business_json,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)",projectId,u.id,name,"ready","shopify",JSON.stringify(product),JSON.stringify(brand),JSON.stringify(strategy),JSON.stringify({language:"fr"}),"[]",business,JSON.stringify(services??{}),now(),now());
  grantProjectPlan(projectId,"vendre");
  const png=await sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350"><rect width="1080" height="1350" fill="#244d43"/><rect x="310" y="390" width="460" height="570" rx="70" fill="#e6dfc7"/><text x="540" y="210" font-size="46" text-anchor="middle" fill="white">MÉDIA SIMULÉ — RECETTE #142</text><text x="540" y="1130" font-size="32" text-anchor="middle" fill="white">Aucune qualité créative IA évaluée</text></svg>')).png().toBuffer();
  await saveAsset({projectId,userId:u.id,data:png,name:"photo-fournie-test.png",mime:"image/png",role:"original",origin:"upload",status:"approved"});
  if(business==="products")await saveAsset({projectId,userId:u.id,data:png,name:"reference-test.png",mime:"image/png",role:"cutout",origin:"generated",status:"approved",meta:{best:true}});
  const token=crypto.randomBytes(32).toString("base64url");run("INSERT INTO sessions(id,user_id,expires_at,created_at) VALUES(?,?,?,?)",crypto.createHash("sha256").update(token).digest("hex"),u.id,now()+86400_000,now());
  setSetting(`test142.delivery.${projectId}`,"success");accounts.push({uid:u.id,pid:projectId,token,business});
 }
 // Configuration strictement fictive : le réseau fournisseur est interdit dans le serveur et ce worker.
 const {MEDIA_MODELS}=await import("../../src/lib/ai/media-models");
 const models=MEDIA_MODELS.filter(m=>m.kind==="image"&&m.defaultFor==="primary"&&m.adapter);
 const admin:Record<string,unknown>={};for(const m of models){setSetting(`provider.${m.provider}.apiKey`,"synthetic-never-contact-provider",true);admin[`${m.provider}:${m.model}`]={confirmedAt:now(),enabled:true};}
 setJsonSetting("ai.media.models",admin);setSetting("provider.anthropic.apiKey","synthetic-never-contact-provider",true);setSetting("ai.prices.checkedAt",String(now()));
 fs.writeFileSync(privatePath,JSON.stringify(accounts),{mode:0o600});console.log("2 projets supplémentaires fictifs, référence client et abonnement de test, aucun appel réel");
}else if(command==="mode"){
 setSetting(`test142.delivery.${pid}`,process.argv[4]);
}else if(command==="low-budget"){
 const p=one<{user_id:string}>("SELECT user_id FROM projects WHERE id=?",pid)!;const key=accountKeyFor(p.user_id,pid);
 if(billing.balance(key).reserved)throw Error("Réservation de test ouverte, aucun solde réécrit");
 run("UPDATE wallets SET monthly_used=monthly_allowance-300000,topup_balance=0 WHERE user_id=?",key);
}else if(command==="state"){
 const owner=one<{user_id:string}>("SELECT user_id FROM projects WHERE id=?",pid)!;
 console.log(JSON.stringify({jobs:all("SELECT id,type,status,progress,result,error FROM jobs WHERE project_id=? ORDER BY created_at DESC",pid),balance:billing.balance(accountKeyFor(owner.user_id,pid)),usages:all("SELECT cost,billed FROM usage_events WHERE project_id=?",pid),reservations:all("SELECT amount,actual,status FROM ai_reservations WHERE project_id=?",pid)}));
}else if(command==="worker"){
 const jobs=await import("../../src/lib/jobs");const {runForUser}=await import("../../src/lib/ai/access");
 const {runWithLang}=await import("../../src/lib/i18n-server");const {withTrace}=await import("../../src/lib/ai/trace");
 const {generateAiPostImage}=await import("../../src/lib/engine/ai-post-image");
 const {campaignCopy,campaignVerdict}=await import("../../tests/publication-fixtures");
 const png=await sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350"><rect width="1080" height="1350" fill="#244d43"/><circle cx="540" cy="620" r="240" fill="#e6dfc7"/><text x="540" y="220" font-size="48" text-anchor="middle" fill="white">FOURNISSEUR SIMULÉ</text><text x="540" y="1090" font-size="36" text-anchor="middle" fill="white">Test de livraison — pas de création IA</text></svg>')).png().toBuffer();
 let stopped=false;process.on("SIGTERM",()=>stopped=true);process.on("SIGINT",()=>stopped=true);console.log("DELIVERY_WORKER_READY");
 while(!stopped){
  const j=jobs.claimNext(["image.ai_post","image.v2"]);if(!j){await new Promise(r=>setTimeout(r,40));continue;}
  const ctx=new jobs.JobContext(j);let spent=0;
  const mode=getSetting(`test142.delivery.${j.project_id}`)??"success";
  const charge=(task:string,maximum:number,cost:number,key:string)=>{const meta={task,provider:"synthetic",model:"simulation",projectId:j.project_id,jobId:j.id,usageKey:key};const rid=billing.reserve(j.user_id,maximum,meta);billing.recordUsage({userId:j.user_id,...meta,unit:task==="copywriting"?"tokens":"image",costMicro:cost,estimated:false,idempotencyKey:key},{reservationId:rid});spent+=cost;};
  try{
   if(j.type==="image.v2"){
    // Injection d'une sortie de moteur pour vérifier uniquement le suivi UI des résultats partiels.
    const a=await ctx.step("test142:bank-image",()=>saveAsset({projectId:j.project_id!,userId:j.user_id,data:png,name:"banque-simulation.png",mime:"image/png",role:"lifestyle",origin:"generated",status:"review",meta:{imageV2:{origin:"ai",simulation:true},gate:{verdict:"PROVISIONAL"}}}));
    ctx.progress(.5,"1/2 images enregistrées — simulation de résultat partiel");
    if(mode==="bank-failed")throw new jobs.UserFacingError("Jeu d’images incomplet : 1/2 images conservées dans la bibliothèque. Aucun nouvel essai payant automatique.");
    const{imageDelivery}=await import("../../src/lib/media/delivery-check");
    jobs.completeJob(j.id,{outcomes:[{assetId:a.id,verdict:"PROVISIONAL"}],delivery:await imageDelivery(j.project_id!,[a.id],{expected:2})});
    continue;
   }
   const result=await runWithLang({ui:"fr",content:"fr"},()=>runForUser(j.user_id,()=>withTrace({jobId:j.id,projectId:j.project_id,costCapMicro:ctx.payload.costCapMicro},()=>generateAiPostImage(ctx,j.project_id!,ctx.payload.request,{
    async copy(p,post,fallback){charge("copywriting",103349,mode==="copy-facts"?28000:52339,`${j.id}:synthetic-copy`);const copy=await campaignCopy(p,post,fallback);return mode==="copy-facts"?{...copy,headline:"-50 % sur ce projet fictif"}:copy;},
    async generate(){if(mode==="budget"){const left=billing.balance(j.user_id,j.project_id!).available;billing.assertCanSpend(j.user_id,left+1,j.project_id);}
      charge("image_generation",40000,40000,`${j.id}:synthetic-image`);return png;},
    async review(_image,_ref,texts){return {...campaignVerdict(),productFaithful:true,textsExact:true,legible:true,score:9.2,issues:[],fix:"",person:false,anatomyOk:true,transcribed:texts};},
    spentMicro:()=>spent,maxMicro:()=>40000,
   })),"normal",j.project_id));
   jobs.completeJob(j.id,result);
  }catch(e){jobs.failJob(jobs.getJob(j.id)!,e,{permanent:true});}
  finally{jobs.markFinished(j.id);}
 }
}else throw Error("Commande de recette inconnue");
