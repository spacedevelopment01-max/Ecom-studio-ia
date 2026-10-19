/** Real studio browser flow over native APIs and the isolated mock-provider worker. */
import fs from "node:fs";import path from "node:path";import assert from "node:assert/strict";import {chromium} from "playwright";
process.on("uncaughtException",error=>{console.error(error.message.split("Call log:")[0].slice(0,1000));process.exit(1);});
const dir=path.resolve(process.env.DATA_DIR??"");if(!path.basename(dir).startsWith("ecs-test-video-mission-")) throw Error("Dossier isolé requis");
const {ui}=JSON.parse(fs.readFileSync(path.join(dir,"private-ui.json"),"utf8"));const out=path.join(dir,"public"),base="http://127.0.0.1:3134";
const browser=await chromium.launch({executablePath:"/usr/bin/chromium",args:["--no-sandbox"]});const results:any[]=fs.existsSync(path.join(out,'ui-final-checks.json'))?JSON.parse(fs.readFileSync(path.join(out,'ui-final-checks.json'),'utf8')).results:[];
async function setup(item:any,mobile=false,record=true){
 const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},acceptDownloads:true,...(record?{recordVideo:{dir:path.join(dir,"raw-recordings"),size:mobile?{width:390,height:844}:{width:1440,height:1000}}}:{})});
 await context.addCookies([{name:"ecs_session",value:item.token,url:base},{name:"ecs-lang",value:"fr",url:base}]);
 await context.addInitScript(()=>{sessionStorage.setItem("ecsSeen","1");localStorage.setItem("ecs-lang","fr");});
 const page=await context.newPage();page.setDefaultTimeout(120000);
 const get=page.request.get.bind(page.request);
 page.request.get=async(url,options)=>{for(let attempt=0;;attempt++){try{return await get(url,{timeout:120000,...options});}catch(error){if(attempt>=4)throw error;await new Promise(r=>setTimeout(r,1500));}}};const errors:string[]=[];
 page.on("pageerror",e=>errors.push(e.message));await context.route("**/*",route=>{if(new URL(route.request().url()).origin!==base) return route.abort();return route.continue();});
 return {context,page,errors};
}
async function navigate(page:any,item:any){
 const organic=item.slug.includes("organique");await page.goto(`${base}/studio/${item.pid}/${organic?"publications":"publicites"}#video`,{timeout:120000});
 const section=page.locator(`[data-guided-video=${organic?"post":"ad"}]`);await section.waitFor();
 const close=page.getByRole("button",{name:/Fermer|Close/}).filter({visible:true});if(await close.count()) await close.first().click().catch(()=>{});
 await page.evaluate(()=>{const label=document.createElement("div");label.textContent="TEST ISOLÉ — FOURNISSEURS ET VISION SIMULÉS — VOIX/ENCODAGE LOCAUX";label.style.cssText="position:fixed;top:0;left:0;right:0;z-index:2147483647;background:#164b37;color:white;text-align:center;padding:5px;font:11px sans-serif;pointer-events:none";document.body.append(label);});return section;
}
try {
 for(const item of ui){
  if(results.some(r=>r.slug===item.slug&&r.desktop))continue;
  const {context,page,errors}=await setup(item);const section=await navigate(page,item);const stages:string[]=[];console.log(`${item.slug}: entrée`);
  console.log(`${item.slug}: recherche résultat existant`);
  const prior=(await(await page.request.get(`${base}/api/projects/${item.pid}/creative/video`,{timeout:120000})).json()).videos.find((v:any)=>v.request?.startsWith('TEST ISOLÉ'));
  if(!prior) {
  await section.locator('[data-video-duration="20"]').click();await section.locator('[data-video-scenes="4"]').click();
  await section.locator('[data-subject-request]').fill(`TEST ISOLÉ ${item.slug} : quatre scènes distinctes. Conserver les références et les textes. ${item.slug.includes("organique")?"Conseil utile, aucun achat ni devis forcé.":"Présenter l’offre confirmée sans promesse inventée."}`);
  const submit=section.locator('[data-guided-video-submit]');const saved=section.locator('[data-video-saved-scenario]').filter({hasText:`TEST ISOLÉ ${item.slug}`}).first();if(await saved.count()){await saved.getByRole('button').click();stages.push('saved-scenario-resumed-without-rewriting');}else await submit.click();await section.locator('[data-video-scenario]').waitFor();
  for(let k=0;k<4;k++){await section.locator(`[data-video-scene-title="${k}"]`).fill(`TEST LOCAL ${k+1}`);await section.locator(`[data-video-scene-voice="${k}"]`).fill(["Un détail à observer.","Une surface à préparer.","Des finitions à préserver.","Un ensemble à vérifier."][k]);}
  const approvedPlanWait=page.waitForResponse((r:any)=>r.url().endsWith('/creative/video')&&r.request().method()==='POST'&&r.request().postDataJSON()?.action==='plan');
  await submit.click();const approvedPlanResponse=await approvedPlanWait;assert.equal(approvedPlanResponse.status(),200,JSON.stringify(await approvedPlanResponse.json()));
  await submit.filter({hasText:'Valider et créer'}).waitFor();await section.screenshot({path:path.join(out,`${item.slug}-scenario-ordinateur.png`)});stages.push("scenario-reviewed-and-edited");
  const responsePromise=page.waitForResponse((r:any)=>r.url().endsWith('/creative/video')&&r.request().method()==='POST'&&r.request().postDataJSON()?.action==='create');
  await submit.click();const response=await responsePromise;const launched=await response.json();assert.equal(response.status(),200,JSON.stringify(launched));let jobId=launched.jobId;stages.push("native-launch");
  let done=false,repaired=false,resumed=false;
  const until=Date.now()+900000;
  while(Date.now()<until){
   const jobs=(await(await page.request.get(`${base}/api/projects/${item.pid}/jobs`,{timeout:120000})).json()).jobs;const job=jobs.find((j:any)=>j.id===jobId);
   if(job?.status==='paused'&&!resumed){await page.getByRole('button',{name:'Tâches en pause',exact:true}).click();await page.getByRole('button',{name:'Reprendre',exact:true}).click();resumed=true;stages.push('pause-resume-via-ui');await section.screenshot({path:path.join(out,`${item.slug}-reprise-ordinateur.png`)});}
   if(job?.status==='failed'&&!repaired&&item.slug==='produit-organique'){
    await page.reload();const sec=await navigate(page,item);const card=sec.locator('[data-video-incomplete]').first();await card.waitFor();await card.locator('select').selectOption('1');
    await card.screenshot({path:path.join(out,`${item.slug}-rejet-qualite.png`)});
    const repairResponse=page.waitForResponse((r:any)=>r.url().endsWith('/creative/video')&&r.request().postDataJSON()?.action==='repair');await card.getByRole('button',{name:/Reprendre cette scène uniquement/}).click();const repairedResponse=await repairResponse;const repairedBody=await repairedResponse.json();assert.equal(repairedResponse.status(),200,JSON.stringify(repairedBody));jobId=repairedBody.jobId;repaired=true;stages.push('quality-rejection-targeted-scene-2');
   }else if(job?.status==='failed') throw Error(`${item.slug}: ${job.error}`);
   if(job?.status==='done'){done=true;break;}await page.waitForTimeout(2000);
  }
  assert(done,`${item.slug}: job timeout`);
  }else stages.push('existing-completed-render-resumed-without-regeneration');
  await page.reload();let sec=await navigate(page,item);
  const videos=(await(await page.request.get(`${base}/api/projects/${item.pid}/creative/video`,{timeout:120000})).json()).videos;const final=videos.find((v:any)=>v.request?.startsWith('TEST ISOLÉ'));assert(final?.docKey);
  const native=await(await page.request.get(`${base}/api/projects/${item.pid}/videos/v2/${encodeURIComponent(final.docKey)}`,{timeout:120000})).json();assert.equal(native.doc.clips.length,4);assert(native.doc.audio.voice.length===4);assert.equal(native.doc.meta.ending.kind,'last_clip');
  console.log(`${item.slug}: rendu trouvé, lecture`);
  await sec.locator('video').first().waitFor();
  const card=sec.locator('[data-guided-videos] > div').filter({has:page.locator(`video[src="${final.url}"]`)}).first();
  await card.locator('video').evaluate(async(el:HTMLVideoElement)=>{el.muted=true;el.currentTime=18;await el.play();});await page.waitForTimeout(600);await card.locator('video').evaluate((el:HTMLVideoElement)=>el.pause());stages.push('real-playback');console.log(`${item.slug}: lecture terminée`);
  await card.locator('[data-video-review] summary').click();await sec.screenshot({path:path.join(out,`${item.slug}-final-ordinateur.png`)});
  await card.locator('[data-guided-video-edit]').click();const modal=page.getByRole('dialog');await modal.waitFor();await modal.locator('[data-video-music] [data-music="off"]').click();await page.waitForTimeout(400);await modal.screenshot({path:path.join(out,`${item.slug}-edition-ordinateur.png`)});stages.push('local-edit-new-version');console.log(`${item.slug}: édition terminée`);
  const edited=await(await page.request.get(`${base}/api/projects/${item.pid}/videos/v2/${encodeURIComponent(final.docKey)}`,{timeout:120000})).json();assert.equal(edited.doc.audio.music,null);assert(edited.version.version>native.version.version);
  // Restore music through the existing panel; original and edited versions remain in history.
  await modal.locator('[data-video-music] [data-music="on"]').click();await page.waitForTimeout(400);
  const renderWait=page.waitForResponse((r:any)=>r.url().includes('/videos/v2/')&&r.request().method()==='POST'&&r.request().postDataJSON()?.action==='render');
  await modal.getByRole('button',{name:'Rendre la vidéo',exact:true}).click();const renderResponse=await renderWait;assert.equal(renderResponse.status(),200);const rendered=await renderResponse.json();
  for(let k=0;k<300;k++){const jobs=(await(await page.request.get(`${base}/api/projects/${item.pid}/jobs`,{timeout:120000})).json()).jobs;const j=jobs.find((j:any)=>j.id===rendered.jobId);if(j?.status==='failed')throw Error(j.error);if(j?.status==='done')break;assert(k<299,'render timeout');await page.waitForTimeout(2000);}
  stages.push('edited-version-rendered-locally');console.log(`${item.slug}: nouveau rendu terminé`);
  await modal.getByRole('button',{name:'Fermer',exact:true}).click().catch(async()=>page.keyboard.press('Escape'));
  await page.reload();sec=await navigate(page,item);
  const current=await(await page.request.get(`${base}/api/projects/${item.pid}/videos/v2/${encodeURIComponent(final.docKey)}`)).json();
  const downloadLink=sec.locator(`[data-guided-videos] a[href="/api/files/${current.version.renderedAssetId}?download=1"]`);assert(current.version.renderedAssetId);
  await sec.screenshot({path:path.join(out,`${item.slug}-final-ordinateur.png`)});const downloadWait=page.waitForEvent('download');await downloadLink.click();const download=await downloadWait;await download.saveAs(path.join(out,`${item.slug}-final.mp4`));stages.push('native-download');
  const srt=await page.request.get(`${base}/api/projects/${item.pid}/videos/v2/${encodeURIComponent(final.docKey)}?export=srt`,{timeout:120000});assert(srt.ok());fs.writeFileSync(path.join(out,`${item.slug}-final.srt`),await srt.body());
  const vtt=await page.request.get(`${base}/api/projects/${item.pid}/videos/v2/${encodeURIComponent(final.docKey)}?export=vtt`,{timeout:120000});assert(vtt.ok());fs.writeFileSync(path.join(out,`${item.slug}-final.vtt`),await vtt.body());
  assert.equal(errors.length,0);results.push({slug:item.slug,desktop:true,stages,docKey:final.docKey,versionBeforeEdit:native.version.version,versionAfterEdit:edited.version.version,clips:4,voicePhrases:4,errors});
  fs.writeFileSync(path.join(out,'ui-final-checks.json'),JSON.stringify({providerCalls:0,results},null,2));
  const recording=page.video();await context.close();if(recording) await recording.saveAs(path.join(out,`${item.slug}-interaction-ordinateur.webm`));console.log(`${item.slug}: parcours ordinateur terminé`);
 }
 for(const item of ui){if(results.some(r=>r.slug===item.slug&&r.mobile))continue;const {context,page,errors}=await setup(item,true);const section=await navigate(page,item);const video=section.locator('video').first();await video.scrollIntoViewIfNeeded();assert(await section.evaluate((e:HTMLElement)=>e.scrollWidth<=e.clientWidth+1),'guided video overflows mobile');await video.evaluate(async(el:HTMLVideoElement)=>{el.muted=true;el.currentTime=18;await el.play();});await page.waitForTimeout(700);await video.evaluate((el:HTMLVideoElement)=>el.pause());await section.screenshot({path:path.join(out,`${item.slug}-final-mobile.png`)});results.push({slug:item.slug,mobile:true,playback:true,errors});const recording=page.video();await context.close();if(recording)await recording.saveAs(path.join(out,`${item.slug}-interaction-mobile.webm`));}
 fs.writeFileSync(path.join(out,'ui-final-checks.json'),JSON.stringify({providerCalls:0,scope:'Native UI/API/jobs, synthetic images/clips/reviews, real local French voice and encodes',results},null,2));
} finally {await browser.close();}
