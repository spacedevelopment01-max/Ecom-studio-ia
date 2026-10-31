/** Cibles/preuves du Blog existant. Aucune rédaction, quota ou publication parallèle. */
import {HttpError} from '../../auth';
import {all,one} from '../../db';
import {stableHash} from '../../brain/hash';
import {loadProject} from '../../projects';
import {blogIdFor} from '../../seo-v2/blog';
import {contentKey} from '../../seo-v2/store';
import {toHtml,blockText,stripInline} from '../../seo-v2/doc';
import type {ContentDoc,PageRef} from '../../seo-v2/types';
import {pickLang,type ContentRequestV2} from '../../seo-v2/engine';
import {assertBlogWrite,blogPlanReason,BlogAccessError,getArticle} from '../../engine/blog';
import {L} from '../../i18n-server';
export function blogTarget(topic:string):PageRef{return{key:'article:request:'+stableHash('blog-topic-211-v1',topic).slice(0,20),title:topic,url:null,kind:'article',status:'planned'};}
export function requestedBlogId(pid:string,request:ContentRequestV2){return request.type==='blog_article'&&request.target?.page?blogIdFor(contentKey(pid,'blog_article',request.target.page.key,pickLang(request.lang))):null;}
export function otherBlogSources(pid:string,request:ContentRequestV2){return all('SELECT id,title,slug,meta_title,meta_description,body_html,language,status,cover_asset_id,published_url FROM blog_articles WHERE project_id=? AND id<>? AND deleted_at IS NULL ORDER BY id',pid,requestedBlogId(pid,request)??'');}
/** Le quota est relu avant mise en file ; le moteur le réserve ensuite atomiquement.
 * Une relecture entre ses appels ne recompte jamais sa propre réservation comme une demande neuve.
 */
export function assertNewBlogAllowed(userId:string,pid:string,request:ContentRequestV2,jobId?:string){
 if(request.type!=='blog_article')return;
 try{if(!jobId)assertBlogWrite(userId,pid);else{const reason=blogPlanReason(userId,pid);if(reason)throw new BlogAccessError(reason);}}catch(e){if(e instanceof BlogAccessError)throw new HttpError(402,e.message,e.code);throw e;}
 const articleId=requestedBlogId(pid,request);if(!articleId)throw new HttpError(409,'Sujet natif absent.');
 if(getArticle(pid,articleId))throw new HttpError(409,L('Cet article existe déjà. Relisez son résultat acquis ou utilisez son éditeur Blog ; aucune réécriture globale automatique.','This article already exists. Review the acquired result or use its Blog editor; no automatic full rewrite.'));
 const pending=one("SELECT 1 FROM jobs j JOIN memory m ON m.project_id=j.project_id AND m.kind='artifact' AND m.key='agent.content.tool.'||json_extract(j.payload,'$.quoteId') WHERE j.project_id=? AND j.type='agent.blog.write' AND j.status IN ('queued','running','paused','blocked') AND j.id<>? AND json_extract(m.value,'$.request.type')='blog_article' AND json_extract(m.value,'$.request.target.page.key')=? LIMIT 1",pid,jobId??'',request.target!.page.key);
 if(pending)throw new HttpError(409,L('Ce sujet est déjà en cours. Retrouvez sa tâche et ses résultats, sans nouvel achat.','This topic is already in progress. Check its task and results without repurchasing.'));
}
type BlogPin={id:string;projectId:string;userId:string;documentHash:string;title:string;slug:string;metaTitle:string;metaDescription:string;language:string;bodyHash:string};
const body=(d:ContentDoc)=>toHtml({blocks:d.blocks.filter(b=>b.kind!=='h1')});
const title=(d:ContentDoc)=>{const h=d.blocks.find(b=>b.kind==='h1');return h?stripInline(blockText(h)):d.page.title;};
function matches(d:ContentDoc,a:ReturnType<typeof getArticle>){return!!a&&!a.deleted_at&&a.title===title(d)&&a.body_html===body(d)&&a.meta_title===d.meta.seoTitle&&a.meta_description===d.meta.metaDescription&&a.language===d.lang;}
export function pinNativeBlog(pid:string,docKey:string,d:ContentDoc,documentHash:string):BlogPin|null{
 const p=loadProject(pid),a=getArticle(pid,blogIdFor(docKey));if(!matches(d,a)||a!.user_id!==p.userId)return null;
 return{id:a!.id,projectId:pid,userId:p.userId,documentHash,title:a!.title,slug:a!.slug,metaTitle:a!.meta_title??'',metaDescription:a!.meta_description??'',language:a!.language,bodyHash:stableHash('native-blog-body-211',body(d))};
}
export function nativeBlogProof(pid:string,docKey:string,d:ContentDoc,documentHash:string,pin:BlogPin|null|undefined){
 const p=loadProject(pid),articleId=blogIdFor(docKey),current=getArticle(pid,articleId),proved=!!pin&&pin.id===articleId&&pin.projectId===pid&&pin.userId===p.userId&&pin.documentHash===documentHash&&pin.title===title(d)&&pin.metaTitle===d.meta.seoTitle&&pin.metaDescription===d.meta.metaDescription&&pin.language===d.lang&&pin.bodyHash===stableHash('native-blog-body-211',body(d));
 return{id:articleId,proved,isCurrent:proved&&matches(d,current)&&current!.slug===pin!.slug,present:!!current&&!current.deleted_at,status:current?.status??null,href:current&&!current.deleted_at?`/studio/${pid}/blog?article=${encodeURIComponent(articleId)}`:null,publicationByThisTask:false};
}
