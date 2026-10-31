/** #277 : HTTP et navigateur sur le build intégré exact, comptes/médias/données de recette uniquement. */
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import net from 'node:net';
import {randomBytes} from 'node:crypto';import {spawn,type ChildProcess} from 'node:child_process';
for(const f of ['.env','.env.local'])assert.ok(!fs.existsSync(f),'Configuration réelle refusée');
assert.ok(!process.env.DATABASE_FILE&&!process.env.STORAGE_DIR&&!process.env.DATA_DIR,'Sélecteur de données hérité refusé');
const expectedCandidate=process.argv.find(x=>x.startsWith('--expected-commit='))?.slice('--expected-commit='.length);assert.match(expectedCandidate??'',/^[0-9a-f]{40}$/,'SHA attendu explicite obligatoire');
const previewOnly=process.argv.includes('--preview-only'),bindHost=process.argv.includes('--bind-localhost')?'localhost':'127.0.0.1';
const root=fs.mkdtempSync(path.join(os.tmpdir(),'ecs-277-metiers-'));process.env.DATA_DIR=root;process.env.STOCK_OFFLINE='1';process.env.APP_SECRET=randomBytes(32).toString('hex');
for(const key of Object.keys(process.env))if(/(?:API_KEY|FAL_KEY|SMTP_|SITES_DOMAIN|SITES_CUSTOM_DOMAINS)/.test(key))delete process.env[key];
process.env.SITES_DOMAIN='sites.recette.test';
const out=path.resolve(process.argv[2]??'');assert.ok(process.argv[2]&&out.startsWith('/tmp/'));assert.ok(!fs.existsSync(out));fs.mkdirSync(out,{recursive:true});
const {payingUser,servicesSite,completeSite}=await import('../tests/sites-fixtures');
const {seedHoldout}=await import('../tests/lot1-holdout-fixtures');const {serviceSpec}=await import('../tests/fixtures');
const {previewSegment}=await import('../src/lib/theme/preview-access');
const {saveThemeVersion,currentTheme}=await import('../src/lib/projects');const {all,one}=await import('../src/lib/db');
const {createBien,setBienStatus}=await import('../src/lib/biens');const {saveAsset}=await import('../src/lib/library');
const {createRealisation,setRealisationStatus}=await import('../src/lib/contenus/realisations');
const {withContenus}=await import('../src/lib/contenus');
const {salonBlocks}=await import('../src/lib/theme/atelier-nuance');const {AN_SERVICES,AN_STAFF,AN_HOURS}=await import('../tests/atelier-nuance-fixtures');
const sharp=(await import('sharp')).default;const {chromium}=await import('playwright');
const agency=await payingUser('agence277'),artisan=await payingUser('artisan277'),salon=await payingUser('salon277');
const a=await servicesSite(agency.id,'maison-horizon','Agence fictive #277'),r=await servicesSite(artisan.id,'rive','Atelier fictif #277');
async function photo(uid:string,pid:string,color:string){return(await saveAsset({projectId:pid,userId:uid,data:await sharp({create:{width:720,height:480,channels:3,background:color}}).png().toBuffer(),name:'illustration-technique.png',mime:'image/png',origin:'upload',status:'approved'})).id;}
const p1=await photo(agency.id,a.pid,'#476b60'),p2=await photo(agency.id,a.pid,'#755376');assert.notEqual(p1,p2);
for(const [transaction,title,assetId,price]of [['vente','Maison fictive à vendre',p1,280000],['location','Appartement fictif à louer',p2,900]]as const){const b=createBien(agency.id,a.pid,{transaction,data:{title,city:'Ville de recette',surface:70,dpe:'C',ges:'B',...(transaction==='vente'?{price}:{rent:price}),photos:[{assetId,alt:'Illustration technique — bien fictif'}],map:{x:35,y:45}}});setBienStatus(a.pid,b.id,'published');}
const real=createRealisation(r.pid,{title:'Bibliothèque de recette',summary:'Assemblage fictif pour vérifier les versions.',photos:[{assetId:await photo(artisan.id,r.pid,'#3c6576'),alt:'Illustration technique — aucune réalisation réelle'}]});setRealisationStatus(r.pid,real.id,'published');
const renderedService=withContenus(currentTheme(r.pid)!.spec,r.pid),galleryTemplate=Object.keys(renderedService.templates).find(k=>k.startsWith('page.')&&Object.values(renderedService.templates[k].sections).some(sec=>sec.type==='portfolio'))!,galleryPage=renderedService.store.pages.find(p=>`page.${p.template_suffix||p.handle}`===galleryTemplate)!;assert.ok(galleryPage);const galleryPath=`/pages/${galleryPage.handle}`;
const s=seedHoldout(salon.id,2,'Salon fictif #277');const spec=completeSite(serviceSpec('atelier-nuance' as never),'Salon fictif #277');
const cfg=Object.values(spec.groups.header.sections).find(sec=>sec.type==='an-salon')!;const blocks=salonBlocks(AN_SERVICES.map(x=>({...x})),AN_STAFF.map(x=>({...x})));cfg.blocks=Object.fromEntries(blocks.map((b,i)=>['b'+i,b]));cfg.block_order=blocks.map((_,i)=>'b'+i);
Object.assign(cfg.settings,{booking_mode:'live',hours_tue:AN_HOURS.tue,hours_wed:AN_HOURS.wed,hours_thu:AN_HOURS.thu,hours_fri:AN_HOURS.fri,hours_sat:AN_HOURS.sat});saveThemeVersion(s,spec,'Prestations fictives fournies','user');
const probe=net.createServer();await new Promise<void>(ok=>probe.listen(0,bindHost,ok));const port=(probe.address()as net.AddressInfo).port;await new Promise<void>(ok=>probe.close(()=>ok()));const origin=`http://${bindHost}:${port}`;process.env.APP_URL=origin;
// Le moteur public de réservation lit uniquement cet endpoint natif loopback de la fixture.
const salonSpec=structuredClone(currentTheme(s)!.spec);Object.assign(Object.values(salonSpec.groups.header.sections).find(sec=>sec.type==='an-salon')!.settings,{service_url:`${origin}/api/public/salon/${s}`});saveThemeVersion(s,salonSpec,'Endpoint de recette local','user');
let logs='',server:ChildProcess|undefined,browser:Awaited<ReturnType<typeof chromium.launch>>|undefined;const proof:any={schema:'integration277-business-compiled-1',candidate:expectedCandidate,realProviderCalls:0,realCostEur:0,media:'technical_synthetic_not_creative_quality',externalPublication:false,realSmtp:false,bindHost,cases:[]};
async function request(cookie:string,p:string,method='GET',body?:unknown,host?:string):Promise<Response>{
 const headers={...(cookie?{cookie}:{}),origin:host?`http://${host}`:origin,'content-type':'application/json'};
 // fetch/undici ignore Host sous la version de runtime testée : transporter la véritable entête par HTTP natif.
 if(host)return new Promise((resolve,reject)=>{const q=http.request({hostname:bindHost,port,path:p,method,headers:{...headers,host}},r=>{const chunks:Buffer[]=[];r.on('data',d=>chunks.push(Buffer.from(d)));r.on('end',()=>resolve(new Response(Buffer.concat(chunks),{status:r.statusCode!,headers:r.headers as Record<string,string>})));});q.on('error',reject);if(body!==undefined)q.write(JSON.stringify(body));q.end();});
 return fetch(origin+p,{method,headers,body:body===undefined?undefined:JSON.stringify(body),redirect:'manual'});
}
async function login(email:string){const x=await request('','/api/auth/login','POST',{email,password:'motdepasse-test-uniquement'});assert.equal(x.status,200);return x.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');}
async function stop(){if(browser)await browser.close();if(server?.pid){try{process.kill(-server.pid,'SIGTERM');}catch{}}fs.writeFileSync(path.join(root,'server.log'),logs);}
try{
 server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-H',bindHost,'-p',String(port)],{env:{...process.env,NODE_ENV:'production',NEXT_TELEMETRY_DISABLED:'1',STUDIO_CONVERSATION_LOT_A:'1',STUDIO_CONVERSATION_UI:'1',STUDIO_CONVERSATION_KNOWLEDGE:'1'},stdio:['ignore','pipe','pipe'],detached:true});server.stdout!.on('data',x=>logs+=x);server.stderr!.on('data',x=>logs+=x);
 const deadline=Date.now()+90000;while(Date.now()<deadline){try{if((await fetch(origin+'/connexion')).ok)break;}catch{}await new Promise(ok=>setTimeout(ok,150));}
 proof.version=await(await fetch(origin+'/api/version')).json();assert.equal(proof.version.commit,proof.candidate);assert.equal(proof.version.source,'compiled-build');assert.equal(proof.version.tree,'clean');
 const ca=await login(agency.email),cr=await login(artisan.email),cs=await login(salon.email);
 assert.equal((await request(cr,`/api/projects/${a.pid}/contenus`)).status,404);assert.equal((await request('',`/api/projects/${a.pid}/contenus`)).status,401);
 const itemUrl=`/api/projects/${r.pid}/contenus/realisations/${real.id}`,initial=await(await request(cr,itemUrl)).json();
 assert.equal((await request(cr,itemUrl,'POST',{action:'withdraw',ifVersion:initial.item.version})).status,428);
 const csrf=await fetch(origin+itemUrl,{method:'PATCH',headers:{cookie:cr,origin:'https://foreign.example.invalid','content-type':'application/json'},body:JSON.stringify({data:{summary:'forgé'},ifVersion:initial.item.version})});assert.equal(csrf.status,403);
 const publicRequest=async(host:string,p:string)=>request('',p,'GET',undefined,host);
 const publication=async(cookie:string,pid:string)=>{const res=await request(cookie,`/api/projects/${pid}/site-publication`,'POST',{action:'publish'}),j=await res.json();assert.equal(res.status,200,JSON.stringify(j));return j;};
 const pubA=await publication(ca,a.pid),pubR=await publication(cr,r.pid);const hostA=pubA.addresses.find((x:any)=>x.kind==='studio').hostname,hostR=pubR.addresses.find((x:any)=>x.kind==='studio').hostname;
 for(const p of ['/studio','/api/studio-agent/draft',`/api/projects/${a.pid}/contenus`,'/admin'])assert.equal((await publicRequest(hostA,p)).status,404);
 proof.publicHosting={mode:previewOnly?'preview_and_materialized_files_after_host_failure':'actual_host_http',rootStatus:(await publicRequest(hostR,'/')).status,galleryStatus:(await publicRequest(hostR,galleryPath)).status};
 const publishedBody=async()=>{if(!previewOnly){const response=await publicRequest(hostR,galleryPath);assert.equal(response.status,200);return response.text();}const live=one<{publication_id:string}>('SELECT publication_id FROM site_live WHERE project_id=?',r.pid)!;return fs.readFileSync(path.join(root,'sites',r.pid,live.publication_id,'files',galleryPath.slice(1),'index.html'),'utf8');};
 if(!previewOnly)assert.equal(proof.publicHosting.rootStatus,200);
 const old=await publishedBody();assert.ok(old.includes('Bibliothèque de recette'));
 const update=await request(cr,itemUrl,'PATCH',{data:{title:'Bibliothèque corrigée par le professionnel fictif #277.'},ifVersion:initial.item.version});assert.equal(update.status,200);assert.equal((await request(cr,itemUrl,'PATCH',{data:{summary:'Ancien devis'},ifVersion:initial.item.version})).status,409);
 assert.ok(!(await publishedBody()).includes('Bibliothèque corrigée par le professionnel fictif #277.'));
 await publication(cr,r.pid);assert.ok((await publishedBody()).includes('Bibliothèque corrigée par le professionnel fictif #277.'));
 assert.equal((await request(cr,`/api/projects/${r.pid}/site-publication`,'POST',{action:'restore',publicationId:pubR.live.id})).status,200);assert.ok(!(await publishedBody()).includes('Bibliothèque corrigée par le professionnel fictif #277.'));
 if(!previewOnly){const contact=await request('', '/contact','POST',{form_type:'contact','contact[email]':'visiteur-fictif@example.test','contact[request_type]':'devis','contact[body]':'Demande fictive de recette indépendante #277.'},hostR);assert.equal(contact.status,200);const rows=all<{kind:string;notified:string}>('SELECT kind,notified FROM site_requests WHERE project_id=?',r.pid);assert.equal(rows.length,1);assert.equal(rows[0].kind,'devis');proof.contact={status:contact.status,rows:rows.length,kind:rows[0].kind,notification:rows[0].notified,realEmailSent:false};}
 const pre=await(await request(cs,`/api/projects/${s}/contenus/prestations/prestations`)).json(),service=pre.item.data.services[0].id;
 const month=await(await request('',`/api/public/salon/${s}/month?month=${new Date(Date.now()+30*86400000).toISOString().slice(0,7)}&service=${service}&staff=any`)).json();const date=Object.entries(month.days??{}).reverse().find(([,state])=>state==='open')?.[0];assert.ok(date,JSON.stringify(month));
 const availability=await(await request('',`/api/public/salon/${s}/availability?date=${date}&service=${service}&staff=any`)).json(),time=availability.slots.find((x:any)=>x.available)?.time;assert.ok(time);
 const reservation={service,staff:'any',date,time,firstName:'Noa',lastName:'Fictif',email:'noa@example.test',phone:'0600000000',terms:true,idem:'integration-277-unique-0001'};
 const book=await request('',`/api/public/salon/${s}/appointments`,'POST',reservation);assert.equal(book.status,201,await book.text());const count=one<{n:number}>('SELECT COUNT(*) n FROM salon_appointments WHERE project_id=?',s)!.n;assert.equal(count,1);
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM??'/usr/bin/chromium',args:['--no-sandbox','--disable-background-networking']});
 for(const [label,host,paths]of [['agence',hostA,['/','/pages/acheter','/pages/louer']],['service',hostR,['/',galleryPath]]]as const){for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:960},reducedMotion:'reduce'});
  // Transport de test loopback : noms d'hôtes .test envoyés à notre serveur, sans DNS public.
  await context.route('**/*',async route=>{try{const url=new URL(route.request().url());if(url.hostname!==(previewOnly?bindHost:host)){await route.abort();return;}const res=await request('',url.pathname+url.search,'GET',undefined,previewOnly?undefined:host);await route.fulfill({status:res.status,headers:Object.fromEntries([...res.headers].filter(([key])=>!["content-encoding","content-length","transfer-encoding"].includes(key))),body:Buffer.from(await res.arrayBuffer())});}catch{await route.abort();}});
  const page=await context.newPage();for(const p of paths){const selected=label==='agence'?{pid:a.pid,uid:agency.id}:{pid:r.pid,uid:artisan.id};const address=previewOnly?`${origin}/preview/${selected.pid}/v/${previewSegment(currentTheme(selected.pid)!.version.id,selected.uid,selected.pid)}${p}`:`http://${host}:${port}${p}`;const res=await page.goto(address,{waitUntil:'networkidle'});assert.equal(res?.status(),200);const metrics=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,text:document.body.innerText.length,broken:Array.from(document.images).filter(i=>i.currentSrc&&i.naturalWidth===0).length}));assert.ok(metrics.scroll<=width+1,JSON.stringify(metrics));assert.equal(metrics.broken,0,JSON.stringify(metrics));await page.screenshot({path:path.join(out,`${label}-${width}-${p.replace(/\W/g,'_')}.png`),fullPage:true});proof.cases.push({label,path:p,status:res!.status(),...metrics});}await context.close();
 }}
 assert.equal(one<{n:number}>('SELECT COUNT(*) n FROM ai_calls')!.n,0);proof.nativeChecksPassed=true;proof.passed=!previewOnly;proof.status=previewOnly?'PARTIAL_PUBLIC_HOST_BLOCKED':'PASSED';if(previewOnly)process.exitCode=2;proof.rights={foreign:404,anonymous:401,csrf:403,missingConfirm:428,staleVersion:409,siteHostStudio:404};proof.publication={localOnly:true,changedAfterRepublish:true,restored:true};proof.reservation={localOnly:true,status:201,rows:count};
}catch(error){proof.passed=false;proof.failure=String(error);throw error;}finally{await stop();proof.realProviderCalls=one<{n:number}>('SELECT COUNT(*) n FROM ai_calls')!.n;proof.unhandledRejections=(logs.match(/unhandledRejection/g)??[]).length;fs.writeFileSync(path.join(out,'resultats.json'),JSON.stringify(proof,null,2));console.log(JSON.stringify({passed:proof.passed,file:path.join(out,'resultats.json'),version:proof.version,realProviderCalls:proof.realProviderCalls}));}
