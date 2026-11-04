/** Create one explicitly located native folder. Never infer a parent or move files. */
import {HttpError,ownedProject,type User} from '../../auth';
import {all,id,now,one} from '../../db';
import {createFolder,type Folder} from '../../library';
import {stableHash} from '../../brain/hash';
import {requirePlan} from '../../plan-gates';
import {localFilesEnabled} from './local-files';
import type {ConversationRow,ConversationState} from './contract';
export type FolderProposal={id:string;name:string;parentId:string|null;fingerprint:string;expiresAt:number};
export type FolderPresentation={schema:'syna-local-folders-1';state:'ambiguous'|'proposed'|'applied';projectId:string;message:string;financialConsent:false;costEur:0;providerCalls:0;publication:false;confirmationRequired:boolean;actionsExecuted:boolean;proposalId?:string;diff?:{before:null;after:{name:string;parentId:string|null}};parent?:{id:string;name:string};result?:{id:string;name:string;parentId:string|null;system:false};receiptId?:string;nativeHref:string};
export const localFoldersEnabled=()=>localFilesEnabled();
export const localFoldersCandidate=(text:string)=>/^(?:cr[ée]e|cr[ée]er|ajoute|nouveau)\b/iu.test(text.trim())&&/\bdossier\b/iu.test(text);
const rows=(pid:string)=>all<Folder>('SELECT * FROM folders WHERE project_id=? ORDER BY id',pid);
const fp=(pid:string)=>stableHash('native-folders-create-1',rows(pid));
const present=(c:ConversationRow,state:FolderPresentation['state'],message:string,extra:Partial<FolderPresentation>={}):FolderPresentation=>({schema:'syna-local-folders-1',state,projectId:c.project_id!,message,financialConsent:false,costEur:0,providerCalls:0,publication:false,confirmationRequired:false,actionsExecuted:false,nativeHref:`/studio/${c.project_id}/fichiers`,...extra});
function owned(user:User,c:ConversationRow,m:ConversationState){if(!localFoldersEnabled())throw new HttpError(404,'Dossiers natifs gratuits indisponibles.');if(!c.project_id)throw new HttpError(409,'Rattachez un projet.');ownedProject(user,c.project_id);requirePlan(user,c.project_id);if(m.activeContextTab!=='fichiers')throw new HttpError(409,'Ouvrez Fichiers pour créer un dossier dans ce projet.');}
export function proposeLocalFolder(user:User,c:ConversationRow,m:ConversationState,text:string):FolderPresentation{
 delete m.localFolderProposal;owned(user,c,m);
 const match=/^(?:cr[ée]e|ajoute) (?:le|un) dossier [«“"]([^»”"\r\n]+)[»”"] (?:[àa] la racine|dans le dossier [«“"]([^»”"\r\n]+)[»”"])\s*[.!]?$/iu.exec(text.trim());
 if(!match)return present(c,'ambiguous','Précisez le nom et le parent exacts : Crée le dossier « Photos atelier » à la racine, ou dans le dossier « identifiant exact ». Aucun dossier, déplacement ou génération avant accord.');
 const name=match[1].trim();if(!name||name.length>120)return present(c,'ambiguous','Nom natif attendu : 1 à 120 caractères, sans troncature.');
 let parent:Folder|undefined;
 if(match[2]){const key=match[2].trim(),matches=rows(c.project_id!).filter(f=>f.id===key||f.name===key);if(matches.length!==1)return present(c,'ambiguous','Dossier parent absent ou ambigu. Précisez son identifiant natif ; aucun premier résultat ne sera choisi.');parent=matches[0];}
 const parentId=parent?.id??null;
 if(rows(c.project_id!).some(f=>f.parent_id===parentId&&f.name===name))return present(c,'ambiguous','Un dossier de ce nom existe déjà dans ce parent. Aucun doublon créé.');
 const proposal:FolderProposal={id:id(),name,parentId,fingerprint:fp(c.project_id!),expiresAt:now()+15*60000};m.localFolderProposal=proposal;
 return present(c,'proposed','Vérifiez le nom et le parent. Après accord gratuit, un seul dossier vide sera créé ; aucun fichier déplacé, supprimé, analysé ni généré.',{proposalId:proposal.id,diff:{before:null,after:{name,parentId}},...(parent?{parent:{id:parent.id,name:parent.name}}:{}),confirmationRequired:true});
}
export function confirmLocalFolder(user:User,c:ConversationRow,m:ConversationState,proposalId:string,requestId:string):FolderPresentation{
 owned(user,c,m);const p=m.localFolderProposal;
 if(!p||p.id!==proposalId||p.expiresAt<now()||fp(c.project_id!)!==p.fingerprint)throw new HttpError(409,'La proposition ou les dossiers ont changé. Préparez un nouvel accord gratuit.');
 const saved=createFolder(c.project_id!,p.name,p.parentId),read=one<Folder>('SELECT * FROM folders WHERE id=? AND project_id=?',saved.id,c.project_id);
 if(!read||read.name!==p.name||read.parent_id!==p.parentId||read.system_key!==null)throw new HttpError(409,'Création native du dossier non confirmée.');
 delete m.localFolderProposal;return present(c,'applied','Dossier natif vide créé et relu. Aucun fichier déplacé, fournisseur contacté ou crédit consommé.',{proposalId:p.id,diff:{before:null,after:{name:p.name,parentId:p.parentId}},result:{id:read.id,name:read.name,parentId:read.parent_id,system:false},receiptId:requestId,actionsExecuted:true});
}
