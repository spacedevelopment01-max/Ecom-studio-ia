/** Brouillon manuel natif : même table, empreinte et bibliothèque que Publications, aucun fournisseur. */
import {z}from 'zod';
import {HttpError}from '../auth';
import {id,now,run,tx,one}from '../db';
import {getAsset,addUsage}from '../library';
import {contentHash}from './approval';
import type {Project}from '../projects';
import {L}from '../i18n-server';
export const ManualPostInputSchema=z.object({network:z.enum(['instagram','facebook','tiktok','youtube','pinterest']),format:z.enum(['image','carousel','video','reel','story','short','pin','text']),title:z.string().max(200).default(''),caption:z.string().max(12000).default(''),hashtags:z.string().max(500).default(''),media:z.array(z.string().min(1).max(100)).max(10).default([]),scheduledAt:z.number().finite().nullable().optional(),connectionId:z.string().max(100).nullable().optional(),link:z.string().max(500).optional(),campaignId:z.string().max(100).optional()}).strict();
export type ManualPostInput=z.infer<typeof ManualPostInputSchema>;
export function createManualPost(p:Project,actorUserId:string,input:ManualPostInput,o:{postId?:string;brief?:Record<string,unknown>}={}){return tx(()=>{
 const b=ManualPostInputSchema.parse(input);
 for(const aid of b.media){const a=getAsset(aid);if(!a||a.project_id!==p.id||a.deleted_at)throw new HttpError(400,L('Média étranger au projet ou supprimé.','Foreign or deleted project media.'));}
 // Le contrôle de l’acteur autorisé reste dans la route/orchestrateur ; aucun compte social emprunté.
 if(b.connectionId&&!one('SELECT 1 FROM connections WHERE id=? AND user_id=?',b.connectionId,actorUserId))throw new HttpError(400,L('Compte de réseau social introuvable.','Social account not found.'));
 const postId=o.postId??id(),media=JSON.stringify(b.media),hash=contentHash({network:b.network,format:b.format,title:b.title,caption:b.caption,hashtags:b.hashtags,link:b.link??null,media}),brief=JSON.stringify(o.brief??{});
 if(o.postId){const current=one<{project_id:string;title:string;caption:string;hashtags:string;network:string;format:string;media:string;brief:string;status:string;link:string|null;scheduled_at:number|null;connection_id:string|null;campaign_id:string|null;timezone:string}>('SELECT * FROM posts WHERE id=?',postId);if(current){if(current.project_id!==p.id||current.title!==b.title||current.caption!==b.caption||current.hashtags!==b.hashtags||current.network!==b.network||current.format!==b.format||current.media!==media||current.brief!==brief||current.status!=='review'||current.link!==(b.link??null)||current.scheduled_at!==(b.scheduledAt??null)||current.connection_id!==(b.connectionId??null)||current.campaign_id!==(b.campaignId??null)||current.timezone!==p.settings.timezone)throw new HttpError(409,L('Ce brouillon existe dans une autre version. Aucun écrasement.','This draft exists in another version. Nothing overwritten.'));return{id:postId};}}
 run('INSERT INTO posts (id,project_id,connection_id,network,format,status,scheduled_at,timezone,title,caption,hashtags,link,media,campaign_id,publish_key,created_at,updated_at,engine,content_hash,user_edited,brief) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',postId,p.id,b.connectionId??null,b.network,b.format,'review',b.scheduledAt??null,p.settings.timezone,b.title,b.caption,b.hashtags,b.link??null,media,b.campaignId??null,'manual:'+postId,now(),now(),'v2',hash,1,brief);
 for(const aid of b.media)addUsage(aid,'post',postId,L('Publication','Post'));
 return{id:postId};
});}
