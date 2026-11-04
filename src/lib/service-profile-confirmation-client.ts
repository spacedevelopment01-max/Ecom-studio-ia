import type {ConversationView} from './orchestrator/conversation/contract';
/** Native profile transport: explicit free agreement, same-request retry, server receipt re-read. */
type Pending={action:'confirm-service-profile';proposalId:string;confirmation:true;revision:number;projectRevision:number|null;requestId:string};
export type ServiceProfileConfirmationState={busy:boolean;error:string;uncertain:boolean;blocked?:boolean};
export type ServiceProfileChange={projectId:string;version:number;receiptId:string};
export const SERVICE_PROFILE_CHANGED_EVENT='studio:service-profile-changed';
export const hasServiceProfileReceipt=(v:ConversationView)=>{const s=v.serviceProfile;return s?.schema==='syna-service-profile-1'&&s.state==='applied'&&(['hours','phone','email','area'].includes(s.field)||(s.field==='service-name'||s.field==='service-price')&&typeof s.serviceKey==='string'&&!!s.serviceKey)&&s.actionsExecuted===true&&s.financialConsent===false&&s.costEur===0&&s.providerCalls===0&&s.confirmationRequired===false&&s.publication===false&&!!s.receiptId&&s.projectId===v.projectId&&Number.isSafeInteger(s.sourceVersion)&&s.sourceVersion!>=0&&s.resultVersion===s.sourceVersion!+1;};
export const handlesServiceProfile=(v:ConversationView)=>!!v.serviceProfile&&(v.serviceProfile.state==='proposed'||v.serviceProfile.state==='applied'||!!v.serviceProfileExecution?.enabled);
export function createServiceProfileConfirmation(options:{conversationId:string;fetch:typeof fetch;view:()=>ConversationView;onView:(v:ConversationView)=>void;onState:(s:ServiceProfileConfirmationState)=>void;onApplied:(change:ServiceProfileChange)=>Promise<void>|void;storage?:Pick<Storage,'getItem'|'setItem'|'removeItem'>;uuid?:()=>string}){
 // A controller may outlive its rendered conversation until effect cleanup.
 const scopeProject=options.view().projectId;
 const inScope=()=>options.view().id===options.conversationId&&options.view().projectId===scopeProject;
 const route=`/api/studio-agent/conversations/${options.conversationId}`,key=`syna-free-service-profile:${options.conversationId}`;
 let alive=true,busy=false,pending:Pending|null=null,applied:string|undefined;
 let state:ServiceProfileConfirmationState={busy:false,error:'',uncertain:false};
 try{const raw=options.storage?.getItem(key);if(raw){const p=JSON.parse(raw);if(p.action==='confirm-service-profile'&&typeof p.proposalId==='string'&&typeof p.requestId==='string'&&p.confirmation===true&&Number.isInteger(p.revision)&&(p.projectRevision===null||Number.isInteger(p.projectRevision)))pending=p;}}catch{/* stockage indisponible : jamais un accord */}
 state.uncertain=!!pending;
 const emit=(patch:Partial<ServiceProfileConfirmationState>)=>{state={...state,...patch};if(alive&&inScope())options.onState(state);};
 const clear=()=>{pending=null;try{options.storage?.removeItem(key);}catch{}};
 const reconcile=(v:ConversationView)=>{const proposal=v.serviceProfile;if(pending&&proposal?.state==='proposed'&&proposal.proposalId&&pending.proposalId!==proposal.proposalId){clear();emit({uncertain:false,error:''});}};
 const uuid=()=>options.uuid?.()??crypto.randomUUID();
 async function request(path:string,body?:unknown){if(!alive||!inScope())throw new Error('Conversation changée.');const r=await options.fetch(path,body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{cache:'no-store'});const data=await r.json();if(!r.ok)throw Object.assign(new Error(data.error??`Erreur ${r.status}`),{status:r.status});return data;}
 async function accept(v:ConversationView){
  if(!alive||!inScope())return;options.onView(v);
  if(hasServiceProfileReceipt(v)&&v.serviceProfile!.receiptId!==applied){const s=v.serviceProfile!;applied=s.receiptId;await options.onApplied({projectId:v.projectId!,version:s.resultVersion!,receiptId:s.receiptId!});}
 }
 async function refresh(){const v=await request(route) as ConversationView;if(inScope())reconcile(v);await accept(v);emit({blocked:!!v.recovery||!!v.readOnlyReason||!v.serviceProfileExecution?.enabled});return v;}
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
  refresh:()=>locked(async()=>{const v=await refresh();if(pending&&hasServiceProfileReceipt(v)&&v.serviceProfile!.receiptId===pending.requestId){clear();emit({uncertain:false,error:''});}}),
  confirm:()=>locked(async()=>{
   const v=options.view(),s=v.serviceProfile;if(v.recovery||!v.serviceProfileExecution?.enabled||v.readOnlyReason)throw Object.assign(new Error('Modification gratuite indisponible.'),{status:403});
   if(!pending){if(s?.state!=='proposed'||!s.proposalId||!s.diff)throw Object.assign(new Error('Demandez une nouvelle proposition gratuite.'),{status:409});pending={action:'confirm-service-profile',proposalId:s.proposalId,confirmation:true,revision:v.revision,projectRevision:v.projectRevision,requestId:uuid()};try{options.storage?.setItem(key,JSON.stringify(pending));}catch{}}
   const command=pending;const response=await request(route,command) as ConversationView;
   if(!hasServiceProfileReceipt(response))throw new Error('Enregistrement du contenu non confirmé.');
   const next=await refresh();if(!hasServiceProfileReceipt(next)||next.serviceProfile!.receiptId!==command.requestId)throw new Error('Modification enregistrée à vérifier.');clear();emit({uncertain:false});
  }),
  cancel:()=>locked(async()=>{
   if(pending)throw new Error('Vérifiez d’abord la confirmation dont la réponse est incertaine.');
   const proposal=options.view().serviceProfile?.proposalId,v=await refresh();
   if(!proposal||v.serviceProfile?.proposalId!==proposal||v.serviceProfile.state!=='proposed')return;
   await request(route,{action:'cancel-service-profile',proposalId:proposal,revision:v.revision,projectRevision:v.projectRevision,requestId:uuid()});await refresh();
  }),
 };
}
