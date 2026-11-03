import {localEditAllowed} from './existing-local-edits';
import type {ConversationView} from './orchestrator/conversation/contract';
/**
 * #301 C24 — transport sans interface de la confirmation gratuite d'un rangement de fichier (contrat #305 de Codex).
 * Même discipline que la retouche gratuite du site : aucune règle métier, aucun devis, aucun consentement financier ;
 * le reçu affiché vient toujours du serveur, jamais d'un résultat optimiste.
 * - réponse perdue : la MÊME confirmation (corps et requestId identiques) est rejouée, jamais une nouvelle ;
 * - annulation avant accord : nouvelle sélection A2 de la même cible (la proposition est invalidée côté serveur).
 */
type Pending={action:'confirm-files';proposalId:string;confirmation:true;revision:number;projectRevision:number|null;requestId:string};
export type FilesConfirmationState={busy:boolean;error:string;uncertain:boolean;blocked?:boolean};
export type FilesChange={projectId:string;assetId:string;name:string;folderId:string|null;receiptId:string};
export const FILES_CHANGED_EVENT='studio:files-changed';
export const hasNativeFilesReceipt=(v:ConversationView)=>{const s=v.localFiles;return s?.state==='applied'&&s.actionsExecuted===true&&!!s.receiptId&&!!s.asset?.id&&Number.isInteger(s.asset.version);};
export const handlesFreeFiles=(v:ConversationView)=>!!v.localFiles&&(!!v.localFiles.command||v.localFiles.state==='proposed'||v.localFiles.state==='applied'||!!v.localFilesExecution?.enabled);
export function createLocalFilesConfirmation(options:{conversationId:string;fetch:typeof fetch;view:()=>ConversationView;onView:(v:ConversationView)=>void;onState:(s:FilesConfirmationState)=>void;onApplied:(change:FilesChange)=>Promise<void>|void;storage?:Pick<Storage,'getItem'|'setItem'|'removeItem'>;uuid?:()=>string}){
 const route=`/api/studio-agent/conversations/${options.conversationId}`,key=`syna-free-files:${options.conversationId}`;
 let alive=true,busy=false,pending:Pending|null=null,applied:string|undefined;
 let state:FilesConfirmationState={busy:false,error:'',uncertain:false};
 try{const raw=options.storage?.getItem(key);if(raw){const p=JSON.parse(raw);if(p.action==='confirm-files'&&typeof p.proposalId==='string'&&typeof p.requestId==='string'&&p.confirmation===true&&Number.isInteger(p.revision)&&(p.projectRevision===null||Number.isInteger(p.projectRevision)))pending=p;}}catch{/* stockage indisponible : jamais un accord */}
 state.uncertain=!!pending;
 const emit=(patch:Partial<FilesConfirmationState>)=>{state={...state,...patch};if(alive)options.onState(state);};
 const clear=()=>{pending=null;try{options.storage?.removeItem(key);}catch{}};
 const uuid=()=>options.uuid?.()??crypto.randomUUID();
 async function request(path:string,body?:unknown){const r=await options.fetch(path,body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{cache:'no-store'});const data=await r.json();if(!r.ok)throw Object.assign(new Error(data.error??`Erreur ${r.status}`),{status:r.status});return data;}
 async function accept(v:ConversationView){
  if(!alive)return;options.onView(v);
  if(hasNativeFilesReceipt(v)&&v.localFiles!.receiptId!==applied){const s=v.localFiles!;applied=s.receiptId;await options.onApplied({projectId:v.projectId!,assetId:s.asset!.id,name:s.asset!.name,folderId:s.asset!.folderId,receiptId:s.receiptId!});}
 }
 async function refresh(){const v=await request(route) as ConversationView;await accept(v);emit({blocked:!localEditAllowed(v,'files')||!v.localFilesExecution?.enabled});return v;}
 async function locked(action:()=>Promise<void>){
  if(busy||!alive)return;busy=true;emit({busy:true,error:''});
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
  refresh:()=>locked(async()=>{const v=await refresh();if(pending&&hasNativeFilesReceipt(v)&&v.localFiles!.receiptId===pending.requestId){clear();emit({uncertain:false,error:''});}}),
  confirm:()=>locked(async()=>{
   const v=options.view(),s=v.localFiles;if(!localEditAllowed(v,'files')||!v.localFilesExecution?.enabled)throw Object.assign(new Error('Rangement gratuit indisponible.'),{status:403});
   if(!pending){if(s?.state!=='proposed'||!s.proposalId||!s.diff||!s.asset)throw Object.assign(new Error('Demandez une nouvelle proposition gratuite.'),{status:409});pending={action:'confirm-files',proposalId:s.proposalId,confirmation:true,revision:v.revision,projectRevision:v.projectRevision,requestId:uuid()};try{options.storage?.setItem(key,JSON.stringify(pending));}catch{}}
   const response=await request(route,pending) as ConversationView;
   if(!hasNativeFilesReceipt(response))throw new Error('Enregistrement du fichier non confirmé.');
   const next=await refresh();if(!hasNativeFilesReceipt(next)||next.localFiles!.receiptId!==pending.requestId)throw new Error('Rangement enregistré à vérifier.');clear();emit({uncertain:false});
  }),
  cancel:()=>locked(async()=>{
   if(pending)throw new Error('Vérifiez d’abord la confirmation dont la réponse est incertaine.');
   const proposal=options.view().localFiles?.proposalId,v=await refresh(),context=v.activeContext?.presentation;
   if(!proposal||v.localFiles?.proposalId!==proposal||v.localFiles.state!=='proposed')return;
   if(context?.state!=='valid'||!context.selection)throw Object.assign(new Error('Le fichier désigné a changé : cette proposition ne peut plus être exécutée. Désignez-le de nouveau.'),{status:409});
   // La sélection A2 existante invalide la proposition en gardant exactement la même cible.
   await request(route+'/context',{action:'select',revision:v.revision,requestId:uuid(),context:context.selection});await refresh();
  }),
 };
}
