/** Real production Next server, native auth/routes/worker; ONLY isolated simulation data.
 * Never starts with client configuration. No real provider request is permitted.
 * npx tsx scripts/angles/studio-proof.mts
 * --reproduce-link is only for the pre-fix production build at 894b0ce9.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import http from 'node:http';
import {spawn,execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';

const repo=process.cwd(),out=path.join(repo,'reports/angles-studio');
const childMode=process.argv.includes('--worker');
if(!childMode){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'ecs-angles-studio-'));
 process.env.DATA_DIR=root;process.env.ANGLES_STUDIO_PROOF='1';fs.writeFileSync(path.join(root,'.angles-studio-proof'),'isolated simulation only');process.env.APP_SECRET=crypto.randomBytes(32).toString('hex');
 delete process.env.DATABASE_FILE;delete process.env.STORAGE_DIR;
 for(const key of ['OPENAI_API_KEY','GOOGLE_API_KEY','GEMINI_API_KEY','ALIBABA_API_KEY','ALIBABA_MODEL_STUDIO_API_KEY','DASHSCOPE_API_KEY','FAL_KEY','FAL_API_KEY','PEXELS_API_KEY','PIXABAY_API_KEY'])delete process.env[key];
 process.env.ANTHROPIC_API_KEY='local-simulation-not-a-real-key';
 process.env.STOCK_OFFLINE='1';process.env.NEXT_TELEMETRY_DISABLED='1';
}
const root=process.env.DATA_DIR!;
assert.ok(root&&path.dirname(root)===os.tmpdir()&&path.basename(root).startsWith('ecs-angles-studio-'));
assert.ok(!fs.existsSync(path.join(repo,'.env.local'))&&!fs.existsSync(path.join(repo,'.env')),'No studio env file may be loaded by this proof');
fs.mkdirSync(out,{recursive:true});
const {id,now,run,all,one}=await import('../../src/lib/db');
const {createUser}=await import('../../src/lib/auth');
const {grantProjectPlan}=await import('../../src/lib/project-subscriptions');
const {setSetting}=await import('../../src/lib/settings');
const {initialize,approve}=await import('../../src/lib/preparation/engine');
const {emptyServiceProfile}=await import('../../src/lib/project-types');
const {loadProject,remember}=await import('../../src/lib/projects');

if(childMode){
 const {installSimulatedProviders}=await import('./studio-simulated-providers');
 installSimulatedProviders();
 await import('../../worker/index');
 await new Promise(()=>{});
}
const {chromium}=await import('playwright');
const listener=http.createServer();await new Promise<void>(r=>listener.listen(0,'127.0.0.1',r));const port=(listener.address() as any).port;await new Promise<void>(r=>listener.close(()=>r()));
const base=`http://127.0.0.1:${port}`;process.env.APP_URL=base;
const guard=path.join(root,'network-guard.mjs');
fs.writeFileSync(guard,`import fs from 'node:fs';import http from 'node:http';import https from 'node:https';import net from 'node:net';
const log=${JSON.stringify(path.join(root,'blocked-network.jsonl'))};
function check(host){host=String(host||'localhost').replace(/^\\[|\\]$/g,'');if(!['127.0.0.1','localhost','::1'].includes(host)){fs.appendFileSync(log,JSON.stringify({host})+'\\n');throw Error('External networking forbidden in isolated studio proof');}}
const old=globalThis.fetch;globalThis.fetch=(u,o)=>{check(new URL(typeof u==='string'||u instanceof URL?u:u.url).hostname);return old(u,o)};
for(const m of [http,https])for(const k of ['request','get']){const f=m[k];m[k]=function(...a){const v=a[0];check(typeof v==='string'||v instanceof URL?new URL(v).hostname:v.hostname||v.host);return f.apply(this,a)}}
const connect=net.Socket.prototype.connect;net.Socket.prototype.connect=function(...a){let v=a[0];if(Array.isArray(v))v=v[0];if(typeof v==='object'){if(!v.path)check(v.host)}else if(typeof v==='number')check(a[1]&&typeof a[1]==='string'?a[1]:'localhost');return connect.apply(this,a)};
`);
const guardedEnv={...process.env,NODE_OPTIONS:`${process.env.NODE_OPTIONS??''} --import=${guard}`};
const user=await createUser(`proof-${id()}@example.test`,'isolated-browser-proof-only','Maquette technique');
run("UPDATE users SET role='client' WHERE id=?",user.id);
const pid=id();run('INSERT INTO projects(id,user_id,name,business_type,created_at,updated_at) VALUES(?,?,?,?,?,?)',pid,user.id,'Maquette — non issue d’une recherche réelle','products',now(),now());grantProjectPlan(pid,'vendre');
const {saveAsset,assetData}=await import('../../src/lib/library');
const {default:sharp}=await import('sharp');
const photo=await saveAsset({projectId:pid,userId:user.id,data:await sharp({create:{width:800,height:600,channels:3,background:'#487c85'}}).png().toBuffer(),name:'source-synthetique-maquette.png',mime:'image/png',kind:'image',role:'original',origin:'upload'});
const photoHash=crypto.createHash('sha256').update(assetData(photo)).digest('hex');
remember(pid,{kind:'artifact',key:'proof.client.content',value:'Texte client de vérification : conserver intégralement.',source:'user'});
setSetting('ai.prices.checkedAt',String(now()));
const log=fs.openSync(path.join(root,'next.log'),'w');
const web=spawn(process.execPath,[path.join(repo,'node_modules/next/dist/bin/next'),'start','-H','127.0.0.1','-p',String(port)],{cwd:repo,env:guardedEnv,stdio:['ignore',log,log]});
let worker:ReturnType<typeof spawn>|null=null;
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
let context=await browser.newContext({viewport:{width:1440,height:1000},locale:'fr-FR',timezoneId:'Europe/Paris'});
function seenOnboarding(){try{sessionStorage.setItem('ecsSeen','1');for(const tab of ['pilote','produit','strategie','marque','boutique','images','videos','publications','publicites','calendrier'])localStorage.setItem(`ecs-tuto-seen-${tab}`,'1');}catch{}}
await context.addInitScript(seenOnboarding);
let page=await context.newPage();const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort());
try{
 let ready=false;for(let n=0;n<120;n++){try{ready=(await fetch(`${base}/api/health`)).ok;}catch{}if(ready)break;await new Promise(r=>setTimeout(r,500));}assert.ok(ready,'Production Next did not start');
 await page.goto(`${base}/connexion`);await page.locator('#email').fill(user.email);await page.locator('#password').fill('isolated-browser-proof-only');
 await Promise.all([page.waitForURL(/\/studio/),page.locator('button[type=submit]').click()]);
 await page.goto(`${base}/studio/${pid}/strategie`);await page.locator('[data-research-blocker]').waitFor();
 await page.getByRole('button',{name:'Reprendre les informations de mon offre'}).click();
 await page.waitForURL(/\/(preparation|pilote)$/);await page.waitForLoadState('networkidle');
 const response=await page.request.get(page.url());
 await page.screenshot({path:path.join(out,process.argv.includes('--reproduce-link')?'00-reprise-avant-correction.png':'01-reprise-corrigee.png'),fullPage:true});
 const evidence={schema:'angles-studio-link-reproduction-1',codeCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),productionBuild:true,nativeLogin:true,nativeProjectOwnership:true,nativeResumeAction:true,finalPath:new URL(page.url()).pathname.replace(pid,'PROJECT'),httpStatus:response.status(),preparationVisible:await page.locator('[data-preparation]').count(),sourceWorkingTree:!!execFileSync('git',['status','--porcelain','--','src','scripts','tests'],{encoding:'utf8'}).trim(),served:await(await page.request.get(`${base}/api/version`)).json(),realProviderCalls:0,simulatedDataOnly:true,browserErrors:errors,scope:'Actual authenticated Next production server; not a component harness'};
 fs.writeFileSync(path.join(out,process.argv.includes('--reproduce-link')?'reprise-avant-correction.json':'reprise-corrigee.json'),JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify(evidence));
 assert.equal(response.status(),process.argv.includes('--reproduce-link')?404:200);
 if(!process.argv.includes('--reproduce-link')){
  worker=spawn(process.execPath,['--import','tsx',path.join(repo,'scripts/angles/studio-proof.mts'),'--worker'],{cwd:repo,env:guardedEnv,stdio:['ignore',log,log]});
  await page.locator('[data-preparation]').waitFor();
  const {stateOf}=await import('../../src/lib/preparation/store');
  const {getStrategyState}=await import('../../src/lib/marketing-strategy');
  const captures:any[]=[],checks:any[]=[];
  async function shot(name:string){
   await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:path.join(out,`${name}-desktop.png`),fullPage:true});captures.push(`${name}-desktop.png`);
   await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(out,`${name}-mobile.png`),fullPage:true});captures.push(`${name}-mobile.png`);await page.setViewportSize({width:1440,height:1000});
   if(['02-renseignements','05-angles-simules','10-services-activite-complete'].includes(name)){
    const anchor=name.startsWith('02')?'[data-brief-name]':'[data-marketing-strategy]';
    await page.locator(anchor).evaluate(el=>window.scrollTo(0,Math.max(0,scrollY+el.getBoundingClientRect().top-96)));await page.screenshot({path:path.join(out,`${name}-lecture-desktop.png`)});captures.push(`${name}-lecture-desktop.png`);
    await page.setViewportSize({width:390,height:844});await page.locator(anchor).evaluate(el=>window.scrollTo(0,Math.max(0,scrollY+el.getBoundingClientRect().top-96)));await page.screenshot({path:path.join(out,`${name}-lecture-mobile.png`)});captures.push(`${name}-lecture-mobile.png`);await page.setViewportSize({width:1440,height:1000});
   }
  }
  async function waitFor(check:()=>boolean,label:string){for(let n=0;n<180;n++){if(check())return;await new Promise(r=>setTimeout(r,500));}throw Error(`Timeout: ${label}`);}
  await page.locator('[data-brief-name]').fill('Pupitre de lecture — maquette');
  await page.locator('[data-brief-description]').fill('Un support de lecture de table réglable, pour consulter un livre posé devant soi. Informations fictives de vérification uniquement. Aucune origine ou performance à inventer.');
  await page.locator('[data-brief-target]').fill('Lecteurs qui consultent un livre à leur bureau.');
  await page.locator('[data-save-brief]').click();await waitFor(()=>stateOf(pid)?.stages.brief?.data.input.offerName==='Pupitre de lecture — maquette','saved project information');
  await shot('02-renseignements');
  await page.getByRole('button',{name:'Analyser mes informations et mes photos par l’IA',exact:true}).click();
  await page.getByRole('button',{name:'Confirmer cet essai',exact:true}).click();
  await waitFor(()=>stateOf(pid)?.stages.brief?.data.provenance==='simulation','simulated understanding');await page.reload();
  await page.locator('[data-approve-brief]').waitFor();await shot('03-comprehension-simulee');
  await page.locator('[data-approve-brief]').click();await waitFor(()=>stateOf(pid)?.stages.brief?.status==='approved','brief approval');
  await page.getByRole('button',{name:/2\. Recherche et stratégie/}).click();
  await page.locator('[data-generate-research]').click();await page.getByRole('button',{name:'Confirmer cet essai',exact:true}).click();
  await waitFor(()=>!!stateOf(pid)?.stages.research?.data.execution,'simulated research');await page.reload();
  await page.getByRole('button',{name:/2\. Recherche et stratégie/}).click();await shot('04-recherche-simulee');
  await page.goto(`${base}/studio/${pid}/strategie`);await page.getByRole('button',{name:/Reprendre.*recherche.*acquise|Afficher.*propositions/i}).click();
  await page.locator('[data-angle-card]').first().waitFor();assert.equal(await page.locator('[data-angle-card]').count(),5);await shot('05-angles-simules');
  await page.locator('[data-prepare-angle=usage]').click();await page.locator('[data-choice-consequence]').waitFor();await shot('06-confirmation');
  for(const b of await page.getByRole('button',{name:'Conserver, signalé non aligné',exact:true}).all())await b.click();
  await page.locator('[data-confirm-strategy]').click();await page.locator('[data-active-angle=usage]').waitFor();await shot('07-choix-sauvegarde');
  await page.goto(`${base}/studio/${pid}/pilote`);await page.locator('[data-approve-research]').waitFor();await page.locator('[data-approve-research]').click();await waitFor(()=>stateOf(pid)?.stages.research?.status==='approved','research selection approval');
  const storage=await context.storageState();await context.close();context=await browser.newContext({storageState:storage,viewport:{width:1440,height:1000},locale:'fr-FR',timezoneId:'Europe/Paris'});
  await context.addInitScript(seenOnboarding);
  const reopened=await context.newPage();await reopened.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort());await reopened.goto(`${base}/studio/${pid}/strategie`);await reopened.locator('[data-active-angle=usage]').waitFor();await reopened.screenshot({path:path.join(out,'08-session-rouverte.png'),fullPage:true});captures.push('08-session-rouverte.png');
  page=reopened;page.on('pageerror',e=>errors.push(e.message));
  assert.equal(getStrategyState(pid).usedAngleIds.length,1);checks.push({step:'full studio workflow',passed:true,scope:'Real Next production, login, HTTP routes, native worker, persistent SQLite; provider execution simulated'});
  assert.ok(stateOf(pid)!.stages.brief!.data.input.photoIds.includes(photo.id));assert.equal(crypto.createHash('sha256').update(assetData(photo)).digest('hex'),photoHash);assert.equal(one<{value:string}>("SELECT value FROM memory WHERE project_id=? AND key='proof.client.content'",pid)!.value,'Texte client de vérification : conserver intégralement.');
  checks.push({step:'uploaded image and existing client text',passed:true,originalImageUnchanged:true,existingTextUnchanged:true});
  async function strategyPost(projectId:string,data:unknown){const r=await page.request.post(`${base}/api/projects/${projectId}/marketing-strategy`,{data,headers:{origin:base}});return{status:r.status(),body:await r.json()};}
  async function prepPost(projectId:string,data:any){const r=await page.request.post(`${base}/api/projects/${projectId}/preparation`,{data:{revision:stateOf(projectId)!.revision,...data},headers:{origin:base}});const body=await r.json();assert.equal(r.status(),200,JSON.stringify(body));return body;}
  async function acquireUnderstanding(projectId:string,service=false){
   initialize(projectId,{offerName:service?'Diagnostic et atelier — maquette':'Support de consultation — maquette',brandName:'',description:service?'Diagnostic des usages et atelier participatif pour organiser les espaces de travail.':'Support manuel destiné à consulter un livre posé sur une table.',target:service?'Responsables des espaces de travail':'Personnes qui consultent un livre à leur bureau',constraints:'Simulation technique ; aucune promesse commerciale.',business:service?'services':'products',photoIds:[],referenceUrls:[],price:'',services:service?{...emptyServiceProfile(),services:[{name:'Diagnostic',description:'Étudier les usages.'},{name:'Atelier',description:'Recueillir les besoins.'}],email:'test@example.test'}:emptyServiceProfile()});
   const q=await prepPost(projectId,{action:'quote',step:'brief',runAction:'analyze'});await prepPost(projectId,{action:'generate',quoteId:q.quote.id});await waitFor(()=>stateOf(projectId)?.stages.brief?.data.provenance==='simulation','additional understanding');await prepPost(projectId,{action:'approve',step:'brief'});
  }
  async function acquireResearch(projectId:string){const q=await strategyPost(projectId,{action:'quote_research'});assert.equal(q.status,200,JSON.stringify(q));const started=await strategyPost(projectId,{action:'confirm_research',quoteId:q.body.quote.id,confirmed:true});assert.equal(started.status,200);await waitFor(()=>!!stateOf(projectId)?.stages.research?.data.execution,'additional research');const adopted=await strategyPost(projectId,{action:'analyze'});assert.equal(adopted.status,200,JSON.stringify(adopted));}
  async function createCase(plan:'creer'|'vendre'|'dominer',service=false){const projectId=id();run('INSERT INTO projects(id,user_id,name,business_type,created_at,updated_at) VALUES(?,?,?,?,?,?)',projectId,user.id,'Maquette — non issue d’une recherche réelle',service?'services':'products',now(),now());grantProjectPlan(projectId,plan);await acquireUnderstanding(projectId,service);return projectId;}
  async function select(projectId:string,angleId:string){const r=await strategyPost(projectId,{action:'prepare',angleId});assert.equal(r.status,200,JSON.stringify(r));for(const c of r.body.preparation.contents.filter((c:any)=>!c.aligned&&!c.published))assert.equal((await strategyPost(projectId,{action:'review',preparationId:r.body.preparation.id,module:c.module,contentId:c.contentId,decision:'retain_unaligned',confirmed:true})).status,200);const active=await strategyPost(projectId,{action:'activate',angleId,preparationId:r.body.preparation.id,idempotencyKey:crypto.randomUUID(),confirmed:true,retainUnaligned:true});assert.equal(active.status,200,JSON.stringify(active));}
  for(const [plan,limit] of [['creer',1],['vendre',2],['dominer',5]] as const){
   const projectId=limit===2?pid:await createCase(plan);if(limit!==2)await acquireResearch(projectId);
   const ids=['usage','reassurance','expression','discovery','generalist'];for(const angle of ids.slice(limit===2?1:0,limit))await select(projectId,angle);
   assert.equal(getStrategyState(projectId).usedAngleIds.length,limit);assert.equal(getStrategyState(projectId).limit,limit);
   const refused=await strategyPost(projectId,{action:'prepare',angleId:ids[limit]??'sixth'});assert.equal(refused.status,limit===5?400:402);
   grantProjectPlan(projectId,plan);assert.equal(getStrategyState(projectId).usedAngleIds.length,limit);await select(projectId,'usage');assert.equal(getStrategyState(projectId).usedAngleIds.length,limit);
   await page.goto(`${base}/studio/${projectId}/strategie`);await page.locator('[data-angle-quota]').waitFor();await shot(`09-forfait-${limit}`);checks.push({step:'persistent plan quota',plan,limit,used:limit,extraChoiceStatus:refused.status,reselectionConsumesNoSlot:true,subscriptionReplacementPreservesHistory:true});
  }
  const service=await createCase('vendre',true);await acquireResearch(service);const servicesBefore=JSON.stringify(loadProject(service).services);await select(service,'reassurance');await prepPost(service,{action:'approve',step:'research',choiceId:'generalist'});assert.equal(JSON.stringify(loadProject(service).services),servicesBefore);assert.equal(all('SELECT id FROM theme_versions WHERE project_id=?',service).length,0);await page.goto(`${base}/studio/${service}/strategie`);await page.locator('[data-service-strategy-scope]').waitFor();await shot('10-services-activite-complete');checks.push({step:'service whole business versus communication angle',passed:true,serviceCount:loadProject(service).services.services.length,communicationAngle:'reassurance',siteAngle:'generalist',usedAngleCount:1,serviceProfileUnchanged:true,themeGenerated:false});
  for(const scenario of ['absent','failed','partial']){
   const projectId=await createCase('vendre');await page.goto(`${base}/studio/${projectId}/strategie`);await page.locator('[data-quote-research]').waitFor();
   if(scenario==='absent')setSetting('provider.anthropic.disabled','1');else setSetting(`proof.scenario.${projectId}`,scenario);
   await page.locator('[data-quote-research]').click();
   if(scenario==='absent'){await page.getByRole('alert').waitFor();assert.equal(all('SELECT id FROM jobs WHERE project_id=?',projectId).length,1);}else{await page.locator('[data-confirm-research]').click();await waitFor(()=>!!stateOf(projectId)?.error,'research refusal');await page.reload();await page.locator('[data-research-job]').waitFor();assert.equal(one<{status:string}>("SELECT status FROM jobs WHERE project_id=? ORDER BY rowid DESC LIMIT 1",projectId)!.status,'failed');}
   assert.equal(getStrategyState(projectId).angles.length,0);assert.equal(await page.locator('[data-angle-card]').count(),0);await shot(`11-blocage-${scenario}`);const last=one<{status:string;progress:number;result:string|null}>("SELECT status,progress,result FROM jobs WHERE project_id=? ORDER BY rowid DESC LIMIT 1",projectId)!;if(scenario!=='absent'){assert.ok(last.progress<1);assert.ok(!last.result);assert.match(await page.locator('[data-research-job]').innerText(),/interrompue/);}checks.push({step:'refusal without invented angle',scenario,passed:true,newAngles:0,lastTaskStatus:last.status,lastTaskProgress:last.progress,resultPresent:!!last.result,researchTasks:all("SELECT id FROM jobs WHERE project_id=? AND json_extract(payload,'$.step')='research'",projectId).length});setSetting('provider.anthropic.disabled','0');
  }
  const {withCommunicationStrategy}=await import('../../src/lib/strategy-consumption');
  const {adInsight}=await import('../../src/lib/ads-v2/insight');const {socialStrategy}=await import('../../src/lib/social-v2/strategy');const {videoStrategy}=await import('../../src/lib/video-v2/strategy');const {brainView}=await import('../../src/lib/brain/facade');const {SCOPES}=await import('../../src/lib/brain/views');
  for(const projectId of [pid,service])withCommunicationStrategy(projectId,()=>{const p=loadProject(projectId),active=getStrategyState(projectId).active!;assert.equal(adInsight(p).audience.declared,active.angle.audience);assert.deepEqual(socialStrategy(p).tone,[active.angle.tone]);assert.ok(videoStrategy(p,{kind:'brand_film',goal:'présenter',audience:null,durationS:15,aspect:'16:9'} as any).style.camera.includes(active.angle.visualDirection));for(const scope of SCOPES.filter(s=>s!=='all'))assert.ok(brainView(p,scope).kept.includes('strategy.active'));checks.push({step:'transmission to modules without generation',business:p.business,activeAngle:active.angleId,modules:['ads','social','video',...SCOPES.filter(s=>s!=='all')],passed:true});});
  assert.equal(all("SELECT id FROM jobs WHERE type!='project.prepare'").length,0);assert.equal(all("SELECT id FROM assets WHERE origin='generated'").length,0);
  assert.ok(all<{provider:string}>('SELECT provider FROM ai_calls').every(c=>c.provider==='simulated'));
  assert.ok(!fs.existsSync(path.join(root,'blocked-network.jsonl')),'Unexpected external request blocked');
  assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(out,'studio-workflow.json'),JSON.stringify({schema:'angles-studio-workflow-1',commit:evidence.codeCommit,workingTree:!!execFileSync('git',['status','--porcelain','--','src','scripts','tests'],{encoding:'utf8'}).trim(),served:evidence.served,providerCalls:0,blockedExternalRequests:0,providerDoubles:true,realNextServer:true,realWorker:true,onboarding:'Existing seen preferences set in test browser only; no UI code or CSS overrides',checks,captures},null,2)+'\n');
 }
}finally{
 await context.close();await browser.close();
 async function stop(child:ReturnType<typeof spawn>){if(child.exitCode!==null||child.signalCode!==null)return;await new Promise<void>(resolve=>{child.once('exit',()=>resolve());child.kill('SIGTERM');});}
 if(worker)await stop(worker);await stop(web);fs.closeSync(log);
 fs.writeFileSync('/tmp/angles-studio-last-root.json',JSON.stringify({root}));
}
