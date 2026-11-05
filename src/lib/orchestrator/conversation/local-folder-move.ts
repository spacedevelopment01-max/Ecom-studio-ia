/** Explicit native folder relocation. No content is moved or generated. */
import {HttpError,ownedProject,type User} from '../../auth';
import {all,id,now,one} from '../../db';
import type {Folder} from '../../library';
import {changeFolderMetadata,folderTreeFingerprint} from '../../folder-metadata';
import {requirePlan} from '../../plan-gates';
import {localFilesEnabled} from './local-files';
import type {ConversationRow,ConversationState} from './contract';
import type {FolderSnapshot} from './local-folder-rename';
export type FolderMoveProposal={id:string;folderId:string;before:FolderSnapshot;after:FolderSnapshot;fingerprint:string;expiresAt:number};
export type FolderMovePresentation={schema:'syna-folder-move-1';state:'ambiguous'|'proposed'|'applied';projectId:string;message:string;financialConsent:false;costEur:0;providerCalls:0;publication:false;confirmationRequired:boolean;actionsExecuted:boolean;proposalId?:string;diff?:{before:FolderSnapshot;after:FolderSnapshot};parentBefore?:{id:string;name:string};parentAfter?:{id:string;name:string};result?:FolderSnapshot;receiptId?:string;nativeHref:string};
export const localFolderMoveEnabled=()=>localFilesEnabled();
function request(text:string){return text.trim().replace(/^peux-tu d[ée]placer\b/iu,'Déplace').replace(/^range\b/iu,'Déplace').replace(/\s*\?$/u,'').trim();}
export const localFolderMoveCandidate=(text:string)=>/^d[ée]place (?:le|ce) dossier\b/iu.test(request(text));
function exact(raw:string){
 const s=raw.trim(),q=/^[«“"]([^»”"\r\n]+)[»”"]\s*[.!]?$/u.exec(s);if(q)return q[1].trim();
 if(!s||/[«»“”"\r\n]|\b(?:puis|ensuite|et)\b/iu.test(s))return;
 return s;
}
const snapshot=(f:Folder):FolderSnapshot=>({id:f.id,name:f.name,parentId:f.parent_id,system:f.system_key!==null});
const present=(c:ConversationRow,state:FolderMovePresentation['state'],message:string,extra:Partial<FolderMovePresentation>={}):FolderMovePresentation=>({schema:'syna-folder-move-1',state,projectId:c.project_id!,message,financialConsent:false,costEur:0,providerCalls:0,publication:false,confirmationRequired:false,actionsExecuted:false,nativeHref:`/studio/${c.project_id}/fichiers`,...extra});
function owned(user:User,c:ConversationRow,m:ConversationState){
 if(!localFolderMoveEnabled())throw new HttpError(404,'Déplacement gratuit de dossier indisponible.');
 if(!c.project_id||c.user_id!==user.id)throw new HttpError(404,'Conversation introuvable.');
 ownedProject(user,c.project_id);requirePlan(user,c.project_id);
 if(m.activeContextTab!=='fichiers')throw new HttpError(409,'Ouvrez Fichiers pour déplacer un dossier de ce projet.');
}
function labels(folders:Folder[],before:FolderSnapshot,after:FolderSnapshot){
 const old=folders.find(f=>f.id===before.parentId),next=folders.find(f=>f.id===after.parentId);
 return{...(old?{parentBefore:{id:old.id,name:old.name}}:{}),...(next?{parentAfter:{id:next.id,name:next.name}}:{})};
}
export function proposeFolderMove(user:User,c:ConversationRow,m:ConversationState,text:string):FolderMovePresentation{
 delete m.localFolderMoveProposal;owned(user,c,m);
 const raw=/^d[ée]place (?:le|ce) dossier (.+)$/iu.exec(request(text))?.[1];
 const quoted=raw?/^([«“"][^»”"\r\n]+[»”"]) (.+)$/u.exec(raw):null;
 const body=quoted?quoted[2]:raw,location=body?/^(.*?)\s+(?:([àa] la racine)[.!]?|(?:dans|vers) (?:le )?dossier (.+))$/iu.exec(quoted?'source '+body:body):null;
 const source=quoted?exact(quoted[1]):location?exact(location[1]):undefined,root=!!location?.[2],parentKey=location?.[3]?exact(location[3]):undefined;
 if(!source||(!root&&!parentKey))return present(c,'ambiguous','Quel dossier et quelle destination exacte ? Dites « Déplace le dossier Photos dans le dossier Archives » ou « Déplace le dossier Photos à la racine ». Aucun parent implicite.');
 const folders=all<Folder>('SELECT * FROM folders WHERE project_id=? ORDER BY id',c.project_id),matches=folders.filter(f=>f.id===source||f.name===source),parents=root?[]:folders.filter(f=>f.id===parentKey||f.name===parentKey);
 if(matches.length!==1||!root&&parents.length!==1)return present(c,'ambiguous','Dossier source ou destination absent ou homonyme. Précisez les identifiants natifs ; aucun premier résultat choisi.');
 const folder=matches[0],parentId=root?null:parents[0].id;
 if(folder.parent_id===parentId)return present(c,'ambiguous','Ce dossier est déjà à cet emplacement. Aucun changement.');
 const byId=new Map(folders.map(f=>[f.id,f])),seen=new Set<string>();let cur=parentId;
 while(cur){
  if(cur===folder.id)return present(c,'ambiguous','Un dossier ne peut pas être placé dans lui-même ou dans un de ses descendants. Aucun changement.');
  if(seen.has(cur))return present(c,'ambiguous','L’arborescence de destination contient déjà une boucle. Vérifiez-la avant tout déplacement.');
  seen.add(cur);const node=byId.get(cur);if(!node)return present(c,'ambiguous','L’arborescence de destination est incohérente. Aucun déplacement.');cur=node.parent_id;
 }
 const before=snapshot(folder),after={...before,parentId},p:FolderMoveProposal={id:id(),folderId:folder.id,before,after,fingerprint:folderTreeFingerprint(c.project_id!),expiresAt:now()+15*60000};m.localFolderMoveProposal=p;
 return present(c,'proposed','Vérifiez le dossier et son emplacement avant/après. Après accord gratuit, seul son parent sera changé ; nom, identité, fichiers, sous-dossiers et octets seront conservés.',{proposalId:p.id,diff:{before,after},...labels(folders,before,after),confirmationRequired:true});
}
export function confirmFolderMove(user:User,c:ConversationRow,m:ConversationState,proposalId:string,requestId:string):FolderMovePresentation{
 owned(user,c,m);const p=m.localFolderMoveProposal;
 if(!p||p.id!==proposalId||p.expiresAt<now())throw new HttpError(409,'Proposition périmée. Préparez un nouvel accord gratuit.');
 const saved=changeFolderMetadata(c.project_id!,p.folderId,{parentId:p.after.parentId},p.fingerprint),read=one<Folder>('SELECT * FROM folders WHERE id=? AND project_id=?',saved.id,c.project_id);
 if(!read||JSON.stringify(snapshot(read))!==JSON.stringify(p.after))throw new HttpError(409,'Déplacement natif du dossier non confirmé.');
 delete m.localFolderMoveProposal;return present(c,'applied','Emplacement du dossier enregistré et relu. Les fichiers et sous-dossiers restent attachés au même dossier ; aucun octet ni version de contenu régénéré.',{proposalId:p.id,diff:{before:p.before,after:p.after},...labels(all<Folder>('SELECT * FROM folders WHERE project_id=?',c.project_id),p.before,p.after),result:snapshot(read),receiptId:requestId,actionsExecuted:true});
}
