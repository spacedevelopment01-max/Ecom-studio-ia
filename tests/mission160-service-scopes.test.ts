/** Priority rectification #160: website foundation and coexisting service communication angles. */
import {it,expect,afterEach,vi} from 'vitest';
import {clientFixture} from './mission154-fixtures';
import {activeStrategy,getStrategyState,prepareStrategyChange,activateStrategy,assertContentAlignment,stageStrategyModule} from '@/lib/marketing-strategy';
import {withCommunicationStrategy,withSiteStrategy,strategySelection,strategyStamp,jobStrategy} from '@/lib/strategy-consumption';
import {grantProjectPlan} from '@/lib/project-subscriptions';
import {buildShop} from '@/lib/engine/shop';
import {currentTheme,loadProject,themeVersion} from '@/lib/projects';
import {runContentEngineV2} from '@/lib/seo-v2/engine';
import {localOnlyDeps} from '@/lib/seo-v2/deps';
import {latestContent} from '@/lib/seo-v2/store';
import {createPlanV2} from '@/lib/social-v2/planner';
import {createOnePost} from '@/lib/social-v2/single';
import {prepareStrategyTheme,commitPreparedStrategyTheme} from '@/lib/theme/strategy-transition';
import {prepareLocalStrategyModules} from '@/lib/marketing-strategy/module-preparation';
import {all,one,run,id} from '@/lib/db';
import {enqueue,JobContext} from '@/lib/jobs';
import {handlers} from '../worker/handlers';
import {compileTheme} from '@/lib/theme/compile';
import {brainView} from '@/lib/brain/facade';
import {socialStrategy} from '@/lib/social-v2/strategy';
import {approvePosts,approvalValid} from '@/lib/social-v2/approval';
import {saveAsset} from '@/lib/library';
import {strategyContentVisible} from '@/lib/marketing-strategy/visibility';
afterEach(()=>vi.unstubAllGlobals());
function choose(pid:string,angleId:string){const p=prepareStrategyChange(pid,angleId);expect(p.contents).toEqual([]);return activateStrategy(pid,{angleId,preparationId:p.id,idempotencyKey:id(),confirmed:true});}
const tomorrow=()=>new Date(Date.now()+86400000).toISOString().slice(0,10);
const planRequest=()=>({startDate:tomorrow(),days:1,perDay:1,timezone:'Europe/Paris',platforms:[{platform:'instagram' as const}],lang:'fr' as const});
it('site multi-prestations + SEO + export sans angle ni quota ; A/B ne modifie aucun de ces acquis',async()=>{
 vi.stubGlobal('fetch',async()=>{throw Error('No external call');});
 const f=await clientFixture({services:true,copySource:'ai',strategy:null});
 const seo=await runContentEngineV2(null,f.pid,{type:'home_page',lang:'fr'},localOnlyDeps());await buildShop(null,f.pid,{direction:'rive',useAi:false});
 const original=currentTheme(f.pid)!,identity=loadProject(f.pid).brand,doc=latestContent(f.pid,seo.docKey!)!;
 expect(getStrategyState(f.pid).usedAngleIds).toEqual([]);expect(original.spec.meta?.strategy).toBeUndefined();expect(JSON.stringify(original.spec)).toContain('Découverte des émaux');expect(JSON.stringify(original.spec)).toContain('Atelier de tournage individuel');
 expect(()=>createPlanV2(loadProject(f.pid),planRequest())).toThrowError(expect.objectContaining({code:'strategy_communication_choice_required'}));
 for(const angle of ['usage','reassurance']){const s=choose(f.pid,angle);expect(await prepareStrategyTheme(f.pid,getStrategyState(f.pid).pending?.id??'none')).toBeNull();expect(await prepareLocalStrategyModules(f.pid,'none')).toEqual([]);expect(strategySelection(f.pid)).toBeNull();expect(brainView(loadProject(f.pid),'seo').stable).not.toContain(s.id);expect(withCommunicationStrategy(f.pid,()=>brainView(loadProject(f.pid),'social').stable)).toContain(s.id);expect(currentTheme(f.pid)!.version.id).toBe(original.version.id);expect(latestContent(f.pid,seo.docKey!)?.version.id).toBe(doc.version.id);}
 await buildShop(null,f.pid,{direction:'rive',useAi:false});expect(currentTheme(f.pid)!.version.id).toBe(original.version.id);expect(loadProject(f.pid).brand).toEqual(identity);expect(compileTheme(currentTheme(f.pid)!.spec)).toEqual(compileTheme(original.spec));expect(all('SELECT id FROM ai_calls WHERE project_id=? AND id NOT GLOB \'fixture_research_*\'',f.pid)).toHaveLength(0);
});
it.each([['creer',1],['vendre',2],['dominer',5]] as const)('droits services %s : quota persistant, concurrence, identité et aucun appel',async(plan,limit)=>{
 const f=await clientFixture({services:true,copySource:'ai',strategy:null});grantProjectPlan(f.pid,plan);
 expect(getStrategyState(f.pid).angles).toHaveLength(5);const allowed=['usage','reassurance','expression','discovery','generalist'].slice(0,limit);
 for(const angle of allowed)choose(f.pid,angle);
 for(const angle of allowed){const req={...planRequest(),angleId:angle as any};const result=createPlanV2(loadProject(f.pid),req);const row=one<any>('SELECT * FROM marketing_strategy_contents WHERE project_id=? AND module=\'calendar\' AND content_id=?',f.pid,result.planId);expect(row.angle_id).toBe(angle);}
 expect(getStrategyState(f.pid).usedAngleIds).toHaveLength(limit);grantProjectPlan(f.pid,plan);expect(getStrategyState(f.pid).usedAngleIds).toHaveLength(limit);
 if(limit<5){expect(()=>prepareStrategyChange(f.pid,['reassurance','expression'][limit-1])).toThrowError(expect.objectContaining({code:'strategy_angle_limit'}));expect(()=>withCommunicationStrategy(f.pid,()=>null,{angleId:'generalist'})).toThrow();}
 expect(all('SELECT id FROM ai_calls WHERE project_id=? AND id NOT GLOB \'fixture_research_*\'',f.pid)).toHaveLength(0);
});
it('A/B coexistent : calendrier, publication, worker différé et approbation A inchangés après B',async()=>{
 const f=await clientFixture({services:true,copySource:'ai',strategy:null});grantProjectPlan(f.pid,'vendre');const a=choose(f.pid,'usage');
 const pa=createOnePost(loadProject(f.pid),{...planRequest(),kind:'image',date:tomorrow(),time:'11:30',angleId:'usage'});const aid=pa.ids[0];
 approvePosts([aid],f.user.id,()=>({blocking:[]}));run("UPDATE posts SET status='scheduled' WHERE id=?",aid);const approved=one<any>('SELECT * FROM posts WHERE id=?',aid)!;
 const queued=enqueue({userId:f.user.id,projectId:f.pid,type:'social.v2.produce',payload:{projectId:f.pid,action:'produce',ids:[aid],allowPaid:false,maxCostEur:0}});
 const b=choose(f.pid,'reassurance');expect(b.id).not.toBe(a.id);
 expect(one<any>('SELECT * FROM posts WHERE id=?',aid)).toEqual(approved);expect(approvalValid(approved)).toBe(true);expect(()=>assertContentAlignment(f.pid,'post',aid)).not.toThrow();
 expect(jobStrategy(f.pid,'social.v2.produce',JSON.parse(queued.payload),true)?.id).toBe(a.id);
 const pb=createPlanV2(loadProject(f.pid),{...planRequest(),angleId:'reassurance'});const later=createPlanV2(loadProject(f.pid),{...planRequest(),angleId:'usage'});
 const stamps=all<any>('SELECT angle_id FROM marketing_strategy_contents WHERE project_id=? AND module=\'calendar\' AND content_id IN (?,?)',f.pid,pb.planId,later.planId);expect(stamps.map(s=>s.angle_id).sort()).toEqual(['reassurance','usage']);
 const r=await handlers[queued.type](new JobContext(queued));expect(r).toBeDefined();expect(all('SELECT id FROM ai_calls WHERE project_id=? AND id NOT GLOB \'fixture_research_*\'',f.pid)).toHaveLength(0);
});
it('site : un média de campagne reste consultable sans pouvoir entrer automatiquement dans le site',async()=>{
 const f=await clientFixture({services:true,strategy:null});choose(f.pid,'usage');
 const image=await withCommunicationStrategy(f.pid,()=>saveAsset({projectId:f.pid,userId:f.user.id,name:'fixture.jpg',mime:'image/jpeg',data:Buffer.from('FICTITIOUS'),role:'lifestyle',origin:'generated'}));
 expect(strategyContentVisible(f.pid,'asset',image.id)).toBe(true);withSiteStrategy(f.pid,()=>expect(strategyContentVisible(f.pid,'asset',image.id)).toBe(false));
 expect(()=>stageStrategyModule(f.pid,'none','theme',{contentIds:[]})).toThrowError(expect.objectContaining({code:'strategy_service_no_global_revision'}));
});
it('production simulée A et B : mêmes moteurs, média et provenance héritent de chaque publication',async()=>{
 const {produceBatch}=await import('@/lib/social-v2/production');const {mockSocialDeps}=await import('./social-v2-mock');const sharp=(await import('sharp')).default;
 const f=await clientFixture({services:true,strategy:null,copySource:'ai'});grantProjectPlan(f.pid,'vendre');choose(f.pid,'usage');
 const a=createOnePost(loadProject(f.pid),{...planRequest(),kind:'image',date:tomorrow(),time:'11:30',angleId:'usage'});choose(f.pid,'reassurance');const b=createOnePost(loadProject(f.pid),{...planRequest(),kind:'image',date:tomorrow(),time:'12:30',angleId:'reassurance'});
 const seen:string[]=[];const {deps}=mockSocialDeps({aiActive:true,cost:1});deps.aiPost=async(p,post)=>{seen.push(strategySelection(p.id)!.angleId);const asset=await saveAsset({projectId:p.id,userId:p.userId,name:'media-simule.jpg',mime:'image/jpeg',data:await sharp({create:{width:50,height:50,channels:3,background:'#556677'}}).jpeg().toBuffer(),role:'post',origin:'generated',meta:{simulation:true}});return{assetId:asset.id,costMicro:1,by:'image_v2'};};
 const result=await produceBatch(loadProject(f.pid),[...a.ids,...b.ids],deps,{allowPaid:true,aiImages:60,maxCostEur:1,approvedEstimateMicro:2});expect(result.produced).toBe(2);expect(seen).toEqual(['usage','reassurance']);
 for(const pid of [...a.ids,...b.ids]){const post=one<any>('SELECT media FROM posts WHERE id=?',pid);const postAngle=one<any>('SELECT angle_id FROM marketing_strategy_contents WHERE project_id=? AND module=\'post\' AND content_id=?',f.pid,pid).angle_id;expect(one<any>('SELECT angle_id FROM marketing_strategy_contents WHERE project_id=? AND module=\'asset\' AND content_id=?',f.pid,JSON.parse(post.media)[0]).angle_id).toBe(postAngle);}
 expect(all('SELECT id FROM ai_calls WHERE project_id=? AND id NOT GLOB \'fixture_research_*\'',f.pid)).toHaveLength(0);
});
it('scénario/voix : l’accord A ne peut pas être utilisé sous B ; le site ne dépend d’aucun des deux',async()=>{
 const {sceneApprovalRequest,approveVideoScenario,readVideoApproval}=await import('@/lib/video-v2/approval');const f=await clientFixture({services:true,strategy:null,copySource:'ai'});choose(f.pid,'usage');choose(f.pid,'reassurance');const request:any={as:'post',angleId:'usage',request:'Présenter le geste',scenes:2,aspect:'9:16',totalS:12};const approved=approveVideoScenario(loadProject(f.pid),sceneApprovalRequest(request),{scenes:[{voice:'Texte relu sous A'}]},100);expect(()=>readVideoApproval(loadProject(f.pid),sceneApprovalRequest({...request,angleId:'reassurance'}),approved.token)).toThrow();expect(()=>readVideoApproval(loadProject(f.pid),sceneApprovalRequest(request),approved.token)).not.toThrow();
});
it('cache et accord vidéo distinguent A/B même quand le moteur est appelé sans angle dans la demande',async()=>{
 const {videoScope,sceneApprovalRequest}=await import('@/lib/video-v2/approval');const f=await clientFixture({services:true,strategy:null,copySource:'ai'});const request:any=sceneApprovalRequest({as:'post',request:'Présenter un atelier'});const siteRequest=sceneApprovalRequest({as:'post',purpose:'site',request:'Montrer les prestations'});choose(f.pid,'usage');const a=videoScope(loadProject(f.pid),request),site=videoScope(loadProject(f.pid),siteRequest);choose(f.pid,'expression');expect(videoScope(loadProject(f.pid),request)).not.toBe(a);expect(videoScope(loadProject(f.pid),siteRequest)).toBe(site);expect(withCommunicationStrategy(f.pid,()=>videoScope(loadProject(f.pid),request),{angleId:'usage'})).toBe(a);
});
it('une approbation historique antérieure aux angles reste valide ; elle n’autorise pas une nouvelle génération sans choix',async()=>{
 const f=await clientFixture({services:true,strategy:null});const pid=id(),at=Date.now()-10000;run("INSERT INTO posts(id,project_id,network,format,status,caption,media,publish_key,created_at,updated_at,engine,content_hash,approved_hash,approved_at,approved_by) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",pid,f.pid,'instagram','text','scheduled','Message déjà approuvé','[]',`legacy-${pid}`,at,at,'v2','native-approved-hash','native-approved-hash',at,f.user.id);
 const original=one<any>('SELECT * FROM posts WHERE id=?',pid);choose(f.pid,'usage');choose(f.pid,'expression');expect(()=>assertContentAlignment(f.pid,'post',pid,{operation:'publish'})).not.toThrow();expect(jobStrategy(f.pid,'post.publish',{postId:pid},false)).toBeNull();expect(()=>assertContentAlignment(f.pid,'post',pid)).toThrow();expect(one<any>('SELECT * FROM posts WHERE id=?',pid)).toEqual(original);
});
it('une vidéo du site décrite en langage naturel reste générale avant et après A/B',async()=>{
 const {videoScope}=await import('@/lib/video-v2/approval');const {siteVideoRequest}=await import('@/lib/strategy-consumption');const f=await clientFixture({services:true,strategy:null});const request={ask:{text:"Présentation des prestations pour la page d’accueil du site internet"}};expect(siteVideoRequest(f.pid,request)).toBe(true);expect(jobStrategy(f.pid,'video.v2',{request})).toBeNull();const hash=videoScope(loadProject(f.pid),request);choose(f.pid,'usage');choose(f.pid,'expression');expect(videoScope(loadProject(f.pid),request)).toBe(hash);expect(siteVideoRequest(f.pid,{ask:{...request.ask,purpose:'ad'}})).toBe(false);
});
