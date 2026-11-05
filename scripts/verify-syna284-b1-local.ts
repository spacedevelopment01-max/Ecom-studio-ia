/** B1 : vrai serveur Next, stockage synthétique isolé et réseau fournisseur interdit. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createHash,randomUUID} from 'node:crypto';
if(process.env.DATABASE_FILE||process.env.STORAGE_DIR||process.env.DATA_DIR)throw Error('Refus du stockage préexistant');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ecs-b1-'));
process.env.DATA_DIR=dir;process.env.STOCK_OFFLINE='1';process.env.APP_SECRET='b1-isolated-'+randomUUID();
for(const key of ['ANTHROPIC_API_KEY','OPENAI_API_KEY','DASHSCOPE_API_KEY','FAL_KEY','GOOGLE_API_KEY','PIXABAY_API_KEY'])process.env[key]='';
const out=path.resolve(process.argv[2]??'work/preuves-syna284-b1');fs.mkdirSync(out,{recursive:true});
const {businessFingerprints}=await import('../tests/conversation284-fixtures');
const {localSiteFixture}=await import('../tests/conversation284-b1-fixtures');
const {compileTheme}=await import('../src/lib/theme/compile');
const {exportShopify}=await import('../src/lib/cms-v2/adapters/shopify');
const {getAsset,assetData}=await import('../src/lib/library');
const {unzipSync}=await import('fflate');
const {themeVersion}=await import('../src/lib/projects');
const {chromium}=await import('playwright');
const {runWithLang}=await import('../src/lib/i18n-server');
const {id,run,one,now}=await import('../src/lib/db');
const {sha256}=await import('../src/lib/secrets');
const {currentTheme,saveThemeVersion}=await import('../src/lib/projects');
const {themeToolContext}=await import('../src/lib/orchestrator/conversation/theme-tool-context');
const flags=Object.fromEntries(['LOT_A','AI','UI','CONTEXT','LOCAL_SITE'].map(k=>['STUDIO_CONVERSATION_'+k,'1']));Object.assign(process.env,flags);
const fixtures=[];for(const business of ['products','services'] as const){const f=await runWithLang({ui:'fr',content:'fr'},()=>localSiteFixture(business)),token=id();run('INSERT INTO sessions(id,user_id,expires_at,created_at) VALUES(?,?,?,?)',sha256(token),f.u.id,now()+3600000,now());fixtures.push({...f,business,token});}
const port=4900+Math.floor(Math.random()*150),origin=`http://localhost:${port}`;
const server=spawn(process.execPath,[path.resolve('node_modules/next/dist/bin/next'),'dev','-p',String(port),'-H','127.0.0.1'],{env:{...process.env,APP_URL:origin,NEXT_TELEMETRY_DISABLED:'1',NODE_OPTIONS:`--import=${path.resolve('scripts/lot9/network-guard.mjs')}`},stdio:['ignore','pipe','pipe'],detached:true});
let log='';server.stdout.on('data',d=>{log+=d});server.stderr.on('data',d=>{log+=d});server.on('error',e=>{log+=String(e)});const stop=()=>{try{process.kill(-server.pid!,'SIGTERM')}catch{}};process.on('exit',stop);
const proof={schema:'syna-b1-live-1',http:[] as unknown[],scenarios:[] as unknown[],screenshots:[] as unknown[],providerCalls:0,apiCostEur:0,errors:[] as string[],ui:'Commands and free confirmation through real SYNA HTTP route; no frontend confirmation UI wired. Screenshots are the existing native preview only.'};
let browser:Awaited<ReturnType<typeof chromium.launch>>|undefined;
const digest=(x:unknown)=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const invariant=()=>{const f=businessFingerprints();delete f.database.projects;delete f.database.theme_versions;return f;};
try{
 const start=Date.now();for(;;){if(Date.now()-start>240000)throw Error('Next non prêt : '+log.slice(-1200));try{if((await fetch(origin+'/connexion',{signal:AbortSignal.timeout(3000)})).ok)break;}catch{}await new Promise(r=>setTimeout(r,1000));}console.log('Next B1 prêt');
 browser=await chromium.launch({executablePath:process.env.CHROMIUM??'/usr/bin/chromium',args:['--no-sandbox']});
 // Amorcer seulement les caches/tables déjà créés par l'aperçu natif, avant les empreintes métier.
 for(const f of fixtures)for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){const context=await browser.newContext({viewport,reducedMotion:'reduce'});await context.addCookies([{name:'ecs_session',value:f.token,url:origin}]);const page=await context.newPage();await page.goto(`${origin}/preview/${f.pid}/v/${f.cur.version.id}`,{waitUntil:'networkidle',timeout:120000});await context.close();}
 for(const f of fixtures)await exportShopify(f.cur.spec,(assetId:string)=>{const a=getAsset(assetId);return a?{data:assetData(a),mime:a.mime,updated:a.created_at}:null;});
 for(const f of fixtures){
  const cookie=`ecs_session=${f.token}`,base=`/api/studio-agent/conversations/${f.c.id}`;
  const call=async(url:string,data:unknown|undefined,status=200)=>{const r=await fetch(origin+url,{method:data===undefined?'GET':'POST',headers:{cookie,origin,'content-type':'application/json'},...(data===undefined?{}:{body:JSON.stringify(data)}),signal:AbortSignal.timeout(120000)}),b=await r.json();proof.http.push({business:f.business,action:data&&typeof data==='object'&&'action'in data?data.action:'read',status:r.status,expected:status});assert.equal(r.status,status,JSON.stringify(b));return b;};
  const select=async(field:boolean)=>{const v=await call(base+'/context',undefined);return call(base+'/context',{action:'select',revision:v.revision,requestId:id(),context:{projectId:f.pid,tab:'boutique',target:field?{kind:'theme-field',versionId:currentTheme(f.pid)!.version.id,template:'index',section:f.section,key:'heading',pagePath:'/'}:{kind:'theme-section',versionId:currentTheme(f.pid)!.version.id,template:'index',section:f.section,pagePath:'/'}}});};
  const message=async(text:string)=>{const v=await call(base,undefined);return call(base,{action:'message',text,revision:v.revision,projectRevision:v.projectRevision,requestId:id()});};
  const confirm=async(proposalId:string)=>{const v=await call(base,undefined),command={action:'confirm-local',proposalId,confirmation:true,revision:v.revision,projectRevision:v.projectRevision,requestId:id()};const [a,b]=await Promise.all([call(base,command),call(base,command)]);assert.deepEqual(a,b);return a;};
  await select(true);const before=invariant(),old=structuredClone(f.cur.spec),compiledBefore=compileTheme(old);
  const loader=(assetId:string)=>{const a=getAsset(assetId);return a?{data:assetData(a),mime:a.mime,updated:a.created_at}:null;};
  const zipBefore=unzipSync((await exportShopify(old,loader)).zip);
  const title=`Découvrez notre collection ${f.business}`,p=await message(`Remplace le titre de cette section par “${title}”`);assert.equal(p.localSite.state,'proposed');assert.equal(currentTheme(f.pid)!.version.id,f.cur.version.id);assert.deepEqual(invariant(),before);
  const applied=await confirm(p.localSite.proposalId);assert.equal(applied.localSite.state,'applied');assert.equal(currentTheme(f.pid)!.spec.templates.index.sections[f.section].settings.heading,title);assert.deepEqual(themeVersion(f.pid,f.cur.version.id)!.spec,old);
  await select(false);const move=await message(`Place cette section après ${f.anchor}`);assert.equal(move.localSite.state,'proposed',JSON.stringify(move.localSite));const moved=await confirm(move.localSite.proposalId);assert.equal(moved.localSite.state,'applied');const cur=currentTheme(f.pid)!,order=cur.spec.templates.index.order;assert.equal(order.indexOf(f.section),order.indexOf(f.anchor)+1);assert.deepEqual(cur.spec.templates.index.sections,themeVersion(f.pid,applied.localSite.version.id)!.spec.templates.index.sections);
  const compiledAfter=compileTheme(cur.spec),changed=[...new Set([...compiledBefore.keys(),...compiledAfter.keys()])].filter(k=>compiledBefore.get(k)!==compiledAfter.get(k));assert.deepEqual(changed,['templates/index.json']);
  const zipAfter=unzipSync((await exportShopify(cur.spec,loader)).zip),zipChanged=[...new Set([...Object.keys(zipBefore),...Object.keys(zipAfter)])].filter(k=>!Buffer.from(zipBefore[k]??[]).equals(Buffer.from(zipAfter[k]??[])));assert.deepEqual(zipChanged,['templates/index.json']);
  assert.deepEqual(invariant(),before);
  const preview=await fetch(origin+moved.localSite.previewHref,{headers:{cookie},signal:AbortSignal.timeout(120000)}),html=await preview.text();assert.equal(preview.status,200);assert.ok(html.includes(title));assert.ok(html.indexOf(`data-es-section="index:${f.anchor}"`)<html.indexOf(`data-es-section="index:${f.section}"`));
  for(const [label,viewport] of [['desktop',{width:1440,height:1000}],['mobile',{width:390,height:844}]] as const){const context=await browser.newContext({viewport,reducedMotion:'reduce'});await context.addCookies([{name:'ecs_session',value:f.token,url:origin}]);const page=await context.newPage();await page.goto(origin+moved.localSite.previewHref,{waitUntil:'networkidle',timeout:120000});await page.getByText(title,{exact:false}).first().scrollIntoViewIfNeeded();const file=`${f.business}-${label}-preview.png`;await page.screenshot({path:path.join(out,file)});proof.screenshots.push({business:f.business,label,file,kind:'existing native preview, not new SYNA UI'});await context.close();}
  // Retour arrière explicitement demandé via le mécanisme manuel natif existant, sans nouvel undo B2.
  const restore=await call(applied.localSite.restore.endpoint,{versionId:applied.localSite.restore.versionId});assert.deepEqual(themeVersion(f.pid,restore.versionId)!.spec,old);assert.deepEqual(invariant(),before);
  const current=await call(base,undefined);assert.ok(current.history.some((h:{request:{text?:string}})=>h.request.text?.includes('Remplace le titre')));
  proof.scenarios.push({business:f.business,titleApplied:true,sectionMoved:true,retryWithoutDuplicate:true,previousVersionsIntact:true,renderVerified:true,exportChangedFiles:changed,realShopifyZipChangedFiles:zipChanged,nativeManualRestoreVerified:true,invariantBefore:digest(before),invariantAfter:digest(invariant()),equal:true});
 }
 for(const table of ['ai_calls','jobs','usage_events','ledger']){const count=one<{n:number}>(`SELECT COUNT(*) n FROM ${table}`)!.n;if(table!=='ledger')assert.equal(count,0);}
 console.log(JSON.stringify({checks:proof.http.length,scenarios:proof.scenarios.length,captures:proof.screenshots.length,providerCalls:0,apiCostEur:0}));
}catch(e){proof.errors.push(String(e));throw e;}finally{await browser?.close();stop();fs.writeFileSync(path.join(out,'RESUME-HTTP.json'),JSON.stringify(proof,null,2)+'\n');fs.writeFileSync(path.join(out,'serveur-local.log'),log);fs.rmSync(dir,{recursive:true,force:true});}
