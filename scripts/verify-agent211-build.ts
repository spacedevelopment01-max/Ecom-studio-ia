/** B : Studio compilé + worker natif + SDK réel vers fournisseur HTTP LOCAL SIMULÉ.
 * Aucune clé réelle, aucun envoi externe. Données temporaires, jamais la base du Studio.
 * Ce test vérifie le raccordement ; il ne qualifie pas le raisonnement d'un modèle réel.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import net from 'node:net';
import assert from 'node:assert/strict';
import {spawn,type ChildProcess} from 'node:child_process';
import {randomBytes} from 'node:crypto';
if(process.env.DATA_DIR||process.env.DATABASE_FILE||process.env.STORAGE_DIR)throw Error('Existing storage selector refused');
if(['.env','.env.local'].some(f=>fs.existsSync(f)))throw Error('Run from an isolated checkout without environment files');
if(!fs.existsSync('.next/BUILD_ID'))throw Error('Production build required');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'ecs-agent-211-'));
process.env.DATA_DIR=temp;process.env.STOCK_OFFLINE='1';
process.env.STUDIO_CONVERSATION_LOT_A='1';process.env.STUDIO_CONVERSATION_AI='1';
process.env.APP_SECRET=randomBytes(32).toString('hex');
// Les seules valeurs de fournisseur de ce harnais sont factices et ne sortent pas du loopback.
for(const k of ['OPENAI_API_KEY','GOOGLE_API_KEY','GEMINI_API_KEY','FAL_KEY','FAL_API_KEY','DASHSCOPE_API_KEY','ALIBABA_MODEL_STUDIO_API_KEY','PEXELS_API_KEY','PIXABAY_API_KEY'])process.env[k]='';
process.env.ANTHROPIC_API_KEY='fake-loopback-provider-not-a-secret';
const out=path.resolve(process.argv[2]??path.join(temp,'proof'));
if(fs.existsSync(out)&&fs.readdirSync(out).length)throw Error('Nonempty proof folder refused');
fs.mkdirSync(out,{recursive:true});
const {account}=await import('../tests/conversation209-fixtures');
const {id,one,all,run}=await import('../src/lib/db');
const {setSetting}=await import('../src/lib/settings');
const {stateOf}=await import('../src/lib/preparation/store');
type View=import('../src/lib/orchestrator/conversation/contract').ConversationView;
type Session={u:Awaited<ReturnType<typeof account>>;cookie:string};
const users=[await account(),await account()];setSetting('ai.prices.checkedAt',String(Date.now()));
let server:ChildProcess|undefined,worker:ChildProcess|undefined,logs='',origin='',fixture:Record<string,unknown>={},bad=false,providerCalls=0,tokenCounts=0;
const fake=http.createServer(async(req,res)=>{
  try{
    let bytes='';for await(const chunk of req)bytes+=chunk;
    const p=JSON.parse(bytes||'{}');
    if(req.url?.endsWith('/count_tokens')){tokenCounts++;res.setHeader('content-type','application/json');res.end(JSON.stringify({input_tokens:Math.ceil(bytes.length/3)}));return;}
    assert.ok(req.url?.startsWith('/v1/messages'));assert.equal(p.stream,true);providerCalls++;
    const text=JSON.stringify(bad?{...fixture,businessEvidence:{sourceId:'source-inexistante',quote:'Citation sans preuve — FOURNISSEUR SIMULÉ'}}:fixture);
    res.setHeader('content-type','text/event-stream');res.setHeader('cache-control','no-cache');
    const event=(type:string,value:object)=>res.write(`event: ${type}\ndata: ${JSON.stringify({type,...value})}\n\n`);
    event('message_start',{message:{id:`fake-${providerCalls}`,type:'message',role:'assistant',model:p.model,content:[],stop_reason:null,stop_sequence:null,usage:{input_tokens:800,output_tokens:0}}});
    event('content_block_start',{index:0,content_block:{type:'text',text:''}});
    event('content_block_delta',{index:0,delta:{type:'text_delta',text}});
    event('content_block_stop',{index:0});
    event('message_delta',{delta:{stop_reason:'end_turn',stop_sequence:null},usage:{output_tokens:300}});
    event('message_stop',{});res.end();
  }catch{res.statusCode=500;res.end('Fake provider fixture failure');}
});
async function freePort(){const s=net.createServer();await new Promise<void>(r=>s.listen(0,'127.0.0.1',r));const port=(s.address()as net.AddressInfo).port;await new Promise<void>(r=>s.close(()=>r()));return port;}
function child(args:string[],extra:Record<string,string>={}){
  const p=spawn(process.execPath,args,{env:{...process.env,NODE_ENV:'production',NEXT_TELEMETRY_DISABLED:'1',APP_URL:origin,...extra,NODE_OPTIONS:`${process.env.NODE_OPTIONS??''} --import=${path.resolve('scripts/lot9/network-guard.mjs')}`},stdio:['ignore','pipe','pipe'],detached:true});
  p.stdout!.on('data',d=>logs+=String(d));p.stderr!.on('data',d=>logs+=String(d));return p;
}
async function start(enabled=true){const port=await freePort();origin=`http://127.0.0.1:${port}`;server=child(['node_modules/next/dist/bin/next','start','-H','127.0.0.1','-p',String(port)],{STUDIO_CONVERSATION_AI:enabled?'1':'0'});const end=Date.now()+120000;while(Date.now()<end){if(server.exitCode!=null)throw Error('Compiled server stopped');try{if((await fetch(origin+'/connexion')).ok)return;}catch{}await new Promise(r=>setTimeout(r,250));}throw Error('Server timeout');}
async function stop(p:ChildProcess|undefined){if(!p?.pid)return;try{process.kill(-p.pid,'SIGTERM');}catch{}await Promise.race([new Promise(r=>p.once('exit',r)),new Promise(r=>setTimeout(r,3000))]);}
process.on('exit',()=>{for(const p of [server,worker])if(p?.pid)try{process.kill(-p.pid,'SIGTERM');}catch{}});
async function login(u:Session['u']):Promise<Session>{const r=await fetch(origin+'/api/auth/login',{method:'POST',headers:{'content-type':'application/json',origin},body:JSON.stringify({email:u.email,password:'Mot-de-passe-fictif'})});assert.equal(r.status,200);return{u,cookie:r.headers.getSetCookie().map(x=>x.split(';')[0]).join('; ')};}
async function call(s:Session,url:string,body?:unknown,expected=200,foreignOrigin?:string){const r=await fetch(origin+url,{method:body==null?'GET':'POST',headers:{cookie:s.cookie,'content-type':'application/json',origin:foreignOrigin??origin},...(body==null?{}:{body:JSON.stringify(body)})});assert.equal(r.status,expected,`${url}: ${r.status===expected?'':await r.clone().text()}`);return r.json();}
const counts=()=>({providerHttpCalls:providerCalls,calls:one<{n:number}>('SELECT COUNT(*) n FROM ai_calls')!.n,usage:one<{n:number}>('SELECT COUNT(*) n FROM usage_events')!.n,simulatedMicro:one<{n:number}>('SELECT COALESCE(SUM(cost),0) n FROM usage_events')!.n});
async function finished(s:Session,jid:string){const end=Date.now()+45000;while(Date.now()<end){const{job}=await call(s,`/api/jobs/${jid}`);if(['done','failed','cancelled','blocked'].includes(job.status))return job;await new Promise(r=>setTimeout(r,150));}throw Error('Worker timeout');}
const proof:Record<string,unknown>={schema:'agent211-B-compiled-proof-1',data:'fictitious-isolated',provider:'local-http-simulation',realProviderCalls:0,realCostEur:0,worker:'native',qualification:'real_provider_not_tested',cases:[]};
try{
  await new Promise<void>(r=>fake.listen(0,'127.0.0.1',r));process.env.ANTHROPIC_BASE_URL=`http://127.0.0.1:${(fake.address()as net.AddressInfo).port}`;
  await start();proof.version=await(await fetch(origin+'/api/version')).json();
  const vproof=proof.version as{source:string;mode:string;tree:string};assert.equal(vproof.source,'compiled-build');assert.equal(vproof.mode,'production');assert.equal(vproof.tree,'clean');
  let sessions=[await login(users[0]),await login(users[1])];
  worker=child(['--import','tsx','worker/index.ts'],{WORKER_CONCURRENCY:'1'});
  const scenarios=[{text:'Je conçois des capteurs de ruches, sans performance chiffrée confirmée.',business:'products',target:'Apiculteurs professionnels'},
    {text:'Je remets en état des instruments de musique appartenant aux clients. Je souhaite des devis et des rendez-vous.',business:'services',target:'Musiciens et conservatoires'}];
  for(let i=0;i<scenarios.length;i++){
    const s=sessions[i],other=sessions[1-i],scene=scenarios[i],exchanges:unknown[]=[];let v:View=await call(s,'/api/studio-agent/draft',{});
    const cid=v.id,route=`/api/studio-agent/conversations/${cid}`;
    async function send(payload:Record<string,unknown>){v=await call(s,route,{revision:v.revision,projectRevision:v.projectRevision,requestId:id(),...payload});exchanges.push({request:payload,response:v});return v;}
    await send({action:'message',text:scene.text});assert.equal(v.summary.business,null);assert.equal(providerCalls,i);
    fixture={message:'Votre activité est conservée. Quelle clientèle souhaitez-vous atteindre en premier ?',status:'question',business:scene.business,businessEvidence:{sourceId:'brief.description',quote:scene.text},question:{id:'premiere-clientele',field:'target',title:'À qui souhaitez-vous vous adresser ?',why:'La clientèle guide les textes sans inventer de promesse.',multiple:false,choices:[{id:'prioritaire',label:scene.target},{id:'other',label:'Autre / préciser'}]},proposedChanges:[],knowledgeSourceIds:[],proposedTools:[],actionsExecuted:false};
    const q=await call(s,route+'/intelligence',{action:'quote',revision:v.revision,projectRevision:v.projectRevision});
    assert.equal(q.confirmationRequired,true);assert.equal(q.maxCalls,1);assert.ok(q.maximumPct>=q.estimatePct);assert.ok(!JSON.stringify(q).includes('Micro'));assert.equal(providerCalls,i);
    await call(other,route+'/intelligence',{action:'confirm',quoteId:q.id,confirmation:true,requestId:id()},404);
    await call(s,route+'/intelligence',{action:'confirm',quoteId:q.id,confirmation:true,requestId:id(),provider:'forged'},400);
    await call(s,route+'/intelligence',{action:'confirm',quoteId:q.id,confirmation:true,requestId:id()},403,'https://intrus.invalid');
    const confirmed=await call(s,route+'/intelligence',{action:'confirm',quoteId:q.id,confirmation:true,requestId:id()});
    const duplicate=await call(s,route+'/intelligence',{action:'confirm',quoteId:q.id,confirmation:true,requestId:id()});assert.equal(duplicate.jobId,confirmed.jobId);
    // Le navigateur peut fermer : un autre login retrouve le résultat du worker.
    const fresh=await login(s.u),job=await finished(fresh,confirmed.jobId);assert.equal(job.status,'done',JSON.stringify(job));
    v=await call(fresh,route);assert.equal(v.intelligence?.reply?.question?.id,'premiere-clientele');assert.equal(v.summary.business,scene.business);assert.equal(providerCalls,i+1);
    await send({action:'answer-ai',questionId:'premiere-clientele',choices:['prioritaire']});assert.equal(v.summary.target,scene.target);
    const fields=v.creation?.fields;assert.ok(fields);const form=new FormData();for(const[k,value]of Object.entries(fields))form.set(k,value);
    const created=await fetch(origin+'/api/projects',{method:'POST',headers:{cookie:s.cookie,origin},body:form});assert.equal(created.status,200);const result=await created.json();assert.equal(result.jobId,null);
    v=await call(s,`/api/projects/${result.id}/conversation`,{draftId:cid,draftRevision:v.revision});assert.equal(v.id,cid);assert.equal(v.projectId,result.id);
    await send({action:'edit',field:'target',value:scene.target+' — correction du client'});assert.equal(providerCalls,i+1);
    const saved=stateOf(result.id)!;assert.deepEqual(Object.keys(saved.stages),['brief']);assert.equal(saved.stages.brief?.data.input.target,v.summary.target);
    const reservations=all<{status:string;amount:number;actual:number}>('SELECT status,amount,actual FROM ai_reservations WHERE job_id=?',confirmed.jobId);assert.equal(reservations.length,1);assert.equal(reservations[0].status,'settled');assert.ok(reservations[0].actual>0&&reservations[0].actual<=reservations[0].amount);
    (proof.cases as unknown[]).push({business:scene.business,exchanges,quote:q,job:{status:job.status,progress:job.progress},reservation:reservations[0],reconnected:true,createdProjectWithoutAnalysis:true,csrf:403,foreign:404,forgedProvider:400});
    sessions[i]=fresh;
  }
  let specialistCalls=0;
  if(process.argv.includes('--specialists')){
    assert.equal(process.env.STUDIO_CONVERSATION_SPECIALISTS,'1');const s=sessions[0],c=one<{id:string}>('SELECT id FROM agent_conversations WHERE user_id=?',s.u.id)!,route=`/api/studio-agent/conversations/${c.id}`;
    const v:View=await call(s,route);fixture={message:'Les informations non confirmées restent à préciser. Aucun avis ni résultat commercial ne peut être déduit de cette recette.',status:'answer',business:null,businessEvidence:null,question:null,proposedChanges:[],knowledgeSourceIds:['studio.conversation'],proposedTools:[],actionsExecuted:false};
    const q=await call(s,route+'/intelligence',{action:'quote',revision:v.revision,projectRevision:v.projectRevision,role:'quality'});assert.equal(q.role,'quality');assert.equal(q.maxCalls,1);
    const before=counts(),j=await call(s,route+'/intelligence',{action:'confirm',quoteId:q.id,confirmation:true,requestId:id()});const job=await finished(s,j.jobId);assert.equal(job.status,'done',JSON.stringify(job));
    const result:View=await call(s,route);assert.equal(result.intelligence?.lastRole,'quality');assert.equal(counts().providerHttpCalls,before.providerHttpCalls+1);
    const plan=one<{status:string;steps_json:string}>('SELECT status,steps_json FROM task_plans WHERE project_id=?',v.projectId!)!;assert.equal(plan.status,'done');assert.equal(JSON.parse(plan.steps_json).length,1);
    proof.specialist={role:'quality',calls:1,jobStatus:job.status,planner:plan,requestBounds:result.intelligence!.requestBounds,simulatedOnly:true};specialistCalls=1;
  }
  // Une citation forgée (JSON valide) est facturée en simulation, mais jamais annoncée comme une réponse réussie.
  const s=sessions[0],c=one<{id:string}>('SELECT id FROM agent_conversations WHERE user_id=?',s.u.id)!,route=`/api/studio-agent/conversations/${c.id}`;let v:View=await call(s,route);
  v=await call(s,route,{revision:v.revision,projectRevision:v.projectRevision,requestId:id(),action:'message',text:'Quels sont les formats d’export du Studio ?'});
  bad=true;const q=await call(s,route+'/intelligence',{action:'quote',revision:v.revision,projectRevision:v.projectRevision});const j=await call(s,route+'/intelligence',{action:'confirm',quoteId:q.id,confirmation:true,requestId:id()});const failed=await finished(s,j.jobId);assert.equal(failed.status,'failed');
  v=await call(s,route);assert.equal(v.intelligence?.state,'failed');assert.ok(failed.progress<1);const afterFailure=counts();await new Promise(r=>setTimeout(r,1700));assert.deepEqual(counts(),afterFailure);proof.failure={status:failed.status,progress:failed.progress,conversationState:v.intelligence!.state,priorReplyPreserved:!!v.intelligence!.reply,noAutomaticRetry:true};
  const exported=await call(s,'/api/me/data-export');assert.ok(!JSON.stringify(exported).includes(sessions[1].u.email));proof.accountExportIsolated=true;
  proof.simulatedTotals={...counts(),tokenCounts};assert.equal(providerCalls,3+specialistCalls);assert.equal(counts().calls,3+specialistCalls);assert.equal(counts().usage,3+specialistCalls);
  await stop(worker);worker=undefined;await stop(server);server=undefined;await start(false);const fresh=await login(users[0]);await call(fresh,route+'/intelligence',{action:'quote',revision:v.revision,projectRevision:v.projectRevision},404);await call(fresh,'/api/projects');proof.defaultOff={intelligence:404,manualProjects:200};
  proof.finishedAt=new Date().toISOString();proof.success=true;
}finally{await stop(worker);await stop(server);await new Promise<void>(r=>fake.close(()=>r()));fs.writeFileSync(path.join(out,'api-proof.json'),JSON.stringify(proof,null,2)+'\n');fs.writeFileSync(path.join(temp,'process.log'),logs);}
console.log(JSON.stringify({success:proof.success,file:path.join(out,'api-proof.json'),version:proof.version,totals:proof.simulatedTotals,temp}));
