/** Actual browser and HTTP path, native worker dispatch, fictitious accounts only. */
import fs from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
const base='http://127.0.0.1:18260',out=path.resolve('reports/issue160');
fs.mkdirSync(out,{recursive:true});
const accounts=JSON.parse(fs.readFileSync('/tmp/ecs160-ui-accounts.json','utf8'));
const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--no-proxy-server']});
const originalFetch=globalThis.fetch;globalThis.fetch=(input:any,init?:any)=>{const url=new URL(typeof input==='string'?input:input.url??input.toString());if(!['127.0.0.1','localhost','[::1]'].includes(url.hostname))throw Error('Supplier transport forbidden in acceptance');return originalFetch(input,init);};
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
 await page.goto(`${base}/studio/${account.projectId}/strategie`,{waitUntil:'domcontentloaded',timeout:120000});
 const panel=page.locator('[data-marketing-strategy]').first();await panel.waitFor({timeout:60000});await panel.locator('[data-angle-card]').first().waitFor({timeout:120000});
 await panel.locator('[data-analyze-strategy]').click();await panel.locator('[data-angle-card]').first().waitFor();
 if(await panel.locator('[data-angle-card]').count()!==5)throw Error('Five angle cards required');
 await page.screenshot({fullPage:true,path:`${out}/${label}-5-angles-desktop.jpg`,type:'jpeg',quality:85});
 for(const angle of ['usage','expression']){
  console.log(`Browser ${label}: ${angle}`);
  await panel.locator(`[data-view-angle="${angle}"]`).click();await panel.locator(`[data-angle-details="${angle}"]`).screenshot({path:`${out}/${label}-${angle}-carte.jpg`,type:'jpeg',quality:85});
  await panel.locator(`[data-prepare-angle="${angle}"]`).click();const confirm=panel.locator('[data-strategy-confirm]');await confirm.waitFor();
  await confirm.locator("[data-prepare-modules]").click();await confirm.getByText("Calendrier · Version préparée",{exact:false}).first().waitFor({timeout:60000});
  const toQuote=confirm.locator('[data-strategy-review-item] input[type=checkbox]');if(await toQuote.count()){await toQuote.first().check();await confirm.locator('[data-quote-revisions]').click();await confirm.locator('[data-revision-bundle]').getByText('Devis à confirmer',{exact:true}).waitFor();await confirm.locator('[data-revision-bundle]').screenshot({path:`${out}/${label}-${angle}-devis-sans-depense.jpg`,type:'jpeg',quality:85});}
  for(const item of await confirm.locator('[data-strategy-review-item]').all())await item.getByRole('button',{name:'Vérifié : compatible, réutiliser',exact:true}).click();
  await confirm.screenshot({path:`${out}/${label}-${angle}-impact.jpg`,type:'jpeg',quality:85});
  await confirm.locator('[data-confirm-strategy]').click();await panel.locator(`[data-active-angle="${angle}"]`).waitFor({timeout:30000});
  await page.reload({waitUntil:'domcontentloaded'});await panel.locator(`[data-active-angle="${angle}"]`).waitFor();
  // Build through the real HTTP route, then dispatch only this test account's task in the native worker handler.
  const queued=await page.request.post(`${base}/api/projects/${account.projectId}/theme/build`,{data:{direction:account.direction}});if(!queued.ok())throw Error(await queued.text());const task=await queued.json();
  const {getJob,claimNext,JobContext,completeJob}=await import('../src/lib/jobs');const {handlers}=await import('../worker/handlers');
  const job=claimNext([account.direction?"shop.direction":"shop.build"]);if(!job||job.project_id!==account.projectId||job.user_id!==account.userId)throw Error('Wrong isolated job');
  const result=await handlers[job.type](new JobContext(job));
  completeJob(job.id,result);
  // Real persistent queue claim, native dispatch and completion; supplier transport remains forbidden.
  const {currentTheme}=await import('../src/lib/projects');const cur=currentTheme(account.projectId)!;
  if(cur.spec.meta?.strategy?.angleId!==angle)throw Error('Persisted angle mismatch');
  const theme=await context.newPage();await theme.goto(`${base}/preview/${account.projectId}/v/${cur.version.id}/?es_raw=1`,{waitUntil:'domcontentloaded',timeout:60000});
  await reveal(theme);
  console.log(`Native theme visible: ${label}/${angle}`);
  await theme.screenshot({path:`${out}/${label}-${angle}-premier-ecran.jpg`,type:'jpeg',quality:85});
  await theme.screenshot({path:`${out}/${label}-${angle}-theme-desktop.jpg`,type:'jpeg',quality:85,fullPage:true});
  await theme.setViewportSize({width:390,height:844});await reveal(theme);await theme.screenshot({path:`${out}/${label}-${angle}-theme-mobile.jpg`,type:'jpeg',quality:85,fullPage:true});
  const overflow=await theme.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);if(overflow)throw Error('Client theme overflows');await theme.close();
  if(angle==='expression')for(const platform of ['shopify','woocommerce','prestashop']){const response=await page.request.get(`${base}/api/projects/${account.projectId}/theme/export?platform=${platform}&version=${cur.version.id}`,{timeout:120000});if(!response.ok())throw Error(`Export ${platform}: ${await response.text()}`);fs.writeFileSync(`${out}/${label}-${platform}.zip`,await response.body());}

  const {getStrategyState}=await import('../src/lib/marketing-strategy');const {listContents,latestContent}=await import('../src/lib/seo-v2/store');const {all}=await import('../src/lib/db');examples.push({case:label,angle,strategy:getStrategyState(account.projectId).active?.angle,seo:listContents(account.projectId).map(d=>latestContent(account.projectId,d.docKey)?.doc),posts:all('SELECT caption,status FROM posts WHERE project_id=? AND status!=?',account.projectId,'cancelled'),template:cur.spec.templates.index});
  if(all('SELECT id FROM ai_calls WHERE project_id=?',account.projectId).length)throw Error('Unexpected provider trace');
  proofs.push({case:label,angle,persisted:true,themeVersion:cur.version.number,realProviderCalls:0,overflow:false,delivery:(result as any).delivery?.state});
 }
 await page.setViewportSize({width:390,height:844});await page.screenshot({fullPage:true,path:`${out}/${label}-5-angles-mobile.jpg`,type:'jpeg',quality:85});
 if(errors.length)throw Error(errors.join('\n'));const video=page.video();await page.close();await context.close();if(video)fs.copyFileSync(await video.path(),`${out}/${label}-parcours.webm`);
}
} finally {await browser.close();}
fs.writeFileSync(`${out}/navigateur.json`,JSON.stringify({simulation:true,actualBrowser:true,realProviderCalls:0,proofs},null,2));
fs.writeFileSync(`${out}/exemples-avant-apres.json`,JSON.stringify(examples,null,2));
console.log(JSON.stringify({cases:proofs.length,output:out}));
