/** #301 : métadonnées acquises d'une page native, sans achat ni réécriture de son corps. */
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {unzipSync,strFromU8} from 'fflate';
import {account,project,sender} from './conversation209-fixtures';
import {seedAgentUiSite} from '../scripts/agent211-ui-fixtures';
import {loadProject,saveServices,currentTheme,saveThemeVersion,themeVersion} from '@/lib/projects';
import {all} from '@/lib/db';
import {contentKey,saveContentVersion,contentVersionDoc} from '@/lib/seo-v2/store';
import {deliverContent} from '@/lib/seo-v2/theme-delivery';
import {renderPage} from '@/lib/theme/render';
import {getAsset,assetData} from '@/lib/library';
import {cmsExport} from '@/lib/cms-v2/export';
import type {ContentDoc} from '@/lib/seo-v2/types';
import {openProjectConversation,conversationView} from '@/lib/orchestrator/conversation';
import {quoteContent,confirmContent,runContentTool,contentReceipt} from '@/lib/orchestrator/conversation/content-tool-execution';
import {claimNext,JobContext,completeJob} from '@/lib/jobs';
import {mockSeoDeps} from './seo-v2-mock';

vi.mock('@/lib/ai/config',async orig=>({...await orig<object>(),activeProviderKey:()=> 'SIMULATED ONLY'}));
vi.mock('@/lib/ai/llm',async orig=>({...await orig<object>(),textProviderReady:()=>true}));
beforeEach(()=>{for(const k of ['LOT_A','AI','CONTEXT','SPECIALISTS','TOOLS','CONTENT'])vi.stubEnv('STUDIO_CONVERSATION_'+k,'1');vi.stubGlobal('fetch',vi.fn(()=>{throw Error('Aucun fournisseur ou CMS réel autorisé');}));});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
const targets=['service:atelier','brand:a-propos','local:zone'] as const;
async function fixture(target:typeof targets[number]='service:atelier',conversation=false){
 const u=await account(),pid=project(u,'services'),c=conversation?openProjectConversation(u,pid):null;await seedAgentUiSite(pid,'services');
 const p=loadProject(pid);saveServices(pid,{...p.services,area:'Nantes',services:[{key:'atelier',name:'Aménagement de vans',description:'Étude sur devis après examen.',source:'client'}]});
 const spec=structuredClone(currentTheme(pid)!.spec),handle='page-parite',suffix='parite';
 spec.templates['page.'+suffix]={order:['body'],sections:{body:{type:'rich-text',settings:{},blocks:{title:{type:'heading',settings:{text:'Titre manuel conservé',size:'h2'}},text:{type:'text',settings:{text:'<p>Corps manuel conservé</p>'}}},block_order:['title','text']}}};
 spec.store.pages.push({handle,title:'Page manuelle',contentTarget:target,template_suffix:suffix,body_html:'<p>Corps manuel conservé</p>',seo:{title:'Ancien titre',description:'Ancienne description'}});
 const initial=saveThemeVersion(pid,spec,'Page de recette synthétique','user'),doc:ContentDoc={version:1,type:'metadata',lang:'fr',page:{key:target,title:'Métadonnées demandées',kind:target.startsWith('service:')?'service':target.startsWith('brand:')?'brand':'local',status:'existing',url:'/pages/'+handle},primaryKeyword:null,meta:{seoTitle:'Aménagement de vans — SEO demandé',metaDescription:'La description exacte demandée pour cette page de vans.',slug:'ignore-ce-slug',canonical:null,robots:'index,follow'},blocks:[],schema:[],links:[],meta2:{source:'user',by:'local',runId:null,createdFrom:null}};
 const key=contentKey(pid,'metadata',target,'fr'),save=(d=doc,verdict:string|null=null)=>saveContentVersion(pid,key,d,{verdict});
 return{u,pid,c,target,handle,initial,doc,key,save,spec:structuredClone(spec)};
}
it.each(targets)('livre seulement le SEO de la page existante %s ; recharge, rendu et vrai ZIP concordent',async target=>{
 const f=await fixture(target),v=f.save(),before=structuredClone(f.spec),jobs=all('SELECT id FROM jobs'),calls=all('SELECT id FROM ai_calls');
 const traces=deliverContent(f.spec,loadProject(f.pid),'fr'),page=f.spec.store.pages.find(p=>p.handle===f.handle)!;
 expect(page.seo).toEqual({title:f.doc.meta.seoTitle,description:f.doc.meta.metaDescription});
 expect({...page,seo:before.store.pages.find(p=>p.handle===f.handle)!.seo}).toEqual(before.store.pages.find(p=>p.handle===f.handle));
 expect(f.spec.templates).toEqual(before.templates);expect(f.spec.files).toEqual(before.files);expect(f.spec.store.menus).toEqual(before.store.menus);
 expect(traces).toContainEqual(expect.objectContaining({docKey:f.key,version:v.version,target}));
 saveThemeVersion(f.pid,f.spec,'SEO acquis appliqué, corps conservé','user');
 expect(currentTheme(f.pid)!.spec.store.pages.find(p=>p.handle===f.handle)!.seo).toEqual(page.seo);
 expect(themeVersion(f.pid,f.initial.id)!.spec).toEqual(before);
 const rendered=await renderPage({spec:currentTheme(f.pid)!.spec,base:'/preview/recette',cart:[]},'/pages/'+f.handle,new URLSearchParams());
 expect(rendered.status).toBe(200);expect(rendered.html).toContain(f.doc.meta.seoTitle);expect(rendered.html).toContain(f.doc.meta.metaDescription);expect(rendered.html).toContain('Corps manuel conservé');
 const load=(id:string)=>{const a=getAsset(id);return a?{data:assetData(a),mime:a.mime,updated:a.created_at}:null;};
 const zip=unzipSync((await cmsExport('shopify',currentTheme(f.pid)!.spec,load,{projectId:f.pid})).zip),configuration=JSON.parse(strFromU8(zip['assets/es-studio.json']));
 expect(configuration.store.pages.find((p:{handle:string})=>p.handle===f.handle)).toEqual(page);
 expect(JSON.parse(strFromU8(zip['templates/page.parite.json']).replace(/^\s*\/\*[\s\S]*?\*\/\s*/,''))).toEqual(before.templates['page.parite']);
 expect(all('SELECT id FROM jobs')).toEqual(jobs);expect(all('SELECT id FROM ai_calls')).toEqual(calls);expect(fetch).not.toHaveBeenCalled();
});
it('sélectionne la dernière version utilisable de la bonne lignée, sans livrer une tentative refusée',async()=>{
 const f=await fixture(),first=f.save(),old=contentVersionDoc(f.pid,f.key,first.version);
 const wanted={...f.doc,meta:{...f.doc.meta,seoTitle:'Deuxième version acquise'}};const second=f.save(wanted);f.save({...wanted,meta:{...wanted.meta,seoTitle:'Tentative rejetée'}},'REJECTED');
 const traces=deliverContent(f.spec,loadProject(f.pid),'fr');expect(f.spec.store.pages.find(p=>p.handle===f.handle)!.seo!.title).toBe(wanted.meta.seoTitle);expect(traces).toContainEqual(expect.objectContaining({docKey:f.key,version:second.version}));expect(contentVersionDoc(f.pid,f.key,first.version)).toEqual(old);
});
it.each(['étranger','autre-langue','autre-cible','refusé','ambigu'] as const)('ne livre pas des métadonnées %s',async kind=>{
 const f=await fixture();if(kind==='étranger'){const other=await fixture();other.save();}else if(kind==='autre-langue')f.save({...f.doc,lang:'en'});else if(kind==='autre-cible')f.save({...f.doc,page:{...f.doc.page,key:'service:ailleurs'}});else f.save(f.doc,kind==='refusé'?'REJECTED':null);
 if(kind==='ambigu'){f.spec.store.pages.push({...f.spec.store.pages.find(p=>p.handle===f.handle)!,handle:'autre-adresse'});saveThemeVersion(f.pid,f.spec,'Association ambiguë de recette','user');}
 const before=structuredClone(f.spec.store.pages);deliverContent(f.spec,loadProject(f.pid),'fr');expect(f.spec.store.pages).toEqual(before);expect(fetch).not.toHaveBeenCalled();
});
it('une métadonnée seule ne crée jamais une page prévue sans page native associée',async()=>{
 const f=await fixture();f.save();f.spec.store.pages=f.spec.store.pages.filter(p=>p.handle!==f.handle);saveThemeVersion(f.pid,f.spec,'Page absente de recette','user');const before=structuredClone(f.spec);deliverContent(f.spec,loadProject(f.pid),'fr');expect(f.spec).toEqual(before);
});
it('SYNA : demande → devis sans effet → accord idempotent → worker simulé → reçu → SEO natif sans achat supplémentaire',async()=>{
 const f=await fixture('service:atelier',true),send=sender(f.u,f.c!.id),before=structuredClone(f.spec);
 await send({action:'message',text:'Rédige seulement le titre SEO et la description de la page Aménagement de vans, sans changer son corps ni son adresse.'});
 const view=conversationView(f.u,f.c!.id),quoted=await quoteContent(f.u,f.c!.id,{revision:view.revision,projectRevision:view.projectRevision!,type:'metadata',pageKey:f.target});
 expect(quoted.kind).toBe('quote');if(quoted.kind!=='quote')throw Error('Un devis natif attendu');
 expect(currentTheme(f.pid)!.spec).toEqual(before);expect(all('SELECT id FROM jobs WHERE project_id=?',f.pid)).toHaveLength(0);
 const a=confirmContent(f.u,f.c!.id,quoted.quote.id);expect(confirmContent(f.u,f.c!.id,quoted.quote.id).job!.id).toBe(a.job!.id);
 const job=claimNext(['agent.content.write'])!,deps=mockSeoDeps();expect(job.id).toBe(a.job!.id);completeJob(job.id,await runContentTool(new JobContext(job),deps.deps));
 const receipt=contentReceipt(f.u,f.c!.id,quoted.quote.id);expect(receipt.delivered).toBe(true);const output=receipt.output!,doc=contentVersionDoc(f.pid,output.docKey,output.version)!;
 const calls=deps.log.writes.length,traces=deliverContent(f.spec,loadProject(f.pid),'fr');expect(traces).toContainEqual(expect.objectContaining({docKey:output.docKey,version:output.version,target:f.target}));
 expect(f.spec.store.pages.find(p=>p.handle===f.handle)!.seo).toEqual({title:doc.meta.seoTitle,description:doc.meta.metaDescription});
 expect(f.spec.templates).toEqual(before.templates);expect(f.spec.store.pages.find(p=>p.handle===f.handle)!.body_html).toBe(before.store.pages.find(p=>p.handle===f.handle)!.body_html);
 expect(deps.log.writes).toHaveLength(calls);expect(calls).toBeGreaterThan(0);expect(fetch).not.toHaveBeenCalled();
});
