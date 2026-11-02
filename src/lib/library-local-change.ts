/** Métadonnées locales uniquement : même moteur pour l’écran Fichiers et SYNA. Aucun octet ni version de contenu recréé. */
import {HttpError} from './auth';
import {one,run,tx} from './db';
import {stableHash} from './brain/hash';
import type {Asset} from './library';
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
