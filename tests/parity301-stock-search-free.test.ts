/** #301 : la recherche stock gratuite conserve route/worker/barrières natifs, sans fournisseur IA. */
import {afterEach,expect,it,vi}from'vitest';
import {createHash}from'node:crypto';
const fixture=vi.hoisted(()=>({user:null as any,deps:null as any,active:[]as boolean[]}));
vi.mock('@/lib/auth',async o=>({...await o<any>(),requireUser:async()=>fixture.user,currentUser:async()=>fixture.user}));
vi.mock('@/lib/image-v2/deps',async o=>({...await o<any>(),realImageDeps:(_p:unknown,b:{aiActive:boolean})=>{fixture.active.push(b.aiActive);return{...fixture.deps,canReview:b.aiActive&&fixture.deps.canReview,canGenerate:b.aiActive&&fixture.deps.canGenerate};}}));
import{createUser}from'@/lib/auth';import{POST,GET}from'@/app/api/projects/[id]/images/v2/route';import{seedImageFixture}from'./image-v2-fixtures';import{grantProjectPlan}from'@/lib/project-subscriptions';import{projectAccountKey}from'@/lib/project-billing';import{candidate,mockDeps,mockProvider}from'./image-v2-mock';import{PIXABAY_LICENSE}from'@/lib/image-v2/sources';import{all,one,run}from'@/lib/db';import{claimNext,JobContext,completeJob,getJob}from'@/lib/jobs';import{handlers}from'../worker/handlers';import{activeStrategy}from'@/lib/marketing-strategy';import{runForUser}from'@/lib/ai/access';import{withTrace}from'@/lib/ai/trace';import{getAsset,assetData}from'@/lib/library';
afterEach(()=>{run("UPDATE jobs SET status='cancelled' WHERE status IN ('queued','running')");vi.unstubAllGlobals();fixture.active=[];});
async function setup(options:{admin?:boolean;empty?:boolean;paid?:boolean;people?:boolean}={}){
 vi.stubGlobal('fetch',vi.fn(()=>{throw Error('Aucun HTTP réel dans cette recette');}));
 const u=await createUser(`stock301-${crypto.randomUUID()}@example.invalid`,'fictif-seulement','Stock fictif');if(options.admin)run("UPDATE users SET role='admin' WHERE id=?",u.id);fixture.user={...u,role:options.admin?'admin':'client'};
 const pid=seedImageFixture(u.id,'artisan');if(options.paid!==false)grantProjectPlan(pid,'dominer');activeStrategy(pid);
 if(options.empty)run('UPDATE wallets SET monthly_used=monthly_allowance,topup_balance=0 WHERE user_id=?',projectAccountKey(pid));
 const counters={review:0,generate:0},fake=mockDeps({providers:[mockProvider('pixabay',()=>[candidate('cle-stock301',options.people?'man face portrait person escape game':'old key escape game padlock mystery',{source:'pixabay',license:PIXABAY_LICENSE})])],canGenerate:true,canReview:true,reviewFor:()=>{counters.review++;throw Error('Aucune relecture IA sans devis');},generate:async()=>{counters.generate++;throw Error('Aucune génération dans une recherche stock');}});fixture.deps=fake.deps;
 const post=(body:unknown,target=pid)=>POST(new Request(`http://localhost/api/projects/${target}/images/v2`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}),{params:Promise.resolve({id:target})});
 const body={action:'generate',operationId:crypto.randomUUID(),aiOff:false,costCapMicro:Number.MAX_SAFE_INTEGER,request:{kind:'stock_photo',aspect:'16:9',topic:'escape game',count:1,allowGenerate:false,broad:true}};
 return{u,pid,counters,fake,post,body};
}
it.each([{name:'client budget actif'},{name:'client budget épuisé',empty:true},{name:'admin budget épuisé',admin:true,empty:true}])('$name : photo, licence et empreinte rechargées, zéro relecture/génération IA',async options=>{
 const f=await setup(options),wallet=all('SELECT * FROM wallets WHERE user_id=?',projectAccountKey(f.pid)),response=await f.post(f.body);expect(response.status).toBe(200);const job=claimNext(['image.v2'])!;expect(job.id).toBe((await response.json()).jobId);const payload=JSON.parse(job.payload);expect(payload.aiOff).toBe(true);expect(payload.costCapMicro).toBe(0);expect(payload.request.allowGenerate).toBe(false);
 const result=await runForUser(f.u.id,()=>withTrace({jobId:job.id,projectId:f.pid,costCapMicro:0},()=>handlers['image.v2'](new JobContext(job))),'normal',f.pid)as any;completeJob(job.id,result);
 expect(fixture.active).toEqual([false]);expect(f.counters).toEqual({review:0,generate:0});expect(result.outcomes).toHaveLength(1);expect(result.outcomes[0]).toMatchObject({verdict:'PROVISIONAL',origin:'stock'});expect(result.delivery.state).toBe('review');expect(result.delivery.message).toMatch(/sans.*IA/);
 const aid=result.outcomes[0].assetId,a=getAsset(aid)!,meta=JSON.parse(a.meta),hash=createHash('sha256').update(assetData(a)).digest('hex');expect(meta.imageV2.license.name).toBe(PIXABAY_LICENSE.name);expect(meta.stock).toMatchObject({source:'pixabay',id:'cle-stock301',license:PIXABAY_LICENSE.name});expect(meta.gate.verdict).toBe('PROVISIONAL');expect(meta.gate.provisional.use).toBe('auto');
 expect(one<{checker:string}>('SELECT checker FROM quality_checks WHERE id=?',meta.gate.checkId)?.checker).toBe('metadata');
 const reload=await GET(new Request(`http://localhost/api/projects/${f.pid}/images/v2`),{params:Promise.resolve({id:f.pid})});expect(reload.status).toBe(200);expect((await reload.json()).images.find((x:any)=>x.id===aid)).toMatchObject({verdict:'PROVISIONAL',license:{name:PIXABAY_LICENSE.name}});expect(JSON.parse(getJob(job.id)!.result!).outcomes[0].assetId).toBe(aid);expect(createHash('sha256').update(assetData(getAsset(aid)!)).digest('hex')).toBe(hash);
 expect(all('SELECT * FROM wallets WHERE user_id=?',projectAccountKey(f.pid))).toEqual(wallet);expect(one<{n:number}>('SELECT COUNT(*) n FROM ai_calls')!.n).toBe(0);expect(one<{n:number}>('SELECT COUNT(*) n FROM usage_events')!.n).toBe(0);expect(fetch).not.toHaveBeenCalled();
});
it('le worker désactive lui-même l’IA pour la recherche stock même si le payload aiOff et le plafond sont falsifiés',async()=>{
 const f=await setup(),response=await f.post(f.body);expect(response.status).toBe(200);const job=claimNext(['image.v2'])!,forged={...JSON.parse(job.payload),aiOff:false,costCapMicro:Number.MAX_SAFE_INTEGER};
 const result=await runForUser(f.u.id,()=>withTrace({jobId:job.id,projectId:f.pid,costCapMicro:Number.MAX_SAFE_INTEGER},()=>handlers['image.v2'](new JobContext({...job,payload:JSON.stringify(forged)}))),'normal',f.pid)as any;
 expect(fixture.active).toEqual([false]);expect(f.counters).toEqual({review:0,generate:0});expect(result.outcomes[0].verdict).toBe('PROVISIONAL');expect(fetch).not.toHaveBeenCalled();
});
it.each([false,true])('découverte / admin=%s : refus natif forfait inchangé, sans fuite ni dépense',async admin=>{
 const f=await setup({paid:false,admin}),response=await f.post(f.body);expect(response.status).toBe(402);expect(all('SELECT id FROM jobs WHERE project_id=?',f.pid)).toHaveLength(0);expect(f.counters).toEqual({review:0,generate:0});expect(fetch).not.toHaveBeenCalled();
});
it('une personne interdite reste refusée sans recours à une IA payante ni image de remplacement',async()=>{
 const f=await setup({people:true});expect((await f.post(f.body)).status).toBe(200);const job=claimNext(['image.v2'])!;
 await expect(runForUser(f.u.id,()=>handlers['image.v2'](new JobContext(job)),'normal',f.pid)).rejects.toThrow(/personnes|people/);expect(f.counters).toEqual({review:0,generate:0});expect(all('SELECT id FROM assets WHERE project_id=?',f.pid)).toHaveLength(0);expect(fetch).not.toHaveBeenCalled();
});
it('un autre compte n’accède ni à la recherche ni aux photos du projet',async()=>{
 const f=await setup(),other=await createUser(`stock301-foreign-${crypto.randomUUID()}@example.invalid`,'fictif-seulement','Autre');fixture.user={...other,role:'client'};expect((await f.post(f.body)).status).toBe(404);expect(all('SELECT id FROM jobs WHERE project_id=?',f.pid)).toHaveLength(0);expect(fetch).not.toHaveBeenCalled();
});
