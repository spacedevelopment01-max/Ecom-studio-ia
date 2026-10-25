/** Cases introduced AFTER application freeze 14a3ef50. No application rule was developed on these names/offers. */
import {it,expect,vi,afterEach} from 'vitest';
import {clientFixture} from './mission154-fixtures';
import {loadProject,saveProduct,saveServices,saveBrand,currentTheme} from '@/lib/projects';
import {localCopy} from '@/lib/engine/local-copy';
import {buildShop} from '@/lib/engine/shop';
import {prepareStrategyChange,activateStrategy,stageStrategyModule,getStrategyState} from '@/lib/marketing-strategy';
import {prepareStrategyTheme,commitPreparedStrategyTheme} from '@/lib/theme/strategy-transition';
import {createPlanV2} from '@/lib/social-v2/planner';
import {compileTheme} from '@/lib/theme/compile';
import {run,all,id} from '@/lib/db';
afterEach(()=>vi.unstubAllGlobals());
it.each([false,true])('validation tenue à part : réparation vélo / entretien de vergers, service=%s',async services=>{
 vi.stubGlobal('fetch',async()=>{throw Error('Supplier transport prohibited');});
 const f=await clientFixture({services,strategy:null,copySource:'ai',incomplete:true}),project=loadProject(f.pid);
 run("UPDATE assets SET deleted_at=? WHERE project_id=? AND role!='logo'",Date.now(),f.pid);
 project.product={...project.product,name:services?'Entretien de vergers':'Kit de réparation de chambre à air',summary:services?'Deux prestations séparées : taille des fruitiers et suivi des arrosages, selon les arbres et le terrain fournis par le client. Aucun rendement ni résultat phytosanitaire garanti.':'Un kit de six rustines et un tube de colle pour réparer une chambre à air démontée. Aucun outil ni chambre à air inclus.',category:services?'Entretien de vergers':'Réparation de vélo',price:services?{amount:null,currency:'EUR',status:'unknown'}:{amount:1200,currency:'EUR',status:'confirmed'},facts:[{key:'given',label:services?'Périmètre':'Contenu',value:services?'Prestations établies sur devis après description du verger':'Six rustines et un tube de colle',status:'confirmed',source:'user'}]};saveProduct(f.pid,project.product);
 if(services){project.services={...project.services,services:[{key:'taille',name:'Taille des fruitiers',description:'Définir l’intervention à partir des arbres présents dans le verger.',price:'Sur devis',duration:''},{key:'arrosage',name:'Suivi des arrosages',description:'Examiner l’organisation de l’arrosage avec les informations du terrain.',price:'Sur devis',duration:''}],contactMode:'quote'};saveServices(f.pid,project.services);}
 const brand={...project.brand!,name:services?'Verger Présent Tests':'Roue Réparable Tests',tagline:services?'Des interventions à définir ensemble.':'Le nécessaire pour la chambre à air.',story:project.product.summary,positioning:project.product.summary,values:[]};saveBrand(f.pid,brand);run("UPDATE memory SET value=? WHERE project_id=? AND key='shop_copy'",JSON.stringify(localCopy(project.product,brand,loadProject(f.pid))),f.pid);
 async function choose(angleId:string){const prep=prepareStrategyChange(f.pid,angleId);await prepareStrategyTheme(f.pid,prep.id);for(const c of prep.contents.filter(c=>c.module!=='theme'&&!c.aligned&&!c.published))stageStrategyModule(f.pid,prep.id,c.module,{contentIds:[c.contentId]});activateStrategy(f.pid,{angleId,preparationId:prep.id,idempotencyKey:id(),confirmed:true,commitPrepared:s=>commitPreparedStrategyTheme(f.pid,prep.id,s)});}
 if(!services)await choose('usage');await buildShop(null,f.pid,{direction:services?'rive':'souple',useAi:false});const before=currentTheme(f.pid)!;
 if(services)expect(getStrategyState(f.pid).usedAngleIds).toEqual([]);
 await choose('expression');const after=currentTheme(f.pid)!;
 if(services){expect(after.version.id).toBe(before.version.id);expect(JSON.stringify(after.spec)).toContain('Taille des fruitiers');expect(JSON.stringify(after.spec)).toContain('Suivi des arrosages');createPlanV2(loadProject(f.pid),{angleId:'expression',startDate:new Date(Date.now()+86400000).toISOString().slice(0,10),days:1,perDay:1,timezone:'UTC',platforms:[{platform:'instagram'}]});}
 else expect(after.spec.meta?.strategy?.angleId).toBe('expression');
 expect(loadProject(f.pid).product.facts).toEqual(project.product.facts);expect(compileTheme(after.spec).size).toBeGreaterThan(10);expect(after.spec.meta?.adaptation?.status).toBe('partial');expect(all('SELECT id FROM ai_calls WHERE project_id=?',f.pid)).toHaveLength(0);
});
