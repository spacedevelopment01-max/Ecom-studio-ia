import type {ConversationView} from './orchestrator/conversation/contract';
/** Native calendar transport: explicit free agreement, same-request retry, server receipt re-read. */
type Pending={action:'confirm-calendar';proposalId:string;confirmation:true;revision:number;projectRevision:number|null;requestId:string};
export type LocalCalendarConfirmationState={busy:boolean;error:string;uncertain:boolean;blocked?:boolean};
export type LocalCalendarChange={projectId:string;postId:string;receiptId:string};
export const LOCAL_STOCK_CHANGED_EVENT='studio:social-changed';
export const hasLocalCalendarReceipt=(v:ConversationView)=>{const s=v.localCalendar;return s?.schema==='syna-local-calendar-1'&&s.state==='applied'&&s.actionsExecuted===true&&s.financialConsent===false&&s.costEur===0&&s.providerCalls===0&&s.publication===false&&s.scheduling===false&&s.confirmationRequired===false&&!!s.receiptId&&s.projectId===v.projectId&&!!s.target?.postId&&['planned','draft','review'].includes(s.target.status)&&!!s.target.timezone&&Number.isFinite(s.diff?.before)&&Number.isFinite(s.diff?.after);};
export const handlesLocalCalendar=(v:ConversationView)=>!!v.localCalendar&&(v.localCalendar.state==='proposed'||v.localCalendar.state==='applied'||!!v.localCalendarExecution?.enabled);
export function createLocalCalendarConfirmation(options:{conversationId:string;fetch:typeof fetch;view:()=>ConversationView;onView:(v:ConversationView)=>void;onState:(s:LocalCalendarConfirmationState)=>void;onApplied:(change:LocalCalendarChange)=>Promise<void>|void;storage?:Pick<Storage,'getItem'|'setItem'|'removeItem'>;uuid?:()=>string}){
 // A controller may outlive its rendered conversation until effect cleanup.
 const scopeProject=options.view().projectId;
 const inScope=()=>options.view().id===options.conversationId&&options.view().projectId===scopeProject;
 const route=`/api/studio-agent/conversations/${options.conversationId}`,key=`syna-free-calendar:${options.conversationId}`;
 let alive=true,busy=false,pending:Pending|null=null,applied:string|undefined;
 let state:LocalCalendarConfirmationState={busy:false,error:'',uncertain:false};
 try{const raw=options.storage?.getItem(key);if(raw){const p=JSON.parse(raw);if(p.action==='confirm-calendar'&&typeof p.proposalId==='string'&&typeof p.requestId==='string'&&p.confirmation===true&&Number.isInteger(p.revision)&&(p.projectRevision===null||Number.isInteger(p.projectRevision)))pending=p;}}catch{/* calendarage indisponible : jamais un accord */}
 state.uncertain=!!pending;
 const emit=(patch:Partial<LocalCalendarConfirmationState>)=>{state={...state,...patch};if(alive&&inScope())options.onState(state);};
 const clear=()=>{pending=null;try{options.storage?.removeItem(key);}catch{}};
 const reconcile=(v:ConversationView)=>{const proposal=v.localCalendar;if(pending&&proposal?.state==='proposed'&&proposal.proposalId&&pending.proposalId!==proposal.proposalId){clear();emit({uncertain:false,error:''});}};
 const uuid=()=>options.uuid?.()??crypto.randomUUID();
 async function request(path:string,body?:unknown){if(!alive||!inScope())throw new Error('Conversation changée.');const r=await options.fetch(path,body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{cache:'no-store'});const data=await r.json();if(!r.ok)throw Object.assign(new Error(data.error??`Erreur ${r.status}`),{status:r.status});return data;}
 async function accept(v:ConversationView){
  if(!alive||!inScope())return;options.onView(v);
  if(hasLocalCalendarReceipt(v)&&v.localCalendar!.receiptId!==applied){const s=v.localCalendar!;applied=s.receiptId;await options.onApplied({projectId:v.projectId!,postId:s.target!.postId,receiptId:s.receiptId!});}
 }
 async function refresh(){const v=await request(route) as ConversationView;if(inScope())reconcile(v);await accept(v);emit({blocked:!!v.recovery||!!v.readOnlyReason||!v.localCalendarExecution?.enabled});return v;}
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
  refresh:()=>locked(async()=>{const v=await refresh();if(pending&&hasLocalCalendarReceipt(v)&&v.localCalendar!.receiptId===pending.requestId){clear();emit({uncertain:false,error:''});}}),
  confirm:()=>locked(async()=>{
   const v=options.view(),s=v.localCalendar;if(v.recovery||!v.localCalendarExecution?.enabled||v.readOnlyReason)throw Object.assign(new Error('Modification gratuite indisponible.'),{status:403});
   if(!pending){if(s?.state!=='proposed'||!s.proposalId||!s.diff)throw Object.assign(new Error('Demandez une nouvelle proposition gratuite.'),{status:409});pending={action:'confirm-calendar',proposalId:s.proposalId,confirmation:true,revision:v.revision,projectRevision:v.projectRevision,requestId:uuid()};try{options.storage?.setItem(key,JSON.stringify(pending));}catch{}}
   const command=pending;const response=await request(route,command) as ConversationView;
   if(!hasLocalCalendarReceipt(response))throw new Error('Enregistrement du calendar non confirmé.');
   const next=await refresh();if(!hasLocalCalendarReceipt(next)||next.localCalendar!.receiptId!==command.requestId)throw new Error('Modification enregistrée à vérifier.');clear();emit({uncertain:false});
  }),
  cancel:()=>locked(async()=>{
   if(pending)throw new Error('Vérifiez d’abord la confirmation dont la réponse est incertaine.');
   const proposal=options.view().localCalendar?.proposalId,v=await refresh();
   if(!proposal||v.localCalendar?.proposalId!==proposal||v.localCalendar.state!=='proposed')return;
   await request(route,{action:'cancel-calendar',proposalId:proposal,revision:v.revision,projectRevision:v.projectRevision,requestId:uuid()});await refresh();
  }),
 };
}
