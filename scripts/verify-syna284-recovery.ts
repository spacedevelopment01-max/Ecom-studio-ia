/** A1 : vrai serveur HTTP et navigateur, projets synthétiques, réseau fournisseur interdit.
 * node --import ./scripts/lot9/network-guard.mjs --import tsx scripts/verify-syna284-recovery.ts DOSSIER_PREUVES
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createHash,randomUUID} from 'node:crypto';
import {chromium,type Page} from 'playwright';
import type {ConversationView} from '../src/lib/orchestrator/conversation/contract';

if(process.env.DATABASE_FILE||process.env.STORAGE_DIR||process.env.DATA_DIR)throw Error('Refus de tout stockage préexistant');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ecs-a1-'));
process.env.DATA_DIR=dir;process.env.STOCK_OFFLINE='1';
process.env.APP_SECRET='isolated-a1-only-'+randomUUID();
for(const key of ['ANTHROPIC_API_KEY','OPENAI_API_KEY','DASHSCOPE_API_KEY','FAL_KEY','GOOGLE_API_KEY','PIXABAY_API_KEY'])process.env[key]='';
const out=path.resolve(process.argv[2]??'work/preuves-syna284-a1');fs.mkdirSync(out,{recursive:true});
const {historicalProject,businessFingerprints}=await import('../tests/conversation284-fixtures');
const {runWithLang}=await import('../src/lib/i18n-server');
const {one,run,id,now}=await import('../src/lib/db');
const {sha256}=await import('../src/lib/secrets');
type Fixture=Awaited<ReturnType<typeof historicalProject>>&{business:'products'|'services'};
const fixtures:Fixture[]=[];
for(const business of ['products','services'] as const)fixtures.push({...await runWithLang({ui:'fr',content:'fr'},()=>historicalProject(business)),business});
const sessions=fixtures.map(f=>{const token=id();run('INSERT INTO sessions(id,user_id,expires_at,created_at) VALUES(?,?,?,?)',sha256(token),f.u.id,now()+3600000,now());return token;});
const before=businessFingerprints();
// Lire le HEAD du worktree sans lancer Git (le proxy/sous-processus Git peut être indisponible).
const gitDir=fs.statSync('.git').isDirectory()?path.resolve('.git'):path.resolve(fs.readFileSync('.git','utf8').trim().replace(/^gitdir: /,''));
const head=fs.readFileSync(path.join(gitDir,'HEAD'),'utf8').trim();
const common=fs.existsSync(path.join(gitDir,'commondir'))?path.resolve(gitDir,fs.readFileSync(path.join(gitDir,'commondir'),'utf8').trim()):gitDir;
const ref=head.startsWith('ref: ')?head.slice(5):null;
const baseCommit=ref?(fs.existsSync(path.join(common,ref))?fs.readFileSync(path.join(common,ref),'utf8').trim():fs.readFileSync(path.join(common,'packed-refs'),'utf8').split('\n').find(l=>l.endsWith(' '+ref))?.split(' ')[0]??''):head;
assert.match(baseCommit,/^[a-f0-9]{40}$/);
const port=4300+Math.floor(Math.random()*300),origin=`http://localhost:${port}`;
const flags={STUDIO_CONVERSATION_LOT_A:'1',STUDIO_CONVERSATION_AI:'1',STUDIO_CONVERSATION_UI:'1'};
const server=spawn(process.execPath,[path.resolve('node_modules/next/dist/bin/next'),'dev','-p',String(port),'-H','127.0.0.1'],{env:{...process.env,...flags,APP_URL:origin,NEXT_TELEMETRY_DISABLED:'1',NODE_OPTIONS:`--import=${path.resolve('scripts/lot9/network-guard.mjs')}`},stdio:['ignore','pipe','pipe'],detached:true});
let log='';const logPath=path.join(out,'serveur.log');server.stdout.on('data',d=>{log+=d;fs.appendFileSync(logPath,d)});server.stderr.on('data',d=>{log+=d;fs.appendFileSync(logPath,d)});
server.on('error',e=>{log+=String(e);fs.appendFileSync(logPath,String(e))});
const stop=()=>{try{process.kill(-server.pid!,'SIGTERM')}catch{/* déjà arrêté */}};process.on('exit',stop);
let browser:Awaited<ReturnType<typeof chromium.launch>>|undefined;
const proof:{source:unknown;http:unknown[];ui:unknown[];fingerprints:unknown;cost:unknown;errors:string[];}={source:{base:baseCommit,files:Object.fromEntries(['src/lib/orchestrator/conversation/existing-project.ts','src/lib/orchestrator/conversation/store.ts','src/lib/orchestrator/conversation/index.ts','src/lib/orchestrator/conversation/contract.ts','src/components/studio/conversation-panel.tsx', 'scripts/verify-syna284-recovery.ts','tests/conversation284-fixtures.ts'].map(p=>[p,createHash('sha256').update(fs.readFileSync(p)).digest('hex')]))},http:[],ui:[],fingerprints:null,cost:null,errors:[]};
try{
 const started=Date.now();for(;;){if(Date.now()-started>240000)throw Error('Serveur non prêt : '+log.slice(-1200));try{const r=await fetch(origin+'/connexion',{signal:AbortSignal.timeout(3000)});if(r.ok)break;}catch{}await new Promise(r=>setTimeout(r,1000));}console.log('Serveur HTTP prêt');
 browser=await chromium.launch({executablePath:process.env.CHROMIUM??'/usr/bin/chromium',args:['--no-sandbox']});
 for(let i=0;i<fixtures.length;i++){
  const f:Fixture=fixtures[i],cookie=`ecs_session=${sessions[i]}`;
  const post=async(url:string,data:unknown):Promise<ConversationView>=>{const r=await fetch(origin+url,{method:'POST',headers:{cookie,origin,'content-type':'application/json'},body:JSON.stringify(data),signal:AbortSignal.timeout(120000)});const body=await r.json() as ConversationView&{code?:string};proof.http.push({business:f.business,url,status:r.status,id:body.id,code:body.code});assert.equal(r.status,200,JSON.stringify(body));return body;};
  const base:string=`/api/projects/${f.pid}/conversation`,[a,b]=await Promise.all([post(base,{}),post(base,{})]);assert.equal(a.id,b.id);assert.equal(a.recovery?.state,'read-only');assert.equal(a.projectRevision,null);
  const cmd={action:'message',text:`Reprise ${f.business} : conserve mon site et mes retouches.`,revision:0,projectRevision:null,requestId:randomUUID()},route=`/api/studio-agent/conversations/${a.id}`;
  const [m1,m2]=await Promise.all([post(route,cmd),post(route,cmd)]);assert.deepEqual(m1,m2);
  const reopened=await fetch(origin+route,{headers:{cookie}});assert.equal(reopened.status,200);const v=await reopened.json();assert.equal(v.history.length,1);assert.equal(v.history[0].request.text,cmd.text);assert.equal(v.recovery.context.previousShopChat.count,2);
  proof.http.push({business:f.business,url:route,status:reopened.status,id:v.id,revision:v.revision,historyCount:v.history.length,contextVersion:v.recovery.contextVersion});
 }
 const afterHttp=businessFingerprints();assert.deepEqual(afterHttp,before);proof.fingerprints={before,afterHttp,equal:true};
 for(let i=0;i<fixtures.length;i++)for(const [label,viewport] of [['desktop',{width:1440,height:900}],['mobile',{width:390,height:844}]] as const){
  const f:Fixture=fixtures[i],context=await browser.newContext({viewport,locale:'fr-FR'});await context.addCookies([{name:'ecs_session',value:sessions[i],url:origin}]);
  const page:Page=await context.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${origin}/studio/${f.pid}/boutique`,{waitUntil:'networkidle',timeout:180000});
  const dock=page.getByRole('button',{name:'SYNA',exact:true});await dock.click();
  await page.getByText(/Projet existant repris en lecture seule/).first().waitFor({timeout:30000});
  await page.getByText(`Reprise ${f.business} : conserve mon site et mes retouches.`,{exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Voir le devis de la réponse de SYNA',exact:true}).count(),0);
  const file=`${f.business}-${label}.png`;await page.screenshot({path:path.join(out,file),fullPage:false});
  // Fermer/réouvrir et recharger : le même fil et le même message doivent revenir.
  await page.reload({waitUntil:'networkidle'});await page.getByRole('button',{name:'SYNA',exact:true}).click();await page.getByText(`Reprise ${f.business} : conserve mon site et mes retouches.`,{exact:true}).waitFor();
  assert.deepEqual(errors,[]);proof.ui.push({business:f.business,viewport,label,file,reload:true,pageErrors:errors});await context.close();
 }
 const calls=one<{n:number}>('SELECT COUNT(*) n FROM ai_calls')!.n,jobs=one<{n:number}>('SELECT COUNT(*) n FROM jobs')!.n;
 assert.equal(calls,0);assert.equal(jobs,0);proof.cost={realProviderCalls:0,aiCalls:calls,jobs,aiCostEur:0,network:'loopback only; native network guard'};
 console.log(JSON.stringify({httpChecks:proof.http.length,captures:proof.ui.length,calls,jobs,businessUnchanged:true}));
}catch(e){proof.errors.push(String(e));throw e;}finally{
 await browser?.close();stop();fs.writeFileSync(path.join(out,'preuve-http-ui.json'),JSON.stringify(proof,null,2)+'\n');fs.writeFileSync(path.join(out,'serveur.log'),log);fs.rmSync(dir,{recursive:true,force:true});
}
