import {localEditAllowed} from './existing-local-edits';
import type {ConversationView} from './orchestrator/conversation/contract';
/** Native folder move transport: explicit free agreement, same-request retry, server receipt re-read. */
type Pending={action:'confirm-folder-move';proposalId:string;confirmation:true;revision:number;projectRevision:number|null;requestId:string};
export type LocalFolderMoveConfirmationState={busy:boolean;error:string;uncertain:boolean;blocked?:boolean};
export type LocalFolderMoveChange={projectId:string;folderId:string;name:string;parentId:string|null;receiptId:string};
export const LOCAL_FOLDER_MOVE_CHANGED_EVENT='studio:files-changed';
export const hasLocalFolderMoveReceipt=(v:ConversationView)=>{
 const s=v.localFolderMove,b=s?.diff?.before,a=s?.diff?.after,r=s?.result;
 return s?.schema==='syna-folder-move-1'&&s.state==='applied'&&s.actionsExecuted===true&&s.financialConsent===false&&s.costEur===0&&s.providerCalls===0&&s.publication===false&&s.confirmationRequired===false&&typeof s.receiptId==='string'&&!!s.receiptId&&typeof s.proposalId==='string'&&!!s.proposalId&&typeof v.projectId==='string'&&!!v.projectId&&s.projectId===v.projectId&&typeof r?.id==='string'&&!!r.id&&!!a&&!!b&&typeof b.name==='string'&&typeof a.name==='string'&&(a.parentId===null||typeof a.parentId==='string'&&!!a.parentId)&&b.id===a.id&&a.id===r.id&&b.name===a.name&&a.name===r.name&&(b.parentId===null||typeof b.parentId==='string'&&!!b.parentId)&&b.parentId!==a.parentId&&a.parentId!==a.id&&a.parentId===r.parentId&&typeof b.system==='boolean'&&b.system===a.system&&a.system===r.system;
};
export const handlesLocalFolderMove=(v:ConversationView)=>!!v.localFolderMove&&(v.localFolderMove.state==='proposed'||v.localFolderMove.state==='applied'||!!v.localFolderMoveExecution?.enabled);
export function createLocalFolderMoveConfirmation(options:{conversationId:string;fetch:typeof fetch;view:()=>ConversationView;onView:(v:ConversationView)=>void;onState:(s:LocalFolderMoveConfirmationState)=>void;onApplied:(change:LocalFolderMoveChange)=>Promise<void>|void;storage?:Pick<Storage,'getItem'|'setItem'|'removeItem'>;uuid?:()=>string}){
 // A controller may outlive its rendered conversation until effect cleanup.
 const scopeProject=options.view().projectId;
 const inScope=()=>options.view().id===options.conversationId&&options.view().projectId===scopeProject;
 const route=`/api/studio-agent/conversations/${options.conversationId}`,key=`syna-free-folder-move:${options.conversationId}:${scopeProject}`;
 let alive=true,busy=false,pending:Pending|null=null,applied:string|undefined;
 let state:LocalFolderMoveConfirmationState={busy:false,error:'',uncertain:false};
 try{const raw=options.storage?.getItem(key);if(raw){const p=JSON.parse(raw);if(p.action==='confirm-folder-move'&&typeof p.proposalId==='string'&&typeof p.requestId==='string'&&p.confirmation===true&&Number.isInteger(p.revision)&&(p.projectRevision===null||Number.isInteger(p.projectRevision)))pending=p;}}catch{/* stockage indisponible : jamais un accord */}
 state.uncertain=!!pending;
 const emit=(patch:Partial<LocalFolderMoveConfirmationState>)=>{state={...state,...patch};if(alive&&inScope())options.onState(state);};
 const clear=()=>{pending=null;try{options.storage?.removeItem(key);}catch{}};
 const reconcile=(v:ConversationView)=>{const proposal=v.localFolderMove;if(pending&&proposal?.state==='proposed'&&proposal.proposalId&&pending.proposalId!==proposal.proposalId){clear();emit({uncertain:false,error:''});}};
 const uuid=()=>options.uuid?.()??crypto.randomUUID();
 async function request(path:string,body?:unknown){if(!alive||!inScope())throw new Error('Conversation changée.');const r=await options.fetch(path,body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{cache:'no-store'});const data=await r.json();if(!r.ok)throw Object.assign(new Error(data.error??`Erreur ${r.status}`),{status:r.status});if(data.id!==options.conversationId||data.projectId!==scopeProject)throw new Error('Réponse d’une autre conversation ou d’un autre projet.');return data;}
 async function accept(v:ConversationView){
  if(!alive||!inScope()||v.id!==options.conversationId||v.projectId!==scopeProject)return;options.onView(v);if(!alive||!inScope())return;
  if(hasLocalFolderMoveReceipt(v)&&v.localFolderMove!.receiptId!==applied){const s=v.localFolderMove!;applied=s.receiptId;await options.onApplied({projectId:v.projectId!,folderId:s.result!.id,name:s.result!.name,parentId:s.result!.parentId,receiptId:s.receiptId!});}
 }
 async function refresh(){const v=await request(route) as ConversationView;if(inScope())reconcile(v);await accept(v);emit({blocked:!localEditAllowed(v,'folder-move')||!v.localFolderMoveExecution?.enabled});return v;}
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
  refresh:()=>locked(async()=>{const v=await refresh();if(pending&&hasLocalFolderMoveReceipt(v)&&v.localFolderMove!.receiptId===pending.requestId){clear();emit({uncertain:false,error:''});}}),
  confirm:()=>locked(async()=>{
   const v=options.view(),s=v.localFolderMove;if(!localEditAllowed(v,'folder-move')||!v.localFolderMoveExecution?.enabled)throw Object.assign(new Error('Modification gratuite indisponible.'),{status:403});
   if(!pending){if(s?.state!=='proposed'||!s.proposalId||!s.diff)throw Object.assign(new Error('Demandez une nouvelle proposition gratuite.'),{status:409});pending={action:'confirm-folder-move',proposalId:s.proposalId,confirmation:true,revision:v.revision,projectRevision:v.projectRevision,requestId:uuid()};try{options.storage?.setItem(key,JSON.stringify(pending));}catch{}}
   const command=pending;const response=await request(route,command) as ConversationView;
   if(!hasLocalFolderMoveReceipt(response)||response.localFolderMove!.receiptId!==command.requestId||response.localFolderMove!.proposalId!==command.proposalId)throw new Error('Enregistrement du dossier non confirmé.');
   const next=await refresh();if(!hasLocalFolderMoveReceipt(next)||next.localFolderMove!.receiptId!==command.requestId)throw new Error('Modification enregistrée à vérifier.');clear();emit({uncertain:false});
  }),
  cancel:()=>locked(async()=>{
   if(pending)throw new Error('Vérifiez d’abord la confirmation dont la réponse est incertaine.');
   const proposal=options.view().localFolderMove?.proposalId,v=await refresh();
   if(!proposal||v.localFolderMove?.proposalId!==proposal||v.localFolderMove.state!=='proposed')return;
   await request(route,{action:'cancel-folder-move',proposalId:proposal,revision:v.revision,projectRevision:v.projectRevision,requestId:uuid()});await refresh();
  }),
 };
}
