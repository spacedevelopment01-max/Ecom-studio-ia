import {nativeLocalEditAllowed} from './existing-local-edits';
import type {ConversationView} from './orchestrator/conversation/contract';
/** #418 / #419 : transport de la retouche réservable (prix ou durée) — accord gratuit explicite, même requête en reprise, reçu relu côté serveur. */
type Pending={action:'confirm-booking-edit';proposalId:string;confirmation:true;revision:number;projectRevision:number|null;requestId:string};
export type LocalBookingEditConfirmationState={busy:boolean;error:string;uncertain:boolean;blocked?:boolean};
export type LocalBookingEditChange={projectId:string;serviceId:string;field:'price'|'duration';after:number;resultVersionId:string;receiptId:string};
export const LOCAL_BOOKING_EDIT_CHANGED_EVENT='studio:booking-changed';
export const hasLocalBookingEditReceipt=(v:ConversationView)=>{
 const s=v.bookingEdit;
 return s?.schema==='syna-booking-edit-1'&&s.state==='applied'&&s.actionsExecuted===true&&s.financialConsent===false&&s.costEur===0&&s.providerCalls===0&&s.publication===false&&s.confirmationRequired===false&&typeof s.receiptId==='string'&&!!s.receiptId&&typeof s.proposalId==='string'&&!!s.proposalId&&typeof v.projectId==='string'&&!!v.projectId&&s.projectId===v.projectId&&typeof s.resultVersionId==='string'&&!!s.resultVersionId&&s.resultVersionId!==s.sourceVersionId&&typeof s.service?.id==='string'&&!!s.service.id&&(s.field==='price'||s.field==='duration')&&!!s.diff&&typeof s.diff.after==='number'&&s.diff.before!==s.diff.after;
};
export const bookingEditAllowed=(v:ConversationView)=>nativeLocalEditAllowed(v)&&v.bookingEditExecution?.enabled===true;
export function createLocalBookingEditConfirmation(options:{conversationId:string;fetch:typeof fetch;view:()=>ConversationView;onView:(v:ConversationView)=>void;onState:(s:LocalBookingEditConfirmationState)=>void;onApplied:(change:LocalBookingEditChange)=>Promise<void>|void;storage?:Pick<Storage,'getItem'|'setItem'|'removeItem'>;uuid?:()=>string}){
 const scopeProject=options.view().projectId;
 const inScope=()=>options.view().id===options.conversationId&&options.view().projectId===scopeProject;
 const route=`/api/studio-agent/conversations/${options.conversationId}`,key=`syna-free-booking-edit:${options.conversationId}:${scopeProject}`;
 let alive=true,busy=false,pending:Pending|null=null,applied:string|undefined;
 let state:LocalBookingEditConfirmationState={busy:false,error:'',uncertain:false};
 try{const raw=options.storage?.getItem(key);if(raw){const p=JSON.parse(raw);if(p.action==='confirm-booking-edit'&&typeof p.proposalId==='string'&&typeof p.requestId==='string'&&p.confirmation===true&&Number.isInteger(p.revision)&&(p.projectRevision===null||Number.isInteger(p.projectRevision)))pending=p;}}catch{/* stockage indisponible : jamais un accord */}
 state.uncertain=!!pending;
 const emit=(patch:Partial<LocalBookingEditConfirmationState>)=>{state={...state,...patch};if(alive&&inScope())options.onState(state);};
 const clear=()=>{pending=null;try{options.storage?.removeItem(key);}catch{}};
 const reconcile=(v:ConversationView)=>{const p=v.bookingEdit;if(pending&&p?.state==='proposed'&&p.proposalId&&pending.proposalId!==p.proposalId){clear();emit({uncertain:false,error:''});}};
 const uuid=()=>options.uuid?.()??crypto.randomUUID();
 async function request(path:string,body?:unknown){if(!alive||!inScope())throw new Error('Conversation changée.');const r=await options.fetch(path,body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{cache:'no-store'});const data=await r.json();if(!r.ok)throw Object.assign(new Error(data.error??`Erreur ${r.status}`),{status:r.status});if(data.id!==options.conversationId||data.projectId!==scopeProject)throw new Error('Réponse d’une autre conversation ou d’un autre projet.');return data;}
 async function accept(v:ConversationView){
  if(!alive||!inScope()||v.id!==options.conversationId||v.projectId!==scopeProject)return;options.onView(v);if(!alive||!inScope())return;
  if(hasLocalBookingEditReceipt(v)&&v.bookingEdit!.receiptId!==applied){const s=v.bookingEdit!;applied=s.receiptId;await options.onApplied({projectId:v.projectId!,serviceId:s.service!.id,field:s.field!,after:s.diff!.after,resultVersionId:s.resultVersionId!,receiptId:s.receiptId!});}
 }
 async function refresh(){const v=await request(route) as ConversationView;if(inScope())reconcile(v);await accept(v);emit({blocked:!bookingEditAllowed(v)});return v;}
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
  refresh:()=>locked(async()=>{const v=await refresh();if(pending&&hasLocalBookingEditReceipt(v)&&v.bookingEdit!.receiptId===pending.requestId){clear();emit({uncertain:false,error:''});}}),
  confirm:()=>locked(async()=>{
   const v=options.view(),s=v.bookingEdit;if(!bookingEditAllowed(v))throw Object.assign(new Error('Retouche gratuite indisponible.'),{status:403});
   if(!pending){if(s?.state!=='proposed'||!s.proposalId||!s.diff)throw Object.assign(new Error('Demandez une nouvelle proposition gratuite.'),{status:409});pending={action:'confirm-booking-edit',proposalId:s.proposalId,confirmation:true,revision:v.revision,projectRevision:v.projectRevision,requestId:uuid()};try{options.storage?.setItem(key,JSON.stringify(pending));}catch{}}
   const command=pending;const response=await request(route,command) as ConversationView;
   if(!hasLocalBookingEditReceipt(response)||response.bookingEdit!.receiptId!==command.requestId||response.bookingEdit!.proposalId!==command.proposalId)throw new Error('Enregistrement de la réservation non confirmé.');
   const next=await refresh();if(!hasLocalBookingEditReceipt(next)||next.bookingEdit!.receiptId!==command.requestId)throw new Error('Modification enregistrée à vérifier.');clear();emit({uncertain:false});
  }),
  cancel:()=>locked(async()=>{
   if(pending)throw new Error('Vérifiez d’abord la confirmation dont la réponse est incertaine.');
   const proposal=options.view().bookingEdit?.proposalId,v=await refresh();
   if(!proposal||v.bookingEdit?.proposalId!==proposal||v.bookingEdit.state!=='proposed')return;
   await request(route,{action:'cancel-booking-edit',proposalId:proposal,revision:v.revision,projectRevision:v.projectRevision,requestId:uuid()});await refresh();
  }),
 };
}
