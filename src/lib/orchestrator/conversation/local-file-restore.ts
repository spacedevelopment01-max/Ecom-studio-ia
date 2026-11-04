/** Native trash metadata only: explicit selection, exact byte acquisition retained, separate free agreement. */
import {HttpError,ownedProject,type User} from '../../auth';
import {all,id,now,one} from '../../db';
import {assetData,assetUrl,type Asset} from '../../library';
import {fileMetadataFingerprint,restoreFileMetadata} from '../../library-local-change';
import {stableHash} from '../../brain/hash';
import {sha256} from '../../secrets';
import {strategyVisibilitySql} from '../../marketing-strategy/visibility';
import {requirePlan} from '../../plan-gates';
import {localFilesEnabled} from './local-files';
import type {ConversationRow,ConversationState} from './contract';
export type TrashItem={id:string;name:string;version:number;kind:string;mime:string;folderId:string|null;deletedAt:number;href:string};
export type FileRestoreProposal={id:string;assetId:string;fingerprint:string;metadataFingerprint:string;bytesHash:string;expiresAt:number};
export type FileRestorePresentation={schema:'syna-local-file-restore-1';state:'listed'|'ambiguous'|'proposed'|'applied';projectId:string;nativeHref:string;message:string;financialConsent:false;costEur:0;providerCalls:0;publication:false;confirmationRequired:boolean;actionsExecuted:boolean;items?:TrashItem[];hasMore?:boolean;proposalId?:string;asset?:TrashItem;diff?:{before:{deletedAt:number;folderId:string|null};after:{deletedAt:null;folderId:string|null}};result?:{id:string;version:number;deletedAt:null;folderId:string|null};receiptId?:string};
export const localFileRestoreEnabled=()=>localFilesEnabled();
export const localFileRestoreCandidate=(text:string)=>(/^(?:montre|liste|affiche)\b/iu.test(text.trim())&&/\bcorbeille\b/iu.test(text))||(/^(?:restaure|r[ée]cup[èe]re|remets?)\b/iu.test(text.trim())&&/\bfichier\b/iu.test(text));
const present=(c:ConversationRow,state:FileRestorePresentation['state'],message:string,extra:Partial<FileRestorePresentation>={}):FileRestorePresentation=>({schema:'syna-local-file-restore-1',state,projectId:c.project_id!,nativeHref:`/studio/${c.project_id}/fichiers`,message,financialConsent:false,costEur:0,providerCalls:0,publication:false,confirmationRequired:false,actionsExecuted:false,...extra});
const fp=(a:Asset)=>stableHash('native-file-restore-1',a);
const valid=(c:ConversationRow,a:Asset)=>a.project_id===c.project_id&&a.user_id===c.user_id&&a.role!=='theme-render-capture'&&a.storage_key.startsWith(`${c.user_id}/${c.project_id}/`)&&(!a.thumb_key||a.thumb_key.startsWith(`${c.user_id}/${c.project_id}/`));
const item=(a:Asset):TrashItem=>({id:a.id,name:a.name,version:a.version,kind:a.kind,mime:a.mime,folderId:a.folder_id,deletedAt:a.deleted_at!,href:assetUrl(a)});
function owned(user:User,c:ConversationRow,m:ConversationState){if(!localFileRestoreEnabled())throw new HttpError(404,'Corbeille native avec SYNA indisponible.');if(!c.project_id)throw new HttpError(409,'Rattachez un projet.');ownedProject(user,c.project_id);requirePlan(user,c.project_id);if(m.activeContextTab!=='fichiers')throw new HttpError(409,'Ouvrez Fichiers pour consulter ou restaurer sa corbeille.');}
const visible=(c:ConversationRow,extra:string,args:unknown[]=[])=>{
 const prefix=`${c.user_id}/${c.project_id}/`;
 return all<Asset>(`SELECT * FROM assets WHERE project_id=? AND user_id=? AND deleted_at IS NOT NULL AND COALESCE(role,'')!='theme-render-capture' AND substr(storage_key,1,?)=? AND (COALESCE(thumb_key,'')='' OR substr(thumb_key,1,?)=?) AND ${strategyVisibilitySql(c.project_id!,'asset','assets.id')} ${extra} ORDER BY deleted_at DESC,id LIMIT 51`,c.project_id,c.user_id,prefix.length,prefix,prefix.length,prefix,...args);
};
export function proposeFileRestore(user:User,c:ConversationRow,m:ConversationState,text:string):FileRestorePresentation{
 delete m.localFileRestoreProposal;owned(user,c,m);
 if(/^(?:montre|liste|affiche) (?:la corbeille|les fichiers (?:de|dans) la corbeille)\s*[.!]?$/iu.test(text.trim())){const found=visible(c,'');return present(c,'listed','Corbeille native de ce projet : métadonnées et liens seulement. Aucun fichier restauré, supprimé, analysé ni généré.',{items:found.slice(0,50).map(item),hasMore:found.length>50});}
 const exact=/^(?:restaure|r[ée]cup[èe]re|remets?) le fichier [«“"]([^»”"\r\n]+)[»”"] (?:de|depuis|dans) la corbeille\s*[.!]?$/iu.exec(text.trim());
 if(!exact)return present(c,'ambiguous','Quel fichier exact de la corbeille de ce projet ? Montre la corbeille, puis Restaure le fichier « nom ou identifiant exact » de la corbeille. Aucun premier résultat ni rachat.');
 const key=exact[1].trim(),matches=visible(c,'AND (id=? OR name=?)',[key,key]);
 if(matches.length!==1)return present(c,'ambiguous',matches.length?'Plusieurs fichiers portent ce nom ; précisez leur identifiant natif exact. Aucun premier résultat choisi.':'Aucun fichier autorisé correspondant dans la corbeille de ce projet. Aucun média substitué ni achat.',{items:matches.slice(0,50).map(item),hasMore:matches.length>50});
 const a=matches[0];let bytesHash:string;try{bytesHash=sha256(assetData(a));}catch{return present(c,'ambiguous','Les octets acquis de ce fichier sont indisponibles. Aucune restauration annoncée, aucune régénération ou dépense implicite.');}
 const p:FileRestoreProposal={id:id(),assetId:a.id,fingerprint:fp(a),metadataFingerprint:fileMetadataFingerprint(a),bytesHash,expiresAt:now()+15*60000};m.localFileRestoreProposal=p;
 return present(c,'proposed','Vérifiez le fichier exact et sa sortie de corbeille. Après accord gratuit, seul cet état natif sera restauré ; nom, statut, dossier actuel, version et octets conservés. Le fichier redevient disponible aux parcours natifs qui le lisent. Aucun appel fournisseur ni publication.',{proposalId:p.id,asset:item(a),diff:{before:{deletedAt:a.deleted_at!,folderId:a.folder_id},after:{deletedAt:null,folderId:a.folder_id}},confirmationRequired:true});
}
export function confirmFileRestore(user:User,c:ConversationRow,m:ConversationState,proposalId:string,requestId:string):FileRestorePresentation{
 owned(user,c,m);const p=m.localFileRestoreProposal;
 if(!p||p.id!==proposalId||p.expiresAt<now())throw new HttpError(409,'Proposition de restauration périmée. Préparez un nouvel accord gratuit.');
 const a=one<Asset>(`SELECT * FROM assets WHERE id=? AND project_id=? AND user_id=? AND ${strategyVisibilitySql(c.project_id!,'asset','assets.id')}`,p.assetId,c.project_id,c.user_id);
 if(!a||!valid(c,a)||a.deleted_at===null||fp(a)!==p.fingerprint||fileMetadataFingerprint(a)!==p.metadataFingerprint)throw new HttpError(409,'Le fichier ou son état natif a changé. Les modifications manuelles sont conservées.');
 let hash:string;try{hash=sha256(assetData(a));}catch{throw new HttpError(409,'Les octets acquis ne sont plus disponibles ; aucune restauration.');}if(hash!==p.bytesHash)throw new HttpError(409,'Les octets acquis ont changé. Aucun résultat annoncé.');
 const saved=restoreFileMetadata({assetId:a.id,projectId:c.project_id!,userId:c.user_id},p.metadataFingerprint);
 if(fp(saved)!==fp({...a,deleted_at:null}))throw new HttpError(409,'Restauration native exacte non confirmée.');delete m.localFileRestoreProposal;
 return present(c,'applied','Fichier natif restauré et relu, sans nouvelle version de contenu ni achat. Nom, statut, dossier et octets acquis conservés.',{proposalId:p.id,asset:item(a),diff:{before:{deletedAt:a.deleted_at,folderId:a.folder_id},after:{deletedAt:null,folderId:a.folder_id}},result:{id:saved.id,version:saved.version,deletedAt:null,folderId:saved.folder_id},receiptId:requestId,actionsExecuted:true});
}
