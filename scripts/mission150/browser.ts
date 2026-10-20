/** Chromium drives real pricing, RDV, locks and reloads. No provider/payment/booking requests. */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {chromium} from 'playwright';
const dir=process.env.DATA_DIR;
if(!dir||!path.basename(dir).startsWith('ecs-test-150-'))throw Error('Isolated DATA_DIR required');
const out=path.join(dir,'proofs');fs.mkdirSync(out,{recursive:true});
const accounts=JSON.parse(fs.readFileSync(path.join(dir,'browser-sessions-private.json'),'utf8'));
const pricingOnly=process.argv.includes('--pricing-only');
const base='http://127.0.0.1:18250';const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
const errors:string[]=[],external:string[]=[],writes:string[]=[],checks:any[]=[];
const version=await(await fetch(base+'/api/version')).json();assert.match(version.commit,/^[a-f0-9]{40}$/);
try{
 for(const a of accounts){
  if(pricingOnly&&a.plan!=='creer')continue;
  const context=await browser.newContext({viewport:{width:1440,height:1000},locale:'fr-FR',reducedMotion:'reduce'});
  await context.addCookies([{name:'ecs_session',value:a.token,url:base},{name:'ecs-lang',value:'fr',url:base}]);
  await context.addInitScript(()=>{sessionStorage.setItem('ecsSeen','1');addEventListener('DOMContentLoaded',()=>{const b=document.createElement('div');b.textContent='RÉCEPTION #150 — COMPTES FICTIFS — AUCUNE IA, AUCUN PAIEMENT NI RDV RÉEL';b.style.cssText='position:fixed;top:0;left:0;right:0;z-index:2147483647;padding:6px;background:#754e15;color:white;font:12px sans-serif;text-align:center;pointer-events:none';document.body.append(b);});});
  await context.route('**/*',r=>{const u=new URL(r.request().url());if(!['127.0.0.1','localhost'].includes(u.hostname)&&!['data:','blob:'].includes(u.protocol)){external.push(u.hostname);return r.abort();}if(r.request().method()!=='GET'&&/billing\/checkout|api\/calls|api\/projects.*\/(generate|campaigns)/.test(u.pathname)&&!(u.pathname.endsWith('/campaigns/v2')&&r.request().postDataJSON()?.action==='ai_quote')){writes.push(u.pathname);return r.abort();}return r.continue();});
  const p=await context.newPage();p.setDefaultTimeout(60000);p.on('pageerror',e=>errors.push(e.message));
  const shot=async(name:string)=>{await p.evaluate(()=>window.scrollTo(0,0));await p.evaluate(()=>document.fonts.ready);const layout=await p.evaluate(()=>({viewport:innerWidth,content:document.documentElement.scrollWidth}));assert(layout.content<=layout.viewport+2,name+' overflow');await p.screenshot({path:path.join(out,name+'.png'),fullPage:true});checks.push({name,...layout});};
  await p.goto(base+'/studio?nouveau=1');await p.locator('#forfait-creer').waitFor();
  if(a.plan==='creer'){
   await shot('forfaits-trois-ordinateur');for(const plan of ['creer','vendre','dominer'])await p.locator('#forfait-'+plan).screenshot({path:path.join(out,`forfait-${plan}-detail.png`)});
   await p.setViewportSize({width:390,height:844});await shot('forfaits-trois-mobile');await p.setViewportSize({width:1440,height:1000});
  }
  if(pricingOnly){await context.close();continue;}
  await p.goto(base+'/studio/rendez-vous');await p.locator('#call-project').waitFor();
  const data=await(await context.request.get(base+'/api/calls')).json();assert.equal(data.projects.length,1);assert.equal(data.projects[0].state,'available');assert.equal(data.projects[0].priceEur,a.plan==='creer'?60:a.plan==='vendre'?30:0);assert.equal(data.slots.length,0);
  await shot('rdv-'+a.plan+'-ordinateur');await p.setViewportSize({width:390,height:844});await shot('rdv-'+a.plan+'-mobile');
  if(a.plan!=='dominer'){
   const quote=await context.request.post(base+`/api/projects/${a.pid}/campaigns/v2`,{data:{action:'ai_quote'}});assert.equal(quote.status(),402);checks.push({plan:a.plan,adQuoteStatus:402});
   await p.goto(base+`/studio/${a.pid}/publicites#image`);await p.locator('[data-ad-plan-lock]').first().waitFor();await shot('publicites-verrou-'+a.plan+'-mobile');
  }else{
   execFileSync(process.execPath,['--import','tsx','scripts/mission150/seed.ts','used'],{env:process.env,stdio:'pipe'});await p.reload();await p.getByText('Utilisé',{exact:true}).waitFor();assert.equal((await(await context.request.get(base+'/api/calls')).json()).projects[0].state,'used');await shot('rdv-dominer-utilise-mobile');
  }
  await context.close();
 }
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);assert.deepEqual(writes,[]);
 fs.writeFileSync(path.join(out,pricingOnly?'browser-pricing.json':'browser.json'),JSON.stringify({version,simulation:true,realProviderCalls:0,realProviderCostEur:0,realPayments:0,realBookings:0,checks,errors,external,forbiddenWrites:writes},null,2));
 console.log(pricingOnly?'Native pricing captures passed: three cards, desktop/mobile. Zero provider/payment/booking.':'Native browser acceptance passed: three plans, RDV quote/empty slots/used state, locks, reloads, desktop/mobile. Zero provider/payment/booking.');
}finally{await browser.close();}
