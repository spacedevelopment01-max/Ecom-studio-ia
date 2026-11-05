import {nativeLocalEditAllowed} from './existing-local-edits';
import type {ConversationView} from './orchestrator/conversation/contract';
/**
 * #301 C22 — transport sans interface de la confirmation gratuite d'un statut de demande reçue (moteur de Codex
 * `local-site-requests.ts`, convergence #348). Même discipline que les cartes Fichiers / Contenus : aucun devis, aucun
 * consentement financier ; le reçu vient du serveur, relu dans la source native.
 * - réponse perdue : la MÊME confirmation (corps et requestId identiques) est rejouée, ou une simple vérification ;
 * - annulation avant accord : nouvelle sélection A2 de la même cible (le serveur retire la proposition).
 */
type Pending={action:'confirm-site-request';proposalId:string;confirmation:true;revision:number;projectRevision:number|null;requestId:string};
export type RequestsConfirmationState={busy:boolean;error:string;uncertain:boolean;blocked?:boolean};
export type RequestsChange={projectId:string;requestId:string;read:boolean;handled:boolean;receiptId:string};
export const SITE_REQUESTS_CHANGED_EVENT='studio:site-requests-changed';
export const hasNativeRequestReceipt=(v:ConversationView)=>{const s=v.localRequests;return s?.state==='applied'&&s.actionsExecuted===true&&!!s.receiptId&&!!s.request?.id&&!!s.diff;};
export const handlesLocalRequests=(v:ConversationView)=>!!v.localRequests&&!!v.localRequestsExecution?.enabled;
export function createLocalRequestsConfirmation(options:{conversationId:string;fetch:typeof fetch;view:()=>ConversationView;onView:(v:ConversationView)=>void;onState:(s:RequestsConfirmationState)=>void;onApplied:(change:RequestsChange)=>Promise<void>|void;storage?:Pick<Storage,'getItem'|'setItem'|'removeItem'>;uuid?:()=>string}){
 // A controller may outlive its rendered conversation until effect cleanup.
 const scopeProject=options.view().projectId;
 const inScope=()=>options.view().id===options.conversationId&&options.view().projectId===scopeProject;
 const route=`/api/studio-agent/conversations/${options.conversationId}`,key=`syna-free-requests:${options.conversationId}`;
 let alive=true,busy=false,pending:Pending|null=null,applied:string|undefined;
 let state:RequestsConfirmationState={busy:false,error:'',uncertain:false};
 try{const raw=options.storage?.getItem(key);if(raw){const p=JSON.parse(raw);if(p.action==='confirm-site-request'&&typeof p.proposalId==='string'&&typeof p.requestId==='string'&&p.confirmation===true&&Number.isInteger(p.revision)&&(p.projectRevision===null||Number.isInteger(p.projectRevision)))pending=p;}}catch{/* stockage indisponible : jamais un accord */}
 state.uncertain=!!pending;
 const emit=(patch:Partial<RequestsConfirmationState>)=>{state={...state,...patch};if(alive&&inScope())options.onState(state);};
 const clear=()=>{pending=null;try{options.storage?.removeItem(key);}catch{}};
 const reconcile=(v:ConversationView)=>{const proposal=v.localRequests;if(pending&&proposal?.state==='proposed'&&proposal.proposalId&&pending.proposalId!==proposal.proposalId){clear();emit({uncertain:false,error:''});}};
 const uuid=()=>options.uuid?.()??crypto.randomUUID();
 async function request(path:string,body?:unknown){if(!alive||!inScope())throw new Error('Conversation changée.');const r=await options.fetch(path,body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{cache:'no-store'});const data=await r.json();if(!r.ok)throw Object.assign(new Error(data.error??`Erreur ${r.status}`),{status:r.status});return data;}
 async function accept(v:ConversationView){
  if(!alive||!inScope())return;options.onView(v);
  if(hasNativeRequestReceipt(v)&&v.localRequests!.receiptId!==applied){const s=v.localRequests!;applied=s.receiptId;await options.onApplied({projectId:v.projectId!,requestId:s.request!.id,read:s.diff!.after.read,handled:s.diff!.after.handled,receiptId:s.receiptId!});}
 }
 async function refresh(){const v=await request(route) as ConversationView;if(inScope())reconcile(v);await accept(v);emit({blocked:!nativeLocalEditAllowed(v)||!v.localRequestsExecution?.enabled});return v;}
 async function locked(action:()=>Promise<void>){
  if(busy||!alive||!inScope())return;reconcile(options.view());busy=true;emit({busy:true,error:''});
  try{await action();}
  catch(error){const e=error as Error&{status?:number};
   if(e.status){clear();emit({blocked:[401,402,403,404].includes(e.status),uncertain:false,error:e.message});if(e.status===409){try{await refresh();}catch{/* l'erreur affichée reste la vraie cause */}}}
   else emit({error:'Réponse non reçue. Vérifiez l’enregistrement ou réessayez la même confirmation gratuite.',uncertain:!!pending});
  }finally{busy=false;emit({busy:false});}
 }
 return{
  activate(){alive=true;},
  getState:()=>state,
  dispose(){alive=false;},
  refresh:()=>locked(async()=>{const v=await refresh();if(pending&&hasNativeRequestReceipt(v)&&v.localRequests!.receiptId===pending.requestId){clear();emit({uncertain:false,error:''});}}),
  confirm:()=>locked(async()=>{
   const v=options.view(),s=v.localRequests;if(!nativeLocalEditAllowed(v)||!v.localRequestsExecution?.enabled)throw Object.assign(new Error('Demandes reçues indisponibles.'),{status:403});
   if(!pending){if(s?.state!=='proposed'||!s.proposalId||!s.diff||!s.request)throw Object.assign(new Error('Demandez une nouvelle proposition gratuite.'),{status:409});pending={action:'confirm-site-request',proposalId:s.proposalId,confirmation:true,revision:v.revision,projectRevision:v.projectRevision,requestId:uuid()};try{options.storage?.setItem(key,JSON.stringify(pending));}catch{}}
   const command=pending;const response=await request(route,command) as ConversationView;
   if(!hasNativeRequestReceipt(response))throw new Error('Statut de la demande non confirmé.');
   const next=await refresh();if(!hasNativeRequestReceipt(next)||next.localRequests!.receiptId!==command.requestId)throw new Error('Statut enregistré à vérifier.');clear();emit({uncertain:false});
  }),
  cancel:()=>locked(async()=>{
   if(pending)throw new Error('Vérifiez d’abord la confirmation dont la réponse est incertaine.');
   const proposal=options.view().localRequests?.proposalId,v=await refresh(),context=v.activeContext?.presentation;
   if(!proposal||v.localRequests?.proposalId!==proposal||v.localRequests.state!=='proposed')return;
   if(context?.state!=='valid'||!context.selection)throw Object.assign(new Error('La demande désignée a changé : cette proposition ne peut plus être exécutée. Désignez-la de nouveau.'),{status:409});
   await request(route+'/context',{action:'select',revision:v.revision,requestId:uuid(),context:context.selection});await refresh();
  }),
 };
}
