/** Only an explicitly named custom folder with no child or asset reference, including trash. */
import {outsideQuotes} from './outside-quotes';
import {HttpError,ownedProject,type User} from '../../auth';
import {all,one,id,now} from '../../db';
import type {Folder} from '../../library';
import {folderTreeFingerprint,deleteEmptyFolder} from '../../folder-metadata';
import {stableHash} from '../../brain/hash';
import {requirePlan} from '../../plan-gates';
import {localFilesEnabled} from './local-files';
import type {ConversationRow,ConversationState} from './contract';
type Snapshot={id:string;name:string;parentId:string|null;system:boolean};
export type FolderDeleteProposal={id:string;folderId:string;before:Snapshot;parent?:{id:string;name:string};sourceTreeFingerprint:string;resultTreeFingerprint:string;expiresAt:number};
export type FolderDeletePresentation={schema:'syna-folder-delete-1';state:'ambiguous'|'proposed'|'applied';projectId:string;nativeHref:string;message:string;destructive:true;reversible:false;financialConsent:false;costEur:0;providerCalls:0;publication:false;confirmationRequired:boolean;actionsExecuted:boolean;proposalId?:string;diff?:{before:Snapshot;after:null};parent?:{id:string;name:string};result?:{id:string;deleted:true;parentId:string|null};receiptId?:string;warnings?:string[]};
export const localFolderDeleteEnabled=()=>localFilesEnabled()&&process.env.STUDIO_CONVERSATION_FOLDER_DELETE==='1';
function request(raw:string){return raw.trim().replace(/[.!?]+$/u,'').trim().replace(/,?\s+s[’']il te pla[iî]t$/iu,'').trim().replace(/^(?:(?:peux|pourrais)-tu|je (?:veux|voudrais|souhaite)|j[’']aimerais) (supprimer|effacer)\b/iu,(_m,v:string)=>v.toLowerCase()==='supprimer'?'supprime':'efface');}
export const localFolderDeleteCandidate=(raw:string)=>/^(?:supprime|efface) (?:le|ce) dossier(?: vide)?\b/iu.test(outsideQuotes(request(raw)));
const snapshot=(f:Folder):Snapshot=>({id:f.id,name:f.name,parentId:f.parent_id,system:f.system_key!==null});
const resultHash=(rows:Folder[])=>stableHash('native-empty-folder-delete-result-1',rows);
const present=(c:ConversationRow,state:FolderDeletePresentation['state'],message:string,extra:Partial<FolderDeletePresentation>={}):FolderDeletePresentation=>({schema:'syna-folder-delete-1',state,projectId:c.project_id!,nativeHref:`/studio/${c.project_id}/fichiers`,message,destructive:true,reversible:false,financialConsent:false,costEur:0,providerCalls:0,publication:false,confirmationRequired:false,actionsExecuted:false,...extra});
function owned(user:User,c:ConversationRow,m:ConversationState){if(!localFolderDeleteEnabled())throw new HttpError(404,'Suppression gratuite de dossier avec SYNA indisponible.');if(!c.project_id||c.user_id!==user.id)throw new HttpError(404,'Conversation introuvable.');ownedProject(user,c.project_id);requirePlan(user,c.project_id);if(m.activeContextTab!=='fichiers')throw new HttpError(409,'Ouvrez Fichiers pour désigner un dossier précis de ce projet.');}
function sourceName(raw:string){const rest=/^(?:supprime|efface) (?:le|ce) dossier(?: vide)? (.+)$/iu.exec(request(raw))?.[1];if(!rest)return;const s=rest.trim(),fr=/^«([^»\r\n]+)»$/u.exec(s),curly=/^“([^”\r\n]+)”$/u.exec(s),straight=/^"([^"\r\n]+)"$/u.exec(s);if(fr||curly||straight)return(fr??curly??straight)![1].trim();if(!s||s.length>200||/[«»“”"\r\n]|\b(?:puis|ensuite|et)\b/iu.test(s))return;return s;}
export function proposeFolderDelete(user:User,c:ConversationRow,m:ConversationState,text:string):FolderDeletePresentation{
 delete m.localFolderDeleteProposal;owned(user,c,m);const name=sourceName(text),question=(message:string)=>present(c,'ambiguous',message);
 if(!name)return question('Quel dossier vide exact ? Dites Supprime le dossier vide « nom ou identifiant exact ». Seul un dossier personnalisé sans sous-dossier ni fichier, même dans la corbeille, peut être supprimé après accord.');
 // Do not call listFolders here: its default-folder initialization would write during preview.
 const folders=all<Folder>('SELECT * FROM folders WHERE project_id=? ORDER BY id',c.project_id),matches=folders.filter(f=>f.id===name||f.name===name);
 if(matches.length!==1)return question(matches.length?'Plusieurs dossiers portent ce nom. Précisez leur identifiant natif unique ; aucun premier résultat choisi.':'Dossier absent de ce projet. Aucun autre dossier ou fichier substitué.');const folder=matches[0];
 if(folder.system_key!==null)return question('Ce dossier de base ou réservé ne peut pas être supprimé. Aucun changement.');
 if(folders.some(f=>f.parent_id===folder.id)||one('SELECT 1 FROM assets WHERE folder_id = ?',folder.id))return question('Ce dossier n’est pas entièrement vide : sous-dossier ou référence de fichier, y compris la corbeille. Aucun fichier, rattachement ou contenu supprimé implicitement.');
 const parent=folder.parent_id?folders.find(f=>f.id===folder.parent_id):undefined;if(folder.parent_id&&!parent)return question('Le parent natif du dossier est indisponible. Vérifiez l’arborescence dans Fichiers avant suppression.');
 const p:FolderDeleteProposal={id:id(),folderId:folder.id,before:snapshot(folder),...(parent?{parent:{id:parent.id,name:parent.name}}:{}),sourceTreeFingerprint:folderTreeFingerprint(c.project_id!),resultTreeFingerprint:resultHash(folders.filter(f=>f.id!==folder.id)),expiresAt:now()+15*60000};m.localFolderDeleteProposal=p;
 return present(c,'proposed','Vérifiez ce dossier et son parent. Après accord gratuit, ce seul dossier vide sera supprimé définitivement. Aucun fichier, référence de corbeille ou sous-dossier ne sera modifié. La suppression du dossier n’a pas de restauration native.',{proposalId:p.id,diff:{before:p.before,after:null},...(p.parent?{parent:p.parent}:{}),warnings:['Suppression définitive du dossier seul, après accord explicite. Annuler avant accord conserve le dossier.'],confirmationRequired:true});
}
export function confirmFolderDelete(user:User,c:ConversationRow,m:ConversationState,proposalId:string,requestId:string):FolderDeletePresentation{
 owned(user,c,m);const p=m.localFolderDeleteProposal;if(!p||p.id!==proposalId||p.expiresAt<now())throw new HttpError(409,'Proposition de suppression périmée. Préparez un nouvel aperçu.');
 const deleted=deleteEmptyFolder(c.project_id!,p.folderId,{expectedTree:p.sourceTreeFingerprint,requireNoAssetReferences:true}),rows=all<Folder>('SELECT * FROM folders WHERE project_id=? ORDER BY id',c.project_id);
 if(JSON.stringify(snapshot(deleted))!==JSON.stringify(p.before)||resultHash(rows)!==p.resultTreeFingerprint||one('SELECT 1 FROM folders WHERE id=?',p.folderId))throw new HttpError(409,'Suppression du seul dossier natif non confirmée.');delete m.localFolderDeleteProposal;
 return present(c,'applied','Dossier vide supprimé et absence relue dans la source native. Aucun fichier, rattachement ou autre dossier modifié ; aucune dépense ou publication.',{proposalId:p.id,diff:{before:p.before,after:null},...(p.parent?{parent:p.parent}:{}),result:{id:p.folderId,deleted:true,parentId:p.before.parentId},receiptId:requestId,actionsExecuted:true});
}
