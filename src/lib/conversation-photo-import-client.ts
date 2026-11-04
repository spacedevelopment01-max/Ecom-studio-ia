import type {ConversationView} from './orchestrator/conversation/contract';
import type {ConversationPhotoReceipt} from './orchestrator/conversation/photo-import';
export const CONVERSATION_PHOTO_IMPORTED_EVENT='studio:files-changed';
export type PhotoImportState={busy:boolean;uncertain:boolean;error:string;requiresFile:boolean};
type Pending={requestId:string;projectId:string;name:string;size:number;mime:string;folderId:string|null};
export function hasConversationPhotoReceipt(value:unknown,cid:string,pid:string,requestId:string):value is ConversationPhotoReceipt&{asset:NonNullable<ConversationPhotoReceipt['asset']>}{
 const r=value as ConversationPhotoReceipt|null;return !!r&&r.schema==='syna-conversation-photo-import-1'&&r.state==='saved'&&r.conversationId===cid&&r.projectId===pid&&r.receiptId===requestId&&r.financialConsent===false&&r.costEur===0&&r.providerCalls===0&&r.analysis===false&&r.publication===false&&r.confirmationRequired===false&&r.actionsExecuted===true&&!!r.asset?.id&&r.asset.photoId===r.asset.id&&Number.isSafeInteger(r.asset.version)&&r.asset.version>0&&typeof r.asset.mime==='string'&&r.asset.mime.startsWith('image/')&&r.asset.href===`/api/files/${r.asset.id}`;
}
/** Persist only the import identity, never photo bytes. Reload verifies the server receipt first. */
export function createConversationPhotoImport(options:{conversationId:string;view:()=>ConversationView;fetch:typeof fetch;onState:(s:PhotoImportState)=>void;onReceipt:(r:ConversationPhotoReceipt)=>void;onImported:(change:{projectId:string;assetId:string;receiptId:string})=>void|Promise<void>;storage?:Pick<Storage,'getItem'|'setItem'|'removeItem'>;uuid?:()=>string}){
 const projectId=options.view().projectId,route=`/api/studio-agent/conversations/${options.conversationId}/photos`,key=`syna-photo-import:${options.conversationId}:${projectId}`;
 let alive=true,busy=false,pending:Pending|null=null,file:File|null=null,applied:string|undefined;
 const inScope=()=>alive&&!!projectId&&options.view().id===options.conversationId&&options.view().projectId===projectId;
 try{const raw=options.storage?.getItem(key);if(raw){const p=JSON.parse(raw);if(p.projectId===projectId&&typeof p.requestId==='string'&&p.requestId&&typeof p.name==='string'&&Number.isSafeInteger(p.size)&&p.size>0&&typeof p.mime==='string'&&(p.folderId===null||typeof p.folderId==='string'))pending=p;}}catch{/* Storage is not authority. */}
 let state:PhotoImportState={busy:false,uncertain:!!pending,error:'',requiresFile:!!pending};
 const emit=(patch:Partial<PhotoImportState>)=>{state={...state,...patch};if(inScope())options.onState(state);};
 const clear=()=>{pending=null;file=null;try{options.storage?.removeItem(key);}catch{}};
 const enabled=()=>inScope()&&!options.view().readOnlyReason&&!options.view().recovery&&options.view().photoImport?.enabled===true;
 async function request(init?:RequestInit){const requestId=pending!.requestId,r=await options.fetch(init?route:route+'?requestId='+encodeURIComponent(requestId),init??{cache:'no-store'}),body=await r.json();if(!r.ok)throw Object.assign(new Error(body.error??`Erreur ${r.status}`),{status:r.status});return body;}
 async function accept(body:unknown,requestId:string){
  if(!inScope())return;if(!hasConversationPhotoReceipt(body,options.conversationId,projectId!,requestId))throw Error('Import non confirmé par un reçu natif. Aucun résultat visuel déduit.');
  if(applied!==requestId){options.onReceipt(body);if(!inScope())return;applied=requestId;await options.onImported({projectId:projectId!,assetId:body.asset.id,receiptId:requestId});}
  if(inScope()){clear();emit({uncertain:false,requiresFile:false,error:''});}
 }
 async function verify(){if(!pending||!inScope())return;const requestId=pending.requestId,body=await request();if(!inScope())return;
  const r=body as ConversationPhotoReceipt;if(r?.schema==='syna-conversation-photo-import-1'&&r.state==='pending'&&r.conversationId===options.conversationId&&r.projectId===projectId&&r.receiptId===requestId&&r.analysis===false&&r.providerCalls===0&&r.costEur===0&&r.actionsExecuted===false){emit({uncertain:true,error:'Import en cours. Vérifiez à nouveau ou réessayez le même fichier.',requiresFile:!file});return;}
  await accept(body,requestId);
 }
 async function locked(fn:()=>Promise<void>){if(busy||!inScope())return;busy=true;emit({busy:true,error:''});try{await fn();}catch(e){emit({uncertain:!!pending,requiresFile:!!pending&&!file,error:(e as Error).message});}finally{busy=false;emit({busy:false});}}
 async function send(){if(!pending||!file)throw Error('Sélectionnez le même fichier pour reprendre cet import, ou vérifiez son reçu.');const requestId=pending.requestId,form=new FormData();form.set('requestId',requestId);form.set('file',file);if(pending.folderId)form.set('folderId',pending.folderId);await request({method:'POST',body:form});if(inScope())await verify();}
 return{getState:()=>state,dispose(){alive=false;},activate(){alive=true;},
  verify:()=>locked(verify),
  upload:(selected:File,folderId:string|null=null)=>locked(async()=>{if(!enabled())throw Error('Import gratuit indisponible pour cette conversation.');if(pending)throw Error('Vérifiez l’import précédent ou réessayez le même fichier avant un nouvel envoi.');if(!selected.size||selected.size>options.view().photoImport!.maxFileBytes||!selected.type.startsWith('image/'))throw Error('Une photo du type et de la taille autorisés est attendue.');pending={requestId:options.uuid?.()??crypto.randomUUID(),projectId:projectId!,name:selected.name,size:selected.size,mime:selected.type,folderId};file=selected;try{options.storage?.setItem(key,JSON.stringify(pending));}catch{}emit({uncertain:true,requiresFile:false});try{await send();}catch(e){if([400,413,415,429].includes((e as {status?:number}).status??0)){clear();emit({uncertain:false,requiresFile:false});}throw e;}}),
  retry:(selected?:File)=>locked(async()=>{if(!enabled())throw Error('Import gratuit indisponible.');if(!pending)throw Error('Aucun import à reprendre.');if(selected){if(selected.name!==pending.name||selected.size!==pending.size||selected.type!==pending.mime)throw Error('Resélectionnez le même fichier. Aucun nouvel import lancé.');file=selected;}await send();}),
 };
}
