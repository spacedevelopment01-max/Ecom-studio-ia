/** Native queue, quotas, caps and staging; execution transport below is explicitly simulated. */
import {it,expect,vi,afterEach} from 'vitest';
import sharp from 'sharp';
import {clientFixture} from './mission154-fixtures';
import {quoteStrategyBundle,confirmStrategyBundle,runStrategyBundle,retryStrategyBundle,strategyBundle} from '@/lib/marketing-strategy/bundle';
import {prepareStrategyChange,stageStrategyModule,activateStrategy,activeStrategy,getStrategyState} from '@/lib/marketing-strategy';
import {saveAsset} from '@/lib/library';
import {all,one,run,id,now} from '@/lib/db';
import {claimNext,JobContext,completeJob,failJob,getJob} from '@/lib/jobs';
import {grantProjectPlan} from '@/lib/project-subscriptions';
import {CostCapReached} from '@/lib/ai/trace';
async function fixture(services=false){
 const f=await clientFixture({services,copySource:'ai',incomplete:true});
 const data=await sharp({create:{width:80,height:80,channels:3,background:'#967858'}}).jpeg().toBuffer();
 const old=await Promise.all(['lifestyle','detail'].map(role=>saveAsset({projectId:f.pid,userId:f.user.id,name:role+'.jpg',mime:'image/jpeg',data,role,origin:'generated'})));
 const prep=prepareStrategyChange(f.pid,'expression');for(const c of prep.contents.filter(c=>!old.some(a=>a.id===c.contentId)))stageStrategyModule(f.pid,prep.id,c.module,{contentIds:[],retainedContentIds:[c.contentId]});
 return{...f,old,prep,data};
}
afterEach(()=>vi.unstubAllGlobals());
it.each([false,true])('un devis, une tâche, deux versions acquises avant activation, produit/service=%s',async services=>{
 vi.stubGlobal('fetch',async()=>{throw Error('Fournisseur réel interdit');});const f=await fixture(services),a=activeStrategy(f.pid)!;
 const quote=quoteStrategyBundle(f.pid,f.prep.id,f.old.map(x=>({module:'asset',contentId:x.id})));expect(quote.estimateMicro).toBeGreaterThan(0);expect(quote.status).toBe('quoted');expect(all('SELECT id FROM jobs WHERE project_id=?',f.pid)).toHaveLength(0);
 const [b1,b2]=await Promise.all([Promise.resolve(confirmStrategyBundle(f.pid,quote.id,true)),Promise.resolve(confirmStrategyBundle(f.pid,quote.id,true))]);expect(b1.jobId).toBe(b2.jobId);expect(all('SELECT id FROM jobs WHERE project_id=?',f.pid)).toHaveLength(1);
 expect(()=>activateStrategy(f.pid,{angleId:'expression',preparationId:f.prep.id,idempotencyKey:id(),confirmed:true})).toThrow();
 const job=claimNext(['strategy.prepare'])!;expect(job.id).toBe(b1.jobId);let calls=0;
 const r=await runStrategyBundle(new JobContext(job),async()=>{calls++;const asset=await saveAsset({projectId:f.pid,userId:f.user.id,name:'new.jpg',mime:'image/jpeg',data:f.data,role:'lifestyle',origin:'generated'});return{outputIds:[asset.id],links:[`/api/files/${asset.id}`],note:'Simulation native : média fictif pour la recette'};});
 expect(calls).toBe(2);expect(r.bundle.status).toBe('prepared');expect(activeStrategy(f.pid)?.id).toBe(a.id);expect(getStrategyState(f.pid).alignment.filter(c=>r.bundle.items.some(i=>i.outputIds?.includes(c.contentId)))).toHaveLength(0);
 completeJob(job.id,r);activateStrategy(f.pid,{angleId:'expression',preparationId:f.prep.id,idempotencyKey:id(),confirmed:true});expect(activeStrategy(f.pid)?.angleId).toBe('expression');
 expect(getStrategyState(f.pid).alignment.filter(c=>r.bundle.items.some(i=>i.outputIds?.includes(c.contentId))).every(c=>c.aligned)).toBe(true);
 expect(all('SELECT id FROM ai_calls WHERE project_id=?',f.pid)).toHaveLength(0);
});
it('échec au second élément : ancien ensemble actif, premier acquis réutilisé, une seule reprise explicite',async()=>{
 const f=await fixture();const a=activeStrategy(f.pid)!;const q=quoteStrategyBundle(f.pid,f.prep.id,f.old.map(x=>({module:'asset',contentId:x.id})));const b=confirmStrategyBundle(f.pid,q.id,true);const job=claimNext(['strategy.prepare'])!;
 const calls:string[]=[];const execute=async(_ctx:JobContext,item:any)=>{calls.push(item.oldId);if(calls.length===2)throw new CostCapReached(q.capMicro,1,q.capMicro);const asset=await saveAsset({projectId:f.pid,userId:f.user.id,name:'prepared.jpg',mime:'image/jpeg',data:f.data,role:'lifestyle',origin:'generated'});return{outputIds:[asset.id],links:[],note:'simulation'};};
 const error=await runStrategyBundle(new JobContext(job),execute).catch(e=>e);expect(error).toBeInstanceOf(CostCapReached);failJob(job,error,{permanent:true});
 expect(activeStrategy(f.pid)?.id).toBe(a.id);expect(strategyBundle(f.pid,b.id).items[0].state).toBe('prepared');
 retryStrategyBundle(f.pid,b.id,true);const retried=claimNext(['strategy.prepare'])!;const result=await runStrategyBundle(new JobContext(retried),execute);completeJob(retried.id,result);
 expect(calls.filter(x=>x===f.old[0].id)).toHaveLength(1);expect(calls.filter(x=>x===f.old[1].id)).toHaveLength(2);expect(result.bundle.capMicro).toBe(q.capMicro);
 run("UPDATE jobs SET status='failed' WHERE id=?",retried.id);expect(()=>retryStrategyBundle(f.pid,b.id,true)).toThrow('épuisée');
});
it('plafond global atteint : aucun exécuteur appelé, aucune bascule ni contournement du budget',async()=>{
 const f=await fixture();const q=quoteStrategyBundle(f.pid,f.prep.id,f.old.map(x=>({module:'asset',contentId:x.id})));const b=confirmStrategyBundle(f.pid,q.id,true);const job=claimNext(['strategy.prepare'])!;
 run('INSERT INTO ai_calls(id,created_at,user_id,project_id,job_id,task,provider,requested_model,unit,cost,status) VALUES(?,?,?,?,?,?,?,?,?,?,?)',id(),now(),f.user.id,f.pid,job.id,'test','simulation','test','request',q.capMicro,'ok');
 const execute=vi.fn();await expect(runStrategyBundle(new JobContext(job),execute)).rejects.toBeInstanceOf(CostCapReached);expect(execute).not.toHaveBeenCalled();expect(activeStrategy(f.pid)?.angleId).toBe('generalist');failJob(job,Error('simulation plafond'),{permanent:true});
});
it('baisse de forfait entre devis et worker : angle et module revérifiés avant toute création',async()=>{
 const f=await fixture();const q=quoteStrategyBundle(f.pid,f.prep.id,[{module:'asset',contentId:f.old[0].id}]);confirmStrategyBundle(f.pid,q.id,true);const job=claimNext(['strategy.prepare'])!;grantProjectPlan(f.pid,'creer');const execute=vi.fn();
 await expect(runStrategyBundle(new JobContext(job),execute)).rejects.toMatchObject({code:'strategy_angle_limit'});expect(execute).not.toHaveBeenCalled();failJob(job,Error('simulation droits'),{permanent:true});expect(strategyBundle(f.pid,q.id).status).toBe('failed');
});
it('archives, retouches et autre compte : aucune inclusion abusive dans un devis',async()=>{
 const f=await fixture();const g=await fixture();const uploaded=one<any>("SELECT id FROM assets WHERE project_id=? AND origin='upload' AND role!='original'",f.pid);
 if(uploaded)expect(()=>quoteStrategyBundle(f.pid,f.prep.id,[{module:'asset',contentId:uploaded.id}])).toThrow();
 const q=quoteStrategyBundle(f.pid,f.prep.id,[{module:'asset',contentId:f.old[0].id}]);expect(()=>confirmStrategyBundle(g.pid,q.id,true)).toThrow('introuvable');expect(all('SELECT id FROM jobs WHERE project_id=?',g.pid)).toHaveLength(0);
});
