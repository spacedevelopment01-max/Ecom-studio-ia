import {localEditAllowed} from './existing-local-edits';
import type {ConversationView} from './orchestrator/conversation/contract';
type Context=NonNullable<NonNullable<ConversationView['activeContext']>['presentation']>;
type Pending={action:'confirm-local';proposalId:string;confirmation:true;revision:number;projectRevision:number|null;requestId:string};
export type FreeConfirmationState={busy:boolean;error:string;uncertain:boolean;blocked?:boolean;context:Context|null};
export const hasNativeLocalReceipt=(v:ConversationView)=>{const s=v.localSite;return s?.state==='applied'&&s.actionsExecuted===true&&!!s.version?.id&&Number.isInteger(s.version.number)&&s.version.number>0&&!!s.version.parentId&&!!s.version.fingerprint;};
export const handlesFreeReply=(v:ConversationView)=>!!v.localSite&&(!!v.localSite.command||v.localSite.state==='proposed'||v.localSite.state==='applied'||!!v.localSiteExecution?.enabled);
/** Headless transport. No business rules, CSS, provider, quote or financial consent. */
export function createLocalSiteConfirmation(options:{conversationId:string;fetch:typeof fetch;view:()=>ConversationView;onView:(v:ConversationView)=>void;onState:(s:FreeConfirmationState)=>void;onApplied:(v:ConversationView)=>Promise<void>;onRevalidated?:(v:ConversationView)=>void;storage?:Pick<Storage,'getItem'|'setItem'|'removeItem'>;uuid?:()=>string}){
 const route=`/api/studio-agent/conversations/${options.conversationId}`,key=`syna-free-confirmation:${options.conversationId}`;
 let alive=true,busy=false,pending:Pending|null=null,applied:string|undefined;
 let state:FreeConfirmationState={busy:false,error:'',uncertain:false,context:null};
 try{const raw=options.storage?.getItem(key);if(raw){const p=JSON.parse(raw);if(p.action==='confirm-local'&&typeof p.proposalId==='string'&&typeof p.requestId==='string'&&p.confirmation===true&&Number.isInteger(p.revision)&&(p.projectRevision===null||Number.isInteger(p.projectRevision)))pending=p;}}catch{/* unavailable storage is not execution consent */}
 state.uncertain=!!pending;
 const emit=(patch:Partial<FreeConfirmationState>)=>{state={...state,...patch};if(alive)options.onState(state);};
 const clear=()=>{pending=null;try{options.storage?.removeItem(key);}catch{}};
 const uuid=()=>options.uuid?.()??crypto.randomUUID();
 async function request(path:string,body?:unknown){const r=await options.fetch(path,body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{cache:'no-store'});const data=await r.json();if(!r.ok){const e=Object.assign(new Error(data.error??`Erreur ${r.status}`),{status:r.status,context:data.context});throw e;}return data;}
 async function accept(v:ConversationView){if(!alive)return;options.onView(v);if(hasNativeLocalReceipt(v)&&v.localSite!.version!.id!==applied){await options.onApplied(v);applied=v.localSite!.version!.id;}}
 async function refresh(){const v=await request(route) as ConversationView;await accept(v);emit({blocked:!localEditAllowed(v,'local-site')||!v.localSiteExecution?.enabled});return v;}
 async function locked(action:()=>Promise<void>){if(busy||!alive)return;busy=true;emit({busy:true,error:''});try{await action();}catch(error){const e=error as Error&{status?:number;context?:Context};if(e.status){clear();emit({blocked:[401,402,403,404].includes(e.status),uncertain:false,context:e.context??null,error:e.message});if(e.status===409){try{const context=e.context??await request(route+'/context');emit({context});await refresh();}catch{}}}else emit({error:'Réponse non reçue. Vérifiez l’enregistrement ou réessayez la même confirmation gratuite.',uncertain:!!pending});}finally{busy=false;emit({busy:false});}}
 return{
  activate(){alive=true;},
  getState:()=>state,
  dispose(){alive=false;},
  refresh:()=>locked(async()=>{const v=await refresh();if(hasNativeLocalReceipt(v)){clear();emit({uncertain:false,error:''});}}),
  confirm:()=>locked(async()=>{
   const v=options.view(),s=v.localSite;if(!localEditAllowed(v,'local-site')||!v.localSiteExecution?.enabled)throw Object.assign(new Error('Retouche gratuite indisponible.'),{status:403});
   if(!pending){if(s?.state!=='proposed'||!s.proposalId||!s.scope||!s.diff)throw Object.assign(new Error('Demandez une nouvelle proposition gratuite.'),{status:409});pending={action:'confirm-local',proposalId:s.proposalId,confirmation:true,revision:v.revision,projectRevision:v.projectRevision,requestId:uuid()};try{options.storage?.setItem(key,JSON.stringify(pending));}catch{}}
   const response=await request(route,pending) as ConversationView;
   // The server response is a native receipt, never an optimistic client result.
   if(!hasNativeLocalReceipt(response))throw new Error('Enregistrement natif non confirmé.');
   await accept(response);const next=await refresh();if(!hasNativeLocalReceipt(next))throw new Error('Version enregistrée à vérifier.');clear();emit({uncertain:false,context:null});
  }),
  cancel:()=>locked(async()=>{
   if(pending)throw new Error('Vérifiez d’abord la confirmation dont la réponse est incertaine.');
   const proposal=options.view().localSite?.proposalId,v=await refresh(),context=v.activeContext?.presentation;
   if(!proposal||v.localSite?.proposalId!==proposal)return;
   if(context?.state!=='valid'||!context.selection)throw Object.assign(new Error('La cible a changé : cette proposition ne peut plus être exécutée. Revalidez puis demandez une nouvelle proposition.'),{status:409,context});
   // Existing A2 select invalidates proposals while retaining exactly the same valid target.
   await request(route+'/context',{action:'select',revision:v.revision,requestId:uuid(),context:context.selection});await refresh();emit({context:null});
  }),
  revalidate:()=>locked(async()=>{
   const v=options.view(),fresh=v.activeContext?.presentation,context=fresh&&fresh.revision>=(state.context?.revision??0)?fresh:state.context,r=context?.recovery;
   if(!context||!r?.current||!r.expectedReference)throw Object.assign(new Error('Resélectionnez la cible dans l’aperçu natif.'),{status:409});
   await request(route+'/context',{action:'revalidate',revision:context.revision,expectedReference:r.expectedReference,currentReference:r.current.reference,confirmation:true,requestId:uuid()});clear();const next=await refresh();if(alive)options.onRevalidated?.(next);emit({context:null,uncertain:false});
  }),
 };
}
