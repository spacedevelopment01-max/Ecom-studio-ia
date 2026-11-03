/**
 * #301 C24 — carte Fichiers de SYNA, côté interface (contrat #305 de Codex, moteur inchangé).
 * Le transport est exercé contre le vrai moteur de conversation (aucun simulacre métier) : proposition, accord explicite,
 * reçu relu, réponse perdue rejouée à l'identique, annulation par sélection A2, refus sans faux succès.
 */
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {account,project} from './conversation209-fixtures';
import {openProjectConversation,conversationView,submitConversation} from '@/lib/orchestrator/conversation';
import {contextView,submitContext} from '@/lib/orchestrator/conversation/context-session';
import {saveAsset,getAsset,createFolder,assetData} from '@/lib/library';
import {id,one} from '@/lib/db';
import {createLocalFilesConfirmation,hasNativeFilesReceipt,handlesFreeFiles,FILES_CHANGED_EVENT} from '@/lib/local-files-confirmation-client';
import type {ConversationView} from '@/lib/orchestrator/conversation/contract';

beforeEach(()=>{for(const k of ['LOT_A','CONTEXT','AI','FILES'])vi.stubEnv('STUDIO_CONVERSATION_'+k,'1');vi.stubGlobal('fetch',vi.fn(()=>{throw Error('Fournisseur interdit');}));});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});

async function fixture(text='Renomme ce fichier en « preuve finale.txt »'){
 const u=await account(),pid=project(u),c=openProjectConversation(u,pid);
 const a=await saveAsset({projectId:pid,userId:u.id,name:'source.txt',mime:'text/plain',data:Buffer.from('OCTETS SYNTHETIQUES'),origin:'upload'});
 const folder=createFolder(pid,'Documents validés',null);
 submitContext(u,c.id,{action:'select',revision:conversationView(u,c.id).revision,requestId:id(),context:{projectId:pid,tab:'fichiers',target:{kind:'asset',assetId:a.id,version:a.version}}});
 const v0=conversationView(u,c.id);
 let view=await submitConversation(u,c.id,{action:'message',revision:v0.revision,projectRevision:v0.projectRevision,requestId:id(),text});
 view=conversationView(u,c.id);
 let lose=false;const bodies:Record<string,unknown>[]=[],applied=vi.fn(),storage=new Map<string,string>();
 const transport=vi.fn(async(url:unknown,init?:RequestInit)=>{
  const cmd=init?.body?JSON.parse(String(init.body)):undefined;
  try{
   let result;
   if(String(url).endsWith('/context'))result=cmd?submitContext(u,c.id,cmd):contextView(u,c.id);
   else{if(cmd)bodies.push(cmd);result=cmd?await submitConversation(u,c.id,cmd):conversationView(u,c.id);}
   if(cmd&&lose){lose=false;throw new TypeError('réponse perdue après enregistrement');}
   return Response.json(result);
  }catch(e){if(e instanceof TypeError)throw e;const err=e as Error&{status?:number};return Response.json({error:err.message},{status:err.status??500});}
 });
 const options={conversationId:c.id,fetch:transport as unknown as typeof fetch,view:()=>view,onView:(v:ConversationView)=>{view=v;},onState:vi.fn(),onApplied:applied,storage:{getItem:(k:string)=>storage.get(k)??null,setItem:(k:string,v:string)=>{storage.set(k,v);},removeItem:(k:string)=>{storage.delete(k);}},uuid:id};
 return{u,pid,c,a,folder,bodies,applied,options,transport,client:createLocalFilesConfirmation(options),get:()=>view,lose:()=>{lose=true;}};
}

it('renommer : proposition gratuite, accord explicite, reçu relu, écran Fichiers prévenu une seule fois',async()=>{
 const t=await fixture(),bytes=assetData(getAsset(t.a.id)!);
 expect(t.get().localFiles).toMatchObject({state:'proposed',costEur:0,providerCalls:0,financialConsent:false,diff:{before:{name:'source.txt'},after:{name:'preuve finale.txt'}}});
 expect(handlesFreeFiles(t.get())).toBe(true);
 expect(getAsset(t.a.id)!.name).toBe('source.txt');
 await Promise.all([t.client.confirm(),t.client.confirm()]);
 expect(t.bodies).toHaveLength(1);
 expect(t.bodies[0]).toMatchObject({action:'confirm-files',confirmation:true,proposalId:expect.any(String)});
 expect(hasNativeFilesReceipt(t.get())).toBe(true);
 expect(getAsset(t.a.id)!.name).toBe('preuve finale.txt');
 expect(assetData(getAsset(t.a.id)!)).toEqual(bytes);
 expect(t.applied).toHaveBeenCalledTimes(1);
 expect(t.applied).toHaveBeenCalledWith({projectId:t.pid,assetId:t.a.id,name:'preuve finale.txt',folderId:null,receiptId:t.bodies[0].requestId});
 expect(one<{n:number}>('SELECT COUNT(*) n FROM ai_calls')!.n).toBe(0);
 expect(fetch).not.toHaveBeenCalled();
});

it('déplacer vers un dossier existant : le reçu porte le dossier relu',async()=>{
 const t=await fixture('Déplace ce fichier vers le dossier « Documents validés »');
 expect(t.get().localFiles).toMatchObject({state:'proposed',command:'move',folder:{id:t.folder.id,label:'Documents validés'}});
 await t.client.confirm();
 expect(getAsset(t.a.id)!.folder_id).toBe(t.folder.id);
 expect(t.applied).toHaveBeenCalledWith(expect.objectContaining({folderId:t.folder.id}));
});

it('réponse perdue après enregistrement puis remontage : même corps et même requestId, une seule écriture',async()=>{
 const t=await fixture();t.lose();await t.client.confirm();
 expect(t.client.getState().uncertain).toBe(true);
 expect(getAsset(t.a.id)!.name).toBe('preuve finale.txt');
 t.client.dispose();
 const retry=createLocalFilesConfirmation(t.options);
 expect(retry.getState().uncertain).toBe(true);
 await retry.confirm();
 expect(t.bodies).toHaveLength(2);
 expect(t.bodies[1]).toEqual(t.bodies[0]);
 expect(retry.getState().uncertain).toBe(false);
 expect(hasNativeFilesReceipt(t.get())).toBe(true);
});

it('réponse perdue : « Vérifier l’enregistrement » retrouve le reçu sans renvoyer de confirmation',async()=>{
 const t=await fixture();t.lose();await t.client.confirm();await t.client.refresh();
 expect(t.bodies).toHaveLength(1);
 expect(t.client.getState().uncertain).toBe(false);
 expect(hasNativeFilesReceipt(t.get())).toBe(true);
});

it('annuler avant l’accord : la proposition disparaît côté serveur, la cible reste, rien n’est écrit',async()=>{
 const t=await fixture(),selection=t.get().activeContext!.presentation!.selection;
 await t.client.cancel();
 expect(t.get().localFiles).toBeUndefined();
 expect(t.get().activeContext!.presentation!.selection).toEqual(selection);
 expect(getAsset(t.a.id)!.name).toBe('source.txt');
 await t.client.confirm();
 expect(t.bodies).toHaveLength(0);
 expect(t.client.getState().error).toMatch(/nouvelle proposition/);
});

it('modification humaine entre la proposition et l’accord : refus 409, aucun faux succès',async()=>{
 const t=await fixture();
 const {changeFileMetadata}=await import('@/lib/library-local-change');
 changeFileMetadata({assetId:t.a.id,projectId:t.pid,userId:t.u.id},{name:'Nom choisi à la main.txt'});
 await t.client.confirm();
 expect(hasNativeFilesReceipt(t.get())).toBe(false);
 expect(t.applied).not.toHaveBeenCalled();
 expect(t.client.getState().error).toMatch(/a changé/);
 expect(getAsset(t.a.id)!.name).toBe('Nom choisi à la main.txt');
});

it('« applied » sans reçu ni écriture confirmée ne vaut jamais succès',async()=>{
 const t=await fixture(),s=t.get().localFiles!;
 expect(hasNativeFilesReceipt({...t.get(),localFiles:{...s,state:'applied'}})).toBe(false);
 expect(hasNativeFilesReceipt({...t.get(),localFiles:{...s,state:'applied',actionsExecuted:true}})).toBe(false);
});

it.each([401,402,403,404])('HTTP %i : bloqué, aucune relance, aucun repli payant',async status=>{
 const t=await fixture(),denied=vi.fn(async()=>Response.json({error:'Accès indisponible'},{status}));
 const c=createLocalFilesConfirmation({...t.options,fetch:denied as unknown as typeof fetch});
 await c.confirm();
 expect(c.getState().blocked).toBe(true);
 expect(denied).toHaveBeenCalledTimes(1);
 expect(t.applied).not.toHaveBeenCalled();
});

it('drapeau fermé : aucune confirmation envoyée',async()=>{
 const t=await fixture();vi.stubEnv('STUDIO_CONVERSATION_FILES','0');
 await t.client.refresh();await t.client.confirm();
 expect(t.bodies).toHaveLength(0);
 expect(getAsset(t.a.id)!.name).toBe('source.txt');
});

it('démontage : une réponse tardive ne touche plus l’écran',async()=>{
 const t=await fixture();t.client.dispose();await t.client.confirm();
 expect(t.bodies).toHaveLength(0);expect(t.applied).not.toHaveBeenCalled();
});

it('raccordement : la conversation affiche la carte Fichiers, l’écran Fichiers désigne le fichier et se relit',()=>{
 const read=(p:string)=>fs.readFileSync(path.resolve(import.meta.dirname,'..',p),'utf8');
 const panel=read('src/components/studio/conversation-panel.tsx'),tab=read('src/components/studio/tab-fichiers.tsx'),card=read('src/components/studio/conversation-local-files.tsx');
 expect(panel.match(/<ConversationLocalFiles /g)).toHaveLength(1);
 expect(panel).toContain('!handlesFreeFiles(v)');
 expect(tab).toMatch(/tab: "fichiers"[^\n]*kind: "asset"/);
 expect(tab).toContain('FILES_CHANGED_EVENT');
 expect(FILES_CHANGED_EVENT).toBe('studio:files-changed');
 expect(card).toContain("t('Gratuit — 0 €','Free — €0')");
 expect(card).not.toMatch(/devis|quote/i);
});
