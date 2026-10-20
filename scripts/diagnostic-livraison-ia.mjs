/** Diagnostic local STRICTEMENT en lecture seule. Aucun import du moteur/DB applicatif, aucune migration,
 * aucune génération ni relance. Sortie anonymisée : ni nom, brief, texte libre, URL de média, clé ou session.
 * Depuis la racine du studio : node /tmp/diagnostic-livraison-ia.mjs --project-id ID
 * Sélecteurs de stockage chargés comme le worker ; aucune valeur de configuration n'est affichée. */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const safeEnums = new Set(["queued","running","paused","done","failed","cancelled","blocked","held","settled","released","uncertain","reconciled","ready","review","approved","rejected","FINAL","PROVISIONAL","RETRY","REJECTED","image","video","audio","logo","document","text","archive","original","ad","social","generated","upload","import","export","stock","tokens","request","character","second"]);
const valueOf = v => safeEnums.has(v) ? v : v == null ? null : "other";
const parse = s => { try { return JSON.parse(s || "{}"); } catch { return null; } };
const refsOf = v => {
  const ids = new Set();
  const walk = (x,key="",depth=0) => {
    if(depth>12 || !x)return;
    if(typeof x==="string" && /(?:asset_?ids?|image_?ids?|video_?ids?|logo_?ids?|poster_?ids?)$/i.test(key) && /^[A-Za-z0-9_-]{4,100}$/.test(x))ids.add(x);
    else if(Array.isArray(x))x.forEach(i=>walk(i,key,depth+1));
    else if(typeof x==="object")Object.entries(x).forEach(([k,i])=>walk(i,k,depth+1));
  };
  walk(v);return [...ids];
};
const categoryOf = s => /timeout|timed out|délai/i.test(s??"")?"timeout":/budget|plafond/i.test(s??"")?"budget":/ENOSPC|disk|storage|stockage|sqlite/i.test(s??"")?"storage":/5\d\d|overload/i.test(s??"")?"provider_server":/401|403|auth|clé/i.test(s??"")?"authorization":s?"other":"none";

export async function diagnostic(options={}) {
  if(!options.noEnv)for(const f of [".env.local",".env"])if(fs.existsSync(f))process.loadEnvFile(f);
  const req=createRequire(path.join(process.cwd(),"package.json"));
  const Database=req("better-sqlite3"), sharp=req("sharp");
  const data=path.resolve(options.dataDir || process.env.DATA_DIR || "data");
  const database=path.resolve(options.database || process.env.DATABASE_FILE || path.join(data,"studio.db"));
  const storage=path.resolve(options.storageDir || process.env.STORAGE_DIR || path.join(data,"storage"));
  const db=new Database(database,{readonly:true,fileMustExist:true});db.pragma("query_only=ON");
  const salt=crypto.randomBytes(32), tag=v=>v==null?null:crypto.createHmac("sha256",salt).update(String(v)).digest("hex").slice(0,16);
  const has=t=>!!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(t);
  let project;
  try {
    project=options.projectId?db.prepare("SELECT id,user_id FROM projects WHERE id=?").get(options.projectId):null;
    if(!project && options.projectName){const found=db.prepare("SELECT id,user_id FROM projects WHERE name=? COLLATE NOCASE").all(options.projectName);if(found.length!==1)throw Error("PROJECT_SELECTION_REQUIRED");project=found[0];}
    if(!project)throw Error("PROJECT_SELECTION_REQUIRED");
    // Snapshot SQL cohérent ; le contrôle des fichiers suit, sans bloquer le studio pendant le décodage.
    const snapshot=db.transaction(()=>{
      const where=["project_id=?"],params=[project.id];
      if(options.jobId){where.push("id=?");params.push(options.jobId);}
      if(Number.isFinite(options.since)){where.push("created_at>=?");params.push(options.since);}
      const jobs=db.prepare(`SELECT * FROM jobs WHERE ${where.join(" AND ")} ORDER BY created_at DESC LIMIT ?`).all(...params,Math.min(50,Math.max(1,options.limit||20)));
      const ids=new Set(jobs.map(j=>j.id));
      const linked=t=>has(t)&&ids.size?db.prepare(`SELECT * FROM ${t} WHERE project_id=? AND job_id IN (${[...ids].map(()=>"?").join(",")}) ORDER BY created_at DESC LIMIT 2000`).all(project.id,...ids):[];
      const outputIds=[...new Set(jobs.flatMap(j=>refsOf(parse(j.result))))].slice(0,1000);
      const recentAssets=db.prepare("SELECT * FROM assets WHERE project_id=? ORDER BY created_at DESC LIMIT 200").all(project.id);
      const outputAssets=outputIds.length?db.prepare(`SELECT * FROM assets WHERE project_id=? AND id IN (${outputIds.map(()=>"?").join(",")})`).all(project.id,...outputIds):[];
      return {jobs,assets:[...new Map([...recentAssets,...outputAssets].map(a=>[a.id,a])).values()],calls:linked("ai_calls"),reservations:linked("ai_reservations"),usages:linked("usage_events"),checks:linked("quality_checks"),
        configuredProviders:has("settings")?db.prepare("SELECT key FROM settings WHERE key LIKE 'provider.%.apiKey' AND length(value)>0").all().map(r=>tag(r.key)):[]};
    })();
    const wanted=new Set(snapshot.jobs.flatMap(j=>refsOf(parse(j.result))));
    const recent=snapshot.jobs.length?Math.min(...snapshot.jobs.map(j=>j.created_at)):Date.now();
    const assets=[];
    for(const a of snapshot.assets.filter(a=>wanted.has(a.id)||a.created_at>=recent)) {
      const m=parse(a.meta), file=path.resolve(storage,a.storage_key||"");
      const inside=file.startsWith(storage+path.sep), exists=inside&&fs.existsSync(file);
      const stat=exists?fs.statSync(file):null;
      let decoded=null;
      if(stat?.isFile() && stat.size>0 && stat.size<=80*1024*1024 && /^image\/(png|jpeg|webp|avif|gif)$/.test(a.mime)) {
        try {const info=await sharp(file,{limitInputPixels:64_000_000}).metadata();await sharp(file,{limitInputPixels:64_000_000}).stats();decoded={valid:!!info.width&&!!info.height,width:info.width,height:info.height,format:info.format};}catch(e){decoded=/pixel limit/i.test(e?.message??"")?{valid:null,inspectionLimited:true}:{valid:false};}
      }
      assets.push({ref:tag(a.id),ownerMatches:a.user_id===project.user_id,kind:valueOf(a.kind),role:valueOf(a.role),status:valueOf(a.status),origin:valueOf(a.origin),deleted:!!a.deleted_at,mime:/^(image|video|audio|text)\/[a-z0-9.+-]+$/i.test(a.mime)?a.mime:"other",recordedBytes:a.size,fileExists:exists,isFile:!!stat?.isFile(),actualBytes:stat?.size??null,storageKeyInsideRoot:inside,decoded,
        metadataValid:!!m,gate:{verdict:valueOf(m?.gate?.verdict),fatal:!!m?.gate?.fatal,score:typeof m?.gate?.score==="number"?m.gate.score:null},
        association:{aiAd:!!m?.aiAd,adV2:!!m?.adV2,imageV2:!!m?.imageV2,socialV2:!!m?.socialV2},
        aiAdQueryMatches:!!m?.aiAd&&a.role==="ad"&&!a.deleted_at&&["ready","approved"].includes(a.status),createdAt:new Date(a.created_at).toISOString()});
    }
    let served=null;
    if(!options.offline){
      const url=new URL(options.versionUrl||"http://127.0.0.1:3000/api/version");
      if(url.protocol!=="http:"||!["127.0.0.1","localhost","[::1]"].includes(url.hostname)||url.pathname!=="/api/version"||url.username||url.password||url.search)throw Error("LOCAL_VERSION_URL_ONLY");
      try {const r=await fetch(url,{signal:AbortSignal.timeout(3000),redirect:"error"});const v=await r.json();served={accessible:r.ok,commit:/^[0-9a-f]{40}$/.test(v.commit)?v.commit:null,source:v.source==="compiled-build"?v.source:null};}catch{served={accessible:false,commit:null};}
    }
    return {schema:"studio-ai-delivery-diagnostic-1",readOnly:true,realProviderCalls:0,noGenerationOrRetry:true,anonymized:true,capturedAt:new Date().toISOString(),served,
      storageSelection:{databaseExplicit:!!options.database||!!process.env.DATABASE_FILE||!!process.env.DATA_DIR,storageExplicit:!!options.storageDir||!!process.env.STORAGE_DIR||!!process.env.DATA_DIR,storageRootExists:fs.existsSync(storage),warning:"Confirm these selectors match the running studio; no path or environment value is exported."},projectRef:tag(project.id),configuredCredentialEntries:snapshot.configuredProviders.length,providerUsability:"not-tested",assets,
      jobs:snapshot.jobs.map(j=>{const payload=parse(j.payload),result=parse(j.result),refs=refsOf(result),found=refs.map(id=>assets.find(a=>a.ref===tag(id))).filter(Boolean);const imageExpected=/^(image\.(v2|single|ai_post|edit)|images.generate|ads.v2)$/.test(j.type)&&!(j.type==="ads.v2"&&payload?.request?.copyOnly);return {ref:tag(j.id),type:/^(project|image|images|ads|video|brand|content|blog|shop|theme|stock|ugc|social|workflow|publish|post|cutout)[a-z0-9_.-]*$/.test(j.type)?j.type:"other",status:valueOf(j.status),progress:j.progress,createdAt:new Date(j.created_at).toISOString(),finishedAt:j.finished_at?new Date(j.finished_at).toISOString():null,ownerMatches:j.user_id===project.user_id,payloadPresent:!!payload,payloadDigest:tag(j.payload),context:{projectMatches:payload?.projectId==null?null:payload.projectId===project.id,hasRequest:!!payload?.request,hasSubject:!!payload?.request?.subject,hasInstruction:!!(payload?.instruction||payload?.request?.instruction||payload?.request?.request)},resultPresent:!!j.result,resultValidJson:result!==null,outputRefs:refs.map(tag),checkpointPresent:!!j.checkpoint&&j.checkpoint!=="{}",errorCategory:categoryOf(j.error),errorDigest:j.error?tag(j.error):null,flags:[...(j.status==="done"&&imageExpected&&!refs.length?["DONE_WITHOUT_IMAGE_REFERENCE"]:[]),...(refs.length!==found.length?["REFERENCED_ASSET_MISSING_OR_FOREIGN"]:[]),...(found.some(a=>!a.fileExists||a.decoded?.valid===false)?["MISSING_OR_INVALID_FILE"]:[]),...(found.some(a=>a.status==="rejected"||a.deleted||a.gate.fatal)?["OUTPUT_NOT_USABLE"]:[])]};}),
      calls:snapshot.calls.map(c=>({ref:tag(c.id),jobRef:tag(c.job_id),provider:["anthropic","openai","google","alibaba","fal","pexels","pixabay","openverse","synthetic","mock","local"].includes(c.provider)?c.provider:"other",requestedModelRef:tag(c.requested_model),servedModelRef:tag(c.served_model),sameRequestedAndServed:c.served_model?c.requested_model===c.served_model:null,status:c.status==="ok"?"ok":valueOf(c.status),unit:valueOf(c.unit),httpAttempts:c.http_attempts,costMicro:c.cost,estimated:!!c.estimated,usageRef:tag(c.usage_event_id),errorCategory:categoryOf(c.error_kind),brainScopeRef:tag(c.brain_scope),brainVersionRef:tag(c.brain_version)})),
      reservations:snapshot.reservations.map(r=>({ref:tag(r.id),jobRef:tag(r.job_id),status:valueOf(r.status),maximumMicro:r.amount,actualMicro:r.actual,resultSaved:!!r.result,providerReceiptSaved:!!r.provider_receipt,usageRef:tag(r.usage_event_id)})),
      usages:snapshot.usages.map(u=>({ref:tag(u.id),jobRef:tag(u.job_id),costMicro:u.cost,billedMicro:u.billed,estimated:!!u.estimated})),
      quality:snapshot.checks.map(q=>({ref:tag(q.id),jobRef:tag(q.job_id),verdict:valueOf(q.verdict),score:typeof q.score==="number"?q.score:null})),
      limits:{recentAssets:200,linkedRowsPerTable:2000,outputReferences:1000,tableCapReached:["calls","reservations","usages","checks"].filter(k=>snapshot[k].length===2000)},
      limitations:["No provider authentication, price, generation or creative quality tested. Amounts are recorded costs, not provider invoice verification.","Database snapshot and subsequent file checks are read-only; concurrent studio activity can change files.","A gallery query match is not proof of browser rendering. No free text or source images exported."]};
  } finally {db.close();}
}

if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
  const args=process.argv.slice(2),opt=k=>args.includes(k)?args[args.indexOf(k)+1]:undefined;
  if(args.includes("--help")){console.log("Depuis la racine du studio : node /tmp/diagnostic-livraison-ia.mjs --project-id ID [--job-id ID] [--limit 20] [--database CHEMIN] [--storage-dir CHEMIN]. Lecture seule, aucune relance. Ne jamais publier la base, .env ou les journaux bruts.");}
  else try{const since=opt("--since");console.log(JSON.stringify(await diagnostic({projectId:opt("--project-id"),projectName:opt("--project-name"),jobId:opt("--job-id"),limit:Number(opt("--limit"))||20,database:opt("--database"),storageDir:opt("--storage-dir"),versionUrl:opt("--version-url"),since:since?Date.parse(since):undefined,noEnv:args.includes("--no-env"),offline:args.includes("--offline")}),null,2));}
  catch(e){console.error(["PROJECT_SELECTION_REQUIRED","LOCAL_VERSION_URL_ONLY"].includes(e?.message)?e.message:"DIAGNOSTIC_UNAVAILABLE: vérifier la racine du dépôt et les sélecteurs de données. Aucun changement ni appel fournisseur effectué.");process.exitCode=1;}
}
