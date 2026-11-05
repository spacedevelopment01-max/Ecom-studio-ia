/** Métadonnées locales uniquement : même moteur pour l’écran Fichiers et SYNA. Aucun octet ni version de contenu recréé. */
import {HttpError} from './auth';
import {all,one,run,tx,readSnapshot,json,now} from './db';
import {stableHash} from './brain/hash';
import type {Asset} from './library';
import {L} from './i18n-server';
export const fileMetadataFingerprint=(a:Asset)=>stableHash('native-file-metadata-1',{id:a.id,projectId:a.project_id,userId:a.user_id,version:a.version,name:a.name,folderId:a.folder_id,status:a.status,deletedAt:a.deleted_at});
export function changeFileMetadata(scope:{assetId:string;projectId:string;userId:string},change:{name?:string;folderId?:string|null},expectedFingerprint?:string):Asset{
 return tx(()=>{
  const a=one<Asset>('SELECT * FROM assets WHERE id=? AND project_id=? AND user_id=?',scope.assetId,scope.projectId,scope.userId);
  if(!a)throw new HttpError(404,'Fichier introuvable.');
  if(expectedFingerprint&&fileMetadataFingerprint(a)!==expectedFingerprint)throw new HttpError(409,'Le fichier a changé. Demandez une nouvelle proposition.','conversation_file_stale');
  if(change.name!==undefined&&(!change.name.trim()||change.name.length>200))throw new HttpError(400,'Nom de fichier invalide.');
  if(change.folderId&&!one('SELECT 1 FROM folders WHERE id=? AND project_id=?',change.folderId,scope.projectId))throw new HttpError(404,'Dossier introuvable.');
  run('UPDATE assets SET name=?,folder_id=? WHERE id=? AND project_id=? AND user_id=?',change.name??a.name,change.folderId===undefined?a.folder_id:change.folderId,a.id,scope.projectId,scope.userId);
  const saved=one<Asset>('SELECT * FROM assets WHERE id=? AND project_id=? AND user_id=?',a.id,scope.projectId,scope.userId)!;
  if(saved.name!==(change.name??a.name)||saved.folder_id!==(change.folderId===undefined?a.folder_id:change.folderId))throw new HttpError(409,'Enregistrement du fichier non confirmé.');
  return saved;
 });
}

/** Same native trash restoration for Fichiers and SYNA; content versions/bytes never change. */
export function restoreFileMetadata(scope:{assetId:string;projectId:string;userId:string},expectedFingerprint?:string):Asset{
 return tx(()=>{
  const a=one<Asset>('SELECT * FROM assets WHERE id=? AND project_id=? AND user_id=?',scope.assetId,scope.projectId,scope.userId);
  if(!a)throw new HttpError(404,'Fichier introuvable.');
  if(expectedFingerprint&&fileMetadataFingerprint(a)!==expectedFingerprint)throw new HttpError(409,'Le fichier a changé. Préparez un nouvel accord gratuit.');
  run('UPDATE assets SET deleted_at=NULL WHERE id=? AND project_id=? AND user_id=?',a.id,scope.projectId,scope.userId);
  const saved=one<Asset>('SELECT * FROM assets WHERE id=? AND project_id=? AND user_id=?',a.id,scope.projectId,scope.userId)!;
  if(saved.deleted_at!==null)throw new HttpError(409,'Restauration native non confirmée.');
  return saved;
 });
}

export type FileTrashScope={assetId:string;projectId:string;userId:string};
type TrashUsage={asset_id:string;target_type:string;target_id:string;label:string;created_at:number};
export type NativeFileTrashState={asset:Asset;usages:TrashUsage[];posts:{id:string;status:string|null}[];fingerprint:string};
/** Coherent native snapshot; no provider, byte mutation or project write. */
export function readFileTrashState(scope:FileTrashScope):NativeFileTrashState{
 return readSnapshot(()=>{
  const asset=one<Asset>('SELECT * FROM assets WHERE id=? AND project_id=? AND user_id=?',scope.assetId,scope.projectId,scope.userId);
  if(!asset)throw new HttpError(404,L('Fichier introuvable.','File not found.'));
  const usages=all<TrashUsage>('SELECT * FROM asset_usages WHERE asset_id = ? ORDER BY target_type,target_id',asset.id);
  const posts=usages.filter(u=>u.target_type==='post').map(u=>({id:u.target_id,status:one<{status:string}>('SELECT status FROM posts WHERE id = ?',u.target_id)?.status??null}));
  return{asset,usages,posts,fingerprint:stableHash('native-file-trash-1',{asset,usages,posts})};
 });
}
export function fileTrashBlocker(state:NativeFileTrashState):string|null{
 if(state.posts.some(p=>['scheduled','publishing','published'].includes(p.status??'')))return L("Ce média est utilisé par une publication programmée ou publiée : retirez-le d'abord de la publication.","This media is used by a scheduled or published post: remove it from the post first.");
 if(state.asset.role==='original'&&json<Record<string,unknown>>(state.asset.meta,{}).protected)return L('Original protégé.','Protected original.');
 return null;
}
/** Same native trash operation for manual API and SYNA, with current guards under one write lock. */
export function trashFileMetadata(scope:FileTrashScope,expectedFingerprint?:string):{asset:Asset;usages:TrashUsage[]}{
 return tx(()=>{
  const state=readFileTrashState(scope),a=state.asset;
  if(expectedFingerprint&&state.fingerprint!==expectedFingerprint)throw new HttpError(409,'Le fichier ou ses usages ont changé. Préparez un nouvel accord gratuit.');
  const blocker=fileTrashBlocker(state);if(blocker)throw new HttpError(409,blocker);
  if(a.deleted_at!==null)return{asset:a,usages:state.usages};
  const at=now(),result=run('UPDATE assets SET deleted_at=? WHERE id=? AND project_id=? AND user_id=? AND deleted_at IS NULL',at,a.id,scope.projectId,scope.userId);
  const saved=one<Asset>('SELECT * FROM assets WHERE id=? AND project_id=? AND user_id=?',a.id,scope.projectId,scope.userId);
  if(result.changes!==1||!saved||stableHash('native-file-trash-result-1',saved)!==stableHash('native-file-trash-result-1',{...a,deleted_at:at}))throw new HttpError(409,'Mise à la corbeille native non confirmée.');
  return{asset:saved,usages:state.usages};
 });
}
