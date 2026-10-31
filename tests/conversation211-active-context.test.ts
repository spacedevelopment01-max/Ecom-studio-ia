/** D5 : vraies références natives, aucun appel LLM ni lecture/vision de média. */
import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {account,project,sender,emptySpend} from './conversation209-fixtures';
import {openProjectConversation,conversationView,submitConversation} from '@/lib/orchestrator/conversation';
import {ownedConversation,metaOf} from '@/lib/orchestrator/conversation/store';
import {cognitiveContext} from '@/lib/orchestrator/conversation/intelligence-context';
import {ActiveContextSchema} from '@/lib/orchestrator/conversation/active-context-contract';
import {resolveActiveContext,observedActiveContext} from '@/lib/orchestrator/conversation/active-context';
import {seedAgentUiSite} from '../scripts/agent211-ui-fixtures';
import {currentTheme,saveThemeVersion} from '@/lib/projects';
import {themeToolContext} from '@/lib/orchestrator/conversation/theme-tool-context';
import {id,one,run} from '@/lib/db';
import {stateOf,commitState} from '@/lib/preparation/store';
import {createCognitiveQuote,confirmCognitiveQuote,runCognitiveJob} from '@/lib/orchestrator/conversation/intelligence';
import {claimNext,JobContext,failJob} from '@/lib/jobs';
const fake=vi.hoisted(()=>({reply:null as unknown,calls:0}));
vi.mock('@/lib/ai/config',async original=>({...await original() as object,activeProviderKey:()=> 'FOURNISSEUR FICTIF SANS SECRET'}));
vi.mock('@/lib/ai/llm',async original=>({...await original() as object,textProviderReady:()=>true,llmJson:async()=>{fake.calls++;return fake.reply;}}));
beforeEach(()=>{fake.calls=0;fake.reply=null;for(const key of ['STUDIO_CONVERSATION_LOT_A','STUDIO_CONVERSATION_AI','STUDIO_CONVERSATION_CONTEXT'])vi.stubEnv(key,'1');vi.stubGlobal('fetch',vi.fn(()=>{throw Error('Aucun réseau D5');}));});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
async function fixture(business:'products'|'services'='products'){
 const u=await account(),pid=project(u,business),c=openProjectConversation(u,pid),send=sender(u,c.id);await send({action:'message',text:business==='products'?'Je propose des pièces pour réparer les vélos.':'Je restaure des meubles confiés par les clients, sur devis.'});await seedAgentUiSite(pid,business);const theme=currentTheme(pid)!,target=themeToolContext(pid).targets!.find(t=>t.template==='index')!;
 return{u,pid,c,send,theme,selected:{tab:'boutique' as const,target:{kind:'theme-section' as const,versionId:theme.version.id,template:'index',section:target.section}}};
}
describe('#211 D5 — cible active exacte dans la même conversation',()=>{
 it.each(['products','services']as const)('résout, conserve et relit une section sans changer le Site ni dépenser (%s)',async business=>{
  const f=await fixture(business),before=emptySpend(),native=structuredClone(stateOf(f.pid)),themeBefore=currentTheme(f.pid);
  const result=await f.send({action:'message',text:'Cette section : que peut-on améliorer ?',context:f.selected});
  expect(result.activeContext?.current).toMatchObject({state:'resolved',kind:'theme-section',selection:f.selected,isCurrent:true,contentRead:false});
  expect(conversationView(f.u,f.c.id).activeContext?.current).toEqual(result.activeContext?.current);
  expect(metaOf(ownedConversation(f.u,f.c.id)).activeContext).toEqual(f.selected);
  const ctx=cognitiveContext(ownedConversation(f.u,f.c.id));expect(ctx.context.activeContext).toEqual(result.activeContext?.current);expect(cognitiveContext(ownedConversation(f.u,f.c.id)).fingerprint).toBe(ctx.fingerprint);
  expect(currentTheme(f.pid)).toEqual(themeBefore);expect(stateOf(f.pid)!.stages.research).toBeUndefined();expect(stateOf(f.pid)!.stages.brand).toBeUndefined();expect(stateOf(f.pid)!.stages.brief?.data.input.target).toBe(native!.stages.brief?.data.input.target);expect(emptySpend()).toEqual(before);
 });
 it('conserve le contexte après une étape déjà validée sans réécrire la fiche',async()=>{const f=await fixture();commitState(f.pid,stateOf(f.pid)!.revision,s=>{s.stages.brief!.status='approved';});const previous=structuredClone(stateOf(f.pid));await f.send({action:'message',text:'Explique cette section.',context:f.selected});expect(stateOf(f.pid)).toEqual(previous);expect(conversationView(f.u,f.c.id).activeContext?.current?.state).toBe('resolved');});
 it('n’utilise pas un ID de thème ou de média appartenant à un autre projet',async()=>{
  const f=await fixture(),other=await fixture(),before=conversationView(f.u,f.c.id).revision;
  await expect(f.send({action:'message',text:'Cette section',context:other.selected})).rejects.toMatchObject({status:404});
  const asset=one<{id:string;version:number}>('SELECT id,version FROM assets WHERE project_id=?',other.pid)!;
  await expect(f.send({action:'message',text:'Cette image',context:{tab:'images',target:{kind:'asset',assetId:asset.id,version:asset.version}}})).rejects.toMatchObject({status:404});
  expect(conversationView(f.u,f.c.id).revision).toBe(before);
 });
 it('garde une référence historique sans la substituer à la nouvelle version',async()=>{
  const f=await fixture();await f.send({action:'message',text:'Cette section',context:f.selected});const spec=structuredClone(f.theme.spec);spec.templates.index.sections[f.selected.target.section].settings.heading='Titre modifié manuellement';const newer=saveThemeVersion(f.pid,spec,'Modification de recette','user');
  const read=conversationView(f.u,f.c.id).activeContext?.current;expect(read).toMatchObject({state:'resolved',selection:f.selected,isCurrent:false,version:1});expect(currentTheme(f.pid)!.version.id).toBe(newer.id);expect(cognitiveContext(ownedConversation(f.u,f.c.id)).context.activeContext).toEqual(read);
 });
 it('résout une page réellement rendue, refuse une URL étrangère ou une page inventée',async()=>{
  const f=await fixture(),c=ownedConversation(f.u,f.c.id),page={tab:'boutique',target:{kind:'theme-page',versionId:f.theme.version.id,path:'/'}};
  expect(resolveActiveContext(c,page)).toMatchObject({kind:'theme-page',template:'index',isCurrent:true,contentRead:false});
  for(const path of ['//evil.invalid','https://evil.invalid','/pages/inexistante','/?version=autre'])expect(()=>resolveActiveContext(c,{...page,target:{...page.target,path}})).toThrow();
 });
 it('refuse une section masquée, un bloc absent de l’ordre et une combinaison onglet/cible incohérente',async()=>{
  const f=await fixture(),spec=structuredClone(f.theme.spec),section=spec.templates.index.sections[f.selected.target.section];section.blocks={invisible:{type:'text',settings:{text:'non rendu'}}};section.block_order=[];const v=saveThemeVersion(f.pid,spec,'Bloc hors rendu','user'),c=ownedConversation(f.u,f.c.id),selection={...f.selected,target:{...f.selected.target,versionId:v.id,block:'invisible'}};
  expect(()=>resolveActiveContext(c,selection)).toThrow();section.disabled=true;const hidden=saveThemeVersion(f.pid,spec,'Section masquée','user');expect(()=>resolveActiveContext(c,{...f.selected,target:{...f.selected.target,versionId:hidden.id}})).toThrow();expect(()=>resolveActiveContext(c,{...f.selected,tab:'images'})).toThrow();
 });
 it('respecte le repli natif vers les clés des blocs quand leur ordre est absent',async()=>{const f=await fixture(),spec=structuredClone(f.theme.spec),section=spec.templates.index.sections[f.selected.target.section];section.blocks={present:{type:'text',settings:{text:'Contenu fictif'}}};delete section.block_order;const v=saveThemeVersion(f.pid,spec,'Ordre natif implicite','user');expect(resolveActiveContext(ownedConversation(f.u,f.c.id),{...f.selected,target:{...f.selected.target,versionId:v.id,block:'present'}})).toMatchObject({kind:'theme-section',blockType:'text'});});
 it('résout uniquement les métadonnées d’un média puis signale sa suppression ou nouvelle version',async()=>{
  const f=await fixture(),asset=one<{id:string;version:number}>('SELECT id,version FROM assets WHERE project_id=?',f.pid)!,selection={tab:'images' as const,target:{kind:'asset' as const,assetId:asset.id,version:asset.version}};await f.send({action:'message',text:'Cette image',context:selection});expect(conversationView(f.u,f.c.id).activeContext?.current).toMatchObject({state:'resolved',kind:'asset',visualQuality:'not_reviewed',contentRead:false});
  run('UPDATE assets SET version=version+1 WHERE id=?',asset.id);expect(observedActiveContext(ownedConversation(f.u,f.c.id),selection)).toMatchObject({state:'unavailable',selection,reason:'conversation_target_stale'});
  run('UPDATE assets SET deleted_at=1 WHERE id=?',asset.id);expect(observedActiveContext(ownedConversation(f.u,f.c.id),selection)).toMatchObject({state:'unavailable',reason:'conversation_target_not_found'});
 });
 it('conserve la sélection valide lors du changement d’onglet sans modifier la clientèle (A2)',async()=>{const f=await fixture();await f.send({action:'message',text:'Cette section',context:f.selected});await f.send({action:'message',text:'Comment préparer une vidéo ?',context:{tab:'videos',target:null}});expect(conversationView(f.u,f.c.id).activeContext?.current).toMatchObject({kind:'theme-section',selection:f.selected});expect(conversationView(f.u,f.c.id).activeContext?.presentation?.activeTab).toBe('videos');expect(stateOf(f.pid)!.stages.brief?.data.input.target).toBe('');});
 it('refuse un contexte forgé et un client périmé avant toute mutation',async()=>{
  const f=await fixture(),v=conversationView(f.u,f.c.id),command={action:'message',revision:v.revision,projectRevision:v.projectRevision,requestId:id(),text:'Cette section',context:f.selected};await submitConversation(f.u,f.c.id,command);const again=await submitConversation(f.u,f.c.id,command);expect(again.revision).toBe(v.revision+1);await expect(submitConversation(f.u,f.c.id,{...command,requestId:id()})).rejects.toMatchObject({status:409});expect(ActiveContextSchema.safeParse({...f.selected,authorize:true}).success).toBe(false);expect(ActiveContextSchema.safeParse({...f.selected,target:{...f.selected.target,ops:[]}}).success).toBe(false);
 });
 it('reste fermé par défaut et conserve le chemin manuel',async()=>{const f=await fixture();vi.stubEnv('STUDIO_CONVERSATION_CONTEXT','0');await expect(f.send({action:'message',text:'Cette section',context:f.selected})).rejects.toMatchObject({status:404});expect(conversationView(f.u,f.c.id).activeContext).toBeUndefined();expect(currentTheme(f.pid)!.version.id).toBe(f.theme.version.id);});
 it.each(['historical','missing']as const)('refuse dans le worker une proposition qui substituerait une cible courante à la cible %s',async kind=>{
  const f=await fixture();await f.send({action:'message',text:'Cette section',context:f.selected});const newer=saveThemeVersion(f.pid,f.theme.spec,'Nouvelle version manuelle de recette','user');if(kind==='missing')run('DELETE FROM theme_versions WHERE id=?',f.theme.version.id);
  fake.reply={message:'Proposition simulée sur une autre version, à refuser.',status:'answer',business:null,businessEvidence:null,question:null,proposedChanges:[],knowledgeSourceIds:[],proposedTools:['theme.edit'],themePlan:{tool:'theme.edit',versionId:newer.id,summary:'Substitution non autorisée à refuser.',ops:[{op:'set_setting',template:'index',section:f.selected.target.section,key:'heading',value:'Une substitution à refuser.'}]},actionsExecuted:false};
  const view=conversationView(f.u,f.c.id),q=createCognitiveQuote(f.u,f.c.id,{revision:view.revision,projectRevision:view.projectRevision});confirmCognitiveQuote(f.u,f.c.id,q.id,id());const job=claimNext(['agent.reason'])!;try{await expect(runCognitiveJob(new JobContext(job))).rejects.toThrow('conversation_target_requires_clarification');}finally{failJob(job,new Error('Refus contrôlé de recette'),{permanent:true});}
  expect(fake.calls).toBe(1);expect(currentTheme(f.pid)!.version.id).toBe(newer.id);expect(one<{n:number}>("SELECT COUNT(*) n FROM jobs WHERE project_id=? AND type!='agent.reason'",f.pid)!.n).toBe(0);expect(conversationView(f.u,f.c.id).intelligence?.state).toBe('failed');
 });
});
