/** Actual browser and HTTP path, native worker dispatch, fictitious accounts only. */
import fs from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
const base='http://127.0.0.1:18260',out=path.resolve('reports/issue160');
fs.mkdirSync(out,{recursive:true});
const accounts=JSON.parse(fs.readFileSync('/tmp/ecs160-ui-accounts.json','utf8'));
const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--no-proxy-server']});
const originalFetch=globalThis.fetch;globalThis.fetch=(input:any,init?:any)=>{const url=new URL(typeof input==='string'?input:input.url??input.toString());if(!['127.0.0.1','localhost','[::1]'].includes(url.hostname))throw Error('Supplier transport forbidden in acceptance');return originalFetch(input,init);};
const expectedCode=process.env.MISSION160_CODE_SHA;if(!expectedCode)throw Error('Set the frozen code SHA for this acceptance');
const served=await (await fetch(`${base}/api/version`)).json();if(served.commit!==expectedCode)throw Error(`Unexpected served version: ${served.commit}`);
const proofs:any[]=[],examples:any[]=[];
async function reveal(page:any){
 await page.evaluate(async()=>{for(const image of document.images)image.loading='eager';const height=Math.min(document.documentElement.scrollHeight,30000);for(let y=0;y<height;y+=600){scrollTo({top:y,behavior:"instant"});await new Promise(r=>setTimeout(r,100));}scrollTo({top:0,behavior:"instant"});});
 await page.waitForTimeout(8000);
 await page.waitForFunction(()=>[...document.images].filter(i=>i.getAttribute('src')&&i.getClientRects().length>0).every(i=>i.complete),undefined,{timeout:30000});
 const broken=await page.evaluate(()=>[...document.images].filter(i=>i.getAttribute('src')&&i.getClientRects().length>0&&(!i.complete||i.naturalWidth===0)).map(i=>i.getAttribute('src')));if(broken.length)throw Error('Broken images: '+JSON.stringify(broken));await page.waitForTimeout(600);
}

try {
for(const account of accounts){
 console.log(`Browser start: ${account.services?"service":"produit"}`);
 const label=account.services?'service':'produit';
 const context=await browser.newContext({locale:'fr-FR',viewport:{width:1440,height:1000},recordVideo:{dir:`/tmp/ecs160-recordings/${label}`,size:{width:1440,height:1000}}});
 await context.addCookies([{name:'ecs_session',value:account.token,url:base},{name:'ecs-lang',value:'fr',url:base}]);
 const page=await context.newPage();const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 let serviceSiteId:string|undefined;let result:any={};
 async function nativeBuild(){const queued=await page.request.post(`${base}/api/projects/${account.projectId}/theme/build`,{data:{direction:account.direction}});if(!queued.ok())throw Error(await queued.text());const task=await queued.json();const {getJob,claimNext,JobContext,completeJob}=await import('../src/lib/jobs');const {handlers}=await import('../worker/handlers');const stored=getJob(task.jobId);if(stored?.status==='done')return stored.result?JSON.parse(stored.result):{};const job=claimNext(['shop.direction']);if(!job||job.project_id!==account.projectId||job.user_id!==account.userId)throw Error('Wrong isolated job');const r=await handlers[job.type](new JobContext(job));completeJob(job.id,r);return r;}
 if(account.services){result=await nativeBuild();const {currentTheme}=await import('../src/lib/projects');serviceSiteId=currentTheme(account.projectId)!.version.id;const state=await page.request.get(`${base}/api/projects/${account.projectId}/marketing-strategy`);if((await state.json()).usedAngleIds.length)throw Error('Service website consumed an angle');}
 await page.goto(`${base}/studio/${account.projectId}/strategie`,{waitUntil:'domcontentloaded',timeout:120000});
 const panel=page.locator('[data-marketing-strategy]').first();await panel.waitFor({timeout:60000});await panel.locator('[data-angle-card]').first().waitFor({timeout:120000});
 await panel.locator('[data-analyze-strategy]').click();await panel.locator('[data-angle-card]').first().waitFor();
 if(await panel.locator('[data-angle-card]').count()!==5)throw Error('Five angle cards required');
 await page.screenshot({fullPage:true,path:`${out}/${label}-5-angles-desktop.jpg`,type:'jpeg',quality:85});
 for(const angle of ['usage','expression']){
  console.log(`Browser ${label}: ${angle}`);
  await panel.locator(`[data-view-angle="${angle}"]`).click();await panel.locator(`[data-angle-details="${angle}"]`).screenshot({path:`${out}/${label}-${angle}-carte.jpg`,type:'jpeg',quality:85});
  await panel.locator(`[data-prepare-angle="${angle}"]`).click();const confirm=panel.locator('[data-strategy-confirm]');await confirm.waitFor();
  if(!account.services){await confirm.locator("[data-prepare-modules]").click();await confirm.getByText("Calendrier · Version préparée",{exact:false}).first().waitFor({timeout:60000});}
  const toQuote=confirm.locator('[data-strategy-review-item] input[type=checkbox]');if(await toQuote.count()){await toQuote.first().check();await confirm.locator('[data-quote-revisions]').click();await confirm.locator('[data-revision-bundle]').getByText('Devis à confirmer',{exact:true}).waitFor();await confirm.locator('[data-revision-bundle]').screenshot({path:`${out}/${label}-${angle}-devis-sans-depense.jpg`,type:'jpeg',quality:85});}
  for(const item of await confirm.locator('[data-strategy-review-item]').all())await item.getByRole('button',{name:'Vérifié : compatible, réutiliser',exact:true}).click();
  await confirm.screenshot({path:`${out}/${label}-${angle}-impact.jpg`,type:'jpeg',quality:85});
  await confirm.locator('[data-confirm-strategy]').click();await panel.locator(`[data-active-angle="${angle}"]`).waitFor({timeout:30000});
  await page.reload({waitUntil:'domcontentloaded'});await panel.locator(`[data-active-angle="${angle}"]`).waitFor();
  const {currentTheme}=await import('../src/lib/projects');
  // Product B must already contain its prepared SEO before any extra build could conceal ordering faults.
  const prepared=currentTheme(account.projectId);if(!account.services&&prepared){const state=await page.request.get(`${base}/api/projects/${account.projectId}/marketing-strategy`);const selected=(await state.json()).active;if(!JSON.stringify(prepared.spec.templates.index).includes(selected.angle.examples.hero))throw Error('Prepared theme did not receive current SEO');}
  if(!account.services)result=await nativeBuild();
  const cur=currentTheme(account.projectId)!;
  if(account.services){
   if(cur.version.id!==serviceSiteId||cur.spec.meta?.strategy)throw Error('Campaign changed service website');
   const response=await page.request.post(`${base}/api/projects/${account.projectId}/social/v2`,{data:{action:'plan',angleId:angle,request:{angleId:angle,startDate:new Date(Date.now()+86400000).toISOString().slice(0,10),days:2,perDay:1,timezone:'Europe/Paris',platforms:[{platform:'instagram'}],lang:'fr'}}});if(!response.ok())throw Error(await response.text());
   const title=`Texte exact du client — atelier ${angle}`;
   const single=await page.request.post(`${base}/api/projects/${account.projectId}/social/v2`,{data:{action:'create_one',angleId:angle,kind:'image',mode:'free',date:new Date(Date.now()+86400000).toISOString().slice(0,10),time:'14:00',timezone:'Europe/Paris',platforms:[{platform:'instagram'}],headline:title,caption:'Découvrir le tournage et les émaux, sur rendez-vous.'}});
   const created=await single.json();if(!single.ok()||!created.ids?.length)throw Error(JSON.stringify(created));
   const {all}=await import('../src/lib/db');const {assertContentAlignment}=await import('../src/lib/marketing-strategy');
   for(const id of created.ids){assertContentAlignment(account.projectId,'post',id);const rows=all<any>("SELECT p.title,p.approved_at,c.angle_id,c.protected FROM posts p JOIN marketing_strategy_contents c ON c.project_id=p.project_id AND c.module='post' AND c.content_id=p.id WHERE p.id=?",id);if(rows.length!==1||rows[0].title!==title||rows[0].angle_id!==angle||!rows[0].protected||rows[0].approved_at)throw Error('Exact single copy lost its protected provenance or was auto-approved');}
  }else if(cur.spec.meta?.strategy?.angleId!==angle)throw Error('Persisted angle mismatch');
  const theme=await context.newPage();await theme.goto(`${base}/preview/${account.projectId}/v/${cur.version.id}/?es_raw=1`,{waitUntil:'domcontentloaded',timeout:60000});
  await reveal(theme);
  console.log(`Native theme visible: ${label}/${angle}`);
  await theme.screenshot({path:`${out}/${label}-${angle}-premier-ecran.jpg`,type:'jpeg',quality:85});
  await theme.screenshot({path:`${out}/${label}-${angle}-theme-desktop.jpg`,type:'jpeg',quality:85,fullPage:true});
  await theme.setViewportSize({width:390,height:844});await reveal(theme);await theme.screenshot({path:`${out}/${label}-${angle}-premier-ecran-mobile.jpg`,type:'jpeg',quality:85});await theme.screenshot({path:`${out}/${label}-${angle}-theme-mobile.jpg`,type:'jpeg',quality:85,fullPage:true});
  const overflow=await theme.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);if(overflow)throw Error('Client theme overflows');
  if(angle==='expression'){
   const route=account.services?'/pages/prestations':`/products/${cur.spec.store.product.handle}`;
   await theme.goto(`${base}/preview/${account.projectId}/v/${cur.version.id}${route}?es_raw=1`,{waitUntil:'domcontentloaded',timeout:60000});
   await theme.setViewportSize({width:1440,height:1000});await reveal(theme);await theme.screenshot({path:`${out}/${label}-detail-premier-ecran-desktop.jpg`,type:'jpeg',quality:85});await theme.screenshot({path:`${out}/${label}-detail-desktop.jpg`,type:'jpeg',quality:85,fullPage:true});
   await theme.setViewportSize({width:390,height:844});await reveal(theme);await theme.screenshot({path:`${out}/${label}-detail-premier-ecran-mobile.jpg`,type:'jpeg',quality:85});await theme.screenshot({path:`${out}/${label}-detail-mobile.jpg`,type:'jpeg',quality:85,fullPage:true});
   if(!account.services){
    const zoom=theme.locator('[data-zoom-open]').first();if(await zoom.count()){await zoom.click();await theme.locator('[data-zoom][open]').waitFor();await theme.screenshot({path:`${out}/produit-zoom.jpg`,type:'jpeg',quality:85});await theme.keyboard.press('Escape');}
    const add=theme.locator('[data-add-button]').first();if(!await add.count())throw Error('Purchase control missing');await add.click();const drawer=theme.locator('[data-cart-drawer].is-open');await drawer.waitFor();if(!(await drawer.innerText()).includes(cur.spec.store.product.title))throw Error('Wrong project product in cart');await theme.screenshot({path:`${out}/produit-panier.jpg`,type:'jpeg',quality:85});await theme.keyboard.press('Escape');
   }
   const faq=theme.locator('main details summary').first();if(await faq.count()){const before=await faq.evaluate((e:any)=>e.parentElement.hasAttribute('open'));await faq.click();if(await faq.evaluate((e:any)=>e.parentElement.hasAttribute('open'))===before)throw Error('FAQ did not toggle');}
   if(account.services){const contact=theme.getByRole('link',{name:/rendez-vous|projet/i}).first();if(!await contact.count())throw Error('Service CTA missing');await contact.click();await theme.waitForLoadState('domcontentloaded');if(!/\/pages\/(contact|prestations)/.test(new URL(theme.url()).pathname))throw Error('Service CTA destination');await reveal(theme);await theme.screenshot({path:`${out}/service-contact-mobile.jpg`,type:'jpeg',quality:85,fullPage:true});}
  }
  const themeVideo=theme.video();await theme.close();if(themeVideo)fs.copyFileSync(await themeVideo.path(),`${out}/${label}-${angle}-theme.webm`);
  if(angle==='expression')for(const platform of ['shopify','woocommerce','prestashop']){const response=await page.request.get(`${base}/api/projects/${account.projectId}/theme/export?platform=${platform}&version=${cur.version.id}`,{timeout:120000});if(!response.ok())throw Error(`Export ${platform}: ${await response.text()}`);fs.writeFileSync(`${out}/${label}-${platform}.zip`,await response.body());}

  const {getStrategyState}=await import('../src/lib/marketing-strategy');const {listContents,latestContent}=await import('../src/lib/seo-v2/store');const {all}=await import('../src/lib/db');examples.push({case:label,angle,strategy:getStrategyState(account.projectId).active?.angle,seo:listContents(account.projectId).map(d=>latestContent(account.projectId,d.docKey)?.doc),posts:all("SELECT p.caption,p.status,c.angle_id,c.version FROM posts p LEFT JOIN marketing_strategy_contents c ON c.project_id=p.project_id AND c.module='post' AND c.content_id=p.id WHERE p.project_id=? AND p.status!='cancelled'",account.projectId),template:cur.spec.templates.index});
  if(all('SELECT id FROM ai_calls WHERE project_id=?',account.projectId).length)throw Error('Unexpected provider trace');
  proofs.push({case:label,angle,persisted:true,themeVersion:cur.version.number,realProviderCalls:0,overflow:false,websiteStrategy:account.services?'general_foundation':angle,websiteUnchanged:account.services?cur.version.id===serviceSiteId:undefined,delivery:(result as any).delivery?.state});
 }
 if(account.services){await page.goto(`${base}/studio/${account.projectId}/publications#planifier`,{waitUntil:'domcontentloaded'});const selector=page.locator('[data-communication-angle] select').first();await selector.waitFor({timeout:60000});await selector.selectOption('usage');await page.screenshot({fullPage:true,path:`${out}/service-selecteur-calendrier-A.jpg`,type:'jpeg',quality:85});await selector.selectOption('expression');await page.screenshot({fullPage:true,path:`${out}/service-selecteur-calendrier-B.jpg`,type:'jpeg',quality:85});await page.goto(`${base}/studio/${account.projectId}/strategie`,{waitUntil:'domcontentloaded'});await page.locator('[data-angle-card]').first().waitFor();}
 await page.setViewportSize({width:390,height:844});await page.screenshot({fullPage:true,path:`${out}/${label}-5-angles-mobile.jpg`,type:'jpeg',quality:85});
 if(errors.length)throw Error(errors.join('\n'));const video=page.video();await page.close();await context.close();if(video)fs.copyFileSync(await video.path(),`${out}/${label}-parcours.webm`);
}
} finally {await browser.close();}
fs.writeFileSync(`${out}/navigateur.json`,JSON.stringify({simulation:true,actualBrowser:true,served,expectedCode,realProviderCalls:0,proofs},null,2));
fs.writeFileSync(`${out}/exemples-avant-apres.json`,JSON.stringify(examples,null,2));
console.log(JSON.stringify({cases:proofs.length,output:out}));
