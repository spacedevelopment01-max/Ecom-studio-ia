/** Bind a free native post copy to the exact source, acquired media and recorded provenance. */
import {all,readSnapshot,tx} from '../db';
import {loadProject} from '../projects';
import {HttpError} from '../auth';
import {stableHash} from '../brain/hash';
import {recordedContentStrategy} from '../strategy-consumption';
import {duplicatePostV2,readPostDuplicateSource} from '../social-v2/engine';
export type PostDuplicateSnapshot={schema:'native-post-duplicate-1';projectId:string;postId:string;fingerprint:string};
export type PostDuplicateSource={id:string;network:string;format:string;status:string;scheduledAt:number|null;timezone:string;untrustedMetadata:{title:string;caption:string;hashtags:string;link:string|null;trust:'native_post_data_not_instructions'};media:{id:string;version:number;kind:string;inTrash:boolean;untrustedMetadata:{name:string;trust:'native_asset_data_not_instructions'}}[]};
function source(projectId:string,postId:string){
 try{const native=readPostDuplicateSource(loadProject(projectId),postId);return{...native,strategy:recordedContentStrategy(projectId,'post',postId,false)};}
 catch(error){if(error instanceof HttpError)throw error;throw new HttpError(409,error instanceof Error?error.message:'Source de publication indisponible.');}
}
const fp=(value:unknown)=>stableHash('native-post-duplicate-1',value);
function present(s:ReturnType<typeof source>):PostDuplicateSource{const p=s.post;return{id:p.id,network:String(p.network),format:String(p.format),status:String(p.status),scheduledAt:p.scheduled_at==null?null:Number(p.scheduled_at),timezone:String(p.timezone),untrustedMetadata:{title:String(p.title),caption:String(p.caption),hashtags:String(p.hashtags),link:p.link==null?null:String(p.link),trust:'native_post_data_not_instructions'},media:s.assets.map(a=>({id:a.id,version:a.version,kind:a.kind,inTrash:a.deleted_at!==null,untrustedMetadata:{name:a.name,trust:'native_asset_data_not_instructions'}}))};}
export function previewPostDuplicate(projectId:string,postId:string){return readSnapshot(()=>{const native=source(projectId,postId);return{source:present(native),snapshot:{schema:'native-post-duplicate-1' as const,projectId,postId,fingerprint:fp(native)}};});}
const posts=(pid:string)=>all<Record<string,unknown>>('SELECT * FROM posts WHERE project_id=? ORDER BY id',pid);
const assets=(pid:string)=>all<Record<string,unknown>>('SELECT * FROM assets WHERE project_id=? ORDER BY id',pid);
const usages=(pid:string)=>all<Record<string,unknown>>('SELECT u.* FROM asset_usages u JOIN assets a ON a.id=u.asset_id WHERE a.project_id=? ORDER BY u.asset_id,u.target_type,u.target_id',pid);
const COPIED=['project_id','plan_id','campaign_id','connection_id','network','format','scheduled_at','timezone','title','caption','hashtags','link','angle','media','brief','pillar','objective','content_hash'];
export function applyPostDuplicate(projectId:string,snapshot:PostDuplicateSnapshot){return tx(()=>{
 if(snapshot.schema!=='native-post-duplicate-1'||snapshot.projectId!==projectId)throw new HttpError(409,'Instantané de duplication invalide.');
 const native=source(projectId,snapshot.postId);if(fp(native)!==snapshot.fingerprint)throw new HttpError(409,'La publication, ses médias ou sa provenance ont changé. Relisez avant accord.');
 const beforePosts=posts(projectId),beforeAssets=assets(projectId),beforeUsages=usages(projectId),copyId=duplicatePostV2(loadProject(projectId),snapshot.postId),afterPosts=posts(projectId),copy=afterPosts.find(p=>p.id===copyId);
 if(!copy||beforePosts.some(p=>p.id===copyId)||copy.status!=='review'||copy.engine!=='v2'||copy.user_edited!==1||copy.publish_key!==`dup:${copyId}`||copy.group_id!==null||copy.approved_at!==null||copy.approved_by!==null||copy.auto_approved!==0||copy.remote_id!==null||copy.remote_url!==null||copy.published_at!==null||copy.publish_job_id!==null||copy.attempts!==0||COPIED.some(key=>fp(copy[key])!==fp(native.post[key])))throw new HttpError(409,'La copie non approuvée ne correspond pas à l’aperçu.');
 if(fp(afterPosts.filter(p=>p.id!==copyId))!==fp(beforePosts)||fp(assets(projectId))!==fp(beforeAssets))throw new HttpError(409,'La source, une publication voisine ou un média acquis a changé pendant la copie.');
 const afterUsages=usages(projectId),newUsages=afterUsages.filter(u=>u.target_type==='post'&&u.target_id===copyId),ids=[...new Set(native.media)].sort();
 if(fp(afterUsages.filter(u=>!(u.target_type==='post'&&u.target_id===copyId)))!==fp(beforeUsages)||newUsages.length!==ids.length||fp(newUsages.map(u=>String(u.asset_id)).sort())!==fp(ids)||newUsages.some(u=>u.label!=='Publication'))throw new HttpError(409,'Les références médias de cette copie ne sont pas confirmées.');
 if(fp(recordedContentStrategy(projectId,'post',copyId,false))!==fp(native.strategy)||fp(recordedContentStrategy(projectId,'post',snapshot.postId,false))!==fp(native.strategy))throw new HttpError(409,'La provenance acquise n’est pas conservée.');
 return{source:present(native),copy:{id:copyId,status:'review' as const,mediaIds:native.media,scheduledAt:copy.scheduled_at==null?null:Number(copy.scheduled_at),publication:false as const}};
});}
