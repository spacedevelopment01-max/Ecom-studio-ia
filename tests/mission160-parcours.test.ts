/** Real engines and persistence, isolated accounts/media; suppliers forbidden. */
import { it, expect, beforeEach, afterEach, vi } from 'vitest';
import { clientFixture } from './mission154-fixtures';
import { activeStrategy, prepareStrategyChange, activateStrategy, stageStrategyModule, getStrategyState } from '@/lib/marketing-strategy';
import { prepareStrategyTheme, commitPreparedStrategyTheme } from '@/lib/theme/strategy-transition';
import { buildShop } from '@/lib/engine/shop';
import { currentTheme, loadProject, saveThemeVersion, listThemeVersions } from '@/lib/projects';
import { one, all, run } from '@/lib/db';
import { compileTheme } from '@/lib/theme/compile';
import { applyOps } from '@/lib/theme/ops';
import { enqueue, claimNext, JobContext } from '@/lib/jobs';
import { handlers } from '../worker/handlers';
import { runWithLang } from '@/lib/i18n-server';
const fr=<T,>(fn:()=>T)=>runWithLang({ui:'fr',content:'fr'},fn);
async function choose(pid:string,angleId:string){const prep=prepareStrategyChange(pid,angleId);await prepareStrategyTheme(pid,prep.id);for(const c of prep.contents.filter(c=>c.module!=='theme'&&!c.aligned&&!c.published))stageStrategyModule(pid,prep.id,c.module,{contentIds:[c.contentId]});return activateStrategy(pid,{angleId,preparationId:prep.id,idempotencyKey:`test-${prep.id}`,confirmed:true,commitPrepared:s=>commitPreparedStrategyTheme(pid,prep.id,s)});}
beforeEach(()=>vi.stubGlobal('fetch',async()=>{throw Error('Supplier forbidden in mission160');}));afterEach(()=>vi.unstubAllGlobals());
it('aucune construction avant choix, cartes consultées sans consommation ni tâche',async()=>{
 const f=await clientFixture({copySource:"ai",strategy:null,incomplete:true});expect(getStrategyState(f.pid).angles).toHaveLength(5);
 expect(activeStrategy(f.pid)).toBeNull();expect(getStrategyState(f.pid).usedAngleIds).toEqual([]);
 await expect(fr(()=>buildShop(null,f.pid,{direction:'traverse',useAi:false}))).rejects.toMatchObject({code:'strategy_choice_required'});
 expect(currentTheme(f.pid)).toBeNull();expect(all('SELECT id FROM ai_calls WHERE project_id=? AND id NOT GLOB \'fixture_research_*\'',f.pid)).toHaveLength(0);
 await choose(f.pid,'usage');await fr(()=>buildShop(null,f.pid,{direction:'traverse',useAi:false}));expect(currentTheme(f.pid)?.spec.meta?.strategy?.angleId).toBe('usage');
});
for(const services of [false,true])it(`parcours ${services?'service RDV':'produit'} : angle A→B→A, copie/faits/retouches/pages/export persistants sans appel`,async()=>{
 const f=await clientFixture({services,copySource:"ai",strategy:null}),direction=services?'rive':'traverse';
 const identity=loadProject(f.pid).brand;
 await choose(f.pid,'usage');await fr(()=>buildShop(null,f.pid,{direction,useAi:false}));
 const first=currentTheme(f.pid)!;const hero=first.spec.templates.index.order[0];
 const edited=applyOps(first.spec,[{op:'set_setting',template:'index',section:hero,key:'heading',value:'Mon titre conservé mot pour mot'}]);
 saveThemeVersion(f.pid,edited.spec,'Retouche fictive protégée','user');
 await choose(f.pid,'expression');const b=currentTheme(f.pid)!;
 expect(activeStrategy(f.pid)?.angleId).toBe('expression');expect(b.spec.templates.index.sections[hero].settings.heading).toBe('Mon titre conservé mot pour mot');
 if(services){expect(b.version.id).toBe(currentTheme(f.pid)!.version.id);expect(b.spec.meta?.strategy).toBeUndefined();}else expect(JSON.stringify(b.spec)).toContain('expression');if(!services)expect(JSON.stringify(b.spec.templates)).not.toBe(JSON.stringify(first.spec.templates));
 expect(loadProject(f.pid).brand).toEqual(identity);expect(b.spec.store.product.title).toBe(f.project.product.name);
 const files=compileTheme(b.spec);expect([...files.keys()].some(k=>k.startsWith('templates/'))).toBe(true);
 expect(JSON.stringify([...files])).toContain('Mon titre conservé mot pour mot');
 await choose(f.pid,'usage');expect(activeStrategy(f.pid)?.angleId).toBe('usage');
 expect(getStrategyState(f.pid).usedAngleIds.sort()).toEqual(['expression','usage']);
 const before=listThemeVersions(f.pid).length;await fr(()=>buildShop(null,f.pid,{direction,useAi:false}));expect(listThemeVersions(f.pid)).toHaveLength(before);
 expect(one<{n:number}>('SELECT COUNT(*) n FROM ai_calls WHERE project_id=? AND id NOT GLOB \'fixture_research_*\'',f.pid)?.n).toBe(0);
});
it('tâche préparée avant bascule refusée avant fournisseur ; changement de droits reste revérifié',async()=>{
 const f=await clientFixture({copySource:"ai",strategy:null});await choose(f.pid,'usage');
 const job=enqueue({userId:f.user.id,projectId:f.pid,type:'shop.direction',payload:{projectId:f.pid,direction:'traverse'}});
 await choose(f.pid,'expression');
 await expect(handlers[job.type](new JobContext(job))).rejects.toMatchObject({code:'strategy_changed'});
 expect(currentTheme(f.pid)).toBeNull();expect(all('SELECT id FROM ai_calls WHERE project_id=? AND id NOT GLOB \'fixture_research_*\'',f.pid)).toHaveLength(0);
});

it('retour vers un angle : version de thème compatible réutilisée sans mutation de sa provenance ni nouvelle version',async()=>{
 const f=await clientFixture({copySource:"ai",strategy:null});await choose(f.pid,'usage');await fr(()=>buildShop(null,f.pid,{direction:'traverse',useAi:false}));const a=currentTheme(f.pid)!;
 await choose(f.pid,'expression');const n=listThemeVersions(f.pid).length;await choose(f.pid,'usage');
 expect(currentTheme(f.pid)?.version.id).toBe(a.version.id);expect(listThemeVersions(f.pid)).toHaveLength(n);expect(currentTheme(f.pid)?.spec.meta?.strategy?.id).toBe(a.spec.meta?.strategy?.id);
});

it('une rédaction explicitement fournie par le client reste intégrale et signalée comme protégée',async()=>{
 const f=await clientFixture({strategy:null,copySource:'user'});const original=f.copy.hero.heading;const prep=prepareStrategyChange(f.pid,'expression');
 activateStrategy(f.pid,{angleId:'expression',preparationId:prep.id,idempotencyKey:`manual-${prep.id}`,confirmed:true,retainUnaligned:true});
 await fr(()=>buildShop(null,f.pid,{direction:'traverse',useAi:false}));const spec=currentTheme(f.pid)!.spec;
 expect(JSON.stringify(spec.templates.index)).toContain(original);expect(spec.meta?.strategy?.retainedPaths).toContain('upstream:shop_copy');expect(getStrategyState(f.pid).alignment.some(c=>c.module==='theme'&&!c.aligned)).toBe(true);
});

it('les documents automatiques ne passent pas devant une rédaction exacte fournie par le client',async()=>{
 const f=await clientFixture({copySource:'user'});const {runContentEngineV2}=await import('@/lib/seo-v2/engine');const {localOnlyDeps}=await import('@/lib/seo-v2/deps');
 await runContentEngineV2(null,f.pid,{type:'home_page',lang:'fr'},localOnlyDeps());await fr(()=>buildShop(null,f.pid,{direction:'traverse',useAi:false}));
 expect(JSON.stringify(currentTheme(f.pid)!.spec.templates.index)).toContain(f.copy.hero.heading);expect(all('SELECT id FROM ai_calls WHERE project_id=? AND id NOT GLOB \'fixture_research_*\'',f.pid)).toHaveLength(0);
});
