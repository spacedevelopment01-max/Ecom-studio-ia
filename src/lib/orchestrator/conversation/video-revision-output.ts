/** Preuves de sortie partagées par les corrections vidéo ; aucun achat, contrôle de création ou mutation. */
import {createHash}from 'node:crypto';
import {HttpError,type User}from '../../auth';
import {all,json}from '../../db';
import {getAsset,assetData}from '../../library';
import {getJob}from '../../jobs';
import {imageBindingHash}from '../../image-v2/request-binding';
import {L}from '../../i18n-server';
export type Pin={assetId:string;version:number;sha256:string};
export function videoOutputPin(u:User,pid:string,aid:string):Pin{const a=getAsset(aid);if(!a||a.user_id!==u.id||a.project_id!==pid||a.deleted_at||a.status==='rejected'||a.kind!=='video')throw new HttpError(409,L('Le fichier vidéo acquis manque. Aucun nouvel achat.','The acquired video is missing. No new purchase.'));let bytes:Buffer;try{bytes=assetData(a);}catch{throw new HttpError(409,L('Le fichier vidéo acquis manque.','The acquired video file is missing.'));}if(!bytes.length)throw new HttpError(409,L('Le fichier vidéo est vide.','The video file is empty.'));return{assetId:a.id,version:a.version,sha256:createHash('sha256').update(bytes).digest('hex')};}
export function videoOutputPresent(u:User,pid:string,value:Pin){try{return imageBindingHash(videoOutputPin(u,pid,value.assetId))===imageBindingHash(value);}catch{return false;}}
/** Les acquis prouvés ne sont pas limités au registre récent, quelle que soit leur conversation native. */
export function renderedVideoProof(u:User,pid:string,docKey:string,versionId:string,assetId:string|null){
 if(!assetId)return null;const rows=all<{value:string}>("SELECT value FROM memory WHERE project_id=? AND kind='artifact' AND CASE WHEN json_valid(value) THEN json_extract(value,'$.docKey') END=? AND (CASE WHEN json_valid(value) THEN json_extract(value,'$.versionId') END=? OR CASE WHEN json_valid(value) THEN json_extract(value,'$.renderedVersionId') END=?) AND CASE WHEN json_valid(value) THEN json_extract(value,'$.output.assetId') END=? ORDER BY created_at DESC,rowid DESC",pid,docKey,versionId,versionId,assetId);
 for(const row of rows){const m=json<{output?:Pin;jobId?:string;proofJobId?:string}>(row.value,{}),job=getJob(m.jobId??m.proofJobId??'');if(job&&job.user_id===u.id&&job.project_id===pid&&['video.scenes','video.v2.render'].includes(job.type)&&job.status==='done'&&json<{delivery?:{delivered?:number}}>(job.result,{}).delivery?.delivered===1&&m.output&&videoOutputPresent(u,pid,m.output))return{output:m.output,jobId:job.id};}return null;
}
