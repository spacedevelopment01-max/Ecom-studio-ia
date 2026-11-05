/**
 * #301 — lot 1 de la consigne « SYNA complète » : le défaut de confirmation périmée démontré sur la carte du site (#363)
 * vérifié sur les autres cartes gratuites (Fichiers, Contenus, Demandes reçues, Horaires). Une confirmation restée en
 * mémoire de session pour une AUTRE proposition que celle affichée (rechargement juste après un reçu, nouvelle proposition)
 * n'est jamais rejouée à sa place ; une réponse perdue pour la proposition affichée reste rejouée à l'identique ; la clé
 * de mémoire est propre à la conversation (un autre projet n'hérite jamais de l'accord). Contrôle indépendant du correctif #364
 * de Codex (même règle sur les cinq cartes).
 */
import {describe,expect,it,vi} from 'vitest';
import {createLocalFilesConfirmation} from '@/lib/local-files-confirmation-client';
import {createLocalBusinessContentConfirmation} from '@/lib/local-business-content-confirmation-client';
import {createLocalRequestsConfirmation} from '@/lib/local-site-requests-confirmation-client';
import {createServiceProfileConfirmation} from '@/lib/service-profile-confirmation-client';
import type {ConversationView} from '@/lib/orchestrator/conversation/contract';

type Factory=(o:Parameters<typeof createLocalFilesConfirmation>[0])=>{confirm():Promise<void>;cancel():Promise<void>;getState():{error:string;uncertain:boolean}};
const base={id:'c',projectId:'p1',revision:5,projectRevision:2,activeContext:{presentation:{state:'valid',selection:{kind:'x'}}}};
const CARTES:{nom:string;cle:string;action:string;annuler:string;make:Factory;view:(state:'proposed'|'applied',proposalId:string,receipt?:string)=>ConversationView}[]=[
 {nom:'Fichiers',cle:'syna-free-files:c',action:'confirm-files',annuler:'select',make:createLocalFilesConfirmation as unknown as Factory,
  view:(state,proposalId,receipt)=>({...base,localFilesExecution:{enabled:true},localFiles:{state,proposalId,command:'move',diff:{before:'a',after:'b'},asset:{id:'a1',name:'photo.png',folderId:null,version:state==='applied'?2:1},actionsExecuted:state==='applied',receiptId:receipt}}) as unknown as ConversationView},
 {nom:'Contenus',cle:'syna-free-content:c',action:'confirm-business-content',annuler:'select',make:createLocalBusinessContentConfirmation as unknown as Factory,
  view:(state,proposalId,receipt)=>({...base,localBusinessContentExecution:{enabled:true},localBusinessContent:{state,proposalId,diff:{before:'a',after:'b'},target:{id:'b1',version:'v1'},item:{type:'biens',id:'b1',version:state==='applied'?'v2':'v1',title:'Maison'},actionsExecuted:state==='applied',receiptId:receipt}}) as unknown as ConversationView},
 {nom:'Demandes',cle:'syna-free-requests:c',action:'confirm-site-request',annuler:'select',make:createLocalRequestsConfirmation as unknown as Factory,
  view:(state,proposalId,receipt)=>({...base,localRequestsExecution:{enabled:true},localRequests:{state,proposalId,diff:{before:{read:false,handled:false},after:{read:true,handled:false}},request:{id:'r1'},actionsExecuted:state==='applied',receiptId:receipt}}) as unknown as ConversationView},
 {nom:'Horaires',cle:'syna-free-service-profile:c',action:'confirm-service-profile',annuler:'cancel-service-profile',make:createServiceProfileConfirmation as unknown as Factory,
  view:(state,proposalId,receipt)=>({...base,serviceProfileExecution:{enabled:true},serviceProfile:{schema:'syna-service-profile-1',state,field:'hours',proposalId,projectId:'p1',diff:{before:'a',after:'b'},sourceVersion:1,resultVersion:state==='applied'?2:undefined,actionsExecuted:state==='applied',financialConsent:false,costEur:0,providerCalls:0,confirmationRequired:state!=='applied',publication:false,receiptId:receipt}}) as unknown as ConversationView},
];

function setup(carte:typeof CARTES[number],stored:Record<string,unknown>|null,shown:ConversationView,key=carte.cle){
 const map=new Map<string,string>();if(stored)map.set(key,JSON.stringify(stored));
 const storage={getItem:(k:string)=>map.get(k)??null,setItem:(k:string,v:string)=>{map.set(k,v);},removeItem:(k:string)=>{map.delete(k);}};
 let view=shown;const sent:Record<string,unknown>[]=[];
 const fetch=vi.fn(async(_u:unknown,init?:RequestInit)=>{if(init?.body){const b=JSON.parse(String(init.body));sent.push(b);if(b.action===carte.action)view=carte.view('applied',String(b.proposalId),String(b.requestId));}return Response.json(view);});
 const c=carte.make({conversationId:'c',fetch:fetch as unknown as typeof globalThis.fetch,view:()=>view,onView:v=>{view=v;},onState:()=>{},onApplied:async()=>{},storage,uuid:()=>'nouvelle-demande'});
 return{c,sent,map};
}

describe.each(CARTES)('carte $nom',carte=>{
 const stale={action:carte.action,proposalId:'ancienne',confirmation:true,revision:3,projectRevision:1,requestId:'ancienne-demande'};
 it('confirmation restée en mémoire pour une autre proposition : abandonnée, la proposition affichée est confirmée une seule fois',async()=>{
  const t=setup(carte,stale,carte.view('proposed','affichee'));
  await t.c.confirm();
  expect(t.sent).toHaveLength(1);
  expect(t.sent[0]).toMatchObject({action:carte.action,proposalId:'affichee',requestId:'nouvelle-demande'});
  expect(t.c.getState().error).toBe('');
  expect(t.map.size).toBe(0);
 });
 it('réponse perdue pour la proposition affichée : rejouée à l’identique',async()=>{
  const same={...stale,proposalId:'affichee'};
  const t=setup(carte,same,carte.view('proposed','affichee'));
  await t.c.confirm();
  expect(t.sent).toEqual([same]);
 });
 it('annuler la proposition affichée reste possible malgré une confirmation périmée',async()=>{
  const t=setup(carte,stale,carte.view('proposed','affichee'));
  await t.c.cancel();
  expect(t.c.getState().error).toBe('');
  expect(t.sent).toEqual([expect.objectContaining({action:carte.annuler})]);
 });
 it('autre conversation (autre projet) : l’accord en mémoire n’est jamais repris',async()=>{
  const t=setup(carte,{...stale,proposalId:'affichee'},carte.view('proposed','affichee'),carte.cle.replace(/:c$/,':autre'));
  await t.c.confirm();
  expect(t.sent).toEqual([expect.objectContaining({proposalId:'affichee',requestId:'nouvelle-demande'})]);
  expect(t.map.has(carte.cle.replace(/:c$/,':autre'))).toBe(true);
 });
});

import {createLocalAdDocumentConfirmation} from '@/lib/local-ad-document-confirmation-client';
describe('carte Publicité',()=>{
 const shown={id:'c',projectId:'p1',revision:5,projectRevision:2,localAdDocumentExecution:{enabled:true},localAdDocument:{state:'proposed',proposalId:'affichee',confirmationRequired:true}} as unknown as ConversationView;
 function setupAd(receipt:Record<string,unknown>){
  const map=new Map([['syna-free-ad-document:c',JSON.stringify({action:'confirm',proposalId:'ancienne',confirmation:true,requestId:'ancienne-demande'})]]);
  const storage={getItem:(k:string)=>map.get(k)??null,setItem:(k:string,v:string)=>{map.set(k,v);},removeItem:(k:string)=>{map.delete(k);}};
  const posts:Record<string,unknown>[]=[];
  const fetch=vi.fn(async(u:unknown,init?:RequestInit)=>{if(init?.body){posts.push(JSON.parse(String(init.body)));return Response.json({});}if(String(u).includes('receipt=')){const id=new URL(String(u),'http://x').searchParams.get('receipt');return Response.json(id==='ancienne'?receipt:{id,job:{id:'j2'}});}return Response.json(shown);});
  const c=createLocalAdDocumentConfirmation({conversationId:'c',fetch:fetch as unknown as typeof globalThis.fetch,view:()=>shown,onView:()=>{},onState:()=>{},onApplied:async()=>{},storage,uuid:()=>'nouvelle-demande'});
  return{c,posts,map};
 }
 for(const [cas,receipt] of [['déjà exécuté',{id:'ancienne',job:{id:'j1'}}],['jamais arrivé',{id:'ancienne',state:'proposed'}]] as const)
 it(`ancien accord ${cas} : jamais rejoué, le premier clic confirme une seule fois la proposition affichée`,async()=>{
  const t=setupAd(receipt);
  await t.c.confirm();
  expect(t.posts).toEqual([expect.objectContaining({action:'confirm',proposalId:'affichee',requestId:'nouvelle-demande'})]);
  expect(t.c.getState().error).toBe('');
 });
});
