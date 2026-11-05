import {outsideQuotes} from './outside-quotes';
import {BANK_IMAGE_ROLES,isBankImage} from '../../media/bank';
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
export type FileRestoreProposal={id:string;assetId:string;fingerprint:string;metadataFingerprint:string;bytesHash:string;expiresAt:number;kindScope?:'image';bankScope?:true};
export type FileRestorePresentation={schema:'syna-local-file-restore-1';state:'listed'|'ambiguous'|'proposed'|'applied';projectId:string;nativeHref:string;message:string;financialConsent:false;costEur:0;providerCalls:0;publication:false;confirmationRequired:boolean;actionsExecuted:boolean;items?:TrashItem[];hasMore?:boolean;proposalId?:string;asset?:TrashItem;diff?:{before:{deletedAt:number;folderId:string|null};after:{deletedAt:null;folderId:string|null}};result?:{id:string;version:number;deletedAt:null;folderId:string|null};receiptId?:string};
export const localFileRestoreEnabled=()=>localFilesEnabled();
function trashRequest(text:string){return text.trim().replace(/\s*\?\s*$/u,'').trim().replace(/,?\s+s[’']il te pla[iî]t$/iu,'').trim().replace(/^peux-tu restaurer\b/iu,'restaure').replace(/^peux-tu me montrer\b/iu,'montre');}
export const localFileRestoreCandidate=(raw:string)=>{const text=trashRequest(raw);return (/^(?:montre|liste|affiche)\b/iu.test(text.trim())&&/\bcorbeille\b/iu.test(outsideQuotes(text)))||(/^(?:restaure|r[ée]cup[èe]re|remets?)\s+(?:(?:le|la|les|un|une|des|ce|cet|cette|ces)\s+|l[’'])(?:fichiers?|images?|photos?)\b/iu.test(text));};
const present=(c:ConversationRow,state:FileRestorePresentation['state'],message:string,extra:Partial<FileRestorePresentation>={}):FileRestorePresentation=>({schema:'syna-local-file-restore-1',state,projectId:c.project_id!,nativeHref:`/studio/${c.project_id}/fichiers`,message,financialConsent:false,costEur:0,providerCalls:0,publication:false,confirmationRequired:false,actionsExecuted:false,...extra});
const fp=(a:Asset)=>stableHash('native-file-restore-1',a);
const valid=(c:ConversationRow,a:Asset)=>a.project_id===c.project_id&&a.user_id===c.user_id&&a.role!=='theme-render-capture'&&a.storage_key.startsWith(`${c.user_id}/${c.project_id}/`)&&(!a.thumb_key||a.thumb_key.startsWith(`${c.user_id}/${c.project_id}/`));
const item=(a:Asset):TrashItem=>({id:a.id,name:a.name,version:a.version,kind:a.kind,mime:a.mime,folderId:a.folder_id,deletedAt:a.deleted_at!,href:assetUrl(a)});
function owned(user:User,c:ConversationRow,m:ConversationState,imageScope=false){if(!localFileRestoreEnabled())throw new HttpError(404,'Corbeille native avec SYNA indisponible.');if(!c.project_id)throw new HttpError(409,'Rattachez un projet.');ownedProject(user,c.project_id);requirePlan(user,c.project_id);if(m.activeContextTab!=='fichiers'&&!(imageScope&&m.activeContextTab==='images'))throw new HttpError(409,'Ouvrez Fichiers pour consulter ou restaurer sa corbeille.');}
const visible=(c:ConversationRow,extra:string,args:unknown[]=[])=>{
 const prefix=`${c.user_id}/${c.project_id}/`;
 return all<Asset>(`SELECT * FROM assets WHERE project_id=? AND user_id=? AND deleted_at IS NOT NULL AND COALESCE(role,'')!='theme-render-capture' AND substr(storage_key,1,?)=? AND (COALESCE(thumb_key,'')='' OR substr(thumb_key,1,?)=?) AND ${strategyVisibilitySql(c.project_id!,'asset','assets.id')} ${extra} ORDER BY deleted_at DESC,id LIMIT 51`,c.project_id,c.user_id,prefix.length,prefix,prefix.length,prefix,...args);
};
export function proposeFileRestore(user:User,c:ConversationRow,m:ConversationState,text:string):FileRestorePresentation{
 const request=trashRequest(text),imageScope=m.activeContextTab==='images'||/^(?:restaure|r[ée]cup[èe]re|remets?) (?:l[’']image|la photo)\b/iu.test(request)||/^(?:montre|liste|affiche) (?:la corbeille des images|les (?:images|photos) (?:de|dans) la corbeille)\s*[.!]?$/iu.test(request);
 const bankScope=m.activeContextTab==='images';
 delete m.localFileRestoreProposal;owned(user,c,m,bankScope);
 const show=(state:FileRestorePresentation['state'],message:string,extra:Partial<FileRestorePresentation>={})=>present(c,state,message,{...(bankScope?{nativeHref:`/studio/${c.project_id}/images`}:{}),...extra});
 const found=(extra:string,args:unknown[]=[])=>visible(c,(imageScope?"AND kind='image' ":'')+(bankScope?`AND role IN (${BANK_IMAGE_ROLES.map(()=>'?').join(',')}) `:'')+extra,[...(bankScope?BANK_IMAGE_ROLES:[]),...args]);
 if(/^(?:montre|liste|affiche) (?:la corbeille(?: des images)?|les (?:fichiers|images|photos) (?:de|dans) la corbeille)\s*[.!]?$/iu.test(request)){const rows=found('');return show('listed',bankScope?'Corbeille de la Banque Images de ce projet : métadonnées et liens seulement. Les publicités et logos restent dans leurs domaines ;aucune restauration ou génération.':'Corbeille native de ce projet : métadonnées et liens seulement. Aucun fichier restauré, supprimé, analysé ni généré.',{items:rows.slice(0,50).map(item),hasMore:rows.length>50});}
 const exact=/^(?:restaure|r[ée]cup[èe]re|remets?) (?:le fichier|l[’']image|la photo) [«“"]([^»”"\r\n]+)[»”"] (?:de|depuis|dans) la corbeille\s*[.!]?$/iu.exec(request);
 if(!exact)return show('ambiguous','Quel fichier exact de la corbeille de ce projet ? Montre la corbeille, puis Restaure le fichier « nom ou identifiant exact » de la corbeille. Aucun premier résultat ni rachat.');
 const key=exact[1].trim(),matches=found('AND (id=? OR name=?)',[key,key]);
 if(matches.length!==1)return show('ambiguous',matches.length?'Plusieurs fichiers portent ce nom ; précisez leur identifiant natif exact. Aucun premier résultat choisi.':bankScope?'Aucune image autorisée de la Banque ne correspond. Consultez Fichiers pour les autres visuels acquis. Aucun média substitué ni achat.':'Aucun fichier autorisé correspondant dans la corbeille de ce projet. Aucun média substitué ni achat.',{items:matches.slice(0,50).map(item),hasMore:matches.length>50});
 const a=matches[0];let bytesHash:string;try{bytesHash=sha256(assetData(a));}catch{return show('ambiguous','Les octets acquis de ce fichier sont indisponibles. Aucune restauration annoncée, aucune régénération ou dépense implicite.');}
 const p:FileRestoreProposal={id:id(),assetId:a.id,fingerprint:fp(a),metadataFingerprint:fileMetadataFingerprint(a),bytesHash,expiresAt:now()+15*60000,...(imageScope?{kindScope:'image' as const}:{}),...(bankScope?{bankScope:true as const}:{})};m.localFileRestoreProposal=p;
 return show('proposed','Vérifiez le fichier exact et sa sortie de corbeille. Après accord gratuit, seul cet état natif sera restauré ; nom, statut, dossier actuel, version et octets conservés. Le fichier redevient disponible aux parcours natifs qui le lisent. Aucun appel fournisseur ni publication.',{proposalId:p.id,asset:item(a),diff:{before:{deletedAt:a.deleted_at!,folderId:a.folder_id},after:{deletedAt:null,folderId:a.folder_id}},confirmationRequired:true});
}
export function confirmFileRestore(user:User,c:ConversationRow,m:ConversationState,proposalId:string,requestId:string):FileRestorePresentation{
 const p=m.localFileRestoreProposal;owned(user,c,m,p?.bankScope===true);
 if(!p||p.id!==proposalId||p.expiresAt<now())throw new HttpError(409,'Proposition de restauration périmée. Préparez un nouvel accord gratuit.');
 const a=one<Asset>(`SELECT * FROM assets WHERE id=? AND project_id=? AND user_id=? AND ${strategyVisibilitySql(c.project_id!,'asset','assets.id')}`,p.assetId,c.project_id,c.user_id);
 if(!a||!valid(c,a)||(p.kindScope==='image'&&a.kind!=='image')||(p.bankScope&&!isBankImage(a))||a.deleted_at===null||fp(a)!==p.fingerprint||fileMetadataFingerprint(a)!==p.metadataFingerprint)throw new HttpError(409,'Le fichier ou son état natif a changé. Les modifications manuelles sont conservées.');
 let hash:string;try{hash=sha256(assetData(a));}catch{throw new HttpError(409,'Les octets acquis ne sont plus disponibles ; aucune restauration.');}if(hash!==p.bytesHash)throw new HttpError(409,'Les octets acquis ont changé. Aucun résultat annoncé.');
 const saved=restoreFileMetadata({assetId:a.id,projectId:c.project_id!,userId:c.user_id},p.metadataFingerprint);
 if(fp(saved)!==fp({...a,deleted_at:null}))throw new HttpError(409,'Restauration native exacte non confirmée.');delete m.localFileRestoreProposal;
 return present(c,'applied','Fichier natif restauré et relu, sans nouvelle version de contenu ni achat. Nom, statut, dossier et octets acquis conservés.',{...(p.bankScope?{nativeHref:`/studio/${c.project_id}/images`}:{}),proposalId:p.id,asset:item(a),diff:{before:{deletedAt:a.deleted_at,folderId:a.folder_id},after:{deletedAt:null,folderId:a.folder_id}},result:{id:saved.id,version:saved.version,deletedAt:null,folderId:saved.folder_id},receiptId:requestId,actionsExecuted:true});
}
