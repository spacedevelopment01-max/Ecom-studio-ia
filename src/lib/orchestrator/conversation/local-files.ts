/** Raccordement gratuit des métadonnées natives ; une proposition n’est jamais une autorisation. */
import {HttpError,type User} from '../../auth';
import {all,id,now,one} from '../../db';
import {getAsset,type Asset,type Folder} from '../../library';
import {changeFileMetadata,fileMetadataFingerprint} from '../../library-local-change';
import {stableHash} from '../../brain/hash';
import {requirePlan} from '../../plan-gates';
import {activeContextEnabled} from './active-context';
import {checkedContextPin,type ContextPin} from './context-session';
import type {ConversationRow,ConversationState} from './contract';
type Snapshot={name:string;folderId:string|null};
export type LocalFilesProposal={id:string;kind:'rename'|'move';pin:ContextPin;assetId:string;version:number;fingerprint:string;diff:{before:Snapshot;after:Snapshot};folder?:Pick<Folder,'id'|'name'|'parent_id'>;expiresAt:number};
export type LocalFilesPresentation={schema:'syna-local-files-1';command?:'rename'|'move';state:'proposed'|'applied'|'ambiguous'|'error';message:string;financialConsent:false;costEur:0;providerCalls:0;confirmationRequired:boolean;actionsExecuted:boolean;proposalId?:string;diff?:LocalFilesProposal['diff'];asset?:{id:string;version:number;name:string;folderId:string|null};folder?:{id:string;label:string};receiptId?:string};
const present=(state:LocalFilesPresentation['state'],message:string,extra:Partial<LocalFilesPresentation>={}):LocalFilesPresentation=>({schema:'syna-local-files-1',state,message,financialConsent:false,costEur:0,providerCalls:0,confirmationRequired:false,actionsExecuted:false,...extra});
const plain=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export const localFilesEnabled=()=>activeContextEnabled()&&process.env.STUDIO_CONVERSATION_FILES==='1';
export const localFilesCandidate=(text:string)=>/^(?:renomme|rename|deplace|move)\s+(?:ce|le|this|the)\s+(?:fichier|file)\b/.test(plain(text.trim()));
function fail(message:string):never{throw new HttpError(422,message,'conversation_file_ambiguous');}
function selected(c:ConversationRow,pin?:ContextPin):{pin:ContextPin;asset:Asset}{
 const checked=checkedContextPin(c,pin),target=checked?.selection.target;
 if(!checked||target?.kind!=='asset'||checked.selection.tab!=='fichiers')fail('Désignez un fichier précis dans Fichiers.');
 const a=getAsset(target.assetId);
 if(!a||a.project_id!==c.project_id||a.user_id!==c.user_id||a.deleted_at!==null||a.status==='rejected')throw new HttpError(404,'Fichier introuvable.');
 if(a.version!==target.version)throw new HttpError(409,'La version du fichier a changé.');
 return{pin:checked,asset:a};
}
export function proposeLocalFiles(user:User,c:ConversationRow,m:ConversationState,text:string):LocalFilesPresentation{
 delete m.localFilesProposal;
 if(!localFilesEnabled())return present('error','Les modifications gratuites de fichiers ne sont pas activées. Aucun appel IA lancé.');
 try{
  const rename=/^(?:Renomme (?:ce|le) fichier en|Rename (?:this|the) file to)\s+[«“"]([^\r\n]{1,200})[»”"]\s*[.!]?$/i.exec(text.trim());
  const move=/^(?:D[ée]place (?:ce|le) fichier (?:vers|dans) le dossier|Move (?:this|the) file to (?:the )?folder)\s+[«“"]([^\r\n]{1,200})[»”"]\s*[.!]?$/i.exec(text.trim());
  if(!rename&&!move)fail('Précisez : Renomme ce fichier en « nom exact » ou Déplace ce fichier vers le dossier « nom ou identifiant exact ».');
  requirePlan(user,c.project_id!);const {pin,asset:a}=selected(c),after:Snapshot={name:a.name,folderId:a.folder_id};
  let folder:LocalFilesProposal['folder'];
  if(rename){after.name=rename[1].trim();if(!after.name||after.name===a.name)fail('Le nouveau nom est vide ou identique. Aucun changement.');}
  if(move){const target=move[1].trim(),matches=all<Folder>('SELECT * FROM folders WHERE project_id=? AND (id=? OR name=?)',c.project_id,target,target);if(matches.length!==1)fail('Dossier absent ou ambigu : donnez un identifiant ou un nom unique de ce projet.');folder={id:matches[0].id,name:matches[0].name,parent_id:matches[0].parent_id};after.folderId=folder.id;if(after.folderId===a.folder_id)fail('Le fichier est déjà dans ce dossier. Aucun changement.');}
  const p:LocalFilesProposal={id:id(),kind:rename?'rename':'move',pin,assetId:a.id,version:a.version,fingerprint:fileMetadataFingerprint(a),diff:{before:{name:a.name,folderId:a.folder_id},after},...(folder?{folder}:{}),expiresAt:now()+15*60000};m.localFilesProposal=p;
  return present('proposed','Vérifiez la modification de ce fichier puis confirmez gratuitement.',{command:p.kind,proposalId:p.id,diff:p.diff,asset:{id:a.id,version:a.version,name:a.name,folderId:a.folder_id},...(folder?{folder:{id:folder.id,label:folder.name}}:{}),confirmationRequired:true});
 }catch(e){if(e instanceof HttpError&&e.status===422)return present('ambiguous',e.message);throw e;}
}
export function confirmLocalFiles(user:User,c:ConversationRow,m:ConversationState,proposalId:string,requestId:string):LocalFilesPresentation{
 if(!localFilesEnabled())throw new HttpError(404,'Modifications gratuites de fichiers indisponibles.');
 requirePlan(user,c.project_id!);const p=m.localFilesProposal;
 if(!p||p.id!==proposalId||p.expiresAt<now())throw new HttpError(409,'Cette proposition est périmée. Reformulez la demande.','conversation_file_stale');
 const {asset}=selected(c,p.pin);if(asset.id!==p.assetId||asset.version!==p.version||fileMetadataFingerprint(asset)!==p.fingerprint)throw new HttpError(409,'Le fichier a changé. Demandez une nouvelle proposition.');
 if(p.folder){const f=one<Folder>('SELECT * FROM folders WHERE id=? AND project_id=?',p.folder.id,c.project_id);if(!f)throw new HttpError(404,'Dossier introuvable.');if(stableHash('folder',{id:f.id,name:f.name,parent_id:f.parent_id})!==stableHash('folder',p.folder))throw new HttpError(409,'Le dossier a changé. Demandez une nouvelle proposition.');}
 const saved=changeFileMetadata({assetId:p.assetId,projectId:c.project_id!,userId:c.user_id},p.kind==='rename'?{name:p.diff.after.name}:{folderId:p.diff.after.folderId},p.fingerprint);delete m.localFilesProposal;
 return present('applied','Fichier enregistré et relu. Aucun crédit consommé.',{command:p.kind,proposalId:p.id,diff:p.diff,asset:{id:saved.id,version:saved.version,name:saved.name,folderId:saved.folder_id},...(p.folder?{folder:{id:p.folder.id,label:p.folder.name}}:{}),receiptId:requestId,actionsExecuted:true});
}
