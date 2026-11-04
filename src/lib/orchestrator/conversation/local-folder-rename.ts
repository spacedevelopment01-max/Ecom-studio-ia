/** One explicit folder rename. No moves, deletes, files or generated content. */
import {HttpError,ownedProject,type User} from '../../auth';
import {all,id,now,one} from '../../db';
import type {Folder} from '../../library';
import {changeFolderMetadata,folderTreeFingerprint} from '../../folder-metadata';
import {requirePlan} from '../../plan-gates';
import {localFilesEnabled} from './local-files';
import type {ConversationRow,ConversationState} from './contract';

export type FolderSnapshot={id:string;name:string;parentId:string|null;system:boolean};
export type FolderRenameProposal={id:string;folderId:string;before:FolderSnapshot;after:FolderSnapshot;fingerprint:string;expiresAt:number};
export type FolderRenamePresentation={schema:'syna-folder-rename-1';state:'ambiguous'|'proposed'|'applied';projectId:string;message:string;financialConsent:false;costEur:0;providerCalls:0;publication:false;confirmationRequired:boolean;actionsExecuted:boolean;proposalId?:string;diff?:{before:FolderSnapshot;after:FolderSnapshot};result?:FolderSnapshot;receiptId?:string;nativeHref:string};
export const localFolderRenameEnabled=()=>localFilesEnabled();
function request(text:string){return text.trim().replace(/^peux-tu renommer\b/iu,'Renomme').replace(/^change le nom du dossier\b/iu,'Renomme le dossier').replace(/\s*\?$/u,'').trim();}
export const localFolderRenameCandidate=(text:string)=>/^(?:renomme|appelle) (?:le|ce) dossier\b/iu.test(request(text));
function exact(raw:string){
 const s=raw.trim(),q=/^[«“"]([^»”"\r\n]+)[»”"]\s*[.!]?$/u.exec(s);
 if(q)return q[1].trim();
 if(!s||/[«»“”"\r\n]|\b(?:puis|ensuite|et)\b/iu.test(s))return;
 return s;
}
const snapshot=(f:Folder):FolderSnapshot=>({id:f.id,name:f.name,parentId:f.parent_id,system:f.system_key!==null});
const present=(c:ConversationRow,state:FolderRenamePresentation['state'],message:string,extra:Partial<FolderRenamePresentation>={}):FolderRenamePresentation=>({schema:'syna-folder-rename-1',state,projectId:c.project_id!,message,financialConsent:false,costEur:0,providerCalls:0,publication:false,confirmationRequired:false,actionsExecuted:false,nativeHref:`/studio/${c.project_id}/fichiers`,...extra});
function owned(user:User,c:ConversationRow,m:ConversationState){
 if(!localFolderRenameEnabled())throw new HttpError(404,'Renommage gratuit de dossier indisponible.');
 if(!c.project_id||c.user_id!==user.id)throw new HttpError(404,'Conversation introuvable.');
 ownedProject(user,c.project_id);requirePlan(user,c.project_id);
 if(m.activeContextTab!=='fichiers')throw new HttpError(409,'Ouvrez Fichiers pour renommer un dossier de ce projet.');
}
export function proposeFolderRename(user:User,c:ConversationRow,m:ConversationState,text:string):FolderRenamePresentation{
 delete m.localFolderRenameProposal;owned(user,c,m);
 const raw=/^(?:renomme|appelle) (?:le|ce) dossier (.+)$/iu.exec(request(text))?.[1];
 const quoted=raw?/^([«“"][^»”"\r\n]+[»”"]) en (.+)$/iu.exec(raw):null;
 const parts=quoted?[quoted[1],quoted[2]]:raw?.split(/\s+en\s+/iu);
 const source=parts?.length===2?exact(parts[0]):undefined,name=parts?.length===2?exact(parts[1]):undefined;
 if(!source||!name||name.length>120)return present(c,'ambiguous','Quel dossier et quel nouveau nom exact ? Dites « Renomme le dossier Photos en Photos clients », ou précisez son identifiant natif. Un seul renommage, aucun changement sans accord.');
 const folders=all<Folder>('SELECT * FROM folders WHERE project_id=? ORDER BY id',c.project_id),matches=folders.filter(f=>f.id===source||f.name===source);
 if(matches.length!==1)return present(c,'ambiguous','Dossier absent ou homonyme. Précisez son identifiant natif ; aucun premier dossier choisi.');
 const folder=matches[0];
 if(folder.name===name)return present(c,'ambiguous','Ce dossier porte déjà ce nom. Aucun changement.');
 if(folders.some(f=>f.id!==folder.id&&f.parent_id===folder.parent_id&&f.name===name))return present(c,'ambiguous','Un dossier de ce nom existe déjà dans ce parent. Choisissez un autre nom exact.');
 const before=snapshot(folder),after={...before,name},p:FolderRenameProposal={id:id(),folderId:folder.id,before,after,fingerprint:folderTreeFingerprint(c.project_id!),expiresAt:now()+15*60000};
 m.localFolderRenameProposal=p;
 return present(c,'proposed','Vérifiez le dossier et son nouveau nom. Après accord gratuit, seul son nom sera changé ; emplacement, fichiers, sous-dossiers et identité seront conservés.',{proposalId:p.id,diff:{before,after},confirmationRequired:true});
}
export function confirmFolderRename(user:User,c:ConversationRow,m:ConversationState,proposalId:string,requestId:string):FolderRenamePresentation{
 owned(user,c,m);const p=m.localFolderRenameProposal;
 if(!p||p.id!==proposalId||p.expiresAt<now())throw new HttpError(409,'Proposition périmée. Préparez un nouvel accord gratuit.');
 const saved=changeFolderMetadata(c.project_id!,p.folderId,{name:p.after.name},p.fingerprint),read=one<Folder>('SELECT * FROM folders WHERE id=? AND project_id=?',saved.id,c.project_id);
 if(!read||JSON.stringify(snapshot(read))!==JSON.stringify(p.after))throw new HttpError(409,'Renommage natif du dossier non confirmé.');
 delete m.localFolderRenameProposal;
 return present(c,'applied','Dossier renommé et relu dans la source native. Aucun fichier déplacé ou régénéré.',{proposalId:p.id,diff:{before:p.before,after:p.after},result:snapshot(read),receiptId:requestId,actionsExecuted:true});
}
