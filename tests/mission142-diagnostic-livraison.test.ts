import { afterEach, expect, it, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import Database from "better-sqlite3";
import sharp from "sharp";
import { diagnostic } from "../scripts/diagnostic-livraison-ia.mjs";

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
