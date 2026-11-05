/**
 * #301 — risque relevé par Codex (point de reprise, priorité « Site pendant changement de projet ») : le transport de la
 * carte Site n'avait pas la garde « conversation + projet courants » ajoutée par #364 aux cinq autres cartes. Une
 * réponse tardive de l'ancien projet, reçue avant le démontage du contrôleur, remplaçait la vue du nouveau projet et
 * déclenchait son rechargement ; une confirmation pouvait partir après le changement.
 */
import {expect,it,vi} from 'vitest';
import {createLocalSiteConfirmation} from '@/lib/local-site-confirmation-client';
import type {ConversationView} from '@/lib/orchestrator/conversation/contract';

const site=(id:string,projectId:string,state:'proposed'|'applied',proposalId='p1')=>({id,projectId,revision:5,projectRevision:2,localSiteExecution:{enabled:true},localSite:{schema:'syna-local-site-1',state,command:'title',proposalId,scope:{label:'Section',pagePaths:['/'],template:'index',section:'s',labels:{}},diff:{before:'a',after:'b'},message:'',financialConsent:false,costEur:0,providerCalls:0,confirmationRequired:state==='proposed',actionsExecuted:state==='applied',...(state==='applied'?{version:{id:'v2',number:2,parentId:'v1',fingerprint:'f'}}:{})}}) as unknown as ConversationView;

function setup(){
 let shown=site('c','p','proposed');const bodies:unknown[]=[],onView=vi.fn((v:ConversationView)=>{shown=v;}),onApplied=vi.fn(async()=>{});
 let release!:()=>void,entered!:()=>void;const gate=new Promise<void>(r=>release=r),arrived=new Promise<void>(r=>entered=r);
 const fetch=vi.fn(async(_u:unknown,init?:RequestInit)=>{if(init?.body){bodies.push(JSON.parse(String(init.body)));entered();await gate;}return Response.json(site('c','p','applied'));});
 const map=new Map<string,string>(),storage={getItem:(k:string)=>map.get(k)??null,setItem:(k:string,v:string)=>{map.set(k,v);},removeItem:(k:string)=>{map.delete(k);}};
 const client=createLocalSiteConfirmation({conversationId:'c',fetch:fetch as unknown as typeof globalThis.fetch,view:()=>shown,onView,onState:()=>{},onApplied,storage,uuid:()=>'r1'});
 return{client,bodies,onView,onApplied,arrived,release:()=>release(),switchTo:(v:ConversationView)=>{shown=v;},shown:()=>shown};
}

it('réponse tardive de l’ancien projet : la vue du nouveau projet n’est ni remplacée ni rechargée',async()=>{
 const t=setup();const work=t.client.confirm();await t.arrived;
 const other=site('autre','autre-projet','proposed','q1');t.switchTo(other);t.release();await work;
 expect(t.bodies).toHaveLength(1);expect(t.shown()).toBe(other);expect(t.onView).not.toHaveBeenCalled();expect(t.onApplied).not.toHaveBeenCalled();
});

it('après changement de projet : aucune confirmation n’est envoyée par l’ancien contrôleur',async()=>{
 const t=setup();t.switchTo(site('c','autre-projet','proposed'));
 await t.client.confirm();
 expect(t.bodies).toEqual([]);expect(t.onView).not.toHaveBeenCalled();
});
