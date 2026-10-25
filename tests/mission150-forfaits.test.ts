import { describe,it,expect } from 'vitest';
import { createUser } from '@/lib/auth';
import { id,now,one,run } from '@/lib/db';
import { grantProjectPlan,createSubscription } from './communication-choice-fixture';
import { PLANS, type PlanId } from '@/lib/plans';
import { FAMILY_LIBRARY } from '@/lib/theme/section-families';
import { planAllowsTheme,planAllowsSection } from '@/lib/plan-entitlements';
import { themeAllowed } from '@/lib/theme/theme-access';
import { assertAdvertising,assertJobEntitlements } from '@/lib/job-entitlements';
import { assertLibrarySelection } from '@/lib/theme/plan-access';
import { enqueue,JobContext } from '@/lib/jobs';
import { reserveBlogDraft,releaseUnsavedBlogDraft,quotaView } from '@/lib/quotas';
import * as calls from '@/lib/appointments';
import { initialCreativeCount } from '@/lib/social-v2/initial';
import { createProjectWithSubscription } from '@/lib/project-billing';
const fixture=async(plan:PlanId)=>{const user=await createUser(`droits150-${id()}@example.test`,'test-password-150','Test forfait');const pid=id();run('INSERT INTO projects(id,user_id,name,created_at,updated_at) VALUES(?,?,?,?,?)',pid,user.id,'Projet de test isolé',now(),now());const sub=grantProjectPlan(pid,plan);return{user,pid,sub};};
let slotSeq=0;
const slot=()=>{const sid=id(),at=now()+4*86400000+(++slotSeq)*60000;run('INSERT INTO call_slots(id,starts_at,ends_at,status,created_at) VALUES(?,?,?,?,?)',sid,at,at+3600000,'open',now());return sid;};
it('grille unique TTC, droits et quotas 49/89/129 sans quotas vidéo inventés',()=>{
 expect(Object.values(PLANS).map(p=>[p.price.month,p.librarySections,p.quotas.blog,p.postsPerDay,p.calendarDays])).toEqual([[49,8,0,1,7],[89,12,5,3,30],[129,20,10,5,90]]);
 // Mission #190 : plus de quota « N thèmes par famille » ; les thèmes sont ouverts par thème et par forfait (theme-rights.ts).
 expect(Object.values(PLANS).some(p=>'themes' in p)).toBe(false);
 expect(Object.values(PLANS).map(p=>p.quotas.aiVideos)).toEqual([0,0,0]);
});
it('thèmes : droits par thème (aucune famille) ; répartition à choisir = tous les thèmes proposés ; aucun ancien thème réintroduit',()=>{
 for(const plan of ['creer','vendre','dominer'] as const){expect(themeAllowed(plan,'onde')).toBe(true);expect(themeAllowed(plan,'sillon')).toBe(true);expect(planAllowsTheme(plan,'phase')).toBe(true);expect(themeAllowed(plan,'atelier')).toBe(false);expect(themeAllowed(plan,'orbe')).toBe(false);}
 expect(themeAllowed(null,'onde')).toBe(false);
 // Liste choisie pour un forfait : seuls ces thèmes lui sont ouverts, les autres forfaits restent « à choisir ».
 const rights={plans:{creer:['phase','onde']}};
 expect(themeAllowed('creer','phase',rights)).toBe(true);expect(themeAllowed('creer','sillon',rights)).toBe(false);expect(themeAllowed('vendre','sillon',rights)).toBe(true);
});
it.each(['creer','vendre','dominer'] as const)('%s : fonctions de la bibliothèque ouvertes par nom de fonction, sans famille (mission #190)',plan=>{
 const fn=(k:string)=>k.split('.').pop()!;
 const all=Object.values(FAMILY_LIBRARY).flat();
 const allowed=new Set(all.filter(e=>planAllowsSection(plan,e.key)).map(e=>fn(e.key)));
 // Une même fonction (ex. « faq ») est ouverte ou fermée pareil quelle que soit l'ancienne famille qui la propose.
 for(const e of all)expect(planAllowsSection(plan,e.key),e.key).toBe(allowed.has(fn(e.key)));
 if(plan==='dominer')expect(all.every(e=>planAllowsSection(plan,e.key))).toBe(true);
 else{expect(allowed.has('faq')).toBe(true);expect(allowed.has('press')).toBe(false);}
 if(plan!=='creer')expect(allowed.has('before-after')).toBe(true);else expect(allowed.has('before-after')).toBe(false);
 // Sections propres au thème installé : toujours ouvertes (elles font partie du thème).
 expect(planAllowsSection(plan,'own:ph-hero~p0')).toBe(true);
});
it('insertion directe de fonction verrouillée refusée, fonction permise acceptée sans limite de blocs',async()=>{
 const f=await fixture('creer');expect(()=>assertLibrarySelection(f.pid,'fam:specialty.faq')).not.toThrow();expect(()=>assertLibrarySelection(f.pid,'fam:specialty.press')).toThrow(/forfait/);
 // Plus de familles : la même fonction proposée par une autre ancienne famille est acceptée.
 expect(()=>assertLibrarySelection(f.pid,'fam:services.faq')).not.toThrow();
});
it.each(['creer','vendre'] as const)('%s : devis, tâche directe et worker publicitaire refusés avant toute dépense',async plan=>{
 const f=await fixture(plan);expect(()=>assertAdvertising(f.pid)).toThrow(/129/);expect(()=>enqueue({userId:f.user.id,projectId:f.pid,type:'image.ai_post',payload:{request:{as:'ad'}}})).toThrow(/129/);
 expect(one<{n:number}>('SELECT COUNT(*) n FROM jobs WHERE project_id=?',f.pid)?.n).toBe(0);
 const {handlers}=await import('../worker/handlers');await expect(handlers['ads.v2']({job:{project_id:f.pid},payload:{}} as any)).rejects.toThrow(/129/);
 expect(one<{n:number}>('SELECT COUNT(*) n FROM usage_events WHERE project_id=?',f.pid)?.n).toBe(0);expect(initialCreativeCount(f.pid)).toBe(10);
});
it('Dominer : publicités permises ; tâche déjà en file revérifiée après baisse de forfait',async()=>{
 const f=await fixture('dominer');const j=enqueue({userId:f.user.id,projectId:f.pid,type:'ads.v2',payload:{projectId:f.pid}});expect(initialCreativeCount(f.pid)).toBe(20);grantProjectPlan(f.pid,'vendre');const {handlers}=await import('../worker/handlers');await expect(handlers[j.type](new JobContext(j))).rejects.toThrow(/129/);expect(initialCreativeCount(f.pid)).toBe(10);
});
it('vidéos IA refusées à 49, ouvertes à 89 ; blog absent à49',async()=>{
 const f=await fixture('creer');expect(()=>assertJobEntitlements('video.v2',f.pid,{request:{approveGeneration:true}})).toThrow();expect(()=>assertJobEntitlements('content.v2',f.pid,{request:{type:'blog_article'}})).toThrow();grantProjectPlan(f.pid,'vendre');expect(()=>assertJobEntitlements('video.v2',f.pid,{request:{approveGeneration:true}})).not.toThrow();
});
it('blog : réservation atomique du dernier article, reprise sans double compte et restitution du seul compte après échec sans brouillon',async()=>{
 const f=await fixture('vendre');const articles=Array.from({length:5},()=>id());const refs=articles.map(a=>reserveBlogDraft(f.user.id,f.pid,a));expect(quotaView(f.user.id,'blog',f.pid).left).toBe(0);expect(()=>reserveBlogDraft(f.user.id,f.pid,id())).toThrow();expect(reserveBlogDraft(f.user.id,f.pid,articles[0])).toBe(refs[0]);expect(quotaView(f.user.id,'blog',f.pid).used).toBe(5);releaseUnsavedBlogDraft(f.user.id,f.pid,refs[0],[articles[0]]);expect(quotaView(f.user.id,'blog',f.pid).left).toBe(1);expect(()=>reserveBlogDraft(f.user.id,f.pid,id())).not.toThrow();
});
it.each(['creer','vendre','dominer'] as const)('%s : un seul appel de départ, préservé après renouvellement et changement de forfait',async plan=>{
 const f=await fixture(plan),q=calls.quoteCall(f.user.id,f.pid);expect(q).toMatchObject({state:'available',priceCents:plan==='creer'?6000:plan==='vendre'?3000:0});const b=calls.bookSlot(f.user.id,f.pid,slot());if(!b.free)calls.confirmPaidCall(b.id,'payment-test');calls.markDone(b.id);run('UPDATE subscriptions SET current_period_start=?,current_period_end=? WHERE user_id=?',now()+86400000,now()+32*86400000,f.sub);grantProjectPlan(f.pid,'dominer');expect(calls.quoteCall(f.user.id,f.pid)).toMatchObject({state:'used',priceCents:null});expect(()=>calls.bookSlot(f.user.id,f.pid,slot())).toThrow(/déjà/);
});
it('RDV : isolation, annulation/report existants et paiement tardif ne créent aucun deuxième droit',async()=>{
 const f=await fixture('vendre'),other=await fixture('dominer');expect(()=>calls.quoteCall(other.user.id,f.pid)).toThrow();const b=calls.bookSlot(f.user.id,f.pid,slot());run('UPDATE call_bookings SET status=? WHERE id=?','canceled',b.id);const next=calls.bookSlot(f.user.id,f.pid,slot());expect(calls.confirmPaidCall(b.id,'late-test-payment')).toBe('lost');expect(calls.quoteCall(f.user.id,f.pid).state).toBe('reserved');expect(next.id).not.toBe(b.id);
});
it('un abonnement finance un seul projet ; les projets historiques restent intacts',async()=>{
 const f=await fixture('creer');const pending=createSubscription(f.user.id,{plan:'vendre',source:'admin',status:'manual'});const make=()=>{const pid=id();run('INSERT INTO projects(id,user_id,name,created_at,updated_at) VALUES(?,?,?,?,?)',pid,f.user.id,'Second abonnement distinct',now(),now());return{projectId:pid,result:pid};};createProjectWithSubscription(f.user.id,pending,make);expect(()=>createProjectWithSubscription(f.user.id,pending,make)).toThrow();expect(one<{n:number}>('SELECT COUNT(*) n FROM projects WHERE user_id=?',f.user.id)?.n).toBe(2);
});
it.each(['creer','vendre'] as const)('%s : lot natif de dix publications, zéro plan/publicité et devis limité aux dix',async plan=>{
 const {readyInitial,injectedInitial,makeInitialPlan,executeInitial}=await import('./initial-fixtures');
 const initial=await import('@/lib/social-v2/initial');
 const f=await readyInitial(plan==='creer'?0:1);grantProjectPlan(f.pid,plan);
 const fixture=injectedInitial();fixture.deps.plan=async()=>({posts:makeInitialPlan().posts.slice(0,10)});
 const quote=initial.quoteInitialCreatives(f.pid,fixture.deps);expect(quote).toMatchObject({missing:10,organicMissing:10,adsMissing:0,adsIncluded:false});
 const queued=initial.queueInitialCreatives(f.pid,quote.id,fixture.deps);
 const {getJob}=await import('@/lib/jobs');const result=await executeInitial(f.pid,fixture.deps,quote.id);
 expect(result).toMatchObject({accepted:10,organic:10,ads:0});expect(fixture.calls).toHaveLength(10);expect(fixture.calls.every(c=>c.purpose==='organic')).toBe(true);
});
it('blog natif : cinq brouillons sauvés, reprise gratuite, sixième refusé avant le fournisseur',async()=>{
 const f=await fixture('vendre');const {seedImageFixture}=await import('./image-v2-fixtures');const pid=seedImageFixture(f.user.id,'cosmetic');grantProjectPlan(pid,'vendre');
 const {runContentEngineV2}=await import('@/lib/seo-v2/engine');const {mockSeoDeps}=await import('./seo-v2-mock');
 let first:any;for(let i=0;i<5;i++) {const mock=mockSeoDeps();const req={type:'blog_article' as const,keyword:{term:`routine documentée ${['matin','soir','voyage','maison','quotidien'][i]}`,intent:'informational' as const,source:'semantic_hypothesis' as const,metrics:null,basis:'test isolé'}};const result=await runContentEngineV2(null,pid,req,mock.deps);expect(result.docKey).toBeTruthy();if(!i)first={req,result};}
 expect(quotaView(f.user.id,'blog',pid)).toMatchObject({used:5,left:0});const retry=mockSeoDeps();const reused=await runContentEngineV2(null,pid,first.req,retry.deps);expect(reused.skipped).toBe(true);expect(retry.log.writes).toHaveLength(0);
 const blocked=mockSeoDeps();await expect(runContentEngineV2(null,pid,{type:'blog_article',keyword:{term:'routine inédite',intent:'informational',source:'semantic_hypothesis',metrics:null,basis:'test isolé'}},blocked.deps)).rejects.toThrow();expect(blocked.log.writes).toHaveLength(0);
});
it('changement de forfait : les dix publications acquises restent identiques ; seule l’extension publicitaire est créée',async()=>{
 const {readyInitial,injectedInitial,makeInitialPlan,executeInitial}=await import('./initial-fixtures');
 const initial=await import('@/lib/social-v2/initial');const {all}=await import('@/lib/db');
 const f=await readyInitial(0);grantProjectPlan(f.pid,'creer');const m=injectedInitial();let plans=0,extensions=0;
 m.deps.plan=async()=>{plans++;return{posts:makeInitialPlan().posts.slice(0,10)};};
 await executeInitial(f.pid,m.deps);
 const assets=all<{id:string}>('SELECT id FROM assets WHERE project_id=? ORDER BY id',f.pid).map(a=>a.id);
 grantProjectPlan(f.pid,'dominer');m.deps.extendAds=async(_p,organic)=>{extensions++;return{posts:[...organic.posts,...makeInitialPlan().posts.slice(10)]};};
 expect(initial.quoteInitialCreatives(f.pid,m.deps)).toMatchObject({missing:10,organicMissing:0,adsMissing:10});
 await executeInitial(f.pid,m.deps);expect(plans).toBe(1);expect(extensions).toBe(1);expect(m.calls).toHaveLength(20);
 expect(assets.every(a=>!!one('SELECT id FROM assets WHERE id=?',a))).toBe(true);
 grantProjectPlan(f.pid,'vendre');expect(initial.quoteInitialCreatives(f.pid,m.deps)).toMatchObject({missing:0,adsMissing:0,adsIncluded:false});
 expect(m.calls.filter(c=>c.purpose==='organic')).toHaveLength(10);
});
it('éditeur partagé : seule la filiation organique enregistrée autorise les modèles de publications ; texte modifié et autre projet ne la falsifient pas',async()=>{
 const f=await fixture('creer'),other=await fixture('creer');const {organicDocument}=await import('@/lib/ad-doc/store');
 const post='post:'+id(),ad='ad:'+id(),copy='ad:'+id();
 const put=(key:string,v:number,parent:string|null)=>run('INSERT INTO ad_documents(id,project_id,doc_key,version,source,doc_json,created_at) VALUES(?,?,?,?,?,?,?)',id(),f.pid,key,v,'user',JSON.stringify({meta:{createdFrom:parent}}),now());
 put(post,1,null);put(copy,1,post);put(ad,1,null);put(ad,2,post);
 expect(organicDocument(f.pid,post)).toBe(true);expect(organicDocument(f.pid,copy)).toBe(true);expect(organicDocument(f.pid,ad)).toBe(false);expect(organicDocument(other.pid,copy)).toBe(false);
});
it.each(['creer','vendre','dominer'] as const)('%s : horizon et fréquence contrôlés dans le planificateur natif sans fournisseur',async plan=>{
 const f=await fixture(plan);const {seedImageFixture}=await import('./image-v2-fixtures');const pid=seedImageFixture(f.user.id,'artisan');grantProjectPlan(pid,plan);
 const {createPlanV2}=await import('@/lib/social-v2/planner');const {loadProject}=await import('@/lib/projects');const {all}=await import('@/lib/db');
 const req={startDate:new Date(now()+86400000).toISOString().slice(0,10),days:1,perDay:5,timezone:'Europe/Paris',platforms:[{platform:'facebook' as const}]};
 const r=createPlanV2(loadProject(pid),req);expect(r.created).toBe(PLANS[plan].postsPerDay);
 const before=all('SELECT id FROM posts WHERE project_id=?',pid).length;
 expect(()=>createPlanV2(loadProject(pid),{...req,startDate:new Date(now()+(PLANS[plan].calendarDays+2)*86400000).toISOString().slice(0,10)})).toThrow(/jours/);
 expect(all('SELECT id FROM posts WHERE project_id=?',pid)).toHaveLength(before);
});
it('quota quotidien : approbation seule ne réserve pas un envoi ; adaptations et tentatives incertaines sont comptées sans doublon',async()=>{
 const f=await fixture('creer');const {scheduledPostsOn,dispatchedPostsOn}=await import('@/lib/plan-gates');
 const put=(status:string,group:string|null)=>{const key=id();run('INSERT INTO posts(id,project_id,network,format,status,scheduled_at,group_id,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)',key,f.pid,'facebook','text',status,now(),group,now(),now());return key;};
 const approved=put('approved',null),a=put('scheduled','shared'),b=put('scheduled','shared'),self=put('review',null);
 expect(scheduledPostsOn(f.pid,now(),self)).toBe(1);expect(scheduledPostsOn(f.pid,now(),a)).toBe(0);
 run('INSERT INTO post_attempts(id,post_id,attempt,lock_token,started_at,outcome) VALUES(?,?,?,?,?,?)',id(),a,1,id(),now(),'uncertain');
 run('INSERT INTO post_attempts(id,post_id,attempt,lock_token,started_at,outcome) VALUES(?,?,?,?,?,?)',id(),b,1,id(),now(),'published');
 expect(dispatchedPostsOn(f.pid,now(),self)).toBe(1);expect(dispatchedPostsOn(f.pid,now(),b)).toBe(0);
 const {publishOne}=await import('@/lib/social-v2/scheduler');run("UPDATE posts SET status='scheduled' WHERE id=?",self);let sends=0;
 const result=await publishOne(self,{send:async()=>{sends++;throw Error('must not send');}} as any);
 expect(result.outcome).toBe('skipped');expect(sends).toBe(0);expect(one<{error:string}>('SELECT error FROM posts WHERE id=?',self)?.error).toMatch(/quotidienne/);expect(one<{status:string}>('SELECT status FROM posts WHERE id=?',self)?.status).toBe('review');
 expect(one<{status:string}>('SELECT status FROM posts WHERE id=?',approved)?.status).toBe('approved');
});
it('idempotence isolée : une clé ne révèle ni ne réutilise une tâche d’un autre compte/projet',async()=>{
 const a=await fixture('dominer'),b=await fixture('dominer'),key='scope150:'+id();const first=enqueue({userId:a.user.id,projectId:a.pid,type:'ads.v2',idempotencyKey:key});
 expect(enqueue({userId:a.user.id,projectId:a.pid,type:'ads.v2',idempotencyKey:key}).id).toBe(first.id);
 const second=enqueue({userId:b.user.id,projectId:b.pid,type:'ads.v2',idempotencyKey:key});expect(second.id).not.toBe(first.id);expect(second.user_id).toBe(b.user.id);expect(second.project_id).toBe(b.pid);
});
it.each(['creer','vendre'] as const)('%s : scénario publicitaire refusé avant la rédaction, sans masquer les résultats acquis',async plan=>{
 const f=await fixture(plan);const {runSceneScenario}=await import('@/lib/video-v2/three-scenes');let writes=0;
 await expect(runSceneScenario(null,f.pid,{as:'ad'},async()=>{writes++;throw Error('must not write');})).rejects.toThrow(/129/);expect(writes).toBe(0);
});
