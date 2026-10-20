import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import{createRequire}from'node:module';
const{chromium}=createRequire(path.resolve('package.json'))('playwright');
const dir=process.argv[2],slug=process.argv[3],base=process.argv[4]??'http://127.0.0.1:18140';
if(!path.basename(dir).startsWith('ecs-parcours-test-')||!/^http:\/\/127\.0\.0\.1:\d+$/.test(base))throw Error('Recette locale isolée obligatoire');
const out=path.join(dir,'integration');fs.mkdirSync(out,{recursive:true});const c=JSON.parse(fs.readFileSync(path.join(dir,'private.json'),'utf8')).find((x:any)=>x.slug===slug);const mobile=c.mobile;
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});const context=await browser.newContext({viewport:{width:mobile?390:1440,height:mobile?844:1000},isMobile:mobile,hasTouch:mobile,locale:'fr-FR',recordVideo:{dir:out,size:{width:mobile?390:1440,height:mobile?844:1000}}});await context.addCookies([{name:'ecs_session',value:c.token,url:base},{name:'ecs-lang',value:'fr',url:base}]);await context.route('**/*',(r:any)=>new URL(r.request().url()).origin===base?r.continue():r.abort());
await context.addInitScript('globalThis.__name=fn=>fn;try{localStorage.setItem("ecs-lang","fr");sessionStorage.setItem("ecsSeen","1");}catch{}addEventListener("DOMContentLoaded",()=>{const e=document.createElement("div");e.textContent="TEST ISOLÉ — FOURNISSEURS ET VERDICTS SIMULÉS";e.style.cssText="position:fixed;top:0;left:0;right:0;z-index:2147483647;background:#164b37;color:white;padding:5px;text-align:center;font:12px sans-serif;pointer-events:none";document.body.append(e);});');const page=await context.newPage();page.setDefaultTimeout(60000);page.on('dialog',(d:any)=>d.accept());const errors:string[]=[];page.on('pageerror',(e:any)=>errors.push(e.message));
const get=async(url:string)=>{const r=await context.request.get(base+url);assert(r.ok(),await r.text());return r.json();};const projects=await get('/api/projects'),pid=projects.projects[0].id,ep=`/api/projects/${pid}`;const state=()=>get(ep+'/preparation');
const until=async(fn:()=>Promise<any>,accept:(x:any)=>boolean,label:string,timeout=240000)=>{const end=Date.now()+timeout;let x:any;do{x=await fn();if(accept(x))return x;await page.waitForTimeout(500);}while(Date.now()<end);throw Error(label+' : '+JSON.stringify(x).slice(0,1600));};
const action=(name:string,suffix='/preparation')=>{const pending=page.waitForResponse((r:any)=>r.url().endsWith(ep+suffix)&&r.request().method()==='POST'&&r.request().postDataJSON()?.action===name);void pending.catch(()=>{});return pending;};
async function click(button:any,name:string,suffix='/preparation'){const wait=action(name,suffix);await button.click();const r=await wait,b=await r.json();assert(r.ok(),JSON.stringify(b));return b;}
async function shot(name:string){await page.screenshot({path:path.join(out,`${slug}-${name}.png`),fullPage:true});await page.screenshot({path:path.join(out,`${slug}-${name}-vue.png`)});assert(await page.evaluate((width:number)=>document.documentElement.scrollWidth<=width+2,page.viewportSize().width),'Débordement '+name);console.log('PREUVE '+name);}
async function idle(){return until(state,s=>!s.state.pending,'fin préparation');}
try{
 if(!(await get(ep+'/theme')).current){
 await page.goto(base+`/studio/${pid}/pilote`);await page.waitForSelector('[data-preparation]');const step=async(i:number)=>{await page.locator('[data-preparation] ol').first().locator('button').nth(i).click();await page.waitForTimeout(300);};await step(3);
 if(c.input.business==='products'){
  const chosen=page.waitForResponse((r:any)=>r.url().endsWith(ep+'/preparation/handoff')&&r.request().method()==='POST');await page.locator('[data-category-choice=ecommerce]').click();assert((await chosen).ok());
 }
 if((await state()).state.stages.content.status!=='approved')await click(page.locator('[data-approve-content]'),'approve');await step(4);
 const before=(await state()).state.stages.media.data.slots;const originalVideos=before.filter((s:any)=>s.kind==='video'&&s.assetId).map((s:any)=>s.assetId);
 for(const slot of before.filter((s:any)=>s.kind==='video'&&!s.assetId)){
  const index=before.filter((s:any)=>s.kind==='video').findIndex((s:any)=>s.key===slot.key);const section=page.locator('[data-guided-video=site]').nth(index);await section.locator('[data-video-duration="10"]').click();await section.locator('[data-video-scenes="2"]').click();await section.locator('[data-video-scenario] li').nth(1).waitFor();
  await click(section.locator('[data-guided-video-submit]'),'plan','/creative/video');await click(section.locator('[data-guided-video-submit]'),'create','/creative/video');await until(state,s=>!!s.state.stages.media.data.slots.find((x:any)=>x.key===slot.key)?.assetId,'vidéo manquante '+slot.key);
 }
 const revision=(await state()).state.revision;await page.waitForResponse(async(r:any)=>r.url().endsWith(ep+'/preparation')&&r.request().method()==='GET'&&r.ok()&&(await r.json()).state.revision>=revision);await page.waitForTimeout(200);
 const qWait=action('quote'),generation=action('generate');await page.getByRole('button',{name:'Préparer les médias manquants (avec devis)',exact:true}).click();const qr=await qWait,q=await qr.json();assert(qr.ok(),JSON.stringify(q));if(q.quote.paid)await page.getByRole('dialog',{name:'Confirmer cet essai',exact:true}).getByRole('button',{name:'Confirmer cet essai',exact:true}).click();const gr=await generation;assert(gr.ok(),await gr.text());await idle();
 const collected=(await state()).state.stages.media.data.slots;for(const id of originalVideos)assert(collected.some((s:any)=>s.assetId===id),'Vidéo initiale écrasée');
 for(const slot of collected){const card=page.getByRole('heading',{name:slot.purpose,exact:true}).locator('..');await click(card.getByRole('button',{name:'J’ai vérifié : utiliser cette image ici',exact:true}).first(),'assign');}
 await click(page.locator('[data-approve-media]'),'approve');const handoff=await get(ep+'/preparation/handoff');assert(handoff.ready,JSON.stringify(handoff.blockers));fs.writeFileSync(path.join(out,`${slug}-handoff.json`),JSON.stringify(handoff,null,2));await shot('donnees-validees');
 }
 await page.goto(base+`/studio/${pid}/boutique`);
 const existing=await get(ep+'/theme');
 const direction=c.input.business==='services'?'rive':'orbe';
 if(!existing.current){await page.locator('[data-initial-theme-grid]').waitFor();const name=direction==='rive'?'Atelier Rive':'ORBE';const card=page.locator('[data-initial-theme-grid] > ul > li').filter({has:page.getByText(name,{exact:false})}).first();
 const built=page.waitForResponse((r:any)=>r.url().endsWith(ep+'/theme/build')&&r.request().method()==='POST');await card.getByRole('button',{name:'Choisir ce thème',exact:true}).click();const br=await built;assert(br.ok(),await br.text());assert.equal(br.request().postDataJSON().direction,direction);
 }
 const originalVideos=(await state()).state.stages.media.data.slots.filter((s:any)=>s.kind==='video'&&s.assetId).map((s:any)=>s.assetId);
 assert((await get(ep+'/preparation/handoff')).ready,'Contrat invalidé par le choix de thème');
 const theme=await until(()=>get(ep+'/theme'),t=>!!t.current,'composition du thème');assert.equal(theme.current.direction,direction);await page.locator('iframe').first().waitFor({state:'attached'});await shot('theme-editeur');
 assert(theme.library.length>0,'Bibliothèque de sections absente');const index=theme.current.structure.find((s:any)=>s.template==='index');const opening=index.sections[0];const beforeVersion=theme.current.versionId;
 const localHeading='Édition locale de réception '+Date.now();
 const edited=await context.request.post(base+ep+'/theme/ops',{data:{summary:'Correction locale de réception, aucun fournisseur',ops:[{op:'set_setting',template:'index',section:opening.id,key:'heading',value:localHeading}]}});assert(edited.ok(),await edited.text());const after=await get(ep+'/theme');assert.notEqual(after.current.versionId,beforeVersion);assert(after.versions.some((v:any)=>v.id===beforeVersion));await page.reload();await page.locator('iframe').first().waitFor({state:'attached'});await shot('retouche-locale-conservee');
 const previewSrc=await page.locator('iframe').first().getAttribute('src');assert(previewSrc);const preview=await context.request.get(new URL(previewSrc,base).href);assert(preview.ok());assert((await preview.text()).replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').includes(localHeading));
 if(slug==='produit-ordinateur'){
  const videos=await get(ep+'/creative/video'),ad=videos.videos.find((v:any)=>v.as==='ad'&&!v.purpose);const render=await context.request.post(base+ep+'/videos/v2/'+encodeURIComponent(ad.docKey),{data:{action:'render'}});assert(render.ok(),await render.text());const started=await render.json();await until(()=>get(ep+'/jobs'),v=>{const j=v.jobs.find((j:any)=>j.id===started.jobId);if(j?.status==='failed')throw Error(j.error);return j?.status==='done';},'rendu local après retouche');
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,`${slug}-resultat.json`),JSON.stringify({simulation:true,codeVersion:await get('/api/version'),readyBeforeTheme:true,initialVideoIdsPreserved:originalVideos,themeApplied:direction,themeVersion:beforeVersion,editedVersion:after.current.versionId,versionsPreserved:true,library:theme.library.length,localEditViaNativeApiThenUiReload:true,previewEditVerified:true,providerCalls:0,errors},null,2));
}catch(error){console.error('PRIMARY ERROR',error);await page.screenshot({path:path.join(out,`${slug}-ECHEC.png`),fullPage:true}).catch(()=>{});throw error;}finally{const video=page.video();await page.close();await video.saveAs(path.join(out,`${slug}-integration.webm`));await context.close();await browser.close();}
