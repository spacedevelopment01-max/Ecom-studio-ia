/** Relecture d’un résultat déjà approuvé : jamais une production fictive ni une réapprobation. */
import sharp from 'sharp';import{createHash}from 'node:crypto';import{one,json}from '../db';import{getAsset,assetData}from '../library';import{assertContentAlignment}from '../marketing-strategy';import{approvalValid,type PostRowV2}from './approval';import type{Project}from '../projects';
export async function preservedApprovedDelivery(p:Project,ids:string[]){if(!ids.length||ids.length>30||new Set(ids).size!==ids.length)return null;const proof=[];
 for(const postId of ids){const row=one<PostRowV2>('SELECT * FROM posts WHERE id=? AND project_id=?',postId,p.id);if(!row||!['approved','scheduled','published','posted'].includes(row.status)||!approvalValid(row))return null;try{assertContentAlignment(p.id,'post',postId);}catch{return null;}const media=json<string[]|null>(row.media,null);if(!media||new Set(media).size!==media.length)return null;
  if(row.format==='text'){if(media.length||!(row.caption.trim()||row.title.trim()))return null;}else if(!media.length||row.format==='carousel'&&media.length<2)return null;
  const files=[];for(const aid of media){const a=getAsset(aid);if(!a||a.project_id!==p.id||a.user_id!==p.userId||a.deleted_at||a.status==='rejected')return null;try{const data=assetData(a);if(!data.length)return null;if(['image','carousel','pin'].includes(row.format)){if(a.kind!=='image')return null;const m=await sharp(data).metadata();if(!m.width||!m.height)return null;}else if(a.kind!=='video')return null;files.push({assetId:aid,version:a.version,sha256:createHash('sha256').update(data).digest('hex')});}catch{return null;}}
  proof.push({postId,status:row.status,approvedHash:row.approved_hash,media:files});
 }return proof;
}
