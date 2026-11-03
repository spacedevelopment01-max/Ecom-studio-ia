/**
 * #301 C03 — anciens projets (A1, lecture seule) : les cartes gratuites Site et Fichiers acceptent seulement les
 * opérations que le serveur ouvre (`recovery.localEdits.ops`, contrat #313 de Codex). Moteur inchangé ; tout le reste
 * du projet reste en lecture seule.
 */
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {historicalProject} from './conversation284-fixtures';
import {openProjectConversation,conversationView,submitConversation} from '@/lib/orchestrator/conversation';
import {submitContext,contextView} from '@/lib/orchestrator/conversation/context-session';
import {getAsset,createFolder,type Asset} from '@/lib/library';
import {id,one} from '@/lib/db';
import {localEditAllowed} from '@/lib/existing-local-edits';
import {createLocalFilesConfirmation,hasNativeFilesReceipt} from '@/lib/local-files-confirmation-client';
import type {ConversationView} from '@/lib/orchestrator/conversation/contract';

const FLAGS=['LOT_A','AI','CONTEXT','LOCAL_SITE','FILES','EXISTING_LOCAL'];
beforeEach(()=>{for(const k of FLAGS)vi.stubEnv('STUDIO_CONVERSATION_'+k,'1');vi.stubGlobal('fetch',vi.fn(()=>{throw Error('Fournisseur interdit sur ancien projet');}));});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});

const view=(over:Partial<ConversationView>)=>({schema:'studio-conversation-1',id:'c',projectId:'p',revision:1,projectRevision:null,mode:'local',progress:'review',message:'',...over}) as unknown as ConversationView;

it('règle : un ancien projet n’ouvre que les opérations listées par le serveur ; un projet préparé reste ouvert',()=>{
 const a1=(ops:string[]|null)=>view({readOnlyReason:'Lecture seule',recovery:{schema:'existing-project-recovery-1',state:'read-only',...(ops?{localEdits:{schema:'existing-local-free-1',ops,confirmationRequired:true,costEur:0,providerCalls:0,financialConsent:false}}:{})}} as never);
 expect(localEditAllowed(a1(['files']),'files')).toBe(true);
 expect(localEditAllowed(a1(['files']),'local-site')).toBe(false);
 expect(localEditAllowed(a1(['local-site','files']),'local-site')).toBe(true);
 expect(localEditAllowed(a1(null),'files')).toBe(false);
 expect(localEditAllowed(view({}),'files')).toBe(true);
 expect(localEditAllowed(view({readOnlyReason:'Projet verrouillé'}),'files')).toBe(false);
});

async function fixture(){
 const f=await historicalProject('products'),c=openProjectConversation(f.u,f.pid);
 const asset=one<Asset>("SELECT * FROM assets WHERE project_id=? AND user_id=? AND deleted_at IS NULL AND status!='rejected' AND COALESCE(role,'')!='theme-render-capture' LIMIT 1",f.pid,f.u.id)!;
 createFolder(f.pid,'Archives choisies',null);
 submitContext(f.u,c.id,{action:'select',revision:contextView(f.u,c.id).revision,requestId:id(),context:{projectId:f.pid,tab:'fichiers',target:{kind:'asset',assetId:asset.id,version:getAsset(asset.id)!.version}}});
 const v0=conversationView(f.u,c.id);
 await submitConversation(f.u,c.id,{action:'message',revision:v0.revision,projectRevision:v0.projectRevision,requestId:id(),text:'Renomme ce fichier en « archive relue.png »'});
 let v=conversationView(f.u,c.id);const bodies:unknown[]=[];
 const transport=vi.fn(async(url:unknown,init?:RequestInit)=>{const cmd=init?.body?JSON.parse(String(init.body)):undefined;try{let r;if(String(url).endsWith('/context'))r=cmd?submitContext(f.u,c.id,cmd):contextView(f.u,c.id);else{if(cmd)bodies.push(cmd);r=cmd?await submitConversation(f.u,c.id,cmd):conversationView(f.u,c.id);}return Response.json(r);}catch(e){const err=e as Error&{status?:number};return Response.json({error:err.message},{status:err.status??500});}});
 const client=createLocalFilesConfirmation({conversationId:c.id,fetch:transport as unknown as typeof fetch,view:()=>v,onView:x=>{v=x;},onState:vi.fn(),onApplied:vi.fn(),uuid:id});
 return{f,c,asset,client,bodies,get:()=>v};
}

it('ancien projet : rangement gratuit d’un fichier proposé puis confirmé, reçu relu, projet toujours en lecture seule',async()=>{
 const t=await fixture();
 expect(t.get().recovery?.localEdits?.ops).toContain('files');
 expect(t.get().readOnlyReason).toBeTruthy();
 expect(t.get().localFiles).toMatchObject({state:'proposed',costEur:0,providerCalls:0});
 await t.client.confirm();
 expect(t.bodies).toHaveLength(1);
 expect(hasNativeFilesReceipt(t.get())).toBe(true);
 expect(getAsset(t.asset.id)!.name).toBe('archive relue.png');
 expect(t.get().recovery?.state).toBe('read-only');
 expect(one<{n:number}>('SELECT COUNT(*) n FROM ai_calls')!.n).toBe(0);
});

it('exception fermée côté serveur : aucune confirmation n’est envoyée, rien n’est renommé',async()=>{
 const t=await fixture();vi.stubEnv('STUDIO_CONVERSATION_EXISTING_LOCAL','0');
 await t.client.refresh();await t.client.confirm();
 expect(t.bodies).toHaveLength(0);
 expect(getAsset(t.asset.id)!.name).toBe(t.asset.name);
});

it('raccordement : les deux cartes et leurs transports passent par la même règle',()=>{
 const read=(p:string)=>fs.readFileSync(path.resolve(import.meta.dirname,'..',p),'utf8');
 for(const [file,op] of [['src/components/studio/conversation-local-site.tsx','local-site'],['src/components/studio/conversation-local-files.tsx','files'],['src/lib/local-site-confirmation-client.ts','local-site'],['src/lib/local-files-confirmation-client.ts','files']]){
  const s=read(file);expect(s).toContain(`localEditAllowed(`);expect(s).toContain(`'${op}'`);expect(s).not.toMatch(/if\(view\.recovery\|\||if\(v\.recovery\|\|/);
 }
});
