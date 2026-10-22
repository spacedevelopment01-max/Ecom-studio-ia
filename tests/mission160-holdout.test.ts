import {acquiredChoicesForTest} from "./strategy-choice-fixture";
/** Cases introduced after application code was frozen at 769402fe; no rule is adapted to these names. */
import {it,expect,vi,afterEach} from 'vitest';
import {createUser} from '@/lib/auth';
import {run,id,now,all} from '@/lib/db';
import {emptyProduct,emptyServiceProfile} from '@/lib/project-types';
import {saveProduct,saveServices,saveBrand,saveSettings,loadProject,remember,currentTheme} from '@/lib/projects';
import {localBrand} from '@/lib/engine/local';
import {localCopy} from '@/lib/engine/local-copy';
import {buildShop} from '@/lib/engine/shop';
import {grantProjectPlan} from '@/lib/project-subscriptions';
import {prepareStrategyChange,activateStrategy,getStrategyState,activeStrategy} from '@/lib/marketing-strategy';
import {prepareStrategyTheme,commitPreparedStrategyTheme} from '@/lib/theme/strategy-transition';
import {prepareLocalStrategyModules,commitPreparedStrategyModules} from '@/lib/marketing-strategy/module-preparation';
import {runContentEngineV2} from '@/lib/seo-v2/engine';
import {localOnlyDeps} from '@/lib/seo-v2/deps';
import {createPlanV2} from '@/lib/social-v2/planner';
import {compileTheme} from '@/lib/theme/compile';
afterEach(()=>vi.unstubAllGlobals());
it.each([false,true])('nouveau cas tenu à part : tamis de semences / accessibilité numérique, service=%s',async services=>{
 vi.stubGlobal('fetch',async()=>{throw Error('Aucun fournisseur réel autorisé');});
 const user=await createUser(`${id()}@example.test`,'holdout-isole','Cas tenu à part'),pid=id();
 const brandName=services?'Vigie Tests':'Grain Libre Tests';
 run('INSERT INTO projects(id,user_id,name,business_type,store_type,created_at,updated_at) VALUES(?,?,?,?,?,?,?)',pid,user.id,brandName,services?'services':'products','mono',now(),now());
 const product={...emptyProduct(),name:services?'Parcours clavier et restitution':'Tamis de semences T12',category:services?'Accessibilité numérique':'Jardinage',summary:services?'Un diagnostic sur cinq pages du site du client pour repérer les obstacles au clavier et restituer les constats avec des exemples. Aucun label ni certification de conformité.':'Un tamis manuel pour séparer les graines des fragments après la récolte, avant leur rangement.',facts:[{key:'matiere',label:services?'Périmètre':'Maille',value:services?'Cinq pages fournies par le client':'2 mm',status:'confirmed' as const,source:'user' as const},{key:'livrable',label:services?'Livrable':'Matière',value:services?'Liste documentée des obstacles observés':'Acier inoxydable',status:'confirmed' as const,source:'user' as const}]};
 saveProduct(pid,product);const profile=emptyServiceProfile();if(services){profile.services=[{key:'diagnostic-clavier',name:product.name,description:product.summary,price:'650 €',duration:'Deux semaines',contentAliases:[]}];profile.contactMode='quote';saveServices(pid,profile);}
 const local=localBrand(product,brandName,{business:services?'services':'products',services:profile});const brand={...local.brand,name:brandName,story:product.summary,positioning:product.summary,validated:['palette','fonts'],direction:services?'rive' as const:'orbe' as const};saveBrand(pid,brand);saveSettings(pid,{...loadProject(pid).settings,language:'fr',storeKind:services?'services':'specialty'});grantProjectPlan(pid,'dominer');remember(pid,{kind:'artifact',key:'shop_copy',value:JSON.stringify(localCopy(product,brand,loadProject(pid))),source:'local'});
 acquiredChoicesForTest(pid);
 if(services){await buildShop(null,pid,{direction:'rive',useAi:false});const site=currentTheme(pid)!;expect(getStrategyState(pid).usedAngleIds).toEqual([]);const choice=prepareStrategyChange(pid,'reassurance');activateStrategy(pid,{angleId:'reassurance',preparationId:choice.id,idempotencyKey:id(),confirmed:true});expect(await prepareStrategyTheme(pid,choice.id)).toBeNull();expect(currentTheme(pid)?.version.id).toBe(site.version.id);expect(site.spec.meta?.strategy).toBeUndefined();return;}
 const first=prepareStrategyChange(pid,'usage');activateStrategy(pid,{angleId:'usage',preparationId:first.id,idempotencyKey:id(),confirmed:true});
 await runContentEngineV2(null,pid,{type:'home_page',lang:'fr'},localOnlyDeps());createPlanV2(loadProject(pid),{startDate:new Date(Date.now()+86400000).toISOString().slice(0,10),days:1,perDay:1,timezone:'Europe/Paris',platforms:[{platform:'instagram'}],lang:'fr'});
 await buildShop(null,pid,{direction:services?'rive':'orbe',useAi:false});const a=currentTheme(pid)!;
 const second=prepareStrategyChange(pid,'reassurance');await prepareStrategyTheme(pid,second.id);const modules=await prepareLocalStrategyModules(pid,second.id);expect(modules.filter(m=>m.state==='prepared').map(m=>m.module).sort()).toEqual(['calendar','seo']);
 activateStrategy(pid,{angleId:'reassurance',preparationId:second.id,idempotencyKey:id(),confirmed:true,commitPrepared:s=>{commitPreparedStrategyTheme(pid,second.id,s);commitPreparedStrategyModules(pid,second.id);}});
 const b=currentTheme(pid)!;expect(activeStrategy(pid)?.angleId).toBe('reassurance');expect(JSON.stringify(b.spec.templates)).not.toBe(JSON.stringify(a.spec.templates));expect(JSON.stringify(b.spec.templates.index)).toContain(activeStrategy(pid)!.angle.examples.hero);
 expect(loadProject(pid).brand).toEqual(brand);expect(loadProject(pid).product.facts).toEqual(product.facts);expect(getStrategyState(pid).usedAngleIds.sort()).toEqual(['reassurance','usage']);expect(compileTheme(b.spec).size).toBeGreaterThan(10);expect(all('SELECT id FROM ai_calls WHERE project_id=? AND id NOT GLOB \'fixture_research_*\'',pid)).toHaveLength(0);
 // Images were deliberately not supplied: a partial preparation is honest, not a professional photographic delivery.
 expect(b.spec.meta?.adaptation?.status).toBe('partial');
});
/** Two additional domains introduced after the service scope implementation; deterministic transports only. */
it.each([false,true])('cas supplémentaire tenu à part : pupitre de lecture / archivage documentaire, service=%s',async services=>{
 const {clientFixture}=await import('./mission154-fixtures');const {stageStrategyModule}=await import('@/lib/marketing-strategy');
 vi.stubGlobal('fetch',async()=>{throw Error('Aucun fournisseur réel');});const f=await clientFixture({services,strategy:null,copySource:'ai',incomplete:true});
 const p=loadProject(f.pid);p.product.name=services?'Classement des archives papier':'Pupitre de lecture pliant';p.product.category=services?'Organisation documentaire':'Accessoires de lecture';p.product.summary=services?'Inventorier les dossiers fournis, proposer un classement et remettre un index. Aucun conseil juridique ni destruction de documents.':'Un support de livre pliant en bois pour poser un ouvrage ouvert sur une table et le ranger après lecture.';p.product.facts=[{key:'limite',label:services?'Livrable':'Matière',value:services?'Index des dossiers remis au client':'Bois de hêtre',status:'confirmed',source:'user'}];saveProduct(f.pid,p.product);
 if(services){p.services.services=[{key:'inventaire',name:'Inventaire des dossiers',description:'Repérer et lister les dossiers papier fournis.',price:'Sur devis',duration:''},{key:'index',name:'Index de classement',description:'Remettre un index structuré sans détruire les originaux.',price:'Sur devis',duration:''}];saveServices(f.pid,p.services);}
 const brand={...p.brand!,name:services?'Index Clair Tests':'Page Haute Tests',tagline:services?'Retrouver ses dossiers.':'Une place pour le livre.',story:p.product.summary,positioning:p.product.summary,values:[]};saveBrand(f.pid,brand);run("UPDATE memory SET value=? WHERE project_id=? AND key='shop_copy'",JSON.stringify(localCopy(p.product,brand,loadProject(f.pid))),f.pid);
 const direction=services?'rive':'orbe';
 async function activate(angleId:string){acquiredChoicesForTest(f.pid);const prep=prepareStrategyChange(f.pid,angleId);await prepareStrategyTheme(f.pid,prep.id);for(const c of prep.contents.filter(c=>c.module!=='theme'&&!c.aligned&&!c.published))stageStrategyModule(f.pid,prep.id,c.module,{contentIds:[c.contentId]});activateStrategy(f.pid,{angleId,preparationId:prep.id,idempotencyKey:id(),confirmed:true,commitPrepared:s=>commitPreparedStrategyTheme(f.pid,prep.id,s)});}
 if(!services)await activate('usage');await buildShop(null,f.pid,{direction,useAi:false});const site=currentTheme(f.pid)!;await activate('expression');const after=currentTheme(f.pid)!;
 if(services){expect(after.version.id).toBe(site.version.id);expect(JSON.stringify(after.spec)).toContain('Inventaire des dossiers');expect(JSON.stringify(after.spec)).toContain('Index de classement');}else{expect(after.spec.meta?.strategy?.angleId).toBe('expression');expect(JSON.stringify(after.spec.templates.index)).toContain(activeStrategy(f.pid)!.angle.examples.hero);}
 expect(loadProject(f.pid).product.facts).toEqual(p.product.facts);expect(compileTheme(after.spec).size).toBeGreaterThan(10);expect(all('SELECT id FROM ai_calls WHERE project_id=? AND id NOT GLOB \'fixture_research_*\'',f.pid)).toHaveLength(0);
});
