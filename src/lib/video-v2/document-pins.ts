/** Vérification native commune des médias d’un document ; lecture seule, aucune génération. */
import {HttpError}from '../auth';
import {referencedAssets,foreignVideoAssets}from './store';
import {getAsset,assetData}from '../library';
import {createHash}from 'node:crypto';
import {L}from '../i18n-server';
export function videoDocumentPins(userId:string,pid:string,doc:Parameters<typeof referencedAssets>[0]){
 if(foreignVideoAssets(pid,doc).length)throw new HttpError(409,L('Un média de cette vidéo manque ou n’appartient pas au projet.','A video media file is missing or does not belong to this project.'));
 return referencedAssets(doc).map(assetId=>{const a=getAsset(assetId)!;if(a.user_id!==userId||a.status==='rejected')throw new HttpError(404,L('Média vidéo autorisé introuvable.','Authorized video media not found.'));const bytes=assetData(a);if(!bytes.length)throw new HttpError(409,L('Un fichier vidéo source est vide.','A source video file is empty.'));return{assetId,version:a.version,sha256:createHash('sha256').update(bytes).digest('hex')};});
}
