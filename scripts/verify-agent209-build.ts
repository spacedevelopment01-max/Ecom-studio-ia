/** #209 : vraie API du studio compilé, comptes fictifs isolés, aucun worker/fournisseur. */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import net from "node:net";
import {spawn,type ChildProcess} from "node:child_process";
import assert from "node:assert/strict";
import {randomBytes} from "node:crypto";

if(process.env.DATA_DIR||process.env.DATABASE_FILE||process.env.STORAGE_DIR)throw Error("Sélecteur d'une base existante refusé");
if(!fs.existsSync(".next/BUILD_ID"))throw Error("Build de production requis");
const temp=fs.mkdtempSync(path.join(os.tmpdir(),"ecs-agent-209-"));
process.env.DATA_DIR=temp;process.env.STOCK_OFFLINE="1";process.env.STUDIO_CONVERSATION_LOT_A="1";
process.env.APP_SECRET=randomBytes(32).toString("hex");
const out=path.resolve(process.argv[2]??path.join(temp,"preuves"));
if(fs.existsSync(out)&&fs.readdirSync(out).length)throw Error("Dossier de preuves déjà rempli : rien n'est remplacé");
fs.mkdirSync(out,{recursive:true});
const {account}=await import("../tests/conversation209-fixtures");
const {all,one,run,id}=await import("../src/lib/db");
const {stateOf}=await import("../src/lib/preparation/store");
type View=import("../src/lib/orchestrator/conversation/contract").ConversationView;
type Session={u:Awaited<ReturnType<typeof account>>;cookie:string};
const a=await account(),b=await account();
let server:ChildProcess|undefined,serverLog="",origin="";
async function start(enabled:boolean){
  const probe=net.createServer();await new Promise<void>((resolve,reject)=>{probe.once("error",reject);probe.listen(0,"127.0.0.1",resolve);});
  const port=(probe.address() as net.AddressInfo).port;await new Promise<void>(r=>probe.close(()=>r()));
  origin=`http://127.0.0.1:${port}`;
  server=spawn(process.execPath,["node_modules/next/dist/bin/next","start","-H","127.0.0.1","-p",String(port)],{env:{...process.env,NODE_ENV:"production",NEXT_TELEMETRY_DISABLED:"1",APP_URL:origin,STUDIO_CONVERSATION_LOT_A:enabled?"1":"0",NODE_OPTIONS:`${process.env.NODE_OPTIONS??""} --import=${path.resolve("scripts/lot9/network-guard.mjs")}`},stdio:["ignore","pipe","pipe"],detached:true});
  server.stdout!.on("data",d=>serverLog+=String(d));server.stderr!.on("data",d=>serverLog+=String(d));
  const end=Date.now()+120000;
  while(Date.now()<end){if(server.exitCode!=null)throw Error("Serveur isolé arrêté");try{if((await fetch(`${origin}/connexion`)).ok)return;}catch{}await new Promise(r=>setTimeout(r,500));}
  throw Error("Serveur compilé non prêt");
}
async function stop(){if(!server?.pid)return;try{process.kill(-server.pid,"SIGTERM");}catch{}const s=server;server=undefined;await Promise.race([new Promise(r=>s.once("exit",r)),new Promise(r=>setTimeout(r,3000))]);}
process.on("exit",()=>{if(server?.pid)try{process.kill(-server.pid,"SIGTERM");}catch{}});
async function login(u:Session["u"]):Promise<Session>{const r=await fetch(`${origin}/api/auth/login`,{method:"POST",headers:{"content-type":"application/json",origin},body:JSON.stringify({email:u.email,password:"Mot-de-passe-fictif"})});assert.equal(r.status,200);const cookie=r.headers.getSetCookie().map(c=>c.split(";")[0]).join("; ");assert.ok(cookie);return{u,cookie};}
async function call(s:Session,url:string,body?:unknown,expected=200,foreignOrigin?:string){const r=await fetch(origin+url,{method:body==null?"GET":"POST",headers:{cookie:s.cookie,"content-type":"application/json",origin:foreignOrigin??origin},...(body==null?{}:{body:JSON.stringify(body)})});assert.equal(r.status,expected,`${url}: ${await (r.status===expected?Promise.resolve(""):r.clone().text())}`);return r;}
const counts=()=>({calls:one<{n:number}>("SELECT COUNT(*) n FROM ai_calls")!.n,jobs:one<{n:number}>("SELECT COUNT(*) n FROM jobs")!.n,usage:one<{n:number}>("SELECT COUNT(*) n FROM usage_events")!.n,ledger:one<{n:number}>("SELECT COUNT(*) n FROM ledger")!.n,wallet:one("SELECT COALESCE(SUM(monthly_used),0) used,COALESCE(SUM(reserved),0) reserved,COALESCE(SUM(reserved_topup),0) reservedTopup FROM wallets")});
const proof:Record<string,unknown>={schema:"agent209-compiled-api-proof-1",data:"fictitious-isolated",realProviderCalls:0,paidGeneration:0,workerStarted:false,cases:[]};
try{
  await start(true);proof.version=await(await fetch(`${origin}/api/version`)).json();
  const version=proof.version as {commit:string;source:string;tree:string;mode:string};assert.equal(version.source,"compiled-build");assert.equal(version.mode,"production");assert.equal(version.tree,"clean");
  let sa=await login(a),sb=await login(b);const before=counts();proof.before=before;
  for(const [session,text] of [[sa,"Je veux une marque de lampe pour chambre d'enfant"],[sb,"J'aménage des fourgons apportés par les clients et je veux des devis et RDV"]] as const){
    const exchanges:unknown[]=[];let v=await(await call(session,"/api/studio-agent/draft",{})).json() as View;
    async function send(payload:Record<string,unknown>){const request={revision:v.revision,projectRevision:v.projectRevision,requestId:id(),...payload};v=await(await call(session,`/api/studio-agent/conversations/${v.id}`,request)).json();exchanges.push({request,response:v});return v;}
    await send({action:"message",text});assert.equal(v.summary.business,session.u.id===a.id?"products":"services");
    if(v.question?.key==="goals")await send({action:"answer",question:"goals",choices:["brand","other"],text:"Présenter mon offre à des revendeurs"});
    await send({action:"explain"});await send({action:"answer",question:"target",choices:["businesses"],text:"Entreprises de la recette fictive"});
    if(v.summary.business==="services")await send({action:"edit-services",items:[{name:"Rangements sur mesure",description:"Dans le fourgon apporté par le client, périmètre étudié avec lui."}]});
    assert.ok(v.creation?.available);const fields=v.creation.fields,form=new FormData();for(const[k,value]of Object.entries(fields))form.set(k,value);
    const created=await fetch(origin+"/api/projects",{method:"POST",headers:{cookie:session.cookie,origin},body:form});assert.equal(created.status,200);const result=await created.json();assert.equal(result.jobId,null);
    const cid=v.id;v=await(await call(session,`/api/projects/${result.id}/conversation`,{draftId:cid,draftRevision:v.revision})).json();assert.equal(v.projectId,result.id);
    await send({action:"edit",field:"target",value:"Cible corrigée sans nouvel appel"});const fresh=await login(session.u);const reopened=await(await call(fresh,`/api/studio-agent/conversations/${cid}`)).json() as View;assert.equal(reopened.summary.target,"Cible corrigée sans nouvel appel");
    const denied=await call(session.u.id===a.id?sb:sa,`/api/studio-agent/conversations/${cid}`,undefined,404);assert.ok(!(await denied.text()).includes(text));
    await call(fresh,`/api/studio-agent/conversations/${cid}`,{revision:v.revision,projectRevision:v.projectRevision,requestId:id(),action:"execute",tool:"publish",approve:true},400);
    await call(fresh,`/api/studio-agent/conversations/${cid}`,{revision:v.revision,projectRevision:v.projectRevision,requestId:id(),action:"summary"},403,"https://intrus.invalid");
    await call(fresh,`/api/studio-agent/conversations/${cid}`,{revision:0,projectRevision:v.projectRevision,requestId:id(),action:"summary"},409);
    await send({action:"message",text:"Crée mon site"});assert.equal(v.action?.state,"unavailable");assert.equal(v.action?.executed,false);
    await send({action:"prepare-action",tool:"understand-offer"});assert.equal(v.action?.state,"unavailable");assert.equal(v.action?.quote,undefined);
    const state=stateOf(result.id)!;assert.deepEqual(Object.keys(state.stages),["brief"]);assert.equal(state.stages.brief?.status,"draft");
    (proof.cases as unknown[]).push({business:v.summary.business,exchanges,afterReconnection:reopened,foreignRead:404,forgedExecution:400,csrf:403,staleRevision:409,preparation:{revision:state.revision,stage:"brief",status:"draft",provenance:state.stages.brief!.data.provenance}});
  }
  // L'administrateur n'a pas davantage accès aux conversations de l'autre compte.
  run("UPDATE users SET role='admin' WHERE id=?",b.id);const admin=await login(b);const ca=one<{id:string}>("SELECT id FROM agent_conversations WHERE user_id=? AND project_id IS NOT NULL",a.id)!;await call(admin,`/api/studio-agent/conversations/${ca.id}`,undefined,404);proof.foreignAdministrator=404;
  const after=counts();assert.deepEqual(after,before);assert.equal(after.calls,0);assert.equal(after.jobs,0);assert.equal(after.usage,0);proof.after=after;proof.spendEur=0;
  assert.equal((await call(sa,"/api/me/data-export")).status,200);proof.accountExport=200;
  await stop();await start(false);sa=await login(a);const off=await call(sa,"/api/studio-agent/draft",undefined,404);assert.equal((await off.json()).code,"conversation_disabled");assert.equal((await call(sa,"/api/projects")).status,200);proof.defaultOff={conversation:404,existingProjects:200};
  proof.finishedAt=new Date().toISOString();proof.success=true;
}finally{await stop();fs.writeFileSync(path.join(out,"api-proof.json"),JSON.stringify(proof,null,2)+"\n");fs.writeFileSync(path.join(temp,"server.log"),serverLog);}
console.log(JSON.stringify({success:proof.success,file:path.join(out,"api-proof.json"),version:proof.version,cases:(proof.cases as unknown[]).length,costs:proof.after}));
