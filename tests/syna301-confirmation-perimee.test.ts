/**
 * #301 v3 — défaut démontré en recette (#363, Plein cadre téléphone) : après un reçu, un rechargement survenu avant la fin du
 * nettoyage laissait en mémoire de session la confirmation de l'ANCIENNE proposition (couleur). À la proposition suivante
 * (FAQ), « Confirmer » rejouait l'ancienne demande : aucune FAQ écrite, carte « incertaine ». Une confirmation restée en
 * mémoire pour une autre proposition que celle affichée est abandonnée ; seule la proposition affichée est confirmée.
 * Une réponse perdue pour la proposition affichée reste rejouée à l'identique (contrat inchangé).
 */
import {expect,it,vi} from 'vitest';
import {createLocalSiteConfirmation} from '@/lib/local-site-confirmation-client';
import type {ConversationView} from '@/lib/orchestrator/conversation/contract';

const proposed=(proposalId:string)=>({id:'c',revision:5,projectRevision:2,localSiteExecution:{enabled:true},localSite:{schema:'syna-local-site-1',state:'proposed',command:'faq',proposalId,scope:{label:'Section',pagePaths:['/'],template:'index',section:'s',labels:{}},diff:{before:'a',after:'b'},message:'',financialConsent:false,costEur:0,providerCalls:0,confirmationRequired:true}}) as unknown as ConversationView;
const applied=(proposalId:string,n:number)=>({...proposed(proposalId),localSite:{...proposed(proposalId).localSite,state:'applied',actionsExecuted:true,version:{id:'v'+n,number:n,parentId:'v'+(n-1),fingerprint:'f'+n}}}) as unknown as ConversationView;

function setup(stored:unknown,shown:ConversationView){
 const map=new Map<string,string>();if(stored)map.set('syna-free-confirmation:c',JSON.stringify(stored));
 const storage={getItem:(k:string)=>map.get(k)??null,setItem:(k:string,v:string)=>{map.set(k,v);},removeItem:(k:string)=>{map.delete(k);}};
 let view=shown;const sent:Record<string,unknown>[]=[];
 const fetch=vi.fn(async(_u:unknown,init?:RequestInit)=>{if(init?.body){const b=JSON.parse(String(init.body));sent.push(b);view=applied(String(b.proposalId),3);}return Response.json(view);});
 const c=createLocalSiteConfirmation({conversationId:'c',fetch:fetch as unknown as typeof globalThis.fetch,view:()=>view,onView:v=>{view=v;},onState:()=>{},onApplied:async()=>{},storage,uuid:()=>'nouvelle-demande'});
 return{c,sent,map};
}
const stale={action:'confirm-local',proposalId:'couleur',confirmation:true,revision:3,projectRevision:1,requestId:'ancienne-demande'};

it('confirmation restée en mémoire pour une autre proposition : abandonnée, la proposition affichée est confirmée',async()=>{
 const t=setup(stale,proposed('faq'));
 await t.c.confirm();
 expect(t.sent).toHaveLength(1);
 expect(t.sent[0]).toMatchObject({action:'confirm-local',proposalId:'faq',requestId:'nouvelle-demande'});
 expect(t.map.size).toBe(0);
});

it('réponse perdue pour la proposition affichée : rejouée à l’identique (contrat inchangé)',async()=>{
 const same={...stale,proposalId:'faq'};
 const t=setup(same,proposed('faq'));
 await t.c.confirm();
 expect(t.sent).toEqual([same]);
});

it('annuler la proposition affichée reste possible malgré une confirmation périmée en mémoire',async()=>{
 const t=setup(stale,proposed('faq'));
 await t.c.cancel();
 expect(t.sent).toEqual([expect.objectContaining({action:'cancel-local',proposalId:'faq'})]);
});
