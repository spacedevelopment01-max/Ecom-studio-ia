/** API compilée uniquement sur copie fictive : aucun worker, SDK ou fournisseur. */
import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import net from 'node:net';import assert from 'node:assert/strict';import {spawn}from 'node:child_process';import {createRequire}from 'node:module';import {createHash}from 'node:crypto';
const root=process.cwd(),state=path.resolve(process.env.AGENT211_PROOF_STATE??'/workspace/reviews/ecom-211-state'),code=process.argv[2],run=process.argv[3],raw=path.join(state,process.argv[4]),out=path.join(state,process.argv[5]);
assert.ok(process.env.NODE_OPTIONS?.includes('network-guard.mjs'));assert.ok(!['.env','.env.local'].some(f=>fs.existsSync(path.join(root,f))));assert.match(code,/^[a-f0-9]{40}$/);assert.ok(raw.startsWith(state+'/D10b-')&&out.startsWith(state+'/D10b-'));assert.ok(!fs.existsSync(out));fs.mkdirSync(out);
const prior=JSON.parse(fs.readFileSync(path.join(raw,'api-proof.json'),'utf8')),proof=JSON.parse(fs.readFileSync(path.join(raw,'videos-browser-proof.json'),'utf8'));assert.ok(prior.success&&prior.version.commit===code&&prior.version.tree==='clean');
const line=fs.readFileSync(path.join(state,run+'.log'),'utf8').split('\n').reverse().find(l=>l.startsWith('{"success":true,')),original=JSON.parse(line).temp;assert.ok(original.startsWith('/tmp/ecs-agent-211-'));
const data=fs.mkdtempSync(path.join(os.tmpdir(),'ecs-video211-approved-'));fs.cpSync(original,data,{recursive:true});
const require=createRequire(root+'/package.json'),Database=require('better-sqlite3'),db=new Database(path.join(data,'studio.db'),{readonly:true}),counts=()=>Object.fromEntries(['ai_calls','ai_reservations','usage_events','jobs','posts','campaigns','video_documents'].map(t=>[t,db.prepare('SELECT COUNT(*) n FROM '+t).get().n])),before=counts();
const socket=net.createServer();await new Promise(r=>socket.listen(0,'127.0.0.1',r));const port=socket.address().port;await new Promise(r=>socket.close(r));
const origin='http://127.0.0.1:'+port,env={...process.env,DATA_DIR:data,NODE_ENV:'production',APP_URL:origin,APP_SECRET:'isolated-approved-postflight-only-no-real-credential-000000',STOCK_OFFLINE:'1',NEXT_TELEMETRY_DISABLED:'1'};
for(const k of Object.keys(env))if(/API_KEY|FAL_KEY|PIXABAY|PEXELS/.test(k))env[k]='';
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-H','127.0.0.1','-p',String(port)],{cwd:root,env,stdio:['ignore','pipe','pipe'],detached:true});let log='',success=false,failure=null,version;const cases=[];
server.stdout.on('data',b=>log+=b);server.stderr.on('data',b=>log+=b);
try{
 for(let i=0;i<160;i++){if(server.exitCode!==null)throw Error('server stopped');try{if((await fetch(origin+'/connexion')).ok)break;}catch{}await new Promise(r=>setTimeout(r,250));}
 version=await(await fetch(origin+'/api/version')).json();assert.equal(version.commit,code);assert.equal(version.tree,'clean');assert.equal(version.source,'compiled-build');
 for(const c of proof.cases){
  const owner=db.prepare('SELECT p.id,u.email FROM assets a JOIN projects p ON p.id=a.project_id JOIN users u ON u.id=p.user_id WHERE a.id=?').get(c.first.output.assetId);assert.ok(owner);
  const login=await fetch(origin+'/api/auth/login',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({email:owner.email,password:'Mot-de-passe-fictif'})});assert.equal(login.status,200);const cookie=login.headers.getSetCookie().map(v=>v.split(';')[0]).join('; ');
  const request={action:'plan',as:'post',generation:'direct',aspect:'9:16',scenes:2,totalS:10,music:false,request:'Conserver les textes exacts, sans voix ni action commerciale ajoutée.'};
  const valid={scenes:[0,1].map(i=>({still:`Objet sur une surface claire, détail ${i+1}.`,motion:'La caméra avance lentement.',title:i?'':'Texte client\nDeux  espaces.',place:'lower',titleColor:'#123456'})),line:'',cta:''};
  const route=origin+'/api/projects/'+owner.id+'/creative/video',post=async(body)=>{const response=await fetch(route,{method:'POST',headers:{origin,cookie,'content-type':'application/json'},body:JSON.stringify(body)});return{http:response.status,json:await response.json()};};
  const checks=[];
  for(const kind of ['third-party','placeholder','missing-scene','unknown-key','shortened-duration']){
   const body={...request,draftPlan:structuredClone(valid)};
   if(kind==='third-party')body.draftPlan.cta='Découvrir Nike';
   if(kind==='placeholder')body.draftPlan.scenes[0].title='[À compléter : titre]';
   if(kind==='missing-scene')body.draftPlan.scenes.pop();
   if(kind==='unknown-key')body.draftPlan.scenes[0].notRepresented='Instruction à conserver';
   if(kind==='shortened-duration'){body.scenes=1;body.totalS=18;body.draftPlan.scenes.pop();}
   const response=await post(body);assert.ok(response.http>=400&&response.http<500,kind);assert.ok(!response.json.approvalToken);checks.push({kind,http:response.http,noApprovalToken:true});
  }
  const accepted=await post({...request,draftPlan:valid});assert.equal(accepted.http,200);assert.deepEqual(accepted.json.scenario,valid);assert.ok(accepted.json.approvalToken);assert.equal(accepted.json.scenario.scenes[0].titleColor,'#123456');
  const sourceFiles=[];for(const acquired of [c.first,c.edited,c.restored]){const response=await fetch(origin+acquired.output.downloadHref,{headers:{cookie}});assert.equal(response.status,200);const bytes=Buffer.from(await response.arrayBuffer()),sha=createHash('sha256').update(bytes).digest('hex');assert.equal(sha,acquired.output.sha256);sourceFiles.push({assetId:acquired.output.assetId,bytes:bytes.length,sha256:sha});}
  cases.push({scene:c.scene,checks,acceptedHttp:200,exactScenarioReturned:true,colorRetained:true,emptyCtaRetained:true,noVoiceAdded:true,approvalTokenCreatedButNotExported:true,sourceFiles,realProviderCalls:0});
 }
 assert.equal(cases.length,4);assert.deepEqual(counts(),before);success=true;console.log(JSON.stringify({success,code,cases:cases.length,negativeRequests:cases.reduce((n,c)=>n+c.checks.length,0),realProviderCalls:0,noWorker:true,providerRowsJobsAndVersionsUnchanged:true}));
}catch(e){failure=String(e);throw e;}finally{const after=counts();db.close();try{process.kill(-server.pid,'SIGTERM');}catch{}fs.writeFileSync(path.join(out,'server.log'),log);fs.writeFileSync(path.join(out,'postflight-proof.json'),JSON.stringify({success,failure,code,version,cases,before,after,fixtureCopyOnly:true,noWorker:true,noProviderOrSdk:true,realProviderCalls:0,realCostEur:0,nativeScenarioHistorySaved:true,unchangedProviderRowsJobsAndVersions:JSON.stringify(before)===JSON.stringify(after)},null,2)+'\n');}
