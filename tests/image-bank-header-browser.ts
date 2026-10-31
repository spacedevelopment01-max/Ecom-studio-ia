/** Recette navigateur native, appelée explicitement ; aucune génération/recherche fournisseur. */
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
type Fixture={origin:string;out:string;cookie:string;pid:string;before:boolean};
export async function imageBankHeaderBrowser(f:Fixture){
 const browser=await chromium.launch({headless:true,...process.env.CHROMIUM?{executablePath:process.env.CHROMIUM}:{},args:['--no-sandbox','--disable-background-networking']});const cases=[];
 try{for(const width of [1440,1024,390,360]){
  const ctx=await browser.newContext({locale:'fr-FR',viewport:{width,height:900},reducedMotion:'reduce'});await ctx.addCookies(f.cookie.split('; ').map(s=>{const at=s.indexOf('=');return{name:s.slice(0,at),value:s.slice(at+1),url:f.origin};}));await ctx.route('**/*',r=>new URL(r.request().url()).origin===f.origin?r.continue():r.abort());const page=await ctx.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.goto(`${f.origin}/studio/${f.pid}/images`);const splash=page.locator('#ecs-splash');if(await splash.isVisible())await splash.getByRole('button',{name:'Passer',exact:true}).click();await splash.waitFor({state:'hidden'});const bank=page.locator('[data-image-bank]'),heading=bank.getByRole('heading',{name:"Banque d'images",exact:true});await heading.waitFor();await bank.locator('[data-bank-create]').waitFor();await heading.evaluate(el=>el.scrollIntoView({block:'center'}));
   for(const open of [false,true]){
    if(open){await page.getByRole('button',{name:'SYNA',exact:true}).click();await page.getByRole('dialog',{name:'SYNA — conversation du projet',exact:true}).waitFor();}
    await page.evaluate(async()=>{await document.fonts.ready;await new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r())));});await page.waitForTimeout(300);
    const metrics=await bank.evaluate(root=>{const h=root.querySelector('h2')!,group=h.parentElement!,actions=root.querySelector('[data-bank-create]')!.parentElement!,buttons=[...actions.querySelectorAll('button')],rects=[h,group,actions,...buttons].map(e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};});return{viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth,heading:rects[0],copy:rects[1],actions:rects[2],buttons:buttons.map((b,i)=>({text:b.textContent,rect:rects[i+3],scrollWidth:b.scrollWidth,clientWidth:b.clientWidth,hitTarget:b.contains(document.elementFromPoint(b.getBoundingClientRect().x+b.getBoundingClientRect().width/2,b.getBoundingClientRect().y+b.getBoundingClientRect().height/2))})),panel:document.querySelector('#central-agent-panel')?.getBoundingClientRect().toJSON()??null};});
    // Mobile : le panneau modal masque volontairement le fond ; le fond doit rester dimensionné normalement.
    const collapsed=metrics.heading.width<200,overflow=metrics.scrollWidth>width;fs.writeFileSync(path.join(f.out,`${width}-${open?'syna':'manuel'}-metrics.json`),JSON.stringify(metrics,null,2));await page.screenshot({path:path.join(f.out,`${width}-${open?'syna':'manuel'}.png`)});assert.deepEqual(errors,[]);
    if(!f.before){assert.equal(collapsed,false,JSON.stringify(metrics));assert.equal(overflow,false);for(const b of metrics.buttons){assert.ok(b.rect.width>0);assert.ok(b.scrollWidth<=b.clientWidth+1,JSON.stringify(b));assert.ok(b.rect.right<=width+1);if(!open)assert.equal(b.hitTarget,true,'Header action must be physically reachable at its visible center: '+b.text);}}
    cases.push({width,synaOpen:open,collapsed,overflow,metrics,capture:`${width}-${open?'syna':'manuel'}.png`});
   }
   await page.getByRole('button',{name:'Replier SYNA',exact:true}).click();await bank.locator('[data-bank-search]').click();const search=page.locator('[data-bank-search-dialog]');await search.waitFor();await page.getByRole('button',{name:'Fermer',exact:true}).click();await search.waitFor({state:'hidden'});await bank.locator('[data-bank-create]').click();await page.locator('[data-bank-create-dialog]').waitFor();await page.getByRole('button',{name:'Fermer',exact:true}).click();assert.equal(await bank.locator('[data-bank-upload]').count(),1);assert.deepEqual(errors,[]);
  }finally{await ctx.close();}
 }}finally{await browser.close();}
 if(f.before)assert.ok(cases.some(c=>c.width===1440&&c.synaOpen&&c.collapsed),'Expected reproducible compressed old header');
 return{cases,before:f.before,nativeDialogsOpenedWithoutSubmitting:true,realProviderCalls:0,realCostEur:0};
}
