/** A2 : vrai serveur Next, stockage synthétique isolé et réseau fournisseur interdit. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createHash,randomUUID} from 'node:crypto';
if(process.env.DATABASE_FILE||process.env.STORAGE_DIR||process.env.DATA_DIR)throw Error('Refus du stockage préexistant');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ecs-a2-'));
process.env.DATA_DIR=dir;process.env.STOCK_OFFLINE='1';process.env.APP_SECRET='a2-isolated-'+randomUUID();
for(const key of ['ANTHROPIC_API_KEY','OPENAI_API_KEY','DASHSCOPE_API_KEY','FAL_KEY','GOOGLE_API_KEY','PIXABAY_API_KEY'])process.env[key]='';
const out=path.resolve(process.argv[2]??'work/preuves-syna284-a2');fs.mkdirSync(out,{recursive:true});
const {historicalProject,businessFingerprints}=await import('../tests/conversation284-fixtures');
const {runWithLang}=await import('../src/lib/i18n-server');
const {id,run,one,now}=await import('../src/lib/db');
const {sha256}=await import('../src/lib/secrets');
const {currentTheme,saveThemeVersion}=await import('../src/lib/projects');
const {themeToolContext}=await import('../src/lib/orchestrator/conversation/theme-tool-context');
const fixtures=[];
for(const business of ['products','services'] as const){const f=await runWithLang({ui:'fr',content:'fr'},()=>historicalProject(business));const token=id();run('INSERT INTO sessions(id,user_id,expires_at,created_at) VALUES(?,?,?,?)',sha256(token),f.u.id,now()+3600000,now());fixtures.push({...f,business,token});}
const port=4600+Math.floor(Math.random()*200),origin=`http://localhost:${port}`;
const flags=Object.fromEntries(['LOT_A','AI','UI','CONTEXT','SPECIALISTS','TOOLS','THEME_TOOLS'].map(k=>['STUDIO_CONVERSATION_'+k,'1']));
const server=spawn(process.execPath,[path.resolve('node_modules/next/dist/bin/next'),'dev','-p',String(port),'-H','127.0.0.1'],{env:{...process.env,...flags,APP_URL:origin,NEXT_TELEMETRY_DISABLED:'1',NODE_OPTIONS:`--import=${path.resolve('scripts/lot9/network-guard.mjs')}`},stdio:['ignore','pipe','pipe'],detached:true});
let log='';server.stdout.on('data',d=>{log+=d});server.stderr.on('data',d=>{log+=d});server.on('error',e=>{log+=String(e)});
const stop=()=>{try{process.kill(-server.pid!,'SIGTERM')}catch{}};process.on('exit',stop);
const proof={schema:'syna-a2-live-http-1',http:[] as unknown[],businessChecks:[] as unknown[],providerCalls:0,apiCostEur:0,ui:'No component changed; precise selection exposed by shared API only',errors:[] as string[]};
const digest=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
try{
 const start=Date.now();for(;;){if(Date.now()-start>240000)throw Error('Next non prêt : '+log.slice(-1500));try{if((await fetch(origin+'/connexion',{signal:AbortSignal.timeout(3000)})).ok)break;}catch{}await new Promise(r=>setTimeout(r,1000));}
 console.log('Next prêt — fixtures isolées');
 for(const f of fixtures){
  const call=async(url:string,data:unknown|undefined,status=200)=>{const r=await fetch(origin+url,{method:data===undefined?'GET':'POST',headers:{cookie:`ecs_session=${f.token}`,origin,'content-type':'application/json'},...(data===undefined?{}:{body:JSON.stringify(data)}),signal:AbortSignal.timeout(120000)});const body=await r.json();proof.http.push({business:f.business,operation:data&&typeof data==='object'&&'action'in data?data.action:'read',expected:status,status:r.status});assert.equal(r.status,status,JSON.stringify(body));return body;};
  const before=businessFingerprints();
  const c=await call(`/api/projects/${f.pid}/conversation`,{}),url=`/api/studio-agent/conversations/${c.id}/context`,cur=currentTheme(f.pid)!;
  const directory=await call(url+'?directory=1',undefined);assert.equal(directory.effects.readOnlyProject,true);
  const native=themeToolContext(f.pid),text=native.targets!.find(t=>t.template==='index'&&t.fields.some(d=>d.key==='heading'))!,image=native.targets!.find(t=>t.template==='index'&&t.fields.some(d=>d.type==='image_picker'&&d.nativeMedia?.assetId))!,imageKey=image.fields.find(d=>d.type==='image_picker'&&d.nativeMedia?.assetId)!.key;
  let revision=directory.revision;
  const select=async(section:string,key?:string)=>{const result=await call(url,{action:'select-preview',revision,requestId:id(),native:{projectId:f.pid,versionId:cur.version.id,pagePath:'/',template:'index',section,...(key?{key}:{})}});revision=result.revision;assert.equal(result.state,'valid');return result;};
  const t=await select(text.section,'heading');assert.equal(t.target.text,cur.spec.templates.index.sections[text.section].settings.heading);
  const i=await select(image.section,imageKey);assert.equal(i.target.media.kind,'image');await select(text.section);
  const selected=await select(text.section,'heading');const nav=await call(url,{action:'navigate',revision,requestId:id(),tab:'videos'});revision=nav.revision;assert.equal(nav.reference,selected.reference);assert.equal(nav.state,'valid');
  const denied=await call(`/api/studio-agent/conversations/${c.id}/theme-tools`,{action:'quote',revision,projectRevision:0,proposalReceiptId:'forged'},409);assert.equal(denied.code,'conversation_existing_read_only');
  assert.deepEqual(businessFingerprints(),before);proof.businessChecks.push({business:f.business,phase:'selection-navigation-A1-denial',before:digest(before),after:digest(businessFingerprints()),equal:true});
  const spec=structuredClone(cur.spec);spec.templates.index.sections[text.section].settings.heading='Titre manuel N+1 à conserver';const next=saveThemeVersion(f.pid,spec,'Recette A2 : édition manuelle fictive','user'),afterManual=businessFingerprints();
  const stale=await call(url,undefined);assert.equal(stale.state,'conflict');assert.equal(stale.recovery.current.selection.target.versionId,next.id);
  await call(url,{action:'select-preview',revision,requestId:id(),native:{projectId:f.pid,versionId:cur.version.id,pagePath:'/',template:'index',section:text.section,key:'heading'}},409);
  const command={action:'revalidate',revision,requestId:id(),expectedReference:selected.reference,currentReference:stale.recovery.current.reference,confirmation:true};const fresh=await call(url,command);assert.equal(fresh.state,'valid');assert.equal(fresh.target.text,'Titre manuel N+1 à conserver');const replay=await call(url,command);assert.deepEqual(replay.receipt,fresh.receipt);assert.equal(replay.replayed,true);
  assert.deepEqual(businessFingerprints(),afterManual);proof.businessChecks.push({business:f.business,phase:'consented-revalidation-retry',before:digest(afterManual),after:digest(businessFingerprints()),equal:true});
 }
 assert.equal(one<{n:number}>('SELECT COUNT(*) n FROM ai_calls')!.n,0);assert.equal(one<{n:number}>('SELECT COUNT(*) n FROM jobs')!.n,0);console.log(JSON.stringify({httpChecks:proof.http.length,businessChecks:proof.businessChecks.length,providerCalls:0,apiCostEur:0}));
}catch(e){proof.errors.push(String(e));throw e;}finally{stop();fs.writeFileSync(path.join(out,'RESUME-HTTP.json'),JSON.stringify(proof,null,2)+'\n');fs.writeFileSync(path.join(out,'serveur-local.log'),log);fs.rmSync(dir,{recursive:true,force:true});}
