import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import http from 'node:http';
import assert from 'node:assert/strict';
import {spawn,execFileSync} from 'node:child_process';
import {randomUUID,createHash} from 'node:crypto';
import {chromium} from 'playwright';

assert.ok(!process.env.DATA_DIR&&!process.env.DATABASE_FILE&&!process.env.STORAGE_DIR);
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'ecs-addoc347-ui-'));
process.env.DATA_DIR=temp;process.env.STOCK_OFFLINE='1';process.env.APP_SECRET='synthetic-'+randomUUID();process.env.STUDIO_SYNA_SHELL='1';
for(const k of ['LOT_A','AI','UI','CONTEXT','SPECIALISTS','TOOLS','AD_DOCUMENT_LOCAL'])process.env['STUDIO_CONVERSATION_'+k]='1';
for(const k of ['OPENAI_API_KEY','ANTHROPIC_API_KEY','GOOGLE_API_KEY','FAL_KEY','DASHSCOPE_API_KEY'])process.env[k]='';
const out=process.env.STUDIO_PROOF_OUTPUT!;fs.mkdirSync(out,{recursive:true});let sdkHttp=0;
const trap=http.createServer((_q,r)=>{sdkHttp++;r.writeHead(500);r.end('Paid provider forbidden');});
await new Promise<void>(r=>trap.listen(0,'127.0.0.1',r));
const provider='http://127.0.0.1:'+(trap.address() as net.AddressInfo).port;
process.env.ANTHROPIC_API_KEY='synthetic-loopback-only';process.env.ANTHROPIC_BASE_URL=provider;process.env.OPENAI_API_KEY='synthetic-loopback-only';process.env.OPENAI_BASE_URL=provider+'/v1';
const {account,project}=await import('../tests/conversation209-fixtures');
const {saveAndRender,latestDoc}=await import('../src/lib/ad-doc/store');
const {openProjectConversation}=await import('../src/lib/orchestrator/conversation');
const {all,one,run,now}=await import('../src/lib/db');
const {sha256}=await import('../src/lib/secrets');
const {projectAccountKey}=await import('../src/lib/project-billing');
const {balance}=await import('../src/lib/billing');
const {writeSynaPrefs}=await import('../src/lib/syna-ui/prefs-store');
const {claimNext,JobContext,completeJob}=await import('../src/lib/jobs');
const {handlers}=await import('../worker/handlers');
const {runForUser}=await import('../src/lib/ai/access');
const {withTrace}=await import('../src/lib/ai/trace');
const hash=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
const counters=(pid:string)=>Object.fromEntries(['ai_calls','jobs','usage_events','ai_reservations'].map(t=>[t,one<any>(`SELECT COUNT(*) n FROM ${t} WHERE project_id=?`,pid)!.n]));
const fixtures:any[]=[];
for(const scene of [{mode:'encre',width:1440},{mode:'plein',width:390},{mode:'plein',width:1440},{mode:'encre',width:390}]){
 const u=await account(),pid=project(u),c=openProjectConversation(u,pid),key='ad:ui-'+randomUUID();
 writeSynaPrefs(u.id,'account',null,{mode:scene.mode as any,panel:'collapsed'});
 const doc:any={version:1,width:800,height:800,background:'#e1e9df',safe:{top:30,bottom:30,side:30},format:{platform:'meta_feed',aspect:'1:1'},brand:{palette:{accent:'#173b2d'},fonts:{heading:'Arial',body:'Arial'},name:'FICTIF'},meta:{source:'user',conceptId:null,createdFrom:null},layers:[{kind:'text',id:'title',name:'Titre acquis',role:'title',x:30,y:80,w:600,h:100,rotation:0,opacity:1,visible:true,locked:false,anchor:{h:'left',v:'top'},text:'Création fictive enregistrée',font:{family:'Arial',weight:700,size:40,italic:false},color:'#173b2d',align:'left',lineHeight:1.1,letterSpacing:0,uppercase:false,autoFit:null,shadow:null}]};
 await saveAndRender(pid,u.id,key,doc,'Fictif initial',{expectedVersion:0});await saveAndRender(pid,u.id,key,doc,'Version native2, schéma1',{expectedVersion:1});
 run('UPDATE wallets SET monthly_used=monthly_allowance,topup_balance=0 WHERE user_id=?',projectAccountKey(pid));assert.equal(balance(u.id,pid).available,0);
 const token=randomUUID();run('INSERT INTO sessions(id,user_id,expires_at,created_at) VALUES(?,?,?,?)',sha256(token),u.id,now()+3600000,now());fixtures.push({...scene,u,pid,cid:c.id,key,token});
}
const sock=net.createServer();await new Promise<void>(r=>sock.listen(0,'127.0.0.1',r));const port=(sock.address() as net.AddressInfo).port;await new Promise<void>(r=>sock.close(()=>r()));const origin='http://127.0.0.1:'+port;
const server=spawn(process.execPath,[path.resolve('node_modules/next/dist/bin/next'),'start','-p',String(port),'-H','127.0.0.1'],{env:{...process.env,NODE_ENV:'production',APP_URL:origin,NEXT_TELEMETRY_DISABLED:'1'},stdio:['ignore','pipe','pipe'],detached:true});let logs='';server.stdout.on('data',b=>logs+=b);server.stderr.on('data',b=>logs+=b);
let browser:any,context:any,page:any;const proof:any={sourceCommit:process.env.STUDIO_PROOF_EXPECTED_COMMIT,sourceTree:process.env.STUDIO_PROOF_EXPECTED_TREE,cases:[],realProviderCalls:0};
try{
 assert.equal(execFileSync('git',['rev-parse','HEAD^{tree}'],{encoding:'utf8'}).trim(),proof.sourceTree);
 const deadline=Date.now()+30000;for(;;){try{if((await fetch(origin+'/api/version')).ok)break;}catch{}if(Date.now()>deadline)throw Error('Server not ready');await new Promise(r=>setTimeout(r,100));}
 proof.runtime=await(await fetch(origin+'/api/version')).json();assert.equal(proof.runtime.commit,proof.sourceCommit);assert.equal(proof.runtime.tree,'clean');assert.equal(proof.runtime.mode,'production');assert.equal(proof.runtime.source,'compiled-build');
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-background-networking']});
 for(const f of fixtures){
  const label=f.mode+'-'+f.width,errors:string[]=[],blocked:string[]=[],confirmBodies:any[]=[];context=await browser.newContext({viewport:{width:f.width,height:1000},locale:'fr-FR',reducedMotion:'reduce',acceptDownloads:true});
  await context.addCookies([{name:'ecs_session',value:f.token,url:origin}]);await context.route('**/*',(r:any)=>{if(new URL(r.request().url()).origin===origin)return r.continue();blocked.push(r.request().url());return r.abort();});await context.tracing.start({screenshots:true,snapshots:true,sources:true});page=await context.newPage();page.setDefaultTimeout(30000);page.on('pageerror',(e:any)=>errors.push(e.message));let projectReads=0;page.on('response',(r:any)=>{if(r.url()===origin+'/api/projects/'+f.pid&&r.request().method()==='GET')projectReads++;});
  const route=origin+'/api/studio-agent/conversations/'+f.cid,panel=page.locator('#syna-panel:visible'),editor=page.getByTestId('ad-editor'),card=panel.getByRole('region',{name:'Modification gratuite de la création',exact:true});
  const ensurePanel=async()=>{if(!await panel.count())await page.locator('[aria-controls="syna-panel"]:visible').first().click();await panel.waitFor();};
  const read=async()=>{const r=await context.request.get(route);assert.equal(r.status(),200);return r.json();};
  const snapshot=()=>({docs:one<any>('SELECT COUNT(*) n FROM ad_documents WHERE project_id=?',f.pid)!.n,assets:one<any>('SELECT COUNT(*) n FROM assets WHERE project_id=?',f.pid)!.n});let initial=snapshot();
  const screenshot=async(name:string)=>page.screenshot({path:out+'/'+label+'-'+name+'.png'});
  const record:any={scene:{mode:f.mode,width:f.width},pid:f.pid,cid:f.cid,docKey:f.key,errors,blocked,initial};proof.cases.push(record);
  await page.goto(origin+`/studio/${f.pid}/publicites#image`,{waitUntil:'networkidle'});await page.locator('#ecs-splash').waitFor({state:'hidden'});const nudge=page.locator('[data-tuto-nudge]');if(await nudge.isVisible())await nudge.locator('button').last().click();await page.getByTestId('edit-creative').first().click();await editor.locator('[data-ready="1"]').count().catch(()=>0);await page.locator('[data-testid="ad-editor"][data-ready="1"]').waitFor();
  if(f.width<500)await page.getByTestId('m-layers').click();await page.getByRole('button',{name:'Sélectionner Titre acquis',exact:true}).click();
  if(f.mode==='encre'&&f.width===1440){await page.getByTestId('prop-text').fill('BROUILLON NON ENREGISTRÉ');assert.equal(await page.getByRole('button',{name:'Désigner le titre pour SYNA',exact:true}).count(),0);await page.getByTestId('undo').click();const saved=page.waitForResponse((r:any)=>r.request().method()==='POST'&&r.url().includes('/ads/docs/')&&r.request().postDataJSON()?.action==='save');await page.getByTestId('save').click();assert.equal((await saved).status(),200);record.dirtySelectionRefused=true;record.manualUndoSaved=true;initial=snapshot();record.initial=initial;}
  const baseVersion=latestDoc(f.pid,f.key)!.version.version;record.baseVersion=baseVersion;
  if(f.width<500)await page.getByTestId('m-more').click();await screenshot('selection-native');await page.getByRole('button',{name:'Désigner le titre pour SYNA',exact:true}).click();await editor.waitFor({state:'hidden'});await panel.waitFor();
  const selected=page.waitForResponse((r:any)=>r.url()===route+'/context'&&r.request().method()==='POST');await panel.getByRole('button',{name:'Utiliser ce titre enregistré',exact:true}).click();assert.equal((await selected).status(),200);assert.deepEqual((await read()).activeContext.presentation.selection.target,{kind:'ad-document-text',docKey:f.key,layerId:'title',version:baseVersion});
  const readsBefore=projectReads,started=Date.now();await page.waitForTimeout(17000);record.refresh17s={elapsedMs:Date.now()-started,readsBefore,readsAfter:projectReads};assert.ok(record.refresh17s.elapsedMs>=17000);assert.ok(projectReads>readsBefore,'automatic project refresh must really occur');assert.equal((await read()).activeContext.presentation.state,'valid');
  const speak=async()=>{const response=page.waitForResponse((r:any)=>r.url()===route&&r.request().method()==='POST'&&r.request().postDataJSON()?.action==='message');await panel.getByRole('textbox',{name:'Décrivez votre projet ou posez votre question à SYNA'}).fill('Agrandis le titre de la création sélectionnée');await panel.getByRole('button',{name:'Enregistrer',exact:true}).click();const r=await response;assert.equal(r.status(),200,await r.text());await card.waitFor();return read();};
  let proposed=(await speak()).localAdDocument;record.firstProposal=proposed;assert.equal(proposed.state,'proposed');assert.equal(proposed.costEur,0);assert.equal(proposed.actionsExecuted,false);assert.ok(proposed.nativeEffects.some((x:any)=>x.field==='font.size'&&x.before===40&&x.after===48));await card.locator('img').evaluateAll((imgs:any[])=>Promise.all(imgs.map(img=>img.decode())));await card.screenshot({path:out+'/'+label+'-avant-apres.png'});assert.deepEqual(snapshot(),initial);assert.equal(counters(f.pid).jobs,0);assert.equal(sdkHttp,0);
  const cancelled=page.waitForResponse((r:any)=>r.url()===route+'/ad-documents'&&r.request().method()==='POST'&&r.request().postDataJSON()?.action==='cancel');await card.getByRole('button',{name:'Annuler',exact:true}).click();assert.equal((await cancelled).status(),200);await card.getByText(/cancelled/).waitFor();await page.reload({waitUntil:'networkidle'});await ensurePanel();await card.getByText(/cancelled/).waitFor();assert.equal((await read()).localAdDocument.state,'cancelled');assert.deepEqual(snapshot(),initial);assert.equal(counters(f.pid).jobs,0);record.cancelledAfterActualReload=true;await screenshot('annulation-recharge');
  await panel.getByRole('button',{name:/Reprendre le repère sauvegardé/}).click();proposed=(await speak()).localAdDocument;
  let lose=true;await context.route('**/api/studio-agent/conversations/'+f.cid+'/ad-documents',async(r:any)=>{if(r.request().method()==='POST'&&r.request().postDataJSON()?.action==='confirm'){confirmBodies.push(r.request().postDataJSON());if(lose){lose=false;const response=await r.fetch();assert.equal(response.status(),200);return r.abort('failed');}}return r.continue();});
  await card.getByRole('button',{name:'Confirmer gratuitement',exact:true}).click();await card.getByRole('button',{name:'Vérifier le reçu',exact:true}).waitFor();await screenshot('reponse-perdue');await card.getByRole('button',{name:'Vérifier le reçu',exact:true}).click();await card.getByText(/Retouche locale en cours de vérification/).waitFor();assert.equal(counters(f.pid).jobs,1);assert.equal(confirmBodies.length,1);assert.equal(latestDoc(f.pid,f.key)!.version.version,baseVersion);
  const job=claimNext()!;assert.equal(job.project_id,f.pid);assert.equal(job.type,'agent.ad-document.local');const result=await runForUser(f.u.id,()=>withTrace({jobId:job.id,projectId:f.pid},()=>handlers[job.type](new JobContext(job))),'normal',f.pid);completeJob(job.id,result);await card.getByText('Enregistré et relu · version '+(baseVersion+1),{exact:true}).waitFor();assert.equal((await read()).localAdDocument.delivered,true);assert.equal(latestDoc(f.pid,f.key)!.version.version,baseVersion+1);assert.equal((latestDoc(f.pid,f.key)!.doc.layers[0] as any).font.size,48);assert.equal(confirmBodies.length,1);assert.deepEqual(snapshot(),{docs:initial.docs+1,assets:initial.assets+1});await card.screenshot({path:out+'/'+label+'-recu.png'});
  const downloadPromise=page.waitForEvent('download');await card.getByRole('link',{name:'Exporter cette version PNG',exact:true}).click();const download=await downloadPromise;await download.saveAs(out+'/'+label+'-resultat.png');const png=fs.readFileSync(out+'/'+label+'-resultat.png');assert.equal(png.subarray(1,4).toString(),'PNG');const before=await(await context.request.get(origin+`/api/projects/${f.pid}/ads/docs/${encodeURIComponent(f.key)}?export=png&version=${baseVersion}`)).body();assert.notEqual(hash(png),hash(before));
  await page.reload({waitUntil:'networkidle'});await ensurePanel();await card.getByText('Enregistré et relu · version '+(baseVersion+1),{exact:true}).waitFor();record.savedAfterActualReload=true;record.confirmBodies=confirmBodies;record.outputVersion=latestDoc(f.pid,f.key)!.version;record.resultPngSha256=hash(png);record.counters=counters(f.pid);record.sdkHttp=sdkHttp;record.budget=balance(f.u.id,f.pid).available;assert.deepEqual(record.counters,{ai_calls:0,jobs:1,usage_events:0,ai_reservations:0});assert.equal(record.budget,0);assert.equal(sdkHttp,0);assert.deepEqual(errors,[]);await screenshot('recu-recharge');record.status='PASS';await context.tracing.stop({path:out+'/'+label+'-trace.zip'});await context.close();context=null;console.log('PASS',label);
 }
 proof.status='PASS';
}catch(e){proof.status='FAIL';proof.error=(e as Error).stack;if(page)await page.screenshot({path:out+'/failure.png'}).catch(()=>{});if(context)await context.tracing.stop({path:out+'/failure-trace.zip'}).catch(()=>{});throw e;}
finally{proof.sdkHttp=sdkHttp;fs.writeFileSync(out+'/proof.json',JSON.stringify(proof,null,2));fs.writeFileSync(out+'/server.log',logs);await browser?.close();if(server.pid)try{process.kill(-server.pid,'SIGTERM');}catch{}await new Promise<void>(r=>trap.close(()=>r()));fs.rmSync(temp,{recursive:true,force:true});}
