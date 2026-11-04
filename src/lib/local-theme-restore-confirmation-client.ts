import type {ConversationView} from './orchestrator/conversation/contract';
/** Native restore transport: explicit free agreement, same-request retry, server receipt re-read. */
type Pending={action:'confirm-restore';proposalId:string;confirmation:true;revision:number;projectRevision:number|null;requestId:string};
export type LocalThemeRestoreConfirmationState={busy:boolean;error:string;uncertain:boolean;blocked?:boolean};
export type LocalThemeRestoreChange={projectId:string;versionId:string;receiptId:string};
export const LOCAL_THEME_RESTORE_CHANGED_EVENT='studio:theme-changed';
export const hasLocalThemeRestoreReceipt=(v:ConversationView)=>{const s=v.localThemeRestore;return s?.schema==='syna-local-theme-restore-1'&&s.state==='applied'&&s.actionsExecuted===true&&s.financialConsent===false&&s.costEur===0&&s.providerCalls===0&&s.publication===false&&s.confirmationRequired===false&&!!s.receiptId&&s.projectId===v.projectId&&!!s.targetVersionId&&!!s.version?.id&&!!s.version.parentId&&s.version.id!==s.version.parentId&&Number.isSafeInteger(s.version.number)&&s.version.number>1&&!!s.previewHref;};
export const handlesLocalThemeRestore=(v:ConversationView)=>!!v.localThemeRestore&&(v.localThemeRestore.state==='proposed'||v.localThemeRestore.state==='applied'||!!v.localThemeRestoreExecution?.enabled);
export function createLocalThemeRestoreConfirmation(options:{conversationId:string;fetch:typeof fetch;view:()=>ConversationView;onView:(v:ConversationView)=>void;onState:(s:LocalThemeRestoreConfirmationState)=>void;onApplied:(change:LocalThemeRestoreChange)=>Promise<void>|void;storage?:Pick<Storage,'getItem'|'setItem'|'removeItem'>;uuid?:()=>string}){
 // A controller may outlive its rendered conversation until effect cleanup.
 const scopeProject=options.view().projectId;
 const inScope=()=>options.view().id===options.conversationId&&options.view().projectId===scopeProject;
 const route=`/api/studio-agent/conversations/${options.conversationId}`,key=`syna-free-restore:${options.conversationId}`;
 let alive=true,busy=false,pending:Pending|null=null,applied:string|undefined;
 let state:LocalThemeRestoreConfirmationState={busy:false,error:'',uncertain:false};
 try{const raw=options.storage?.getItem(key);if(raw){const p=JSON.parse(raw);if(p.action==='confirm-restore'&&typeof p.proposalId==='string'&&typeof p.requestId==='string'&&p.confirmation===true&&Number.isInteger(p.revision)&&(p.projectRevision===null||Number.isInteger(p.projectRevision)))pending=p;}}catch{/* restoreage indisponible : jamais un accord */}
 state.uncertain=!!pending;
 const emit=(patch:Partial<LocalThemeRestoreConfirmationState>)=>{state={...state,...patch};if(alive&&inScope())options.onState(state);};
 const clear=()=>{pending=null;try{options.storage?.removeItem(key);}catch{}};
 const reconcile=(v:ConversationView)=>{const proposal=v.localThemeRestore;if(pending&&proposal?.state==='proposed'&&proposal.proposalId&&pending.proposalId!==proposal.proposalId){clear();emit({uncertain:false,error:''});}};
 const uuid=()=>options.uuid?.()??crypto.randomUUID();
 async function request(path:string,body?:unknown){if(!alive||!inScope())throw new Error('Conversation changée.');const r=await options.fetch(path,body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{cache:'no-store'});const data=await r.json();if(!r.ok)throw Object.assign(new Error(data.error??`Erreur ${r.status}`),{status:r.status});return data;}
 async function accept(v:ConversationView){
  if(!alive||!inScope())return;options.onView(v);
  if(hasLocalThemeRestoreReceipt(v)&&v.localThemeRestore!.receiptId!==applied){const s=v.localThemeRestore!;applied=s.receiptId;await options.onApplied({projectId:v.projectId!,versionId:s.version!.id,receiptId:s.receiptId!});}
 }
 async function refresh(){const v=await request(route) as ConversationView;if(inScope())reconcile(v);await accept(v);emit({blocked:!!v.recovery||!!v.readOnlyReason||!v.localThemeRestoreExecution?.enabled});return v;}
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
  refresh:()=>locked(async()=>{const v=await refresh();if(pending&&hasLocalThemeRestoreReceipt(v)&&v.localThemeRestore!.receiptId===pending.requestId){clear();emit({uncertain:false,error:''});}}),
  confirm:()=>locked(async()=>{
   const v=options.view(),s=v.localThemeRestore;if(v.recovery||!v.localThemeRestoreExecution?.enabled||v.readOnlyReason)throw Object.assign(new Error('Modification gratuite indisponible.'),{status:403});
   if(!pending){if(s?.state!=='proposed'||!s.proposalId||!s.diff)throw Object.assign(new Error('Demandez une nouvelle proposition gratuite.'),{status:409});pending={action:'confirm-restore',proposalId:s.proposalId,confirmation:true,revision:v.revision,projectRevision:v.projectRevision,requestId:uuid()};try{options.storage?.setItem(key,JSON.stringify(pending));}catch{}}
   const command=pending;const response=await request(route,command) as ConversationView;
   if(!hasLocalThemeRestoreReceipt(response))throw new Error('Enregistrement du restore non confirmé.');
   const next=await refresh();if(!hasLocalThemeRestoreReceipt(next)||next.localThemeRestore!.receiptId!==command.requestId)throw new Error('Modification enregistrée à vérifier.');clear();emit({uncertain:false});
  }),
  cancel:()=>locked(async()=>{
   if(pending)throw new Error('Vérifiez d’abord la confirmation dont la réponse est incertaine.');
   const proposal=options.view().localThemeRestore?.proposalId,v=await refresh();
   if(!proposal||v.localThemeRestore?.proposalId!==proposal||v.localThemeRestore.state!=='proposed')return;
   await request(route,{action:'cancel-restore',proposalId:proposal,revision:v.revision,projectRevision:v.projectRevision,requestId:uuid()});await refresh();
  }),
 };
}
