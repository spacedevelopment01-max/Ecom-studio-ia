/** Native folder metadata, shared by the manual API and conversational proposals. */
import {HttpError} from './auth';
import {all,one,run,tx} from './db';
import {isDescendant,type Folder} from './library';
import {stableHash} from './brain/hash';
import {L} from './i18n-server';

export const folderTreeFingerprint=(projectId:string)=>stableHash('native-folder-tree-1',all<Folder>('SELECT * FROM folders WHERE project_id=? ORDER BY id',projectId));
export function changeFolderMetadata(projectId:string,folderId:string,change:{name?:string;parentId?:string|null},expectedTree?:string):Folder{
 return tx(()=>{
  const f=one<Folder>('SELECT * FROM folders WHERE id=? AND project_id=?',folderId,projectId);
  if(!f)throw new HttpError(404,L('Dossier introuvable.','Folder not found.'));
  if(expectedTree&&folderTreeFingerprint(projectId)!==expectedTree)throw new HttpError(409,'Les dossiers ont changé. Préparez un nouvel accord gratuit.');
  if(change.name!==undefined&&(!change.name.trim()||change.name.trim().length>120))throw new HttpError(400,'Nom de dossier invalide.');
  if(change.parentId!==undefined){
   if(change.parentId&&(change.parentId===f.id||isDescendant(projectId,f.id,change.parentId)))throw new HttpError(400,L('Impossible de déplacer un dossier dans lui-même.','A folder cannot be moved into itself.'));
   if(change.parentId&&!one('SELECT 1 FROM folders WHERE id=? AND project_id=?',change.parentId,projectId))throw new HttpError(404,L('Dossier de destination introuvable.','Destination folder not found.'));
  }
  const fields:string[]=[],values:(string|null)[]=[];
  if(change.name!==undefined){fields.push('name=?');values.push(change.name.trim());}
  if(change.parentId!==undefined){fields.push('parent_id=?');values.push(change.parentId);}
  if(fields.length)run(`UPDATE folders SET ${fields.join(',')} WHERE id=? AND project_id=?`,...values,folderId,projectId);
  const saved=one<Folder>('SELECT * FROM folders WHERE id=? AND project_id=?',folderId,projectId)!;
  if(saved.name!==(change.name===undefined?f.name:change.name.trim())||saved.parent_id!==(change.parentId===undefined?f.parent_id:change.parentId))throw new HttpError(409,'Métadonnées du dossier non confirmées.');
  return saved;
 });
}

/** Shared native deletion: the emptiness check and delete use one immediate transaction. */
export function deleteEmptyFolder(projectId:string,folderId:string,options:{expectedTree?:string;requireNoAssetReferences?:boolean}={}):Folder{
 return tx(()=>{
  const f=one<Folder>("SELECT * FROM folders WHERE id = ? AND project_id = ?",folderId,projectId);
  if(!f)throw new HttpError(404,L("Dossier introuvable.","Folder not found."));
  if(options.expectedTree&&folderTreeFingerprint(projectId)!==options.expectedTree)throw new HttpError(409,'Les dossiers ont changé. Préparez un nouvel accord gratuit.');
  if(f.system_key)throw new HttpError(400,L("Les dossiers de base du projet ne peuvent pas être supprimés (vous pouvez les renommer).","The project's default folders cannot be deleted (you can rename them)."));
  if(one("SELECT 1 FROM assets WHERE folder_id = ? AND deleted_at IS NULL",f.id)||one("SELECT 1 FROM folders WHERE parent_id = ?",f.id))throw new HttpError(409,L("Le dossier n'est pas vide : déplacez d'abord son contenu.","The folder is not empty: move its contents first."));
  if(options.requireNoAssetReferences&&one("SELECT 1 FROM assets WHERE folder_id = ?",f.id))throw new HttpError(409,'Des fichiers dans la corbeille gardent ce rattachement. Aucun fichier ou lien de dossier ne sera modifié implicitement.');
  const result=run("DELETE FROM folders WHERE id = ? AND project_id = ?",f.id,projectId);
  if(result.changes!==1||one("SELECT 1 FROM folders WHERE id = ?",f.id))throw new HttpError(409,'Suppression native du dossier non confirmée.');
  return f;
 });
}
