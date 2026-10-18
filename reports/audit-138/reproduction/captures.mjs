/** Captures du serveur de test isolé après browser-proof et restoration-proof. Aucun fournisseur réel. */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const dir = path.resolve(process.argv[2] || '');
if (!path.basename(dir).startsWith('ecs-preparation-test-')) throw new Error('Base isolée obligatoire');
const cfg = JSON.parse(fs.readFileSync(path.join(dir,'test-only.json'),'utf8'));
const entries = JSON.parse(fs.readFileSync(path.join(dir,'captures/browser-proof.json'),'utf8')).results;
const out=path.resolve('reports/audit-138/captures'); fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
const proof=[];
const legacy=process.env.AUDIT_LEGACY === "1";
for (const entry of entries.filter(x=>!legacy || x.case === "produit")) for (const mobile of [false,true]) {
  const ctx=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:960},isMobile:mobile,hasTouch:mobile,locale:'fr-FR'});
  await ctx.addCookies([{name:'ecs_session',value:cfg.token,url:'http://127.0.0.1:18100'},{name:'ecs-lang',value:'fr',url:'http://127.0.0.1:18100'}]);
  await ctx.addInitScript(()=>{localStorage.setItem('ecs-lang','fr');sessionStorage.setItem('ecsSeen','1');});
  await ctx.route('**/*',r=>['127.0.0.1','localhost'].includes(new URL(r.request().url()).hostname)?r.continue():r.abort());
  const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:18100/studio/${entry.pid}/pilote`,{waitUntil:'domcontentloaded'});
  await page.waitForSelector('[data-preparation]');await page.waitForSelector('#ecs-splash',{state:'detached'});
  const step=async n=>page.locator('[data-preparation] ol').first().locator('button').nth(n).click();
  const shot=async name=>{
    const dismiss=page.locator('[data-tuto-nudge]').getByRole('button',{name:'Masquer',exact:true});if(await dismiss.count())await dismiss.click();
    await page.evaluate(async()=>{for(const i of document.images){i.loading='eager';await i.decode().catch(()=>{});}await document.fonts.ready;scrollTo({top:0,behavior:'instant'});});
    await page.screenshot({path:path.join(out,name+'.png'),fullPage:true});
  };
  await step(1);assert.equal(await page.locator('input[name=strategy]').count(),legacy?3:5);
  if(legacy) await page.locator('[data-legacy-research]').waitFor();
  const suffix=mobile?'mobile':'ordinateur';await shot(`${entry.case}-${legacy?"ancien-trois-angles":"cinq-angles"}-${suffix}`);
  if (!legacy && ((!mobile && entry.case==='produit') || (mobile && entry.case==='service'))) {await step(3);await shot(`${entry.case}-contenus-${suffix}`);}
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);assert(overflow<=1);assert.deepEqual(errors,[]);
  proof.push({project:entry.case,viewport:mobile?'390x844':'1440x960',angles:legacy?3:5,legacy,overflow,errors});await ctx.close();
}
await browser.close();
fs.mkdirSync('reports/audit-138/donnees',{recursive:true});fs.writeFileSync(`reports/audit-138/donnees/${legacy?'legacy-':''}captures-proof.json`,JSON.stringify({simulation:true,results:proof},null,2));
console.log('Captures vérifiées, ancien format :',legacy,'vues :',proof.length);
