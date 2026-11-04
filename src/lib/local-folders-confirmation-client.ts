import {nativeLocalEditAllowed} from './existing-local-edits';
import type {ConversationView} from './orchestrator/conversation/contract';
/** Native folder creation transport: explicit free agreement, same-request retry, server receipt re-read. */
type Pending={action:'confirm-folder';proposalId:string;confirmation:true;revision:number;projectRevision:number|null;requestId:string};
export type LocalFoldersConfirmationState={busy:boolean;error:string;uncertain:boolean;blocked?:boolean};
export type LocalFoldersChange={projectId:string;folderId:string;name:string;parentId:string|null;receiptId:string};
export const LOCAL_FOLDERS_CHANGED_EVENT='studio:files-changed';
export const hasLocalFoldersReceipt=(v:ConversationView)=>{const s=v.localFolders;return s?.schema==='syna-local-folders-1'&&s.state==='applied'&&s.actionsExecuted===true&&s.financialConsent===false&&s.costEur===0&&s.providerCalls===0&&s.publication===false&&s.confirmationRequired===false&&!!s.receiptId&&!!s.proposalId&&s.projectId===v.projectId&&!!s.result?.id&&s.result.system===false&&s.diff?.before===null&&s.result.name===s.diff.after.name&&s.result.parentId===s.diff.after.parentId;};
export const handlesLocalFolders=(v:ConversationView)=>!!v.localFolders&&(v.localFolders.state==='proposed'||v.localFolders.state==='applied'||!!v.localFoldersExecution?.enabled);
export function createLocalFoldersConfirmation(options:{conversationId:string;fetch:typeof fetch;view:()=>ConversationView;onView:(v:ConversationView)=>void;onState:(s:LocalFoldersConfirmationState)=>void;onApplied:(change:LocalFoldersChange)=>Promise<void>|void;storage?:Pick<Storage,'getItem'|'setItem'|'removeItem'>;uuid?:()=>string}){
 // A controller may outlive its rendered conversation until effect cleanup.
 const scopeProject=options.view().projectId;
 const inScope=()=>options.view().id===options.conversationId&&options.view().projectId===scopeProject;
 const route=`/api/studio-agent/conversations/${options.conversationId}`,key=`syna-free-folder:${options.conversationId}`;
 let alive=true,busy=false,pending:Pending|null=null,applied:string|undefined;
 let state:LocalFoldersConfirmationState={busy:false,error:'',uncertain:false};
 try{const raw=options.storage?.getItem(key);if(raw){const p=JSON.parse(raw);if(p.action==='confirm-folder'&&typeof p.proposalId==='string'&&typeof p.requestId==='string'&&p.confirmation===true&&Number.isInteger(p.revision)&&(p.projectRevision===null||Number.isInteger(p.projectRevision)))pending=p;}}catch{/* stockage indisponible : jamais un accord */}
 state.uncertain=!!pending;
 const emit=(patch:Partial<LocalFoldersConfirmationState>)=>{state={...state,...patch};if(alive&&inScope())options.onState(state);};
 const clear=()=>{pending=null;try{options.storage?.removeItem(key);}catch{}};
 const reconcile=(v:ConversationView)=>{const proposal=v.localFolders;if(pending&&proposal?.state==='proposed'&&proposal.proposalId&&pending.proposalId!==proposal.proposalId){clear();emit({uncertain:false,error:''});}};
 const uuid=()=>options.uuid?.()??crypto.randomUUID();
 async function request(path:string,body?:unknown){if(!alive||!inScope())throw new Error('Conversation changée.');const r=await options.fetch(path,body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{cache:'no-store'});const data=await r.json();if(!r.ok)throw Object.assign(new Error(data.error??`Erreur ${r.status}`),{status:r.status});return data;}
 async function accept(v:ConversationView){
  if(!alive||!inScope())return;options.onView(v);
  if(hasLocalFoldersReceipt(v)&&v.localFolders!.receiptId!==applied){const s=v.localFolders!;applied=s.receiptId;await options.onApplied({projectId:v.projectId!,folderId:s.result!.id,name:s.result!.name,parentId:s.result!.parentId,receiptId:s.receiptId!});}
 }
 async function refresh(){const v=await request(route) as ConversationView;if(inScope())reconcile(v);await accept(v);emit({blocked:!nativeLocalEditAllowed(v)||!v.localFoldersExecution?.enabled});return v;}
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
  refresh:()=>locked(async()=>{const v=await refresh();if(pending&&hasLocalFoldersReceipt(v)&&v.localFolders!.receiptId===pending.requestId){clear();emit({uncertain:false,error:''});}}),
  confirm:()=>locked(async()=>{
   const v=options.view(),s=v.localFolders;if(!nativeLocalEditAllowed(v)||!v.localFoldersExecution?.enabled)throw Object.assign(new Error('Modification gratuite indisponible.'),{status:403});
   if(!pending){if(s?.state!=='proposed'||!s.proposalId||!s.diff)throw Object.assign(new Error('Demandez une nouvelle proposition gratuite.'),{status:409});pending={action:'confirm-folder',proposalId:s.proposalId,confirmation:true,revision:v.revision,projectRevision:v.projectRevision,requestId:uuid()};try{options.storage?.setItem(key,JSON.stringify(pending));}catch{}}
   const command=pending;const response=await request(route,command) as ConversationView;
   if(!hasLocalFoldersReceipt(response))throw new Error('Enregistrement du dossier non confirmé.');
   const next=await refresh();if(!hasLocalFoldersReceipt(next)||next.localFolders!.receiptId!==command.requestId)throw new Error('Modification enregistrée à vérifier.');clear();emit({uncertain:false});
  }),
  cancel:()=>locked(async()=>{
   if(pending)throw new Error('Vérifiez d’abord la confirmation dont la réponse est incertaine.');
   const proposal=options.view().localFolders?.proposalId,v=await refresh();
   if(!proposal||v.localFolders?.proposalId!==proposal||v.localFolders.state!=='proposed')return;
   await request(route,{action:'cancel-folder',proposalId:proposal,revision:v.revision,projectRevision:v.projectRevision,requestId:uuid()});await refresh();
  }),
 };
}
