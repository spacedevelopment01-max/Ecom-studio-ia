import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import type{Page,BrowserContext,Response}from'playwright';
export async function verifyBeginnerVideoUi({page,context,pid,base,out,slug,mobile}:{page:Page;context:BrowserContext;pid:string;base:string;out:string;slug:string;mobile:boolean}){
 const api=async(route:string)=>{const r=await context.request.get(base+route);assert(r.ok(),await r.text());return r.json();};
 const endpoint=`/api/projects/${pid}/creative/video`;
 const waitAction=(action:string)=>page.waitForResponse(r=>r.url().endsWith(endpoint)&&r.request().method()==='POST'&&r.request().postDataJSON()?.action===action);
 const until=async(fn:()=>Promise<any>,test:(v:any)=>boolean,label:string,ms=180000)=>{const end=Date.now()+ms;let v:any;do{v=await fn();if(test(v))return v;await page.waitForTimeout(500);}while(Date.now()<end);throw Error(label+JSON.stringify(v).slice(0,1200));};
 async function submit(section:ReturnType<Page['locator']>,action:string){const response=waitAction(action);await section.locator('[data-guided-video-submit]').click();const r=await response;const value=await r.json();assert(r.ok(),JSON.stringify(value));return value;}
 async function capture(name:string){await page.screenshot({path:path.join(out,`${slug}-${name}.png`),fullPage:true});await page.screenshot({path:path.join(out,`${slug}-${name}-vue.png`)});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'Débordement horizontal');}
 const prep=await api(`/api/projects/${pid}/preparation`);const slot=prep.state.stages.media.data.slots.find((s:any)=>s.kind==='video');assert(slot);assert.equal(slot.assetId,undefined);
 let section=page.locator('[data-guided-video=site]').first();await section.locator('[data-video-scenario]').waitFor();
 await section.locator('[data-video-duration="10"]').click();await section.locator('[data-video-scenes="2"]').click();await section.locator('[data-video-scenario] li').nth(1).waitFor();
 await section.locator('[data-video-correction]').fill('Plus dynamique');const refined=waitAction('refine');await section.getByRole('button',{name:'Appliquer au scénario (gratuit)',exact:true}).click();assert((await refined).ok());
 await capture('initial-scenario');
 const plan=await submit(section,'plan');assert.equal(plan.scriptMicro,0);assert(plan.approvalToken);assert.equal(plan.steps.find((s:any)=>s.id==='reference_images').count,0);
 const draftTexts=await section.locator('[data-video-scenario] textarea').allTextContents();
 await page.reload();await page.waitForSelector('[data-preparation]');await page.locator('[data-preparation] ol').first().locator('button').nth(4).click();
 section=page.locator('[data-guided-video=site]').first();await until(()=>section.locator('[data-guided-video-submit]').innerText(),v=>v.includes('Valider et créer'),'Accord conservé après reload');
 const created=await submit(section,'create');
 const initialDone=await until(()=>api(endpoint),v=>v.videos.some((x:any)=>x.initialSlot===slot.key),'Vidéo initiale rendue');
 const mood=initialDone.videos.find((x:any)=>x.initialSlot===slot.key);assert.equal(mood.purpose,'site');assert.equal(mood.aspect,'16:9');
 await section.locator('[data-guided-videos] video').first().evaluate(async(v:HTMLVideoElement)=>{await v.play();});await page.waitForTimeout(900);assert(await section.locator('[data-guided-videos] video').first().evaluate((v:HTMLVideoElement)=>v.currentTime>0));
 await capture('initial-resultat');
 const media=(await api(`/api/projects/${pid}/preparation`)).state.stages.media.data.slots;assert.equal(media.find((s:any)=>s.key===slot.key).assetId,mood.id);assert.equal(media.filter((s:any)=>s.kind==='video').length,prep.state.stages.media.data.slots.filter((s:any)=>s.kind==='video').length);
 await page.goto(`${base}/studio/${pid}/publicites#video`);
 section=page.locator('[data-guided-video=ad]');await section.waitFor();
 await section.locator('[data-subject-request]').fill('Fais-moi une vidéo pour mon activité, avec les informations déjà renseignées.');
 await section.locator('[data-video-duration="10"]').click();await section.locator('[data-video-scenes="2"]').click();
 await until(()=>section.locator('[data-guided-video-submit]').isEnabled(),v=>v,'Devis disponible');
 const writing=await submit(section,'plan');assert(writing.scriptMicro>0);await section.locator('[data-video-scene-title="0"]').waitFor();
 await section.locator('[data-video-correction]').fill('Plus dynamique');const second=waitAction('refine');await section.getByRole('button',{name:'Appliquer au scénario (gratuit)',exact:true}).click();assert((await second).ok());
 await section.locator('[data-video-scene-title="0"]').fill('TEST VALIDÉ');
 const signed=await submit(section,'plan');assert(signed.approvalToken);
 await capture('publicite-scenario');await submit(section,'create');
 const adDone=await until(()=>api(endpoint),v=>v.videos.some((x:any)=>x.as==='ad'&&!x.purpose),'Publicité rendue');const ad=adDone.videos.find((x:any)=>x.as==='ad'&&!x.purpose);
 await section.locator('[data-guided-videos] video').first().evaluate(async(v:HTMLVideoElement)=>{await v.play();});await page.waitForTimeout(800);assert(await section.locator('[data-guided-videos] video').first().evaluate((v:HTMLVideoElement)=>v.currentTime>0));await capture('publicite-resultat');
 for(const [name,v]of[['ambiance',mood],['publicite',ad]]as const){const r=await context.request.get(base+v.url);assert(r.ok());fs.writeFileSync(path.join(out,`${slug}-${name}.mp4`),await r.body());}
 return {initialSlot:slot.key,initialVideo:mood.id,adVideo:ad.id,initialJob:created.jobId,siteLocalScenarioFree:true,noIntermediateImagesQuoted:true,approvalSurvivedReload:true,localRefinement:true,editableScenario:true,websiteAndAdDistinct:true,nativeVideoActuallyPlayed:true,noExtraSiteDeliverable:true,draftTexts};
}
