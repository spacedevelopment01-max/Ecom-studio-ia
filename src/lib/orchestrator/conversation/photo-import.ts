/** Photo ingestion is an explicit free upload, never permission for vision or generation. */
import {createHash} from 'node:crypto';
import {HttpError,type User} from '../../auth';
import {one,run,tx,id,now} from '../../db';
import {stableHash} from '../../brain/hash';
import {saveAsset,getAsset,assetData,assetUrl} from '../../library';
import {checkedUpload} from '../../upload-security';
import {requirePlan} from '../../plan-gates';
import {rateTake} from '../../rate-limit';
import {ownedConversation} from './store';
import {localFilesEnabled} from './local-files';
export const MAX_CONVERSATION_PHOTO_BYTES=200*1048576;
const digest=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
type ImportRow={conversation_id:string;request_id:string;project_id:string;request_hash:string;data_hash:string;state:'pending'|'saved';lease_token:string;asset_id:string|null;updated_at:number};
export type ConversationPhotoReceipt={schema:'syna-conversation-photo-import-1';state:'pending'|'saved';conversationId:string;projectId:string;receiptId:string;financialConsent:false;costEur:0;providerCalls:0;analysis:false;publication:false;confirmationRequired:false;actionsExecuted:boolean;message:string;asset?:{id:string;version:number;name:string;mime:string;href:string;thumbHref:string;photoId:string};};
export function assertConversationPhotoImport(user:User,cid:string){if(!localFilesEnabled())throw new HttpError(404,'Import de photos dans SINA indisponible.');const c=ownedConversation(user,cid);if(!c.project_id)throw new HttpError(409,'Créez ou rattachez le projet avant d’importer une photo. Aucun projet implicite.');requirePlan(user,c.project_id);return c;}
function receipt(row:ImportRow):ConversationPhotoReceipt{
 const base={schema:'syna-conversation-photo-import-1' as const,state:row.state,conversationId:row.conversation_id,projectId:row.project_id,receiptId:row.request_id,financialConsent:false as const,costEur:0 as const,providerCalls:0 as const,analysis:false as const,publication:false as const,confirmationRequired:false as const,actionsExecuted:row.state==='saved'};
 if(row.state==='pending')return{...base,message:'Import local en cours. Vérifiez son reçu ou réessayez avec le même fichier et le même identifiant ; aucune analyse ni génération.'};
 const a=row.asset_id?getAsset(row.asset_id):null;if(!a||a.project_id!==row.project_id||a.deleted_at||a.status==='rejected'||a.origin!=='upload'||a.kind!=='image')throw new HttpError(409,'La photo importée n’est plus disponible. Aucun nouvel import automatique.','conversation_photo_unavailable');
 try{if(digest(assetData(a))!==row.data_hash)throw Error('changed');}catch{throw new HttpError(409,'Les octets de la photo importée ne sont plus disponibles dans cette version. Aucun doublon créé.','conversation_photo_unavailable');}
 return{...base,message:'Photo importée dans la bibliothèque native et relue. Aucune analyse visuelle effectuée. Joignez son identifiant au message si vous souhaitez la désigner.',asset:{id:a.id,version:a.version,name:a.name,mime:a.mime,href:assetUrl(a),thumbHref:assetUrl(a,{thumb:!!a.thumb_key}),photoId:a.id}};
}
export function conversationPhotoReceipt(user:User,cid:string,requestId:string){const c=assertConversationPhotoImport(user,cid),row=one<ImportRow>('SELECT * FROM agent_conversation_photo_imports WHERE conversation_id=? AND request_id=? AND project_id=?',cid,requestId,c.project_id);if(!row)throw new HttpError(404,'Reçu d’import introuvable.');return receipt(row);}
export async function importConversationPhoto(user:User,cid:string,input:{requestId:string;file:File;folderId?:string|null}):Promise<ConversationPhotoReceipt>{
 const initial=assertConversationPhotoImport(user,cid),folder=input.folderId??null;
 if(!input.requestId||input.requestId.length>120)throw new HttpError(400,'Identifiant de reprise requis.');if(!input.file.size||input.file.size>MAX_CONVERSATION_PHOTO_BYTES)throw new HttpError(413,'Une photo non vide de 200 Mo maximum est attendue.');
 if(folder&&!one('SELECT 1 FROM folders WHERE id=? AND project_id=?',folder,initial.project_id))throw new HttpError(404,'Dossier introuvable.');
 if(/\.(html?|xhtml|xml|js|mjs|exe|sh|bat|cmd|php)$/i.test(input.file.name))throw new HttpError(415,'Type de fichier actif refusé comme dans l’import natif.');
 const data=Buffer.from(await input.file.arrayBuffer());if(data.length!==input.file.size||data.length>MAX_CONVERSATION_PHOTO_BYTES)throw new HttpError(413,'Taille de photo invalide.');
 const mime=await checkedUpload(data,input.file.name,input.file.type);if(!mime.startsWith('image/'))throw new HttpError(415,'Cet import conversationnel accepte une photo. Pour les documents et vidéos, utilisez Fichiers. Aucun contenu analysé.');
 const dataHash=digest(data),hash=stableHash('conversation-photo-import-1',{dataHash,name:input.file.name,mime,folder}),token=id();
 const claimed=tx(()=>{
  const c=assertConversationPhotoImport(user,cid);if(c.project_id!==initial.project_id)throw new HttpError(409,'Le projet de cette conversation a changé.');
  const previous=one<ImportRow>('SELECT * FROM agent_conversation_photo_imports WHERE conversation_id=? AND request_id=?',cid,input.requestId);
  if(previous){if(previous.project_id!==c.project_id||previous.request_hash!==hash)throw new HttpError(409,'Cet identifiant correspond à une autre photo ou destination. Aucun doublon.');if(previous.state==='saved'||previous.updated_at>now()-5*60000)return{row:previous,work:false};}
  if(!rateTake([{key:`upload:${user.id}`,max:60,windowMs:10*60000}]))throw new HttpError(429,'Trop d’envois rapprochés. Réessayez plus tard.');
  run("INSERT INTO agent_conversation_photo_imports(conversation_id,request_id,project_id,request_hash,data_hash,state,lease_token,asset_id,updated_at) VALUES(?,?,?,?,?,'pending',?,NULL,?) ON CONFLICT(conversation_id,request_id) DO UPDATE SET lease_token=excluded.lease_token,updated_at=excluded.updated_at",cid,input.requestId,c.project_id,hash,dataHash,token,now());return{work:true};
 });
 if(!claimed.work)return receipt(claimed.row!);
 try{
  await saveAsset({projectId:initial.project_id!,userId:user.id,name:input.file.name,mime,data,folderId:folder,role:'original',origin:'upload',meta:{uploadedAt:now(),conversationImport:{conversationId:cid,requestId:input.requestId}}},asset=>{
   const c=assertConversationPhotoImport(user,cid);if(c.project_id!==initial.project_id)throw new HttpError(409,'Le projet a changé pendant l’import.');if(folder&&!one('SELECT 1 FROM folders WHERE id=? AND project_id=?',folder,c.project_id))throw new HttpError(404,'Le dossier a changé pendant l’import.');
   const changed=run("UPDATE agent_conversation_photo_imports SET state='saved',asset_id=?,updated_at=? WHERE conversation_id=? AND request_id=? AND lease_token=? AND state='pending' AND request_hash=?",asset.id,now(),cid,input.requestId,token,hash);if(changed.changes!==1)throw new HttpError(409,'Cette tentative d’import a été remplacée ; aucun doublon conservé.');return undefined;
  });
 }catch(e){run("DELETE FROM agent_conversation_photo_imports WHERE conversation_id=? AND request_id=? AND lease_token=? AND state='pending'",cid,input.requestId,token);throw e;}
 return conversationPhotoReceipt(user,cid,input.requestId);
}
