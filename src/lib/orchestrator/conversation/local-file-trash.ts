/** Metadata-only native trash. Acquired bytes and versions remain available for native restoration. */
import {outsideQuotes} from './outside-quotes';
import {HttpError,ownedProject,type User} from '../../auth';
import {all,id,now,one} from '../../db';
import {assetData,type Asset} from '../../library';
import {readFileTrashState,fileTrashBlocker,trashFileMetadata} from '../../library-local-change';
import {sha256} from '../../secrets';
import {requirePlan} from '../../plan-gates';
import {strategyVisibilitySql} from '../../marketing-strategy/visibility';
import {localFilesEnabled} from './local-files';
import {checkedContextPin,type ContextPin} from './context-session';
import type {ConversationRow,ConversationState} from './contract';
type Item={id:string;name:string;version:number;folderId:string|null};
export type FileTrashProposal={id:string;asset:Item;fingerprint:string;bytesHash:string;pin?:ContextPin;expiresAt:number};
export type FileTrashPresentation={schema:'syna-file-trash-1';state:'ambiguous'|'proposed'|'applied';projectId:string;nativeHref:string;message:string;destructive:true;reversible:true;financialConsent:false;costEur:0;providerCalls:0;publication:false;confirmationRequired:boolean;actionsExecuted:boolean;proposalId?:string;asset?:Item;diff?:{before:{deletedAt:null;folderId:string|null};after:{inTrash:true;folderId:string|null}};usageCount?:number;warnings?:string[];result?:{id:string;version:number;deletedAt:number;folderId:string|null};receiptId?:string};
export const localFileTrashEnabled=()=>localFilesEnabled()&&process.env.STUDIO_CONVERSATION_FILE_TRASH==='1';
function request(raw:string){return raw.trim().replace(/[.!?]+$/u,'').trim().replace(/,?\s+s[’']il te pla[iî]t$/iu,'').trim().replace(/^(?:(?:peux|pourrais)-tu|je (?:veux|voudrais|souhaite)|j[’']aimerais) (supprimer|mettre)\b/iu,(_m,v:string)=>v.toLowerCase()==='supprimer'?'supprime':'mets');}
export const localFileTrashCandidate=(raw:string)=>/^(?:supprime|mets) (?:le|ce) fichier\b/iu.test(outsideQuotes(request(raw)));
function bytesFingerprint(a:Asset):string|null{try{return sha256(assetData(a));}catch{return null;}}
const item=(a:Asset):Item=>({id:a.id,name:a.name,version:a.version,folderId:a.folder_id});
const diff=(a:Item)=>({before:{deletedAt:null,folderId:a.folderId},after:{inTrash:true as const,folderId:a.folderId}});
const present=(c:ConversationRow,state:FileTrashPresentation['state'],message:string,extra:Partial<FileTrashPresentation>={}):FileTrashPresentation=>({schema:'syna-file-trash-1',state,projectId:c.project_id!,nativeHref:`/studio/${c.project_id}/fichiers`,message,destructive:true,reversible:true,financialConsent:false,costEur:0,providerCalls:0,publication:false,confirmationRequired:false,actionsExecuted:false,...extra});
function owned(user:User,c:ConversationRow,m:ConversationState,allowDisabled=false){if(!localFileTrashEnabled()&&!allowDisabled)throw new HttpError(404,'Corbeille gratuite avec SYNA indisponible.');if(!c.project_id||c.user_id!==user.id)throw new HttpError(404,'Conversation introuvable.');ownedProject(user,c.project_id);requirePlan(user,c.project_id);if(m.activeContextTab!=='fichiers')throw new HttpError(409,'Ouvrez Fichiers pour mettre un fichier précis à la corbeille.');}
const visible=(c:ConversationRow,a:Asset)=>a.project_id===c.project_id&&a.user_id===c.user_id&&a.deleted_at===null&&a.status!=='rejected'&&a.role!=='theme-render-capture'&&a.storage_key.startsWith(`${c.user_id}/${c.project_id}/`)&&(!a.thumb_key||a.thumb_key.startsWith(`${c.user_id}/${c.project_id}/`))&&!!one(`SELECT 1 FROM assets WHERE id=? AND ${strategyVisibilitySql(c.project_id!,'asset','assets.id')}`,a.id);
function named(raw:string){const text=request(raw),s=/^supprime le fichier (.+)$/iu.exec(text)?.[1]??/^mets le fichier (.+) [àa] la corbeille$/iu.exec(text)?.[1];if(!s)return;const match=/^(?:«([^»\r\n]{1,200})»|“([^”\r\n]{1,200})”|"([^"\r\n]{1,200})")$/u.exec(s.trim());return match?(match[1]??match[2]??match[3]).trim():undefined;}
export function proposeFileTrash(user:User,c:ConversationRow,m:ConversationState,text:string):FileTrashPresentation{
 delete m.localFileTrashProposal;owned(user,c,m,true);if(!localFileTrashEnabled())return present(c,'ambiguous','La corbeille gratuite avec SYNA n’est pas activée. Aucun fichier modifié, aucun appel IA lancé.');const question=(message:string)=>present(c,'ambiguous',message),name=named(text);let asset:Asset|undefined,pin:ContextPin|undefined;
 if(/^(?:supprime ce fichier|mets ce fichier [àa] la corbeille)$/iu.test(request(text))){pin=checkedContextPin(c);const t=pin?.selection.target;if(pin?.selection.tab==='fichiers'&&t?.kind==='asset'){asset=one<Asset>('SELECT * FROM assets WHERE id=? AND project_id=? AND user_id=?',t.assetId,c.project_id,c.user_id);if(asset&&asset.version!==t.version)asset=undefined;}}
 else if(name){const rows=all<Asset>('SELECT * FROM assets WHERE project_id=? AND user_id=? AND (id=? OR name=?)',c.project_id,c.user_id,name,name).filter(a=>visible(c,a));if(rows.length!==1)return question(rows.length?'Plusieurs fichiers portent ce nom. Précisez un identifiant exact ; aucun premier résultat choisi.':'Fichier absent ou non autorisé dans ce projet. Aucun autre fichier substitué.');asset=rows[0];}
 if(!asset||!visible(c,asset))return question('Désignez une version précise dans Fichiers ou dites Mets le fichier « nom ou identifiant exact » à la corbeille. Aucune suppression définitive ou groupée.');
 const state=readFileTrashState({assetId:asset.id,projectId:c.project_id!,userId:c.user_id}),blocker=fileTrashBlocker(state);if(blocker)return question(blocker);
 const bytesHash=bytesFingerprint(state.asset);if(!bytesHash)return question('Les octets acquis du fichier sont indisponibles. Aucun fichier supprimé, remplacé ou régénéré ; aucune dépense.');
 const p:FileTrashProposal={id:id(),asset:item(state.asset),fingerprint:state.fingerprint,bytesHash,...(pin?{pin}:{}),expiresAt:now()+15*60000};m.localFileTrashProposal=p;
 return present(c,'proposed','Vérifiez ce fichier exact. Après accord gratuit, il sera placé dans la corbeille native. Ses octets, sa version, son dossier et ses liens restent conservés ; la restauration native reste disponible.',{proposalId:p.id,asset:p.asset,diff:diff(p.asset),usageCount:state.usages.length,warnings:state.usages.length?['Des liens existants sont conservés. Aucun contenu lié n’est supprimé ou publié.']:[],confirmationRequired:true});
}
export function confirmFileTrash(user:User,c:ConversationRow,m:ConversationState,proposalId:string,requestId:string):FileTrashPresentation{
 owned(user,c,m);const p=m.localFileTrashProposal;if(!p||p.id!==proposalId||p.expiresAt<now())throw new HttpError(409,'Proposition de corbeille périmée. Préparez un nouvel aperçu.');
 if(p.pin){const t=checkedContextPin(c,p.pin)?.selection.target;if(t?.kind!=='asset'||t.assetId!==p.asset.id||t.version!==p.asset.version)throw new HttpError(409,'La sélection du fichier a changé.');}
 const state=readFileTrashState({assetId:p.asset.id,projectId:c.project_id!,userId:c.user_id});if(!visible(c,state.asset)||state.fingerprint!==p.fingerprint||bytesFingerprint(state.asset)!==p.bytesHash)throw new HttpError(409,'Le fichier, ses usages ou ses octets ont changé. Préparez un nouvel accord.');
 const saved=trashFileMetadata({assetId:p.asset.id,projectId:c.project_id!,userId:c.user_id},p.fingerprint),a=saved.asset;
 if(a.deleted_at===null||bytesFingerprint(a)!==p.bytesHash)throw new HttpError(409,'Corbeille native non confirmée ; aucun résultat annoncé.');delete m.localFileTrashProposal;
 return present(c,'applied','Fichier placé à la corbeille et résultat natif relu. Octets, version, dossier et liens conservés. Restauration native disponible ; aucune dépense ou publication.',{proposalId:p.id,asset:item(a),diff:diff(p.asset),usageCount:saved.usages.length,result:{id:a.id,version:a.version,deletedAt:a.deleted_at,folderId:a.folder_id},receiptId:requestId,actionsExecuted:true});
}
