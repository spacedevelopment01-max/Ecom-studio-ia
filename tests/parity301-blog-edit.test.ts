/** #301 : API et worker natifs, stockage fictif, cognition/fournisseur simulés et aucune publication. */
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {account,project,sender} from './conversation209-fixtures';
import {loadProject,saveProduct,saveServices} from '@/lib/projects';
import {openProjectConversation,conversationView} from '@/lib/orchestrator/conversation';
import {contentRegistry,quoteContentEdit,confirmContent,runContentTool,contentReceipt} from '@/lib/orchestrator/conversation/content-tool-execution';
import {ContentToolCommandSchema} from '@/lib/orchestrator/conversation/content-tool-contract';
import {contentKey,saveContentVersion,latestContent,contentVersionDoc} from '@/lib/seo-v2/store';
import {saveBlogDraftV2,blogIdFor} from '@/lib/seo-v2/blog';
import * as nativeBlog from '@/lib/seo-v2/blog';
import {getArticle} from '@/lib/engine/blog';
import {all,one,run,id} from '@/lib/db';
import {claimNext,completeJob,failJob,getJob,JobContext} from '@/lib/jobs';
import {assertJobEntitlements} from '@/lib/job-entitlements';
import {quotaView,consumeQuota} from '@/lib/quotas';
import {projectAccountKey} from '@/lib/project-billing';
import {mockSeoDeps} from './seo-v2-mock';
import {editContentV2} from '@/lib/seo-v2/engine';
import {studioOperationCatalogue} from '@/lib/orchestrator/conversation/studio-operations';
import type {ContentDoc} from '@/lib/seo-v2/types';
let session:Awaited<ReturnType<typeof account>>|null=null;
vi.mock('@/lib/auth',async orig=>{const r=await orig<typeof import('@/lib/auth')>();return{...r,requireUser:async()=>{if(!session)throw new r.HttpError(401,'Connexion requise');return session;}};});
vi.mock('@/lib/ai/config',async orig=>({...await orig<object>(),activeProviderKey:()=> 'SIMULATED ONLY'}));
vi.mock('@/lib/ai/llm',async orig=>({...await orig<object>(),textProviderReady:()=>true}));
beforeEach(()=>{session=null;for(const k of ['LOT_A','AI','CONTEXT','SPECIALISTS','TOOLS','CONTENT','BLOG'])vi.stubEnv('STUDIO_CONVERSATION_'+k,'1');vi.stubGlobal('fetch',vi.fn(()=>{throw Error('Aucun fournisseur ou CMS réel autorisé');}));});
afterEach(()=>{run("UPDATE jobs SET status='cancelled' WHERE status IN ('queued','running')");vi.unstubAllGlobals();vi.unstubAllEnvs();vi.restoreAllMocks();});
async function fixture(service=false){
 const u=await account(),pid=project(u,service?'services':'products'),c=openProjectConversation(u,pid),p=loadProject(pid),name=service?'Aménagement de vans':'Équerre de menuiserie';
 saveProduct(pid,{...p.product,name,category:service?'Aménagement':'Outillage',summary:'Étude et examen des besoins.'});if(service)saveServices(pid,{...p.services,services:[{key:'atelier',name,description:'Étude et examen des besoins.',source:'client'}]});
 const doc:ContentDoc={version:1,type:'blog_article',lang:'fr',page:{key:'article:acquired-test',title:'Préparer votre projet',kind:'article',status:'planned',url:null},primaryKeyword:null,meta:{seoTitle:'Préparer votre projet',metaDescription:'Les informations confirmées avant un échange avec notre équipe.',slug:'preparer-votre-projet',canonical:null,robots:'index,follow'},blocks:[{id:'h1',kind:'h1',text:'Préparer votre projet'},{id:'p1',kind:'p',text:'Présentez votre projet à notre atelier.'},{id:'p2',kind:'p',text:'Ce paragraphe client doit rester entier.'}],schema:[],links:[],meta2:{source:'user',by:'local',runId:null,createdFrom:null}},key=contentKey(pid,'blog_article',doc.page.key,'fr'),v=saveContentVersion(pid,key,doc,{verdict:null});saveBlogDraftV2(loadProject(pid),key,doc,{notes:[],ai:false,jobKey:''});
 const articleId=blogIdFor(key),send=sender(u,c.id);await send({action:'message',text:'Reformule seulement le passage choisi sans inventer de promesse.\nDeux  espaces. Ne crée aucun article ni publication.'});
 const command=()=>{const view=conversationView(u,c.id);return{action:'edit_quote' as const,revision:view.revision,projectRevision:view.projectRevision!,docKey:key,expectedVersion:v.version,blockIds:['p1']};};
 const quote=async()=>{const q=await quoteContentEdit(u,c.id,command());if(q.kind!=='quote')throw Error('Un devis attendu');return q.quote;};return{u,pid,c,doc,key,v,articleId,send,command,quote};
}
const simulated=()=>mockSeoDeps({rewrite:{blocks:[{id:'p1',text:'Présentez votre projet à notre équipe pour un examen.'},{id:'p2',text:'Modification hors portée ignorée.'}],note:'Transport fictif'}});
async function execute(m=simulated()){
 const j=claimNext(['agent.content.edit'])!;expect(j).toBeTruthy();try{const r=await runContentTool(new JobContext(j),m.deps);completeJob(j.id,r);return{j,r,m};}catch(e){failJob(j,e,{permanent:true});throw e;}
}
it.each([false,true])('API→devis→accord→worker→même article/version/rechargement, quota intact (%s)',async service=>{
 const f=await fixture(service),route=await import('@/app/api/studio-agent/conversations/[cid]/content/route'),url='http://localhost/api/studio-agent/conversations/'+f.c.id+'/content',ctx={params:Promise.resolve({cid:f.c.id})};session=f.u;
 const before=getArticle(f.pid,f.articleId)!,quota=quotaView(f.u.id,'blog',f.pid),post=(body:unknown)=>route.POST(new Request(url,{method:'POST',headers:{origin:'http://localhost','content-type':'application/json'},body:JSON.stringify(body)}),ctx),registry=await(await route.GET(new Request(url),ctx)).json();
 expect(registry.documents.find((d:{docKey:string})=>d.docKey===f.key)).toMatchObject({version:1});
 const response=await post(f.command());expect(response.status).toBe(200);const q=(await response.json()).quote;expect(q).toMatchObject({operation:'edit',type:'blog_article',blogQuotaMaximum:0,confirmationRequired:true});expect(q.selectedBlocks.map((b:{id:string})=>b.id)).toEqual(['p1']);expect(getArticle(f.pid,f.articleId)).toEqual(before);expect(all('SELECT id FROM jobs WHERE project_id=?',f.pid)).toHaveLength(0);
 const cmd={action:'confirm',quoteId:q.id,confirmation:true,requestId:id()},confirmed=await(await post(cmd)).json(),again=await(await post(cmd)).json();expect(again.job.id).toBe(confirmed.job.id);expect(confirmed.job.type).toBe('agent.content.edit');
 const {m}=await execute(),received=await(await route.GET(new Request(url+'?receipt='+q.id),ctx)).json();expect(received).toMatchObject({delivered:true,operation:'edit',output:{blogArticle:{id:f.articleId,proved:true,isCurrent:true}}});
 const current=latestContent(f.pid,f.key)!,article=getArticle(f.pid,f.articleId)!;expect(current.version.version).toBe(2);expect(current.doc.blocks[2]).toEqual(f.doc.blocks[2]);expect(article.body_html).toContain('notre équipe pour un examen');expect(article.body_html).toContain('Ce paragraphe client doit rester entier.');expect(article.slug).toBe(before.slug);expect(article.cover_asset_id).toBe(before.cover_asset_id);expect(article.published_url).toBeNull();expect(all('SELECT id FROM blog_articles WHERE project_id=?',f.pid)).toHaveLength(1);expect(contentVersionDoc(f.pid,f.key,1)).toEqual(f.doc);expect(quotaView(f.u.id,'blog',f.pid)).toEqual(quota);expect(m.log.rewrites).toBe(1);expect(fetch).not.toHaveBeenCalled();
 expect((await post(cmd)).status).toBe(200);expect(all('SELECT id FROM jobs WHERE project_id=?',f.pid)).toHaveLength(1);
});
it.each(['body_html','meta_description','slug','deleted_at'] as const)('article humain changé après devis (%s) : refus avant achat',async field=>{
 const f=await fixture(),q=await f.quote();run(`UPDATE blog_articles SET ${field}=? WHERE id=?`,field==='deleted_at'?Date.now():'Correction humaine prioritaire',f.articleId);expect(()=>confirmContent(f.u,f.c.id,q.id)).toThrow();expect(all('SELECT id FROM jobs WHERE project_id=?',f.pid)).toHaveLength(0);expect(latestContent(f.pid,f.key)!.version.version).toBe(1);
});
it('article modifié pendant acquisition : tentative conservée, aucune application au document ni faux reçu',async()=>{
 const f=await fixture(),q=await f.quote();confirmContent(f.u,f.c.id,q.id);const m=simulated(),rewrite=m.deps.rewrite;m.deps.rewrite=async(...a)=>{const r=await rewrite(...a);run('UPDATE blog_articles SET body_html=? WHERE id=?','<p>Ma version humaine</p>',f.articleId);return r;};await expect(execute(m)).rejects.toThrow();expect(m.log.rewrites).toBe(1);expect(getArticle(f.pid,f.articleId)!.body_html).toBe('<p>Ma version humaine</p>');expect(latestContent(f.pid,f.key)!.version.version).toBe(1);expect(contentReceipt(f.u,f.c.id,q.id)).toMatchObject({delivered:false,state:'failed',output:{present:true,verdict:'RETRY'}});
});
it('le dernier garde annule la transaction sur une modification native tardive',async()=>{
 const f=await fixture(),q=await f.quote();confirmContent(f.u,f.c.id,q.id);const m=simulated();m.deps.beforeFinalSave=()=>{run('UPDATE blog_articles SET body_html=? WHERE id=?','<p>Dernière correction humaine</p>',f.articleId);};await expect(execute(m)).rejects.toThrow();expect(getArticle(f.pid,f.articleId)!.body_html).toContain('notre atelier');expect(latestContent(f.pid,f.key)!.version.version).toBe(1);expect(contentReceipt(f.u,f.c.id,q.id).delivered).toBe(false);
});
it('droits révoqués après accord : refus worker avant tout appel, entitlements Blog conservés',async()=>{
 const f=await fixture(),q=await f.quote();confirmContent(f.u,f.c.id,q.id);run("UPDATE subscriptions SET plan='creer' WHERE project_id=?",f.pid);expect(()=>assertJobEntitlements('agent.content.edit',f.pid,{contentType:'blog_article'})).toThrow();const m=simulated();await expect(execute(m)).rejects.toThrow();expect(m.log.rewrites).toBe(0);expect(getArticle(f.pid,f.articleId)!.body_html).toContain('atelier');
});
it('retoucher un article acquis ne réserve pas un nouveau quota même lorsque le quota neuf est épuisé',async()=>{
 const f=await fixture(),view=quotaView(f.u.id,'blog',f.pid);consumeQuota(f.u.id,'blog',view.left,'synthetic-full-blog-quota-'+f.pid,f.pid);const before=quotaView(f.u.id,'blog',f.pid),q=await f.quote();confirmContent(f.u,f.c.id,q.id);await execute();expect(quotaView(f.u.id,'blog',f.pid)).toEqual(before);expect(all('SELECT id FROM blog_articles WHERE project_id=?',f.pid)).toHaveLength(1);
});
it('expiration, identifiant forgé et article d’un autre projet restent refusés',async()=>{
 const f=await fixture(),q=await f.quote(),row=one<{value:string}>("SELECT value FROM memory WHERE project_id=? AND key=?",f.pid,'agent.content.tool.'+q.id)!,saved=JSON.parse(row.value);saved.expiresAt=Date.now()-1;run('UPDATE memory SET value=? WHERE project_id=? AND key=?',JSON.stringify(saved),f.pid,'agent.content.tool.'+q.id);expect(()=>confirmContent(f.u,f.c.id,q.id)).toThrow();expect(()=>confirmContent(f.u,f.c.id,'forged')).toThrow();const other=await fixture();await expect(quoteContentEdit(other.u,other.c.id,{...other.command(),docKey:f.key})).rejects.toMatchObject({status:404});expect(all('SELECT id FROM jobs WHERE project_id=?',f.pid)).toHaveLength(0);
});
it('sans article natif correspondant ou drapeau Blog fermé : aucune éligibilité ni création arbitraire',async()=>{
 const f=await fixture();run('DELETE FROM blog_articles WHERE id=?',f.articleId);expect(contentRegistry(f.u,f.c.id).documents.some(d=>d.docKey===f.key)).toBe(false);await expect(f.quote()).rejects.toThrow();vi.stubEnv('STUDIO_CONVERSATION_BLOG','0');await expect(f.quote()).rejects.toThrow();expect(ContentToolCommandSchema.safeParse({...f.command(),action:'quote',type:'blog_article',pageKey:f.doc.page.key}).success).toBe(false);
});
it('réponse perdue après sauvegarde : reprend le résultat acquis sans budget neuf ni second appel',async()=>{
 const f=await fixture(),q=await f.quote();confirmContent(f.u,f.c.id,q.id);const j=claimNext(['agent.content.edit'])!,m=simulated(),first=await runContentTool(new JobContext(j),m.deps);run("UPDATE jobs SET checkpoint='{}' WHERE id=?",j.id);run('UPDATE wallets SET monthly_used=monthly_allowance WHERE user_id=?',projectAccountKey(f.pid));const second=await runContentTool(new JobContext(getJob(j.id)!),m.deps);expect(second.output).toEqual(first.output);completeJob(j.id,second);expect(contentReceipt(f.u,f.c.id,q.id).delivered).toBe(true);expect(m.log.rewrites).toBe(1);expect(latestContent(f.pid,f.key)!.version.version).toBe(2);
});
it('HTTP auth, CSRF, confirmation forcée ou commande étrangère ne créent rien',async()=>{
 const f=await fixture(),route=await import('@/app/api/studio-agent/conversations/[cid]/content/route'),url='http://localhost/api/studio-agent/conversations/'+f.c.id+'/content',ctx={params:Promise.resolve({cid:f.c.id})};expect((await route.GET(new Request(url),ctx)).status).toBe(401);session=f.u;
 const post=(body:unknown,origin='http://localhost')=>route.POST(new Request(url,{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)}),ctx);expect((await post(f.command(),'https://foreign.invalid')).status).toBe(403);expect((await post({...f.command(),maxCostEur:100})).status).toBe(400);expect((await post({action:'confirm',quoteId:'forged',confirmation:false,requestId:id()})).status).toBe(400);session=await account();expect((await route.GET(new Request(url),ctx)).status).toBe(404);expect(all('SELECT id FROM jobs WHERE project_id=?',f.pid)).toHaveLength(0);
});
it('une retouche de paragraphes ne remet pas un ancien slug à la place de l’adresse native acquise',async()=>{
 const f=await fixture();run('UPDATE blog_articles SET slug=? WHERE id=?','adresse-native-a-conserver',f.articleId);const q=await f.quote();confirmContent(f.u,f.c.id,q.id);await execute();expect(getArticle(f.pid,f.articleId)!.slug).toBe('adresse-native-a-conserver');expect(contentReceipt(f.u,f.c.id,q.id).delivered).toBe(true);
});
it('la retouche native exacte reste gratuite, avec le même article et son adresse conservée',async()=>{
 const f=await fixture(),quota=quotaView(f.u.id,'blog',f.pid);run('UPDATE blog_articles SET slug=? WHERE id=?','adresse-native-gratuite',f.articleId);const r=await editContentV2(null,f.pid,f.key,'Remplace "atelier" par "équipe"',{selected:['p1'],expectedVersion:1});expect(r).toMatchObject({applied:true,by:'local',costMicro:0});expect(getArticle(f.pid,f.articleId)).toMatchObject({slug:'adresse-native-gratuite'});expect(getArticle(f.pid,f.articleId)!.body_html).toContain('notre équipe');expect(quotaView(f.u.id,'blog',f.pid)).toEqual(quota);expect(all('SELECT id FROM jobs WHERE project_id=?',f.pid)).toHaveLength(0);expect(fetch).not.toHaveBeenCalled();
});
it.each(['meta_description','body_html'] as const)('onRetained après document acquis : une correction humaine %s reste conservée sans faux reçu',async field=>{
 const f=await fixture(),q=await f.quote();confirmContent(f.u,f.c.id,q.id);const m=simulated();let injected=false,paired=false;
 m.deps.onRetained=s=>{if(s.docKey===f.key){paired=getArticle(f.pid,f.articleId)!.body_html.includes('notre équipe pour un examen');injected=true;run(`UPDATE blog_articles SET ${field}=? WHERE id=?`,'Correction humaine après acquisition',f.articleId);}};
 await expect(execute(m)).rejects.toThrow();expect(injected).toBe(true);expect(paired).toBe(true);expect(getArticle(f.pid,f.articleId)![field]).toBe('Correction humaine après acquisition');expect(contentReceipt(f.u,f.c.id,q.id).delivered).toBe(false);expect(m.log.rewrites).toBe(1);
});
it.each(['local','ai'] as const)('échec du rangement Blog %s : rollback du document source et article intact',async mode=>{
 const f=await fixture(),before=getArticle(f.pid,f.articleId),original=nativeBlog.saveBlogDraftV2,m=simulated();
 vi.spyOn(nativeBlog,'saveBlogDraftV2').mockImplementation((...a)=>{if(a[1]===f.key)throw Error('Panne simulée du rangement Blog');return original(...a);});
 if(mode==='local')await expect(editContentV2(null,f.pid,f.key,'Remplace "atelier" par "équipe"',{selected:['p1'],expectedVersion:1},m.deps)).rejects.toThrow('Panne simulée');
 else{const q=await f.quote();confirmContent(f.u,f.c.id,q.id);await expect(execute(m)).rejects.toThrow('Panne simulée');expect(contentReceipt(f.u,f.c.id,q.id)).toMatchObject({delivered:false,state:'failed',output:{present:true,verdict:'RETRY'}});}
 expect(latestContent(f.pid,f.key)!.version.version).toBe(1);expect(getArticle(f.pid,f.articleId)).toEqual(before);
});
it('le raccordement Blog nécessite CONTENT et BLOG ; flag fermé sans annonce ni document éditable',async()=>{
 const f=await fixture();expect(contentRegistry(f.u,f.c.id).documents.some(d=>d.docKey===f.key)).toBe(true);expect(studioOperationCatalogue(f.pid,true).rows.find(o=>o.id==='blog.edit')!.connectionEnabled).toBe(true);
 vi.stubEnv('STUDIO_CONVERSATION_BLOG','0');expect(contentRegistry(f.u,f.c.id)).toMatchObject({blogEnabled:false});expect(contentRegistry(f.u,f.c.id).documents.some(d=>d.docKey===f.key)).toBe(false);expect(studioOperationCatalogue(f.pid,true).rows.find(o=>o.id==='blog.edit')!.connectionEnabled).toBe(false);await expect(f.quote()).rejects.toMatchObject({status:404});
 vi.stubEnv('STUDIO_CONVERSATION_BLOG','1');vi.stubEnv('STUDIO_CONVERSATION_CONTENT','0');expect(studioOperationCatalogue(f.pid,true).rows.find(o=>o.id==='blog.edit')!.connectionEnabled).toBe(false);
});
