/** Native production studio/preview, throwaway fixtures; external browser requests denied. */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
const root=process.env.DATA_DIR;
if(!root?.startsWith('/tmp/ecs-higgsfield-proof-195-')) throw Error('Isolated proof required');
const base='http://127.0.0.1:3192', out=path.resolve('reports/contre-verification-195/navigateur');
fs.mkdirSync(out,{recursive:true});
const fixtures=JSON.parse(fs.readFileSync(path.join(root,'projects.json'),'utf8'));
const {token}=JSON.parse(fs.readFileSync(path.join(root,'session.json'),'utf8'));
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const ctx=await browser.newContext({viewport:{width:1440,height:1000},locale:'fr-FR',recordVideo:{dir:path.join(root,'video-195'),size:{width:1440,height:1000}}});
await ctx.addCookies([{name:'ecs_session',value:token,url:base}]);
await ctx.addInitScript(()=>{if(location.pathname.startsWith('/studio/')){sessionStorage.setItem('ecsSeen','1');for(const tab of ['catalogue','rendez-vous','boutique'])localStorage.setItem('ecs-tuto-seen-'+tab,'1');}});
const denied=[];
await ctx.route('**/*',route=>{
 const u=new URL(route.request().url());
 if(['127.0.0.1','localhost'].includes(u.hostname)||['data:','blob:'].includes(u.protocol))return route.continue();
 denied.push(u.origin);return route.abort('blockedbyclient');
});
const page=await ctx.newPage(), errors=[];page.on('pageerror',e=>errors.push(String(e.message)));
const result={commit:fixtures.commit,nativeProduction:true,realProviderCalls:0,simulatedFixtures:true,demos:[],holdouts:[],errors,deniedOrigins:[]};
for(const d of fixtures.demos.filter(d=>!d.error)){
 for(const [device,width,height]of[['ordinateur',1440,1000],['mobile',390,844]]){
  await page.setViewportSize({width,height});
  const response=await page.goto(`${base}/preview/${d.project}/v/current/`,{waitUntil:'networkidle',timeout:120000});
  await page.evaluate(async()=>{for(let y=0;y<document.body.scrollHeight;y+=650){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,40));}window.scrollTo(0,0);});
  const metrics=await page.evaluate(()=>({title:document.title,h1:[...document.querySelectorAll('h1')].map(e=>e.textContent),width:innerWidth,scrollWidth:document.documentElement.scrollWidth,height:document.body.scrollHeight,brokenImages:[...document.images].filter(i=>!i.complete||!i.naturalWidth).map(i=>({src:new URL(i.src).pathname,alt:i.alt})),liquidError:document.body.innerText.includes('Liquid error')}));
  await page.screenshot({path:path.join(out,`${d.theme}-${device}-premier-ecran.png`),fullPage:false,animations:'disabled'});
  await page.screenshot({path:path.join(out,`${d.theme}-${device}.png`),fullPage:true,animations:'disabled',timeout:120000});
  result.demos.push({theme:d.theme,device,status:response.status(),missingSourceMedia:d.missing,...metrics});
 }
}
const product=fixtures.holdouts.find(x=>x.index===0), service=fixtures.holdouts.find(x=>x.index===2);
await page.setViewportSize({width:1440,height:1000});
await page.goto(`${base}/studio/${product.project}/catalogue`,{waitUntil:'networkidle',timeout:120000});
await page.getByRole('button',{name:'Ajouter un produit',exact:true}).click();
const dialog=page.getByRole('dialog');
const nameField=dialog.locator('label').filter({hasText:/^Nom \*$/}).locator('..').locator('input');
await nameField.fill('Support de filtration — contre-épreuve 195');
await dialog.locator('textarea').first().fill('Accessoire fictif ; aucune promesse ni donnée commerciale inventée.');
await dialog.getByRole('button',{name:'Enregistrer',exact:true}).click();
await dialog.waitFor({state:'hidden'});
await page.reload({waitUntil:'networkidle'});
await page.getByText('Support de filtration — contre-épreuve 195',{exact:true}).waitFor();
const catalogue=await page.evaluate(async()=>{const r=await fetch(location.pathname.replace('/studio/','/api/projects/').replace('/catalogue','/products'));return {status:r.status(),body:await r.json()};});
result.holdouts.push({kind:'product',savedAndReopened:true,status:catalogue.status,productTitles:catalogue.body.products.map(p=>p.data.title)});
await page.screenshot({path:path.join(out,'client-produit-catalogue-reouvert.png'),fullPage:true});
await page.goto(`${base}/studio/${service.project}/catalogue`,{waitUntil:'networkidle'});
await page.getByText(/Ce site présente des prestations/).waitFor();
await page.screenshot({path:path.join(out,'client-service-catalogue.png'),fullPage:true});
await page.goto(`${base}/studio/${service.project}/rendez-vous`,{waitUntil:'networkidle'});
result.holdouts.push({kind:'service',catalogueDistinction:true,bookingPageAccessible:!page.url().includes('/login')});
await page.screenshot({path:path.join(out,'client-service-rendez-vous.png'),fullPage:true});
for(const h of fixtures.holdouts){
 await page.goto(`${base}/preview/${h.project}/v/current/`,{waitUntil:'networkidle'});
 result.holdouts.push({kind:h.index===0?'product-preview':'service-preview',status:await page.locator('body').innerText().then(t=>t.includes('Liquid error')?'liquid-error':'rendered')});
 await page.screenshot({path:path.join(out,`client-${h.index===0?'produit':'service'}-apercu.png`),fullPage:true,animations:'disabled'});
}
result.deniedOrigins=[...new Set(denied)];
const video=page.video();await ctx.close();if(video)await video.saveAs(path.join(out,'parcours-studio-apercus.webm'));await browser.close();
fs.writeFileSync(path.join(out,'resultat.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify({demos:result.demos.length,overflow:result.demos.filter(d=>d.scrollWidth>d.width+1).map(d=>`${d.theme}/${d.device}`),broken:result.demos.filter(d=>d.brokenImages.length).map(d=>`${d.theme}/${d.device}:${d.brokenImages.length}`),errors,holdouts:result.holdouts},null,2));
