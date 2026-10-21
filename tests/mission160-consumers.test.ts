/** Native consumers; isolated project facts, local files and a simulated publisher. No provider calls. */
import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { createUser } from '@/lib/auth';
import { id, now, run, one } from '@/lib/db';
import { emptyProduct } from '@/lib/project-types';
import { loadProject, saveProduct } from '@/lib/projects';
import { grantProjectPlan } from '@/lib/project-subscriptions';
import { activeStrategy, activateStrategy, prepareStrategyChange, stageStrategyModule, getStrategyState, assertContentAlignment, preparationStrategy } from '@/lib/marketing-strategy';
import { withStrategyScope, strategySelection, strategyStamp, selectedStrategyContext, assertStrategyInputsCurrent } from '@/lib/strategy-consumption';
import { brainView } from '@/lib/brain/facade';
import { SCOPES } from '@/lib/brain/views';
import { adInsight } from '@/lib/ads-v2/insight';
import { localCopy } from '@/lib/ads-v2/copy';
import { socialStrategy } from '@/lib/social-v2/strategy';
import { videoStrategy } from '@/lib/video-v2/strategy';
import { verifiedFacts } from '@/lib/seo-v2/facts';
import { createPlanV2 } from '@/lib/social-v2/planner';
import { saveAsset, assetMeta } from '@/lib/library';
import { saveVersion, latestDoc, restoreVersion } from '@/lib/ad-doc/store';
import { withSelectedStrategy } from '@/lib/ai/llm';
import { publishOne } from '@/lib/social-v2/scheduler';

async function fixture(service=false) {
 const user=await createUser(`${id()}@example.test`,'isolation-160','Consommateurs');
 const pid=id(); const product={...emptyProduct(),name:service?'Accord — réglage violoncelle':'Pli — sac vélo',category:service?'Lutherie':'Bagagerie',summary:service?'Un atelier sur rendez-vous pour le réglage des instruments à cordes.':'Un sac de transport pour les trajets à vélo et les affaires de travail.',facts:[{key:'detail',label:service?'Contrôle':'Contenance',value:service?'Réglage du chevalet':'12 litres',status:'confirmed',source:'user'}]};
 run('INSERT INTO projects(id,user_id,name,business_type,product_json,strategy_json,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)',pid,user.id,product.name,service?'services':'products',JSON.stringify(product),JSON.stringify({audience:[],angles:[{title:'ANCIEN_ANGLE_DU_STUDIO',idea:'ne doit plus orienter'}],keyMessages:['ANCIEN_MESSAGE_DU_STUDIO'],pillars:['Ancien']}),now(),now());
 grantProjectPlan(pid,'dominer');return{pid,user,project:()=>loadProject(pid)};
}
function activate(pid:string, angleId:string) {
 const preparation=prepareStrategyChange(pid,angleId);
 for(const module of new Set(preparation.contents.map(c=>c.module))) stageStrategyModule(pid,preparation.id,module,{contentIds:[],retainedContentIds:preparation.contents.filter(c=>c.module===module).map(c=>c.contentId)});
 return activateStrategy(pid,{angleId,preparationId:preparation.id,idempotencyKey:id(),confirmed:true,retainUnaligned:true});
}
const ad=()=>({version:1,width:1080,height:1080,background:'#ffffff',safe:{top:20,bottom:20,side:20},format:{platform:'facebook',aspect:'1:1'},layers:[],brand:{name:'Pli',palette:{primary:'#123456'},fonts:{heading:'Arial',body:'Arial'}},meta:{conceptId:null,source:'engine',createdFrom:null}} as any);

it.each([false,true])('le même angle versionné alimente tous les scopes Brain, produit/service=%s',async service=>{
 const f=await fixture(service);const active=activate(f.pid,'usage');
 for(const scope of SCOPES.filter(s=>s!=='all')) {
  const view=brainView(f.project(),scope);
  expect(view.kept).toContain('strategy.active');expect(view.criticalDropped).toEqual([]);
  expect(view.stable).toContain(active.id);expect(view.stable).toContain(active.angle.audience);
  expect(view.stable).not.toContain('ANCIEN_ANGLE_DU_STUDIO');expect(view.stable).not.toContain('ANCIEN_MESSAGE_DU_STUDIO');
 }
 const call=withSelectedStrategy({userId:f.user.id,projectId:f.pid,task:'copywriting',system:'Texte',prompt:'Demande'});
 expect(call.context).toContain(active.id);expect(withSelectedStrategy(call).context).toBe(call.context);
});

it.each([false,true])('la bascule change cible, promesse, ton, scène, publicité et social sans changer les faits, service=%s',async service=>{
 const f=await fixture(service); const values=[];
 for(const angle of ['usage','reassurance']) {
  const active=activate(f.pid,angle);const p=f.project();const insight=adInsight(p,{audience:'cible concurrente ignorée'});
  const facts=verifiedFacts(p);const social=socialStrategy(p);
  const video=videoStrategy(p,{kind:'brand_film',goal:'présenter',audience:null,durationS:15,aspect:'16:9'} as any);
  const copy=localCopy(insight,{id:'a',type:'detail',material:'Contenance : 12 litres',lever:'détail',why:'fait'} as any,'fr',{hookWords:20,headline:120,description:200,primaryFirstLine:200});
  expect(insight.audience.declared).toBe(active.angle.audience);expect(social.tone).toEqual([active.angle.tone]);expect(facts.facts).toEqual(p.product.facts.map(x=>({label:x.label,value:x.value})));
  expect(video.style.camera).toContain(active.angle.visualDirection);expect(copy.primary).toContain(active.angle.examples.advertisement);
  values.push({audience:insight.audience.declared,promise:insight.difference,tone:social.tone.join(),scene:video.style.camera,copy:copy.primary,messages:social.messages.join()});
 }
 for(const key of Object.keys(values[0]) as (keyof typeof values[0])[])expect(values[0][key],key).not.toEqual(values[1][key]);
 expect(one<{n:number}>('SELECT COUNT(*) n FROM ai_calls WHERE project_id=?',f.pid)?.n).toBe(0);
});

it('un aperçu de stratégie préparée reste local et ne change ni l’actif ni la provenance d’une autre exécution',async()=>{
 const f=await fixture();const a=activate(f.pid,'usage');const prep=prepareStrategyChange(f.pid,'expression');const candidate=preparationStrategy(f.pid,prep.id);
 withStrategyScope(f.pid,()=>{expect(strategySelection(f.pid)?.angleId).toBe('expression');expect(brainView(f.project(),'image').stable).toContain(candidate.angle.examples.hero);},candidate);
 expect(activeStrategy(f.pid)?.id).toBe(a.id);expect(strategyStamp(f.pid)?.angleId).toBe('usage');
});

it('une génération commencée sur A ne devient pas faussement B après une activation concurrente',async()=>{
 const f=await fixture();const a=activate(f.pid,'usage');
 await withStrategyScope(f.pid,async()=>{
  activate(f.pid,'expression');await Promise.resolve();
  const saved=await saveAsset({projectId:f.pid,userId:f.user.id,data:await sharp({create:{width:64,height:64,channels:3,background:'#778899'}}).jpeg().toBuffer(),name:'scene.jpg',mime:'image/jpeg',role:'lifestyle',origin:'generated'});
  expect(assetMeta<any>(saved).marketingStrategy.id).toBe(a.id);expect(selectedStrategyContext(f.pid)).toContain(a.id);
  expect(()=>assertContentAlignment(f.pid,'asset',saved.id)).toThrow();
 });
 expect(strategyStamp(f.pid)?.angleId).toBe('expression');
});

it('versions et restauration conservent l’origine ; un faux tampon client ne certifie pas l’ancien document',async()=>{
 const f=await fixture();const a=activate(f.pid,'usage');const first=saveVersion(f.pid,'ad:preuve',ad());
 activate(f.pid,'expression');
 const edited=saveVersion(f.pid,'ad:preuve',{...ad(),meta:{...ad().meta,source:'user',marketingStrategy:strategyStamp(f.pid)}});
 expect(latestDoc(f.pid,'ad:preuve')?.doc.meta.marketingStrategy?.id).toBe(a.id);
 expect(getStrategyState(f.pid).alignment.find(c=>c.contentId===edited.id)).toMatchObject({protected:true,aligned:false});
 const restored=restoreVersion(f.pid,'ad:preuve',first.version);
 expect(latestDoc(f.pid,'ad:preuve')?.doc.meta.marketingStrategy?.id).toBe(a.id);
 expect(()=>assertContentAlignment(f.pid,'ad',restored.id)).toThrow();
});

it('le calendrier et ses publications portent l’angle ; une ancienne programmation est retenue avant tout envoi',async()=>{
 const f=await fixture();activate(f.pid,'usage');const date=new Date(Date.now()+86400000).toISOString().slice(0,10);
 const result=createPlanV2(f.project(),{startDate:date,days:1,perDay:1,timezone:'Europe/Paris',platforms:[{platform:'facebook',connectionId:null}]});
 const post=one<{id:string}>('SELECT id FROM posts WHERE project_id=?',f.pid)!;expect(()=>assertContentAlignment(f.pid,'post',post.id)).not.toThrow();expect(()=>assertContentAlignment(f.pid,'calendar',result.planId)).not.toThrow();
 activate(f.pid,'expression');run("UPDATE posts SET status='scheduled' WHERE id=?",post.id);
 let calls=0;const outcome=await publishOne(post.id,{publish:async()=>{calls++;return{remoteId:'not-real'};},canVerify:()=>false,findExisting:async()=>null} as any);
 expect(outcome.outcome).toBe('skipped');expect(calls).toBe(0);expect(one<any>('SELECT status,error FROM posts WHERE id=?',post.id)).toMatchObject({status:'review'});
 run("UPDATE posts SET status='published',remote_id='archive-conservee' WHERE id=?",post.id);
 await publishOne(post.id,{publish:async()=>{calls++;return{remoteId:'not-real'};},canVerify:()=>false,findExisting:async()=>null} as any);
 expect(one<any>('SELECT status,remote_id FROM posts WHERE id=?',post.id)).toMatchObject({status:'published',remote_id:'archive-conservee'});expect(calls).toBe(0);
});

it('un ancien contexte de rédaction ne mélange pas les angles et ne part pas au fournisseur',async()=>{
 const f=await fixture();activate(f.pid,'usage');const old=selectedStrategyContext(f.pid);activate(f.pid,'expression');
 expect(()=>withSelectedStrategy({userId:f.user.id,projectId:f.pid,task:'copywriting',system:'Texte',context:old,prompt:'Demande'})).toThrow(/ancienne stratégie/);
 expect(one<{n:number}>('SELECT COUNT(*) n FROM ai_calls WHERE project_id=?',f.pid)?.n).toBe(0);
});

it('un fait changé exige une réconciliation explicite du même angle, sans nouvel angle ni coût',async()=>{
 const f=await fixture();activate(f.pid,'usage');
 saveProduct(f.pid,{...f.project().product,summary:'Un sac de transport destiné aux trajets de week-end, avec rangement.'});
 expect(()=>assertStrategyInputsCurrent(f.pid)).toThrow(/Préparez à nouveau cet angle/);
 expect(()=>withStrategyScope(f.pid,()=>null)).toThrow();
 activate(f.pid,'usage');expect(()=>assertStrategyInputsCurrent(f.pid)).not.toThrow();expect(getStrategyState(f.pid).usedAngleIds).toEqual(['usage']);
 expect(one<{n:number}>('SELECT COUNT(*) n FROM ai_calls WHERE project_id=?',f.pid)?.n).toBe(0);
});
