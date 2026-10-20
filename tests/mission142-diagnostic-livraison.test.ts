import { afterEach, expect, it, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import Database from "better-sqlite3";
import sharp from "sharp";
import { budgetFailureCode, failureOriginCode, sourceErrorEvidence, diagnostic } from "../scripts/diagnostic-livraison-ia.mjs";

const dirs:string[]=[];
afterEach(()=>{for(const d of dirs.splice(0))fs.rmSync(d,{recursive:true,force:true});vi.unstubAllGlobals();});
async function fixture(){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"ecs-test-142-diagnostic-"));dirs.push(dir);
  const database=path.join(dir,"studio.db"),storageDir=path.join(dir,"storage");fs.mkdirSync(storageDir);
  const db=new Database(database);
  db.exec(`CREATE TABLE projects(id TEXT,user_id TEXT,name TEXT);
    CREATE TABLE jobs(id TEXT,project_id TEXT,user_id TEXT,type TEXT,status TEXT,progress REAL,payload TEXT,result TEXT,checkpoint TEXT,error TEXT,created_at INTEGER,finished_at INTEGER);
    CREATE TABLE assets(id TEXT,project_id TEXT,user_id TEXT,kind TEXT,role TEXT,status TEXT,origin TEXT,mime TEXT,size INTEGER,storage_key TEXT,meta TEXT,created_at INTEGER,deleted_at INTEGER);
    CREATE TABLE ai_calls(id TEXT,project_id TEXT,job_id TEXT,provider TEXT,requested_model TEXT,served_model TEXT,status TEXT,error_kind TEXT,cost INTEGER,created_at INTEGER);
    CREATE TABLE ai_reservations(id TEXT,project_id TEXT,job_id TEXT,status TEXT,amount INTEGER,actual INTEGER,created_at INTEGER);
    CREATE TABLE usage_events(id TEXT,project_id TEXT,job_id TEXT,cost INTEGER,billed INTEGER,estimated INTEGER,created_at INTEGER);
    CREATE TABLE settings(key TEXT,value TEXT);`);
  const secret="PRIVATE_MARKER_CLIENT_BRIEF_SECRET_142",pid="private-project-id-142",uid="private-client-id-142";
  db.prepare("INSERT INTO projects VALUES(?,?,?)").run(pid,uid,secret);
  db.prepare("INSERT INTO settings VALUES(?,?)").run("provider.synthetic.apiKey",secret);
  const png=await sharp({create:{width:16,height:16,channels:3,background:"#2f705d"}}).png().toBuffer();
  fs.writeFileSync(path.join(storageDir,"valid.png"),png);fs.writeFileSync(path.join(storageDir,"corrupt.png"),"invalid image");
  const asset=(id:string,key:string,project=pid)=>db.prepare("INSERT INTO assets VALUES(?,?,?,?,?,?,?,?,?,?,?,?,NULL)").run(id,project,uid,"image","ad","ready","generated","image/png",key==="valid.png"?png.length:13,key,JSON.stringify({aiAd:true,gate:{verdict:"FINAL"},private:secret}),Date.now());
  asset("private-valid-image-142","valid.png");asset("private-corrupt-image-142","corrupt.png");asset("foreign-private-image-142","valid.png","other-project");
  const job=(id:string,result:unknown)=>db.prepare("INSERT INTO jobs VALUES(?,?,?,?,?,?,?,?,?,?,?,?)").run(id,pid,uid,"image.ai_post","done",1,JSON.stringify({request:{request:secret},projectId:pid}),JSON.stringify(result),"{}",secret,Date.now(),Date.now());
  job("private-job-valid-142",{assetId:"private-valid-image-142"});
  db.prepare("INSERT INTO ai_calls VALUES(?,?,?,?,?,?,?,?,?,?)").run("private-call-142",pid,"private-job-valid-142","synthetic","configured-test-model","configured-test-model","ok",secret,40000,Date.now());
  db.prepare("INSERT INTO ai_reservations VALUES(?,?,?,?,?,?,?)").run("private-reserve-142",pid,"private-job-valid-142","settled",100000,40000,Date.now());
  db.prepare("INSERT INTO usage_events VALUES(?,?,?,?,?,?,?)").run("private-usage-142",pid,"private-job-valid-142",40000,40000,0,Date.now());
  return {dir,database,storageDir,db,job,pid,uid,secret,opts:{database,storageDir,projectId:pid,noEnv:true,offline:true}};
}
it("diagnostic ancien schéma : image réellement décodée, coût enregistré, aucune donnée privée exportée ni écriture SQLite",async()=>{
  const f=await fixture();const schema=f.db.pragma("schema_version",{simple:true});f.db.close();
  const hash=()=>crypto.createHash("sha256").update(fs.readFileSync(f.database)).digest("hex");const before=hash();
  const r=await diagnostic(f.opts);expect(r.readOnly).toBe(true);expect(r.realProviderCalls).toBe(0);
  expect(r.assets.find((a:any)=>a.decoded?.valid)).toMatchObject({fileExists:true,aiAdQueryMatches:true,decoded:{valid:true,width:16,height:16}});
  expect(r.calls[0].sameRequestedAndServed).toBe(true);expect(r.usages[0].billedMicro).toBe(40000);
  expect(r.jobs[0].flags).toEqual([]);expect(hash()).toBe(before);
  const check=new Database(f.database,{readonly:true});expect(check.pragma("schema_version",{simple:true})).toBe(schema);check.close();
  const s=JSON.stringify(r);for(const privateValue of [f.secret,f.pid,f.uid,"private-valid-image-142","private-job-valid-142","configured-test-model",f.database])expect(s).not.toContain(privateValue);
});
it("distingue 100 % sans référence, fichier illisible et référence absente/étrangère sans lire l'autre projet",async()=>{
  const f=await fixture();f.job("private-empty-142",{});f.job("private-bad-142",{assetIds:["private-corrupt-image-142","foreign-private-image-142","missing-private-image-142"]});f.db.close();
  const r=await diagnostic(f.opts);
  expect(r.jobs.some((j:any)=>j.flags.includes("DONE_WITHOUT_IMAGE_REFERENCE"))).toBe(true);
  expect(r.jobs.some((j:any)=>j.flags.includes("REFERENCED_ASSET_MISSING_OR_FOREIGN")&&j.flags.includes("MISSING_OR_INVALID_FILE"))).toBe(true);
  expect(r.assets).toHaveLength(2);expect(JSON.stringify(r)).not.toContain("other-project");
});
it("refuse une sonde de version externe avant tout appel réseau",async()=>{
  const f=await fixture();f.db.close();const network=vi.fn();vi.stubGlobal("fetch",network);
  await expect(diagnostic({...f.opts,offline:false,versionUrl:"https://provider.invalid/api/version"})).rejects.toThrow("LOCAL_VERSION_URL_ONLY");expect(network).not.toHaveBeenCalled();
});
it.each([
  ["Plafond atteint avant génération et contrôles : étapes utilisables conservées, aucun FINAL.","CREATIVE_CAP_BEFORE_IMAGE"],
  ["plafond de dépense atteint : l'appel suivant n'a pas été envoyé","TASK_COST_CAP"],
  ["L'IA de votre forfait est utilisée à 100 % pour ce mois-ci. Elle reprend le 20 novembre.","WALLET_RESERVATION_OR_PRECHECK_REFUSED"],
  ["L'IA de votre forfait est utilisée à 100 % : elle reprend au renouvellement du forfait","AI_MINIMUM_AVAILABLE_GATE"],
  ["Le budget restant est inférieur au minimum permettant une génération IA.","AI_MINIMUM_AVAILABLE_GATE"],
  ["Your plan's AI is 100% used: it resumes when your plan renews.","AI_MINIMUM_AVAILABLE_GATE"],
  ["Budget insuffisant pour concevoir le visuel : aucun titre de calendrier certifié premium.","CREATIVE_CAP_BEFORE_COPY"],
  ["Une génération utilise temporairement le budget disponible. Attendez son résultat.","WALLET_COMMITTED"],
  ["SECRET_MARKER budget message inconnu","BUDGET_UNCLASSIFIED"],
])("le blocage %s reçoit un code précis sans exporter le texte",(message,code)=>expect(budgetFailureCode(message)).toBe(code));
it.each([
 ["Aucun modèle compatible avec toutes les références essentielles.","ESSENTIAL_REFERENCES_NO_COMPATIBLE_MODEL"],
 ["Tarif inconnu pour PRIVATE_MARKER_SECRET : renseignez-le.","MODEL_PRICE_UNCONFIGURED"],
 ["Conception IA indisponible : génération suspendue, aucun secours silencieux.","COPY_ENGINE_UNAVAILABLE"],
 ["Concept IA absent : aucune rédaction de secours certifiée premium.","COPY_CONCEPT_MISSING"],
 ["Rédaction IA non conforme aux faits confirmés : aucun texte de calendrier substitué.","COPY_FACTS_REJECTED"],
 ["Contenu éditorial utile manquant : fournir ou concevoir les explications.","EDITORIAL_CONTENT_MISSING"],
 ["CTA commercial imposé à un contenu organique : conception à corriger.","ORGANIC_COMMERCIAL_CTA_REJECTED"],
 ["Étape de mise en page demandée indisponible, aucun remplacement automatique.","LAYOUT_STAGE_UNAVAILABLE"],
 ["Logo validé indisponible : génération bloquée, aucun logo inventé.","LOGO_REFERENCE_UNAVAILABLE"],
 ["Référence indisponible dans ce projet.","SOURCE_REFERENCE_UNAVAILABLE"],
 ["Importez d'abord une photo du produit : l'IA part de votre vrai produit.","PRODUCT_REFERENCE_REQUIRED"],
])("le suffixe de coût ne transforme pas %s en cause financière",(message,code)=>{
 const wrapped=message+" — 1 % de votre budget IA utilisé ; les étapes acquises sont conservées.";
 expect(budgetFailureCode(wrapped)).toBe("BUDGET_UNCLASSIFIED");expect(failureOriginCode(wrapped)).toBe(code);expect(failureOriginCode(wrapped)).not.toContain("PRIVATE_MARKER");
});
it("une erreur non classée peut être située dans le code sans exporter sa phrase ni les données privées",()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"ecs-test-142-source-"));dirs.push(dir);const root=path.join(dir,"src/lib/social-v2");fs.mkdirSync(root,{recursive:true});
 const sentence="Cause statique inconnue mais suffisamment précise pour être localisée.";
 fs.writeFileSync(path.join(root,"ai-post.ts"),'const message = '+JSON.stringify(sentence)+';\nthrow new Error(message);');
 const r=sourceErrorEvidence(sentence+" PRIVATE_CLIENT_SECRET_142 — 1 % du budget utilisé.",dir);
 expect(r).toMatchObject({available:true,sourceCommit:null,matches:[{file:"src/lib/social-v2/ai-post.ts",line:1,matchedStaticCharacters:sentence.length}]});
 const out=JSON.stringify(r);expect(out).not.toContain(sentence);expect(out).not.toContain("PRIVATE_CLIENT_SECRET");expect(out).not.toContain(dir);
});
it("le diagnostic budgétaire sélectionne le bon abonnement sans migration ni solde inventé à la date de l'échec",async()=>{
  const f=await fixture();
  f.db.exec("CREATE TABLE subscriptions(user_id TEXT,owner_user_id TEXT,project_id TEXT,status TEXT); CREATE TABLE wallets(user_id TEXT,monthly_allowance INTEGER,monthly_used INTEGER,reserved INTEGER,reserved_topup INTEGER,topup_balance INTEGER,topup_period_used INTEGER,period_start INTEGER,period_end INTEGER)");
  f.db.prepare("INSERT INTO subscriptions VALUES(?,?,?,?)").run("private-subscription-key",f.uid,f.pid,"active");
  f.db.prepare("INSERT INTO wallets VALUES(?,?,?,?,?,?,?,?,?)").run("private-subscription-key",1000000,700000,10000,1000,50000,0,1,2);
  f.db.prepare("UPDATE jobs SET status='failed',progress=.15,result=NULL,error=?,payload=?").run("Plafond atteint avant génération et contrôles : étapes utilisables conservées, aucun FINAL.",JSON.stringify({projectId:f.pid,costCapMicro:200000,request:{request:f.secret}}));f.db.close();
  const before=crypto.createHash("sha256").update(fs.readFileSync(f.database)).digest("hex");
  const r=await diagnostic({...f.opts,budgetOnly:true,jobType:"image.ai_post",limit:1});
  expect(r.budgetSnapshot).toMatchObject({at:"diagnostic_capture_not_failure",billingLink:"project_subscription",subscriptionOwnerMatches:true,availableMicro:339000});
  expect(r.jobs[0]).toMatchObject({status:"failed",progress:.15,budgetFailureCode:"CREATIVE_CAP_BEFORE_IMAGE",taskCostCapMicro:200000});
  expect(r.assets).toEqual([]);expect(JSON.stringify(r)).not.toContain(f.secret);expect(JSON.stringify(r)).not.toContain("private-subscription-key");
  expect(crypto.createHash("sha256").update(fs.readFileSync(f.database)).digest("hex")).toBe(before);
});
