/** #301 : route, devis/HMAC, jobs, handler et acquis réels ; seules les dépendances fournisseur sont simulées. */
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const session=vi.hoisted(()=>({user:null as any,deps:null as any}));
vi.mock('@/lib/auth',async orig=>({...await orig<any>(),requireUser:async()=>session.user,currentUser:async()=>session.user}));
vi.mock('@/lib/ai/config',async orig=>({...await orig<any>(),activeProviderKey:vi.fn(()=> 'FAUX FOURNISSEUR DE TEST')}));
vi.mock('@/lib/image-v2/deps',async orig=>({...await orig<any>(),realImageDeps:()=>session.deps}));
import {createUser} from '@/lib/auth';
import {grantProjectPlan} from '@/lib/project-subscriptions';
import {all,one,run,id,now} from '@/lib/db';
import {POST} from '@/app/api/projects/[id]/images/v2/route';
import {seedImageFixture,seedCutout} from './image-v2-fixtures';
import {mockDeps,review,mockImage} from './image-v2-mock';
import {claimNext,JobContext,completeJob,getJob} from '@/lib/jobs';
import {handlers} from '../worker/handlers';
import {runForUser} from '@/lib/ai/access';
import {withTrace,assertUnderCostCap,currentTrace} from '@/lib/ai/trace';
import {runNativeImageGeneration} from '@/lib/image-v2/native-approval';
import {activeStrategy} from '@/lib/marketing-strategy';
import {setJsonSetting} from '@/lib/settings';
import {MEDIA_MODELS} from '@/lib/ai/media-models';
import {activeProviderKey} from '@/lib/ai/config';
import {projectAccountKey} from '@/lib/project-billing';
import {getAsset,assetData} from '@/lib/library';
beforeEach(()=>{vi.stubGlobal('fetch',vi.fn(()=>{throw Error('HTTP fournisseur interdit');}));vi.mocked(activeProviderKey).mockReturnValue('FAUX FOURNISSEUR DE TEST');setJsonSetting('billing.markup',1);setJsonSetting('ai.media.models',Object.fromEntries(MEDIA_MODELS.filter(m=>m.kind==='image').map(m=>[`${m.provider}:${m.model}`,{enabled:true,confirmedAt:Date.now()}])));});
afterEach(()=>{run("UPDATE jobs SET status='cancelled' WHERE status IN ('queued','running')");vi.useRealTimers();vi.unstubAllGlobals();});
async function fixture(kind:'restaurant'|'hightech'='restaurant'){
 const u=await createUser(`parity301-consent-${crypto.randomUUID()}@example.invalid`,'test-fictif-seulement','Fictif');session.user={...u,role:'client'};
 const pid=seedImageFixture(u.id,kind);grantProjectPlan(pid,'dominer');activeStrategy(pid);
 const operationId=crypto.randomUUID(),request={kind:'ambiance',aspect:'4:5',count:1,allowGenerate:true};
 const post=(body:unknown,target=pid)=>POST(new Request(`http://localhost/api/projects/${target}/images/v2`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}),{params:Promise.resolve({id:target})});
 const quote=async()=>{const r=await post({action:'quote',operationId,request});expect(r.status,await r.clone().text()).toBe(200);return await r.json();};
 const confirm=(q:any,extra:Record<string,unknown>={})=>post({action:'generate',operationId,request,approvalToken:q.approvalToken,confirmation:true,...extra});
 return{u,pid,operationId,request,post,quote,confirm};
}
it('refuse la génération sans devis ni confirmation, sans tâche ni fournisseur',async()=>{
 const f=await fixture();for(const data of [{action:'generate',operationId:f.operationId,request:f.request},{action:'generate',operationId:f.operationId,request:f.request,confirmation:true,approvalToken:'forgé'}])expect((await f.post(data)).status).toBe(409);
 expect(all('SELECT id FROM jobs WHERE project_id=?',f.pid)).toHaveLength(0);expect(fetch).not.toHaveBeenCalled();
});
it('devis sans dépense puis confirmation exacte, double envoi et réponse perdue : un seul job borné',async()=>{
 const f=await fixture(),q=await f.quote();expect(q.maximumMicro).toBeGreaterThan(0);expect(q.maximumCalls).toBe(2);expect(all('SELECT id FROM jobs WHERE project_id=?',f.pid)).toHaveLength(0);
 expect((await f.confirm(q,{confirmation:false})).status).toBe(409);
 const a=await f.confirm(q),b=await f.confirm(q);expect(a.status).toBe(200);expect(b.status).toBe(200);const jobId=(await a.json()).jobId;expect((await b.json()).jobId).toBe(jobId);
 const row=getJob(jobId)!;expect(row.max_attempts).toBe(1);expect(JSON.parse(row.payload).costCapMicro).toBe(q.maximumMicro);expect(all('SELECT id FROM jobs WHERE project_id=?',f.pid)).toHaveLength(1);
 expect((await f.quote()).jobId).toBe(jobId);expect(one<{n:number}>('SELECT COUNT(*) n FROM ai_calls')!.n).toBe(0);expect(fetch).not.toHaveBeenCalled();
});
it('refuse demande, projet, tarif ou contexte modifiés avant la mise en file',async()=>{
 const f=await fixture(),q=await f.quote();expect((await f.confirm(q,{request:{...f.request,count:2}})).status).toBe(409);
 const other=seedImageFixture(f.u.id,'restaurant');grantProjectPlan(other,'dominer');expect((await f.post({action:'generate',operationId:f.operationId,request:f.request,approvalToken:q.approvalToken,confirmation:true},other)).status).toBe(409);
 setJsonSetting('billing.markup',2);expect((await f.confirm(q)).status).toBe(409);setJsonSetting('billing.markup',1);
 run("UPDATE projects SET product_json=json_set(product_json,'$.name','Autre contexte fictif') WHERE id=?",f.pid);expect((await f.confirm(q)).status).toBe(409);
 expect(all('SELECT id FROM jobs WHERE project_id=?',f.pid)).toHaveLength(0);expect(fetch).not.toHaveBeenCalled();
});
it('un devis expiré ou un budget épuisé ne crée aucune tâche',async()=>{
 const f=await fixture(),q=await f.quote();vi.useFakeTimers();vi.setSystemTime(Date.now()+16*60000);expect((await f.confirm(q)).status).toBe(409);vi.useRealTimers();
 const g=await fixture(),r=await g.quote();run('UPDATE wallets SET monthly_used=monthly_allowance WHERE user_id=?',projectAccountKey(g.pid));const denied=await g.confirm(r);expect(denied.status).toBe(422);expect((await denied.json()).error).toMatch(/budget|IA/);expect(all('SELECT id FROM jobs WHERE project_id=?',g.pid)).toHaveLength(0);expect(fetch).not.toHaveBeenCalled();
});
it('la recherche gratuite reste disponible sans devis',async()=>{
 const f=await fixture(),r=await f.post({action:'generate',request:{...f.request,allowGenerate:false}});expect(r.status).toBe(200);const payload=JSON.parse(getJob((await r.json()).jobId)!.payload);expect(payload.request.allowGenerate).toBe(false);expect(payload.nativeImageQuote).toBeUndefined();expect(fetch).not.toHaveBeenCalled();
});
it('confirme puis exécute le vrai handler avec fichiers acquis ; réemploi sans clé ni budget',async()=>{
 const f=await fixture(),q=await f.quote(),r=await f.confirm(q);expect(r.status).toBe(200);const job=claimNext(['image.v2'])!;expect(job.id).toBe((await r.json()).jobId);
 const fake=mockDeps({reviewFor:()=>review(9)});session.deps=fake.deps;
 const result=await runForUser(f.u.id,()=>withTrace({jobId:job.id,projectId:f.pid,costCapMicro:JSON.parse(job.payload).costCapMicro},()=>handlers['image.v2'](new JobContext(job))),'normal',f.pid)as any;completeJob(job.id,result);
 expect(fake.log.generations).toHaveLength(1);expect(fake.log.reviews).toHaveLength(1);expect(result.outcomes).toHaveLength(1);const asset=getAsset(result.outcomes[0].assetId)!;expect(assetData(asset).length).toBeGreaterThan(0);expect(asset.version).toBe(1);
 expect((await f.confirm(q)).status).toBe(200);expect(all('SELECT id FROM jobs WHERE project_id=?',f.pid)).toHaveLength(1);
 vi.mocked(activeProviderKey).mockReturnValue(null);run('UPDATE wallets SET monthly_used=monthly_allowance WHERE user_id=?',projectAccountKey(f.pid));
 setJsonSetting('billing.markup',2);const acquiredOnly=mockDeps({generate:async()=>{throw Error('Checkpoint acquis : aucun fournisseur');}}),recovered=await runNativeImageGeneration(new JobContext(getJob(job.id)!),acquiredOnly.deps);expect(recovered.outcomes[0].assetId).toBe(asset.id);expect(acquiredOnly.log.generations).toHaveLength(0);expect(acquiredOnly.log.reviews).toHaveLength(0);setJsonSetting('billing.markup',1);
 const operationId=crypto.randomUUID(),reuseResponse=await f.post({action:'quote',operationId,request:f.request});expect(reuseResponse.status,await reuseResponse.clone().text()).toBe(200);const reuse=await reuseResponse.json();expect(reuse.maximumMicro).toBe(0);expect(reuse.maximumCalls).toBe(0);expect(reuse.reused).toBe(1);
 expect((await f.post({action:'generate',operationId,request:f.request,approvalToken:reuse.approvalToken,confirmation:true})).status).toBe(200);
 const next=claimNext(['image.v2'])!,second=mockDeps({generate:async()=>{throw Error('Réemploi : aucune génération permise');}});session.deps=second.deps;
 const reused=await runForUser(f.u.id,()=>handlers['image.v2'](new JobContext(next)),'normal',f.pid)as any;expect(reused.outcomes[0].assetId).toBe(asset.id);expect(second.log.generations).toHaveLength(0);expect(second.log.reviews).toHaveLength(0);expect(fetch).not.toHaveBeenCalled();expect(one<{n:number}>('SELECT COUNT(*) n FROM ai_calls')!.n).toBe(0);
});
it('revérifie le forfait et le contexte au worker, avant toute génération',async()=>{
 const f=await fixture(),q=await f.quote();await f.confirm(q);const job=claimNext(['image.v2'])!,fake=mockDeps({generate:async()=>{throw Error('Aucun fournisseur permis');}});session.deps=fake.deps;
 run("UPDATE subscriptions SET status='cancelled' WHERE project_id=?",f.pid);await expect(runNativeImageGeneration(new JobContext(job),fake.deps)).rejects.toThrow('forfait');expect(fake.log.generations).toHaveLength(0);
 const g=await fixture(),r=await g.quote();await g.confirm(r);const next=claimNext(['image.v2'])!;run("UPDATE projects SET product_json=json_set(product_json,'$.name','Autre contexte') WHERE id=?",g.pid);await expect(runNativeImageGeneration(new JobContext(next),fake.deps)).rejects.toThrow('références');expect(fake.log.generations).toHaveLength(0);expect(fetch).not.toHaveBeenCalled();
});
it('le plafond signé reste actif même si le payload tente de l’augmenter ; aucune relance après arrêt',async()=>{
 const f=await fixture(),q=await f.quote();await f.confirm(q);const job=claimNext(['image.v2'])!,ctx=new JobContext({...job,payload:JSON.stringify({...JSON.parse(job.payload),costCapMicro:Number.MAX_SAFE_INTEGER})}),caps:number[]=[];
 const fake=mockDeps({generate:async()=>{caps.push(currentTrace().costCapMicro!);assertUnderCostCap(q.maximumMicro+1);throw Error('Jamais atteint');}});
 const result=await runForUser(f.u.id,()=>withTrace({jobId:job.id,projectId:f.pid,costCapMicro:ctx.payload.costCapMicro},()=>runNativeImageGeneration(ctx,fake.deps)),'normal',f.pid);
 expect(caps).toEqual([q.maximumMicro]);expect(result.stoppedByCostCap).toBe(true);expect(result.outcomes.every(o=>!o.assetId)).toBe(true);expect(fake.log.generations).toHaveLength(1);expect(fetch).not.toHaveBeenCalled();expect(one<{n:number}>('SELECT COUNT(*) n FROM ai_calls')!.n).toBe(0);
});
it.each(['tariff','route'])('refuse un changement %s après confirmation avant le worker, sans appeler la génération',async change=>{
 const f=await fixture(),q=await f.quote();await f.confirm(q);const job=claimNext(['image.v2'])!,fake=mockDeps({generate:async()=>{throw Error('Aucun envoi permis');}});
 if(change==='tariff')setJsonSetting('billing.markup',2);else setJsonSetting('ai.media.usage',{scene:{mode:'manual',primary:'openai:gpt-image-1',backup:null}});
 await expect(runNativeImageGeneration(new JobContext(job),fake.deps)).rejects.toMatchObject({code:'image_quote_stale'});expect(fake.log.generations).toHaveLength(0);expect(fake.log.reviews).toHaveLength(0);expect(fetch).not.toHaveBeenCalled();setJsonSetting('ai.media.usage',{});
});
it('deux compositions partagent le plafond : la seconde ne peut dépasser le total signé, première image conservée',async()=>{
 const f=await fixture();f.request.count=2;const q=await f.quote();await f.confirm(q);const job=claimNext(['image.v2'])!,caps:number[]=[];let simulatedSends=0;
 const fake=mockDeps({reviewFor:()=>review(9),generate:async brief=>{caps.push(currentTrace().costCapMicro!);assertUnderCostCap(q.maximumMicro-1);simulatedSends++;run('INSERT INTO ai_calls(id,created_at,user_id,project_id,job_id,task,provider,requested_model,unit,cost,status) VALUES(?,?,?,?,?,?,?,?,?,?,?)',id(),now(),f.u.id,f.pid,job.id,'test','simulation','native-image-cap-test','request',q.maximumMicro-1,'ok');return mockImage(321,brief.format.width,brief.format.height);}});
 const result=await runForUser(f.u.id,()=>withTrace({jobId:job.id,projectId:f.pid},()=>runNativeImageGeneration(new JobContext(job),fake.deps)),'normal',f.pid);
 expect(caps).toEqual([q.maximumMicro,q.maximumMicro]);expect(simulatedSends).toBe(1);expect(result.stoppedByCostCap).toBe(true);const acquired=result.outcomes.filter(o=>o.assetId);expect(acquired).toHaveLength(1);expect(assetData(getAsset(acquired[0].assetId!)!).length).toBeGreaterThan(0);expect(result.costMicro).toBe(q.maximumMicro-1);expect(result.costMicro).toBeLessThanOrEqual(q.maximumMicro);expect(fetch).not.toHaveBeenCalled();
 const resume=mockDeps({generate:async()=>{throw Error('Aucune relance après arrêt au plafond');}}),recovered=await runNativeImageGeneration(new JobContext(getJob(job.id)!),resume.deps);expect(recovered.outcomes.map(o=>o.assetId)).toEqual(result.outcomes.map(o=>o.assetId));expect(resume.log.generations).toHaveLength(0);
});
it.each(['1:1','4:5','2:3','3:2','9:16','16:9','3:1','4:1'])('conserve le format natif %s dans le devis signé',async aspect=>{
 const f=await fixture();f.request.aspect=aspect;const q=await f.quote(),encoded=q.approvalToken.split('.')[0],a=JSON.parse(Buffer.from(encoded,'base64url').toString());expect(a.cost.requests[0].aspect).toBe(aspect);expect(a.cost.requests[0].shot).toBeUndefined();expect(a.cost.requests[0].attemptLimit).toBe(1);expect(fetch).not.toHaveBeenCalled();
});
it.each(['confirm','worker'])('référence produit versionnée : changement refusé au %s sans achat',async step=>{
 const f=await fixture('hightech'),source=await seedCutout(f.u.id,f.pid);f.request.kind='packshot';f.request.aspect='1:1';const q=await f.quote(),a=JSON.parse(Buffer.from(q.approvalToken.split('.')[0],'base64url').toString());expect(a.cost.requests[0].references).toEqual([source]);
 if(step==='worker')expect((await f.confirm(q)).status).toBe(200);
 run('UPDATE assets SET version=version+1 WHERE id=?',source);
 if(step==='confirm'){expect((await f.confirm(q)).status).toBe(409);expect(all('SELECT id FROM jobs WHERE project_id=?',f.pid)).toHaveLength(0);}else{const job=claimNext(['image.v2'])!,fake=mockDeps({generate:async()=>{throw Error('Aucun achat permis');}});await expect(runNativeImageGeneration(new JobContext(job),fake.deps)).rejects.toThrow('références');expect(fake.log.generations).toHaveLength(0);}
 expect(fetch).not.toHaveBeenCalled();
});
it('quatre variantes natives sont devisées et bornées séparément sans changer le nombre demandé',async()=>{
 const f=await fixture();f.request.count=4;const q=await f.quote(),a=JSON.parse(Buffer.from(q.approvalToken.split('.')[0],'base64url').toString());expect(q.maximumCalls).toBe(8);expect(a.cost.requests.map((r:any)=>r.variant)).toEqual([0,1,2,3]);expect(a.cost.requests.every((r:any)=>r.count===1&&r.attemptLimit===1&&r.allowDirectionChange===false)).toBe(true);expect(fetch).not.toHaveBeenCalled();
});
it('un autre type de tâche ou propriétaire ne peut utiliser le devis au worker',async()=>{
 const f=await fixture(),q=await f.quote();await f.confirm(q);const job=claimNext(['image.v2'])!,fake=mockDeps({generate:async()=>{throw Error('Aucun fournisseur permis');}});
 await expect(runNativeImageGeneration(new JobContext({...job,type:'content.v2'}),fake.deps)).rejects.toThrow('Accord image');
 const other=await createUser(`parity301-foreign-${crypto.randomUUID()}@example.invalid`,'test-fictif-seulement','Autre');await expect(runNativeImageGeneration(new JobContext({...job,user_id:other.id}),fake.deps)).rejects.toThrow('Devis');expect(fake.log.generations).toHaveLength(0);expect(fetch).not.toHaveBeenCalled();
});
