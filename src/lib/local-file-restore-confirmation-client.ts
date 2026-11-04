import type {ConversationView} from './orchestrator/conversation/contract';
/** Native file restoration transport: explicit free agreement, same-request retry, server receipt re-read. */
type Pending={action:'confirm-file-restore';proposalId:string;confirmation:true;revision:number;projectRevision:number|null;requestId:string};
export type LocalFileRestoreConfirmationState={busy:boolean;error:string;uncertain:boolean;blocked?:boolean};
export type LocalFileRestoreChange={projectId:string;assetId:string;version:number;folderId:string|null;receiptId:string};
export const LOCAL_FILE_RESTORE_CHANGED_EVENT='studio:files-changed';
export const hasLocalFileRestoreReceipt=(v:ConversationView)=>{const s=v.localFileRestore;return s?.schema==='syna-local-file-restore-1'&&s.state==='applied'&&s.actionsExecuted===true&&s.financialConsent===false&&s.costEur===0&&s.providerCalls===0&&s.publication===false&&s.confirmationRequired===false&&!!s.receiptId&&!!s.proposalId&&s.projectId===v.projectId&&!!s.asset?.id&&Number.isSafeInteger(s.asset.version)&&s.asset.version>0&&!!s.diff&&Number.isFinite(s.diff.before.deletedAt)&&s.diff.before.deletedAt>=0&&s.asset.deletedAt===s.diff.before.deletedAt&&s.diff.before.folderId===s.diff.after.folderId&&s.diff.after.deletedAt===null&&s.result?.id===s.asset.id&&s.result.version===s.asset.version&&s.result.deletedAt===null&&s.result.folderId===s.diff.after.folderId;};
export const handlesLocalFileRestore=(v:ConversationView)=>!!v.localFileRestore&&(v.localFileRestore.state==='proposed'||v.localFileRestore.state==='applied'||!!v.localFileRestoreExecution?.enabled);
export function createLocalFileRestoreConfirmation(options:{conversationId:string;fetch:typeof fetch;view:()=>ConversationView;onView:(v:ConversationView)=>void;onState:(s:LocalFileRestoreConfirmationState)=>void;onApplied:(change:LocalFileRestoreChange)=>Promise<void>|void;storage?:Pick<Storage,'getItem'|'setItem'|'removeItem'>;uuid?:()=>string}){
 // A controller may outlive its rendered conversation until effect cleanup.
 const scopeProject=options.view().projectId;
 const inScope=()=>options.view().id===options.conversationId&&options.view().projectId===scopeProject;
 const route=`/api/studio-agent/conversations/${options.conversationId}`,key=`syna-free-file-restore:${options.conversationId}`;
 let alive=true,busy=false,pending:Pending|null=null,applied:string|undefined;
 let state:LocalFileRestoreConfirmationState={busy:false,error:'',uncertain:false};
 try{const raw=options.storage?.getItem(key);if(raw){const p=JSON.parse(raw);if(p.action==='confirm-file-restore'&&typeof p.proposalId==='string'&&typeof p.requestId==='string'&&p.confirmation===true&&Number.isInteger(p.revision)&&(p.projectRevision===null||Number.isInteger(p.projectRevision)))pending=p;}}catch{/* stockage indisponible : jamais un accord */}
 state.uncertain=!!pending;
 const emit=(patch:Partial<LocalFileRestoreConfirmationState>)=>{state={...state,...patch};if(alive&&inScope())options.onState(state);};
 const clear=()=>{pending=null;try{options.storage?.removeItem(key);}catch{}};
 const reconcile=(v:ConversationView)=>{const proposal=v.localFileRestore;if(pending&&proposal?.state==='proposed'&&proposal.proposalId&&pending.proposalId!==proposal.proposalId){clear();emit({uncertain:false,error:''});}};
 const uuid=()=>options.uuid?.()??crypto.randomUUID();
 async function request(path:string,body?:unknown){if(!alive||!inScope())throw new Error('Conversation changée.');const r=await options.fetch(path,body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{cache:'no-store'});const data=await r.json();if(!r.ok)throw Object.assign(new Error(data.error??`Erreur ${r.status}`),{status:r.status});return data;}
 async function accept(v:ConversationView){
  if(!alive||!inScope())return;options.onView(v);
  if(hasLocalFileRestoreReceipt(v)&&v.localFileRestore!.receiptId!==applied){const s=v.localFileRestore!;applied=s.receiptId;await options.onApplied({projectId:v.projectId!,assetId:s.result!.id,version:s.result!.version,folderId:s.result!.folderId,receiptId:s.receiptId!});}
 }
 async function refresh(){const v=await request(route) as ConversationView;if(inScope())reconcile(v);await accept(v);emit({blocked:!!v.recovery||!!v.readOnlyReason||!v.localFileRestoreExecution?.enabled});return v;}
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
  refresh:()=>locked(async()=>{const v=await refresh();if(pending&&hasLocalFileRestoreReceipt(v)&&v.localFileRestore!.receiptId===pending.requestId){clear();emit({uncertain:false,error:''});}}),
  confirm:()=>locked(async()=>{
   const v=options.view(),s=v.localFileRestore;if(v.recovery||!v.localFileRestoreExecution?.enabled||v.readOnlyReason)throw Object.assign(new Error('Modification gratuite indisponible.'),{status:403});
   if(!pending){if(s?.state!=='proposed'||!s.proposalId||!s.diff||!s.asset)throw Object.assign(new Error('Demandez une nouvelle proposition gratuite.'),{status:409});pending={action:'confirm-file-restore',proposalId:s.proposalId,confirmation:true,revision:v.revision,projectRevision:v.projectRevision,requestId:uuid()};try{options.storage?.setItem(key,JSON.stringify(pending));}catch{}}
   const command=pending;const response=await request(route,command) as ConversationView;
   if(!hasLocalFileRestoreReceipt(response))throw new Error('Restauration du fichier non confirmé.');
   const next=await refresh();if(!hasLocalFileRestoreReceipt(next)||next.localFileRestore!.receiptId!==command.requestId)throw new Error('Modification enregistrée à vérifier.');clear();emit({uncertain:false});
  }),
  cancel:()=>locked(async()=>{
   if(pending)throw new Error('Vérifiez d’abord la confirmation dont la réponse est incertaine.');
   const proposal=options.view().localFileRestore?.proposalId,v=await refresh();
   if(!proposal||v.localFileRestore?.proposalId!==proposal||v.localFileRestore.state!=='proposed')return;
   await request(route,{action:'cancel-file-restore',proposalId:proposal,revision:v.revision,projectRevision:v.projectRevision,requestId:uuid()});await refresh();
  }),
 };
}
